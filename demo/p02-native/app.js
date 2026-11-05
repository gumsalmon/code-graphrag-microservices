// Embedded into a standalone artifact by build_p02_native_inspector.mjs. No network APIs.
const $ = id => document.getElementById(id);
const state = { snapshot: 'baseline', depth: 2, selected: bundle.snapshots.baseline.seed };
const el = (tag, text, className) => { const item=document.createElement(tag); if(text!==undefined)item.textContent=text;if(className)item.className=className;return item; };
const short = id => id.split('::').at(-1).split('.').at(-1);
const snapshot = () => bundle.snapshots[state.snapshot];
const plan = () => snapshot().retrieval.plans.find(row => row.depth_limit === state.depth);
const shown = value => value === null || value === undefined ? 'Chưa khai (null)' : String(value);
const table = (headers, rows) => {
 const t=el('table'),head=el('thead'),tr=el('tr');headers.forEach(h=>tr.append(el('th',h)));head.append(tr);t.append(head);
 const body=el('tbody');for(const row of rows){const r=el('tr');row.forEach(value=>r.append(el('td',shown(value))));body.append(r);}t.append(body);return t;
};
function download(artifact) {
 const bytes=Uint8Array.from(atob(artifact.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes]));
 const a=el('a');a.href=url;a.download=artifact.download_name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showSource(file,first,last) {
 const row=snapshot().sources.find(source=>source.file===file);
 if(!row)throw Error('Source binding unavailable');
 $('source-name').textContent=file.split('/').at(-1)+' · '+state.snapshot+' · dòng '+first+'–'+last;
 $('source-path').textContent=file;
 $('source-hash').textContent='SHA-256 '+row.sha256;
 const target=$('source-code');target.replaceChildren();
 const lines=row.text.match(/[^\n]*\n|[^\n]+$/g)??[];
 lines.forEach((text,i)=>{const line=el('div',undefined,'source-line'+(i+1>=first&&i+1<=last?' active':''));line.append(el('mark',String(i+1)),el('span',text.replace(/\r?\n$/,'')));target.append(line);});
 $('download-source').onclick=()=>download(bundle.artifacts[row.artifact_id]);
 const active=target.querySelector('.active');if(active)target.scrollTop=Math.max(0,active.offsetTop-target.firstElementChild.offsetTop-24);
}
function selectNode(id) {
 const node=snapshot().graph.nodes.find(row=>row.id===id);if(!node)return;
 state.selected=id;drawGraph();$('selected-id').textContent=node.id;
 const entry=plan().paths.find(row=>row.id===id);
 $('selected-state').textContent=id===snapshot().seed?'Seed — để riêng khỏi tập ứng viên':entry?'Có witness trong kết quả truy vết đã lưu':'Có node trong graph; không thuộc kết quả truy vết đang chọn';
 showSource(node.file,node.line_start,node.line_end);
}
function drawGraph() {
 const data=snapshot(),plans=data.retrieval.plans,distances=new Map([[data.seed,0]]);
 for(const p of plans)for(const path of p.paths)distances.set(path.id,Math.min(distances.get(path.id)??Infinity,path.logical_hop));
 const maximum=Math.max(...distances.values(),1),columns=new Map(),positions=new Map();
 const ordered=[...data.graph.nodes].sort((a,b)=>(distances.get(b.id)??-1)-(distances.get(a.id)??-1)||a.id.localeCompare(b.id));
 for(const node of ordered){const depth=distances.get(node.id)??0,col=maximum-depth,index=columns.get(col)??0;columns.set(col,index+1);positions.set(node.id,{x:22+col*360,y:28+index*120});}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 const make=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs??{}))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
 svg.setAttribute('viewBox','0 0 '+((maximum+1)*360+20)+' '+(Math.max(...columns.values())*120+28));svg.setAttribute('role','group');svg.setAttribute('aria-label','Đồ thị phụ thuộc caller đến callee, từ bằng chứng đã lưu');
 const defs=make('defs'),marker=make('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});marker.append(make('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#175ca1'}));defs.append(marker);svg.append(defs);
 const activeIds=new Set(plan().paths.flatMap(row=>row.witness_ids));activeIds.add(data.seed);
 for(const edge of data.graph.edges){const a=positions.get(edge.source_id),b=positions.get(edge.target_id);if(!a||!b)continue;
 const active=plan().paths.some(row=>row.witness_ids.some((id,i)=>id===edge.source_id&&row.witness_ids[i+1]===edge.target_id));
 svg.append(make('path',{d:'M '+(a.x+264)+' '+(a.y+40)+' L '+b.x+' '+(b.y+40),class:'edge'+(active?' active':''),'marker-end':'url(#arrow)'}));svg.append(make('text',{x:(a.x+264+b.x)/2,y:(a.y+b.y)/2+28,'text-anchor':'middle',class:'edge-label'},edge.type));}
 for(const node of ordered){const p=positions.get(node.id),group=make('g',{transform:'translate('+p.x+' '+p.y+')',class:'graph-node'+(activeIds.has(node.id)?' reachable':'')+(node.id===data.seed?' seed':'')+(node.id===state.selected?' selected':''),tabindex:0,role:'button','aria-label':node.id,'data-node':node.id});
 group.append(make('rect',{width:264,height:82,rx:7}));group.append(make('text',{x:12,y:22},node.class_fqn.split('.').at(-1)));group.append(make('text',{x:12,y:43},node.method_name+'('+node.parameter_types.join(',')+')'));group.append(make('text',{x:12,y:64,class:'subtitle'},node.service+' · '+(node.id===data.seed?'seed':distances.has(node.id)?distances.get(node.id)+' hop':'ngoài tuyến')));
 group.addEventListener('click',()=>selectNode(node.id));group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectNode(node.id);}});svg.append(group);}
 $('graph').replaceChildren(svg);
}
function renderPaths() {
 const list=$('paths');list.replaceChildren();
 for(const row of plan().paths){const li=el('li'),button=el('button',short(row.id)+' · '+row.logical_hop+' hop');button.onclick=()=>selectNode(row.id);li.append(button,el('div',row.witness_ids.map(short).join(' → '),'path-text'));list.append(li);}
 $('candidate-count').textContent=String(new Set(plan().paths.map(row=>row.id)).size);
 $('saved-query').textContent=plan().query+'\n\nseed: '+plan().parameters.seed;
}
function renderMetadata() {
 const data=snapshot(),endpoint=data.graph.endpoints.find(row=>row.handler_id===data.seed);
 $('endpoint-name').textContent=endpoint.http_method+' '+endpoint.normalized_path;
 $('parameters').replaceChildren(table(['Tham số','Kiểu','Declared required','Effective required','Default'],endpoint.query_parameters.map(row=>[row.name,row.type,row.declared_required,row.effective_required,row.default_value])));
 $('native-count').textContent=String(data.graph.nodes.length);$('db-count').textContent=data.parity.nodes+' / '+data.parity.relationships;
 $('unresolved-count').textContent=String(data.graph.unresolved.length);
 const rows=Object.entries(data.parity.checks).map(([name,ok])=>[name,ok?'Đạt':'Chưa đạt']);rows.push(['Direct import lặp cùng snapshot',data.parity.direct_idempotent?'Ổn định':'Không ổn định'],['Cypher import lặp cùng snapshot',data.parity.cypher_idempotent?'Ổn định':'Không ổn định']);
 $('parity').replaceChildren(table(['Phép kiểm kỹ thuật','Kết quả'],rows));
 $('full-parity').textContent=data.parity.full_node_property_parity?'Full node-property parity: đạt':'Full node-property parity: CHƯA ĐẠT';
 $('full-parity').className=data.parity.full_node_property_parity?'pass':'open';
 const propertyRows=data.parity.class_properties_direct.map(row=>{const peer=data.parity.class_properties_cypher.find(other=>other.properties.fqn===row.properties.fqn);return[row.properties.fqn.split('.').at(-1),row.properties.name??'Thiếu property',peer?.properties.name??'Thiếu property'];});
 $('class-properties').replaceChildren(table(['Class','Direct: name','Cypher: name'],propertyRows));
 const inventory=data.audit.structural_method_inventory;
 $('inventory-summary').textContent='Native graph biểu diễn '+inventory.represented+'/'+inventory.eligible+' Method eligible trong phạm vi đã khai (seed để riêng).';
 $('missing-methods').replaceChildren(...inventory.unrepresented.map(id=>el('li',short(id))));
 const missing=snapshot().graph.unresolved;$('unresolved').replaceChildren();
 for(const row of missing){const item=el('div',undefined,'unresolved-row'),button=el('button','Mở source · dòng '+row.line_start+'–'+row.line_end);button.onclick=()=>{state.selected=null;drawGraph();$('selected-state').textContent='Unresolved — chưa phân giải, không tự suy nhãn';$('selected-id').textContent=row.expression;showSource(row.file,row.line_start,row.line_end);};item.append(el('code',row.expression),el('p',row.reason),button);$('unresolved').append(item);}
}
function renderArtifacts() {
 const target=$('artifacts');target.replaceChildren();
 for(const[id,row]of Object.entries(bundle.artifacts).filter(([id])=>id.startsWith(state.snapshot+'/'))){const item=el('div',undefined,'artifact-row'),label=el('div'),button=el('button','Tải byte gốc');label.append(el('div',row.title),el('small',row.bytes+' bytes · SHA-256 '+row.sha256));button.dataset.artifact=id;button.onclick=()=>download(row);item.append(label,button);target.append(item);}
}
function render() {
 renderPaths();renderMetadata();renderArtifacts();selectNode(snapshot().graph.nodes.some(row=>row.id===state.selected)?state.selected:snapshot().seed);
}
try {
 $('run-id').textContent=bundle.run_id;$('manifest-hash').textContent=bundle.run_manifest_sha256;$('source-commit').textContent=bundle.source_commit;$('receipt-hash').textContent=bundle.receipt_sha256;
 $('snapshot').addEventListener('change',event=>{state.snapshot=event.target.value;state.selected=snapshot().seed;render();});
 $('depth').addEventListener('change',event=>{state.depth=Number(event.target.value);render();});
 $('download-bundle').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)+'\n'],{type:'application/json'}));const a=el('a');a.href=url;a.download='P02-native-view-bundle.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 render();window.P02_NATIVE_INSPECTOR={state,bundle};
}catch(error){$('fatal').hidden=false;$('fatal').textContent='Không thể hiển thị evidence: '+error.message;throw error;}
