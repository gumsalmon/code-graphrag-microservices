"""Build a filtered annotation/evidence packet, not a coordinator or scoring dump."""
from __future__ import annotations
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import stat
import subprocess
import tarfile
from datetime import datetime, timezone
import uuid
import zipfile

from package_project_transfer import extended_path, parse_manifest, history_ledger, json_bytes, digest_file
from transfer_security import Scanner, safe_member, exclusion_reason

ROOT=Path(__file__).resolve().parent.parent
RUN="handoff-out/p02-f03/20261024t103954400z-989f2a57"
BUILD="handoff-out/p02-build/20261015T101851660Z-95cea45d"
CANDIDATE="handoff-out/p02-input-revision/20261018T065307839Z-719da955"
PROTOCOL="handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22/P02_PHAT/benchmark/protocol/benchmark_protocol_v0.2.md"
COORD="benchmark/p02/decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json"
LOCK="benchmark/p02/decisions/INPUT_LOCK_2026-10-24.json"


def sha(data):return hashlib.sha256(data).hexdigest()


def forbidden(name):
    # Source/tests may legitimately have application fixtures; forbid research
    # outputs by explicit selected scope, and additionally reject known outputs.
    parts=name.lower().split("/")
    return (exclusion_reason(name) or any(p in {"reasoning","demo","chroma_db","predictions"} for p in parts)
            or any(p in {"parser-output.json","comparison.json","body-comparison.json","labels.v3.json",
                          "project_context.md","full_project_context_2026-10-18.md"} for p in parts)
            or name.lower().endswith(".cypher"))


