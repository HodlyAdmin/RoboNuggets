# R2 | Create & Schedule 100 YouTube Shorts

This module is a local rebuild of the original Make.com lesson. The downloaded blueprint remains in `assets/original/Quotes - YT Shorts v1.json`, but runtime execution now happens inside this repo through local quote inputs or Gemini transcript extraction, local audio generation, local ffmpeg video assembly, and an optional Blotato YouTube publisher.

## What works now

- `npm run r2:dry` inspects the original Make blueprint plus the selected local data source and writes a plan, manifest, and report.
- `npm run r2` runs the credential-free local path by default:
  - load quote records from a local JSON/CSV/TSV file,
  - generate voiceover audio with macOS `say`,
  - render a vertical short with the downloaded background video and burned subtitles,
  - queue a Blotato-ready draft payload locally.
- `datasetProvider: "gemini-transcript"` can also turn a local transcript into quote records through the logged-in Gemini web app in Chrome.

## Current blockers

- Live YouTube publishing requires `BLOTATO_API_KEY` plus an explicit connected YouTube account selector in the config.
- The ElevenLabs and JSON2Video integrations are scaffolded but intentionally left behind provider interfaces so the module can run without those credentials.
- The local ffmpeg renderer uses a full-quote subtitle overlay, not word-timed caption animation like the original JSON2Video template.

## Files

- `config.example.json` shows the default local-first configuration.
- `inputs/sample-quotes.json` is a safe sample dataset for local verification.
- `inputs/sample-transcript.txt` is a transcript-shaped input for Gemini extraction tests.
- `assets/skool/setup-notes.md` and `assets/skool/troubleshooting.md` preserve the lesson notes from Skool.

## Usage

```bash
npm run r2:dry
npm run r2
node lessons/r2-create-schedule-youtube-shorts/index.js --config lessons/r2-create-schedule-youtube-shorts/config.example.json
```
