# Flash Task 2 Prompt — Batch Runner + Cost Tracker

Paste this entire prompt into a NEW Gemini 3 Flash chat.

---

## PROMPT START

You are executing Task 2 of a multi-phase hardening plan for the RoboNuggets project. Read the full handoff document first, then execute only Task 2.

**Step 1**: Read the handoff document and the engine code that was built in Task 1 and Task 4:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/.agent/handoffs/r56-hardening-flash-handoff.md
```
Then read the existing engine files:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/index.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/config.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/manifest.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/providers/image-generator.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/api-gemini.js
```

**Step 2**: Execute ONLY Task 2 from the handoff document. Create these files:

1. **`shared/creative-engine/batch.js`** — Batch runner
   - Export `runBatch(engine, campaignConfig)` — takes an engine instance and a campaign config
   - Campaign config has `campaign` (name), `concepts` (array), plus shared `imageConfig`, `videoConfig`, `audioConfig`
   - Each concept has `name`, `prompt`, optionally `referenceImages`, and can override any stage config
   - For each concept: merge concept-level overrides with campaign-level defaults, set `projectName` to `<campaign>-<concept.name>`, then call `engine.generate(mergedConfig)`
   - If a concept fails, log the error and continue to the next concept
   - Return a campaign result: `{ campaign, startedAt, completedAt, concepts: [{ name, status, outputDir, error? }], apiUsage }`
   - Save a campaign-level manifest at `<outputDir>/<campaign>_<timestamp>/campaign-manifest.json`

2. **`shared/creative-engine/cost-tracker.js`** — API cost tracking
   - Export `createCostTracker()` — factory returning a tracker object
   - `tracker.record({ model, inputTokens, outputTokens })` — record one API call
   - `tracker.summary()` — return `{ totalCalls, totalInputTokens, totalOutputTokens, estimatedCostUSD, breakdown: { [model]: { calls, inputTokens, outputTokens, estimatedCostUSD } } }`
   - `tracker.toJSON()` — return serializable object for manifest inclusion
   - `tracker.reset()` — clear all tracked data
   - Pricing table (per 1M tokens):
     - `gemini-2.5-flash`: input $0.15, output $0.60
     - `gemini-2.0-flash`: input $0.10, output $0.40
     - `gemini-2.5-pro`: input $1.25, output $10.00
   - Format cost as string with $ and 4 decimal places (e.g., "$0.0024")

3. **`shared/creative-engine/templates/campaign.example.json`** — Example campaign
   ```json
   {
     "campaign": "summer-ugc-2026",
     "outputDir": "output",
     "concepts": [
       {
         "name": "serum-morning",
         "prompt": "A young woman in her mid-20s holding a serum bottle in soft morning light, casual loungewear, warm golden tones, amateur iPhone selfie, candid UGC realism"
       },
       {
         "name": "moisturizer-routine",
         "prompt": "Close-up of hands applying moisturizer to face, bathroom mirror selfie, natural skin texture, warm natural light"
       }
     ],
     "imageConfig": {
       "enabled": true,
       "model": "Nano Banana 2",
       "aspectRatio": "9:16",
       "variantCount": "x1",
       "selectionPolicy": "first"
     },
     "videoConfig": {
       "enabled": false
     },
     "audioConfig": {
       "enabled": false
     }
   }
   ```

4. **Wire batch into the CLI** (`shared/creative-engine/cli.js`):
   - Add `--batch` flag: `node shared/creative-engine/cli.js --batch --config campaign.json`
   - When `--batch` is present AND the config has a `concepts` array, call `runBatch()` instead of `engine.generate()`
   - Also auto-detect: if the config has `concepts`, treat it as a batch regardless of `--batch` flag

5. **Wire batch into the engine** (`shared/creative-engine/index.js`):
   - Add `engine.batch(campaignConfig)` method that delegates to `runBatch(this, campaignConfig)`

**Step 3**: Verify:
```
# Dry run with campaign config to verify batch detection and validation
node shared/creative-engine/cli.js --config shared/creative-engine/templates/campaign.example.json --dry-run
```

**Rules**:
- All files are ESM (`import`/`export`)
- Follow existing logging: `import { log } from '../logger.js'`
- Do NOT modify `shared/chrome-flow.js`, `shared/flow-wrapper/`, or `shared/hero-selection.js`
- The batch runner should work with any engine instance — it calls `engine.generate()` per concept
- Cost tracker is standalone — it does NOT modify `api-gemini.js` in this task (that integration comes later)

**Report**: When done, list all files created/modified and the dry-run output.

## PROMPT END
