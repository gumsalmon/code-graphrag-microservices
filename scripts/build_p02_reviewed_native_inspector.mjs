// Packages saved, previously reviewed evidence. Never runs parser, Docker, model or scorer.
import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { audit } from './check_p02_reviewed_method_20261102.mjs';
import { FILES, SEEDS } from '../pipeline/p02/offline-method.mjs';
import { digest, validateSnapshot, embeddedScript } from '../demo/p02-native/view-model.mjs';
import { assertReviewedAudit,REVIEWED_PROFILE_SHA256,REVIEWED_IMPLEMENTATION } from '../pipeline/p02/reviewed-native.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const decoder=new TextDecoder('utf-8',{fatal:true});
const readJson=async path=>JSON.parse(decoder.decode(await readFile(path)));
const sha64=text=>createHash('sha256').update(text).digest('base64');
const PAGE=`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-__SCRIPT_HASH__'; style-src 'sha256-__STYLE_HASH__'; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>P02 · Bằng chứng graph reviewed 02/11</title><style>__STYLE__</style></head>
<body><main><header><div class="eyebrow">PETCLINIC / P02 / KIỂM KỸ THUẬT</div>
<h1>Từ source đến graph và đường truy vết</h1>
<p class="lead">Khám phá kết quả extraction và Neo4j đã lưu của hai snapshot. Chọn Method để xem source đúng dòng; thay độ sâu để xem witness của truy vấn đã chạy.</p>
<div class="badges"><span class="badge">Run reviewed · 02/11/2026</span><span class="badge">Offline · không gọi model</span><span class="badge">Dành cho điều phối/kỹ thuật</span></div></header>
<div id="fatal" hidden role="alert"></div>
<div class="notice"><strong>Đường phụ thuộc chưa chứng minh tác động hành vi.</strong> Bộ xem này không dự đoán hoặc chấm điểm impact, không duyệt nhãn và không là E2E GraphRAG. Giữ output kỹ thuật riêng với người lập nhãn/reviewer đang ghi nhận định source-first.</div>
<div class="controls"><label>Snapshot<select id="snapshot"><option value="baseline">Baseline</option><option value="mutated">Mutated</option></select></label>
<label>Độ sâu logical<select id="depth"><option value="1">1 hop</option><option value="2" selected>2 hop</option><option value="3">3 hop</option></select></label>
<span class="muted">Đọc kết quả đã lưu; không chạy truy vấn mới.</span></div>
<div class="summary"><div><strong id="native-count"></strong><span>Method nodes trong native graph</span></div><div><strong id="candidate-count"></strong><span>Method ứng viên · seed để riêng</span></div><div><strong id="db-count"></strong><span>Nodes / relationships trong Neo4j</span></div><div><strong id="unresolved-count"></strong><span>Unresolved record từ parser</span></div></div>
<section><h2>Đồ thị phụ thuộc</h2><p class="muted">Mũi tên: caller → callee. Màu xanh: node thuộc tuyến trong độ sâu đang chọn. Bấm node hoặc dùng Tab/Enter để mở source.</p><div id="graph" class="graph-wrap"></div><p id="selected-state" class="muted"></p><code id="selected-id" class="source-id"></code></section>
<div class="grid"><section><h2>Witness đã truy vấn</h2><ul id="paths" class="path-list"></ul><details><summary>Cypher và seed đã dùng</summary><pre id="saved-query"></pre></details></section>
<section><h2>Tham số endpoint của seed</h2><p id="endpoint-name"></p><div id="parameters" class="scroll"></div><p class="footnote">Declared required=null nghĩa là annotation không khai tường minh. Effective required/default là metadata parser ghi nhận, chưa phải nhãn tác động.</p></section></div>
<section><div class="source-header"><div><h2 id="source-name">Source</h2><div id="source-path" class="source-title muted"></div></div><button id="download-source">Tải source byte gốc</button></div><p id="source-hash" class="footnote value"></p><div id="source-code" class="source-code" tabindex="0" aria-label="Mã nguồn và số dòng"></div></section>
<div class="grid"><section><h2>Kiểm import và parity</h2><div id="parity" class="scroll"></div><h3 id="full-parity"></h3><div id="class-properties" class="scroll"></div><p class="footnote">Hai snapshot dùng DB/container riêng. Native keys chưa có snapshot qualification; kiểm lặp import cùng snapshot không chứng minh an toàn khi trộn hai snapshot.</p></section>
<section><h2>Giới hạn còn mở</h2><p id="inventory-summary"></p><ul id="missing-methods"></ul><p class="footnote">Đây là kiểm inventory theo scope, không là accuracy hoặc impact score. Method thiếu node không được tự coi là negative; inventory đúng cũng chưa chứng minh dependency đúng.</p><h3>Unresolved từ output gốc</h3><div id="unresolved"></div></section></div>
<section><h2>Nguồn và tải artifact</h2><dl><dt>Run</dt><dd id="run-id"></dd><dt>Source commit</dt><dd id="source-commit"></dd><dt>Run manifest SHA</dt><dd id="manifest-hash"></dd><dt>Receipt SHA</dt><dd id="receipt-hash"></dd></dl>
<p class="footnote">Các file dưới đây giữ byte và SHA gốc. Bundle của bộ xem là dữ liệu trình bày được dẫn xuất, không phải raw evidence mới. File graph/DB có thể giữ đường dẫn máy nguồn; source đã kèm để xem offline.</p><div id="artifacts"></div><p><button id="download-bundle">Tải bundle trình bày JSON</button></p></section>
<p class="footnote">Chỉ P02 trên run đã pin. Không có nhãn, annotator notes, raw runtime benchmark, P03 output hoặc dữ liệu gọi model. Chưa phải giao diện đầu ra Method/API/Service theo contract nháp.</p>
</main><script>__SCRIPT__</script></body></html>`;

