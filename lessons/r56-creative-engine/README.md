# R56 | The Antigravity Creative Engine

CDP-backed creative media pipeline powered by Google AI Ultra. The lesson now has a verified local source baseline that uses Flow and Lyria through Chrome instead of the original API-heavy stack.

## Architecture

```
Stage 1: Image Generation  → shared/flow-wrapper → Google Flow / Nano Banana 2 via CDP
Stage 2: Video Generation  → shared/flow-wrapper → Google Flow / Veo 3.1 via CDP
Stage 3: Audio Generation  → Lyria 3 Pro (chrome-lyria.js) via CDP
Stage 4: Review Sink       → Airtable (optional, disabled by default)
```

The current Flow wrapper is an initial stable seam over `shared/chrome-flow.js`. It persists local Flow job state in `output/.flow-jobs/` and records selected artifacts/candidates, while still delegating the actual browser automation to the existing CDP driver.

## Prerequisites

- Chrome running with `--remote-debugging-port=9333`
- Logged into a Google AI Ultra account in that Chrome session
- Node.js 20+

## Usage

```bash
# Dry run — logs the current source baseline without consuming resources
npm run r56:dry

# Full pipeline — generates image, then video, and optionally audio
npm run r56

# Watch local Flow job state during long runs
npm run r56:watch
```

## Configuration

`index.js` prefers `config.source-baseline.json` when it exists, so the lesson boots into the source-audited baseline by default. Edit `config.source-baseline.json` or pass `--config <path>` if you want a different run contract.

Current verified baseline:
- Image: `Nano Banana 2`, `9:16`, with the original character and product reference images uploaded into Flow
- Video: `Video` -> `Frames` -> `9:16` -> `x2` -> `Veo 3.1 - Fast [Lower Priority]`
- Credits: video path must show `Generating will use 0 credits` before submit
- Timeout: free lower-priority Veo jobs may need up to `600000ms` (10 minutes)
- Audio: optional and disabled in the source baseline

`config.example.json` remains the general template for ad hoc experimentation.

Important: those settings are the verified R56 source baseline, not a repo-wide rule for every future Flow job. Keep `aspectRatio`, `subMode`, `variantCount`, `model`, and `requireZeroCredits` intake/config driven when adapting this lesson for other creative outputs.

Source-faithful image-to-video control:
- `videoConfig.useGeneratedImageAsReference: true` keeps the generated image as the start frame
- `videoConfig.preferredImage: 1` or `2` lets you explicitly choose which generated image candidate becomes the video start frame when multiple image variants exist
- if `preferredImage` is omitted, the pipeline falls back to the currently selected hero candidate

Output housekeeping mirrors R45 now:
- dry-runs do not create empty timestamp folders
- stale runs are archived into `output/.archive/`
- manual cleanup is available with `npm run r56:clean`

## Digital Citizenship

All generated Flow sessions are automatically named and tagged so humans can identify bot-created work. Local output housekeeping is in place, but provider-side Flow project deletion is currently disabled because the dashboard no longer exposes project names safely enough for shared-account deletion by name.

## Output

Each run creates a timestamped directory under `output/` containing:
- Generated images, video clips, and optional audio tracks
- `manifest.json` with the exact config path, stage states, model settings, timeout, and artifact paths
- `.flow-jobs/*.state.json` files for Flow-backed stages, including job status, request config, artifact paths, and the current hero-selection record

For long runs, `npm run r56:watch` gives a lightweight local watcher over `output/` and surfaces `running`, `needs-review`, `completed`, and `failed`. On macOS, a desktop notification path is implemented for terminal-state transitions.

Additional proof artifacts now exist for the candidate-aware path:
- `lessons/r56-creative-engine/output/r56-verify-pass_1775157542622/manifest.json` — first live run with `2` saved video candidates and a `judge` winner
- `lessons/r56-creative-engine/output/r56-manual-review_1775159203078/manifest.json` — live proof of the `manual` / `needs-review` path
- `lessons/r56-creative-engine/output/r56-preferred-image-proof_1775164254709/manifest.json` — `preferredImage` fallback proven, video `x2` captured 2 candidates, image `x2` capture gap confirmed (CDP interceptor, now fixed)

Latest fully verified source-baseline run:
- Manifest: `lessons/r56-creative-engine/output/r56-creative-engine-source-baseline_1775135283535/manifest.json`
- Image artifact: JPEG `720x1280`
- Video artifact: MP4 generated through the `0 credits` Veo lower-priority path
