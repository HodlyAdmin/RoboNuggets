# Vector Memory Kit

A portable, drop-in local RAG system for any project. Zero-config, no API keys, runs entirely on your machine.

## Quick Start

```bash
# 1. Copy into your project
cp -r ~/Documents/AntiGravity/_templates/vector-memory/ .agent/memory/

# 2. (Optional) Copy the skill and workflow for agent integration
mkdir -p .agent/skills/VectorMemory .agent/workflows
cp .agent/memory/SKILL.md .agent/skills/VectorMemory/SKILL.md
cp .agent/memory/start-session.md .agent/workflows/start-session.md

# 3. Run setup (installs deps, auto-detects paths, indexes)
node .agent/memory/setup.js

# 4. Query your project
node .agent/memory/query.js "how does this project work"
```

## What It Does

1. Scans your project for markdown, text, and code files
2. Splits them into heading-aware semantic chunks
3. Embeds each chunk using `bge-small-en-v1.5` (runs locally, ~23MB model)
4. Stores vectors in a local index (via `vectra`)
5. Searches by cosine similarity when you query

## Files

| File | Purpose |
|---|---|
| `setup.js` | One-command bootstrapper (deps + config + first ingest) |
| `ingest.js` | Index files into vectors (incremental via SHA-256) |
| `query.js` | Semantic search CLI |
| `status.js` | Health check and stats |
| `memory.config.json` | Project-specific scan paths and settings |
| `SKILL.md` | Agent-discoverable documentation |
| `start-session.md` | Workflow for conversation bootstrapping |

## Requirements

- Node.js 18+
- npm (the setup script auto-installs `vectra` and `@xenova/transformers`)
