---
name: VectorMemory
description: Query and manage the project's local vector-based semantic memory system for instant context retrieval across conversations.
---

# VectorMemory Skill

Search the project's knowledge base using natural language to find relevant context, design decisions, architecture, and operational details.

## When to Use

1. **Start of every conversation** — Run a broad query to load relevant context
2. **Before researching** — Check memory before reading files or browsing the web
3. **When asked about past decisions** — "Why did we choose X?" queries go here
4. **When onboarding** — New team members or AI assistants should query memory first

## Quick Reference

```bash
# First-time setup (installs deps, auto-detects paths, indexes)
node .agent/memory/setup.js

# Search memory
node .agent/memory/query.js "your question here"

# Search with more results
node .agent/memory/query.js --top 10 "your question here"

# Check memory health
node .agent/memory/status.js

# Re-index after adding/editing docs
node .agent/memory/ingest.js

# Full rebuild from scratch
node .agent/memory/ingest.js --force
```

## How It Works

1. **Knowledge sources** (markdown, text, and code files) are split into semantic chunks using heading-aware splitting
2. **Each chunk is embedded** into a vector using `bge-small-en-v1.5` (runs locally, no API key needed)
3. **Queries are embedded** using the same model and matched by cosine similarity
4. **Top results** are returned with source file, relevance score, and full text

## Reading Results

Each result includes:
- **Title** — extracted from the source document's heading
- **Source** — file path and chunk index
- **Relevance** — percentage score (higher = more relevant)
- **Text** — the actual content chunk

Results above 50% relevance are usually highly relevant. Below 30% may be tangential.

## Configuration

Edit `.agent/memory/memory.config.json` to customize:

```json
{
  "scanPaths": ["docs/", "knowledge/", "src/", "README.md"],
  "extensions": [".md", ".txt"],
  "excludeDirs": ["node_modules", ".git", "dist"],
  "chunkSize": 500,
  "chunkOverlap": 50,
  "model": "Xenova/bge-small-en-v1.5",
  "topK": 5
}
```

## Adding New Knowledge

1. Create or edit a file in any scanned directory
2. Run `node .agent/memory/ingest.js` (incremental — skips unchanged files)
3. Verify: `node .agent/memory/query.js "topic you just added"`

### Best Practices

- Use clear headings — they become result titles and chunk boundaries
- Write self-contained paragraphs — each chunk should make sense alone
- Include the "why" — design decisions, trade-offs, alternatives considered
- Date important decisions — "As of March 2026, we chose X because..."

## Maintenance

- **After adding/editing docs**: Run `node .agent/memory/ingest.js`
- **Incremental mode**: Unchanged files are skipped via SHA-256 hashing
- **Model auto-downloads**: ~23MB, caches in `node_modules/.cache/`
- **No API keys needed**: Everything runs locally
