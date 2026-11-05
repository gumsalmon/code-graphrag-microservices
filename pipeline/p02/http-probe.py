"""Private-network baseline setup/observation, not impact labels or a model evaluator."""
import argparse
import hashlib
import http.client
import json
import time
from datetime import datetime, timezone
from pathlib import Path

TARGETS = {"config": ("config-server", 8888), "discovery": ("discovery-server", 8761),
           "customers": ("customers-service", 8081), "visits": ("visits-service", 8082), "gateway": ("api-gateway", 8080)}
READY_PATHS = {"config": "/application/docker", "discovery": "/eureka/apps", "customers": "/owners/6",
               "visits": "/pets/visits?petId=7,8", "gateway": "/api/gateway/owners/6"}


def save(path, value):
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


def capture(directory, name, target, path):
    if target not in TARGETS or not path.startswith("/") or "\r" in path or "\n" in path:
        raise ValueError("Only fixed private service targets and relative request paths")
    host, port = TARGETS[target]
    started = time.monotonic()
    record = {"id": name, "timestamp_utc": datetime.now(timezone.utc).isoformat(), "method": "GET",
              "host": host, "port": port, "path": path, "status": None, "error": None,
              "request_headers": {"Accept": "application/json", "Accept-Encoding": "identity"},
              "redirects_followed": False, "response_headers": None, "body_file": None}
    connection = http.client.HTTPConnection(host, port, timeout=8)
    body = None
    try:
        connection.request("GET", path, headers=record["request_headers"])
        response = connection.getresponse()
        body = response.read(4 * 1024 * 1024 + 1)
        if len(body) > 4 * 1024 * 1024:
            raise ValueError("HTTP body over 4 MiB; not a complete observation")
        record.update(status=response.status, response_headers=response.getheaders(), body_file=name + ".body",
                      body_sha256=hashlib.sha256(body).hexdigest(), body_bytes=len(body))
        # Body bytes are unmodified; headers are parsed pairs, not a wire-byte transcript.
        with (directory / record["body_file"]).open("xb") as stream:
            stream.write(body)
    except Exception as error:
        record["error"] = type(error).__name__ + ": " + str(error)
    finally:
        connection.close()
    record["elapsed_ms"] = round((time.monotonic() - started) * 1000)
    save(directory / (name + ".json"), record)
    try:
        parsed = json.loads(body) if body is not None else None
    except (ValueError, UnicodeDecodeError):
        parsed = None
    return record, parsed


def setup_ready(target, body):
    if target == "config":
        return isinstance(body, dict) and bool(body.get("propertySources"))
    if target == "discovery":
        return isinstance(body, dict) and "applications" in body
    if target in ("customers", "gateway"):
        if not isinstance(body, dict) or body.get("id") != 6:
            return False
        if sorted(pet["id"] for pet in body.get("pets", [])) != [7, 8]:
            return False
        return target == "customers" or sum(len(pet.get("visits", [])) for pet in body["pets"]) == 4
    return isinstance(body, dict) and sorted(visit["id"] for visit in body.get("items", [])) == [1, 2, 3, 4]


def wait(directory, target):
    deadline = time.monotonic() + 150
    attempt = 0
    while time.monotonic() < deadline:
        attempt += 1
        record, body = capture(directory, "readiness-%03d" % attempt, target, READY_PATHS[target])
        if record["error"] is None and record["status"] == 200 and setup_ready(target, body):
            return {"status": "setup_ready", "target": target, "attempts": attempt,
                    "all_readiness_attempts_retained": True, "impact_labels_created": False}
        time.sleep(2)
    raise RuntimeError("Baseline setup readiness timed out; every attempt retained, no fallback prediction")


def collect(directory, fixture):
    observations = {}
    for request in fixture["requests"]:
        if request["method"] != "GET":
            continue  # Baseline feasibility is explicitly read-only, not the 40-request matrix.
        record, body = capture(directory, request["id"], request["target"], request["path"])
        observations[request["id"]] = (record, body)
    for target, path, name in [
        ("config", "/visits-service/docker", "config-visits"),
        ("config", "/customers-service/docker", "config-customers"),
        ("config", "/api-gateway/docker", "config-gateway"),
        ("discovery", "/eureka/apps", "discovery-registry"),
    ]:
        observations[name] = capture(directory, name, target, path)
    direct = observations["direct_omitted"]
    expected = sorted((row["id"], row["pet_id"], row["date"], row["description"]) for row in fixture["seed_visits"])
    actual = sorted((row["id"], row["petId"], row["date"], row["description"]) for row in (direct[1] or {}).get("items", []))
    gateway = observations["gateway_populated"]
    empty = observations["gateway_empty"]
    config_sources = (observations["config-visits"][1] or {}).get("propertySources", [])
    config_values = {}
    for source in reversed(config_sources):
        config_values.update(source.get("source", {}))
    assertions = {"fixture_direct_matches_seed_sql": direct[0]["status"] == 200 and actual == expected,
                  "gateway_setup_has_populated_visits": gateway[0]["status"] == 200 and setup_ready("gateway", gateway[1]),
                  "auxiliary_owner_is_empty": empty[0]["status"] == 200 and isinstance(empty[1], dict) and empty[1].get("id") == 1 and
                       sum(len(pet.get("visits", [])) for pet in empty[1].get("pets", [])) == 0,
                  "hsqldb_sql_config_returned": config_values.get("spring.sql.init.data-locations") == "classpath*:db/hsqldb/data.sql" and
                       config_values.get("spring.sql.init.schema-locations") == "classpath*:db/hsqldb/schema.sql",
                  "no_transport_errors": all(record["error"] is None for record, _ in observations.values())}
    result = {"schema": "p02-baseline-observation/1", "status": "baseline_fixture_ready" if all(assertions.values()) else "baseline_setup_not_verified",
              "setup_assertions": assertions, "fixture_requests_observed": 9, "support_requests_observed": 4,
              "post_executed": False, "full_matrix_executed": False, "mutated_executed": False,
              "status_by_request": {name: record["status"] for name, (record, _) in observations.items()},
              "remote_model_calls": 0, "impact_labels_created": False,
              "note": "Baseline setup evidence only, not independent annotation or evidence of unchanged behavior after mutation"}
    save(directory / "observations.json", result)
    if not all(assertions.values()):
        raise RuntimeError("Baseline fixture/config probe failed; preserve observations, do not proceed to mutation")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["wait", "collect"])
    parser.add_argument("--output", required=True)
    parser.add_argument("--target", choices=list(TARGETS))
    parser.add_argument("--fixture")
    args = parser.parse_args()
    directory = Path(args.output)
    if not str(directory).startswith("/run/"):
        raise ValueError("Probe output must be in mounted private run")
    directory.mkdir(parents=True, exist_ok=False)
    try:
        if args.action == "wait":
            if not args.target:
                raise ValueError("Explicit readiness target required")
            result = wait(directory, args.target)
        else:
            with Path(args.fixture).open(encoding="utf-8") as stream:
                fixture = json.load(stream)
            result = collect(directory, fixture)
        print(json.dumps(result))
    except Exception as error:
        save(directory / "failure.json", {"status": "baseline_probe_failed", "error": str(error), "impact_labels_created": False})
        raise


if __name__ == "__main__":
    main()
