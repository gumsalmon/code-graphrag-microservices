# P01 reproducibility review — 2026-09-26

Follow-up 2026-09-27: [implementation hash clarification](P01_HASH_PROVENANCE.md).
The probe/full-suite commands now require a clean checkout, record Git HEAD
and status, distinguish blob and checkout hashes, and write outside the checkout
(`--output-root`, default `%TEMP%/p01-verification-output`). Earlier evidence
below describes the original scoped run and remains unmodified.

This follow-up stays in PR #1. No P02 development, new scoring experiment or
full 54-test rerun was performed. All current Precision/Recall/F1 values are
**pipeline smoke tests, not paper results**. Existing numerical values remain
unchanged; no superiority claim is supported by draft fixture labels.

## LF/CRLF

The old source check compared raw bytes with the bundled baseline and could
reject a clean checkout solely because Git produced CRLF instead of LF.
The verifier now compares source with only CRLF converted to LF, and supplies
canonical LF copies to the parser. Original source files are not modified.
Other whitespace, characters and lone CR bytes are preserved. Dirty tracked
source and a wrong Git commit are still rejected.

Provenance retains original SHA-256, adds the LF-normalized SHA-256 and records
the normalization policy. Copied snapshot hashes identify the actual parser
inputs. Mutation patches are emitted with LF regardless of platform.

The targeted probe creates two temporary sparse Git clones of PetClinic at
`3858f9c630cf989bb6809a86edf47c2be78dc9f1`, one with `core.autocrlf=false`
and one with `core.autocrlf=true`. It verifies the physical bytes differ, both
checkouts are clean, and baseline/mutated produce identical canonical source,
parser JSON, Cypher and mutation-patch hashes. A non-EOL modification is rejected
in each checkout. These are two checkout modes tested on Windows, not a claim
that every OS/library configuration produces byte-identical artifacts.

The canonical mutation-patch SHA-256 is now
`b28bbe24d0b3f3d82598381c4331fcca43d46d797da648ce94642b8391d3a1e8`.
Earlier CRLF patch artifacts and their hashes remain untouched. Line-ending
normalization changes the patch's byte hash, not its Java method change.
Huy's reported semantic equivalence with Phát's patch remains recorded in
[the review follow-up](P01_REVIEW_FOLLOWUP.md).

`.gitattributes` continues to disable Git conversion for `evidence/**`; existing
hashes describe actual stored bytes, not automatically normalized text.

## Chroma model and cache

The current store leaves the embedding function implicit. In installed
ChromaDB **1.5.9**, `DefaultEmbeddingFunction` delegates to ONNX
**all-MiniLM-L6-v2**, producing 384 dimensions. The installed implementation,
not an assumed Hugging Face revision, is the source of these settings.

- Default cache: `%USERPROFILE%\.cache\chroma\onnx_models\all-MiniLM-L6-v2`.
- Download: `https://chroma-onnx-models.s3.amazonaws.com/all-MiniLM-L6-v2/onnx.tar.gz`.
- Archive SHA-256 verified against the installed implementation:
  `913d7300ceae3b2dbc2c50d1de4baacab4be7b9380491c27fab7418616a16ec3`.
- Observed runtime: onnxruntime 1.30.0, tokenizers 0.23.2, numpy 2.4.6,
  httpx 0.28.1; CPUExecutionProvider. Extracted model/tokenizer hashes are in
  the linked report. These transitive versions are recorded, not a complete
  cross-platform dependency lock.

Warm-cache test: real embedding and indexing/querying all three P01 files in a
new temporary Chroma database succeeded with model-download calls disabled.
It indexed 13 chunks and returned results without invoking the downloader.
Cold-cache test: temporarily pointing the model class to an empty private cache
with downloads disabled failed at the expected URL. This proves a clean offline
machine cannot assume the existing 54-test result will reproduce without model
provisioning. The guard applies to the model HTTP downloader, not all networking
on the machine. No user's cache/database was erased or reused as the test DB.

For a fresh online environment, explicitly provision the model before testing:

```powershell
python -m pip install -r requirements.txt
python -c "from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2; print(len(ONNXMiniLM_L6_V2()(['P01 cache warmup'])[0]))"
python tools/check_p01_reproducibility.py --source-root <clean-PetClinic-checkout>
```

Cold online download/proxy availability was not tested here; this run used the
existing archive and verified its hash. A new machine needs access to the URL
or a trusted cache with matching hashes. Use a new persistent Chroma directory
for independent experiments: `get_or_create_collection` plus upsert does not
remove unrelated old rows or demonstrate identical model configuration in an
existing database. These are explicit limits on reproducing historical F1.

## Evidence and result labeling

[Report](evidence/p01-e2e/repro-20260926T082624Z-d5eb6115/report.json),
[commands and raw test output](evidence/p01-e2e/repro-20260926T082624Z-d5eb6115/commands.log),
[JUnit](evidence/p01-e2e/repro-20260926T082624Z-d5eb6115/targeted-tests.xml),
[checksums](evidence/p01-e2e/repro-20260926T082624Z-d5eb6115/checksums.sha256).
The script exits 0; **11 focused tests pass**, plus the actual checkout/cache
probes above. The earlier probe without the focused tests is kept separately.

README, completion report and task history now explicitly classify their F1
tables as smoke tests. Both stored result JSON files and future runner output
carry `result_status: smoke_test` and `publication_ready: false`; the comparison
CLI prints the same warning. Only labeling changed in scoring code; no scoring
formula, labels, scenarios or numerical results were changed or rerun.
