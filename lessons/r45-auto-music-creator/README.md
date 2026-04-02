# R45 | Auto Music Creator

**Original**: [Skool Lesson](https://www.skool.com/robonuggets/classroom/e3a5624c) | [YouTube Tutorial (24:15)](https://www.youtube.com/watch?v=iDyWynoM4o0)

## Status: Repaired Hybrid-API Pipeline

This lesson now has a consistent local runtime again. The standard path is the local `suno-api` hybrid wrapper, with direct browser/CDP drivers kept as fallback engines instead of being the lesson-facing contract.

## What Changed

The original lesson uses **n8n** as the orchestrator. This rebuild replaces n8n with a **local Node.js pipeline** that uses the Gemini API for concepts, a local Suno hybrid wrapper as the standard music engine, and local ffmpeg for final assembly.

| Original | This Build | Cost |
|----------|-----------|:---:|
| n8n automation | **Autonomous Node.js pipeline** | Free |
| OpenAI GPT (custom) | **Gemini API helper** | API key |
| Suno v5 via Kie AI API | **Local Suno hybrid API wrapper** | Free |
| FFMPEG API (cloud) | **Local ffmpeg** | Free |
| Google Sheets logging | Local JSON manifest | Free |
| API keys required | **Optional Gemini only** | Optional |

The original lesson assets are now preserved locally:
- Template JSON: [R45 _ Auto Music Creator (by RoboNuggets).json](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/assets/original/R45%20_%20Auto%20Music%20Creator%20(by%20RoboNuggets).json)
- Sample image: [1761859830280q6p3oj3t.png](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/assets/original/1761859830280q6p3oj3t.png)
- Workflow audit: [FIDELITY.md](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/FIDELITY.md)
- Source-baseline config: [config.source-baseline.json](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/config.source-baseline.json)
- Source-baseline intake fixture: [ideas.source-baseline.json](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/ideas.source-baseline.json)

## Quick Start

```bash
# 1. Choose a concept source:
#    - Gemini: set GEMINI_API_KEY in .env
#    - Local intake: set ideaIntakePath or ideaSeeds in config
#    - Saved concepts: set songConceptsPath in config

# 2. Start the local Suno wrapper
npm run suno-wrapper:dev

# 3. For `suno-api`, make sure the wrapper is configured with your Suno cookie/session.
#    If Wingman mode is triggered, resolve the Suno/Google prompt in the browser and let the wrapper resume.
#    If using the direct `lyria` or `suno` engines, start Chrome with remote debugging on port 9333.

# 4. Pre-flight check
npm run r45:validate

# 5. Run the full pipeline
npm run r45
```

## How It Works

```
1. Concept provider → Gemini, saved concepts, or local intake     [prompt-generator.js]
2. Suno hybrid wrapper → Generate tracks via local HTTP API       [api-suno.js]
   └─ Wrapper internals handle session renewal, token hitching, and Wingman fallback
3. Alternate engines → Lyria or direct Suno browser paths         [chrome-lyria.js] / [chrome-suno.js]
4. Local ffmpeg → Combine cover image + audio → album video       [ffmpeg.js]
5. Gemini API → YouTube timestamps + description                  [api-gemini.js]
6. manifest.json → Save all data locally                          [manifest.js]
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run r45` | **Full production run** — concepts → music → video → timestamps |
| `npm run r45:dry` | Dry run — test concept loading/generation only (no music/video) |
| `npm run r45:validate` | Pre-flight check — Gemini key, wrapper reachability, engine prerequisites, ffmpeg |
| `npm run r45:build` | Re-assemble video from existing audio + manifest |
| `npm run r45:clean` | Archive stale output runs and remove empty/noise folders |
| `npm run r45:source:inspect` | Inspect the logged-in Skool lesson resources for R45 |
| `npm run r45:source:download -- "R45 | Auto Music Creator template"` | Download a named R45 source asset from Skool into `assets/original/` |
| `npm run r45 -- --config lessons/r45-auto-music-creator/config.source-baseline.json` | Run the repeatable source-aligned baseline using the original sample image |
| `npm run r45 -- --config path/to/config.json` | Use custom config |

## Config Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `theme` | string | `"Lofi Chill Beats for Studying"` | Album theme/title |
| `musicStyle` | string | `"lofi hip hop, chill, ambient, jazz piano, soft drums"` | Genre/style description |
| `numSongs` | number | `5` | Number of songs to generate (1-20) |
| `instrumental` | boolean | `true` | Instrumental or vocal |
| `songLengthHint` | string | `""` | Optional duration target like `"around 2 minutes"` |
| `conceptProvider` | string | `"auto"` | `"auto"`, `"gemini"`, `"saved-concepts"`, or `"local-intake"` |
| `coverImagePath` | string | `"./assets/cover.png"` | Path to the still image used for video generation |
| `videoResolution` | string | `"1280:720"` | Target final video size, matching the original lesson's landscape output |
| `engine` | string | `"suno-api"` | `"suno-api"`, `"lyria"`, `"suno"`, or `"suno-cdn"` |
| `sunoApiBaseUrl` | string | `"http://127.0.0.1:3000"` | Base URL for the local Suno hybrid API wrapper |
| `sunoModel` | string | `""` | Optional Suno model override passed through to the wrapper |
| `songConceptsPath` | string | `""` | Optional saved manifest/concepts file to bypass Gemini song-concept generation |
| `ideaIntakePath` | string | `""` | Optional TXT/JSON intake file for fresh local concepts without Gemini |
| `ideaSeeds` | array | `[]` | Optional inline idea seeds for fresh local concepts without Gemini |
| `skipTimestamps` | boolean | `false` | Skip Gemini YouTube timestamp generation |
| `cleanupOutput` | boolean | `true` | Automatically tidy `output/` before dry/live runs |
| `outputRetention` | object | see example | Visible run counts to keep before older runs move to hidden archive |
| `sunoSongIds` | string[] | `[]` | Song IDs for `suno-cdn` engine |

With `conceptProvider: "auto"`, concept source priority is:
`songConceptsPath` -> `ideaIntakePath` / `ideaSeeds` -> Gemini

## Intake Modes

Use one of these when the tool needs to keep producing new albums instead of replaying one old manifest:

- `songConceptsPath`: reuse an existing manifest or concepts JSON exactly as-is.
- `ideaIntakePath`: point to a local text or JSON file of fresh ideas and let R45 expand them into song concepts without Gemini.
- `ideaSeeds`: keep the fresh ideas inline in config when you want a self-contained run file.
- Gemini: use the API path when you want full AI concept generation and have quota available.

Example local intake file: [ideas.example.txt](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/ideas.example.txt)

## Source Baseline

Use [config.source-baseline.json](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/config.source-baseline.json) when you want a repeatable R45 baseline that stays close to the original lesson shape while still using the repo's economic substitutions.

- Uses the original Skool sample image.
- Uses a structured local intake fixture instead of needing Gemini every run.
- Pins the Suno wrapper path with `chirp-v3-5`.
- Skips YouTube timestamps so the test isolates concepts -> Suno -> video.
- Keeps instrumental Suno descriptions compact enough to avoid the live `Description is too long` failure.

## Engine Options

| Engine | How it works | Status |
|--------|-------------|--------|
| `suno-api` | Calls a local Suno wrapper HTTP service with Wingman fallback | **Standard** ✅ |
| `lyria` | CDP interceptor traps Lyria 3 Pro audio off-wire | Alternate engine |
| `suno` | Agent navigates suno.com and downloads the generated audio | Direct browser fallback |
| `suno-cdn` | Direct MP3 download by song ID | Fallback (needs known IDs) |

## Output

```
output/<album-slug>_<timestamp>/
├── audio/          # Generated tracks (.mp3 from Suno API, .mp4 from Lyria)
├── video/          # Album video (still image + concatenated tracks)
└── manifest.json   # Complete run data (v2.0 — tracks, timing, errors)

output/.archive/
└── ...             # Older failed/dry/test runs moved out of the main folder view
```

## Error Handling

- **Per-track retry**: Each track gets up to 3 attempts before being marked failed
- **Track isolation**: A failed track doesn't crash the album — remaining tracks continue
- **Inter-track cooldown**: 15s between tracks to avoid Gemini rate limits
- **Graceful degradation**: If all tracks fail, manifest is still saved with error details
- **Video assembly safety**: Files are validated (existence + size) before ffmpeg runs
- **Single-run lock**: R45 refuses overlapping live runs on the same machine and auto-recovers stale lock files from dead processes
- **Saved-concept mode**: Repeated Suno tests can bypass Gemini entirely with `songConceptsPath`
- **Local intake mode**: Fresh ideas can come from `ideaIntakePath` or `ideaSeeds` without Gemini
- **Timestamp opt-out**: `skipTimestamps=true` keeps Gemini quota issues from weakening the core Suno/video pipeline
- **Automatic housekeeping**: dry/live runs now archive stale output folders into `output/.archive/`, remove empty timestamp folders, and scrub `.DS_Store` noise before creating a new run
- **Original workflow parity improvements**: concept generation now supports an explicit `songLengthHint`, and video assembly defaults to `1280:720` landscape output to stay closer to the original lesson template
- **Suno prompt guardrail**: local-intake instrumental prompts are compacted, and the Suno engine enforces a final 180-character description cap to avoid the live Suno UI rejecting prompts as too long

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Chrome is not reachable on port 9333` | Start Chrome with `--remote-debugging-port=9333` |
| `GEMINI_API_KEY is missing` | Add `GEMINI_API_KEY` to `.env` |
| `No concept source available` | Provide one of: `GEMINI_API_KEY`, `songConceptsPath`, `ideaIntakePath`, or `ideaSeeds` |
| `Another R45 run is already active` | Wait for the existing live run to finish, or kill the stale PID if it is genuinely dead |
| `Suno wrapper API is not reachable` | Start the wrapper with `npm run suno-wrapper:dev` |
| `Wrapper enters Wingman mode` | Switch to the browser, solve the login/CAPTCHA/credit issue, and let the run resume |
| `Failed to click Create Music option` | Log into gemini.google.com and verify the Lyria UI is available |
| `CDP network interceptor failed to trap` | Lyria or Suno may have changed their response format — check Chrome DevTools Network tab |
| `Failed to connect to Suno API Wrapper` | Start the local wrapper service or verify `config.sunoApiBaseUrl` |
| `ffmpeg exited with code 1` | Check that cover.png is a valid image file |
| `Could not parse JSON from response` | Gemini response format changed — check prompt-generator.js |
