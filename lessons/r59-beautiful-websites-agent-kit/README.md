# R59 | Beautiful Websites Agent Kit

This module preserves the original skill kit as a local scaffold inside the repo. It keeps the four-stage pipeline intact while avoiding a hard architectural dependency on Apify or Vercel until we decide to wire those providers in.

## What works now

- `npm run r59:dry` writes the local scaffold plan, manifest, and report.
- `npm run r59` seeds a local workspace with the downloaded kit and workflow docs.
- The original workflow, prompts, and helper files are all available in-repo for the next implementation phase.

## Current blockers

- Live scraping still needs Apify credentials if we follow the original paid path.
- Live deploy still needs Vercel auth.
