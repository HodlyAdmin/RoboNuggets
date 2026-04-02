---
description: Load project context from vector memory at the start of a new conversation
---

# Start Session Workflow

Run this at the beginning of every new conversation to load relevant project context from the vector memory system.

## Steps

1. Check memory system health:
```bash
node .agent/memory/status.js
```

2. If the status shows no manifest or zero chunks, run setup first:
```bash
node .agent/memory/setup.js
```

3. Query memory for context relevant to the user's request:
```bash
# Broad project context
node .agent/memory/query.js "project overview and current status"

# Then query for the specific topic the user mentioned
node .agent/memory/query.js "<user's topic here>"
```

4. Review the results and incorporate the context into your understanding before responding.

## Notes

- The embedding model auto-downloads on first run (~23MB). Cached after that.
- If results feel stale, re-run: `node .agent/memory/ingest.js`
- See `.agent/skills/VectorMemory/SKILL.md` for full documentation.
