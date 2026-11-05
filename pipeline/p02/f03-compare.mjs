// Derived observations only; never gold impact, a scorer, or silent raw rewrite.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export function normalizeSuccessful(value,key='') {
  if(Array.isArray(value)) {
    const rows=value.map(item=>normalizeSuccessful(item));
    if(['items','pets','visits'].includes(key)&&rows.every(r=>r&&typeof r==='object'&&Number.isInteger(r.id)))rows.sort((a,b)=>a.id-b.id);
    return rows;
  }
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalizeSuccessful(value[k],k)]));
  return value;
}
export async function compareF03Bodies(root,fixture) {
  const rows=[];
  for(const repetition of [1,2])for(const request of fixture.requests) {
    const read=async snapshot=>{
      const directory=resolve(root,'groups',snapshot+'-r'+repetition,'observations');
      return {record:JSON.parse(await readFile(resolve(directory,request.id+'.json'))),body:await readFile(resolve(directory,request.id+'.body'))};
    };
    const left=await read('baseline'),right=await read('mutated');
    const success=[left,right].every(v=>v.record.error===null&&v.record.status>=200&&v.record.status<300);
    let normalizedEqual=null;
    if(success) {
      try{normalizedEqual=JSON.stringify(normalizeSuccessful(JSON.parse(left.body)))===JSON.stringify(normalizeSuccessful(JSON.parse(right.body)));}
      catch{normalizedEqual=null;}
    }
    rows.push({request_id:request.id,repetition,role:request.role,method:request.method,
      baseline_status:left.record.status,mutated_status:right.record.status,
      raw_body_equal:left.body.equals(right.body),normalized_success_body_equal:normalizedEqual,
      baseline_body_sha256:left.record.body_sha256,mutated_body_sha256:right.record.body_sha256,
      interpretation:'Observation only, not a positive/negative impact label'});
  }
  return {schema:'p02-f03-derived-body-comparison/1',rows,
    normalization:'Successful JSON: recursive object-key ordering and items/pets/visits numeric-ID ordering only; no fields dropped. Error raw bytes/timestamps retained; no semantic equality inferred.',
    labels_created:false,official_scoring_authorized:false};
}
