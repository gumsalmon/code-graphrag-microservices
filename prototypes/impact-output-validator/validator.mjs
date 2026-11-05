// Isolated, synthetic-only interpretation of a DRAFT. No runtime/scorer imports or I/O.
import design from '../../docs/contracts/impact-output.v0.1.draft.json' with { type: 'json' };

export const VALIDATOR_ID = 'impact-output-validator/synthetic-prototype.1';
export const CONTRACT_ID = design.contract_id;
const LEVELS = design.proposed_payload.levels;
const MAX_ITEMS = 1000;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const text = value => typeof value === 'string' && value.trim().length > 0;
const key = (level, id) => JSON.stringify([level, id]);
const escapePointer = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
const at = (path, field) => `${path}/${escapePointer(field)}`;
const issue = (issues, code, path, message) => issues.push({ code, path, message });

function fields(value, names, path, issues) {
  if (!object(value)) { issue(issues, 'OBJECT_REQUIRED', path, 'Expected a JSON object.'); return false; }
  for (const name of names) if (!Object.hasOwn(value, name))
    issue(issues, 'MISSING_FIELD', at(path, name), 'Required field is absent.');
  for (const name of Object.keys(value)) if (!names.includes(name))
    issue(issues, 'UNEXPECTED_FIELD', at(path, name), 'Field is not part of this prototype profile.');
  return true;
}

function array(value, path, issues) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) {
    issue(issues, 'ARRAY_REQUIRED', path, `Expected an array of at most ${MAX_ITEMS} items.`); return false;
  }
  return true;
}

function strings(value, path, issues, { vocabulary = null, nonempty = false } = {}) {
  if (!array(value, path, issues)) return false;
  if (nonempty && value.length === 0) issue(issues, 'EMPTY_LIST', path, 'At least one item is required.');
  for (const [index, item] of value.entries()) if (!text(item) || (vocabulary && !vocabulary.includes(item)))
    issue(issues, 'STRING_VALUE', at(path, index), 'Expected a nonempty string from the declared vocabulary.');
  return true;
}

function unique(values, path, issues) {
  if (new Set(values).size !== values.length) issue(issues, 'DUPLICATE_INPUT', path, 'Input identifiers must be unique.');
}

function hasQuotableText(value) {
  if (typeof value !== 'string') return false;
  let count = 0;
  const limit = design.proposed_citation_policy.quote_max_length;
  for (let index = 0; index < value.length; index++) {
    count += Number(/\S/.test(value[index]));
    if (index >= limit) count -= Number(/\S/.test(value[index - limit]));
    if (count >= design.proposed_citation_policy.quote_min_non_whitespace_length) return true;
  }
  return false;
}

