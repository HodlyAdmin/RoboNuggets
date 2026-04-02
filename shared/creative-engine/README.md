# @antigravity/creative-engine

A production-hardened creative media generation engine leveraging Google AI Ultra's unlimited browser-based generation. Generates images (Imagen/Nano Banana), videos (Veo 3.1), and audio (Lyria) through Chrome CDP automation with zero API costs for generation.

## Quick Start

### Prerequisites
- Node.js 20+
- Google Chrome with remote debugging enabled on port 9333
- Google AI Ultra subscription (logged in to Chrome)
- `GEMINI_API_KEY` in `.env` (for multimodal judging only — generation is free)

### Launch Chrome
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/robonuggets-agent-chrome
```

### Single Concept
```bash
node shared/creative-engine/cli.js --config configs/my-config.json
```

### Batch Campaign
```bash
node shared/creative-engine/cli.js --config configs/campaign.json
```
(Auto-detects batch mode when config has a `concepts` array)

### Dry Run (Validate Only)
```bash
node shared/creative-engine/cli.js --config my-config.json --dry-run
```

### Review Gallery
```bash
node shared/creative-engine/cli.js --review --port 3456
```

### Resume Failed Run
```bash
node shared/creative-engine/cli.js --resume output/my-run_12345/
```

## Programmatic API

```javascript
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
```

## Configuration Reference

### Root Options
- `projectName` (string, required): Slug for the project.
- `outputDir` (string, optional): Override default output directory.
- `cleanupOutput` (boolean, default: true): Delete temp files after completion.
- `outputRetention.keepSuccessfulRuns` (number, default: 2): How many old runs to keep.

### Image Configuration (`imageConfig`)
- `enabled` (boolean, default: false)
- `model` (one of: `Nano Banana 2`, `Imagen 3`, `Imagen 4`)
- `variantCount` (one of: `x1`, `x2`, `x3`, `x4`)
- `aspectRatio` (one of: `9:16`, `16:9`, `1:1`)
- `prompt` (string): Prompt for image generation.
- `referenceImages` (array of strings): Paths to local reference images.
- `selectionPolicy` (one of: `first`, `judge`): How to pick the winner.

### Video Configuration (`videoConfig`)
- `enabled` (boolean, default: false)
- `model` (one of: `Veo 3.1`, `Veo 3.1 - Fast [Lower Priority]`)
- `aspectRatio` (one of: `9:16`, `16:9`, `1:1`)
- `variantCount` (one of: `x1`, `x2`, `x3`, `x4`)
- `subMode` (one of: `Frames`, `Video`): Default is `Frames` for image-to-video.
- `prompt` (string): Prompt for video generation.
- `preferredImage` (number, optional): Explicit selection of an image variant as starting frame.
- `selectionPolicy` (one of: `first`, `judge`): How to pick the winner.

### Audio Configuration (`audioConfig`)
- `enabled` (boolean, default: false)
- `provider` (default: `lyria-3-pro-cdp`)

## Architecture

Config → Engine → Providers → CDP/Flow → Output → Review Gallery

The engine orchestrates multiple providers that communicate with Chrome via the Chrome DevTools Protocol (CDP) to interact with Google's native AI generation flows.

## Cost Model

- **Generation**: Free. Performed via browser automation on Google AI Ultra.
- **Multimodal Judging**: ~$0.001/call. Only triggered if `selectionPolicy: 'judge'` is used (requires `GEMINI_API_KEY`).
- **Cost Tracking**: Integrated `cost-tracker.js` provides token-level usage logs in every `manifest.json`.

## File Structure

- `index.js`: Core engine API.
- `cli.js`: CLI entry point and argument parsing.
- `config.js`: Configuration schema, defaults, and validation.
- `manifest.js`: Manifest saving/loading and run state management.
- `batch.js`: Multi-concept campaign orchestration.
- `resume.js`: Logic for retrying failed or incomplete runs.
- `cost-tracker.js`: Gemini API cost monitoring.
- `providers/`: Specialized drivers for Imagen, Veo, and Lyria.
- `review/`: Local Express server and Gallery UI.
