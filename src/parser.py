"""
Code GraphRAG Java REST & Intra-service Dependency Parser
Uses Tree-sitter to parse Spring REST controllers, WebClient invocations, and service client calls.
Links provider endpoints to client calls (INVOKES_API) and controllers to clients (CALLS)
to produce a deterministic 2-hop dependency graph.
"""

from __future__ import annotations
import os
import re
import urllib.parse
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any, Set

import tree_sitter_java as tsjava
from tree_sitter import Language, Parser, Node

JAVA_LANGUAGE = Language(tsjava.language())


@dataclass
class QueryParameter:
    name: str
    type: str
    declared_required: Optional[bool]
    effective_required: bool
    default_value: Optional[str]


@dataclass
class EndpointNode:
    handler_id: str
    service: str
    class_fqn: str
    method_name: str
    http_method: str
    normalized_path: str
    query_parameters: List[QueryParameter]
    parameter_types: List[str]
    file: str
    line_start: int
    line_end: int
    raw_expression: str


@dataclass
class ClientCall:
    caller_id: str
    service: str
    class_fqn: str
    method_name: str
    parameter_types: List[str]
    http_method: str
    raw_uri_expr: str
    target_service: Optional[str]
    normalized_path: Optional[str]
    sent_query_parameters: List[str]
    assumptions: List[str]
    file: str
    line_start: int
    line_end: int
    raw_expression: str
    is_resolved: bool
    unresolved_reason: Optional[str] = None


@dataclass
class MethodCall:
    caller_id: str
    caller_service: str
    receiver_var: str
    receiver_type_fqn: str
    method_name: str
    file: str
    line_start: int
    line_end: int
    raw_expression: str
    has_circuit_breaker: bool = False
    fallback_method: Optional[str] = None


@dataclass
class MethodNode:
    id: str
    service: str
    class_fqn: str
    method_name: str
    parameter_types: List[str]
    file: str
    line_start: int
    line_end: int


@dataclass
class UnresolvedItem:
    file: str
    line_start: int
    line_end: int
    expression: str
    reason: str


def normalize_path(path: str) -> str:
    path = path.strip()
    if not path.startswith('/'):
        path = '/' + path
    if len(path) > 1 and path.endswith('/'):
        path = path[:-1]
    return path


def infer_service_name(file_path: str, package_name: str) -> str:
    norm_path = file_path.replace('\\', '/')
    if 'visits-service' in norm_path:
        return 'visits-service'
    if 'api-gateway' in norm_path:
        return 'api-gateway'
    if 'customers-service' in norm_path:
        return 'customers-service'
    if 'vets-service' in norm_path:
        return 'vets-service'

    if 'visits' in package_name:
        return 'visits-service'
    if 'customers' in package_name:
        return 'customers-service'
    if 'vets' in package_name:
        return 'vets-service'
    if 'api' in package_name:
        return 'api-gateway'
    return 'unknown-service'


def map_to_repo_relative_path(file_path: str, class_fqn: str) -> str:
    norm_path = file_path.replace('\\', '/')
    if norm_path.startswith('spring-petclinic-'):
        return norm_path
    
    package_path = class_fqn.replace('.', '/') + '.java'
    if 'visits' in class_fqn:
        return f"spring-petclinic-visits-service/src/main/java/{package_path}"
    elif 'api' in class_fqn:
        return f"spring-petclinic-api-gateway/src/main/java/{package_path}"
    elif 'customers' in class_fqn:
        return f"spring-petclinic-customers-service/src/main/java/{package_path}"
    elif 'vets' in class_fqn:
        return f"spring-petclinic-vets-service/src/main/java/{package_path}"
    return norm_path


