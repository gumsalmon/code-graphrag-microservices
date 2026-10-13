/* Offline evidence viewer. Never queries Neo4j, an LLM, or the PetClinic services. */
(() => {
  'use strict';
  const data = window.P01_DEMO_DATA;
  const $ = id => document.getElementById(id);
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const svg = (tag, attributes = {}, text) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const names = { graph: 'Đồ thị phụ thuộc', change: 'Patch & contract', reasoning: 'Context & LLM', runtime: 'Quan sát HTTP', provenance: 'Nguồn & giới hạn' };
  const requestNames = {
    baseline_direct: 'Provider · request ban đầu', baseline_gateway: 'Gateway · request ban đầu',
    baseline_negative_overload: 'Overload read(int)', mutated_direct_missing_parameter: 'Provider · thiếu includeDetails',
    mutated_direct_valid_parameter: 'Provider · có includeDetails', mutated_gateway: 'Gateway · consumer giữ nguyên',
    mutated_negative_overload: 'Overload read(int)',
  };
  let snapshot = 'mutated';
  let selected = null;
  let traceGeneration = 0;
  let reasoningRequest = null;
  let reasoningGeneration = 0;
  const current = () => data.snapshots[snapshot];
  const className = node => node.class_fqn.split('.').at(-1);
  const signature = node => node.method_name + '(' + node.parameter_types.join(', ') + ')';
  const date = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) + ' (UTC+7)';
  function details(parent, pairs) {
    const list = el('dl');
    for (const [key, value] of pairs) list.append(el('dt', key), el('dd', String(value)));
    parent.append(list);
  }
  function button(text, action, className = 'button button-subtle') {
    const node = el('button', text, className);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  function downloadBytes(bytes, name, type = 'application/octet-stream') {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const anchor = el('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function downloadArtifact(id) {
    const artifact = data.artifacts[id];
    const bytes = Uint8Array.from(atob(artifact.base64), char => char.charCodeAt(0));
    downloadBytes(bytes, artifact.download_name);
  }
  function page(name, updateHash = true) {
    if (!names[name]) name = 'graph';
    for (const key of Object.keys(names)) $('page-' + key).hidden = name !== key;
    document.querySelectorAll('[data-page]').forEach(node => {
      const active = node.dataset.page === name;
      node.classList.toggle('active', active);
      if (active) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
    });
    $('page-label').textContent = names[name];
    if (updateHash && location.hash !== '#' + name) location.hash = name;
  }
  function source(file, start, end) {
    const captured = current().sources[file];
    if (!captured) throw new Error('Không có file nguồn trong bundle: ' + file);
    const lines = captured.text.split('\n');
    const view = $('source-code');
    view.replaceChildren();
    lines.forEach((text, index) => {
      const line = el('div', undefined, 'source-line' + (index + 1 >= start && index + 1 <= end ? ' highlight' : ''));
      line.dataset.line = index + 1;
      line.append(el('span', String(index + 1), 'line-number'), el('code', text || ' '));
      view.append(line);
    });
    $('source-caption').textContent = snapshot + ' / ' + file + ' : ' + start + '–' + end;
    $('download-source').hidden = false;
    $('download-source').onclick = () => downloadArtifact(captured.raw_id);
    requestAnimationFrame(() => {
      const line = view.querySelector('[data-line="' + Math.max(1, start - 2) + '"]');
      view.scrollTop = line ? line.offsetTop - view.firstElementChild.offsetTop : 0;
    });
  }
  function evidenceButton(evidence) {
    const node = button(evidence.file.split('/').at(-1) + ' : ' + evidence.line_start + '–' + evidence.line_end,
      () => source(evidence.file, evidence.line_start, evidence.line_end), 'evidence-button');
    node.append(el('small', evidence.evidence_type || 'Vị trí từ mã nguồn'));
    return node;
  }
  function setSelection(type, key) {
    selected = { type, key };
    const { graph, query } = current();
    document.querySelectorAll('[data-node]').forEach(node => node.classList.toggle('selected', type === 'node' && node.dataset.node === key));
    document.querySelectorAll('[data-edge]').forEach(node => node.classList.toggle('selected', type === 'edge' && node.dataset.edge === String(key)));
    const body = $('inspector-body');
    body.replaceChildren();
    if (type === 'node') {
      const node = graph.nodes.find(node => node.id === key);
      const candidate = query.impacted_methods.find(item => item.method_id === key);
      const isSeed = key === query.seed_id;
      $('inspector-title').textContent = className(node);
      body.append(el('span', isSeed ? 'SEED' : candidate ? 'ỨNG VIÊN PHỤ THUỘC' : 'NGOÀI TUYẾN TRUY VẤN', 'tag ' + (isSeed ? 'tag-amber' : 'tag-green')));
      body.append(el('div', signature(node), 'symbol'));
      details(body, [['Service', node.service], ['Vị trí', node.file.split('/').at(-1) + ' : ' + node.line_start + '–' + node.line_end],
        ...(candidate ? [['Hop logic đến seed', candidate.hop], ['Ranh giới service', candidate.service_boundary_crossings]] : [])]);
      body.append(el('h3', 'Mã nguồn'), evidenceButton(node));
      const endpoint = graph.endpoints.find(item => item.handler_id === key);
      if (endpoint) {
        body.append(el('h3', 'Endpoint'), el('div', endpoint.http_method + ' ' + endpoint.normalized_path, 'symbol'));
        if (endpoint.query_parameters.length) body.append(el('p', endpoint.query_parameters.map(item => item.name + (item.effective_required ? ' (bắt buộc)' : '')).join(' · ')));
      }
      body.append(el('p', isSeed ? 'Seed không được tính vào tập ứng viên. Tham số mới là ràng buộc đầu vào, không phải thay đổi nội dung response.' :
        candidate ? 'Ứng viên được lấy từ đường đi Neo4j, chưa phải nhãn tác động đã nghiệm thu.' : 'Không nằm trong kết quả truy vấn này. Không tự suy ra nhãn “không bị tác động”.'));
      source(node.file, node.line_start, node.line_end);
    } else {
      const edge = graph.edges[key];
      $('inspector-title').textContent = edge.type;
      body.append(el('span', edge.contract_status === 'VALID' ? 'CONTRACT PHÙ HỢP TRONG SNAPSHOT' : 'THIẾU THAM SỐ BẮT BUỘC', 'tag ' + (edge.contract_status === 'VALID' ? 'tag-green' : 'tag-amber')));
      body.append(el('div', className(graph.nodes.find(node => node.id === edge.source_id)) + ' → ' + className(graph.nodes.find(node => node.id === edge.target_id)), 'symbol'));
      details(body, [['Phân giải', edge.resolution_status], ['Qua ranh giới service', edge.cross_service ? 'Có · 1' : 'Không · 0'],
        ...(edge.http_method ? [['Endpoint', edge.http_method + ' ' + edge.normalized_path], ['Client gửi', edge.sent_query_parameters.join(', ')], ['Tham số còn thiếu', edge.missing_required_parameters.join(', ') || 'Không']] : []),
        ...(edge.fallback_method ? [['Fallback', edge.fallback_method]] : [])]);
      body.append(el('h3', 'Bằng chứng tại hai đầu cạnh'));
      edge.evidence.forEach(item => body.append(evidenceButton(item)));
      body.append(el('h3', 'Giả định khi phân giải'));
      const assumptions = el('ul');
      edge.assumptions.forEach(item => assumptions.append(el('li', item)));
      body.append(assumptions);
      if (edge.cross_service) {
        body.append(el('h3', 'Giới hạn được parser ghi nhận'));
        graph.unresolved.forEach(item => {
          body.append(el('p', item.reason), evidenceButton(item));
        });
      }
      source(edge.evidence[0].file, edge.evidence[0].line_start, edge.evidence[0].line_end);
    }
  }
  function graphView() {
    const { graph, query, environment } = current();
    const view = $('dependency-graph');
    view.replaceChildren();
    const defs = svg('defs');
    const marker = svg('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.append(svg('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#7e9b78' }));
    defs.append(marker); view.append(defs);
    view.append(svg('rect', { x: 23, y: 32, width: 479, height: 398, rx: 15, fill: '#f3f7ec', stroke: '#e0e8d5', 'stroke-dasharray': '4 5' }),
      svg('rect', { x: 524, y: 32, width: 273, height: 398, rx: 15, fill: '#faf6ed', stroke: '#e9e0cc', 'stroke-dasharray': '4 5' }),
      svg('text', { x: 43, y: 61, class: 'group-title' }, 'API-GATEWAY'),
      svg('text', { x: 544, y: 61, class: 'group-title' }, 'VISITS-SERVICE'));
    const seed = graph.nodes.find(node => node.id === query.seed_id);
    const client = graph.nodes.find(node => node.method_name === 'getVisitsForPets');
    const controller = graph.nodes.find(node => node.method_name === 'getOwnerDetails');
    const positions = new Map([[controller.id, [45, 99, 229, 96]], [client.id, [247, 246, 229, 96]], [seed.id, [546, 155, 229, 108]]]);
    for (const [index, edge] of graph.edges.entries()) {
      const path = edge.type === 'CALLS' ? 'M 158 195 V 294 H 244' : 'M 476 294 C 519 294 516 208 543 208';
      const group = svg('g', { class: 'graph-edge', 'data-edge': index, role: 'button', tabindex: '0', 'aria-label': edge.type + ', ' + (edge.cross_service ? 'liên dịch vụ' : 'nội dịch vụ') });
      group.append(svg('path', { d: path, fill: 'none', class: 'edge-target' }),
        svg('path', { d: path, fill: 'none', stroke: '#8ea684', 'stroke-width': '1.7', 'marker-end': 'url(#arrowhead)', class: 'edge-visible' }));
      if (edge.type === 'CALLS') group.append(svg('text', { x: 102, y: 224, class: 'edge-label' }, 'CALLS'), svg('text', { x: 75, y: 239, class: 'edge-label' }, 'circuit breaker'));
      else group.append(svg('text', { x: 400, y: 209, class: 'edge-label' }, 'INVOKES_API'), svg('text', { x: 382, y: 224, class: 'edge-label' }, '1 service boundary'));
      group.addEventListener('click', () => setSelection('edge', index));
      group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelection('edge', index); } });
      view.append(group);
    }
    if ($('show-all').checked) {
      const others = graph.nodes.filter(node => !positions.has(node.id));
      view.append(svg('text', { x: 546, y: 310, class: 'group-title' }, 'NGOÀI TUYẾN TRUY VẤN'));
      others.forEach((node, index) => positions.set(node.id, [546 + index * 119, 326, 110, 62]));
    }
    for (const [id, [x, y, width, height]] of positions) {
      const node = graph.nodes.find(node => node.id === id);
      const isSeed = id === seed.id;
      const small = width < 200;
      const candidate = query.impacted_methods.find(item => item.method_id === id);
      const group = svg('g', { class: 'graph-node', 'data-node': id, role: 'button', tabindex: '0', 'aria-label': className(node) + '.' + signature(node), transform: 'translate(' + x + ',' + y + ')' });
      group.append(svg('rect', { width, height, rx: 9, fill: isSeed ? '#fff3de' : small ? '#fffdf7' : '#fff', stroke: isSeed ? '#d7bb8b' : '#cedbc5', class: 'node-box' }));
      if (small) {
        group.append(svg('text', { x: 10, y: 25, class: 'node-signature' }, signature(node).length > 13 ? node.method_name + '(…)' : signature(node)), svg('text', { x: 10, y: 45, class: 'node-role' }, 'ngoài query'));
      } else {
        group.append(svg('text', { x: 15, y: 25, class: 'node-role' }, isSeed ? 'SEED · GET /pets/visits' : 'ỨNG VIÊN · ' + candidate.hop + ' HOP'),
          svg('text', { x: 15, y: 50, class: 'node-title' }, className(node)),
          svg('text', { x: 15, y: 72, class: 'node-signature' }, signature(node)));
        if (isSeed) group.append(svg('text', { x: 15, y: 93, class: 'node-role' }, snapshot === 'mutated' ? '+ includeDetails · bắt buộc' : 'petId · bắt buộc'));
      }
      group.addEventListener('click', () => setSelection('node', id));
      group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelection('node', id); } });
      view.append(group);
    }
    view.append(svg('text', { x: 44, y: 405, class: 'node-role' }, 'Mũi tên gọi hàm →    |    Truy vết ứng viên ←'));
    $('graph-run').textContent = query.run_id;
    $('method-count').textContent = graph.nodes.length;
    $('edge-count').textContent = graph.edges.length;
    $('candidate-count').textContent = query.impacted_methods.length;
    $('test-count').textContent = data.provenance.suite.tests + '/' + data.provenance.suite.tests;
    $('test-date').textContent = 'Suite kỹ thuật · ' + new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok' }).format(new Date(data.provenance.technical_finished_utc));
    $('snapshot-state').className = 'tag ' + (snapshot === 'mutated' ? 'tag-amber' : 'tag-green');
    $('snapshot-state').textContent = snapshot === 'mutated' ? 'CLIENT THIẾU includeDetails' : 'CONTRACT PHÙ HỢP';
    $('snapshot-caption').textContent = 'Neo4j ' + environment.neo4j_version + ' · ' + date(environment.created_utc);
    if (selected?.type === 'edge') setSelection('edge', selected.key);
    else if (selected?.type === 'node' && positions.has(selected.key)) setSelection('node', selected.key);
    else setSelection('node', seed.id);
  }
  function changeView() {
    const view = $('contract-comparison');
    view.replaceChildren();
    for (const kind of ['baseline', 'mutated']) {
      const captured = data.snapshots[kind];
      const endpoint = captured.graph.endpoints.find(item => item.handler_id === captured.query.seed_id);
      const cell = el('div', undefined, 'contract-cell');
      cell.append(el('h3', kind === 'baseline' ? '01 / Provider · baseline' : '02 / Provider · mutated'));
      endpoint.query_parameters.forEach(parameter => {
        const item = el('div', parameter.name + ' : ' + parameter.type, 'parameter' + (parameter.name === 'includeDetails' ? ' new' : ''));
        item.append(el('span', parameter.effective_required ? 'required · true' : 'required · false'));
        cell.append(item);
      });
      cell.append(el('p', endpoint.http_method + ' ' + endpoint.normalized_path));
      view.append(cell);
    }
    const edge = data.snapshots.mutated.graph.edges.find(item => item.type === 'INVOKES_API');
    const cell = el('div', undefined, 'contract-cell');
    cell.append(el('h3', '03 / Client · không đổi'));
    edge.sent_query_parameters.forEach(parameter => cell.append(el('div', parameter, 'parameter')));
    cell.append(el('p', 'Client chưa gửi: ' + edge.missing_required_parameters.join(', ')), el('p', 'Parser ghép endpoint theo service, HTTP method và path; không ghép theo tên read chung.'));
    view.append(cell);
    $('patch-hash').textContent = 'SHA-256 ' + data.artifacts[data.patch.raw_id].sha256;
    $('patch-code').replaceChildren();
    data.patch.text.split('\n').forEach(line => $('patch-code').append(el('span', line || ' ', 'patch-line' + (line.startsWith('+') && !line.startsWith('+++') ? ' add' : line.startsWith('-') && !line.startsWith('---') ? ' remove' : ''))));
  }
  function requestDetail(id) {
    const item = data.runtime.requests.find(item => item.record.id === id);
    const view = $('runtime-detail');
    view.replaceChildren();
    document.querySelectorAll('[data-request]').forEach(node => node.classList.toggle('selected', node.dataset.request === id));
    const header = el('header');
    header.append(el('h3', id), el('span', 'HTTP ' + item.record.http_status, 'http-code' + (item.record.http_status >= 400 ? ' error' : '')), el('small', date(item.record.timestamp)));
    view.append(header, el('p', item.record.uri, 'request-path'));
    view.append(el('p', item.visit_count === null ? 'Body không có cấu trúc visits được đếm; hiển thị “—”, không quy thành 0.' : 'Visits trong body: ' + item.visit_count + '. Đây là quan sát phản hồi, không phải nhãn benchmark.'));
    view.append(el('pre', JSON.stringify(item.body, null, 2), 'json-body'));
    const raw = el('details');
    raw.append(el('summary', 'Xem raw record (body giữ nguyên dạng chuỗi)'), el('pre', JSON.stringify(item.record, null, 2), 'json-body'));
    view.append(raw);
  }
  function runtimeView() {
    const requests = data.runtime.requests;
    $('runtime-date').textContent = 'Log PetClinic ngày ' + date(data.runtime.environment.started_at) + '. Lượt Neo4j ngày 12/10 là kiểm chứng kỹ thuật riêng, không phải chạy lại ứng dụng. Dữ liệu owner/pet là fixture mẫu PetClinic.';
    const comparison = $('runtime-comparison');
    comparison.replaceChildren();
    const groups = [
      { title: 'Gateway / owners/6', ids: ['baseline_gateway', 'mutated_gateway'], note: 'Cùng HTTP 200, nhưng số visits trong phản hồi khác nhau. Code gateway có circuit breaker và fallback trả visits rỗng.' },
      { title: 'Provider / pets/visits · tham số hợp lệ', ids: ['baseline_direct', 'mutated_direct_valid_parameter'], note: 'Request mutated có includeDetails=true vẫn trả visits. Khi thiếu tham số, provider trả HTTP 400.' },
    ];
    for (const group of groups) {
      const card = el('section', undefined, 'runtime-card');
      card.append(el('h3', group.title));
      const maximum = Math.max(1, ...group.ids.map(id => requests.find(item => item.record.id === id).visit_count ?? 0));
      for (const id of group.ids) {
        const item = requests.find(item => item.record.id === id);
        const row = el('div', undefined, 'bar-row');
        const track = el('div', undefined, 'bar-track');
        const fill = el('div', undefined, 'bar-fill' + (item.visit_count === 0 ? ' empty' : ''));
        fill.style.width = (item.visit_count ?? 0) / maximum * 100 + '%';
        track.append(fill);
        row.append(el('span', item.record.snapshot === 'baseline' ? 'Baseline' : 'Mutated'), track, el('span', (item.visit_count ?? '—') + ' visits · ' + item.record.http_status, 'count'));
        card.append(row);
      }
      card.append(el('p', group.note));
      comparison.append(card);
    }
    $('runtime-rows').replaceChildren();
    for (const item of requests) {
      const row = el('tr'); row.dataset.request = item.record.id;
      const condition = el('td', requestNames[item.record.id]);
      condition.append(el('small', item.record.snapshot));
      const path = new URL(item.record.uri);
      const status = el('td'); status.append(el('span', item.record.http_status, 'http-code' + (item.record.http_status >= 400 ? ' error' : '')));
      const control = el('td'); control.append(button('Xem →', () => requestDetail(item.record.id)));
      row.append(condition, el('td', item.record.method + ' ' + path.pathname + path.search, 'request-path'), status, el('td', item.visit_count === null ? '—' : String(item.visit_count)), control);
      row.addEventListener('click', () => requestDetail(item.record.id));
      $('runtime-rows').append(row);
    }
    requestDetail('mutated_gateway');
  }
  function provenanceView() {
    const p = data.provenance;
    const view = $('provenance-body');
    view.replaceChildren();
    const grid = el('div', undefined, 'provenance-grid');
    for (const item of [
      { title: '01 / Parser → Neo4j → query', text: 'Lượt chạy riêng, checkout sạch trước/sau. ' + p.suite.tests + ' test pass, không skip. Kết quả query trong demo đến từ Neo4j thật, không phải đồ thị vẽ tay.', pairs: [['Implementation SHA', p.implementation_sha], ['PetClinic baseline SHA', p.source_sha], ['Thời điểm', date(p.technical_finished_utc)]], downloads: [['JUnit', 'suite-pytest.xml'], ['Log suite', 'suite-pytest.log'], ['Audit', 'technical-audit']] },
      { title: '02 / Bằng chứng runtime PetClinic', text: '7 raw request/response trong lượt lịch sử của gói benchmark. Demo kiểm checksum của 6 artifact runtime dùng ở đây; không tuyên bố đã kiểm lại toàn bộ gói benchmark.', pairs: [['Benchmark SHA', p.benchmark_sha], ['Config revision', data.runtime.environment.config_revision], ['Thời điểm', date(p.runtime_started)]], downloads: [['JSONL', 'runtime-requests'], ['Environment', 'runtime-environment'], ['Patch UTF-16LE', 'runtime-patch']] },
    ]) {
      const card = el('section', undefined, 'provenance-card');
      card.append(el('h3', item.title), el('p', item.text));
      item.pairs.forEach(([key, value]) => { card.append(el('p', key), el('code', value)); });
      const controls = el('div', undefined, 'download-controls');
      item.downloads.forEach(([name, id]) => controls.append(button('↓ ' + name, () => downloadArtifact(id))));
      card.append(controls); grid.append(card);
    }
    view.append(grid);
    const limits = el('div', undefined, 'limitations');
    limits.append(el('strong', 'Đọc kết quả trong đúng phạm vi'));
    const list = el('ul');
    [
      'Demo trình bày dữ liệu đã lưu. Nút “Theo dấu” chỉ chạy minh họa trên kết quả query, không gửi truy vấn mới.',
      'Nhận diện cạnh HTTP dựa trên cấu hình hostname mặc định. Parser ghi nhận setHostname có thể đổi đích ở runtime; chưa xử lý tổng quát mọi routing/configuration.',
      'Graph chỉ parse ba file, 5 Method và 2 cạnh phụ thuộc. Neo4j có thêm các node/cạnh chứa thuộc tính và containment; chúng không tính thành hop phụ thuộc.',
      'Mỗi CALLS/INVOKES_API tính 1 hop. Tuyến dài nhất trong query có 2 hop và 1 lần qua ranh giới service; seed bị loại khỏi tập ứng viên.',
      'Tham số includeDetails được thêm nhưng thân handler không đổi. Patch kỹ thuật LF và patch runtime UTF-16LE tương đương về dòng Java thay đổi, không cùng byte/hash; ba file baseline khớp sau chuẩn hóa CRLF → LF.',
      'Môi trường kiểm chứng: Python ' + p.python + ' trên Linux container, Neo4j ' + current().environment.neo4j_version + '. Docker Desktop bridge sử dụng TCP relay chuyển tiếp đến port Neo4j riêng, không đổi Bolt payload. Đây không phải bằng chứng chạy Python native trên Windows.',
      'Chroma được kiểm thử riêng với cache model đã chuẩn bị. Demo không gọi semantic retrieval; chưa tích hợp LLM, không đo chất lượng câu trả lời.',
      'Nhãn P01 vẫn pending_review. Không có nhãn dự thảo, điểm F1 hay quyết định reviewer trong bundle. Chưa mở hoặc khóa P02–P04.',
      'Demo tiết lộ output hệ thống và quan sát runtime: không thay thế gói review source-first lượt 1. Reviewer cần lưu nhận định độc lập trước khi xem phần kết quả.',
    ].forEach(text => list.append(el('li', text)));
    limits.append(list); view.append(limits);
    $('artifact-list').replaceChildren();
    for (const [id, artifact] of Object.entries(data.artifacts)) {
      const row = el('div', undefined, 'artifact-row');
      const label = el('div');
      label.append(el('strong', artifact.download_name), el('code', artifact.origin + ' / ' + artifact.path), el('code', 'SHA-256 ' + artifact.sha256 + ' · ' + artifact.byte_length + ' byte'));
      row.append(label, button('↓ Tải', () => downloadArtifact(id)));
      $('artifact-list').append(row);
    }
  }
  async function trace() {
    const generation = ++traceGeneration;
    const order = [current().query.seed_id, ...[...current().query.impacted_methods].sort((a, b) => a.hop - b.hop).map(item => item.method_id)];
    $('trace-button').disabled = true;
    $('trace-button').textContent = 'Đang minh họa đường truy vấn…';
    for (const id of order) {
      if (generation !== traceGeneration) return;
      setSelection('node', id);
      await new Promise(done => setTimeout(done, 650));
    }
    if (generation === traceGeneration) finishTrace();
  }
  function finishTrace() {
    traceGeneration++;
    $('trace-button').disabled = false;
    $('trace-button').textContent = '↶ Theo dấu từ seed';
  }
  function fallback() {
    page('graph');
    const controller = current().graph.nodes.find(node => node.method_name === 'getOwnerDetails');
    setSelection('node', controller.id);
    const lines = current().sources[controller.file].text.split('\n');
    const start = lines.findIndex(line => /private\s+Mono<Visits>\s+emptyVisitsForPets\(/.test(line)) + 1;
    if (!start) throw new Error('Không tìm thấy fallback trong source snapshot');
    source(controller.file, start, Math.min(start + 3, lines.length));
    $('source-code').closest('section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function setSnapshot(kind) {
    finishTrace();
    snapshot = kind;
    document.querySelectorAll('[data-snapshot]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.snapshot === kind)));
    graphView();
  }
  function reasoningCitation(citation) {
    const text = citation.evidence_id + (citation.line_start === null ? ' · ' + citation.kind : ' · ' + citation.file.split('/').at(-1) + ' : ' + citation.line_start + '–' + citation.line_end);
    return button(text, () => {
      if (citation.kind === 'source') { setSnapshot('baseline'); page('graph'); source(citation.file, citation.line_start, citation.line_end); }
      else if (citation.kind === 'proposed_patch') page('change');
      else {
        setSnapshot('baseline'); page('graph');
        const index = current().graph.edges.findIndex(edge => citation.kind === 'static_unresolved' ? edge.cross_service : window.P01Reasoning.canonical(edge).includes(citation.quote));
        if (index >= 0) setSelection('edge', index);
      }
    }, 'evidence-button');
  }
  function reasoningResult(validated) {
    const view = $('reasoning-result'); view.replaceChildren();
    view.append(el('div', 'PHẢN HỒI NHẬP THỦ CÔNG · KHÔNG XÁC MINH PROVIDER/MODEL', 'tag tag-neutral'),
      el('p', 'ID, schema, quote và đường phụ thuộc đã qua kiểm tra cấu trúc. Chưa xác minh đúng/sai của dự đoán; không phải nhãn hoặc quyết định reviewer.'),
      el('p', validated.summary.text));
    validated.summary.citations.forEach(citation => view.append(reasoningCitation(citation)));
    const states = { reachable: 'Có đường phụ thuộc', not_established: 'Chưa thiết lập', unknown: 'Chưa biết',
      likely: 'Có khả năng', unlikely: 'Ít khả năng', required: 'Cần sửa', optional: 'Tùy phương án sửa' };
    for (const item of validated.method_predictions) {
      const card = el('section', undefined, 'prediction-card');
      card.append(el('h3', item.method_id.split('::').at(-1)), el('p', item.method_id, 'mono'));
      details(card, [['Phụ thuộc cấu trúc', states[item.dependency_status]], ['Tác động hành vi (dự đoán)', states[item.behavioral_impact]],
        ['Cần sửa mã (dự đoán)', states[item.requires_code_change]], ['Hop / ranh giới service', item.logical_hops === null ? 'Chưa thiết lập' : item.logical_hops + ' / ' + item.service_boundary_crossings],
        ['Kiểm đường đi', item.path_validation === 'matches_supplied_static_graph' ? 'Khớp graph được cung cấp' : item.path_validation === 'source_inference_not_graph_verified' ? 'Suy luận từ source, chưa đối chiếu graph' : 'Không tuyên bố đường đi']]);
      card.append(el('p', item.rationale));
      item.citations.forEach(citation => card.append(reasoningCitation(citation)));
      view.append(card);
    }
    if (!validated.method_predictions.length) view.append(el('p', 'Phản hồi không đưa method nào vào tập dự đoán. Bộ kiểm tra không ép kết quả phải có hai method.'));
    if (validated.uncertainties.length) {
      view.append(el('h3', 'Điểm chưa chắc chắn')); const list = el('ul');
      validated.uncertainties.forEach(text => list.append(el('li', text))); view.append(list);
    }
    $('download-reasoning-validation').hidden = false;
    $('download-reasoning-validation').onclick = () => downloadBytes(JSON.stringify(validated, null, 2), 'p01-imported-structural-validation.json', 'application/json');
  }
  async function prepareReasoning() {
    const generation = ++reasoningGeneration;
    reasoningRequest = null;
    $('reasoning-error').hidden = true;
    $('reasoning-status').textContent = 'ĐANG CHUẨN BỊ';
    $('reasoning-result').replaceChildren(el('div', 'Chưa có phản hồi. Không sinh câu trả lời giả trong chế độ offline.', 'reasoning-empty'));
    $('download-reasoning-validation').hidden = true;
    for (const id of ['download-reasoning-request', 'download-reasoning-context', 'import-reasoning-response']) $(id).disabled = true;
    try {
      if (!window.P01Reasoning) throw new Error('Thiếu reasoning-core.js trong thư mục demo.');
      const request = await window.P01Reasoning.buildContext(data, { mode: $('reasoning-mode').value,
        depth: Number($('reasoning-depth').value), byteBudget: Number($('reasoning-budget').value) });
      if (generation !== reasoningGeneration) return;
      reasoningRequest = request;
      $('reasoning-status').textContent = 'SẴN SÀNG · CHƯA GỌI LLM';
      $('reasoning-meta').replaceChildren();
      details($('reasoning-meta'), [['Source', 'Baseline + patch dự kiến; không theo toggle snapshot của viewer'],
        ['Method universe', request.context.method_universe.length + ' method · seed lưu riêng'],
        ['Context', request.context_bytes + ' byte UTF-8 / ' + request.context.limits.byte_budget],
        ['Evidence / đường ứng viên', request.context.evidence.length + ' / ' + (request.context.graph?.candidate_paths.length ?? 'không cung cấp graph')],
        ['Context SHA-256', request.context_sha256], ['Prompt version', request.prompt_version], ['Runtime / nhãn trong context', 'Không / Không']]);
      $('reasoning-context-json').textContent = JSON.stringify(request.context, null, 2);
      $('reasoning-prompt-json').textContent = JSON.stringify({ prompt_version: request.prompt_version, system_prompt: request.system_prompt, output_schema: request.output_schema }, null, 2);
      for (const id of ['download-reasoning-request', 'download-reasoning-context', 'import-reasoning-response']) $(id).disabled = false;
    } catch (error) {
      if (generation !== reasoningGeneration) return;
      $('reasoning-status').textContent = 'KHÔNG TẠO CONTEXT';
      $('reasoning-error').hidden = false;
      $('reasoning-error').textContent = error.message;
      $('reasoning-meta').replaceChildren();
      $('reasoning-context-json').textContent = '';
      $('reasoning-prompt-json').textContent = '';
    }
  }
  function initReasoning() {
    for (const id of ['reasoning-mode', 'reasoning-depth', 'reasoning-budget']) $(id).addEventListener('change', prepareReasoning);
    $('download-reasoning-request').addEventListener('click', () => downloadBytes(JSON.stringify(reasoningRequest, null, 2), 'p01-reasoning-request.json', 'application/json'));
    $('download-reasoning-context').addEventListener('click', () => downloadBytes(JSON.stringify(reasoningRequest.context, null, 2), 'p01-reasoning-context.json', 'application/json'));
    $('import-reasoning-response').addEventListener('click', () => $('reasoning-response-file').click());
    $('reasoning-response-file').addEventListener('change', async event => {
      const file = event.target.files[0]; event.target.value = '';
      if (!file || !reasoningRequest) return;
      const generation = reasoningGeneration; const request = reasoningRequest;
      $('reasoning-result').replaceChildren(el('div', 'Đang kiểm tra phản hồi…', 'reasoning-empty'));
      $('download-reasoning-validation').hidden = true;
      try {
        if (file.size > 1024 * 1024) throw new Error('Phản hồi vượt giới hạn 1 MB.');
        const response = JSON.parse(await file.text());
        const validated = await window.P01Reasoning.validateResponse(response, request);
        if (generation !== reasoningGeneration) return;
        reasoningResult(validated);
      } catch (error) {
        if (generation !== reasoningGeneration) return;
        const notice = el('div', 'Phản hồi bị từ chối: ' + error.message, 'error-banner');
        notice.setAttribute('role', 'alert'); $('reasoning-result').replaceChildren(notice);
      }
    });
    prepareReasoning();
  }
  try {
    if (!data || data.schema !== 'p01-evidence-demo/1' || data.mode !== 'recorded-evidence') throw new Error('Thiếu bundle dữ liệu hợp lệ. Giữ data.js cùng thư mục index.html.');
    graphView(); changeView(); runtimeView(); provenanceView(); initReasoning();
    document.querySelectorAll('[data-page]').forEach(node => node.addEventListener('click', () => page(node.dataset.page)));
    document.querySelectorAll('[data-snapshot]').forEach(node => node.addEventListener('click', () => {
      setSnapshot(node.dataset.snapshot);
    }));
    $('show-all').addEventListener('change', graphView);
    $('trace-button').addEventListener('click', trace);
    $('view-fallback').addEventListener('click', fallback);
    $('download-patch').addEventListener('click', () => downloadArtifact(data.patch.raw_id));
    $('download-runtime').addEventListener('click', () => downloadArtifact(data.runtime.raw_id));
    $('download-bundle').addEventListener('click', () => downloadBytes(JSON.stringify(data, null, 2), 'p01-demo-recorded-evidence.json', 'application/json'));
    window.addEventListener('hashchange', () => page(location.hash.slice(1), false));
    page(location.hash.slice(1) || 'graph', false);
  } catch (error) {
    $('fatal-error').hidden = false;
    $('fatal-error').textContent = 'Không thể mở demo: ' + error.message;
    console.error(error);
  }
})();