function canonicalShape(entity, request) {
  if (!text(entity.service) || /\s|::/.test(entity.service) || !text(entity.entity_id)) return false;
  const prefix = `${request.repository_id}@${request.snapshot_id}::${entity.service}`;
  if (entity.level === 'service') return entity.entity_id === prefix;
  if (!entity.entity_id.startsWith(`${prefix}::`)) return false;
  const suffix = entity.entity_id.slice(prefix.length + 2);
  if (entity.level === 'method') return /^[^\s:#()]+#[^\s#()]+\([^\r\n]*\)$/.test(suffix);
  if (entity.level === 'api') return /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT) \/[^\s?#\\]*$/.test(suffix);
  return false;
}

function checkRequest(request, issues) {
  const names = ['synthetic_only', 'contract_id', 'repository_id', 'snapshot_id', 'seed_method_id',
    'requested_levels', 'supported_levels', 'registry', 'aliases', 'evidence', 'repair_strategy_ids', 'path_validation'];
  if (!fields(request, names, '/request', issues)) return null;
  if (request.synthetic_only !== true) issue(issues, 'SYNTHETIC_ONLY', '/request/synthetic_only', 'This prototype does not accept real runs.');
  if (request.contract_id !== CONTRACT_ID) issue(issues, 'CONTRACT_VERSION', '/request/contract_id', 'The exact draft contract ID is required.');
  for (const name of ['repository_id', 'snapshot_id']) if (!/^toy-[A-Za-z0-9._-]+$/.test(request[name] ?? ''))
    issue(issues, 'TOY_ID_REQUIRED', `/request/${name}`, 'Use an explicit toy identifier, not a real repository or revision.');
  for (const name of ['requested_levels', 'supported_levels']) {
    if (strings(request[name], `/request/${name}`, issues, { vocabulary: LEVELS, nonempty: name === 'requested_levels' }))
      unique(request[name], `/request/${name}`, issues);
  }
  if (Array.isArray(request.supported_levels) && Array.isArray(request.requested_levels) &&
    request.supported_levels.some(level => !request.requested_levels.includes(level)))
    issue(issues, 'SUPPORTED_NOT_REQUESTED', '/request/supported_levels', 'This profile declares support within requested levels only.');
  if (strings(request.repair_strategy_ids, '/request/repair_strategy_ids', issues))
    unique(request.repair_strategy_ids, '/request/repair_strategy_ids', issues);

  const entities = new Map(), methods = new Map(), evidence = new Map(), aliases = new Map();
  if (array(request.registry, '/request/registry', issues)) for (const [index, entity] of request.registry.entries()) {
    const path = `/request/registry/${index}`;
    if (!fields(entity, ['level', 'entity_id', 'service', 'seed', 'in_universe', ...(entity?.level === 'api' ? ['handler_id'] : [])], path, issues)) continue;
    if (!LEVELS.includes(entity.level) || !canonicalShape(entity, request))
      issue(issues, 'REGISTRY_ID', path, 'Canonical level/repository/snapshot/service/ID shape does not match.');
    if (typeof entity.seed !== 'boolean' || typeof entity.in_universe !== 'boolean' || (entity.seed && entity.in_universe))
      issue(issues, 'REGISTRY_SCOPE', path, 'Declare Boolean seed and in_universe; a seed is not eligible.');
    const id = key(entity.level, entity.entity_id);
    if (entities.has(id)) issue(issues, 'DUPLICATE_REGISTRY_ID', path, 'Canonical registry key is duplicated.');
    entities.set(id, entity);
    if (entity.level === 'method') methods.set(entity.entity_id, entity);
  }
  const seed = methods.get(request.seed_method_id);
  if (!seed?.seed || [...methods.values()].filter(entity => entity.seed).length !== 1)
    issue(issues, 'SEED_METHOD', '/request/seed_method_id', 'Exactly one seed Method must be explicitly registered.');
  for (const [index, entity] of (Array.isArray(request.registry) ? request.registry : []).entries()) {
    if (!object(entity)) continue;
    if (entity.level === 'api') {
      const handler = methods.get(entity.handler_id);
      if (!handler || handler.service !== entity.service || (entity.seed && entity.handler_id !== request.seed_method_id))
        issue(issues, 'API_HANDLER_BINDING', `/request/registry/${index}`, 'API handler must be a registered Method in the same service; seed binding must match.');
    }
    if (entity.level === 'service' && seed && entity.seed !== (entity.service === seed.service))
      issue(issues, 'SEED_SERVICE', `/request/registry/${index}`, 'The seed-owning Service must be excluded consistently.');
  }

  if (array(request.evidence, '/request/evidence', issues)) for (const [index, item] of request.evidence.entries()) {
    const path = `/request/evidence/${index}`;
    if (!fields(item, ['id', 'snapshot_id', 'text'], path, issues)) continue;
    if (!text(item.id) || !text(item.text) || item.text.length > 100_000 || item.snapshot_id !== request.snapshot_id)
      issue(issues, 'EVIDENCE_BINDING', path, 'Toy evidence needs ID, bounded text and the declared toy snapshot.');
    if (evidence.has(item.id)) issue(issues, 'DUPLICATE_EVIDENCE_ID', path, 'Evidence IDs must be unique.');
    evidence.set(item.id, item);
  }
  if (![...evidence.values()].some(item => hasQuotableText(item.text)))
    issue(issues, 'NO_CITABLE_EVIDENCE', '/request/evidence', 'Summary citation is impossible: fix input preparation, never fabricate a quote.');
  if (array(request.aliases, '/request/aliases', issues)) for (const [index, item] of request.aliases.entries()) {
    const path = `/request/aliases/${index}`;
    if (!fields(item, ['level', 'raw_id', 'canonical_id', 'evidence_id'], path, issues)) continue;
    const rawKey = key(item.level, item.raw_id);
    if (!LEVELS.includes(item.level) || !text(item.raw_id) || !entities.has(key(item.level, item.canonical_id)) || !evidence.has(item.evidence_id))
      issue(issues, 'ALIAS_BINDING', path, 'Alias needs an exact canonical target of the same level and registered evidence.');
    if (aliases.has(rawKey) || entities.has(rawKey))
      issue(issues, 'AMBIGUOUS_ALIAS', path, 'Alias cannot be duplicated, chained, or shadow a canonical ID.');
    aliases.set(rawKey, item);
  }
  if (fields(request.path_validation, ['kind', 'logical_edges'], '/request/path_validation', issues)) {
    if (!['supplied_graph', 'source_inferred'].includes(request.path_validation.kind))
      issue(issues, 'PATH_CHECK_KIND', '/request/path_validation/kind', 'Select supplied_graph or source_inferred explicitly.');
    if (array(request.path_validation.logical_edges, '/request/path_validation/logical_edges', issues)) {
      for (const [index, edge] of request.path_validation.logical_edges.entries()) {
        const path = `/request/path_validation/logical_edges/${index}`;
        if (!fields(edge, ['caller', 'callee', 'type'], path, issues)) continue;
        if (!methods.has(edge.caller) || !methods.has(edge.callee) || !design.proposed_path_policy.logical_edges.includes(edge.type))
          issue(issues, 'LOGICAL_EDGE', path, 'Only directed Method CALLS/INVOKES_API edges are supported.');
      }
      if (request.path_validation.kind === 'source_inferred' && request.path_validation.logical_edges.length !== 0)
        issue(issues, 'SOURCE_MODE_HAS_GRAPH', '/request/path_validation/logical_edges', 'Source-inferred mode must not claim graph verification.');
    }
  }
  return issues.length === 0 ? { request, entities, methods, evidence, aliases } : null;
}

function resolve(level, raw, context) {
  if (!text(raw)) return null;
  const exact = context.entities.get(key(level, raw));
  if (exact) return { entity: exact, kind: 'exact_canonical', alias_evidence_id: null };
  const alias = context.aliases.get(key(level, raw));
  return alias ? { entity: context.entities.get(key(level, alias.canonical_id)), kind: 'declared_alias', alias_evidence_id: alias.evidence_id } : null;
}

function checkCitations(items, pure, path, context, issues) {
  if (!array(items, path, issues)) return;
  const policy = design.proposed_citation_policy;
  if (items.length < (pure ? 0 : 1) || items.length > policy.max_per_record)
    issue(issues, 'CITATION_COUNT', path, 'Only pure abstention may omit citations; at most 30 are allowed.');
  for (const [index, citation] of items.entries()) {
    const point = at(path, index);
    if (!fields(citation, ['evidence_id', 'quote'], point, issues)) continue;
    const source = context.evidence.get(citation.evidence_id);
    if (!source) issue(issues, 'UNKNOWN_EVIDENCE_ID', at(point, 'evidence_id'), 'Evidence ID was not supplied in this request.');
    if (typeof citation.quote !== 'string' || citation.quote.replace(/\s/g, '').length < policy.quote_min_non_whitespace_length || citation.quote.length > policy.quote_max_length)
      issue(issues, 'QUOTE_LENGTH', at(point, 'quote'), 'Quote needs at least 8 non-whitespace characters and at most 2400 total characters.');
    else if (source && !source.text.includes(citation.quote))
      issue(issues, 'QUOTE_MISMATCH', at(point, 'quote'), 'Quote must be an exact substring; no case/newline/whitespace normalization.');
  }
}

function checkPath(item, entity, path, context, issues) {
  const initialIssueCount = issues.length;
  if (!array(item.dependency_path, at(path, 'dependency_path'), issues)) return null;
  if (item.dependency_status !== 'reachable') {
    if (item.dependency_path.length !== 0 || item.logical_hops !== null || item.service_boundary_crossings !== null)
      issue(issues, 'UNESTABLISHED_PATH', path, 'Without a reachable claim use an empty path and null counts, not zero.');
    return null;
  }
  const rawPath = item.dependency_path;
  const resolved = rawPath.map(id => resolve('method', id, context));
  if (rawPath.length < 2 || rawPath.length > 4) issue(issues, 'PATH_LENGTH', at(path, 'dependency_path'), 'A witness has 1–3 logical hops (2–4 Method IDs).');
  if (resolved.some(result => !result)) {
    issue(issues, 'PATH_METHOD_ID', at(path, 'dependency_path'), 'Every path node must resolve to a registered Method at the declared snapshot.'); return null;
  }
  const canonical = resolved.map(result => result.entity.entity_id);
  if (new Set(canonical).size !== canonical.length) issue(issues, 'PATH_CYCLE', at(path, 'dependency_path'), 'Witness Method IDs must be unique after alias resolution.');
  if (canonical.at(-1) !== context.request.seed_method_id) issue(issues, 'PATH_SEED', at(path, 'dependency_path'), 'Caller-to-callee witness must end at the seed Method.');
  if (entity && ((item.level === 'method' && canonical[0] !== entity.entity_id) ||
    (item.level === 'api' && canonical[0] !== entity.handler_id) ||
    (item.level === 'service' && resolved[0]?.entity.service !== entity.service)))
    issue(issues, 'PATH_ANCHOR', at(path, 'dependency_path'), 'Witness does not start at the Method/API handler/Service-owned Method.');
  if (!Number.isInteger(item.logical_hops) || item.logical_hops < 1 || item.logical_hops > 3 || item.logical_hops !== rawPath.length - 1)
    issue(issues, 'LOGICAL_HOPS', at(path, 'logical_hops'), 'Hop count must match logical Method edges; containment adds no hop.');
  let boundaries = 0;
  for (let index = 0; index + 1 < resolved.length; index++) {
    boundaries += Number(resolved[index].entity.service !== resolved[index + 1].entity.service);
    if (context.request.path_validation.kind === 'supplied_graph' && !context.request.path_validation.logical_edges.some(edge =>
      edge.caller === canonical[index] && edge.callee === canonical[index + 1]))
      issue(issues, 'GRAPH_EDGE_MISSING', at(path, 'dependency_path'), 'Directed logical edge is absent from the supplied toy graph.');
  }
  if (!Number.isInteger(item.service_boundary_crossings) || item.service_boundary_crossings !== boundaries)
    issue(issues, 'BOUNDARY_COUNT', at(path, 'service_boundary_crossings'), 'Boundary count must match owning services along the witness.');
  return { canonical_path: canonical, kind: issues.length !== initialIssueCount ? 'invalid_witness' :
    context.request.path_validation.kind === 'supplied_graph' ? 'matches_supplied_graph' : 'source_inferred_not_graph_verified' };
}

function checkRecord(item, index, context) {
  const issues = [], path = `/attempt/payload/assessments/${index}`;
  const ledger = { index, raw_id: object(item) ? (item.entity_id ?? null) : null,
    level: LEVELS.includes(item?.level) ? item.level : null, canonical_id: null,
    identity_resolution: null, alias_evidence_id: null, status: 'invalid', path_check: null, issues };
  if (!fields(item, design.proposed_payload.assessment_fields, path, issues)) return ledger;
  if (!ledger.level) issue(issues, 'LEVEL', at(path, 'level'), 'Expected method, api or service.');
  const resolved = resolve(item.level, item.entity_id, context), entity = resolved?.entity;
  if (!text(item.entity_id)) issue(issues, 'ENTITY_ID', at(path, 'entity_id'), 'Entity ID must be a nonempty string.');
  else if (!entity) issue(issues, 'OUT_OF_SCOPE_ID', at(path, 'entity_id'), 'No exact canonical ID or declared alias; no fuzzy matching or snapshot substitution.');
  if (entity) {
    ledger.canonical_id = entity.entity_id; ledger.identity_resolution = resolved.kind; ledger.alias_evidence_id = resolved.alias_evidence_id;
    if (entity.seed) issue(issues, 'SEED_ASSESSMENT', at(path, 'entity_id'), 'Seed Method/API/owning Service is excluded from propagated assessments.');
    else if (!entity.in_universe) issue(issues, 'OUT_OF_SCOPE_ID', at(path, 'entity_id'), 'Support registry membership does not imply evaluation-universe membership.');
  }
  if (ledger.level && (!context.request.requested_levels.includes(item.level) || !context.request.supported_levels.includes(item.level)))
    issue(issues, 'UNSUPPORTED_LEVEL', at(path, 'level'), 'An assessment was returned at a level not requested and supported.');
  for (const name of ['dependency_status', 'behavioral_impact', 'requires_code_change'])
    if (!design.proposed_payload[name].includes(item[name])) issue(issues, 'ENUM', at(path, name), 'Value is outside the proposed vocabulary.');
  strings(item.assumptions, at(path, 'assumptions'), issues);
  if (!text(item.rationale)) issue(issues, 'RATIONALE', at(path, 'rationale'), 'A nonempty rationale is required, including for abstention.');
  if (['required', 'optional'].includes(item.requires_code_change)) {
    if (!context.request.repair_strategy_ids.includes(item.repair_strategy_id))
      issue(issues, 'REPAIR_STRATEGY', at(path, 'repair_strategy_id'), 'Required/optional repair must reference a request-registered strategy.');
  } else if (item.repair_strategy_id !== null)
    issue(issues, 'REPAIR_STRATEGY', at(path, 'repair_strategy_id'), 'Use null when no concrete repair obligation/option is claimed in this profile.');
  ledger.path_check = checkPath(item, entity, path, context, issues);
  const pure = item.dependency_status === 'unknown' && Array.isArray(item.dependency_path) && item.dependency_path.length === 0 &&
    item.logical_hops === null && item.service_boundary_crossings === null && item.behavioral_impact === 'unknown' &&
    item.requires_code_change === 'unknown' && item.repair_strategy_id === null;
  checkCitations(item.citations, pure, at(path, 'citations'), context, issues);
  ledger.status = issues.length ? 'invalid' : 'valid';
  return ledger;
}

const stable = value => Array.isArray(value) ? value.map(stable) : object(value) ?
  Object.fromEntries(Object.keys(value).sort().map(name => [name, stable(value[name])])) : value;

function quarantineDuplicates(records, assessments) {
  const groups = new Map();
  for (const record of records) if (record.canonical_id !== null) {
    const id = key(record.level, record.canonical_id);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(record);
  }
  for (const group of groups.values()) if (group.length > 1) {
    const signatures = group.map(record => JSON.stringify(stable({ ...assessments[record.index], entity_id: record.canonical_id })));
    const code = new Set(signatures).size === 1 ? 'DUPLICATE_CANONICAL_ID' : 'CONFLICTING_DUPLICATE';
    for (const record of group) {
      record.status = 'invalid';
      issue(record.issues, code, `/attempt/payload/assessments/${record.index}/entity_id`,
        'All records for this canonical key are quarantined; no favorable duplicate is selected. Scoring policy remains open.');
    }
  }
}

function coverage(context, records, assessments, state) {
  const result = {};
  for (const level of context.request.requested_levels) {
    const supported = context.request.supported_levels.includes(level);
    const eligible = [...context.entities.values()].filter(entity => entity.level === level && entity.in_universe && !entity.seed);
    const own = records.filter(record => record.level === level), valid = own.filter(record => record.status === 'valid');
    const entities = eligible.map(entity => {
      const rows = own.filter(record => record.canonical_id === entity.entity_id);
      const row = rows.find(record => record.status === 'valid');
      const status = !supported ? 'unsupported_level' : state !== 'completed' ? state : rows.length === 0 ? 'not_returned' : !row ? 'invalid' :
        assessments[row.index].behavioral_impact === 'unknown' ? 'unknown' : 'assessed';
      return { entity_id: entity.entity_id, status };
    });
    const countable = supported && state === 'completed';
    result[level] = { supported, eligible: eligible.length, state: !supported ? 'unsupported_level' : state,
      returned_distinct_valid: countable ? valid.length : null,
      behavioral_unknown: countable ? entities.filter(entity => entity.status === 'unknown').length : null,
      not_returned: countable ? entities.filter(entity => entity.status === 'not_returned').length : null,
      invalid: countable ? entities.filter(entity => entity.status === 'invalid').length : null,
      raw_records: own.length, entities };
  }
  return result;
}

export function validateSyntheticAttempt(request, attempt) {
  const report = { validator_id: VALIDATOR_ID, contract_id: CONTRACT_ID, synthetic_only: true,
    applied_to_runtime: false, production_ready: false, input_status: 'invalid', execution_status: null,
    execution_failure: null, validation_status: 'not_checked', semantic_correctness_verified: false, lineage_verified: false,
    ground_truth_accepted: false, official_scoring_authorized: false, score_export_created: false,
    pending_decisions: design.open_decisions.map(item => item.id), issues: [], records: [], coverage: null };
  const context = checkRequest(request, report.issues);
  if (!context) return report;
  report.input_status = 'valid';
  if (!fields(attempt, ['synthetic_only', 'execution', 'payload'], '/attempt', report.issues)) {
    report.validation_status = 'invalid'; return report;
  }
  if (attempt.synthetic_only !== true) issue(report.issues, 'SYNTHETIC_ONLY', '/attempt/synthetic_only', 'Only synthetic attempts are supported.');
  const execution = attempt.execution;
  if (fields(execution, ['status', 'actual_remote_calls', 'usage', 'failure'], '/attempt/execution', report.issues)) {
    if (design.proposed_run_envelope.execution_states.includes(execution.status)) report.execution_status = execution.status;
    else issue(report.issues, 'EXECUTION_STATUS', '/attempt/execution/status', 'Unknown execution state.');
    if (execution.actual_remote_calls !== 0 || execution.usage !== null)
      issue(report.issues, 'SYNTHETIC_EXECUTION', '/attempt/execution', 'This fixture profile requires zero remote calls and unmeasured usage=null.');
    if (execution.status === 'failed') {
      if (!fields(execution.failure, ['stage', 'code', 'http_status', 'message'], '/attempt/execution/failure', report.issues) ||
        !text(execution.failure?.stage) || !text(execution.failure?.code) || !text(execution.failure?.message) ||
        !(execution.failure?.http_status === null || (Number.isInteger(execution.failure?.http_status) && execution.failure.http_status >= 100 && execution.failure.http_status <= 599)))
        issue(report.issues, 'FAILURE_DETAIL', '/attempt/execution/failure', 'A synthetic failure needs safe stage/code/message and null or valid HTTP status.');
      else report.execution_failure = { input_pointer: '/attempt/execution/failure', stage: execution.failure.stage,
        code: execution.failure.code, http_status: execution.failure.http_status };
    } else if (execution.failure !== null) issue(report.issues, 'UNEXPECTED_FAILURE', '/attempt/execution/failure', 'Non-failed state must have failure=null.');
  }
  if (report.execution_status !== 'completed') {
    if (attempt.payload !== null) issue(report.issues, 'NONCOMPLETED_PAYLOAD', '/attempt/payload', 'Failed/not-run attempts must not masquerade as successful empty predictions.');
    report.validation_status = report.issues.length ? 'invalid' : 'not_checked';
    report.coverage = coverage(context, [], [], report.execution_status === 'failed' ? 'execution_failed' :
      report.execution_status === 'not_run' ? 'not_run' : 'invalid_run');
    return report;
  }

  const payload = attempt.payload;
  if (fields(payload, design.proposed_payload.fields, '/attempt/payload', report.issues)) {
    if (fields(payload.summary, ['text', 'citations'], '/attempt/payload/summary', report.issues)) {
      if (!text(payload.summary.text)) issue(report.issues, 'SUMMARY_TEXT', '/attempt/payload/summary/text', 'Summary text must be nonempty.');
      checkCitations(payload.summary.citations, false, '/attempt/payload/summary/citations', context, report.issues);
    }
    strings(payload.uncertainties, '/attempt/payload/uncertainties', report.issues);
    if (array(payload.assessments, '/attempt/payload/assessments', report.issues)) {
      report.records = payload.assessments.map((item, index) => checkRecord(item, index, context));
      quarantineDuplicates(report.records, payload.assessments);
    }
  }
  const recordIssues = report.records.flatMap(record => record.issues);
  const globalInvalid = report.issues.length > 0;
  report.issues.push(...recordIssues);
  report.validation_status = globalInvalid ? 'invalid' : recordIssues.length ?
    report.records.some(record => record.status === 'valid') ? 'partial' : 'invalid' : 'valid';
  report.coverage = coverage(context, report.records, payload?.assessments ?? [],
    globalInvalid || report.validation_status === 'invalid' ? 'invalid_run' : 'completed');
  return report;
}

export class SyntheticJsonError extends Error {
  constructor(code, path, message) { super(message); this.code = code; this.path = path; }
}

// Native JSON parsing alone silently chooses the last duplicate key. Preserve neither winner.
export function parseSyntheticJson(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > 1_048_576)
    throw new SyntheticJsonError('JSON_SIZE', '', 'Expected UTF-8 JSON of at most 1 MiB.');
  let parsed;
  try { parsed = JSON.parse(source); } catch { throw new SyntheticJsonError('JSON_SYNTAX', '', 'Input is not valid JSON.'); }
  let position = 0;
  const whitespace = () => { while (/\s/.test(source[position] ?? '') && position < source.length) position++; };
  function stringToken() {
    const start = position++;
    while (position < source.length) {
      if (source[position] === '\\') position += 2;
      else if (source[position++] === '"') break;
    }
    return JSON.parse(source.slice(start, position));
  }
  function visit(path, depth) {
    if (depth > 64) throw new SyntheticJsonError('JSON_DEPTH', path, 'Input exceeds the prototype nesting limit.');
    whitespace();
    if (source[position] === '{') {
      position++; whitespace(); const seen = new Set();
      while (source[position] !== '}') {
        const name = stringToken();
        if (seen.has(name)) throw new SyntheticJsonError('DUPLICATE_JSON_KEY', at(path, name), 'Duplicate JSON key; no last-wins interpretation.');
        seen.add(name); whitespace(); position++; visit(at(path, name), depth + 1); whitespace();
        if (source[position] !== ',') break;
        position++; whitespace();
      }
      position++;
    } else if (source[position] === '[') {
      position++; whitespace(); let index = 0;
      while (source[position] !== ']') {
        visit(at(path, index++), depth + 1); whitespace();
        if (source[position] !== ',') break;
        position++; whitespace();
      }
      position++;
    } else if (source[position] === '"') stringToken();
    else while (position < source.length && !/[\s,}\]]/.test(source[position])) position++;
  }
  visit('', 0);
  return parsed;
}