def main():
    # These checks only read original artifacts; no Docker/model or Git writes.
    for script,args in [("scripts/check_p02_f03.mjs",["--run",RUN]),("scripts/verify_p02_revision.mjs",["--root",CANDIDATE])]:
        result=subprocess.run(["node",script,*args],cwd=ROOT,capture_output=True,text=True,encoding="utf-8",check=True)
        json.loads(result.stdout)
    head=subprocess.check_output(["git","-c","safe.directory="+ROOT.as_posix(),"--no-optional-locks","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
    branch=subprocess.check_output(["git","-c","safe.directory="+ROOT.as_posix(),"--no-optional-locks","branch","--show-current"],cwd=ROOT,text=True).strip()
    files={};originals={};omissions={};source_map={}

    def add(name,data,origin=None):
        if not safe_member(name) or forbidden(name):raise ValueError("Forbidden/unsafe packet member: "+name)
        if name.casefold() in {n.casefold() for n in files}:raise ValueError("Duplicate packet member: "+name)
        files[name]=data
        if origin:source_map[name]=origin

    def copy(name,path):
        path=Path(path)
        if path.is_symlink() or not path.is_file():raise ValueError("Nonregular selected input")
        data=path.read_bytes();originals[path]=sha(data);add(name,data,str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else "explicit_external_input")

    def manifested(src,prefix,omit_jars=False):
        path=ROOT/src
        manifest=next((path/n for n in ("SHA256SUMS.txt","checksums.sha256") if (path/n).is_file()),None)
        if not manifest:raise ValueError("Selected directory lacks original manifest")
        manifest_dest=prefix+"/"+manifest.name
        if manifest_dest in files:
            if sha(files[manifest_dest])!=digest_file(manifest):raise ValueError("Child manifest differs from parent binding")
        else:copy(manifest_dest,manifest)
        for name,expected in parse_manifest(manifest.read_bytes()):
            source=path/name
            if digest_file(source)!=expected:raise ValueError("Original manifest mismatch: "+src+"/"+name)
            dest=prefix+"/"+name
            if dest in files:continue  # Parent manifest already supplied child manifest.
            if omit_jars and name.startswith("artifacts/") and name.endswith(".jar"):
                omissions[dest]={"path":dest,"sha256":expected,"bytes":source.stat().st_size,
                  "reason":"compiled_application_JAR_not_needed_for_annotation_packet_not_transferred"}
            else:copy(dest,source)

    manifested(RUN,"runtime")
    manifested(RUN+"/mutated-build","runtime/mutated-build",True)
    manifested(RUN+"/helpers","runtime/helpers")
    for group in ("baseline-r1","baseline-r2","mutated-r1","mutated-r2"):
        manifested(RUN+"/groups/"+group,"runtime/groups/"+group)
    manifested(BUILD,"baseline-build",True)
    manifested(CANDIDATE,"candidate")
    before=json.loads(files["runtime/mutated-build/source-before.json"])
    after=json.loads(files["runtime/mutated-build/source-after-patch.json"])

    def tar_files(data,prefix,expected=None):
        values={}
        with tarfile.open(fileobj=io.BytesIO(data),mode="r:") as archive:
            for member in archive:
                normalized=member.name.rstrip("/") if member.isdir() else member.name
                if not safe_member(normalized) or member.issym() or member.islnk():raise ValueError("Unsafe source TAR")
                if member.isdir():continue
                if not member.isfile():raise ValueError("Special source TAR member")
                if member.name.casefold() in {n.casefold() for n in values}:raise ValueError("Duplicate source TAR member")
                content=archive.extractfile(member).read()
                values[member.name]=sha(content);add(prefix+"/"+member.name,content,"Git-archive member: "+member.name)
        if expected is not None and values!=expected:raise ValueError("Source archive differs from actual build source identity")
        return values

    tar_files(files["baseline-build/source.tar"],"source/baseline",before)
    tar_files(files["baseline-build/config.tar"],"config")
    for name,expected in after.items():
        path=ROOT/RUN/"mutated-build/source"/name
        if digest_file(path)!=expected:raise ValueError("Actual mutated source differs")
        copy("source/mutated/"+name,path)
    copy("protocol/benchmark_protocol_v0.2.md",ROOT/PROTOCOL)
    for name,source in {
        "START_HERE.md":"tasks/p02-handoff/PHAT_F03_PACKET_START_HERE.md",
        "TASK_PHAT.md":"tasks/p02-handoff/PHAT_F03_TASK.md",
        "LIMITATIONS.md":"tasks/p02-handoff/PHAT_F03_LIMITATIONS.md",
        "coordination/PETCLINIC_PRE_REVIEW_PLAN_2026-10-24.md":"tasks/PETCLINIC_PRE_REVIEW_PLAN_2026-10-24.md",
        "decisions/INPUT_LOCK_2026-10-24.json":LOCK,
        "decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json":COORD,
        "VERIFY_PACKET.mjs":"scripts/verify_p02_phat_packet.mjs",
        "verify_project_transfer.mjs":"scripts/verify_project_transfer.mjs",
        "prior-review/RECHECK_TEMPLATE.md":"handoff-out/p02-f03-audit/20261024-phat-recheck/RECHECK_TEMPLATE.md",
        "prior-review/verifier-output.txt":"handoff-out/p02-f03-audit/20261024-phat-recheck/verifier-output.txt",
    }.items():copy(name,ROOT/source)
    universe=json.loads(files["candidate/draft/evaluation_universe.draft.v2.json"])
    add("templates/NOTES_BY_ENTITY.json",json_bytes({"schema":"p02-blank-evidence-notes-template/1","status":"blank_template_not_labels",
        "scenario_version":"0.1.1","universe_sha256":sha(files["candidate/draft/evaluation_universe.draft.v2.json"]),
        "person":None,"actual_time":None,"ai_assistance":None,"exposure":[],"rows":[{
            "level":item["level"],"entity_id":item["entity_id"],"source_contract_notes":None,
            "runtime_observations":[],"targeted_or_e2e":None,"evidence_sufficiency":None,
            "limitations_or_missing":None} for item in universe["eligible_entities"]]}))
    add("templates/SOURCE_FIRST_NOTES.md",("# Ghi chú độc lập P02\n\nNgười ghi:\nThời điểm thực tế:\nInput/ZIP/version/hash:\nExposure trước và trong lượt này:\nAI hỗ trợ phần nào:\n\n## Source / contract / fixture\n\n## Quan sát raw / targeted / E2E\n\n## Từng ID và phần chưa đủ\n\n## Yêu cầu bổ sung cụ thể\n\nLưu notes và hash trước khi lập nhãn. Không tự điền trạng thái accepted hoặc ký reviewer.\n").encode())
    add("templates/RETURN_PHAT.md",("# Bàn giao P02\n\nNgười thực hiện / ngày thực tế:\nInput ZIP SHA-256 / scenario / universe / fixture:\nPhần trực tiếp làm và AI hỗ trợ:\nNotes checkpoint và hash:\nEvidence đủ / thiếu theo ID:\nDraft labels/evidence manifest và hash (nếu đã lập):\nUnresolved và yêu cầu bổ sung:\nCommands / logs / exit code:\nGiới hạn / exposure:\n\nTrạng thái nhãn: pending_review, không tự duyệt. Reviewer/test/scoring chưa được mở.\n").encode())
    add("META/path-map.json",json_bytes({"schema":"p02-phat-evidence-path-map/1",
       "note":"Read-only mapping; original absolute provenance paths and frozen flags are not rewritten",
       "maps":{RUN:"runtime",BUILD:"baseline-build",CANDIDATE:"candidate"},
       "universe_evidence_refs_resolve_from":"candidate/","source_export_base":"source/baseline/",
       "mutated_source_export_base":"source/mutated/"}))
    scanner=Scanner(max_depth=9,max_expanded_bytes=512*1024*1024)
    for index,(name,data) in enumerate(sorted(files.items()),1):
        scanner.scan(name,data)
        if index%500==0:print(json.dumps({"phase":"security_scan","files":index}),flush=True)
    add("META/security-scan.json",json_bytes(scanner.summary()))
    inventory={n:{"path":n,"sha256":sha(data),"bytes":len(data)} for n,data in files.items()}
    histories=history_ledger(inventory,lambda n:files[n],omissions)
    # No implicit historical omissions in this scoped package: exactly six
    # application binaries omitted, all with verified original manifest hashes.
    if len(omissions)!=6 or any(not n.endswith(".jar") for n in omissions):raise ValueError("Unexpected historical omission")
    metadata={"schema":"code-graphrag-project-transfer/1","profile":"full","status":"snapshot_not_research_approval",
      "package_role":"phat_source_contract_runtime_evidence_and_draft_annotation",
      "source_head":head,"source_branch":branch,"git_directory_included":False,"api_credentials_included":False,
      "research_approval":False,"official_scoring_authorized":False,
      "files":[inventory[n] for n in sorted(inventory)],"omissions":[omissions[n] for n in sorted(omissions)],"historical_manifests":histories,
      "draft_annotation_authorization_record":"decisions/PETCLINIC_PRE_REVIEW_2026-10-24.json",
      "excluded_research_outputs":["draft gold labels","parser/Cypher/Neo4j/retrieval/predictions/model responses","scores","derived body comparison","coordinator conclusion report"],
      "source_map":source_map,"annotation_status":"not_created_by_packager","reviewer_decision":None,
      "limitations":["Pattern-based security scan cannot prove absence of arbitrary sensitive data","Existing design/census exposure is not blinded annotation",
        "JARs omitted explicitly; packet integrity is not a full runtime rerun or ground-truth acceptance"]}
    add("META/transfer.json",json_bytes(metadata))
    add("SHA256SUMS.txt","".join(sha(files[n])+"  "+n+"\n" for n in sorted(files)).encode())
    # Includes generated metadata/aliases, not only original copied evidence.
    final_scanner=Scanner(max_depth=9,max_expanded_bytes=512*1024*1024)
    for n,data in sorted(files.items()):final_scanner.scan(n,data)
    stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"-"+uuid.uuid4().hex[:8]
    out=ROOT/"handoff-out/p02-phat-f03"/stamp
    package=extended_path(out/"P02_PHAT_F03");package.mkdir(parents=True,exist_ok=False)
    for name,data in sorted(files.items()):
        path=package/name;path.parent.mkdir(parents=True,exist_ok=True)
        with path.open("xb") as f:f.write(data)
    archive=out/"P02_PHAT_F03_2026-10-24.zip"
    with zipfile.ZipFile(archive,"x",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,(2026,10,24,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(stat.S_IFREG|0o644)<<16
            z.writestr(info,data)
    archive_hash=digest_file(archive)
    with (out/(archive.name+".sha256")).open("x",encoding="ascii",newline="\n") as f:f.write(archive_hash+"  "+archive.name+"\n")
    relocated=extended_path(out/"ZIP_VERIFIED");relocated.mkdir()
    with zipfile.ZipFile(archive) as z:
        for item in z.infolist():
            if not safe_member(item.orig_filename) or item.orig_filename!=item.filename or item.flag_bits&1:raise ValueError("Unsafe generated ZIP")
            data=z.read(item);path=relocated/item.filename;path.parent.mkdir(parents=True,exist_ok=True)
            with path.open("xb") as f:f.write(data)
    result=subprocess.run(["node",str(out/"ZIP_VERIFIED/VERIFY_PACKET.mjs"),"--root",str(out/"ZIP_VERIFIED")],cwd=ROOT,capture_output=True,text=True,encoding="utf-8",check=True)
    verification=json.loads(result.stdout)
    for source,expected in originals.items():
        if digest_file(source)!=expected:raise ValueError("Original input changed while packaging")
    summary={"schema":"p02-phat-f03-packaging/1","zip":str(archive),"zip_bytes":archive.stat().st_size,"zip_sha256":archive_hash,
      "files":len(files),"verification":verification,"security_scan":final_scanner.summary(),"originals_unchanged":True,
      "evaluated_system_outputs_included":False,"draft_labels_created":False,"sent_to_phat":False}
    with (out/"PACKAGING_REPORT.json").open("x",encoding="utf-8",newline="\n") as f:json.dump(summary,f,ensure_ascii=False,indent=2);f.write("\n")
    print(json.dumps({"zip":str(archive),"zip_bytes":archive.stat().st_size,"sha256":archive_hash,"files":len(files),
      "historical_verified":verification["historical_files_verified"],"historical_omitted":verification["historical_missing_count"],"security_findings":final_scanner.summary()["failures"]},indent=2),flush=True)


if __name__=="__main__":main()
