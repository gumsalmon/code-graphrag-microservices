const repository = 'toy-context-repo', snapshot = 'toy-snapshot';
const id = (service, method) => repository + '@' + snapshot + '::toy-' + service + '::toy.' + method;
export const IDS = { seed: id('provider', 'Resource#read(int)'), client: id('client', 'Client#load(int)'),
  web: id('client', 'Web#get(int)'), entry: id('web', 'Entry#handle(int)'), unrelated: id('client', 'Format#format(int)') };
export function selectionFixture() {
  return { synthetic_only: true, repository_id: repository, snapshot_id: snapshot, seed_method_id: IDS.seed,
    query: 'remote read contract parameter',
    methods: Object.values(IDS).map(method_id => ({ id: method_id, service: method_id.split('::')[1] })),
    documents: [
      { id: 'toy-doc-seed', evidence_id: 'TOY-SEED', method_id: IDS.seed, text: 'public Object read(int id) { return records.find(id); }' },
      { id: 'toy-doc-client', evidence_id: 'TOY-CLIENT', method_id: IDS.client, text: 'return remote.read(id); // caller contract parameter' },
      { id: 'toy-doc-web', evidence_id: 'TOY-WEB', method_id: IDS.web, text: 'return client.load(id);' },
      { id: 'toy-doc-entry', evidence_id: 'TOY-ENTRY', method_id: IDS.entry, text: 'return web.get(id);' },
      { id: 'toy-doc-unrelated', evidence_id: 'TOY-FORMAT', method_id: IDS.unrelated, text: 'return Integer.toString(id);' },
    ], edges: [
      { caller: IDS.client, callee: IDS.seed, type: 'INVOKES_API', resolution_status: 'RESOLVED' },
      { caller: IDS.web, callee: IDS.client, type: 'CALLS', resolution_status: 'RESOLVED' },
      { caller: IDS.entry, callee: IDS.web, type: 'CALLS', resolution_status: 'RESOLVED' },
    ] };
}
export const selectionOptions = (mode = 'combined') => ({ mode, top_k_per_route: 3, max_depth: 3,
  context_byte_limit: 8192, mandatory_document_ids: [] });
