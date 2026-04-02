# Flash Task 5+6 Prompt — Resume Support + Documentation

Paste this entire prompt into a NEW Gemini 3 Flash chat.

---

## PROMPT START

You are executing Tasks 5 and 6 of a multi-phase hardening plan for the RoboNuggets Creative Engine. These are the final Flash tasks.

**Step 1**: Read context:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/.agent/handoffs/r56-hardening-flash-handoff.md
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/index.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/manifest.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/config.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/cli.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/batch.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/cost-tracker.js
```

Look at an existing manifest to understand the resume data shape:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r56-creative-engine/output/r56-preferred-image-proof_1775165789996/manifest.json
```

**Step 2**: Execute Task 5 — Resume Support

Create **`shared/creative-engine/resume.js`**:
- Export `resumeRun(engine, outputDir)` 
- Read the existing `manifest.json` from `outputDir`
- Determine which stages completed vs failed vs skipped:
  - If `stages.imageGeneration.status === 'completed'` → skip image stage
  - If `stages.imageGeneration.status === 'failed'` → re-run image stage
  - Same logic for `videoGeneration` and `audioGeneration`
  - If `stages.imageGeneration.status === 'skipped'` → keep skipped (was intentionally disabled)
- Reconstruct a config from the manifest data (project name, prompts, models from the stage data)
- Call `engine.generate()` with the reconstructed config, but only for the stages that need re-running
- **Key implementation detail**: Modify the engine's generate method to accept an optional `skipStages` parameter:
  - `{ skipStages: { image: true, video: false, audio: true } }` → only runs video
  - When skipping a stage, copy the previous result from the old manifest
- Update the manifest in place with new results (don't create a new run directory)
- Log clearly which stages are being re-run and which are being kept

Wire into the engine:
- Update `shared/creative-engine/index.js`: The `resume()` method should import and call `resumeRun()`
- Update `shared/creative-engine/cli.js`: `--resume <dir>` should call `engine.resume(dir)`

**Acceptance criteria:**
- `node shared/creative-engine/cli.js --resume lessons/r56-creative-engine/output/r56-preferred-image-proof_1775165789996/ --dry-run` shows which stages would be re-run
- The logic correctly identifies completed stages to skip

**Step 3**: Execute Task 6 — Documentation

Create **`shared/creative-engine/README.md`** with full documentation:

```markdown
# @antigravity/creative-engine

A production-hardened creative media generation engine leveraging Google AI Ultra's unlimited browser-based generation. Generates images (Imagen/Nano Banana), videos (Veo 3.1), and audio (Lyria) through Chrome CDP automation with zero API costs for generation.

## Quick Start

### Prerequisites
- Node.js 20+
- Google Chrome with remote debugging enabled on port 9333
- Google AI Ultra subscription (logged in to Chrome)
- `GEMINI_API_KEY` in `.env` (for multimodal judging only — generation is free)

### Launch Chrome
\`\`\`bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/robonuggets-agent-chrome
\`\`\`

### Single Concept
\`\`\`bash
node shared/creative-engine/cli.js --config my-config.json
\`\`\`

### Batch Campaign
\`\`\`bash
node shared/creative-engine/cli.js --config campaign.json
\`\`\`
(Auto-detects batch mode when config has a `concepts` array)

### Dry Run (Validate Only)
\`\`\`bash
node shared/creative-engine/cli.js --config my-config.json --dry-run
\`\`\`

### Review Gallery
\`\`\`bash
node shared/creative-engine/cli.js --review --port 3456
\`\`\`

### Resume Failed Run
\`\`\`bash
node shared/creative-engine/cli.js --resume output/my-run_12345/
\`\`\`

## Programmatic API

\`\`\`javascript
import { createEngine } from './shared/creative-engine/index.js';

const engine = createEngine({ outputDir: './output' });

// Single concept
const result = await engine.generate({
  projectName: 'my-campaign',
  imageConfig: { enabled: true, prompt: '...', model: 'Nano Banana 2' },
  videoConfig: { enabled: true, prompt: '...', model: 'Veo 3.1 - Fast [Lower Priority]' },
});

// Batch campaign
const campaign = await engine.batch({
  campaign: 'summer-2026',
  concepts: [
    { name: 'serum', prompt: '...' },
    { name: 'moisturizer', prompt: '...' },
  ],
  imageConfig: { enabled: true, model: 'Nano Banana 2' },
});

// Review gallery
await engine.review({ port: 3456 });

// Resume
await engine.resume('./output/failed-run_12345/');
\`\`\`

## Configuration Reference
(Document ALL config fields with types, defaults, and valid values — pull from config.js DEFAULTS and validation rules)

## Architecture
(Brief diagram showing: Config → Engine → Providers → CDP/Flow → Output → Review Gallery)

## Cost Model
(Explain: Generation = free via browser, Judge = ~$0.001/call via Gemini API, with cost tracker breakdown)

## File Structure
(List all files in shared/creative-engine/ with one-line descriptions)
```

Also create template files:
- **`shared/creative-engine/templates/single-concept.example.json`** — Minimal single-concept config
- **`shared/creative-engine/templates/minimal.example.json`** — Bare minimum (image only, no video/audio)

**Step 4**: Verify:
```
node shared/creative-engine/cli.js --help
cat shared/creative-engine/README.md | head -20
```

**Rules**:
- All files are ESM
- Follow existing patterns exactly
- Do NOT modify `shared/chrome-flow.js`, `shared/flow-wrapper/`, or `shared/hero-selection.js`

**Report**: When done, list all files created/modified and confirm resume dry-run works.

## PROMPT END
