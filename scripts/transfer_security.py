"""Fail-closed, stdlib-only inspection of a deliberately selected transfer.

This module never reads paths, decrypts credentials, extracts archives or writes
files. The caller supplies bytes and decides which failed files to omit. A scan
is a bounded pattern/structure check, not a proof that arbitrary data is public.
"""

from __future__ import annotations

import gzip
import io
import json
import re
import stat
import tarfile
import zipfile
import zlib
from collections import Counter


class SecurityError(ValueError):
    """Only a fixed category and a bounded path are included in diagnostics."""

    def __init__(self, category: str, path: str = "") -> None:
        self.category = category
        self.path = path
        shown = "".join(c if 32 <= ord(c) < 127 else "?" for c in path)[:1024]
        super().__init__(category + (": " + shown if shown else ""))


_RESERVED = {"con", "prn", "aux", "nul", "clock$", "conin$", "conout$"}
_RESERVED.update(f"{prefix}{n}" for prefix in ("com", "lpt") for n in range(1, 10))


def safe_member(name: str) -> bool:
    """Portable ASCII file/directory name, without a trailing directory slash."""
    if not isinstance(name, str) or not name or len(name) > 4096:
        return False
    if any(ord(c) < 32 or ord(c) >= 127 or c in '\\:<>"|?*' for c in name):
        return False
    parts = name.split("/")
    return all(
        p not in ("", ".", "..")
        and len(p) <= 255
        and p == p.strip()
        and not p.endswith(".")
        and p.split(".", 1)[0].casefold() not in _RESERVED
        for p in parts
    )


_PRIVATE_DIRS = {
    ".git", "credentials", "credential", ".ssh", ".aws", ".azure",
    ".gcloud", "gcloud", ".kube", ".docker", ".config", ".gnupg",
    ".codex", ".claude", ".cursor", ".vscode", ".idea", "keychains",
    "node_modules", ".venv", "venv", "env", ".m2", ".gradle",
    ".cache", ".npm", ".yarn", "__pycache__", ".pytest_cache",
    ".ruff_cache", ".mypy_cache", ".tox", ".nox", "model-cache",
    "browser-data", "user data", "google-chrome", "chromium", "firefox",
    "target", "dist", "build",
}
_PRIVATE_FILES = {
    ".env", ".envrc", ".netrc", "_netrc", ".npmrc", ".pypirc",
    ".git-credentials", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
    "authorized_keys", "known_hosts", ".bash_history", ".zsh_history",
    "consolehost_history.txt", "login data", "cookies", "web data",
    "local state", "settings-security.xml",
}
_PRIVATE_SUFFIXES = (".clixml", ".dpapi", ".pem", ".key", ".pfx", ".p12", ".kdbx")


def exclusion_reason(path: str, *, java_member: bool = False) -> str | None:
    """Name-based denylist; no access to the named path is attempted."""
    if not isinstance(path, str):
        return "unsafe_path"
    normalized = path.replace("\\", "/").strip("/").casefold()
    parts = normalized.split("/")
    # A Spring/Apache class package named env/target/build is not a user's
    # cache. Relax only those three segments INSIDE an inspected Java archive
    # and a normal Java namespace; all credential suffixes/content checks stay.
    java_namespace = java_member and parts[0] in {"org", "com", "net", "io", "antlr", "jakarta", "javax"}
    private_dirs = _PRIVATE_DIRS - {"env", "target", "build"} if java_namespace else _PRIVATE_DIRS
    if any(p in private_dirs for p in parts):
        return "private_or_disposable_directory"
    base = parts[-1] if parts else ""
    if base in _PRIVATE_FILES or base.startswith(".env."):
        return "private_configuration_or_credential"
    java_credentials_class = java_namespace and base in {"credentials.class", "credential.class"}
    if (base.startswith(("credentials.", "credential.")) and not java_credentials_class) or base.endswith(_PRIVATE_SUFFIXES):
        return "credential_material"
    if base == "settings.xml" and ".m2" in parts:
        return "private_maven_settings"
    if base == "provider-response.json":
        return "private_provider_envelope"
    return None


