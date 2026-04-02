# R3 | 4 Social Media Channels, 1 AI Agent

This module is a local rebuild of the original Make.com lesson. The downloaded blueprint remains in `assets/original/News to Social Media roboflow v1.json`, but runtime execution now happens inside this repo through local article records, browser-fetched article context, Gemini-powered multi-platform draft generation, a local Instagram card renderer, and a Blotato publishing seam.

The default AI path is browser-first. It uses the dedicated Chrome session on port `9333` and your logged-in Gemini UI account. No OpenAI API key is required for the local module to generate drafts.

## What works now

- `npm run r3:dry` inspects the original Make blueprint plus the local dataset and writes a plan, manifest, and report.
- `npm run r3` runs the local-first path:
  - load the next article row from a local file,
  - fetch or reuse article text,
  - generate summary plus X/LinkedIn/Facebook/Instagram drafts in Gemini through Chrome,
  - render a local Instagram image asset,
  - write per-platform Blotato-ready queue payloads.

Before running `npm run r3`, make sure the dedicated Chrome profile is open on port `9333` and logged into [Gemini](https://gemini.google.com/app).

## Current blockers

- Live publishing requires `BLOTATO_API_KEY` plus explicit account selectors for each enabled platform.
- The original Bitly and Perplexity providers are translated into local seams, not live integrations.
- Instagram image generation is rebuilt as a local rendered card, not a photorealistic DALL-E image.

## Files

- `config.example.json` shows the default local-first configuration.
- `inputs/sample-articles.json` is a safe sample dataset for local verification.
- `assets/skool/setup-notes.md` preserves the lesson notes from Skool.

## Usage

```bash
npm run r3:dry
npm run r3
node lessons/r3-4-social-media-channels/index.js --config lessons/r3-4-social-media-channels/config.example.json
```
