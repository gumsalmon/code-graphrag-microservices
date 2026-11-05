"""Create scoped, secret-checked relocation snapshots; never modify input files.

Uses only the Python standard library and transfer_security from this directory.
Archives are data, never executed. Generated ZIPs contain no Git internals.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import uuid
from datetime import datetime, timezone
import zipfile

from transfer_security import Scanner, SecurityError, exclusion_reason, safe_member

SCHEMA = "code-graphrag-project-transfer/1"
PHAT_PIN = "00aa4dcc3eb8cb9a4706572b325e481316cbcad4"
PHAT_ARCHIVE_SHA = "dbb174163034f9622394662a8e55092c380a63ffe4eb09889b422ab5aae00bcc"
HIEN_ARCHIVE_SHA = "dd9a8ff6f10098f4bca25d9c9a866ed6a8655975880922f90aa565e23ca6832c"
BUILD = "handoff-out/p02-build/20261015T101851660Z-95cea45d"
TEAM = "handoff-out/p02-team-handoff/20261015T111730650Z-5604cc22"
STEP1 = "handoff-out/p01-step1-20261012-02747b5d"
REVIEW = "handoff-out/p01-20261005-205206-5f9204d"
EXCLUDED_JAR_FINDINGS = {
    "api-gateway.jar": "private_key_material",
    "config-server.jar": "plaintext_configuration_credential",
    "customers-service.jar": "archive_link_or_special_member",
    "discovery-server.jar": "plaintext_configuration_credential",
    "visits-service.jar": "archive_link_or_special_member",
}
SMALL_TREES = (
    "p01-pipeline", "p01-retrieval", "p01-reasoning", "p01-comparison",
    "p01-contract", "p01-closeout", "p02-baseline", "p02-preparation",
    "p02-input-revision", "p02-input-revision-audit", "impact-output-validator",
    "experiment-telemetry", "impact-output-contract-draft", "experiment-design-draft",
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extended_path(path: Path) -> Path:
    # Do not change the host's registry. Python Win32 IO needs an explicit
    # namespace for deep Java paths when LongPathsEnabled is off.
    if os.name == "nt" and not str(path).startswith("\\\\?\\"):
        absolute = str(path.absolute())
        return Path("\\\\?\\UNC\\" + absolute[2:] if absolute.startswith("\\\\") else "\\\\?\\" + absolute)
    return path


def display_path(path: Path) -> str:
    value = str(path)
    if value.startswith("\\\\?\\UNC\\"):
        return "\\\\" + value[8:]
    return value[4:] if value.startswith("\\\\?\\") else value


def digest_file(path: Path) -> str:
    with extended_path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def safe_reference(name: str) -> bool:
    # Original historical manifests contain a private-use-colon .ses cache
    # filename. Allow that reference in an omission ledger, NOT as an exported
    # file. Actual exported files still require ASCII safe_member().
    ascii_form = "".join(c if ord(c) < 127 else "u" for c in name)
    return safe_member(ascii_form) and not any(ord(c) < 32 for c in name)


def parse_manifest(data: bytes) -> list[tuple[str, str]]:
    lines = data.decode("utf-8").splitlines()
    while lines and not lines[-1]:
        lines.pop()
    output, seen = [], set()
    for line in lines:
        match = re.fullmatch(r"([a-f0-9]{64})  (.+)", line)
        if not match or not safe_reference(match[2]) or match[2].casefold() in seen:
            raise ValueError("Unsafe/duplicate/malformed historical manifest")
        seen.add(match[2].casefold())
        output.append((match[2], match[1]))
    return output


def historical(name: str) -> bool:
    return name != "SHA256SUMS.txt" and (
        PurePosixPath(name).name.casefold() in {"sha256sums.txt", "archives.sha256"}
        or name.casefold().endswith("checksums.sha256"))


def new_scanner() -> Scanner:
    # Five Spring Boot jars recursively expand into many dependency jars.
    return Scanner(max_depth=9, max_expanded_bytes=8 * 1024**3, max_entries=250_000)


class Selection:
    def __init__(self, root: Path):
        self.root = root
        self.files: dict[str, Path | bytes] = {}
        self.omissions: dict[str, dict] = {}
        self.protected: dict[Path, str] = {}

    def omit(self, name: str, reason: str, sha256: str | None = None, **extra):
        if not safe_reference(name.rstrip("/")):
            raise ValueError("Unsafe omission path")
        item = {"path": name, "reason": reason, **extra}
        if sha256 is not None:
            item["sha256"] = sha256
        if name in self.omissions:
            old = self.omissions[name]
            if sha256 and old.get("sha256", sha256) != sha256:
                raise ValueError("Contradictory omission hashes: " + name)
            if sha256:
                old["sha256"] = sha256
            return
        self.omissions[name] = item

    def add(self, name: str, source: Path | bytes):
        if name.startswith(BUILD + "/artifacts/") and PurePosixPath(name).name in EXCLUDED_JAR_FINDINGS:
            sha = digest_file(source) if isinstance(source, Path) else digest(source)
            if isinstance(source, Path):
                self.protected[source] = sha
            self.omit(name, "compiled_baseline_JAR_omitted_after_recursive_preflight_security_finding", sha,
                preflight_category=EXCLUDED_JAR_FINDINGS[PurePosixPath(name).name],
                bytes=source.stat().st_size if isinstance(source, Path) else len(source),
                note="Finding can be embedded public library material; no claim of a leaked personal secret. Original not modified.")
            return
        if name == STEP1 + "/implementation/docker-compose.yml":
            sha = digest_file(source) if isinstance(source, Path) else digest(source)
            if isinstance(source, Path):
                self.protected[source] = sha
            self.omit(name, "legacy_compose_with_literal_auth_setting_not_needed_by_current_pipeline", sha)
            return
        if name.endswith(".ses") and safe_reference(name):
            sha = digest_file(source) if isinstance(source, Path) else digest(source)
            self.omit(name, "transient_database_session_file_not_transferred", sha)
            return
        if not safe_member(name):
            raise ValueError("Unsafe selected name: " + name)
        if name.casefold() in {n.casefold() for n in self.files}:
            raise ValueError("Duplicate selected name: " + name)
        reason = exclusion_reason(name)
        if reason:
            # Private credential files are not opened even to hash them.
            sha = digest_file(source) if isinstance(source, Path) and reason == "private_provider_envelope" else None
            self.omit(name, reason, sha)
            return
        if isinstance(source, Path):
            if source.is_symlink() or not source.is_file() or source.is_junction():
                raise ValueError("Nonregular source: " + name)
        self.files[name] = source

    def tree(self, relative: str, source: Path | None = None):
        source = self.root / relative if source is None else source
        if not source.is_dir() or source.is_symlink() or source.is_junction():
            raise ValueError("Missing/unsafe selected tree: " + relative)
        for folder, dirs, names in os.walk(source, followlinks=False):
            rel = Path(folder).relative_to(source).as_posix()
            prefix = relative + "/" + (rel + "/" if rel != "." else "")
            keep = []
            for part in sorted(dirs):
                name = prefix + part
                path = Path(folder) / part
                if path.is_symlink() or path.is_junction():
                    raise ValueError("Linked selected tree: " + name)
                reason = exclusion_reason(name) or ("recreatable_embedding_database_not_transferred" if part == "chroma_db" else None)
                if reason:
                    self.omit(name + "/", reason)
                else:
                    keep.append(part)
            dirs[:] = keep
            for part in sorted(names):
                self.add(prefix + part, Path(folder) / part)


def select(root: Path) -> Selection:
    selected = Selection(root)
    for name in (".gitattributes", ".gitignore", "README.md", "PROJECT_CONTEXT.md",
                 "FULL_PROJECT_CONTEXT_2026-10-18.md"):
        selected.add(name, root / name)
    for name in ("benchmark", "demo", "docs", "pipeline", "prototypes", "reasoning", "scripts", "tasks"):
        selected.tree(name)
    for name in SMALL_TREES:
        selected.tree("handoff-out/" + name)
    for name in ("implementation", "source", "evidence", "evidence-bridge"):
        selected.tree(STEP1 + "/" + name)
    for path in sorted((root / STEP1).iterdir()):
        if path.is_file():
            selected.add(STEP1 + "/" + path.name, path)
    selected.omit(STEP1 + "/model-cache/", "public_ONNX_cache_not_transferred_prepare_separately")
    selected.tree(REVIEW + "/benchmark-snapshot")
    for path in sorted((root / REVIEW).iterdir()):
        if path.is_file():
            selected.add(REVIEW + "/" + path.name, path)
    # Successful build: include only original manifest-covered artifacts, not
    # another copy of target/ inside unpacked source.
    build_manifest = root / BUILD / "checksums.sha256"
    selected.add(BUILD + "/checksums.sha256", build_manifest)
    for name, expected in parse_manifest(build_manifest.read_bytes()):
        path = root / BUILD / name
        if digest_file(path) != expected:
            raise ValueError("Source build checksum mismatch: " + name)
        selected.add(BUILD + "/" + name, path)
    selected.omit(BUILD + "/source/", "unpacked_duplicate_of_manifested_source_tar_and_JARs")
    selected.omit(BUILD + "/config/", "unpacked_duplicate_of_manifested_config_tar")
    # Preserve the earlier failed attempt, without unpacked source duplicates.
    failed = "handoff-out/p02-build/20261015T101757545Z-23c105ca"
    for path in sorted((root / failed).iterdir()):
        if path.is_file():
            selected.add(failed + "/" + path.name, path)
    for role in ("P02_HIEN", "P02_PHAT"):
        selected.tree(TEAM + "/" + role)
    for path in sorted((root / TEAM).iterdir()):
        if path.is_file():
            selected.add(TEAM + "/" + path.name, path)
    for run in ("20261015t114507111z-6c0a362c", "verification-20261015t114507111z-6c0a362c",
                "20261015t114035811z-e3fba840"):
        selected.tree("handoff-out/p02-paired-dry-run/" + run)
    for run in ("phat-p01-independent-input-20260923-122838", "phat-p01-independent-input-20260923-123108"):
        selected.tree("handoff-out/" + run)
    externals = {
        "external/hien/RETURN_HIEN.md": Path("E:/Bài báo NCKH/RETURN_HIEN.md"),
        "external/hien/P02_HIEN_RETURN_20261015T123448Z.zip": Path("E:/Bài báo NCKH/P02_HIEN_RETURN_20261015T123448Z.zip"),
        "external/history/CONTEXT_2026-09-25_TO_2026-09-26.md": Path("C:/Users/GumSalmon/Documents/Codex/2026-09-19/ng-d-ng-graphrag-trong-ph/CONTEXT_2026-09-25_TO_2026-09-26.md"),
    }
    for name, source in externals.items():
        if source.suffix == ".zip" and digest_file(source) != HIEN_ARCHIVE_SHA:
            raise ValueError("Hiển return ZIP does not match supplied hash")
        selected.add(name, source)
    selected.tree("external/history/p01-runtime", Path("E:/NCKH/petclinic-pilot/spring-petclinic-microservices/evidence_p01_runtime"))
    archive_path = root / ("handoff-out/project-transfer-inputs/phat-review-00aa4dcc/"
                           "code-graphrag-microservices-" + PHAT_PIN + ".zip")
    if digest_file(archive_path) != PHAT_ARCHIVE_SHA:
        raise ValueError("Phát review download hash changed")
    prefix = "code-graphrag-microservices-" + PHAT_PIN + "/phat-p02-review/"
    count = 0
    with zipfile.ZipFile(archive_path) as archive:
        for item in archive.infolist():
            if not item.orig_filename.startswith(prefix) or item.is_dir():
                continue
            if item.orig_filename != item.filename or item.flag_bits & 1 or stat.S_IFMT(item.external_attr >> 16) not in (0, stat.S_IFREG):
                raise ValueError("Unsafe Phát review member")
            name = "external/phat-review-" + PHAT_PIN[:8] + "/phat-p02-review/" + item.filename[len(prefix):]
            selected.add(name, archive.read(item))
            count += 1
    if count != 72:
        raise ValueError("Unexpected Phát review file count")
    for path, reason in {
        ".git/": "Git_objects_hooks_and_credentials_not_transferred",
        "handoff-out/credentials/": "private_credentials_never_opened_or_decrypted",
        "handoff-out/p01-deps/": "not_present_on_source_machine_prepare_pinned_clean_clones_separately",
    }.items():
        selected.omit(path, reason)
    # Log scope exclusions at directory level without inspecting credentials
    # or disposable cache contents. This is not a whole-disk backup.
    for directory in sorted((root / "handoff-out").iterdir()):
        if not directory.is_dir():
            continue
        prefix = "handoff-out/" + directory.name + "/"
        if prefix not in selected.omissions and not any(name.startswith(prefix) for name in selected.files):
            selected.omit(prefix, "outside_canonical_transfer_scope_duplicate_QA_or_intermediate_output")
    return selected


def git(root: Path, *args: str) -> str:
    return subprocess.check_output(["git", "-c", "safe.directory=" + root.as_posix(),
        "-c", "core.fsmonitor=false", "--no-optional-locks", *args], cwd=root, text=True, encoding="utf-8").strip()


def scan_selected(selected: Selection) -> tuple[dict[str, dict], dict]:
    scanner = new_scanner()
    inventory, failures = {}, []
    for index, (name, source) in enumerate(sorted(selected.files.items()), 1):
        content = source.read_bytes() if isinstance(source, Path) else source
        try:
            scanner.scan(name, content)
        except SecurityError as error:
            failures.append({"path": name, "category": error.category})
            continue
        inventory[name] = {"path": name, "sha256": digest(content), "bytes": len(content)}
        if index % 250 == 0:
            print(json.dumps({"phase": "scan", "selected_files": index}, ensure_ascii=True), flush=True)
    if failures:
        # Fail closed. Only names/categories, never matching values.
        print(json.dumps({"security_findings": failures}, indent=2), flush=True)
        raise ValueError("Selected bytes require explicit security review; no ZIP created")
    return inventory, scanner.summary()


def historical_base(name: str) -> str | None:
    overrides = {
        REVIEW + "/benchmark-snapshot/benchmark/p01/checksums.sha256": REVIEW + "/benchmark-snapshot",
        REVIEW + "/benchmark-snapshot/benchmark/p01/raw/input_checksums.sha256": "handoff-out/phat-p01-independent-input-20260923-123108",
        "external/phat-review-00aa4dcc/phat-p02-review/inputs/SHA256SUMS.txt": TEAM + "/P02_PHAT",
        "handoff-out/experiment-telemetry/20261016-verification-3f05513d/SHA256SUMS.txt": ".",
        "handoff-out/impact-output-validator/20261016-verification-7677170c/SHA256SUMS.txt": ".",
    }
    for role in ("P02_HIEN", "P02_PHAT"):
        overrides[TEAM + "/" + role + "/provenance/build-original-checksums.sha256"] = BUILD
        overrides[TEAM + "/" + role + "/provenance/baseline-original-checksums.sha256"] = "handoff-out/p02-baseline/20261015T102355058Z-2e775d19"
    return overrides.get(name)


def history_ledger(files: dict[str, dict], read_bytes, omissions: dict[str, dict]) -> list[dict]:
    result = []
    for name in sorted(n for n in files if historical(n)):
        verified = omitted = 0
        override = historical_base(name)
        parent = PurePosixPath(override) if override is not None else PurePosixPath(name).parent
        for member, expected in parse_manifest(read_bytes(name)):
            target = (parent / member).as_posix()
            if target in files:
                if files[target]["sha256"] != expected:
                    raise ValueError("Historical checksum mismatch: " + target)
                verified += 1
                continue
            omission = next((v for k, v in omissions.items() if k == target or k.endswith("/") and target.startswith(k)), None)
            copied_reference = "/provenance/" in name and "original-checksums.sha256" in name
            if omission is None:
                if copied_reference:
                    reason = "copied_original_manifest_retains_original_base_not_current_provenance_directory"
                else:
                    reason = "historical_reference_outside_selected_transfer_scope_not_verified"
                omission = {"path": target, "reason": reason}
                omissions[target] = omission
                if not copied_reference:
                    omission.update(sha256=expected, referenced_by=name)
            if copied_reference and omission["reason"].startswith("copied_original_manifest"):
                # Two copied manifests can refer to different original files
                # with the same basename (e.g. build vs runtime cleanup.json).
                # Keep each origin/hash, never pretend both are one file.
                refs = omission.setdefault("original_references", [])
                reference = {"manifest": name, "sha256": expected}
                if reference not in refs:
                    refs.append(reference)
            elif omission.get("sha256", expected) != expected:
                raise ValueError("Omission expected hash contradicts original: " + target)
            omitted += 1
        item = {"path": name, "verified": verified, "omitted": omitted}
        if override is not None:
            item.update(base_directory=override, resolution_note="Original manifest is repository-root-relative or a preserved copy. Resolve at supplied original snapshot; no raw bytes rewritten.")
        result.append(item)
    return result


def write_new(root: Path, name: str, data: bytes):
    if not safe_member(name):
        raise ValueError("Unsafe generated output name")
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        stream.write(data)


def make_profile(base: Path, profile: str, selected: Selection, inventory: dict,
                 source_state: dict, scan_report: dict) -> dict:
    root = extended_path(base / profile)
    root.mkdir()
    files = dict(inventory)
    omissions = {key: dict(value) for key, value in selected.omissions.items()}
    for name in sorted(files):
        source = selected.files[name]
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(source, Path):
            shutil.copyfile(source, target)
        else:
            write_new(root, name, source)
        if digest_file(target) != files[name]["sha256"]:
            raise ValueError("Copy hash mismatch: " + name)
    def add(name, data):
        write_new(root, name, data)
        files[name] = {"path": name, "sha256": digest(data), "bytes": len(data)}
    add("START_HERE_NEW_MACHINE.md", (root / "tasks/project-transfer/START_HERE.md").read_bytes())
    add("AI_START_PROMPT.txt", (root / "tasks/project-transfer/AI_START_PROMPT.txt").read_bytes())
    add("VERIFY_TRANSFER.mjs", (root / "scripts/verify_project_transfer.mjs").read_bytes())
    add("META/source-state.json", json_bytes(source_state))
    add("META/security-scan.json", json_bytes(scan_report))
    add("META/path-map.json", json_bytes({"schema": "transfer-path-map/1", "note":
        "Informational relocation map only; original provenance bytes remain unchanged. Some original checkers are not portable.",
        "mappings": [{"old_prefix": selected.root.as_posix(), "new_prefix": "."},
            {"old_prefix": "E:/Bài báo NCKH/RETURN_HIEN.md", "new_prefix": "external/hien/RETURN_HIEN.md"},
            {"old_prefix": "E:/Bài báo NCKH/P02_HIEN_RETURN_20261015T123448Z.zip", "new_prefix": "external/hien/P02_HIEN_RETURN_20261015T123448Z.zip"},
            {"old_prefix": "E:/NCKH/petclinic-pilot/spring-petclinic-microservices/evidence_p01_runtime", "new_prefix": "external/history/p01-runtime"}],
        "pinned_external_review": {"commit": PHAT_PIN, "archive_sha256": PHAT_ARCHIVE_SHA,
            "selected_folder": "external/phat-review-00aa4dcc/phat-p02-review", "files": 72}}))
    histories = history_ledger(files, lambda n: (root / n).read_bytes(), omissions)
    metadata = {"schema": SCHEMA, "profile": profile, "status": "snapshot_not_research_approval",
        "created_utc": datetime.now(timezone.utc).isoformat(), "source_head": source_state["head"],
        "source_branch": source_state["branch"], "git_directory_included": False,
        "api_credentials_included": False, "research_approval": False, "official_scoring_authorized": False,
        "files": [files[n] for n in sorted(files)], "omissions": [omissions[n] for n in sorted(omissions)],
        "historical_manifests": histories, "selection_policy": "allowlisted_current_code_and_canonical_evidence_not_entire_disk",
        "full_context_document": "FULL_PROJECT_CONTEXT_2026-10-18.md",
        "not_included": ["Git history", "provider credentials", "ONNX model cache", "Docker images and volumes",
                         "Maven dependency cache/distribution", "disposable duplicate QA checkouts", "five compiled P02 JARs with preflight findings"],
        "limitations": ["Snapshot includes dirty/untracked source, not represented by source_head alone",
            "Coordinator packet includes draft labels/predictions; unsuitable for source-first reviewer",
            "Original absolute provenance paths are not rewritten; use portable verification only",
            "A complete runtime environment and transitive dependency lock are not supplied"]}
    meta_bytes = json_bytes(metadata)
    write_new(root, "META/transfer.json", meta_bytes)
    files["META/transfer.json"] = {"path": "META/transfer.json", "sha256": digest(meta_bytes), "bytes": len(meta_bytes)}
    manifest = "".join(files[n]["sha256"] + "  " + n + "\n" for n in sorted(files)).encode("utf-8")
    write_new(root, "SHA256SUMS.txt", manifest)
    # Check ALL generated metadata and aliases too. Source bytes were already
    # recursively scanned once; do not mistake a scan for review approval.
    generated_scanner = new_scanner()
    for name in sorted(set(files) - set(inventory)):
        generated_scanner.scan(name, (root / name).read_bytes())
    generated_scanner.scan("SHA256SUMS.txt", manifest)
    print(json.dumps({"phase": "profile_prepared", "profile": profile, "files": len(files) + 1,
        "historical_manifests": len(histories), "historical_missing": sum(h["omitted"] for h in histories)}), flush=True)
    return {"profile": profile, "root": display_path(root), "files": len(files) + 1,
        "bytes": sum(i["bytes"] for i in files.values()) + len(manifest),
        "manifest_sha256": digest(manifest)}


def create_zip(profile: dict, base: Path) -> dict:
    root = extended_path(Path(profile["root"]))
    archive = base / ("PROJECT_TRANSFER_2026-10-18_" + profile["profile"] + ".zip")
    with zipfile.ZipFile(archive, mode="x", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as output:
        for path in sorted(root.rglob("*")):
            if path.is_file():
                # Fixed timestamp; archive metadata cannot disclose OS owner.
                item = zipfile.ZipInfo(path.relative_to(root).as_posix(), (2026, 10, 18, 0, 0, 0))
                item.compress_type = zipfile.ZIP_DEFLATED
                item.external_attr = (stat.S_IFREG | 0o644) << 16
                with path.open("rb") as source, output.open(item, "w", force_zip64=True) as target:
                    shutil.copyfileobj(source, target, length=1024 * 1024)
    sha = digest_file(archive)
    write_new(base, archive.name + ".sha256", (sha + "  " + archive.name + "\n").encode("ascii"))
    # Relocate via actual archive bytes; never extractall an untrusted archive.
    extracted = extended_path(base / ("relocated-" + profile["profile"]))
    extracted.mkdir()
    seen = set()
    with zipfile.ZipFile(archive) as source:
        for item in source.infolist():
            if not safe_member(item.orig_filename) or item.orig_filename != item.filename or item.filename.casefold() in seen:
                raise ValueError("Unsafe generated ZIP")
            seen.add(item.filename.casefold())
            if item.flag_bits & 1 or stat.S_IFMT(item.external_attr >> 16) != stat.S_IFREG:
                raise ValueError("Special/encrypted generated ZIP")
            with source.open(item) as stream:
                write_new(extracted, item.filename, stream.read())
    return {**profile, "zip": str(archive), "zip_bytes": archive.stat().st_size,
        "zip_sha256": sha, "relocated_root": display_path(extracted)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--scan-only", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    selected = select(root)
    state = {"head": git(root, "rev-parse", "HEAD"), "branch": git(root, "branch", "--show-current"),
        "status_porcelain_v1": git(root, "status", "--porcelain=v1", "--untracked-files=all").splitlines(),
        "name_status_vs_head": git(root, "diff", "--name-status", "HEAD").splitlines(),
        "index_diff_name_status": git(root, "diff", "--cached", "--name-status").splitlines()}
    inventory, report = scan_selected(selected)
    if args.scan_only:
        print(json.dumps({"files": len(inventory), "bytes": sum(i["bytes"] for i in inventory.values()), "scan": report}, indent=2))
        return
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    base = root / "handoff-out/project-transfer" / stamp
    base.mkdir(parents=True, exist_ok=False)
    results = []
    for profile in ("full",):
        prepared = make_profile(base, profile, selected, inventory, state, report)
        results.append(create_zip(prepared, base))
    # Re-read selected original files; detect external concurrent edits. Never
    # roll back someone else's changes or rebuild existing frozen evidence.
    for name, source in selected.files.items():
        if isinstance(source, Path) and digest_file(source) != inventory[name]["sha256"]:
            raise ValueError("Source changed while packaging: " + name)
    for source, expected in selected.protected.items():
        if digest_file(source) != expected:
            raise ValueError("Omitted original changed while packaging")
    if git(root, "rev-parse", "HEAD") != state["head"] or git(root, "diff", "--cached", "--name-status").splitlines() != state["index_diff_name_status"]:
        raise ValueError("Source Git HEAD/index changed while packaging")
    summary = {"schema": "project-transfer-packaging/1", "source_original_bytes_unchanged": True,
        "head_and_index_unchanged": True, "security_scan": report,
        "profiles": results, "verification_pending": True,
        "note": "Run standalone verifier --smoke on each relocated_root. No research or runtime approval is conferred."}
    write_new(base, "PACKAGING_REPORT.json", json_bytes(summary))
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
