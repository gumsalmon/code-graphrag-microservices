"""Distinguish committed implementation bytes from platform checkout bytes."""
import hashlib
from pathlib import Path
import subprocess


def snapshot(root: Path) -> dict:
    def git(*args):
        return subprocess.check_output(["git", "-C", str(root), *args])
    head = git("rev-parse", "HEAD").decode().strip()
    status = git("status", "--porcelain=v1", "--untracked-files=all").decode()
    files = git("ls-files", "--", "*.py", "requirements.txt", ".gitattributes").decode().splitlines()
    return {
        "head": head, "status_porcelain": status, "clean": not status,
        "status_command": ["git", "status", "--porcelain=v1", "--untracked-files=all"],
        "git_blob_sha256": {name: hashlib.sha256(git("show", f"{head}:{name}")).hexdigest() for name in files},
        "working_tree_sha256": {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in files},
    }


def require_clean(state: dict) -> None:
    if not state["clean"]:
        raise RuntimeError(f"Clean checkout required; Git status: {state['status_porcelain']}")


def require_unchanged(before: dict, after: dict) -> None:
    require_clean(after)
    if before["head"] != after["head"] or before["working_tree_sha256"] != after["working_tree_sha256"]:
        raise RuntimeError("Implementation or HEAD changed during verification")
