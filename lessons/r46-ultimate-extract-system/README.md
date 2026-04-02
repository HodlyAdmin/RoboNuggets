# R46 | Ultimate Extract System

Local rebuild of the Skool lesson `R46 | Ultimate Extract System (Apify x n8n)`.

This module treats the downloaded Skool template as source material, but runs as a local agent-operated pipeline instead of an n8n workflow.

## What Is Implemented

- The original Skool n8n template is saved locally in `assets/original/ultimate-extract-r46.n8n.json`.
- The lesson wiring is parsed from that template:
  - form fields
  - platform selection filters
  - Apify actor IDs
  - field-mapping transforms
  - Google Sheets target sheet names
- A local execution module now exists with:
  - provider interface
  - `local-files` provider implemented
  - `apify` provider scaffolded behind an adapter
  - local JSON sink implemented
  - Google Sheets sink stubbed as a placeholder
  - manifest, plan, and markdown report outputs

## Why This Design

The original lesson couples three responsibilities together:

1. orchestration in n8n
2. extraction via Apify actors
3. storage in Google Sheets

This rebuild separates those concerns so they can evolve independently:

- providers fetch raw records
- normalizers map raw records using the template's field assignments
- sinks persist the results locally or to future destinations

That keeps Apify optional instead of making it the architectural center of the module.

## Commands

```bash
npm run r46:dry
npm run r46
```

Optional config:

```bash
npm run r46 -- --config lessons/r46-ultimate-extract-system/config.example.json
```

## Default Mode

The module defaults to `local-files`, so it can start without Apify or n8n credentials.

Expected local input files live in `inputs/` and are named by platform:

- `meta-ads.json`
- `tiktok.json`
- `instagram.json`
- `youtube-longs.json`
- `youtube-shorts.json`
- `linkedin.json`
- `x-twitter.json`
- `reddit.json`

Each run writes:

```text
output/<search-term>_<timestamp>/
├── plan.json
├── manifest.json
├── report.md
├── raw/
├── normalized/
└── combined/records.json
```

## Apify Integration

The `apify` provider is scaffolded but intentionally isolated behind an adapter.

To use it later:

1. set `APIFY_TOKEN`
2. switch `provider` or `providerByPlatform` to `apify`
3. verify the adapter end-to-end against your account

No n8n runtime is required.

## Remaining Gaps

- Google Sheets export is still a placeholder sink, not a live integration.
- Apify runs are scaffolded from the lesson template but still need live credentialed verification.
- There is no direct browser-based fallback extractor yet for the eight platforms.

## Lesson Assets

- Setup notes: `assets/skool/setup-notes.md`
- Troubleshooting notes: `assets/skool/troubleshooting.md`
- Original template: `assets/original/ultimate-extract-r46.n8n.json`
- Original asset folder notes: `assets/original/README.md`
- Fidelity audit: `FIDELITY.md`
