# Mốc A — synthetic adapter and response survey

This tool uses Java fixture source only. It does not accept actual P02/P03
manifests, create receipts, import/query Neo4j, retrieve embeddings, or call models.
Keep the existing candidate parser/importer unchanged. Real-case integration needs
a separately implemented and reviewed receipt-aware entry point under D20.

Use an existing environment with `tree-sitter==0.25.2` and
`tree-sitter-java==0.23.5`. The importer can export Cypher without the Neo4j driver.
No download/setup is performed by this tool.

```powershell
python -B tools/run_synthetic_preparation.py --manifest PATH_TO_SYNTHETIC_INPUT/input.json --output PATH_OUTSIDE_INPUT/NEW_RUN
python -B -m unittest discover -s tests -p test_synthetic_adapter.py -v
```

The input manifest is local to its source root, with this experimental shape:

```json
{
  "schema": "synthetic-integration-input/1",
  "kind": "synthetic_only",
  "repository": "synthetic://your-fixture",
  "revision": "toy-v1",
  "snapshot_kind": "synthetic_dev",
  "seed_id": "visits-service::demo.visits.Provider#read(List<Integer>)",
  "provenance": {"fixture_version": "v1", "origin": "generated Java syntax"},
  "source_files": [{"path": "visits-service/Provider.java", "sha256": "HASH_OF_ACTUAL_BYTES"}]
}
```

`synthetic_variant` is also supported, with an explicit `patch_id` if relevant.
Paths must be unique relative `.java` members; input hashes must match. No symlinks,
Windows reparse points, traversal, or input/output directory overlap is allowed.
Output must be new; an existing run is never replaced. The synthetic marker is a
scope check, not authentication that arbitrary source truly is synthetic.

Outputs:

- `graph.native.json`: builder result, unchanged native schema and IDs.
- `graph.synthetic.cypher`: export only, never sent to a database.
- `run.json`: manifest/code/input hashes, snapshot/revision/provenance, exact seed
  presence, and `native_source_map` binding existing normalized aliases to input files.
- `response-survey.experimental.json`: separate syntax observations with relative
  file/expression/1-based spans and explicit unresolved reasons. It is not adopted
  into native nodes/edges or the shared Method/API/Service draft contract.
- `checksums.sha256`: run artifacts, including failure metadata after output begins.

Validation failures before output creation are on stderr with nonzero CLI exit;
capture them with an external raw command logger. A missing seed or input change
after extraction leaves a failed `run.json` and artifacts; never call that a pass.
Success does not mean no unresolved expressions.

## Survey coverage and limits

Records: top-level component name/type and declaration spans. DTOs: explicit
top-level class fields, Java types and variable declaration spans. Map.of: literal
Java key tokens, retaining escapes verbatim; dynamic keys are unresolved. Consumer
syntax: field accesses and zero-argument getter/record-name candidates, with raw
receiver/name/spans. Unknown invocation, Optional, chains, annotations and nested
types get unsupported/unresolved observations.

These are syntax candidates. There is no import/type/dataflow analysis proving
that `Map` is java.util.Map, an accessor belongs to a record, or a Java member is
serialized as a JSON field. Jackson/Lombok/visibility/inheritance, runtime nulls,
Optional.empty, aliasing and producer/consumer field bindings remain unresolved.
An arbitrary null call fixture is not a compiled Java program.

Native parser still does not emit record implicit methods; no new canonical IDs
are invented for them. Native filtering/inference limits remain as in candidate.
Adding response-field nodes/edges, implicit IDs, snapshot identity or API/Service
projection needs a separate contract decision. Mốc A does not adopt those changes.

## Later integration plan (not executed here)

For each case, coordinator receipt must be present and checked against that
case's scenario/universe/fixture, draft checkpoint/version/hash and D20 before
opening actual extraction/Neo4j/retrieval. Preserve the receipt bytes/hash beside
input/source/code hashes; reject a receipt for the other case. Keep annotator
inputs separate from method outputs. Receipt existence alone is not semantic
verification or accepted labels. No receipt-handling bypass is implemented by
this synthetic runner. Current packet receipts are both null.
