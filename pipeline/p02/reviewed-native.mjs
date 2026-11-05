// Identity of the independently checked 02/11 P02 run, for new derived artifacts only.
// Old runners, pins and artifacts remain unchanged. No parser/DB/model execution here.
import { digest, canonical } from './static-context.mjs';
import { RECEIPT_SHA256 } from './offline-method.mjs';
export const REVIEWED_NATIVE_ROOT='handoff-out/p02-offline-method-reviewed';
export const REVIEWED_NATIVE_MANIFEST='42e48fbf04beb48bf79ff84812d4476c05f5286056a19621fdf86b9d0945b978';
export const REVIEWED_PROFILE_SHA256='c1f8aed32565e50512f4cdea32742892b0ae2ea3db4a2177846c69fef88051a0';
export const REVIEWED_IMPLEMENTATION=Object.freeze({
 parser:'f46fdf123ab156b7d3f3a03ced679dd581e10fbbb6ca28d64140147a1d6eeeb0',
 importer:'93c20bd93e6dd5997043b4e4806aa5df7523426b4a82e6607b694934e5d4d7d3'
});
const check=(ok,message)=>{if(!ok)throw Error(message);};

// Source-only identity check: does not load graph, labels, runtime or annotation notes.
export function assertReviewedManifest(manifest,provenance){
 check(digest(manifest)===REVIEWED_NATIVE_MANIFEST,'Different reviewed native manifest');
 check(provenance.case==='P02'&&provenance.receipt_sha256===RECEIPT_SHA256&&
  provenance.source_commit==='3858f9c630cf989bb6809a86edf47c2be78dc9f1'&&
  provenance.reviewed_implementation_profile_sha256===REVIEWED_PROFILE_SHA256&&
  canonical(provenance.implementation)===canonical(REVIEWED_IMPLEMENTATION)&&
  provenance.copied_source_only===true&&provenance.benchmark_raw_or_labels_mounted===false&&
  provenance.shared_draft_contract_adopted===false,'Different reviewed implementation/source policy');
 return true;
}

// Used after the independent native-run audit, for a technical evidence viewer.
export function assertReviewedAudit(manifest,report,provenance){
 assertReviewedManifest(manifest,provenance);
 check(report.manifest_sha256===REVIEWED_NATIVE_MANIFEST&&report.model_calls===0&&report.score_computed===false&&
  report.labels_or_annotation_notes_read===false&&report.fresh_database_instances===2&&report.private_internal_networks===1&&
  canonical(report.groups?.map(row=>row.snapshot))===canonical(['baseline','mutated']),'Wrong reviewed audit scope');
 for(const row of report.groups){
  check(row.full_node_property_parity===true&&row.node_property_difference===null&&
   row.native_methods===9&&row.database_nodes===18&&row.database_relationships===18&&
   row.structural_method_inventory?.eligible===8&&row.structural_method_inventory.represented===8&&
   row.structural_method_inventory.unrepresented.length===0&&
   Object.values(row.metadata_parity).every(value=>value===true),'Reviewed parity/inventory is incomplete');
 }
 return true;
}