_TOKENS = re.compile(
    r"AIza[0-9A-Za-z_-]{30,}|\bsk-(?:proj-)?[0-9A-Za-z_-]{25,}|"
    r"\bgh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,}|"
    r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bxox[baprs]-[0-9A-Za-z-]{20,}"
)
_PRIVATE_KEY = re.compile(
    r"(?:^|[\r\n])\s*-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----"
)
_SECRET_KEYS = {
    "apikey", "geminiapikey", "googleapikey", "openaiapikey", "accesskeyid",
    "secretaccesskey", "accesstoken", "refreshtoken", "idtoken", "authtoken",
    "authorization", "proxyauthorization", "xgoogapikey", "privatekey",
    "clientsecret", "password", "passwd", "neo4jauth", "cookie", "setcookie",
    "thoughtsignature", "sessiontoken", "sessionsecret",
}
_HEADER_AUTH = re.compile(
    r"(?im)\b(?:Authorization|Proxy-Authorization)[\"']?\s*[:=]\s*[\"']?"
    r"(?:Bearer|Basic)\s+([A-Za-z0-9._~+/=-]{8,})"
)
_COOKIE_HEADER = re.compile(r"(?im)^\s*(?:Set-Cookie|Cookie):\s*([^\r\n]+)")
_URL_AUTH = re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^\s/:@\"']+:([^\s/@\"']+)@")
_INLINE_AUTH = re.compile(r"\bNEO4J_AUTH=([^\s\"'`,\]}]+)")
_PASSWORD_FLAG = re.compile(r"(?:^|\s)--(?:password|api-key|access-token)(?:=|\s+)[\"']?([^\s\"']+)")
_YAML_SECRET = re.compile(
    r"(?im)^\s*(?:[a-z0-9_.-]*[._-])?(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)"
    r"\s*[:=]\s*([^\r\n#]+)"
)


def _placeholder(value: str) -> bool:
    value = value.strip().strip("\"'").strip()
    folded = value.casefold()
    if not value or folded in {
        "null", "none", "false", "true", "redacted", "[redacted]", "<redacted>",
        "password", "changeme", "neo4j", "petclinic", "root", "admin", "guest",
        "test", "example", "dummy", "invalid", "wrong", "not-configured",
    }:
        return True
    if re.fullmatch(r"\*+|x{3,}|<[^<>]+>|\$\{[^{}]+\}", value, flags=re.IGNORECASE):
        return True
    return folded.startswith(("synthetic-", "synthetic_", "fake-", "fake_", "test-", "test_", "example-", "dummy-", "not-a-real-"))


def _populated_secret(value: str, key: str) -> bool:
    if _placeholder(value):
        return False
    if key in {"authorization", "proxyauthorization"}:
        prefix, _, body = value.partition(" ")
        return not _placeholder(body if prefix.casefold() in {"bearer", "basic"} else value)
    if key == "neo4jauth":
        return not _placeholder(value.partition("/")[2] if "/" in value else value)
    return True


