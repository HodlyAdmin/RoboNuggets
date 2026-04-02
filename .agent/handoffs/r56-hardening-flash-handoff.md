# R56 Creative Engine — Flash Execution Handoff

**Author**: Opus (planner/architect)  
**Executor**: Gemini 3 Flash or Gemini 3.1 Pro (High)  
**Verifier**: Opus  
**Workflow**: Design (Opus) → Execute (Flash) → Verify (Opus)

---

## Project Context

**Repository**: `/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets`  
**What exists**: A working CDP-based creative media pipeline at `lessons/r56-creative-engine/` that generates images (Imagen/Nano Banana), videos (Veo 3.1), and audio (Lyria) through browser automation of Google Flow. All generation is browser-based (unlimited via Google AI Ultra subscription). Evaluation uses the Gemini REST API (`shared/api-gemini.js`, key via `.env` `GEMINI_API_KEY`).

**What we're building**: Hardening this into a reusable tool with a public API, CLI, config validation, batch processing, local review gallery, cost tracking, and resume support. It stays inside RoboNuggets (shared tooling gold standard) but should be cleanly extractable later.

**Package name**: `@antigravity/creative-engine`

### Runtime Architecture
- **Chrome CDP** on port `9333` for all browser automation
- **Gemini API** (`gemini-2.5-flash`) for JSON generation and multimodal judging
- **Node.js ESM** — all files use `import`/`export`, no CommonJS
- **No build step** — runs directly with Node.js
- Uses `dotenv` for env vars

### Key Files (Already Exist)

| File | Purpose | Lines |
|------|---------|-------|
| `lessons/r56-creative-engine/index.js` | Pipeline orchestrator (single-concept) | 179 |
| `lessons/r56-creative-engine/providers/image-generator.js` | Image gen via Flow wrapper | 56 |
| `lessons/r56-creative-engine/providers/video-generator.js` | Video gen via Flow wrapper (has preferredImage logic) | 135 |
| `lessons/r56-creative-engine/providers/audio-generator.js` | Audio gen via Lyria | 35 |
| `lessons/r56-creative-engine/manifest.js` | JSON manifest save/load | 44 |
| `lessons/r56-creative-engine/output-housekeeping.js` | Output cleanup/archiving | 343 |
| `lessons/r56-creative-engine/sinks/airtable-review.js` | Stub (returns skipped) | 18 |
| `shared/flow-wrapper/index.js` | Flow job orchestration (startFlowJob) | 292 |
| `shared/flow-wrapper/state.js` | Job state persistence | 61 |
| `shared/flow-wrapper/watch.js` | Terminal job watcher | 126 |
| `shared/chrome-flow.js` | Core CDP browser automation | ~700 |
| `shared/hero-selection.js` | 4-policy candidate selection gate | 282 |
| `shared/api-gemini.js` | Gemini REST API (text + multimodal) | 228 |
| `shared/logger.js` | Structured logging utility | exists |
| `shared/chrome-ai.js` | Chrome connection management | exists |

### Config Format (Current)
```json
{
  "projectName": "my-campaign",
  "cleanupOutput": true,
  "outputRetention": { "keepSuccessfulRuns": 2 },
  "imageConfig": {
    "enabled": true,
    "provider": "flow",
    "model": "Nano Banana 2",
    "aspectRatio": "9:16",
    "variantCount": "x2",
    "selectionPolicy": "first",
    "prompt": "...",
    "referenceImages": ["path/to/ref1.jpg"]
  },
  "videoConfig": {
    "enabled": true,
    "provider": "flow",
    "model": "Veo 3.1 - Fast [Lower Priority]",
    "aspectRatio": "9:16",
    "variantCount": "x2",
    "subMode": "Frames",
    "requireZeroCredits": true,
    "selectionPolicy": "first",
    "preferredImage": 2,
    "prompt": "..."
  },
  "audioConfig": { "enabled": false },
  "airtableConfig": { "enabled": false }
}
```

### Conventions to Follow
- ESM imports only (`import ... from '...'`)
- Relative paths from the file's location (e.g., `../../shared/logger.js`)
- `log.info()`, `log.success()`, `log.warn()`, `log.error()`, `log.step()` from `shared/logger.js`
- All outputs go to `lessons/r56-creative-engine/output/<projectName>_<timestamp>/`
- State files go to `<outputDir>/.flow-jobs/`
- Digital citizenship: auto-name projects, clean up, don't leave orphans

---

## Task Sequence

### TASK 1: Public API Surface + Config Validation
**Chat**: New chat  
**Model**: Flash  
**Scope**: Create the importable module API and config schema validation

**Create these files:**

1. **`shared/creative-engine/index.js`** — Public API
   - Export `createEngine(options)` that returns an engine instance
   - Engine has `.generate(config)` — runs the pipeline for a single concept or batch
   - Engine has `.review(options)` — launches review server (placeholder for now, returns TODO)
   - Engine has `.resume(outputDir)` — resumes a failed run (placeholder for now)
   - `options`: `{ chromePort: 9333, outputDir: 'lessons/r56-creative-engine/output' }`
   - Internally delegates to the existing `executeImageGeneration`, `executeVideoGeneration`, etc.
   - Must work as: `import { createEngine } from '../../shared/creative-engine/index.js'`

