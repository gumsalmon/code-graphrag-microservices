"""Prepare private, content-screened R1/R2 data previews. Never release or review labels."""
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import re
import uuid
from package_project_transfer import extended_path,parse_manifest
from transfer_security import Scanner,SecurityError,safe_member,exclusion_reason

ROOT=Path(__file__).resolve().parent.parent
P01=ROOT/'handoff-out/p01-20261005-205206-5f9204d'
P02=ROOT/'handoff-out/p02-input-revision/20261018T065307839Z-719da955'
P03=ROOT/'handoff-out/p03-preparation/20261024T190227112Z-a8e852db'
P02_RETURN=ROOT/'handoff-out/team-returns-20261101/20261101T054957Z-a801d6ca/phat/received/P02_CHECKPOINT_2026-10-31'
P03_RETURN=ROOT/'handoff-out/p03-annotation-return/20261102T131035Z-4475b75e/received/P03_ANNOTATION_2026-11-01_v2'
SOURCE='3858f9c630cf989bb6809a86edf47c2be78dc9f1'
CONFIG='323993ce2519c6d02df63e08bf4458d123d3b611'
def raw(p):return extended_path(p).read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(raw(p).decode('utf-8-sig'))
def encoded(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def origin_path(p):
    text=str(p)
    if text.startswith('\\\\?\\'):text=text[4:]
    return Path(text).relative_to(ROOT).as_posix()
def walk(root):
    p=extended_path(root)
    return sorted((f.relative_to(p).as_posix(),f) for f in p.rglob('*') if f.is_file())

class ReviewScanner(Scanner):
    """Two exact-byte decision-path disambiguations; shared scanner stays unchanged."""
    def __init__(self):super().__init__();self.exceptions=[]
    def _text(self,name,data):
        expected={'d56cbfe0f4473195a9880600c0760e79b413a9a81c7cc0ee67b5f6afbb4d994b':'benchmark/p03/decisions/SELECTION_BASELINE_2026-10-28.json',
                  '2928977bdc0501c346f41bcdbda20acb726fdda3c97b284cfaddfccb9bb5a5c1':'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json'}
        h=sha(data)
        if h in expected:
            value=json.loads(data);assert value['authorization']==expected[h]
            view={('research_decision_path' if k=='authorization' else k):v for k,v in value.items()}
            self.exceptions.append({'file':name,'sha256':h,'field':'authorization','meaning':'research decision path','raw_modified':False})
            return super()._text(name,encoded(view))
        return super()._text(name,data)
    def summary(self):return {**super().summary(),'exact_byte_semantic_exceptions':self.exceptions}


def main():
    out=ROOT/'handoff-out/petclinic-review-data-preparation'/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8])
    out.mkdir(parents=True,exist_ok=False)
    catalog=[];omissions=[];originals={};screened=[];rounds={'R1-source-first':{},'R2-label-comparison':{}}
    scanner=ReviewScanner();review_flags=[]
    forbidden_parts={'reasoning','predictions','chroma_db','node_modules','.git','__pycache__','demo'}
    assessment_keys={'behavioral_impact','requires_code_change','gold_hops','polarity','impact_assessments','expected_impacted_nodes'}
    def reject_path(name):
        parts=set(name.lower().split('/'))
        return exclusion_reason(name) or bool(parts&forbidden_parts) or name.lower().endswith(('.cypher','.jar','.class','.tar')) or any(x in name.lower() for x in ('graph.native','neo4j-baseline','neo4j-mutated','provider-response','project_context','comparison.json'))
    def keys(value):
        if isinstance(value,dict):return set(value)|set().union(*(keys(v) for v in value.values()))
        if isinstance(value,list):return set().union(*(keys(v) for v in value))
        return set()
    def add(round_,name,b,basis,origin=None,derived=False):
        assert safe_member(name) and not reject_path(name),name
        assert name.casefold() not in {n.casefold() for n in rounds[round_]}
        # A content-based barrier in addition to path selection. Application/source
        # field names are data; annotation keys are forbidden in R1 JSON metadata.
        if round_=='R1-source-first' and name.endswith(('.json','.ndjson','.jsonl')):
            try:values=[json.loads(line) for line in b.decode('utf-8-sig').splitlines() if line.strip()] if name.endswith(('.ndjson','.jsonl')) else [json.loads(b)]
            except (ValueError,UnicodeError):raise ValueError('Invalid selected structured raw: '+name)
            assert not (set().union(*(keys(v) for v in values))&assessment_keys),name
        try:scanner.scan(round_+'/'+name,b)
        except SecurityError as error:
            # Retain a coordinator finding and stop automatic inclusion. Never
            # silently call a rejected file safe or modify its original bytes.
            review_flags.append({'round':round_,'file':name,'sha256':sha(b),'category':error.category})
            omissions.append({'round':round_,'file':name,'origin':origin,'sha256':sha(b),'reason':'security_screen_requires_specific_review'});return
        dest=extended_path(out/round_/name);dest.parent.mkdir(parents=True,exist_ok=True)
        with dest.open('xb') as f:f.write(b)
        rounds[round_][name]=sha(b)
        catalog.append({'round':round_,'path':name,'sha256':sha(b),'bytes':len(b),'origin':origin,
                        'derived':derived,'screening_basis':basis,'screened_by':'coordinator_AI_rules_and_content_inspection_not_independent_human_review'})
    def copy(round_,name,p,basis):
        b=raw(p);origin=origin_path(p);originals[origin]=sha(b);add(round_,name,b,basis,origin)
    def derive(round_,name,obj,p,basis):
        b=raw(p);origin=origin_path(p);originals[origin]=sha(b)
        add(round_,name,encoded(obj),basis,origin,True)
    def source_tree(case,base,part='source'):
        for name,p in walk(base):
            if '/src/test/' in '/'+name or name.startswith(('tooling/','draft/')):continue
            if not(name.endswith(('.java','.yml','.yaml','.sql','.xml','.properties')) or name in ('LICENSE','pom.xml')):continue
            copy('R1-source-first',case+'/'+part+'/'+name,p,'Pinned application source/config/fixture resource; no research annotations or method outputs')

    # Source and change information: never take P01 registry entities from its labels.
    p01src=P01/'v-r1/petclinic-source'
    paths=[
      'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java',
      'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java',
      'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java']
    for name in paths:copy('R1-source-first','P01/source/'+name,p01src/name,'Historical pilot scoped source, including overloads/helpers; not a new evaluation universe')
    copy('R1-source-first','P01/source/LICENSE',p01src/'LICENSE','Upstream source license')
    copy('R1-source-first','P01/change/mutation-readable.utf8.patch',P01/'v-r1/mutation-readable.utf8.patch','Previously checked readable derivative of original UTF-16 patch; original also included')
    scenario=P01/'benchmark-snapshot/benchmark/p01/scenario.json';s=load(scenario)
    derive('R1-source-first','P01/INPUT.json',{'case':'P01','source_commit':SOURCE,'config_commit':CONFIG,
        'patch_sha256':s['patch']['sha256'],'canonical_utf8_sha256':s['patch']['canonical_utf8_sha256'],
        'seed':{k:v for k,v in s['seed'].items() if k in ('baseline_method_id','mutated_method_id','api_id','service','excluded_from_impact_set','new_query_parameter')},
        'fixture':{k:v for k,v in s['fixture'].items() if k in ('historical_owner_id','historical_pet_ids','precondition')},
        'scope_files':paths,'universe_note':'Historical development pilot; no retrospective preregistration or new label-derived universe. Record source-based entities in notes; compare the historical label scope only in R2.'},scenario,'Whitelist of source/patch/seed/fixture facts; omit required_observations, negative candidate, audit conclusions and method state')
    for name,p in walk(P01/'v-r1/evidence/benchmark/p01/raw'):
        if name.endswith(('.log','.jsonl','.json','.patch','.java')) and not name.endswith(('summary.json','failure.json')) and '/derived/' not in name:
            if Path(name).name in ('commands.log','environment.json'):continue
            copy('R1-source-first','P01/raw/'+name,p,'Historical raw HTTP, application log, registry/config or original patch; retain attempt names and prior-exposure limits')
    source_tree('P02',P02/'input/app');source_tree('P03',P03/'input/app')
    source_tree('P01',P01/'v-r1/petclinic-config','config')
    source_tree('P02',ROOT/'handoff-out/p02-phat-f03/20261024T111515Z-b98740ff/ZIP_VERIFIED/config','config')
    source_tree('P03',P03/'input/config','config')
    for case,universe,patch in [
        ('P02',P02/'draft/evaluation_universe.draft.v2.json',P02/'benchmark/p02/preparation.v1/optional-query.patch'),
        ('P03',P03/'draft/evaluation_universe.draft.v1.json',P03/'spec/owner-response-rename.patch')]:
        u=load(universe)
        neutral={k:u[k] for k in ('scenario_id','scenario_version','universe_version','baseline_commit','mutated_snapshot_id','logical_hop_limit','fixture_sha256','inventory_sha256','scope_sha256') if k in u}
        neutral['source_commit']=SOURCE;neutral['config_commit']=CONFIG
        neutral['eligible_entities']=[{k:r[k] for k in ('level','entity_id')} for r in u['eligible_entities']]
        neutral['excluded_seeds']=[{k:r[k] for k in ('level','entity_id')} for r in u['excluded_seeds']]
        neutral['aliases']=[{k:r[k] for k in ('level','baseline_id','canonical_id','mutated_id') if k in r} for r in u['aliases']]
        neutral['original_universe_sha256']=sha(raw(universe))
        derive('R1-source-first',case+'/REGISTRY.json',neutral,universe,'Frozen structural entity/alias list only; remove reasons, flags, evidence requirements and conclusions')
        copy('R1-source-first',case+'/change/proposed.patch',patch,'Pinned proposed change, not later repair patch')
    # Select observations by their actual structured schema; orchestration reports,
    # assertions, comparisons, result summaries and predictor artifacts are not copied.
    raw_sets=[('P02',ROOT/'handoff-out/p02-f03/20261024t103954400z-989f2a57'),
      ('P02-helper',ROOT/'handoff-out/p02-helper-supplement/20261025t121836544z-0997bbbe'),
      ('P03',ROOT/'handoff-out/p03-paired/20261031t052939742z-be07ff6d')]
    for case,run in raw_sets:
        for group in ('baseline-r1','baseline-r2','mutated-r1','mutated-r2'):
            base=run/'groups'/group
            for name,p in walk(base):
                parts=name.split('/');top=parts[0]
                include=(top in ('observations','setup','raw','fault') and (name.endswith(('.body','.json','.log')) and not name.endswith(('.command.json','.exit.json'))))
                include |= top=='logs' and name.endswith(('.stdout.log','.stderr.log'))
                include |= top=='config' and name.endswith(('.json','.yml','.yaml','.sql','.properties'))
                include |= top=='targeted' and name.endswith(('.json','.ndjson'))
                if not include:continue
                b=raw(p)
                if name.endswith('.json'):
                    value=json.loads(b)
                    if isinstance(value,dict) and any(k in value for k in ('checks','expected','comparison','pass','passed','predictions','impact_labels')):
                        omissions.append({'round':'R1-source-first','origin':origin_path(p),'sha256':sha(b),'reason':'orchestration_or_assertion_content_requires_derived_view'});continue
                copy('R1-source-first',case+'/raw/'+group+'/'+name,p,'Observed request/response, setup/reset, direct-measurement event, config or application log; no polarity/outcome assertions')
    # R2 intentionally exposes annotator drafts/history only after R1 checkpoint.
    # Keep member paths unchanged so the received notes/evidence references remain traceable.
    label_roots=[('P01',P01/'benchmark-snapshot/benchmark/p01','labels.v3.json','3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce'),
      ('P02',P02_RETURN,'labels.draft.v4.json','c22e97a5a3a6994cb0c7961c5a42ed098301b106d36ab57536a486077c456f08'),
      ('P03',P03_RETURN,'labels.draft.v2.json','61edca6397a52a5076d3531cecf775d0052e0e7053163165e99110de14222732')]
    for case,base,label,expected in label_roots:
        assert sha(raw(base/label))==expected
        for name,p in walk(base):
            if reject_path(name):
                omissions.append({'round':'R2-label-comparison','origin':origin_path(p),'sha256':sha(raw(p)),'reason':'method_output_binary_private_or_nonreview_member'});continue
            parts=name.split('/')
            if any(x in {'audit','tooling','scripts','__pycache__'} for x in parts) or p.suffix in ('.py','.mjs','.ps1','.zip'):
                omissions.append({'round':'R2-label-comparison','origin':origin_path(p),'sha256':sha(raw(p)),'reason':'execution_tool_or_audit_not_needed_for_annotation_comparison'});continue
            copy('R2-label-comparison',case+'/'+name,p,'Versioned annotator draft/notes/exposure/evidence/history; available only after retained R1 checkpoint')
    for round_,template_names in [('R1-source-first',['NOTES_TEMPLATE.md','CHECKPOINT_TEMPLATE.md']),('R2-label-comparison',['COMPARISON_TEMPLATE.md','DECISION_TEMPLATE.md'])]:
        source='round-1' if round_.startswith('R1') else 'round-2'
        for name in template_names:copy(round_,name,ROOT/'tasks/petclinic-review-draft'/source/name,'Blank reviewer form, no fabricated identity/time/decision')
        text=('# '+('Lượt 1: source và raw' if source=='round-1' else 'Lượt 2: đối chiếu nhãn')+'\n\nBản dữ liệu chuẩn bị nội bộ, chưa phát hành. Metadata/checksum chỉ bảo toàn file; không xác nhận reviewer hoặc nhãn.\n\n'+
          ('Đọc source/patch, registry và raw; lưu notes/exposure/checkpoint trước khi mở R2. P01 là pilot lịch sử có prior exposure, không được mô tả là preregistered/blind. P02-helper chỉ direct measurement/subscription, không production callback trace. Không dùng output parser/Neo4j/RAG/LLM làm nhãn.\n' if source=='round-1' else 'Chỉ mở sau khi notes/exposure/checkpoint R1 đã lưu. Nhãn vẫn pending_review; đọc notes/exposure/history và giữ các bất đồng/unresolved. Không có output phương pháp hoặc quyền chấm điểm trong gói này.\n'))
        add(round_,'START_HERE.md',text.encode(),'Neutral preview instructions, not an official invitation or release',derived=True)
        add(round_,'PREVIEW_METADATA.json',encoded({'record_date':'2026-11-05','round':source,'status':'private_preparation_not_released','source_commit':SOURCE,'config_commit':CONFIG,'reviewer':None,'review_decision':None,'released':False,'accepted':False,'model_calls':0,'official_scoring':False}), 'Real preparation state; reviewer/decision remain null',derived=True)
    assert all(sha(raw(ROOT/name))==h for name,h in originals.items()),'Original changed during preparation'
    for round_,files in rounds.items():
        dest=out/round_/'SHA256SUMS.txt';dest.write_text(''.join(h+'  '+n+'\n' for n,h in sorted(files.items())),encoding='ascii')
    (out/'ALLOWLIST.json').write_bytes(encoded(catalog));(out/'OMISSIONS.json').write_bytes(encoded(omissions))
    (out/'ORIGINAL_IDENTITIES.json').write_bytes(encoded(originals))
    (out/'CONTENT_SCREENING.json').write_bytes(encoded({'selected_files':len(catalog),'security_scan':scanner.summary(),'review_flags':review_flags,
       'scope':'Coordinator AI structural/schema/content-category screen and reviewed source rules; not independent human review or proof of blind exposure',
       'known_limits':['P01 historical prior exposure; no retrospective preregistration','Raw HTTP/logs reveal observed outcomes inherently','Names of fixtures/attempts are retained, not renamed to claim blindness','Skipped executable/audit members are explicit omissions; no full runtime replay from preview','No reviewer identity/appointment/release decision inferred']}))
    result={'status':'private_R1_R2_data_previews_prepared_not_released','directory':out.relative_to(ROOT).as_posix(),
       'round1_files':len(rounds['R1-source-first']),'round2_files':len(rounds['R2-label-comparison']),
       'allowlist_entries':len(catalog),'omissions':len(omissions),'security_flags_requiring_review':len(review_flags),
       'originals_unchanged':True,'model_calls':0,'official_scoring':False,'ground_truth_accepted':False,
       'reviewer':None,'release_decision':None,'packet_sent':False,'github_push':False}
    (out/'RESULT.json').write_bytes(encoded(result));print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':main()
