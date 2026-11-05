// Reviewed source/tests only; cached image, no network, no received helper execution.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ROOT,command,write } from './run_p02_f03.mjs';
import { PYTHON_IMAGE } from '../pipeline/p02/offline-method.mjs';
const directory=resolve(ROOT,'handoff-out/hien-p02-return/20261102T135352Z-54131bc0');
const implementation=resolve(directory,'unit-candidate');
const owner=randomUUID(),name='p02-unit-'+owner,label='code-graphrag.p02-return-units';
let result;
try{
 await command(directory,'unit-image','docker',['image','inspect',PYTHON_IMAGE,'--format','{{json .Id}}']);
 result=await command(directory,'independent-units','docker',['run','--rm','--pull','never','--name',name,'--label',label+'='+owner,
  '--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
  '--tmpfs','/tmp:rw,nosuid,nodev,size=128m','--mount','type=bind,source='+implementation+',target=/implementation,readonly',
  '--workdir','/implementation',PYTHON_IMAGE,'python','-B','-m','unittest','discover','-s','tests','-p','test_*.py','-v'],
  {timeout:120000,allowFailure:true});
}finally{
 const inspection=await command(directory,'unit-cleanup-inspect','docker',['inspect',name],{allowFailure:true});
 if(inspection.code===0){
  const value=JSON.parse(inspection.stdout)[0];
  if(value.Config.Labels?.[label]!==owner||value.Name!=='/'+name)throw Error('Refuse foreign unit container');
  await command(directory,'unit-cleanup-remove','docker',['rm','--force','--volumes',name]);
 }else if(!(inspection.code===1&&/No such (?:object|container)/i.test(inspection.stderr)))throw Error('Unit cleanup could not verify target');
}
if(!result||result.code!==0||!/Ran 24 tests/.test(result.stderr)||!result.stderr.trim().endsWith('OK'))throw Error('Expected 24 independent unit tests, no skips; inspect retained logs');
await write(directory,'INDEPENDENT_UNIT_RESULT.json',{tests_passed:24,failed:0,skipped:0,
 scope:'Reviewed 21 previous tests plus 3 new regressions in local cached Python image; not full legacy 59-test/Chroma suite',
 image:PYTHON_IMAGE,network:'none',implementation_read_only:true,received_helpers_executed:false,model_calls:0});
console.log(JSON.stringify({tests_passed:24,failed:0,skipped:0,model_calls:0}));
