import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkWorkboard } from './check_petclinic_workboard.mjs';
const board = JSON.parse(await readFile(new URL('../tasks/PETCLINIC_WORKBOARD.json', import.meta.url), 'utf8'));
test('current board resolves known responsibilities, dependencies, evidence and exact sent ZIPs', async () => {
  const r = await checkWorkboard(board); assert.equal(r.success, true, JSON.stringify(r.errors));
  assert.equal(r.authorizes_new_actions, false);
});
test('dropping Hien task or its owner cannot silently pass', async () => {
  for (const edit of [value => { value.tasks = value.tasks.filter(row => row.id !== 'HIEN-SOFTWARE'); },
    value => { delete value.tasks.find(row => row.id === 'HIEN-SOFTWARE').owner; }]) {
    const value = structuredClone(board); edit(value); assert.equal((await checkWorkboard(value)).success, false);
  }
});
test('unknown dependency or dependency cycle is reported', async () => {
  for (const dependency of ['NONEXISTENT', 'P02-METHOD']) {
    const value = structuredClone(board);
    value.tasks.find(row => row.id === 'HIEN-SOFTWARE').depends_on.push(dependency);
    assert.equal((await checkWorkboard(value)).success, false);
  }
});
test('missing evidence, altered ZIP identity and invented acknowledgement are reported', async () => {
  for (const edit of [value => { value.tasks[0].evidence = ['../outside']; },
    value => { value.deliveries[0].sha256 = '0'.repeat(64); },
    value => { value.deliveries[0].recipient_acknowledged = true; delete value.deliveries[0].acknowledgement_record; }]) {
    const value = structuredClone(board); edit(value); assert.equal((await checkWorkboard(value)).success, false);
  }
});
test('mechanical checks cannot silently stand in for a human decision', async () => {
  const value = structuredClone(board);
  value.tasks.find(row => row.id === 'P02-HUMAN').status = 'verified_scoped';
  delete value.tasks.find(row => row.id === 'P02-HUMAN').human_decision_record;
  assert.ok((await checkWorkboard(value)).errors.some(error => error.includes('Human task cannot complete')));
});
