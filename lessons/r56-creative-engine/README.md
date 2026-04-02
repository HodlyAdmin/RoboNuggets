# R56 | The Antigravity Creative Engine

CDP-first creative media pipeline powered by Google AI Ultra. Zero API keys required.

## Architecture

```
Stage 1: Image Generation  → Gemini (chrome-ai.js) via CDP
Stage 2: Video Generation  → Google Flow / Veo 3.1 (chrome-flow.js) via CDP
Stage 3: Audio Generation  → Lyria 3 Pro (chrome-lyria.js) via CDP
Stage 4: Review Sink       → Airtable (optional, disabled by default)
```

## Prerequisites

- Chrome running with `--remote-debugging-port=9333`
- Logged into a Google AI Ultra account in that Chrome session
- Node.js 20+

## Usage

```bash
# Dry run — logs the plan without consuming resources
npm run r56:dry

# Full pipeline — generates image, video, and audio
npm run r56
```

## Configuration

Edit `config.example.json` to customize:
- **Prompts** for each generation stage
- **Model selection** (Veo 3.1 Fast, Imagen 4)
- **Aspect ratio** (9:16, 16:9, 1:1)
- **Stage enable/disable** flags

## Digital Citizenship

All generated media sessions are automatically named and tagged. Generated chats in the shared Google AI Ultra workspace are cleaned up to avoid polluting the team environment.

## Output

Each run creates a timestamped directory under `output/` containing:
- Generated images, video clips, and audio tracks
- `manifest.json` with full pipeline state and metadata