class Scanner:
    """Bounded recursive inspector; input data is never mutated or persisted."""

    def __init__(self, *, max_depth: int = 6, max_member_bytes: int = 512 * 1024 * 1024,
                 max_expanded_bytes: int = 2 * 1024 * 1024 * 1024,
                 max_entries: int = 100_000, max_ratio: int = 2000) -> None:
        if min(max_depth, max_member_bytes, max_expanded_bytes, max_entries, max_ratio) <= 0:
            raise ValueError("Scanner budgets must be positive")
        self.max_depth = max_depth
        self.max_member_bytes = max_member_bytes
        self.max_expanded_bytes = max_expanded_bytes
        self.max_entries = max_entries
        self.max_ratio = max_ratio
        self._counts = Counter()
        self._failures = Counter()

    def _fail(self, category: str, name: str) -> None:
        self._failures[category] += 1
        raise SecurityError(category, name)

    def _charge(self, size: int, name: str) -> None:
        if size < 0 or size > self.max_member_bytes:
            self._fail("member_size_budget", name)
        if self._counts["expanded_bytes"] + size > self.max_expanded_bytes:
            self._fail("expanded_size_budget", name)
        self._counts["expanded_bytes"] += size

    def scan(self, name: str, data: bytes) -> None:
        if not safe_member(name):
            self._fail("unsafe_path", name)
        if not isinstance(data, bytes):
            raise TypeError("Scanner accepts immutable bytes")
        self._counts["top_level_files"] += 1
        self._scan(name, data, 0)

    def summary(self) -> dict:
        return {
            "schema": "transfer-security-scan/1", "scope": "selected_bytes_and_recursive_supported_archives",
            "top_level_files": self._counts["top_level_files"],
            "inspected_members": self._counts["members"], "expanded_bytes": self._counts["expanded_bytes"],
            "archives": self._counts["archives"], "text_files": self._counts["text_files"],
            "failures": dict(sorted(self._failures.items())),
            "budgets": {"max_depth": self.max_depth, "max_member_bytes": self.max_member_bytes,
                        "max_expanded_bytes": self.max_expanded_bytes, "max_entries": self.max_entries,
                        "max_compression_ratio": self.max_ratio},
            "limitations": "Pattern checks cannot prove absence of arbitrary private data. No credential decryption, extraction or execution.",
        }

    def _scan(self, name: str, data: bytes, depth: int, *, java_member: bool = False) -> None:
        if depth > self.max_depth:
            self._fail("archive_depth_budget", name)
        reason = exclusion_reason(name.split("!")[-1], java_member=java_member)
        if reason:
            self._fail(reason, name)
        self._charge(len(data), name)
        self._counts["members"] += 1
        if self._counts["members"] > self.max_entries:
            self._fail("entry_count_budget", name)
        lower = name.casefold()
        zip_magic = data.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"))
        gzip_magic = data.startswith(b"\x1f\x8b")
        tar_magic = len(data) >= 512 and data[257:262] == b"ustar"
        expected_zip = lower.endswith((".zip", ".jar", ".war", ".ear"))
        expected_gzip = lower.endswith((".gz", ".tgz"))
        expected_tar = lower.endswith(".tar")
        if (expected_zip and not zip_magic) or (expected_gzip and not gzip_magic):
            self._fail("archive_format_mismatch", name)
        if expected_tar and (zip_magic or gzip_magic):
            self._fail("archive_format_mismatch", name)
        if zip_magic:
            self._zip(name, data, depth)
        elif gzip_magic:
            self._gzip(name, data, depth)
        elif tar_magic or expected_tar:
            self._tar(name, data, depth)
        elif data.startswith((b"7z\xbc\xaf\x27\x1c", b"Rar!", b"BZh", b"\xfd7zXZ\x00")) or lower.endswith((".7z", ".rar", ".bz2", ".xz", ".zst")):
            self._fail("unsupported_archive", name)
        else:
            self._text(name, data)

    def _archive_names(self, entries: list[tuple[str, bool]], name: str, *, java_member: bool = False) -> None:
        seen = set()
        components: dict[str, str] = {}
        kinds: dict[str, bool] = {}
        for raw, is_dir in entries:
            member = raw[:-1] if is_dir and raw.endswith("/") else raw
            if not safe_member(member):
                self._fail("unsafe_archive_path", name)
            folded = member.casefold()
            if folded in seen:
                self._fail("duplicate_archive_path", name)
            seen.add(folded)
            for length in range(1, len(member.split("/")) + 1):
                prefix = "/".join(member.split("/")[:length])
                key = prefix.casefold()
                if key in components and components[key] != prefix:
                    self._fail("archive_path_case_collision", name)
                components[key] = prefix
                if length < len(member.split("/")) and kinds.get(key) is False:
                    self._fail("archive_file_directory_collision", name)
                if length < len(member.split("/")):
                    kinds[key] = True
            if folded in kinds and kinds[folded] != is_dir:
                self._fail("archive_file_directory_collision", name)
            kinds[folded] = is_dir
            reason = exclusion_reason(member, java_member=java_member)
            if reason:
                self._fail("archive_" + reason, name)

    def _read_member(self, stream, size: int, name: str) -> bytes:
        if size > self.max_member_bytes or self._counts["expanded_bytes"] + size > self.max_expanded_bytes:
            self._fail("archive_member_size_budget", name)
        data = stream.read(min(size + 1, self.max_member_bytes + 1))
        if len(data) != size:
            self._fail("archive_member_size_mismatch", name)
        return data

    def _zip(self, name: str, data: bytes, depth: int) -> None:
        self._counts["archives"] += 1
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if len(entries) + self._counts["members"] > self.max_entries:
                    self._fail("entry_count_budget", name)
                # ZipInfo.filename is silently normalized/truncated on some
                # hosts; the original spelling must pass before using it.
                java_archive = name.casefold().endswith((".jar", ".war", ".ear"))
                self._archive_names([(i.orig_filename, i.is_dir()) for i in entries], name, java_member=java_archive)
                if any(i.orig_filename != i.filename for i in entries):
                    self._fail("unsafe_archive_path", name)
                for item in entries:
                    if item.flag_bits & 1:
                        self._fail("encrypted_archive_member", name)
                    mode = (item.external_attr >> 16) & 0xFFFF
                    if stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR):
                        self._fail("archive_link_or_special_member", name)
                    if item.is_dir():
                        if item.file_size:
                            self._fail("archive_directory_payload", name)
                        continue
                    if item.file_size > 1024 * 1024 and item.file_size > max(item.compress_size, 1) * self.max_ratio:
                        self._fail("archive_compression_ratio_budget", name)
                    with archive.open(item) as stream:
                        content = self._read_member(stream, item.file_size, name)
                    self._scan(name + "!" + item.filename, content, depth + 1, java_member=java_archive)
        except SecurityError:
            raise
        except (OSError, ValueError, RuntimeError, EOFError, zipfile.BadZipFile, NotImplementedError, zlib.error, OverflowError):
            self._fail("malformed_or_unsupported_zip", name)

    def _tar(self, name: str, data: bytes, depth: int) -> None:
        self._counts["archives"] += 1
        try:
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as archive:
                entries = []
                for item in archive:
                    if len(entries) + self._counts["members"] >= self.max_entries:
                        self._fail("entry_count_budget", name)
                    entries.append(item)
                self._archive_names([(i.name, i.isdir()) for i in entries], name)
                for item in entries:
                    if (not item.isfile() and not item.isdir()) or item.issparse():
                        self._fail("archive_link_or_special_member", name)
                    if item.isdir():
                        if item.size:
                            self._fail("archive_directory_payload", name)
                        continue
                    stream = archive.extractfile(item)
                    if stream is None:
                        self._fail("missing_archive_member", name)
                    with stream:
                        content = self._read_member(stream, item.size, name)
                    self._scan(name + "!" + item.name, content, depth + 1)
        except SecurityError:
            raise
        except (OSError, ValueError, EOFError, tarfile.TarError):
            self._fail("malformed_or_unsupported_tar", name)

    def _gzip(self, name: str, data: bytes, depth: int) -> None:
        self._counts["archives"] += 1
        limit = min(self.max_member_bytes, self.max_expanded_bytes - self._counts["expanded_bytes"])
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                content = stream.read(limit + 1)
            if len(content) > limit:
                self._fail("gzip_expanded_size_budget", name)
            if len(content) > 1024 * 1024 and len(content) > max(len(data), 1) * self.max_ratio:
                self._fail("archive_compression_ratio_budget", name)
            member = name[:-4] + ".tar" if name.casefold().endswith(".tgz") else name[:-3] if name.casefold().endswith(".gz") else name + ".decoded"
            self._scan(member, content, depth + 1)
        except SecurityError:
            raise
        except (OSError, ValueError, EOFError, zlib.error, OverflowError):
            self._fail("malformed_gzip", name)

    def _text(self, name: str, data: bytes) -> None:
        texts = []
        for encoding in ("utf-8-sig", "utf-16-le", "utf-16-be"):
            if encoding != "utf-8-sig" and not (b"\x00" in data or data.startswith((b"\xff\xfe", b"\xfe\xff"))):
                continue
            try:
                text = data.decode(encoding)
            except UnicodeError:
                continue
            texts.append(text.lstrip("\ufeff"))
        # Inspect ASCII-bearing runs even in arbitrary nonarchive binary data.
        texts.extend(m.decode("ascii") for m in re.findall(rb"[\x20-\x7e]{12,}", data))
        self._counts["text_files"] += int(bool(texts))
        for text in texts:
            if _TOKENS.search(text):
                self._fail("secret_token_pattern", name)
            if _PRIVATE_KEY.search(text):
                self._fail("private_key_material", name)
            for match in _HEADER_AUTH.finditer(text):
                if not _placeholder(match[1]):
                    self._fail("authorization_value", name)
            for match in _COOKIE_HEADER.finditer(text):
                if not _placeholder(match[1]):
                    self._fail("session_cookie_header", name)
            for match in _URL_AUTH.finditer(text) if "://" in text and "@" in text else ():
                if not _placeholder(match[1]):
                    self._fail("url_userinfo_credential", name)
            for match in _INLINE_AUTH.finditer(text):
                if _populated_secret(match[1], "neo4jauth"):
                    self._fail("inline_neo4j_credential", name)
            for match in _PASSWORD_FLAG.finditer(text):
                if not _placeholder(match[1]):
                    self._fail("credential_command_argument", name)
            if name.casefold().endswith((".yml", ".yaml", ".properties", ".env", ".txt", ".log")):
                for match in _YAML_SECRET.finditer(text):
                    if not _placeholder(match[1]):
                        self._fail("plaintext_configuration_credential", name)
            stripped = text.lstrip()
            if stripped.startswith(("{", "[")):
                try:
                    parsed = json.loads(stripped)
                except (ValueError, RecursionError):
                    continue
                self._json(name, parsed)

    def _json(self, name: str, value, depth: int = 0) -> None:
        if depth > 100:
            self._fail("json_depth_budget", name)
        if isinstance(value, dict):
            for key, item in value.items():
                normalized = re.sub(r"[^a-z0-9]", "", key.casefold())
                values = [item] if isinstance(item, str) else item if isinstance(item, list) else []
                if normalized in _SECRET_KEYS and any(isinstance(v, str) and _populated_secret(v, normalized) for v in values):
                    self._fail("populated_sensitive_json_field", name)
                self._json(name, item, depth + 1)
        elif isinstance(value, list):
            for item in value:
                self._json(name, item, depth + 1)
