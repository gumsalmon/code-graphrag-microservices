# Explicit setup only; prepare never builds/pulls/downloads an image or model.
FROM python:3.11-slim@sha256:da047cb8f9d1d98e5c070f5300ba9f7274e33b8fc0e5be5ed88740aed1b95ba9
RUN pip install --no-cache-dir tree-sitter==0.25.2 tree-sitter-java==0.23.5 tree-sitter-go==0.25.0 chromadb==1.5.9 neo4j==5.28.1 pytest==9.1.1 && pip check
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ANONYMIZED_TELEMETRY=False
# Direct dependencies pinned; transitive versions are recorded, not a full lock.
