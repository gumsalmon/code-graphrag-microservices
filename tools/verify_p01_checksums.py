"""Check P01 evidence bytes on disk or directly in a Git revision."""
import argparse
import hashlib
from pathlib import Path, PurePosixPath
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "evidence/p01-e2e/"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--git-ref", help="Validate stored Git blobs, e.g. HEAD (not checkout conversions)")
    args = parser.parse_args()
    if args.git_ref:
        paths = subprocess.check_output(
            ["git", "ls-tree", "-r", "--name-only", args.git_ref, "--", PREFIX], cwd=ROOT,
            text=True).splitlines()
        def read(path):
            return subprocess.check_output(["git", "show", f"{args.git_ref}:{path}"], cwd=ROOT)
    else:
        paths = [p.relative_to(ROOT).as_posix() for p in (ROOT / PREFIX).rglob("*") if p.is_file()]
        def read(path):
            return (ROOT / path).read_bytes()
    manifests = [p for p in paths if p.endswith("/checksums.sha256")]
    failures, count = [], 0
    for manifest in manifests:
        for line in read(manifest).decode("utf-8").splitlines():
            expected, name = line.split("  ", 1)
            if PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts:
                raise ValueError(f"Unsafe checksum entry: {name}")
            path = str(PurePosixPath(manifest).parent / name)
            count += 1
            try:
                if hashlib.sha256(read(path)).hexdigest() != expected:
                    failures.append(path)
            except (OSError, subprocess.CalledProcessError):
                failures.append(path)
    if not manifests:
        raise ValueError("No checksum manifests found")
    print(f"{len(manifests)} manifests, {count} entries, {len(failures)} failures ({args.git_ref or 'working tree'})")
    for path in failures:
        print(f"FAIL {path}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
