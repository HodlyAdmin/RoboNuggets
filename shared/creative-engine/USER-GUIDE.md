# Creative Engine — User Guide

> Generate professional images, videos, and audio using Google AI Ultra's browser tools, then review and approve results through a premium local gallery.

---

## What This Tool Does

Creative Engine automates the full creative media pipeline:

1. **Image Generation** — Uses Google Flow / Imagen (Nano Banana 2) to generate images from text prompts with optional reference images
2. **Video Generation** — Uses Google Flow / Veo 3.1 to turn images into cinematic video clips
3. **Audio Generation** — Uses Google Lyria to generate AI music tracks
4. **Review & Approve** — A local web gallery where you review, compare, approve, reject, or redo any generated media

**Cost model**: Generation is **free** (browser-based, unlimited via Google AI Ultra). The only API cost is multimodal judging at ~$0.001 per evaluation.

---

## Prerequisites

Before your first run, make sure you have:

| Requirement | How to check |
|---|---|
| **Node.js 20+** | `node --version` |
| **Google Chrome** | Installed at default location |
| **Google AI Ultra subscription** | Logged into Chrome with your Google account |
| **GEMINI_API_KEY** | In your `.env` file (for judge-based selection only) |

---

## Step 1: Launch Chrome for Automation

Creative Engine controls Chrome via CDP (Chrome DevTools Protocol). You need to start Chrome with remote debugging enabled:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/creative-engine-chrome
```

> **Tip**: Keep this Chrome window open. Navigate to [Google AI Studio](https://aistudio.google.com) and make sure you're logged in. The engine will use your active session.

---

## Step 2: Create Your Config

Start from a template:

### Minimal (image only)
```bash
cp shared/creative-engine/templates/minimal.example.json my-config.json
```

### Full pipeline (image → video)
```bash
cp shared/creative-engine/templates/single-concept.example.json my-config.json
```

### Batch campaign (multiple concepts)
```bash
cp shared/creative-engine/templates/campaign.example.json my-campaign.json
```

Then edit the config with your prompt:

```json
{
  "projectName": "my-first-run",
  "imageConfig": {
    "enabled": true,
    "prompt": "A young woman holding a skincare product in soft morning light, casual loungewear, warm golden tones, iPhone selfie, UGC realism",
    "model": "Nano Banana 2",
    "aspectRatio": "9:16",
    "variantCount": "x2",
    "selectionPolicy": "judge"
  },
  "videoConfig": {
    "enabled": true,
    "prompt": "Slow cinematic pan with gentle parallax, atmospheric lighting, filmic grain",
    "model": "Veo 3.1 - Fast [Lower Priority]"
  }
}
```

### Key config options

| Field | Values | What it does |
|---|---|---|
| `variantCount` | `"x1"`, `"x2"` | How many candidates to generate per stage |
| `selectionPolicy` | `"first"`, `"judge"`, `"manual"` | How to choose the winner. `judge` uses AI, `manual` routes to review |
| `confidenceThreshold` | `0.0` – `1.0` | If judge confidence is below this, routes to manual review |
| `aspectRatio` | `"9:16"`, `"16:9"`, `"1:1"` | Output dimensions |
| `referenceImages` | `["path/to/img.jpg"]` | Input images for character/product identity preservation |
| `preferredImage` | `1`, `2` | Which image candidate (1-indexed) to use as the video start frame |

---

## Step 3: Validate Your Config (Dry Run)

Always dry-run first — this validates your config without consuming any resources:

```bash
node shared/creative-engine/cli.js --config my-config.json --dry-run
```

You'll see:
```
════════════════════════════════════════════════════════════
  CREATIVE ENGINE | DRY RUN
════════════════════════════════════════════════════════════

Config is valid.
Project: my-first-run
Plan:
 - Image: ✅ Nano Banana 2
 - Video: ✅ Veo 3.1 - Fast [Lower Priority]
 - Audio: ⏭️  Disabled
