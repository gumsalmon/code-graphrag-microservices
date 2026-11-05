// Supplement measurement contract; no label or prediction schema adoption.
import { createHash } from 'node:crypto';
export const LABEL = 'code-graphrag.p02-helper-supplement';
export const PYTHON_IMAGE = 'sha256:da047cb8f9d1d98e5c070f5300ba9f7274e33b8fc0e5be5ed88740aed1b95ba9';
export const PRIOR_F03_MANIFEST = 'bce38e90d518c2f35860569aea479e476e8ca786c5e3494ef5522da31da65f20';
export const MUTATED_JAR = '91fe74407a4ea8075df1b7b744c773138c88d4e4a3d87ed0dd88115398377609';
export const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const canonical = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort()) : item);
export function helperGroups(runId) {
  requireThat(/^[a-z0-9-]{8,48}$/.test(runId), 'Unsafe supplement run namespace');
  return ['baseline', 'mutated'].flatMap(snapshot => [1, 2].map(repetition => ({ id: snapshot + '-r' + repetition, snapshot, repetition,
    prefix: 'p02hs-' + runId + '-' + snapshot + '-r' + repetition, owner: runId + ':' + snapshot + '-r' + repetition,
    provider_origin: 'http://visits-service:8082/', fresh_database: true, post_requests: 0 })));
}
export function requireOwned(resource, owner, labels) {
  requireThat(resource.name.startsWith('p02hs-') && resource.owner === owner && labels?.[LABEL] === owner, 'Refuse foreign supplement resource');
  return true;
}
export function helperPlan(runId, bindings) {
  return { schema: 'p02-helper-supplement-plan/1', measurement_version: '2', source: 'Phát RQ-H01/H02/H03/H04; accepted user continuation after audit',
    scenario: 'P02', scenario_version: '0.1.1', bindings, groups: helperGroups(runId), row_ids: ['R06', 'R07', 'R10', 'R11'],
    measurements: ['paired_direct_joinIds_input_return', 'paired_setter_field_and_actual_real_provider_request_response',
      'paired_Function_apply_using_raw_provider_and_owner_inputs', 'paired_direct_fallback_subscription'],
    group_count: 4, primary_gets_per_group: 3, targeted_client_gets_per_group: 1,
    production_callback_tracing: false, instrumentation_changes_to_application: false, application_rebuild: false,
    owner_dto_projection: 'Remove only pets[].type.id for the unchanged consumer PetType(name) record; keep raw/projected trees and removed fields explicitly',
    new_label_polarity: false, reviewed_ground_truth: false, final_test_locked: false, official_scoring: false,
    evaluated_system_outputs: false, model_calls: 0, full_forty_slot_matrix_rerun: false };
}

