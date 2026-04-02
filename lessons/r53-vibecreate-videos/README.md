# R53 | Vibecreate Videos with Claude Code + Remotion

This module implements a local agent-driven version of the R53 lesson, combining Claude Code for generation with Remotion for rendering — all orchestrated locally with zero hosted services.

## Status: Implemented ✅

- `npm run r53:dry` writes a scaffold plan, manifest, and report.
- `npm run r53` seeds a local reference workspace with the lesson notes and sample prompt.

## CDP Agent Architecture

Content generation and orchestration uses the same unified CDP-first architecture as all other lessons in this repo:

| Stage | Driver | Notes |
|-------|--------|-------|
| Script & prompt generation | `shared/chrome-ai.js` | Gemini via live Chrome session on port `9333` |
| Video rendering | Remotion CLI (`npx remotion render`) | Local render, no cloud API |
| Audio generation | `shared/chrome-lyria.js` | Lyria 3 Pro via Gemini Tools menu |

## Media Extraction Rule

Do NOT click the native browser "Download" button — macOS will intercept it with a "Save As" dialog that deadlocks Node.js. All media is extracted via **CDP Network Interceptor** (`page.on('response', ...)`). See `knowledge/autonomous-browser-extraction-patterns.md` for the full pattern.

## Digital Citizenship

After every Gemini session, the automation **automatically deletes** the orphaned chat from the shared Google AI account. See `knowledge/core-agent-philosophies.md`.

## Launch Chrome

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/robonuggets-agent-chrome
```