Dry run complete. No resources consumed.
```

---

## Step 4: Run Generation

```bash
node shared/creative-engine/cli.js --config my-config.json
```

**What happens**:
1. Chrome navigates to Google Flow
2. Your prompt is entered, model selected, reference images uploaded
3. Media is generated (images: ~30s, video: ~3-10min)
4. Generated files are captured via CDP network interception
5. If `selectionPolicy: "judge"`, the Gemini API evaluates candidates
6. Winner is selected, manifest is saved

**Output goes to**: `lessons/r56-creative-engine/output/<projectName>_<timestamp>/`

Each run creates:
- `manifest.json` — Full pipeline metadata and results
- `*.jpg` / `*.mp4` — Generated media files
- `.flow-jobs/` — Raw CDP state data

---

## Step 5: Review in the Gallery

Launch the review server:

```bash
node shared/creative-engine/cli.js --review
```

Open **http://localhost:3456** in your browser.

### Gallery Features

| Feature | How |
|---|---|
| **Browse runs** | Click any run in the left sidebar |
| **View fullscreen** | Click any media to open the lightbox |
| **Navigate in lightbox** | ← → arrow keys or navigation arrows |
| **Approve** | Click green ✅ button or press **A** |
| **Reject** | Click red ❌ button or press **R** |
| **Redo** | Click amber 🔄 button or press **D** (add notes for why) |
| **Batch approve** | "Batch Approve All" button in header |
| **Compare candidates** | Click "⬜ Compare" to toggle side-by-side view |
| **See keyboard shortcuts** | Click "⌨ Shortcuts" in header |
| **Export approved** | Click "Export Approved" → copies files to `deliverables/` |
| **Filter by status** | Use filter pills (All / Pending / Approved / Rejected) |
| **Play video with sound** | Click the video — unmutes automatically |
| **View generation prompt** | Click the truncated prompt text → expands in modal |

### Keyboard Shortcuts

| Key | Action |
|---|---|
| **F** | Open lightbox for focused candidate |
| **Escape** | Close lightbox / modal |
| **← →** | Navigate between candidates in lightbox |
| **A** | Approve current candidate |
| **R** | Reject current candidate |
| **D** | Mark for redo |

---

## Step 6: Batch Campaigns

For producing multiple concepts in one run:

```bash
node shared/creative-engine/cli.js --config my-campaign.json
```

Campaign config structure:
```json
{
  "campaign": "summer-ugc-2026",
  "concepts": [
    { "name": "serum-morning", "prompt": "..." },
    { "name": "moisturizer-routine", "prompt": "..." }
  ],
  "imageConfig": { "enabled": true, "model": "Nano Banana 2" },
  "videoConfig": { "enabled": false }
}
```

Each concept gets its own subfolder, and a `campaign-manifest.json` ties them together.

---

## Step 7: Resume Failed Runs

If a run fails partway through (e.g., video timed out but image succeeded):

```bash
node shared/creative-engine/cli.js --resume output/my-run_12345/
```

The engine reads the existing manifest, identifies which stages completed vs failed, and re-runs **only** the failed stages. Completed work is preserved.

---

## Programmatic API

You can also use the engine as a library:

```javascript
import { createEngine } from './shared/creative-engine/index.js';

const engine = createEngine({ outputDir: './output' });

// Single concept
const result = await engine.generate({
  projectName: 'my-project',
  imageConfig: { enabled: true, prompt: '...' },
  videoConfig: { enabled: true, prompt: '...' },
});

// Batch campaign
const campaign = await engine.batch({ campaign: 'summer-2026', concepts: [...] });

// Review server
await engine.review({ port: 3456 });

// Resume
await engine.resume('./output/failed-run_12345/');
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **"Chrome not reachable"** | Make sure Chrome is running with `--remote-debugging-port=9333` |
| **"Timeout waiting for media"** | Video generation can take 3-10 min. Check Chrome — is Flow still loading? |
| **"No candidates captured"** | Check Chrome console for errors. Make sure you're logged into Google AI |
| **"Config validation failed"** | Run `--dry-run` to see specific validation errors |
| **Gallery shows no runs** | Gallery scans `lessons/r56-creative-engine/output/`. Make sure runs exist there |
| **Video has no sound** | Click the video to play with sound. Hover = muted preview, click = full audio |

---

## File Structure

```
shared/creative-engine/
├── cli.js              # CLI entry point
├── config.js           # Config loading + validation
├── index.js            # Public API (createEngine)
├── manifest.js         # Manifest read/write
├── batch.js            # Multi-concept campaign runner
├── cost-tracker.js     # API cost tracking
├── resume.js           # Failed run resume logic
├── providers/
│   ├── image-generator.js   # Google Flow / Imagen
│   ├── video-generator.js   # Google Flow / Veo 3.1
│   └── audio-generator.js   # Google Lyria
├── review/
│   ├── server.js            # Express review server
│   └── ui/
│       ├── index.html       # Gallery page
│       ├── gallery.css      # Premium dark styles
│       └── gallery.js       # Gallery logic + lightbox
└── templates/
    ├── minimal.example.json
    ├── single-concept.example.json
    └── campaign.example.json
```