2. **`shared/creative-engine/config.js`** — Config validation + defaults
   - Export `validateConfig(config)` — validates the config object, returns `{ valid: boolean, errors: string[], config: normalizedConfig }`
   - Export `loadConfig(pathOrObject)` — loads from file path or accepts object, merges with defaults
   - Export `DEFAULTS` — sensible defaults for all config fields
   - Validation rules:
     - `projectName` required, must be a valid slug
     - `imageConfig.model` must be one of known models
     - `imageConfig.variantCount` must be one of `'x1'`, `'x2'`, `'x3'`, `'x4'`
     - `videoConfig.model` must be one of known models
     - `videoConfig.aspectRatio` must be one of `'9:16'`, `'16:9'`, `'1:1'`
     - `videoConfig.preferredImage` if present must be a positive integer
     - Reference image paths must exist on disk (warn, don't error)
   - Known models: `['Nano Banana 2', 'Imagen 3', 'Imagen 4']` for image, `['Veo 3.1', 'Veo 3.1 - Fast [Lower Priority]']` for video

3. **`shared/creative-engine/cli.js`** — CLI entry point
   - Parses args: `--config <path>`, `--dry-run`, `--review`, `--resume <dir>`, `--port <number>`
   - `--config` runs `engine.generate(config)`
   - `--dry-run` validates config and prints plan without executing
   - `--review` launches review server on `--port` (default 3456)
   - `--resume <dir>` calls `engine.resume(dir)` (placeholder)
   - Prints help with `--help`
   - Uses `process.argv` parsing (no external deps like yargs)

4. **Update `package.json`** — Add new scripts:
   - `"creative-engine": "node shared/creative-engine/cli.js"` 
   - `"creative-engine:review": "node shared/creative-engine/cli.js --review"`
   - Keep existing `r56` scripts unchanged (they still work)

**Acceptance criteria:**
- `node shared/creative-engine/cli.js --help` prints usage
- `node shared/creative-engine/cli.js --config lessons/r56-creative-engine/config.source-baseline.json --dry-run` validates and prints plan
- `import { createEngine } from './shared/creative-engine/index.js'` works in a test script
- Config validation catches missing `projectName`, invalid `variantCount`, etc.
- All existing R56 functionality untouched (no breaking changes)

---

### TASK 2: Batch Runner + Campaign State
**Chat**: New chat  
**Model**: Flash  
**Scope**: Add multi-concept batch processing

**Create these files:**

1. **`shared/creative-engine/batch.js`** — Batch runner
   - Export `runBatch(engine, config)` — processes multiple concepts sequentially
   - Campaign config format:
     ```json
     {
       "campaign": "esmi-summer-2026",
       "concepts": [
         { "name": "serum-morning", "prompt": "...", "referenceImages": [] },
         { "name": "moisturizer-evening", "prompt": "...", "referenceImages": [] }
       ],
       "imageConfig": {},
       "videoConfig": {}
     }
     ```
   - Each concept inherits from top-level configs, can override per-concept
   - Runs concepts one at a time (browser can only do one at a time)
   - Saves campaign-level manifest with all concept results
   - If a concept fails, logs error and continues to next (don't abort campaign)

2. **`shared/creative-engine/cost-tracker.js`** — API cost tracking
   - Export `createCostTracker()` — returns a tracker instance
   - `tracker.record({ model, inputTokens, outputTokens })` — logs one API call
   - `tracker.summary()` — returns `{ totalCalls, totalInputTokens, totalOutputTokens, estimatedCost }`
   - `tracker.toJSON()` — serializable for manifest inclusion
   - Pricing table: `gemini-2.5-flash` input: $0.15/1M tokens, output: $0.60/1M tokens
   - Integrate into `api-gemini.js` responses (extract `usageMetadata` from Gemini responses)

3. **`shared/creative-engine/templates/campaign.example.json`** — Example campaign config

**Acceptance criteria:**
- Campaign with 2 concepts runs both sequentially
- If concept 1 fails, concept 2 still runs
- Campaign manifest includes per-concept results + aggregate cost
- Cost tracker produces readable summary

---

### TASK 3: Review Gallery UI
**Chat**: New chat  
**Model**: Flash (this is a web UI task — Flash excels here)  
**Scope**: Build the localhost review gallery

**Create these files:**

1. **`shared/creative-engine/review/server.js`** — Express-based review server
   - Serves static UI from `ui/` subdirectory
   - API routes:
     - `GET /api/runs` — list all runs in output directory
     - `GET /api/runs/:runId` — get manifest + candidates for a run
     - `POST /api/runs/:runId/candidates/:index/approve` — mark approved
     - `POST /api/runs/:runId/candidates/:index/reject` — mark rejected  
     - `POST /api/runs/:runId/candidates/:index/redo` — queue for re-generation with optional notes
     - `POST /api/runs/:runId/approve-all` — batch approve all candidates
     - `GET /api/media/:runId/*` — serve media files (images, videos)
   - Decisions persist to `<runDir>/review-decisions.json`

2. **`shared/creative-engine/review/ui/index.html`** — Single-page review gallery
   - Grid layout showing all candidates
   - Group by run, then by concept, then by stage (image, video, audio)
   - Each candidate card shows:
     - Media preview (image thumbnail or video player)
     - Candidate index and metadata
     - Approve / Reject / Redo buttons
     - Status badge (pending / approved / rejected / redo)
   - Batch approve button per run
   - Filter by status (pending only / all)
   - Should feel premium — dark mode, smooth transitions, glassmorphism cards

3. **`shared/creative-engine/review/ui/gallery.css`** — Styles
4. **`shared/creative-engine/review/ui/gallery.js`** — Client-side JS

**Design requirements:**
- Dark mode with a modern, premium aesthetic
- Glassmorphism cards with subtle blur
- Smooth hover transitions on candidate cards
- Video candidates play inline on hover
- Responsive layout (works on ultrawide and laptop screens)
- Color palette: deep slate background, accent blues/greens for approve, warm reds for reject
- Typography: Inter or system-ui
- No framework dependencies — vanilla HTML/CSS/JS
- Express as the only server dependency (already in project or add to package.json)

**Acceptance criteria:**
- `node shared/creative-engine/cli.js --review --port 3456` opens gallery at localhost:3456
- Gallery shows real candidates from existing proof runs
- Approve/reject/redo buttons work and persist to `review-decisions.json`
- Video candidates play inline
- Looks premium and polished

---

### TASK 4: CDP Driver Extraction (OPUS ONLY)
**Model**: Opus  
**Scope**: Clean up the module boundary between creative-engine and chrome-flow

This is Opus work because it requires understanding the fragile CDP driver internals. NOT for Flash.

- Ensure `shared/creative-engine/index.js` cleanly delegates to `shared/flow-wrapper/index.js`
- Ensure no lesson-specific logic leaks into the engine
- Verify that the engine can run against any config, not just R56-specific ones

---

### TASK 5: Resume Support
**Chat**: Same as Task 2 or new  
**Model**: Flash  
**Scope**: Implement the `--resume` path

- Read existing manifest from `<outputDir>/manifest.json`
- Identify which stages completed vs failed/skipped
- Re-run only the stages that need it
- Update the manifest with new results

**Acceptance criteria:**
- If a run completed image but failed video, `--resume` skips image and runs video
- Manifest is updated in-place (not created fresh)

---

### TASK 6: Documentation + Templates
**Chat**: Same as Task 1  
**Model**: Flash  
**Scope**: Write the standalone README and campaign templates

- `shared/creative-engine/README.md` — full docs covering CLI, API, config, review UI, batch, resume
- `shared/creative-engine/templates/single-concept.example.json`
- `shared/creative-engine/templates/campaign.example.json`
- `shared/creative-engine/templates/minimal.example.json`
- Update `knowledge/architecture-and-conventions.md` with creative-engine section

---

### TASK 7: Integration Test + Final Review (OPUS ONLY)
**Model**: Opus  
**Scope**: End-to-end verification

- Run a single-concept generation through the new `creative-engine` CLI
- Run a 2-concept batch campaign
- Launch review UI, verify candidates appear, test approve/reject
- Verify cost tracking in manifest
- Verify resume works on an intentionally-failed run
- Update FIDELITY.md and WORKSTATE.md

---

## Execution Order

```
TASK 1: Scaffold + API + Config (Flash)      <-- START HERE
         New chat
              |
              v  Opus verifies
TASK 4: CDP Extraction (Opus)
              |
              v
TASK 2: Batch + Cost Tracker (Flash)
         New chat
              |
              v  Opus verifies
TASK 3: Review Gallery UI (Flash)
         New chat
              |
              v  Opus verifies
TASK 5: Resume Support (Flash)
         New or same chat as Task 2
              |
              v
TASK 6: Documentation (Flash)
         Same chat as Task 1
              |
              v
TASK 7: Final Integration (Opus)             <-- DONE
```

## Notes for Flash

- **Do not modify** `shared/chrome-flow.js`, `shared/flow-wrapper/index.js`, or `shared/hero-selection.js`. These are hardened CDP drivers. Only Opus touches them.
- **Do not add new npm dependencies** without noting them. Express is acceptable for the review server.
- **Follow the existing logging pattern**: `import { log } from '../../shared/logger.js'` — use `log.info()`, `log.success()`, `log.warn()`, `log.error()`, `log.step()`.
- **All files are ESM**: `import`/`export`, not `require()`.
- **Test against existing output**: There are real proof runs in `lessons/r56-creative-engine/output/` with manifests, images, and videos you can use to validate the review UI.
