# R48 | Vibecoding Masterclass

This module implements a local agent-driven version of the R48 lesson workflow, replacing n8n with the AntiGravity AI agent driving Chrome via CDP on port `9333`.

## Status: Implemented ✅

- `npm run r48:dry` writes a plan, manifest, and report describing the preserved workflow, integrations, and blockers.
- `npm run r48` seeds a local workspace with the Prismalabs HTML, sample images, and reference webhook templates.

## CDP Agent Architecture

All content generation in this lesson is driven by **Chrome DevTools Protocol** — no n8n, no hosted webhooks, no API keys:

| Stage | Driver | Notes |
|-------|--------|-------|
| AI text/code editing | `shared/chrome-ai.js` | Gemini via live Chrome session |
| Video generation | `shared/chrome-flow.js` | Veo 3.1 Fast via Google Flow |
| Audio generation | `shared/chrome-lyria.js` | Lyria 3 Pro via Gemini Tools menu |

All drivers connect to Chrome at `http://127.0.0.1:9333`.

## Media Extraction Rule

Do NOT click the native browser "Download" button — macOS will intercept it with a "Save As" dialog. All media is extracted via **CDP Network Interceptor** (`page.on('response', ...)`). See `knowledge/autonomous-browser-extraction-patterns.md` for the full pattern.

## Digital Citizenship

After every generation, the automation **automatically deletes** the generated chat/session from the shared Google AI account. See `knowledge/core-agent-philosophies.md`.

## Launch Chrome

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/robonuggets-agent-chrome
```
