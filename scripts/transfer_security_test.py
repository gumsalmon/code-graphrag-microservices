"""Synthetic-only security tests. No paths, keys, services or network are read."""

import gzip
import io
import json
import stat
import tarfile
import unittest
import warnings
import zipfile

from transfer_security import Scanner, SecurityError, exclusion_reason, safe_member


def make_zip(entries):
    buffer = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, data in entries:
                archive.writestr(name, data)
    return buffer.getvalue()


def make_tar(entries):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w") as archive:
        for name, data in entries:
            item = tarfile.TarInfo(name)
            item.size = len(data)
            archive.addfile(item, io.BytesIO(data))
    return buffer.getvalue()


class SecurityTests(unittest.TestCase):
    def fails(self, category, name, data, scanner=None):
        with self.assertRaises(SecurityError) as caught:
            (scanner or Scanner()).scan(name, data)
        self.assertIn(category, str(caught.exception))
        return caught.exception

    def test_safe_portable_paths(self):
        for name in ("README.md", "input/app/.mvn/wrapper/maven-wrapper.jar", "a b/file.json"):
            self.assertTrue(safe_member(name), name)

    def test_unsafe_paths(self):
        for name in ("", "/root", "../x", "a/../x", "a//b", "./a", "C:/x", "a:b",
                     "a\\b", "a/", "a. ", "a.", "a/CON.txt", "COM1", "Lpt9.json", "a\x00b", "Tiếng.md"):
            self.assertFalse(safe_member(name), repr(name))

    def test_sensitive_directories_and_files_excluded(self):
        for name in ("a/.git/config", "handoff-out/credentials/key.clixml", ".env.local", ".ssh/config",
                     ".m2/settings.xml", "keys/private.pem", "a/key.dpapi", ".aws/config", "node_modules/a.js"):
            self.assertIsNotNone(exclusion_reason(name), name)

    def test_public_project_configuration_allowed(self):
        for name in ("pipeline/p02/maven-settings.xml", "input/config/application.yml", "scripts/configure_gemini_key.ps1",
                     "reasoning/p01/gemini-key.mjs", "fixture.json", "settings.xml"):
            self.assertIsNone(exclusion_reason(name), name)

    def test_provider_envelopes_are_omitted(self):
        self.assertEqual(exclusion_reason("run/provider-response.json"), "private_provider_envelope")
        self.fails("private_provider_envelope", "run/provider-response.json", b"{}")

    def test_plain_file_and_summary(self):
        scanner = Scanner()
        scanner.scan("README.md", b"No credential values. GEMINI_API_KEY is a variable name.")
        result = scanner.summary()
        self.assertEqual(result["top_level_files"], 1)
        self.assertEqual(result["failures"], {})

    def test_token_never_appears_in_exception(self):
        secret = "AIza" + "Q" * 35
        error = self.fails("secret_token_pattern", "log.txt", secret.encode())
        self.assertNotIn(secret, str(error))
        self.assertNotIn("Q" * 20, repr(error))

    def test_utf16_little_endian_secret(self):
        self.fails("secret_token_pattern", "raw.bin", ("AIza" + "R" * 35).encode("utf-16-le"))

    def test_utf16_big_endian_secret(self):
        self.fails("secret_token_pattern", "raw.bin", ("AIza" + "S" * 35).encode("utf-16-be"))

    def test_binary_ascii_secret_not_skipped(self):
        self.fails("secret_token_pattern", "raw.bin", b"\x00\xff" + ("github_pat_" + "A" * 40).encode() + b"\x00")

    def test_private_key_block(self):
        marker = "-----BEGIN " + "PRIVATE KEY-----\n"
        self.fails("private_key_material", "notes.txt", marker.encode() + b"synthetic-body")

    def test_code_mentions_of_key_marker_not_material(self):
        marker = "-----BEGIN " + "PRIVATE KEY-----"
        Scanner().scan("test.mjs", ("Buffer.from('" + marker + "')").encode())

    def test_populated_json_auth_fields(self):
        for key in ("access_token", "private_key", "clientSecret", "api_key", "thoughtSignature"):
            self.fails("populated_sensitive_json_field", "raw.json", json.dumps({"nested": {key: "opaque-actual-value"}}).encode())

    def test_synthetic_json_and_empty_missing_values_allowed(self):
        Scanner().scan("fixture.json", json.dumps({"api_key": None, "password": "petclinic", "access_token": "synthetic-token-only",
                                                "thoughtSignature": "synthetic-signature", "authorization": "Bearer fake-key"}).encode())

    def test_url_userinfo_credential(self):
        payload = b"https://" + b"user:opaque-value" + b"@example.invalid/repo"
        self.fails("url_userinfo_credential", "log.txt", payload)

    def test_url_public_fixture_placeholder(self):
        Scanner().scan("config.txt", b"https://user:password@example.invalid/repo")

    def test_authorization_header(self):
        payload = b"Authoriz" + b"ation: Bearer " + b"opaqueActualCredential123456"
        self.fails("authorization_value", "http.log", payload)

    def test_inline_neo4j_auth(self):
        payload = b"NEO4J_AUTH" + b"=neo4j/" + b"opaqueActualPassword"
        self.fails("inline_neo4j_credential", "command.log", payload)

    def test_environment_name_only_not_a_secret(self):
        Scanner().scan("commands.json", json.dumps({"args": ["--env", "NEO4J_AUTH"]}).encode())

    def test_password_command_argument(self):
        payload = b"runner --pass" + b"word " + b"opaqueActualPassword"
        self.fails("credential_command_argument", "command.log", payload)

    def test_public_yaml_password_and_environment_allowed(self):
        Scanner().scan("application.yml", b"password: petclinic\napi_key: ${GEMINI_API_KEY}\n")

    def test_private_yaml_password_rejected(self):
        self.fails("plaintext_configuration_credential", "application.yml", b"spring.datasource.password=opaqueActualPassword\n")

    def test_zip_recursion_success(self):
        scanner = Scanner()
        scanner.scan("outer.zip", make_zip([("inner.zip", make_zip([("README.md", b"public")]))]))
        self.assertEqual(scanner.summary()["archives"], 2)

    def test_zip_recursion_secret(self):
        inner = make_zip([("data.json", json.dumps({"api_key": "opaque-actual-value"}).encode())])
        self.fails("populated_sensitive_json_field", "outer.zip", make_zip([("inner.zip", inner)]))

    def test_tar_recursion_success(self):
        Scanner().scan("source.tar", make_tar([("LICENSE", b"public fixture license")]))

    def test_gzip_tar_recursion(self):
        scanner = Scanner()
        scanner.scan("source.tar.gz", gzip.compress(make_tar([("README.md", b"public")])) )
        self.assertEqual(scanner.summary()["archives"], 2)

    def test_gzip_plain_text(self):
        Scanner().scan("notes.txt.gz", gzip.compress(b"public"))

    def test_magic_inspected_despite_bin_extension(self):
        self.fails("secret_token_pattern", "opaque.bin", make_zip([("secret.txt", ("AIza" + "Z" * 35).encode())]))

    def test_malformed_declared_zip(self):
        self.fails("archive_format_mismatch", "broken.zip", b"not a zip")

    def test_truncated_zip(self):
        self.fails("malformed_or_unsupported_zip", "broken.zip", make_zip([("a.txt", b"a")])[:8])

    def test_zip_tar_extension_mismatch(self):
        self.fails("archive_format_mismatch", "wrong.tar", make_zip([("a.txt", b"a")]))

    def test_malformed_tar(self):
        self.fails("malformed_or_unsupported_tar", "broken.tar", b"invalid")

    def test_malformed_gzip(self):
        self.fails("malformed_gzip", "broken.gz", b"\x1f\x8bgarbage")

    def test_unsupported_archive(self):
        self.fails("unsupported_archive", "test.bin", b"7z\xbc\xaf\x27\x1cgarbage")

    def test_nested_unsafe_path(self):
        self.fails("unsafe_archive_path", "test.zip", make_zip([("../outside", b"a")]))

    def test_archive_backslash_rejected(self):
        # ZipInfo normalizes host-native separators on Windows when writing.
        payload = make_zip([("dir/a.txt", b"a")]).replace(b"dir/a.txt", b"dir\\a.txt")
        self.fails("unsafe_archive_path", "test.zip", payload)

    def test_archive_case_duplicate(self):
        self.fails("duplicate_archive_path", "test.zip", make_zip([("A.txt", b"a"), ("a.txt", b"b")]))

    def test_archive_case_prefix_collision(self):
        self.fails("archive_path_case_collision", "test.zip", make_zip([("Dir/a.txt", b"a"), ("dir/b.txt", b"b")]))

    def test_archive_exact_duplicate(self):
        self.fails("duplicate_archive_path", "test.zip", make_zip([("a.txt", b"a"), ("a.txt", b"b")]))

    def test_archive_file_directory_collision(self):
        self.fails("archive_file_directory_collision", "test.zip", make_zip([("a", b"a"), ("a/b", b"b")]))

    def test_archive_forbidden_credential_member(self):
        self.fails("archive_private", "test.zip", make_zip([("credentials/key.clixml", b"never decrypt")]))

    def test_archive_symlink(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            item = zipfile.ZipInfo("link")
            item.create_system = 3
            item.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(item, "target")
        self.fails("archive_link_or_special_member", "test.zip", buffer.getvalue())

    def test_tar_symlink(self):
        buffer = io.BytesIO()
        with tarfile.open(fileobj=buffer, mode="w") as archive:
            item = tarfile.TarInfo("link")
            item.type = tarfile.SYMTYPE
            item.linkname = "target"
            archive.addfile(item)
        self.fails("archive_link_or_special_member", "test.tar", buffer.getvalue())

    def test_tar_unsafe_path(self):
        self.fails("unsafe_archive_path", "test.tar", make_tar([("C:/outside", b"a")]))

    def test_encrypted_zip_flag_rejected(self):
        value = bytearray(make_zip([("a.txt", b"a")]))
        local = value.index(b"PK\x03\x04")
        central = value.index(b"PK\x01\x02")
        value[local + 6] |= 1
        value[central + 8] |= 1
        self.fails("encrypted_archive_member", "test.zip", bytes(value))

    def test_depth_budget(self):
        value = make_zip([("a.txt", b"a")])
        for _ in range(3):
            value = make_zip([("inner.zip", value)])
        self.fails("archive_depth_budget", "test.zip", value, Scanner(max_depth=2))

    def test_member_size_budget(self):
        self.fails("member_size_budget", "large.txt", b"x" * 11, Scanner(max_member_bytes=10))

    def test_expanded_budget(self):
        scanner = Scanner(max_expanded_bytes=10)
        scanner.scan("a.txt", b"123456")
        self.fails("expanded_size_budget", "b.txt", b"123456", scanner)

    def test_entry_count_budget(self):
        self.fails("entry_count_budget", "test.zip", make_zip([("a", b"a"), ("b", b"b")]), Scanner(max_entries=2))

    def test_jar_is_recursively_inspected(self):
        self.fails("populated_sensitive_json_field", "fixture.jar", make_zip([("config.json", b'{"api_key":"opaque-value"}')]))

    def test_java_packages_not_user_caches(self):
        for path in ("org/springframework/boot/env/Example.class", "org/springframework/aop/target/Example.class",
                     "antlr/build/Example.class", "org/apache/http/auth/Credentials.class"):
            with self.subTest(path=path):
                Scanner().scan("app.jar", make_zip([(path, b"public class bytes")]))
                self.assertIsNotNone(exclusion_reason(path))

    def test_java_exception_does_not_allow_private_files_or_content(self):
        for path in ("org/example/env/.env", "org/example/build/secret.key", "org/example/credentials/value.json",
                     "org/example/.git/config", "org/example/credentials.json"):
            with self.subTest(path=path), self.assertRaises(SecurityError):
                Scanner().scan("app.jar", make_zip([(path, b"private")]))
        self.fails("secret_token_pattern", "app.jar", make_zip([
            ("org/example/env/Example.class", ("AI" + "za" + "Q" * 35).encode())]))

    def test_java_package_exception_requires_actual_java_archive(self):
        self.fails("archive_private_or_disposable_directory", "app.zip", make_zip([
            ("org/springframework/boot/env/Example.class", b"public")]))

    def test_inline_public_none_with_markdown_delimiter(self):
        Scanner().scan("README.md", b"Use `NEO4J_AUTH=none` only on an isolated internal network.")
        self.fails("inline_neo4j_credential", "README.md", b"Value `NEO4J_AUTH=user/" + b"opaque-real-looking-value`.")

    def test_header_cookie_and_json_array_secrets(self):
        self.fails("session_cookie_header", "response.log", b"Set-Cookie: SID=opaque-session-value; HttpOnly\r\n")
        self.fails("populated_sensitive_json_field", "headers.json", b'{"set-cookie":["SID=opaque-session-value"]}')
        Scanner().scan("headers.json", b'{"set-cookie":[],"authorization":["synthetic-header"]}')

    def test_long_public_no_url_does_not_require_url_regex(self):
        Scanner().scan("public.txt", b"Q" * 200_000)

    def test_immutable_bytes_required(self):
        with self.assertRaises(TypeError):
            Scanner().scan("a.txt", bytearray(b"a"))

    def test_error_path_controls_are_sanitized(self):
        error = self.fails("unsafe_path", "a\n\x1bb.txt", b"a")
        self.assertNotIn("\n", str(error))
        self.assertNotIn("\x1b", str(error))


if __name__ == "__main__":
    unittest.main()
