# R46 Local Input Files

Drop local raw exports here when using the `local-files` provider.

Supported filenames:

- `meta-ads.json`
- `tiktok.json`
- `instagram.json`
- `youtube-longs.json`
- `youtube-shorts.json`
- `linkedin.json`
- `x-twitter.json`
- `reddit.json`

Supported formats:

- JSON array
- JSON object with an `items` array
- JSON object with a `data` array
- JSON Lines / NDJSON via `.jsonl` or `.ndjson`

These files should contain the raw platform records, not pre-normalized rows. The module will apply the field mappings from the downloaded n8n template and write normalized outputs into `output/.../normalized/`.