class JavaASTParser:
    def __init__(self):
        self.parser = Parser(JAVA_LANGUAGE)

    def parse_source(
        self, source_code: str, file_path: str = ""
    ) -> Tuple[List[MethodNode], List[EndpointNode], List[ClientCall], List[MethodCall], List[UnresolvedItem]]:
        source_bytes = source_code.encode('utf-8')
        tree = self.parser.parse(source_bytes)
        root = tree.root_node

        package_name = self._extract_package(root, source_bytes)
        imports = self._extract_imports(root, source_bytes)
        service_name = infer_service_name(file_path, package_name)

        method_nodes: List[MethodNode] = []
        endpoints: List[EndpointNode] = []
        client_calls: List[ClientCall] = []
        method_calls: List[MethodCall] = []
        unresolved: List[UnresolvedItem] = []

        for class_node in self._find_nodes(root, ['class_declaration']):
            class_name = self._get_node_name(class_node, source_bytes)
            class_fqn = f"{package_name}.{class_name}" if package_name else class_name
            repo_file_path = map_to_repo_relative_path(file_path, class_fqn)

            # Extract fields: field_name -> (type_fqn, literal_value)
            fields, field_types = self._extract_fields(class_node, imports, package_name, source_bytes)

            class_prefix = self._extract_class_path_prefix(class_node, source_bytes)

            for setter_item in self._detect_potential_field_setters(class_node, fields, repo_file_path, source_bytes):
                unresolved.append(setter_item)

            class_body = class_node.child_by_field_name('body')
            if not class_body:
                continue

            for method_node in [c for c in class_body.children if c.type == 'method_declaration']:
                method_name = self._get_node_name(method_node, source_bytes)
                param_types, param_details = self._extract_method_parameters(method_node, source_bytes)
                param_sig = ",".join(param_types)
                method_id = f"{service_name}::{class_fqn}#{method_name}({param_sig})"

                method_nodes.append(MethodNode(
                    id=method_id,
                    service=service_name,
                    class_fqn=class_fqn,
                    method_name=method_name,
                    parameter_types=param_types,
                    file=repo_file_path,
                    line_start=method_node.start_point[0] + 1,
                    line_end=method_node.end_point[0] + 1
                ))

                # Check if HTTP endpoint
                endpoint = self._extract_endpoint(
                    method_node, service_name, class_fqn, method_name, param_types, param_details,
                    class_prefix, repo_file_path, source_bytes
                )
                if endpoint:
                    endpoints.append(endpoint)

                # Check for REST WebClient calls
                calls, call_unresolved = self._extract_client_calls(
                    method_node, service_name, class_fqn, method_name, param_types,
                    fields, repo_file_path, source_bytes
                )
                client_calls.extend(calls)
                unresolved.extend(call_unresolved)

                # Check for intra-service method calls (e.g. controller calling client bean)
                internal_calls = self._extract_internal_method_calls(
                    method_node, method_id, service_name, field_types, repo_file_path, source_bytes
                )
                method_calls.extend(internal_calls)

        return method_nodes, endpoints, client_calls, method_calls, unresolved

    def _get_annotations(self, node: Node) -> List[Node]:
        annos: List[Node] = []
        for child in node.children:
            if child.type in ('annotation', 'marker_annotation'):
                annos.append(child)
            elif child.type == 'modifiers':
                for mod_child in child.children:
                    if mod_child.type in ('annotation', 'marker_annotation'):
                        annos.append(mod_child)
        return annos

    def _extract_package(self, root: Node, source: bytes) -> str:
        for node in root.children:
            if node.type == 'package_declaration':
                for child in node.children:
                    if child.type in ('scoped_identifier', 'identifier'):
                        return self._get_text(child, source)
        return ""

    def _extract_imports(self, root: Node, source: bytes) -> Dict[str, str]:
        imports: Dict[str, str] = {}
        for node in root.children:
            if node.type == 'import_declaration':
                txt = self._get_text(node, source).strip()
                clean = txt.replace('import ', '').replace(';', '').strip()
                if '.' in clean:
                    simple_name = clean.split('.')[-1]
                    imports[simple_name] = clean
        return imports

    def _get_node_name(self, node: Node, source: bytes) -> str:
        name_node = node.child_by_field_name('name')
        if name_node:
            return self._get_text(name_node, source)
        return ""

    def _get_text(self, node: Node, source: bytes) -> str:
        return source[node.start_byte:node.end_byte].decode('utf-8', errors='ignore')

    def _find_nodes(self, node: Node, types: List[str]) -> List[Node]:
        res = []
        if node.type in types:
            res.append(node)
        for child in node.children:
            res.extend(self._find_nodes(child, types))
        return res

    def _extract_fields(self, class_node: Node, imports: Dict[str, str], package: str, source: bytes) -> Tuple[Dict[str, str], Dict[str, str]]:
        field_literal_values: Dict[str, str] = {}
        field_types: Dict[str, str] = {}

        for field_node in self._find_nodes(class_node, ['field_declaration']):
            type_node = field_node.child_by_field_name('type')
            simple_type = self._get_text(type_node, source) if type_node else ""
            fqn_type = imports.get(simple_type, f"{package}.{simple_type}" if package else simple_type)

            declarators = [c for c in field_node.children if c.type == 'variable_declarator']
            for decl in declarators:
                name_node = decl.child_by_field_name('name')
                value_node = decl.child_by_field_name('value')
                if name_node:
                    field_name = self._get_text(name_node, source)
                    field_types[field_name] = fqn_type
                    if value_node:
                        raw_val = self._get_text(value_node, source).strip()
                        if raw_val.startswith('"') and raw_val.endswith('"'):
                            raw_val = raw_val[1:-1]
                        field_literal_values[field_name] = raw_val

        return field_literal_values, field_types

    def _detect_potential_field_setters(self, class_node: Node, fields: Dict[str, str], file_path: str, source: bytes) -> List[UnresolvedItem]:
        items: List[UnresolvedItem] = []
        for method_node in self._find_nodes(class_node, ['method_declaration']):
            m_name = self._get_node_name(method_node, source)
            for f_name in fields.keys():
                expected_setter = f"set{f_name[0].upper()}{f_name[1:]}"
                if m_name == expected_setter:
                    items.append(UnresolvedItem(
                        file=file_path,
                        line_start=method_node.start_point[0] + 1,
                        line_end=method_node.end_point[0] + 1,
                        expression=self._get_text(method_node, source).splitlines()[0],
                        reason=f"Setter '{m_name}' could mutate default field '{f_name}' at runtime via configuration or external caller"
                    ))
        return items

    def _extract_class_path_prefix(self, class_node: Node, source: bytes) -> str:
        for anno in self._get_annotations(class_node):
            anno_text = self._get_text(anno, source)
            if '@RequestMapping' in anno_text:
                path = self._extract_path_from_annotation(anno, source)
                if path:
                    return path
        return ""

    def _extract_method_parameters(self, method_node: Node, source: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        params_node = method_node.child_by_field_name('parameters')
        if not params_node:
            return [], []

        param_types: List[str] = []
        param_details: List[Dict[str, Any]] = []

        for p in params_node.named_children:
            if p.type in ('formal_parameter', 'spread_parameter'):
                type_node = p.child_by_field_name('type')
                name_node = p.child_by_field_name('name')
                p_type = self._get_text(type_node, source) if type_node else "Object"
                p_name = self._get_text(name_node, source) if name_node else ""
                param_types.append(p_type)
                annotations = self._get_annotations(p)

                param_details.append({
                    'name': p_name,
                    'type': p_type,
                    'annotations': annotations
                })

        return param_types, param_details

    def _extract_path_from_annotation(self, anno_node: Node, source: bytes) -> Optional[str]:
        args = anno_node.child_by_field_name('arguments')
        if not args:
            return None

        for child in self._find_nodes(args, ['string_literal']):
            raw = self._get_text(child, source).strip()
            if raw.startswith('"') and raw.endswith('"'):
                return raw[1:-1]

        for pair in self._find_nodes(args, ['element_value_pair']):
            key_node = pair.child_by_field_name('key')
            val_node = pair.child_by_field_name('value')
            if key_node and val_node and self._get_text(key_node, source) in ('value', 'path'):
                raw = self._get_text(val_node, source).strip()
                if raw.startswith('"') and raw.endswith('"'):
                    return raw[1:-1]
        return None

    def _extract_endpoint(
        self, method_node: Node, service: str, class_fqn: str, method_name: str,
        param_types: List[str], param_details: List[Dict[str, Any]],
        class_prefix: str, file_path: str, source: bytes
    ) -> Optional[EndpointNode]:
        mapping_nodes = []
        for anno in self._get_annotations(method_node):
            txt = self._get_text(anno, source)
            if any(m in txt for m in ['@GetMapping', '@PostMapping', '@PutMapping', '@DeleteMapping', '@PatchMapping', '@RequestMapping']):
                mapping_nodes.append(anno)

        if not mapping_nodes:
            return None

        primary_mapping = mapping_nodes[0]
        mapping_text = self._get_text(primary_mapping, source)

        http_method = "GET"
        if "@PostMapping" in mapping_text:
            http_method = "POST"
        elif "@PutMapping" in mapping_text:
            http_method = "PUT"
        elif "@DeleteMapping" in mapping_text:
            http_method = "DELETE"
        elif "@PatchMapping" in mapping_text:
            http_method = "PATCH"
        elif "@RequestMapping" in mapping_text:
            if "method = RequestMethod.POST" in mapping_text:
                http_method = "POST"
            elif "method = RequestMethod.PUT" in mapping_text:
                http_method = "PUT"
            elif "method = RequestMethod.DELETE" in mapping_text:
                http_method = "DELETE"

        path_part = self._extract_path_from_annotation(primary_mapping, source) or ""
        full_path = normalize_path(f"{class_prefix}/{path_part}".replace('//', '/'))

        query_params: List[QueryParameter] = []
        for p in param_details:
            for anno in p['annotations']:
                anno_str = self._get_text(anno, source)
                if '@RequestParam' in anno_str:
                    qp = self._parse_request_param(anno, p['name'], p['type'], source)
                    query_params.append(qp)

        param_sig = ",".join(param_types)
        handler_id = f"{service}::{class_fqn}#{method_name}({param_sig})"

        body_node = method_node.child_by_field_name('body')
        if body_node:
            raw_expression = source[method_node.start_byte:body_node.start_byte].decode('utf-8', errors='ignore').strip()
        else:
            raw_expression = self._get_text(method_node, source).strip()

        return EndpointNode(
            handler_id=handler_id,
            service=service,
            class_fqn=class_fqn,
            method_name=method_name,
            http_method=http_method,
            normalized_path=full_path,
            query_parameters=query_params,
            parameter_types=param_types,
            file=file_path,
            line_start=method_node.start_point[0] + 1,
            line_end=method_node.end_point[0] + 1,
            raw_expression=raw_expression
        )

    def _parse_request_param(self, anno_node: Node, default_name: str, p_type: str, source: bytes) -> QueryParameter:
        name = default_name
        declared_required: Optional[bool] = None
        default_val: Optional[str] = None

        args = anno_node.child_by_field_name('arguments')
        if args:
            str_literals = [c for c in self._find_nodes(args, ['string_literal']) if c.parent == args]
            if str_literals:
                raw = self._get_text(str_literals[0], source).strip()
                if raw.startswith('"') and raw.endswith('"'):
                    name = raw[1:-1]

            for pair in self._find_nodes(args, ['element_value_pair']):
                key_node = pair.child_by_field_name('key')
                val_node = pair.child_by_field_name('value')
                if key_node and val_node:
                    k = self._get_text(key_node, source)
                    v = self._get_text(val_node, source).strip()
                    if k in ('name', 'value'):
                        if v.startswith('"') and v.endswith('"'):
                            name = v[1:-1]
                    elif k == 'required':
                        declared_required = (v == 'true')
                    elif k == 'defaultValue':
                        if v.startswith('"') and v.endswith('"'):
                            default_val = v[1:-1]
                        else:
                            default_val = v

        if default_val is not None or declared_required is False or 'Optional<' in p_type:
            effective_required = False
        else:
            effective_required = True

        return QueryParameter(
            name=name,
            type=p_type,
            declared_required=declared_required,
            effective_required=effective_required,
            default_value=default_val
        )

    def _extract_client_calls(
        self, method_node: Node, service: str, class_fqn: str, method_name: str,
        param_types: List[str], fields: Dict[str, str], file_path: str, source: bytes
    ) -> Tuple[List[ClientCall], List[UnresolvedItem]]:
        client_calls: List[ClientCall] = []
        unresolved_items: List[UnresolvedItem] = []

        param_sig = ",".join(param_types)
        caller_id = f"{service}::{class_fqn}#{method_name}({param_sig})"

        for inv in self._find_nodes(method_node, ['method_invocation']):
            name_node = inv.child_by_field_name('name')
            if name_node and self._get_text(name_node, source) == 'uri':
                http_method = self._detect_http_method_in_chain(inv, source)

                args_node = inv.child_by_field_name('arguments')
                if not args_node or not args_node.named_children:
                    continue

                uri_arg_node = args_node.named_children[0]
                raw_uri_expr = self._get_text(uri_arg_node, source)

                resolved_uri, is_static, reason = self._resolve_expression_string(uri_arg_node, fields, source)
                call_expr = self._get_text(inv, source).strip()
                line_start = inv.start_point[0] + 1
                line_end = inv.end_point[0] + 1

                if not is_static or not resolved_uri:
                    unresolved_items.append(UnresolvedItem(
                        file=file_path,
                        line_start=line_start,
                        line_end=line_end,
                        expression=raw_uri_expr,
                        reason=reason or "Cannot statically resolve URI expression"
                    ))
                    client_calls.append(ClientCall(
                        caller_id=caller_id,
                        service=service,
                        class_fqn=class_fqn,
                        method_name=method_name,
                        parameter_types=param_types,
                        http_method=http_method,
                        raw_uri_expr=raw_uri_expr,
                        target_service=None,
                        normalized_path=None,
                        sent_query_parameters=[],
                        assumptions=[],
                        file=file_path,
                        line_start=line_start,
                        line_end=line_end,
                        raw_expression=call_expr,
                        is_resolved=False,
                        unresolved_reason=reason
                    ))
                else:
                    target_service, norm_path, sent_params, assumptions = self._parse_target_uri(resolved_uri)
                    client_calls.append(ClientCall(
                        caller_id=caller_id,
                        service=service,
                        class_fqn=class_fqn,
                        method_name=method_name,
                        parameter_types=param_types,
                        http_method=http_method,
                        raw_uri_expr=raw_uri_expr,
                        target_service=target_service,
                        normalized_path=norm_path,
                        sent_query_parameters=sent_params,
                        assumptions=assumptions,
                        file=file_path,
                        line_start=line_start,
                        line_end=line_end,
                        raw_expression=call_expr,
                        is_resolved=True
                    ))

        return client_calls, unresolved_items

    def _extract_internal_method_calls(
        self, method_node: Node, caller_id: str, caller_service: str,
        field_types: Dict[str, str], file_path: str, source: bytes
    ) -> List[MethodCall]:
        calls: List[MethodCall] = []

        method_text = self._get_text(method_node, source)
        has_circuit_breaker = 'cb.run' in method_text or 'cbFactory' in method_text
        fallback_match = re.search(r'throwable\s*->\s*([a-zA-Z0-9_]+)\s*\(', method_text)
        fallback_method = fallback_match.group(1) if fallback_match else None

        for inv in self._find_nodes(method_node, ['method_invocation']):
            obj_node = inv.child_by_field_name('object')
            name_node = inv.child_by_field_name('name')
            if obj_node and name_node:
                obj_text = self._get_text(obj_node, source)
                name_text = self._get_text(name_node, source)

                if obj_text in field_types:
                    target_fqn = field_types[obj_text]
                    call_expr = self._get_text(inv, source).splitlines()[0]
                    calls.append(MethodCall(
                        caller_id=caller_id,
                        caller_service=caller_service,
                        receiver_var=obj_text,
                        receiver_type_fqn=target_fqn,
                        method_name=name_text,
                        file=file_path,
                        line_start=inv.start_point[0] + 1,
                        line_end=inv.end_point[0] + 1,
                        raw_expression=call_expr,
                        has_circuit_breaker=has_circuit_breaker,
                        fallback_method=fallback_method
                    ))

        return calls

    def _detect_http_method_in_chain(self, uri_node: Node, source: bytes) -> str:
        curr = uri_node
        while curr:
            if curr.type == 'method_invocation':
                name_node = curr.child_by_field_name('name')
                if name_node:
                    m = self._get_text(name_node, source)
                    if m == 'get':
                        return 'GET'
                    elif m == 'post':
                        return 'POST'
                    elif m == 'put':
                        return 'PUT'
                    elif m == 'delete':
                        return 'DELETE'
                    elif m == 'patch':
                        return 'PATCH'
            curr = curr.child_by_field_name('object')
        return 'GET'

    def _resolve_expression_string(self, node: Node, fields: Dict[str, str], source: bytes) -> Tuple[Optional[str], bool, Optional[str]]:
        if node.type == 'string_literal':
            txt = self._get_text(node, source).strip()
            if txt.startswith('"') and txt.endswith('"'):
                return txt[1:-1], True, None
            return txt, True, None

        elif node.type == 'identifier':
            name = self._get_text(node, source)
            if name in fields:
                return fields[name], True, None
            return None, False, f"Dynamic identifier '{name}' not found in class field initializers"

        elif node.type == 'binary_expression':
            left = node.child_by_field_name('left')
            right = node.child_by_field_name('right')
            left_val, left_ok, left_reason = self._resolve_expression_string(left, fields, source)
            if not left_ok:
                return None, False, left_reason
            right_val, right_ok, right_reason = self._resolve_expression_string(right, fields, source)
            if not right_ok:
                return None, False, right_reason
            return (left_val or "") + (right_val or ""), True, None

        return None, False, f"Unsupported expression type '{node.type}' for static URL resolution"

    def _parse_target_uri(self, uri_str: str) -> Tuple[Optional[str], str, List[str], List[str]]:
        assumptions: List[str] = []
        target_service: Optional[str] = None
        path = uri_str
        query_params: List[str] = []

        if uri_str.startswith('http://') or uri_str.startswith('https://'):
            parsed = urllib.parse.urlparse(uri_str)
            target_service = parsed.hostname
            path = parsed.path
            assumptions.append(f"Target service derived from URL host '{target_service}' with default configuration")
            if parsed.query:
                for part in parsed.query.split('&'):
                    if '=' in part:
                        qp_name = part.split('=')[0]
                        query_params.append(qp_name)
                    elif part:
                        query_params.append(part)

        norm_path = normalize_path(path)
        return target_service, norm_path, query_params, assumptions


class DependencyGraphBuilder:
    def __init__(self, commit_sha: str = "3858f9c630cf989bb6809a86edf47c2be78dc9f1", repository: str = "https://github.com/spring-petclinic/spring-petclinic-microservices"):
        self.commit_sha = commit_sha
        self.repository = repository
        self.parser = JavaASTParser()

    def build_graph(self, provider_file_path: str, client_file_path: str, snapshot_kind: str = "baseline", patch_id: Optional[str] = None, override_commit_sha: Optional[str] = None) -> Dict[str, Any]:
        effective_commit = override_commit_sha if override_commit_sha else self.commit_sha
        return self.build_multi_file_graph(
            file_paths=[provider_file_path, client_file_path],
            snapshot_kind=snapshot_kind,
            patch_id=patch_id
        )

    def build_multi_file_graph(self, file_paths: List[str], snapshot_kind: str = "baseline", patch_id: Optional[str] = None, override_commit_sha: Optional[str] = None) -> Dict[str, Any]:
        effective_commit = override_commit_sha if override_commit_sha else self.commit_sha
        all_methods: List[MethodNode] = []
        all_endpoints: List[EndpointNode] = []
        all_client_calls: List[ClientCall] = []
        all_method_calls: List[MethodCall] = []
        all_unresolved: List[UnresolvedItem] = []

        for fp in file_paths:
            with open(fp, 'r', encoding='utf-8') as f:
                code = f.read()
            m_nodes, eps, c_calls, m_calls, unres = self.parser.parse_source(code, fp)
            all_methods.extend(m_nodes)
            all_endpoints.extend(eps)
            all_client_calls.extend(c_calls)
            all_method_calls.extend(m_calls)
            all_unresolved.extend(unres)

        # Build nodes map
        nodes_dict: Dict[str, Dict[str, Any]] = {}
        for m in all_methods:
            nodes_dict[m.id] = {
                "id": m.id,
                "service": m.service,
                "class_fqn": m.class_fqn,
                "method_name": m.method_name,
                "parameter_types": m.parameter_types,
                "file": m.file.replace('\\', '/'),
                "line_start": m.line_start,
                "line_end": m.line_end
            }

        # Endpoints JSON
        endpoints_json = []
        for ep in all_endpoints:
            endpoints_json.append({
                "handler_id": ep.handler_id,
                "service": ep.service,
                "http_method": ep.http_method,
                "normalized_path": ep.normalized_path,
                "query_parameters": [
                    {
                        "name": qp.name,
                        "type": qp.type,
                        "declared_required": qp.declared_required,
                        "effective_required": qp.effective_required,
                        "default_value": qp.default_value
                    } for qp in ep.query_parameters
                ],
                "evidence": {
                    "commit": effective_commit,
                    "file": ep.file.replace('\\', '/'),
                    "line_start": ep.line_start,
                    "line_end": ep.line_end,
                    "evidence_type": "ANNOTATION_MAPPING",
                    "expression": ep.raw_expression
                }
            })

        edges = []
        effective_commit = override_commit_sha if override_commit_sha else self.commit_sha

        # 1. Match INVOKES_API edges (Client -> Provider Endpoint)
        for call in all_client_calls:
            if not call.is_resolved:
                continue

            for ep in all_endpoints:
                if (call.target_service == ep.service and
                    call.http_method == ep.http_method and
                    call.normalized_path == ep.normalized_path):

                    req_params = [qp.name for qp in ep.query_parameters if qp.effective_required]
                    missing_req = [p for p in req_params if p not in call.sent_query_parameters]

                    edges.append({
                        "source_id": call.caller_id,
                        "target_id": ep.handler_id,
                        "type": "INVOKES_API",
                        "target_service": ep.service,
                        "http_method": ep.http_method,
                        "normalized_path": ep.normalized_path,
                        "sent_query_parameters": call.sent_query_parameters,
                        "resolution_status": "RESOLVED",
                        "contract_status": "VALID" if not missing_req else "CONTRACT_MISMATCH_MISSING_REQUIRED_PARAMS",
                        "missing_required_parameters": missing_req,
                        "cross_service": True,
                        "assumptions": call.assumptions + [
                            "Matched by exact service name, HTTP method, and normalized endpoint path",
                            f"Target handler overload: {ep.handler_id}"
                        ],
                        "evidence": [
                            {
                                "commit": effective_commit,
                                "file": call.file.replace('\\', '/'),
                                "line_start": call.line_start,
                                "line_end": call.line_end,
                                "evidence_type": "WEBCLIENT_CALL",
                                "expression": call.raw_expression
                            },
                            {
                                "commit": effective_commit,
                                "file": ep.file.replace('\\', '/'),
                                "line_start": ep.line_start,
                                "line_end": ep.line_end,
                                "evidence_type": "ENDPOINT_HANDLER",
                                "expression": ep.raw_expression
                            }
                        ]
                    })

        # 2. Match CALLS edges (Internal Intra-service Bean calls: e.g. Controller -> ServiceClient)
        for mc in all_method_calls:
            for m in all_methods:
                if m.class_fqn == mc.receiver_type_fqn and m.method_name == mc.method_name:
                    assumptions = ["Intra-service bean invocation resolved via Spring DI field type"]
                    if mc.has_circuit_breaker:
                        assumptions.append(f"Protected by ReactiveCircuitBreaker with fallback: '{mc.fallback_method}'")

                    edges.append({
                        "source_id": mc.caller_id,
                        "target_id": m.id,
                        "type": "CALLS",
                        "target_service": m.service,
                        "resolution_status": "RESOLVED",
                        "contract_status": "VALID",
                        "cross_service": (mc.caller_service != m.service),
                        "has_circuit_breaker": mc.has_circuit_breaker,
                        "fallback_method": mc.fallback_method,
                        "assumptions": assumptions,
                        "evidence": [
                            {
                                "commit": effective_commit,
                                "file": mc.file.replace('\\', '/'),
                                "line_start": mc.line_start,
                                "line_end": mc.line_end,
                                "evidence_type": "METHOD_CALL",
                                "expression": mc.raw_expression
                            }
                        ]
                    })

        unresolved_json = [
            {
                "file": item.file.replace('\\', '/'),
                "line_start": item.line_start,
                "line_end": item.line_end,
                "expression": item.expression,
                "reason": item.reason
            } for item in all_unresolved
        ]

        # Only retain nodes that are relevant (have edges or are endpoints)
        active_node_ids = set()
        for e in edges:
            active_node_ids.add(e["source_id"])
            active_node_ids.add(e["target_id"])
        for ep in endpoints_json:
            active_node_ids.add(ep["handler_id"])

        filtered_nodes = [n for nid, n in nodes_dict.items() if nid in active_node_ids]

        return {
            "metadata": {
                "schema_version": "0.2.0",
                "repository": self.repository,
                "commit_sha": effective_commit,
                "snapshot_kind": snapshot_kind,
                "patch_id": patch_id
            },
            "nodes": filtered_nodes,
            "endpoints": endpoints_json,
            "edges": edges,
            "unresolved": unresolved_json
        }

    def trace_backward_impact(self, graph: Dict[str, Any], seed_id: str, max_hops: int = 3) -> Dict[str, Any]:
        """
        Duyệt ngược đồ thị từ seed (callee) sang các caller theo cạnh CALLS và INVOKES_API.
        Đếm số hop logic (mỗi cạnh CALLS / INVOKES_API là 1 hop) và số lần vượt ranh giới dịch vụ.
        """
        # Build adjacency list: target -> list of (source, edge)
        incoming: Dict[str, List[Dict[str, Any]]] = {}
        for edge in graph.get("edges", []):
            target = edge["target_id"]
            incoming.setdefault(target, []).append(edge)

        visited: Set[str] = {seed_id}
        queue = [(seed_id, 0, 0, [])]  # (curr_id, logic_hops, service_crossings, path_edges)
        impacted_nodes: List[Dict[str, Any]] = []

        while queue:
            curr_id, hops, crossings, path = queue.pop(0)
            if hops >= max_hops:
                continue

            for edge in incoming.get(curr_id, []):
                caller_id = edge["source_id"]
                next_hops = hops + 1
                next_crossings = crossings + (1 if edge.get("cross_service", False) else 0)
                next_path = path + [edge]

                if caller_id not in visited:
                    visited.add(caller_id)
                    impacted_nodes.append({
                        "node_id": caller_id,
                        "logic_hops": next_hops,
                        "service_crossings": next_crossings,
                        "via_edge_type": edge["type"],
                        "has_circuit_breaker": edge.get("has_circuit_breaker", False),
                        "fallback_method": edge.get("fallback_method", None),
                        "path": [e["type"] for e in next_path]
                    })
                    queue.append((caller_id, next_hops, next_crossings, next_path))

        return {
            "seed_id": seed_id,
            "max_hops": max_hops,
            "impacted_count": len(impacted_nodes),
            "impacted_nodes": impacted_nodes
        }
