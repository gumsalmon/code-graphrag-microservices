import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSuccessful} from './f03-compare.mjs';
import {validateSupport} from './f03-supplemental-audit.mjs';
test('normalization preserves all fields and does not mutate raw input',()=>{
  const raw={pets:[{id:8,visits:[{id:3,extra:'keep'},{id:2}]},{id:7}],other:['b','a'],timestamp:'keep'};
  const saved=structuredClone(raw),n=normalizeSuccessful(raw);
  assert.deepEqual(raw,saved);assert.deepEqual(n.pets.map(p=>p.id),[7,8]);assert.deepEqual(n.pets[1].visits.map(v=>v.id),[2,3]);
  assert.equal(n.pets[1].visits[1].extra,'keep');assert.deepEqual(n.other,['b','a']);assert.equal(n.timestamp,'keep');
});
test('unsupported/unidentified array order is never silently changed',()=>{
  assert.deepEqual(normalizeSuccessful([{name:'b'},{name:'a'}],'items'),[{name:'b'},{name:'a'}]);
});
test('support validation recomputes SQL/registry rather than trusting summary booleans',()=>{
  const config={propertySources:[{source:{'spring.sql.init.data-locations':'classpath*:db/hsqldb/data.sql','spring.sql.init.schema-locations':'classpath*:db/hsqldb/schema.sql'}}]};
  const bodies={'config-visits':config,'config-customers':config,'discovery-registry':{applications:{application:
    ['CUSTOMERS-SERVICE','VISITS-SERVICE','API-GATEWAY'].map(name=>({name,instance:[{status:'UP'}]}))}}};
  assert.equal(validateSupport(null,bodies),true);
  assert.throws(()=>validateSupport(null,{...bodies,'config-visits':{propertySources:[]}}));
  assert.throws(()=>validateSupport(null,{...bodies,'discovery-registry':{applications:{application:[]}}}));
});
