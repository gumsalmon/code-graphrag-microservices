import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertReviewedManifest,assertReviewedAudit } from './reviewed-native.mjs';
const run=new URL('../../handoff-out/p02-offline-method-reviewed/20261102t140320547z-03c452f7/',import.meta.url);
const manifest=await readFile(new URL('SHA256SUMS.txt',run));
const provenance=JSON.parse(await readFile(new URL('INPUT_PROVENANCE.json',run),'utf8'));
const report=JSON.parse(await readFile(new URL('../../hien-p02-return/20261102T135352Z-54131bc0/independent-reviewed-run-check.stdout.log',run),'utf8'));

test('checked source-only identity and both audited snapshots are accepted without mutating data',()=>{
 const before=JSON.stringify(provenance);assert.equal(assertReviewedManifest(manifest,provenance),true);
 assert.equal(assertReviewedAudit(manifest,report,provenance),true);assert.equal(JSON.stringify(provenance),before);
});
test('a previous run manifest cannot be promoted to the reviewed identity',()=>{
 assert.throws(()=>assertReviewedManifest(Buffer.from('older manifest'),provenance),/Different reviewed native manifest/);
});
test('reference code or widened input provenance is refused despite a valid native manifest',()=>{
 for(const mutate of [p=>{p.implementation.parser='0'.repeat(64);},p=>{p.benchmark_raw_or_labels_mounted=true;},p=>{p.reviewed_implementation_profile_sha256='0'.repeat(64);}]){
  const value=structuredClone(provenance);mutate(value);assert.throws(()=>assertReviewedManifest(manifest,value),/Different reviewed implementation/);
 }
});
test('incomplete properties, inventory or model-enabled audit cannot be displayed as reviewed',()=>{
 for(const mutate of [r=>{r.groups[0].full_node_property_parity=false;},r=>{r.groups[1].structural_method_inventory.represented=4;},r=>{r.model_calls=1;}]){
  const value=structuredClone(report);mutate(value);assert.throws(()=>assertReviewedAudit(manifest,value,provenance),/Reviewed parity|Wrong reviewed audit/);
 }
});