export async function build(run) {
  run=resolve(run);
  const prefix=relative(resolve(ROOT,'handoff-out/p02-offline-method-reviewed'),run);
  if(!prefix||prefix.startsWith('..')||prefix.includes('/')||prefix.includes('\\')||(await lstat(run)).isSymbolicLink())throw Error('Expected a local P02 method run directory');
  const manifest=await readFile(resolve(run,'SHA256SUMS.txt'));
  const report=await audit(run);
  const input=await readJson(resolve(run,'input/INPUT.json'));
  const provenance=await readJson(resolve(run,'INPUT_PROVENANCE.json'));
  assertReviewedAudit(manifest,report,provenance);
  const bundle={kind:'p02-native-evidence-view/1',scope:'saved_technical_evidence_not_impact_prediction',
    run_id:basename(run),run_manifest_sha256:digest(manifest),source_commit:input.source_commit,
    derivation_version:'reviewed-2026-11-02',reviewed_implementation_profile_sha256:REVIEWED_PROFILE_SHA256,implementation:REVIEWED_IMPLEMENTATION,
    receipt_sha256:input.receipt_sha256,labels_or_annotation_notes_included:false,
    embedding_or_model_calls:0,impact_scores:null,shared_impact_output_contract_adopted:false,
    snapshots:{},artifacts:{}};
  async function artifact(snapshot,id,path,title){
    const bytes=await readFile(resolve(run,path));
    bundle.artifacts[snapshot+'/'+id]={title,download_name:snapshot+'-'+basename(path),sha256:digest(bytes),bytes:bytes.length,base64:bytes.toString('base64')};
    return bytes;
  }
  for(const snapshot of ['baseline','mutated']){
    const data={seed:SEEDS[snapshot],sources:[],audit:report.groups.find(row=>row.snapshot===snapshot)};
    for(const file of FILES){const id='source-'+data.sources.length,bytes=await artifact(snapshot,id,'input/'+snapshot+'/'+file,file.split('/').at(-1));
      const expected=provenance.source_snapshot_files[snapshot].find(row=>row.file===file);
      if(!expected||expected.sha256!==digest(bytes))throw Error('Source provenance differs');
      data.sources.push({file,text:decoder.decode(bytes),sha256:digest(bytes),artifact_id:snapshot+'/'+id});}
    for(const[key,id,path,title]of[
      ['graph','native-graph','artifacts/'+snapshot+'/graph.native.json','Native graph JSON'],
      ['retrieval','direct-retrieval','database/'+snapshot+'/direct.retrieval.json','Direct-route retrieval JSON'],
      ['parity','parity','database/'+snapshot+'/parity.json','Parity và giới hạn JSON']])data[key]=JSON.parse(decoder.decode(await artifact(snapshot,id,path,title)));
    for(const[id,path,title]of[
      ['cypher','artifacts/'+snapshot+'/graph.generated.cypher','Generated Cypher'],
      ['direct-database','database/'+snapshot+'/direct.first.json','Direct Neo4j dump'],
      ['cypher-database','database/'+snapshot+'/cypher.first.json','Cypher Neo4j dump'],
      ['cypher-retrieval','database/'+snapshot+'/cypher.retrieval.json','Cypher-route retrieval JSON']])await artifact(snapshot,id,path,title);
    validateSnapshot(data,snapshot);bundle.snapshots[snapshot]=data;
  }
  const browserCode=await readFile(resolve(ROOT,'demo/p02-native/reviewed-app.js'),'utf8');
  const css=await readFile(resolve(ROOT,'demo/p02-native/reviewed-app.css'),'utf8');
  const script=embeddedScript(bundle,browserCode);
  // Use callbacks so replacement syntax in arbitrary source/code is never expanded.
  const html=PAGE.replace('__SCRIPT_HASH__',()=>sha64(script)).replace('__STYLE_HASH__',()=>sha64(css))
    .replace('__STYLE__',()=>css).replace('__SCRIPT__',()=>script);
  const out=resolve(ROOT,'handoff-out/p02-native-inspector-reviewed',new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8));
  const files={
    'index.html':html,
    'view-bundle.json':JSON.stringify(bundle,null,2)+'\n',
    'SOURCE_AUDIT.json':JSON.stringify(report,null,2)+'\n',
    'README.md':'# P02 native evidence inspector\n\nMở index.html bằng Chrome/Edge. Chạy hoàn toàn offline, không cần server/Docker/key. Đây là output kỹ thuật đã lưu cho Huy/Hiển; không chuyển cho annotator/reviewer source-first trước bước độc lập. Không impact prediction, score, nhãn accepted hoặc E2E GraphRAG. Full fresh-DB parity và explicit Method inventory đã được kiểm trên run reviewed; unresolved/resolver coverage vẫn có giới hạn, không suy behavioral impact. Giữ file này và license khi chuyển thư mục.\n\nview-bundle.json là dữ liệu dẫn xuất có source/raw artifacts base64 và SHA; không thay file gốc. SOURCE_AUDIT.json là kiểm kỹ thuật của run, không kiểm GT. Tải source/JSON/Cypher từ trang để nhận lại byte gốc. SHA256SUMS.txt kiểm toàn bộ thư mục này.\n',
    'PETCLINIC_LICENSE.txt':await readFile(resolve(ROOT,'handoff-out/hien-p02-next/20261101T062259Z-fbac2a60/ZIP_VERIFIED/source/LICENSE.petclinic'))
  };
  // Read all input bytes first; incomplete/failed packaging never modifies the source run.
  await mkdir(out,{recursive:true});
  for(const[name,value]of Object.entries(files))await writeFile(resolve(out,name),value,{flag:'wx'});
  const identities={};for(const name of ['demo/p02-native/view-model.mjs','demo/p02-native/reviewed-app.js','demo/p02-native/reviewed-app.css','scripts/build_p02_reviewed_native_inspector.mjs','scripts/check_p02_reviewed_method_20261102.mjs','pipeline/p02/reviewed-native.mjs'])identities[name]=digest(await readFile(resolve(ROOT,name)));
  const record={created_utc:new Date().toISOString(),source_run:relative(ROOT,run).replaceAll('\\','/'),source_run_manifest_sha256:digest(manifest),
    files_embedded:Object.keys(bundle.artifacts).length,artifact_hashes:Object.fromEntries(Object.entries(bundle.artifacts).map(([id,value])=>[id,value.sha256])),
    implementation_identities:identities,source_run_unchanged:digest(await readFile(resolve(run,'SHA256SUMS.txt')))===digest(manifest),
    labels_or_annotation_notes_included:false,model_calls:0,impact_scoring:false,shared_contract_adopted:false,live_pipeline:false};
  files['BUILD.json']=JSON.stringify(record,null,2)+'\n';await writeFile(resolve(out,'BUILD.json'),files['BUILD.json'],{flag:'wx'});
  const sums=Object.keys(files).sort().map(name=>digest(Buffer.isBuffer(files[name])?files[name]:Buffer.from(files[name]))+'  '+name).join('\n')+'\n';
  await writeFile(resolve(out,'SHA256SUMS.txt'),sums,{flag:'wx'});
  return{directory:out,entry:resolve(out,'index.html'),manifest_sha256:digest(Buffer.from(sums)),embedded_artifacts:record.files_embedded};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==4||process.argv[2]!=='--run')throw Error('Usage: node scripts/build_p02_native_inspector.mjs --run P02_METHOD_RUN');console.log(JSON.stringify(await build(process.argv[3]),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
