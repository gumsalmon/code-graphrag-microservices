import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = ['P01-TECH', 'P01-MODEL', 'HIEN-SOFTWARE', 'P02-RUNTIME', 'P02-HUMAN', 'P03-BASELINE', 'P03-SCOPE',
  'P03-INPUT', 'P03-PAIRED', 'P03-DRAFT', 'OUTPUT-CONTRACT', 'EXPERIMENT-DESIGN', 'OFFLINE-INTEGRATION',
  'P02-METHOD', 'P03-METHOD', 'VIEWER-E2E', 'REVIEW-PACKET', 'REVIEW-APPOINTMENT', 'BATCH-REVIEW', 'REVISIONS',
  'CODE-RELEASE', 'P04-OPEN', 'JOURNAL-CAMPAIGN'];
const STATUSES = ['verified_scoped', 'in_progress', 'blocked_decision', 'forwarded_awaiting_ack', 'awaiting_human', 'waiting_dependency', 'draft_open', 'deferred'];
const text = value => typeof value === 'string' && value.trim().length > 0;

// Structural tracking check only. Passing cannot certify human reading, open gates or grant permission.
export async function checkWorkboard(board, { root = ROOT } = {}) {
  const errors = [], evidencePaths = new Set(), ids = new Map();
  const check = (ok, message) => { if (!ok) errors.push(message); };
  check(board?.schema === 'petclinic-workboard/1', 'Unsupported board schema');
  check(Array.isArray(board?.tasks) && board.tasks.length > 0, 'Tasks required');
  const roles = board?.roles ?? {};
  for (const role of ['huy', 'coordinator_ai', 'hien', 'phat', 'external_reviewer']) check(text(roles[role]), 'Missing role: ' + role);
  for (const row of board?.tasks ?? []) {
    check(text(row.id) && !ids.has(row.id), 'Duplicate/missing task ID: ' + row.id);
    ids.set(row.id, row);
    check(text(roles[row.owner]), 'Unknown/missing owner: ' + row.id);
    check(STATUSES.includes(row.status), 'Unknown status: ' + row.id);
    for (const key of ['input', 'output', 'done_when', 'next_action']) check(text(row[key]), 'Missing ' + key + ': ' + row.id);
    check(Array.isArray(row.depends_on), 'Missing dependencies: ' + row.id);
    check(Array.isArray(row.evidence) && row.evidence.length > 0, 'Missing evidence references: ' + row.id);
    for (const file of row.evidence ?? []) evidencePaths.add(file);
    if (['phat', 'external_reviewer'].includes(row.owner) && row.status === 'verified_scoped') {
      check(text(row.human_decision_record), 'Human task cannot complete without decision record: ' + row.id);
      if (text(row.human_decision_record)) evidencePaths.add(row.human_decision_record);
    }
  }
  for (const id of REQUIRED) check(ids.has(id), 'Known track dropped: ' + id);
  const active = new Set(), visited = new Set();
  function visit(id) {
    if (active.has(id)) { errors.push('Dependency cycle: ' + id); return; }
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of ids.get(id)?.depends_on ?? []) {
      check(ids.has(dependency), 'Unknown dependency: ' + id + ' -> ' + dependency);
      if (ids.has(dependency)) visit(dependency);
    }
    active.delete(id); visited.add(id);
  }
  for (const id of ids.keys()) visit(id);
  function inside(file) {
    if (typeof file !== 'string' || !file || file.includes('\\') || file.split('/').some(part => ['..', '.', ''].includes(part)) || path.isAbsolute(file)) return null;
    const absolute = path.resolve(root, file), relative = path.relative(root, absolute);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? absolute : null;
  }
  const deliveries = Array.isArray(board?.deliveries) ? board.deliveries : [];
  for (const id of ['HIEN-SOFTWARE', 'P03-SCOPE']) check(deliveries.filter(row => row.task_id === id).length === 1, 'Missing/duplicate delivery: ' + id);
  for (const delivery of deliveries) {
    check(ids.has(delivery.task_id), 'Delivery without task: ' + delivery.task_id);
    check(typeof delivery.forwarded === 'boolean' && typeof delivery.recipient_acknowledged === 'boolean' && text(delivery.reported_by), 'Delivery attribution missing: ' + delivery.task_id);
    check(!delivery.recipient_acknowledged || text(delivery.acknowledgement_record), 'ACK requires record: ' + delivery.task_id);
    if (delivery.acknowledgement_record) evidencePaths.add(delivery.acknowledgement_record);
    const absolute = inside(delivery.packet);
    check(absolute !== null, 'Unsafe packet path: ' + delivery.task_id);
    if (absolute) {
      try { check(createHash('sha256').update(await readFile(absolute)).digest('hex') === delivery.sha256, 'Packet hash mismatch: ' + delivery.task_id); }
      catch { errors.push('Packet missing: ' + delivery.task_id); }
    }
  }
  for (const file of evidencePaths) {
    const absolute = inside(file);
    if (!absolute) { errors.push('Unsafe evidence path: ' + file); continue; }
    try { check((await stat(absolute)).isFile(), 'Evidence is not file: ' + file); }
    catch { errors.push('Evidence missing: ' + file); }
  }
  return { check: 'petclinic-workboard/1', scope: 'mechanical_tracking_only_not_scientific_completeness_or_human_verification',
    authorizes_new_actions: false, success: errors.length === 0, tasks: ids.size, evidence_files: evidencePaths.size,
    deliveries_checked: deliveries.length, open_tasks: [...ids.values()].filter(row => row.status !== 'verified_scoped').map(row => row.id), errors };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) { console.error('Usage: node scripts/check_petclinic_workboard.mjs'); process.exitCode = 2; }
  else {
    const board = JSON.parse(await readFile(path.join(ROOT, 'tasks/PETCLINIC_WORKBOARD.json'), 'utf8'));
    const report = await checkWorkboard(board);
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.success ? 0 : 1;
  }
}
