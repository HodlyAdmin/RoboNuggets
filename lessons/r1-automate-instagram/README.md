# R1 | Automate Instagram for 365 days

This module is a local rebuild of the original Make.com lesson. The downloaded blueprint remains in `assets/original/Automate Instagram.json`, but runtime execution now happens inside this repo through local state, local data files, local image rendering, and a Blotato-based social publishing adapter.

## What works now

- `npm run r1:dry` inspects the original Make blueprint plus the local dataset and writes a plan, manifest, and report.
- `npm run r1` runs the local-first flow: load records, pick the next record from local state, render a quote card PNG, and submit the post through Blotato when the configured account is connected.
- The original cloud dependencies are translated into local seams:
  - Make counter -> `state/state.json`
  - Google Sheets -> JSON/CSV/TSV dataset provider or Gemini draft generator
  - Dropbox share link -> local image reuse or Chrome-rendered PNG card, then optional Blotato media hosting
  - Instagram post action -> Blotato post creation via API

## Current blockers

- Live posting requires a valid `BLOTATO_API_KEY` plus the target Instagram account connected inside Blotato.
- The currently discovered Blotato key on this laptop does not have `@navalism101` connected, so R1 blocks safely instead of posting to the wrong account.
- If you choose `datasetProvider: "gemini-browser"`, generated quotes should be reviewed before publishing.

## Files

- `config.example.json` shows the default local-first configuration.
- Root `.env.example` now includes `BLOTATO_API_KEY` for live publishing.
- `inputs/sample-quotes.json` is a safe placeholder dataset for local verification.
- `assets/skool/setup-notes.md` and `assets/skool/troubleshooting.md` preserve the lesson notes from Skool.

## Usage

```bash
npm run r1:dry
npm run r1
node lessons/r1-automate-instagram/index.js --config lessons/r1-automate-instagram/config.example.json
```
