import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateReceipt,owned,LABEL,SEEDS } from './offline-method.mjs';
const receipt=JSON.parse(await readFile(new URL('../../tasks/hien-next/P02_TECHNICAL_RECEIPT_2026-11-01.json',import.meta.url)));
const authority=JSON.parse(await readFile(new URL('../../benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json',import.meta.url)));
const inputs=JSON.parse(await readFile(new URL('../../benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json',import.meta.url)));
test('checked per-case receipt grants only technical offline scope',()=>assert.equal(validateReceipt(receipt,authority,inputs),true));
test('P03, unreviewed version and wrong input cannot reuse P02 receipt',()=>{
 assert.throws(()=>validateReceipt({...receipt,case:'P03'},authority,inputs));
 assert.throws(()=>validateReceipt({...receipt,checkpoint_version:'draft.v3'},authority,inputs));
 assert.throws(()=>validateReceipt(receipt,authority,{...inputs,universe_sha256:'wrong'}));
});
test('receipt cannot authorize inference, scoring, shared draft adoption or annotation access',()=>{
 for(const key of ['model_calls_authorized','official_scoring_authorized','shared_draft_contract_adoption_authorized','labels_or_annotation_notes_included'])
  assert.throws(()=>validateReceipt({...receipt,[key]:true},authority,inputs));
});
test('cleanup requires exact run prefix and owner label together',()=>{
 assert.equal(owned('p02m-owner-baseline',{[LABEL]:'owner'},'owner'),true);
 assert.throws(()=>owned('p02m-owner-baseline',{[LABEL]:'other'},'owner'));
 assert.throws(()=>owned('foreign-db',{[LABEL]:'owner'},'owner'));
});
test('the declared mutation changes the Java seed signature independently of HTTP path',()=>{
 assert.notEqual(SEEDS.baseline,SEEDS.mutated);
 assert.match(SEEDS.baseline,/#read\(List<Integer>\)$/);
 assert.match(SEEDS.mutated,/#read\(List<Integer>,boolean\)$/);
 assert.equal(SEEDS.mutated.replace(',boolean)',')'),SEEDS.baseline);
});
