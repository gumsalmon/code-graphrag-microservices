"""Private-network raw runtime collection. No impact labels or model output."""
import argparse
import hashlib
import http.client
import json
import time
from datetime import datetime, timezone
from pathlib import Path

from importlib.util import spec_from_file_location, module_from_spec
spec = spec_from_file_location("p02_baseline_probe", Path(__file__).with_name("http-probe.py"))
baseline = module_from_spec(spec)
spec.loader.exec_module(baseline)
TARGETS = baseline.TARGETS
save = baseline.save


def capture(directory, request):
    target, path, method = request["target"], request["path"], request["method"]
    if target not in TARGETS or method not in ("GET", "POST") or not path.startswith("/") or any(c in path for c in ("\r", "\n", "\\")) or path.startswith("//"):
        raise ValueError("Unsafe request")
    name = request["id"]
    if not name or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789_-" for c in name):
        raise ValueError("Unsafe observation ID")
    host, port = TARGETS[target]
    body = json.dumps(request["body"], separators=(",", ":")).encode() if "body" in request else None
    if method == "POST" and (target != "visits" or path != "/owners/6/pets/7/visits" or request.get("body") != {
            "date": "2026-10-01", "description": "P02 isolated write control"}):
        raise ValueError("POST outside authorized disposable fixture")
    headers = {"Accept": "application/json", "Accept-Encoding": "identity", **request.get("headers", {})}
    record = {"id": name, "timestamp_utc": datetime.now(timezone.utc).isoformat(), "method": method, "host": host, "port": port,
              "path": path, "request_headers": headers, "request_body_file": None, "status": None, "error": None,
              "response_headers": None, "body_file": None, "redirects_followed": False}
    if body is not None:
        record.update(request_body_file=name + ".request.body", request_body_sha256=hashlib.sha256(body).hexdigest(), request_body_bytes=len(body))
        with (directory / record["request_body_file"]).open("xb") as stream:
            stream.write(body)
    start = time.monotonic()
    connection = http.client.HTTPConnection(host, port, timeout=20)
    response_bytes = None
    try:
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        record.update(status=response.status, response_headers=response.getheaders())
        response_bytes = response.read(4 * 1024 * 1024 + 1)
        with (directory / (name + ".body")).open("xb") as stream:
            stream.write(response_bytes)
        record.update(body_file=name + ".body", body_sha256=hashlib.sha256(response_bytes).hexdigest(), body_bytes=len(response_bytes))
        if len(response_bytes) > 4 * 1024 * 1024:
            raise ValueError("Body limit exceeded; retained bytes are incomplete")
    except Exception as error:
        record["error"] = type(error).__name__ + ": " + str(error)
    finally:
        connection.close()
        record["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        save(directory / (name + ".json"), record)
    try:
        parsed = json.loads(response_bytes) if response_bytes is not None else None
    except (ValueError, UnicodeDecodeError):
        parsed = None
    return record, parsed


def visits_tuple(body):
    return sorted((v["id"], v["petId"], v["date"], v["description"]) for v in body["items"])


def ready(target, body):
    if target == "visits":
        return isinstance(body, list) and sorted(v["id"] for v in body) == [1, 4]
    if target == "gateway":
        return isinstance(body, dict) and body.get("id") == 6 and sorted(p["id"] for p in body.get("pets", [])) == [7, 8]
    return baseline.setup_ready(target, body)


def wait(directory, target):
    deadline, attempt = time.monotonic() + 150, 0
    path = "/owners/6/pets/7/visits" if target == "visits" else baseline.READY_PATHS[target]
    while time.monotonic() < deadline:
        attempt += 1
        record, body = capture(directory, {"id": "readiness-%03d" % attempt, "method": "GET", "target": target, "path": path})
        if record["error"] is None and record["status"] == 200 and ready(target, body):
            result = {"status": "setup_ready", "attempts": attempt, "all_attempts_retained": True,
                      "gateway_visit_count_not_used_as_readiness_oracle": True, "labels_created": False}
            save(directory / "readiness.json", result)
            return result
        time.sleep(2)
    raise RuntimeError("Readiness timed out; all attempts retained")


def setup(directory, fixture):
    bodies = {}
    for name, target, path in [("config-visits", "config", "/visits-service/docker"),
                               ("config-customers", "config", "/customers-service/docker"),
                               ("config-gateway", "config", "/api-gateway/docker"),
                               ("discovery-registry", "discovery", "/eureka/apps"),
                               ("pet7-before", "visits", "/owners/6/pets/7/visits"),
                               ("pet8-before", "visits", "/owners/6/pets/8/visits")]:
        record, body = capture(directory, {"id": name, "target": target, "method": "GET", "path": path})
        if record["error"] or record["status"] != 200:
            raise RuntimeError("Setup support request failed")
        bodies[name] = body
    rows = bodies["pet7-before"] + bodies["pet8-before"]
    expected = sorted((v["id"], v["pet_id"], v["date"], v["description"]) for v in fixture["seed_visits"])
    if visits_tuple({"items": rows}) != expected:
        raise RuntimeError("Fresh database does not match pinned SQL; possible reset failure")
    configs = {}
    for name in ("config-visits", "config-customers"):
        properties = {}
        for source in reversed(bodies[name].get("propertySources", [])):
            properties.update(source.get("source", {}))
        if properties.get("spring.sql.init.data-locations") != "classpath*:db/hsqldb/data.sql" or properties.get("spring.sql.init.schema-locations") != "classpath*:db/hsqldb/schema.sql":
            raise RuntimeError("Not the pinned HSQLDB setup")
        configs[name] = {"schema": properties["spring.sql.init.schema-locations"], "data": properties["spring.sql.init.data-locations"]}
    applications = bodies["discovery-registry"].get("applications", {}).get("application", [])
    for name in ("CUSTOMERS-SERVICE", "VISITS-SERVICE", "API-GATEWAY"):
        matches = [a for a in applications if a.get("name") == name]
        if not any(any(i.get("status") == "UP" for i in (a["instance"] if isinstance(a["instance"], list) else [a["instance"]])) for a in matches):
            raise RuntimeError("Consumer/provider not registered UP")
    result = {"schema": "p02-f03-fresh-db/1", "seed_visit_tuples": expected, "fresh_seed_only": True,
              "support_requests": 6, "hsqldb_config": configs, "real_registry_up": True, "labels_created": False}
    save(directory / "setup.json", result)
    return result


def collect(directory, fixture):
    rows = []
    for index, request in enumerate(fixture["requests"]):
        if request["method"] == "POST" and index != len(fixture["requests"]) - 1:
            raise ValueError("POST must be last")
        record, parsed = capture(directory, request)
        # A separate ledger records fixture order; raw request record remains
        # exactly as captured before interpretation.
        rows.append({"order": index + 1, "id": request["id"], "method": request["method"], "status": record["status"], "error": record["error"]})
        if record["error"] is not None:
            raise RuntimeError("Transport/incomplete observation; stop without automatic retry")
        if request["method"] == "POST":
            if not (record["status"] in (200, 201) and isinstance(parsed, dict) and parsed.get("petId") == 7 and
                    parsed.get("date") == request["body"]["date"] and parsed.get("description") == request["body"]["description"]):
                raise RuntimeError("Write-control evidence not established; preserve result")
    # Explicit extra support request AFTER the final fixture slot, never counted as slot 41.
    record, parsed = capture(directory, {"id": "post-readback", "target": "visits", "method": "GET", "path": "/pets/visits?petId=7,8"})
    expected = sorted((v["id"], v["pet_id"], v["date"], v["description"]) for v in fixture["seed_visits"])
    actual = visits_tuple(parsed) if isinstance(parsed, dict) and "items" in parsed else []
    created = [v for v in actual if v not in expected]
    if record["error"] or record["status"] != 200 or len(actual) != 5 or any(v not in actual for v in expected) or len(created) != 1 or created[0][1:] != (7, "2026-10-01", "P02 isolated write control"):
        raise RuntimeError("POST readback does not prove a single disposable write")
    result = {"schema": "p02-f03-group-observations/1", "status": "ten_fixture_slots_captured", "slots": rows,
              "fixture_slots": 10, "post_requests": 1, "post_last": True, "post_readback_extra": True,
              "labels_created": False, "model_calls": 0}
    save(directory / "observations.json", result)
    return result


def fault(directory):
    record, parsed = capture(directory, {"id": "gateway-provider-fault", "target": "gateway", "method": "GET", "path": "/api/gateway/owners/6"})
    result = {"schema": "p02-f03-controlled-fault/1", "http_status": record["status"], "transport_error": record["error"],
              "owner_id": parsed.get("id") if isinstance(parsed, dict) else None,
              "visits_count": sum(len(p.get("visits", [])) for p in parsed.get("pets", [])) if isinstance(parsed, dict) else None,
              "labels_created": False, "note": "Additional fault intervention, not part of the 40-slot paired matrix"}
    save(directory / "fault.json", result)
    if record["error"] is not None or record["status"] != 200 or result["owner_id"] != 6 or result["visits_count"] != 0:
        raise RuntimeError("Controlled-fault fallback not demonstrated; preserve raw output")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["wait", "setup", "collect", "fault"])
    parser.add_argument("--output", required=True)
    parser.add_argument("--fixture")
    parser.add_argument("--target", choices=list(TARGETS))
    args = parser.parse_args()
    directory = Path(args.output)
    if not str(directory).startswith("/run/") or ".." in directory.parts:
        raise ValueError("Output must be private run mount")
    directory.mkdir(parents=True, exist_ok=False)
    try:
        if args.action == "wait":
            result = wait(directory, args.target)
        elif args.action in ("collect", "setup"):
            with Path(args.fixture).open(encoding="utf-8") as stream:
                fixture = json.load(stream)
            result = collect(directory, fixture) if args.action == "collect" else setup(directory, fixture)
        else:
            result = fault(directory)
        print(json.dumps(result))
    except Exception as error:
        save(directory / "failure.json", {"error": str(error), "labels_created": False})
        raise


if __name__ == "__main__":
    main()
