// P03 source-only context provenance. This guard grants no scientific/release authority.
import {digest} from './static-context.mjs';
export const NATIVE_ROOT='handoff-out/p03-breaker-offline/20261105t083103189z-c2daafaf';
export const NATIVE_MANIFEST='baf4cccca80ca14586cc13141feabb6bd24bdde72a13cd3a9905e87f25c5b636';
export const RECEIPT_PATH='tasks/hien-next/P03_TECHNICAL_RECEIPT_2026-11-02.json';
export const RECEIPT_SHA256='b73e4dd44a1cbd9ffe05d148d2c0742f4ab685cb4c7a4cac7b949ed4d429ce20';
export const PARSER_SHA256='75e5d0fa0b2e958fb8a6604516e95dd24e65905bb6617b3820112d0270438005';
export const IMPORTER_SHA256='93c20bd93e6dd5997043b4e4806aa5df7523426b4a82e6607b694934e5d4d7d3';
export const SEED='customers-service::org.springframework.samples.petclinic.customers.web.OwnerResource#findOwner(int)';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function nativeMembers(raw){
 check(digest(raw)===NATIVE_MANIFEST,'Different checked P03 native run');const members=new Map();
 for(const line of raw.toString('utf8').trim().split(/\r?\n/)){
  const m=/^([0-9a-f]{64})  ([A-Za-z0-9_.@/-]+)$/.exec(line);
  check(m&&!m[2].split('/').some(p=>!p||p==='.'||p==='..')&&!members.has(m[2]),'Invalid native member');members.set(m[2],m[1]);
 }
 check(members.get('implementation/src/parser.py')===PARSER_SHA256&&members.get('implementation/src/neo4j_importer.py')===IMPORTER_SHA256&&members.get('input/receipt.json')===RECEIPT_SHA256,'Different checked implementation/receipt');return members;
}
export function assertP03Input(input,receipt){
 check(receipt.case==='P03'&&receipt.status==='ready_for_offline_integration'&&receipt.authority_id==='D20'&&!receipt.model_calls_authorized&&!receipt.official_scoring_authorized&&!receipt.shared_draft_contract_adoption_authorized&&!receipt.labels_or_annotation_notes_included,'Invalid P03 receipt/scope');
 check(input.case==='P03'&&input.receipt_sha256===RECEIPT_SHA256&&input.source_commit===receipt.case_inputs.source_commit&&input.patch_sha256===receipt.case_inputs.patch_sha256&&input.seed_ids.baseline===SEED&&!input.label_or_annotation_notes_paths_included&&input.model_calls===0&&input.mutated_graph_diagnostic_only===true,'Invalid P03 source policy');
 check(input.snapshots.baseline.length===6&&new Set(input.snapshots.baseline.map(r=>r.file)).size===6,'Different P03 scoped corpus');
}
