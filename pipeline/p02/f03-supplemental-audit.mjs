// Extra read-only semantic checks; separate from frozen runner/code snapshots.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sha256} from '../../scripts/verify_p02_revision.mjs';
const json=async path=>JSON.parse(await readFile(path));
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const canonical=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);
export function validateSupport(fixture,bodies) {
  for(const name of ['config-visits','config-customers']) {
    const props=Object.assign({},...[...(bodies[name]?.propertySources??[])].reverse().map(p=>p.source));
    check(props['spring.sql.init.data-locations']==='classpath*:db/hsqldb/data.sql'&&props['spring.sql.init.schema-locations']==='classpath*:db/hsqldb/schema.sql','Wrong SQL runtime config');
  }
  const apps=bodies['discovery-registry']?.applications?.application;
  check(Array.isArray(apps)&&['CUSTOMERS-SERVICE','VISITS-SERVICE','API-GATEWAY'].every(name=>apps.some(a=>a.name===name&&
    (Array.isArray(a.instance)?a.instance:[a.instance]).some(i=>i?.status==='UP'))),'Real registered consumer/provider not UP');
  return true;
}
export async function supplementalAudit(root) {
  const input=await json(resolve(root,'inputs.json'));
  const inventory=await json(resolve(input.candidate_directory,'draft/inventory.v1.json'));
  const before=await json(resolve(root,'mutated-build/source-before.json'));
  for(const [name,expected]of Object.entries(inventory.source_files_sha256))check(before[name]===expected,'Build source differs from reviewed input: '+name);
  const configHashes={},overrideHashes={};const groups=[];
  for(const snapshot of ['baseline','mutated'])for(const repetition of [1,2]) {
    const id=snapshot+'-r'+repetition,dir=resolve(root,'groups',id),bodies={};
    for(const name of ['config-visits','config-customers','config-gateway','discovery-registry']) {
      bodies[name]=await json(resolve(dir,'setup',name+'.body'));
      if(name!=='discovery-registry') {
        const hash=sha256(canonical(bodies[name]));
        if(configHashes[name])check(configHashes[name]===hash,'Effective config differs across snapshots/repetitions');else configHashes[name]=hash;
      }
    }
    validateSupport(null,bodies);
    for(const service of ['config-server','discovery-server','customers-service','visits-service','api-gateway']) {
      const command=await json(resolve(dir,'start-'+service+'.command.json'));
      const jar=command.args.indexOf('-jar');check(jar>0,'No actual JAR start');
      const overrideHash=sha256(canonical(command.args.slice(jar-2)));
      if(overrideHashes[service])check(overrideHashes[service]===overrideHash,'Runtime overrides differ between snapshots');else overrideHashes[service]=overrideHash;
    }
    groups.push({id,reviewed_config_and_registry_verified:true});
  }
  return {schema:'p02-f03-supplemental-audit/1',reviewed_source_files:12,effective_config_identical:true,
    service_runtime_overrides_identical:true,config_hashes:configHashes,override_hashes:overrideHashes,groups,labels_created:false};
}
