"""Experimental syntax observations; never adds native graph nodes or edges.

Java member names are not asserted to be JSON properties. Accesses are syntax
candidates, not resolved serialization/dataflow or behavioral impact evidence.
"""
from tree_sitter import Language, Parser
import tree_sitter_java


def walk(node):
    yield node
    for child in node.named_children:
        yield from walk(child)


def survey_source(raw: bytes, file: str) -> dict:
    parser = Parser(Language(tree_sitter_java.language()))
    tree = parser.parse(raw)
    if tree.root_node.has_error:
        raise ValueError(f"Invalid Java syntax in {file}; survey not complete")
    observations, unresolved = [], []

    def text(node):
        return raw[node.start_byte:node.end_byte].decode('utf-8') if node else None

    def span(node):
        return dict(file=file, line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1, expression=text(node))

    def unsupported(node, reason):
        unresolved.append(dict(**span(node), reason=reason))

    # Deliberately top-level only: no invented IDs for implicit accessors/builders.
    record_names = set()
    for declaration in tree.root_node.named_children:
        if declaration.type not in ('record_declaration', 'class_declaration'):
            continue
        owner = text(declaration.child_by_field_name('name'))
        if declaration.type == 'record_declaration':
            parameters = declaration.child_by_field_name('parameters')
            for parameter in parameters.named_children if parameters else []:
                if parameter.type != 'formal_parameter':
                    unsupported(parameter, 'Unsupported record component syntax')
                    continue
                name = text(parameter.child_by_field_name('name'))
                record_names.add(name)
                observations.append(dict(**span(parameter), kind='record_component',
                                         owner=owner, name=name,
                                         declared_type=text(parameter.child_by_field_name('type')),
                                         serialization_binding='unresolved'))
        body = declaration.child_by_field_name('body')
        for field in body.named_children if body else []:
            if field.type in ('class_declaration', 'record_declaration'):
                unsupported(field, 'Nested type declarations not surveyed')
            if field.type != 'field_declaration':
                continue
            for variable in field.named_children:
                if variable.type == 'variable_declarator':
                    observations.append(dict(**span(variable), kind='dto_field', owner=owner,
                                             name=text(variable.child_by_field_name('name')),
                                             declared_type=text(field.child_by_field_name('type')),
                                             serialization_binding='unresolved'))
    for node in walk(tree.root_node):
        if node.type in ('annotation', 'marker_annotation'):
            unsupported(node, 'Annotations/serialization configuration not interpreted')
        if node.type == 'field_access':
            observations.append(dict(**span(node), kind='field_access', binding='syntax_only',
                                     receiver=text(node.child_by_field_name('object')),
                                     name=text(node.child_by_field_name('field'))))
            unsupported(node, 'Receiver/type/field visibility and JSON binding not resolved')
        if node.type != 'method_invocation':
            continue
        name = text(node.child_by_field_name('name'))
        receiver = text(node.child_by_field_name('object'))
        arguments = node.child_by_field_name('arguments')
        args = arguments.named_children if arguments else []
        if receiver in ('Map', 'java.util.Map') and name == 'of':
            # Name recognition only, not import/type resolution for a shadowed Map.
            unsupported(node, 'Map.of syntax candidate; receiver/import and response binding not resolved')
            if len(args) % 2:
                unsupported(node, 'Map.of requires key/value pairs; no partial field inference')
                continue
            for key in args[::2]:
                if key.type != 'string_literal':
                    unsupported(key, 'Dynamic Map key: no static JSON field inferred')
                else:
                    observations.append(dict(**span(key), kind='map_literal_key',
                                             java_literal=text(key), binding='syntax_only'))
        elif receiver and not args and (name.startswith('get') or name in record_names):
            observations.append(dict(**span(node), kind='accessor_call', receiver=receiver,
                                     name=name, binding='syntax_only'))
            unsupported(node, 'Accessor candidate only; receiver type and producer/consumer link unresolved')
        else:
            unsupported(node, 'Invocation/dataflow/Optional or chained access unsupported by survey')
    return dict(file=file, observations=observations, unresolved=unresolved,
                limits=['No JSON serialization or runtime claims', 'No implicit record Method IDs',
                        'No producer/consumer edges', 'No Optional/lambda/inheritance dataflow'])
