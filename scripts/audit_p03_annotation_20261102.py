"""Coordinator's independent, read-only P03 checkpoint audit. Never executes returned code.

Integrity and evidence consistency do not certify human reading or accept ground truth.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import uuid

from package_project_transfer import extended_path, parse_manifest
from package_petclinic_roles import RolePacketScanner
from transfer_security import safe_member

ROOT = Path(__file__).resolve().parent.parent
RECEIVED = 'received/P03_ANNOTATION_2026-11-01_v2'
CANONICAL = ROOT / 'handoff-out/petclinic-role-packets/20261031T071551Z-64bff5b9/phat/ZIP_VERIFIED'
LABEL_SHA = '61edca6397a52a5076d3531cecf775d0052e0e7053163165e99110de14222732'
CHECKPOINT_SHA = 'af5225b5a4cdf90b203e18e9271db759b7592a6e1587d9bf9aa3a2b58f1ad571'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result


class Audit:
    def __init__(self, directory):
        self.base = extended_path(directory)
        self.counts = Counter()
        self.cache = {}
        self.source_spans = set()

    def check(self, ok, message):
        if not ok:
            raise ValueError(message)
        self.counts[message.split(':')[0]] += 1

    def read(self, path):
        path = extended_path(path)
        if path not in self.cache:
            self.check(path.is_file() and not path.is_symlink(), 'regular file: ' + str(path))
            self.cache[path] = path.read_bytes()
        return self.cache[path]

    def load(self, path):
        return json.loads(self.read(path).decode('utf-8-sig'), object_pairs_hook=unique,
                          parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))

    def manifest(self, directory, name='SHA256SUMS.annotation.txt'):
        rows = parse_manifest(self.read(directory / name))
        names = set()
        for file, expected in rows:
            self.check(safe_member(file) and file.casefold() not in names, 'safe manifest member: ' + file)
            names.add(file.casefold())
            self.check(sha(self.read(directory / file)) == expected, 'manifest byte hash: ' + file)
        actual = {p.relative_to(directory).as_posix().casefold() for p in directory.rglob('*')
                  if p.is_file() and p.relative_to(directory).as_posix() != name}
        self.check(actual == names, 'complete manifest inventory: ' + name)
        return len(rows)

    def ref(self, item, roots, default='return'):
        root, name = item.get('root', default), item['path']
        self.check(root in roots and safe_member(name), 'safe evidence reference: ' + name)
        raw = self.read(roots[root] / name)
        if 'sha256' in item:
            self.check(sha(raw) == item['sha256'], 'reference hash: ' + name)
        if 'bytes' in item:
            self.check(len(raw) == item['bytes'], 'reference bytes: ' + name)
        if 'line_start' in item:
            start, end = item['line_start'], item.get('line_end', item['line_start'])
            self.check(type(start) is int and type(end) is int and 1 <= start <= end <= len(raw.decode('utf-8-sig').splitlines()), 'reference source span: ' + name)
            self.source_spans.add((str(roots[root] / name), start, end))
        if 'request_id' in item:
            if name.endswith('.json'):
                self.check(self.load(roots[root] / name)['id'] == item['request_id'], 'request reference identity: ' + name)
            elif name.endswith('.body'):
                request = name.endswith('.request.body')
                meta_name = name.removesuffix('.request.body' if request else '.body') + '.json'
                meta = self.load(roots[root] / meta_name)
                prefix = 'request_body' if request else 'body'
                self.check(meta['id'] == item['request_id'] and meta[prefix + '_file'] == Path(name).name and
                           meta[prefix + '_sha256'] == sha(raw) and meta[prefix + '_bytes'] == len(raw), 'body reference identity: ' + name)
        return raw

    def refs(self, value, roots, default='return'):
        if isinstance(value, dict):
            if 'path' in value and 'sha256' in value:
                self.ref(value, roots, default)
            for child in value.values():
                self.refs(child, roots, default)
        elif isinstance(value, list):
            for child in value:
                self.refs(child, roots, default)

    def run(self):
        p = self.base
        history = p / 'history/v1'
        manifest_files = self.manifest(p)
        history_files = self.manifest(history)
        labels = self.load(p / 'labels.draft.v2.json')
        checkpoint = self.load(p / 'ANNOTATION_CHECKPOINT.v2.json')
        evidence = self.load(p / 'evidence_manifest.v2.json')
        self.check(sha(self.read(p / 'labels.draft.v2.json')) == LABEL_SHA, 'received label identity')
        self.check(sha(self.read(p / 'ANNOTATION_CHECKPOINT.v2.json')) == CHECKPOINT_SHA, 'received checkpoint identity')
        roots = {}
        for key, name in labels['reference_roots'].items():
            self.check(name == '.' or safe_member(name), 'reference root path: ' + key)
            roots[key] = p if name == '.' else p / name
        self.check(labels['reference_roots'] == evidence['reference_roots'] and roots['return'] == p, 'reference roots consistent')
        packet = roots['packet']
        canonical = extended_path(CANONICAL)
        actual_packet = {x.relative_to(packet).as_posix() for x in packet.rglob('*') if x.is_file()}
        canonical_packet = {x.relative_to(canonical).as_posix() for x in canonical.rglob('*') if x.is_file()}
        self.check(actual_packet == canonical_packet, 'canonical input packet inventory')
        for name in sorted(actual_packet):
            self.check(self.read(packet / name) == self.read(canonical / name), 'canonical source raw input bytes: ' + name)
        for name in ['labels.draft.v2.json', 'evidence_manifest.v2.json', 'ANNOTATION_CHECKPOINT.v2.json']:
            m = re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)', self.read(p / (name + '.sha256')).decode().strip())
            self.check(m is not None and m[2] == name and m[1] == sha(self.read(p / name)), 'artifact sidecar: ' + name)
        for item in evidence['files']:
            self.ref(item, roots)
        for item in checkpoint['files']:
            self.ref(item, roots)
        self.refs(labels, roots)
        self.refs(evidence['common_evidence_refs'], roots)
        notes = self.load(p / 'notes/NOTES_BY_ENTITY.v2.json')
        exposure = self.load(p / 'notes/EXPOSURE.v2.json')
        for value in [notes, exposure, self.load(p / 'notes/ATTRIBUTION_REVISION.v2.json')]:
            self.refs(value, roots)
        old_labels = self.load(history / 'labels.draft.v1.json')
        old_roots = {k: history if v == '.' else history / v for k, v in old_labels['reference_roots'].items()}
        self.refs(old_labels, old_roots)
        for name in ['notes/HUMAN_DECISION.v1.json', 'notes/CHECKPOINT.phase1.json',
                     'notes/CHECKPOINT.before_label_serialization.v1.json', 'notes/EXPOSURE.v1.json',
                     'notes/NOTES_BY_ENTITY.v1.json', 'proposals/CHECKPOINT.proposal.v1.json']:
            self.refs(self.load(history / name), old_roots)
        decision = self.load(ROOT / 'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json')
        authority = self.load(ROOT / 'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json')
        self.check(sha(self.read(ROOT / 'benchmark/decisions/PETCLINIC_DRAFT_INTEGRATION_2026-10-31.json')) ==
                   'bced4426f7e9ce6c7f26c31668faaf36d3ed770acd60a6a93147d7aebc06671f', 'canonical D20')
        self.check(sha(self.read(ROOT / 'benchmark/p03/decisions/INPUT_LOCK_2026-10-31.json')) ==
                   authority['case_inputs']['P03']['input_decision_sha256'], 'canonical D19')
        for key in ['source_commit', 'config_commit', 'scenario_version', 'universe_version', 'fixture_version', 'scope_version', 'candidate_manifest_sha256']:
            self.check(labels[key] == decision[key], 'locked input metadata: ' + key)
        for item in decision['artifacts']:
            self.check(sha(self.read(roots['candidate'] / item['path'])) == item['sha256'], 'locked input artifact: ' + item['path'])
        for key, name in evidence['input_paths'].items():
            self.check(sha(self.read(roots[evidence['input_paths_root']] / name)) == labels[key + '_sha256'] == evidence['bindings'][key + '_sha256'], 'label input byte binding: ' + key)
        self.check(labels['paired_manifest_sha256'] == authority['case_inputs']['P03']['paired_runtime_manifest_sha256'] == sha(self.read(packet / 'paired/SHA256SUMS.txt')), 'paired evidence manifest identity')
        self.check(labels['input_packet_manifest_sha256'] == sha(self.read(packet / 'SHA256SUMS.txt')), 'original packet manifest identity')
        universe = self.load(roots['candidate'] / 'draft/evaluation_universe.draft.v1.json')
        entity = lambda row: (row['level'], row['entity_id'])
        rows = labels['labels']
        eligible = set(map(entity, universe['eligible_entities']))
        self.check(len(rows) == len(eligible) == 31 and set(map(entity, rows)) == eligible, 'exact eligible ID coverage')
        self.check(labels['excluded_seeds'] == universe['excluded_seeds'] and len(labels['excluded_seeds']) == 3 and
                   not eligible.intersection(map(entity, labels['excluded_seeds'])), 'seed separation')
        self.check(set(labels['annotator_scope']) == {r['row_id'] for r in rows} and len(labels['annotator_scope']) == 31, 'human row scope')
        by_id = {r['row_id']: r for r in rows}
        self.check(set(by_id) == {'R%02d' % n for n in range(1, 32)}, 'unique row IDs')
        self.check(labels['status'] == checkpoint['status'] == 'pending_review' and labels['label_version'] == checkpoint['label_version'] == 'draft.v2', 'current draft version state')
        self.check(labels['coverage'] == checkpoint['coverage'], 'checkpoint coverage matches labels')
        polarity_counts = Counter(r['polarity'] for r in rows)
        self.check(dict(polarity_counts) == {'negative': 6, 'unresolved': 20, 'positive': 5}, 'reported polarity counts')
        level_counts = Counter(r['level'] for r in rows)
        self.check(dict(level_counts) == {'method': 26, 'api': 4, 'service': 1}, 'eligible level census')
        for document in [labels, checkpoint, exposure]:
            self.check(document['reviewer'] is None and document['review_decision'] is None, 'no invented reviewer decision')
        for document in [labels, checkpoint]:
            for flag in ['ground_truth_accepted', 'final_test_locked', 'official_scoring_authorized', 'technical_evaluated_outputs_gate_opened_by_this_draft']:
                self.check(document[flag] is False, 'closed scientific gate: ' + flag)
        aliases = {a['canonical_id']: a for a in universe['aliases']}
        for r in rows:
            self.check(r['behavioral_impact'] == {'positive': True, 'negative': False, 'unresolved': 'unresolved'}[r['polarity']], 'polarity behavior consistency: ' + r['row_id'])
            self.check(r['requires_code_change'] == 'unresolved' and r['repair_strategy'] is None and r['confidence'] is None, 'no invented repair confidence: ' + r['row_id'])
            self.check(r['review_status'] == 'pending_review' and r['reviewer'] is None and r['review_decision'] is None, 'row review state: ' + r['row_id'])
            self.check(r['human_annotation_confirmed'] is True and r['annotator'] == labels['annotator'] and r['exact_annotation_time'] is None, 'row human attribution without fabricated time: ' + r['row_id'])
            self.check(bool(r['rationale']) and bool(r['evidence_refs']) and bool(r['scope']['limits']), 'row evidence and bounded scope: ' + r['row_id'])
            self.check(len(r['aliases']) == 1 and {k:v for k,v in r['aliases'][0].items() if k != 'evidence_root'} == aliases[r['entity_id']] and r['aliases'][0]['evidence_root'] == 'candidate', 'alias preservation: ' + r['row_id'])
            if r['polarity'] == 'unresolved':
                self.check(bool(r['unresolved_reason']) and bool(r['evidence_request']), 'unresolved reason and requested evidence: ' + r['row_id'])
            if r['logical_hop'] is None or r['service_boundary_crossings'] is None:
                self.check(bool(r['hop_rationale']), 'unknown hop explained: ' + r['row_id'])
        self.check(len(notes['entities']) == 31 and {entity(r) for r in notes['entities']} == eligible, 'notes coverage')
        for r in notes['entities']:
            self.check(r['human_confirmed_assessment']['polarity'] == by_id[r['row_id']]['polarity'], 'notes polarity matches: ' + r['row_id'])
            self.check(bool(r['human_direct_reading']) and bool(r['ai_assistance']) and r['independent_initial_human_assessment'] is None, 'notes exposure boundary: ' + r['row_id'])
        unresolved = self.load(p / 'UNRESOLVED.v2.json')
        self.check({r['row_id'] for r in unresolved['behavioral_unresolved']} == {r['row_id'] for r in rows if r['polarity'] == 'unresolved'}, 'unresolved supplement coverage')
        for r in unresolved['behavioral_unresolved']:
            self.check(r['unresolved_reason'] == by_id[r['row_id']]['unresolved_reason'] and r['evidence_request'] == by_id[r['row_id']]['evidence_request'], 'unresolved supplement agrees: ' + r['row_id'])
        human = self.load(history / 'notes/HUMAN_DECISION.v1.json')
        self.check(human['human_source_raw_reading_confirmed_by_group'] is True and human['notes_and_exposure_confirmed'] is True and human['this_is_independent_reviewer_acceptance'] is False, 'grouped human self report received')
        self.check(set(human['question_scope']['positive']) == {r['row_id'] for r in rows if r['polarity'] == 'positive'} and set(human['question_scope']['negative']) == {r['row_id'] for r in rows if r['polarity'] == 'negative'}, 'human decision covers stated assessments')
        self.check(exposure['strict_human_source_first_attested'] is False and exposure['blinded_claimed'] is False and exposure['human_first_read_at'] is None and exposure['human_independent_initial_assessment'] is None and exposure['evaluated_system_outputs_used_as_evidence'] is False, 'exposure accurately limits attestation')
        # A presentation-only revision must not alter scientific assessments.
        ignored = {'ai_assistance', 'annotator_role', 'human_confirmation'}
        for before, after in zip(old_labels['labels'], rows):
            self.check({k:v for k,v in before.items() if k not in ignored} == {k:v for k,v in after.items() if k not in ignored}, 'v1 v2 substantive assessment preservation: ' + after['row_id'])
        raw_summary = self.raw_consistency(packet)
        scanner = RolePacketScanner(max_expanded_bytes=32*1024*1024)
        for path in p.rglob('*'):
            if path.is_file():
                name = path.relative_to(p).as_posix()
                if name.startswith('history/v1/evidence/packet/'):
                    name = name.removeprefix('history/v1/evidence/packet/')
                scanner.scan(name, self.read(path))
        self.check(not scanner.summary()['failures'], 'security pattern scan')
        for path, raw in self.cache.items():
            self.check(path.read_bytes() == raw, 'input byte preservation: ' + str(path))
        return {'case':'P03', 'label_version':'draft.v2', 'label_sha256': LABEL_SHA, 'checkpoint_sha256':CHECKPOINT_SHA,
                'manifest_files':manifest_files, 'history_manifest_files':history_files,
                'canonical_input_files':len(actual_packet), 'evidence_manifest_entries':len(evidence['files']),
                'eligible_ids':31, 'excluded_seeds':3, 'polarity_counts':dict(polarity_counts), 'level_counts':dict(level_counts),
                'unique_source_or_log_spans_checked':len(self.source_spans), 'raw_consistency':raw_summary,
                'human_confirmation':'Grouped self-report received via Huy and in return; not independently authenticated or blinded',
                'strict_human_source_first_attested':False, 'checks':dict(self.counts), 'security_scan':scanner.summary(),
                'ready_for_D20_technical_checkpoint':True, 'ground_truth_accepted':False, 'review_decision':None,
                'labels_or_raw_modified':False, 'received_code_executed':False, 'new_model_calls':0,
                'limitations':['R22 is source/downstream-log inference, not direct paired client DTO return capture',
                               '20 behavioral unresolved IDs retain explicit evidence requests; repair/confidence unresolved',
                               'Source-first chronology is disclosed as non-blinded; no human reading is certified by integrity checks',
                               'Scoped development checkpoint only, not external reviewer acceptance or scoring permission']}

    def raw_consistency(self, packet):
        result = []
        for repetition in [1, 2]:
            def observation(snapshot, name):
                folder = packet / f'paired/groups/{snapshot}-r{repetition}/observations'
                meta = self.load(folder / (name + '.json'))
                raw = self.read(folder / meta['body_file'])
                self.check(meta['error'] is None and meta['body_sha256'] == sha(raw) and meta['body_bytes'] == len(raw), 'runtime body binding: ' + name)
                return meta, json.loads(raw) if raw else None
            for kind in ['populated', 'no_visits', 'empty_pets']:
                base, a = observation('baseline', 'direct_' + kind)
                mut, b = observation('mutated', 'direct_' + kind)
                self.check(base['status'] == mut['status'] == 200 and base['method'] == mut['method'] == 'GET' and base['path'] == mut['path'] and 'pets' in a and 'animals' not in a and 'animals' in b and 'pets' not in b and {('animals' if k=='pets' else k):v for k,v in a.items()} == b, 'provider boundary rename only: ' + kind)
                bg, ba = observation('baseline', 'gateway_' + kind)
                mg, ma = observation('mutated', 'gateway_' + kind)
                self.check(bg['status'] == 200 and mg['status'] == 500 and bg['path'] == mg['path'] and ba is not None and ma['status'] == 500, 'gateway paired status change: ' + kind)
                log = self.read(packet / f'paired/groups/mutated-r{repetition}/logs/api-gateway.stdout.log').decode('utf-8')
                anchors = list(re.finditer(r'^.*AbstractErrorWebExceptionHandler : \[([^\]]+)\].*$', log, re.MULTILINE))
                matching = [(i, hit) for i, hit in enumerate(anchors) if hit[1] == ma['requestId']]
                self.check(len(matching) == 1, 'unique error request log anchor: ' + kind)
                index, hit = matching[0]
                block = log[hit.start():anchors[index+1].start() if index+1 < len(anchors) else len(log)]
                self.check(mg['path'] in hit[0] and '500 Server Error for HTTP GET' in hit[0] and
                           'OwnerDetails.getPetIds(OwnerDetails.java:36)' in block and 'ApiGatewayController.java:58' in block and
                           'NullPointerException' in block and 'this.pets' in block, 'error request source log correlation: ' + kind)
                result.append({'repetition':repetition,'case':kind,'direct_status':[200,200],'gateway_status':[200,500]})
            for name in ['create_control','owner_list_control','seed_owner_list','update_control','visits_control']:
                a, ab = observation('baseline',name); b, bb = observation('mutated',name)
                self.check(a['status'] == b['status'] and a['method'] == b['method'] and a['path'] == b['path'] and
                           a['request_headers'] == b['request_headers'] and a['request_body_file'] == b['request_body_file'] and
                           a.get('request_body_sha256') == b.get('request_body_sha256') and ab == bb, 'paired control same request and full parsed body: ' + name)
            for name in ['create_readback','update_readback']:
                a, ab = observation('baseline',name); b, bb = observation('mutated',name)
                self.check(a['status'] == b['status'] == 200 and {('animals' if k=='pets' else k):v for k,v in ab.items()} == bb, 'persisted value readback with declared key mapping: ' + name)
            for snapshot in ['baseline','mutated']:
                a, ab = observation(snapshot,'missing_direct'); b, bb = observation(snapshot,'missing_gateway')
                self.check(a['status'] == b['status'] == 200 and ab is None and bb is None and a['body_bytes'] != b['body_bytes'], 'missing owner null versus empty body retained')
        return {'paired_owner_cases':result, 'controls_checked_per_repetition':5,
                'readbacks_checked_per_repetition':2, 'request_and_log_correlations':6,
                'direct_client_DTO_return_capture_verified':False,
                'scope':'Read saved raw records only, no new HTTP/application execution or label adjudication'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--intake', required=True)
    args = parser.parse_args()
    intake = (ROOT / args.intake).resolve()
    if intake.parent != ROOT / 'handoff-out/p03-annotation-return':
        raise ValueError('Expected an intake directory under handoff-out/p03-annotation-return')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    output = intake / ('audit-' + stamp)
    output.mkdir(exist_ok=False)
    audit = Audit(intake / RECEIVED)
    try:
        report = audit.run()
        report['audit_utc'] = datetime.now(timezone.utc).isoformat()
        report['audit_code_sha256'] = sha(Path(__file__).read_bytes())
        (output / 'P03_INDEPENDENT_AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'output':output.relative_to(ROOT).as_posix(),**{k:report[k] for k in ['ready_for_D20_technical_checkpoint','manifest_files','history_manifest_files','canonical_input_files','eligible_ids','polarity_counts','unique_source_or_log_spans_checked']},'checks':sum(audit.counts.values())},ensure_ascii=False))
    except Exception as error:
        (output / 'FAILURE.json').write_text(json.dumps({'error':str(error),'checks_completed':dict(audit.counts),'received_code_executed':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        raise


if __name__ == '__main__':
    main()