export function validateHelperEvents(events, group, inputs) {
  requireThat(Array.isArray(events) && events.length === 10, 'Missing/extra targeted events');
  for (const event of events) requireThat(event.group_id === group.id && event.snapshot === group.snapshot && event.repetition === group.repetition &&
    typeof event.timestamp_utc === 'string' && Number.isFinite(Date.parse(event.timestamp_utc)), 'Wrong event group/time');
  const names = ['application_identity', 'raw_input_binding', 'joinIds_direct_return', 'setHostname_direct_assignment', 'actual_client_request',
    'actual_client_response', 'client_subscription_completed', 'addVisitsToOwner_function_applied', 'emptyVisitsForPets_direct_subscription', 'measurement_completed'];
  requireThat(canonical(events.map(event => event.kind)) === canonical(names), 'Unexpected event sequence');
  const data = Object.fromEntries(events.map(event => [event.kind, event.data]));
  requireThat(Object.keys(data.application_identity.classes).length === 7 && data.application_identity.consumer_source_modified === false, 'Application class identity absent');
  for (const identity of Object.values(data.application_identity.classes)) requireThat(/^[a-f0-9]{64}$/.test(identity.sha256) && identity.code_source === 'file:/harness/extracted/BOOT-INF/classes/', 'Unexpected application class source');
  requireThat(data.raw_input_binding.owner_sha256 === hash(inputs.ownerBytes) && data.raw_input_binding.provider_visits_sha256 === hash(inputs.visitBytes), 'Helper does not bind raw inputs');
  requireThat(canonical(data.joinIds_direct_return.input) === '[7,8]' && data.joinIds_direct_return.returned === '7,8' &&
    data.joinIds_direct_return.returned_type === 'java.lang.String', 'Direct joinIds observation differs');
  requireThat(data.setHostname_direct_assignment.input === group.provider_origin && data.setHostname_direct_assignment.field_before === 'http://visits-service/' &&
    data.setHostname_direct_assignment.field_after === group.provider_origin, 'Setter assignment not observed');
  requireThat(data.actual_client_request.method === 'GET' && data.actual_client_request.url === group.provider_origin + 'pets/visits?petId=7%2C8' &&
    data.actual_client_response.status === 200, 'Actual request does not reach fixed provider successfully');
  const normalize = value => ({ ...value, items: [...value.items].sort((a,b) => a.id-b.id) });
  requireThat(canonical(normalize(data.client_subscription_completed.decoded)) === canonical(normalize(JSON.parse(inputs.visitBytes))), 'Client decoded content differs from raw provider content');
  const merge = data.addVisitsToOwner_function_applied;
  requireThat(merge.function_applied === true && merge.same_owner_reference === true, 'Returned Function was not applied');
  requireThat(canonical(normalize(merge.visits_input)) === canonical(normalize(JSON.parse(inputs.visitBytes))), 'Merge did not use provider raw Visits');
  const ownerRaw = JSON.parse(inputs.ownerBytes), before = merge.owner_before, after = merge.owner_after;
  const removedFields = [];
  for (const [index, pet] of ownerRaw.pets.entries()) if (Object.hasOwn(pet.type, 'id'))
    removedFields.push({json_pointer:'/pets/'+index+'/type/id', value:pet.type.id});
  requireThat(canonical(data.raw_input_binding.owner_projection) === canonical({policy:'remove_pets_type_id_only_for_declared_consumer_record', removed_fields:removedFields}), 'Owner DTO projection is not explicitly accounted for');
  for (const key of ['id','firstName','lastName','address','city','telephone']) requireThat(canonical(before[key]) === canonical(ownerRaw[key]) && canonical(after[key]) === canonical(before[key]), 'Owner scalar changed: '+key);
  requireThat(before.pets.length === ownerRaw.pets.length && before.pets.length === after.pets.length, 'Owner pets missing');
  for (const pet of before.pets) {
    const rawPet = ownerRaw.pets.find(row => row.id === pet.id), output = after.pets.find(row => row.id === pet.id);
    requireThat(rawPet && output && pet.visits.length === 0, 'Unexpected initial pet data');
    for (const key of ['id','name','birthDate']) requireThat(canonical(pet[key]) === canonical(rawPet[key]) && canonical(output[key]) === canonical(pet[key]), 'Pet field differs: '+key);
    const expectedType={...rawPet.type}; delete expectedType.id;
    requireThat(canonical(pet.type)===canonical(expectedType) && canonical(output.type)===canonical(pet.type), 'Pet type differs beyond declared id projection');
    const expected = merge.visits_input.items.filter(visit => visit.petId === pet.id);
    requireThat(canonical(output.visits) === canonical(expected), 'Merge drops/misassigns visits');
  }
  requireThat(canonical(data.emptyVisitsForPets_direct_subscription.returned) === '{"items":[]}' &&
    data.emptyVisitsForPets_direct_subscription.subscribed === true && data.emptyVisitsForPets_direct_subscription.production_callback_traced === false,
    'Direct fallback or production-trace claim differs');
  requireThat(data.measurement_completed.impact_labels_created === false && data.measurement_completed.evaluated_method_output === false &&
    data.measurement_completed.production_method_tracing_claimed === false, 'Out-of-scope completion claim');
  return { status: 'targeted_records_verified_not_labels', group_id: group.id, event_count: events.length,
    application_classes: data.application_identity.classes, rows_with_supplement: ['R06','R07','R10','R11'],
    production_callback_traced: false, labels_accepted: false };
}
