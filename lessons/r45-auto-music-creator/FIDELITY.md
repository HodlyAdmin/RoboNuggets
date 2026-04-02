# R45 Fidelity Audit

Updated: April 2, 2026

## Current Verdict

R45 is now a working, economically improved reconstruction of the lesson, but it is not yet proven to be a fully source-faithful recreation.

A repeatable source-aligned baseline is now in place and has been verified live:

- Config fixture: `lessons/r45-auto-music-creator/config.source-baseline.json`
- Local idea fixture: `lessons/r45-auto-music-creator/ideas.source-baseline.json`
- Original sample image: `lessons/r45-auto-music-creator/assets/original/1761859830280q6p3oj3t.png`
- Verified live run: `lessons/r45-auto-music-creator/output/lofi-chill-beats-for-studying_2026-04-02T01-37-30/`

This baseline matters because it gives the repo a stable way to retest R45 against original lesson assets without depending on fresh Gemini generations every time.

## Source Coverage Used So Far

- The logged-in Skool lesson page: `Set up instructions & n8n template packs (R45)`
- The original n8n template JSON unpacked locally at `assets/original/R45 _ Auto Music Creator (by RoboNuggets).json`
- The in-repo rebuild: [README.md](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/README.md)
- Live and dry-run manifests in `lessons/r45-auto-music-creator/output/`

Not yet fully inspected:

- The full lesson tutorial transcript/video walkthrough

Directly inspected from the template JSON:

- the `songRobo AI Agent` system prompt and structured output contract
- the exact Kie Suno request payload, including `model: "V5"` and the `styleWeight`, `weirdnessConstraint`, and `audioWeight` values
- the exact Google Sheets logging destinations and fields
- the exact ffmpeg-api combine logic (`1280:720`, looped still image, concatenated audio tracks)

## What The Original Lesson Explicitly Used

From the Skool lesson page:

- `n8n` orchestration
- `OpenAI API key`
- `Kie AI API`
- `Suno directly at Kie` (`https://kie.ai/suno-api`)
- `FFMPEG API`
- `Google Sheets` template
- An `Ideator GPT`
- Attached resource files including:
  - `Sample Image you can use`
  - `R45 | Auto Music Creator template`

The Skool page metadata also exposes the exact attachment filenames:

- `Sample Image you can use`
  - `file_id`: `f17f007da09f4da48dbcdbf07da9c23a`
  - `file_name`: `1761859830280q6p3oj3t.png`
  - `file_content_type`: `image/png`
- `R45 | Auto Music Creator template`
  - `file_id`: `de38f4bc7d3b4a2b8ea996ff8275852d`
  - `file_name`: `R45 _ Auto Music Creator (by RoboNuggets).json`
  - `file_content_type`: `application/json`

## What The Rebuild Uses Now

- Local Node.js orchestration instead of n8n
- Gemini or local intake for concept creation
- Local Suno hybrid wrapper instead of Kie-hosted Suno API
- Local ffmpeg instead of FFMPEG API
- Local JSON manifest instead of Google Sheets

## Original Workflow Shape

The attached n8n template shows this sequence:

1. `Form Trigger`
   Collect `Theme`, `Describe the music`, `How many songs?`, and `instrumental`
2. `Create Folder` on FFMPEG API
3. `Path for Img` -> `Get Img Data` -> `Upload Img` -> `Check Img`
4. `songRobo AI Agent`
   Uses OpenAI `gpt-4.1` plus a structured output parser to return `songs[]` with `prompt`, `style`, and `title`
5. `Split Out` the generated songs
6. `Create Songs`
   POST to `https://api.kie.ai/api/v1/generate` using Suno model `V5`
7. `Wait` 15 minutes
8. `Get Songs` -> `Switch`
   Poll `generate/record-info` until `SUCCESS`
9. `Log songs`
   Append theme/title/duration/song_url to Google Sheets
10. `Path for Songs` -> `Get Song Data` -> `Upload Songs` -> `Check Songs`
11. `Aggregate` -> `FFMPEG` code node -> `Combine`
   Render final `1280:720` video with a looping still image
12. `🟢 FINAL VIDEO`
   Append final video URL to Google Sheets
13. Optional `YouTube` upload existed but was disabled

## Prompt Contract Comparison

The original template contract is now directly inspected, not inferred.

What the original `songRobo AI Agent` explicitly required:

- output JSON with `songs[]`
- each song includes `prompt`, `style`, `title`
- title should be short and creative
- style should enrich the user's description, not just repeat it
- if `instrumental = false`, `prompt` must be lyrics only
- no lyric section labels like `Verse`, `Intro`, `Chorus`, `Bridge`
- if the user requests a song length, lyrics should roughly match that duration
- if the song is instrumental, the prompt should mention the requested duration instead

Current rebuild status:

- **Aligned**: `prompt-generator.js` now mirrors the same vocal/instrumental split, the no-section-label rule, and the duration-hint behavior.
- **Aligned**: the rebuild still returns song concepts centered on `title`, `prompt`, and `style`.
- **Economically adapted**: concept generation is now provider-swappable (`gemini`, `saved-concepts`, `local-intake`) instead of hard-wired to OpenAI `gpt-4.1`.
- **Difference to remember**: the original template allowed much larger `prompt` payloads via Kie/OpenAI than direct Suno UI reliably tolerates, so the rebuild intentionally compacts instrumental Suno descriptions before submission.

## Kie Suno Request Comparison

The original `Create Songs` node sent:

- `prompt`
- `style`
- `title`
- `customMode: true`
- `instrumental`
- `model: "V5"`
- `styleWeight: 0.65`
- `weirdnessConstraint: 0.65`
- `audioWeight: 0.65`

Current rebuild status:

- **Aligned in spirit**: the rebuild still submits `prompt`, `style/tags`, `title`, and instrumental mode to Suno.
- **Adapted**: the rebuild now uses the local wrapper model override (`sunoModel`) instead of the original Kie-only `V5` parameter.
- **Not one-to-one**: the Kie-specific knobs `styleWeight`, `weirdnessConstraint`, and `audioWeight` are not part of the current local wrapper contract.
- **Current judgment**: this is an acceptable economic adaptation, but it remains one of the clearest ways the rebuild is not an exact source-faithful recreation yet.

## Logging / Output Comparison

The original lesson logged:

- per-song rows into a `Songs` Google Sheet with `theme`, `title`, `duration`, `song_url`
- a final row into a `Videos` Google Sheet with `timestamp`, `theme`, `final_video`

Current rebuild status:

- **Outcome preserved**: the rebuild records the equivalent run information in `manifest.json`
- **Adapted**: logging is local JSON instead of shared Google Sheets
- **Better for this repo's goals**: local manifests are cheaper and easier to version/audit, but they are still a source-stack deviation

## High-Confidence Alignment

- The lesson outcome is preserved: create themed music tracks, package them, and keep run records.
- Suno remains the core music engine target.
- Prompt-driven album generation is still the central workflow.
- A reusable still-image input is still part of the pipeline.
- The rebuild now defaults the video output toward the original `1280:720` landscape shape.
- The rebuild now supports an explicit `songLengthHint`, which is consistent with the original lesson note about duration requests.

## Intentional Economic Deviations

- `n8n` was replaced with a local script runner to avoid webhook/cloud dependency.
- `Kie AI` Suno access was replaced with a local browser-backed Suno wrapper.
- `FFMPEG API` was replaced with local ffmpeg binaries.
- `OpenAI` dependence is now optional rather than mandatory.

These are acceptable if the goal is economic viability, but they are still deviations from the exact lesson stack.

## Custom GPT Assessment

The Skool resource named `Ideator and Timestamp GPT for R45` appears to be a ChatGPT custom GPT resource, not a Gemini Gem.

- The public GPT page is visible, but its internal instructions are not exposed directly from the public shell.
- The original n8n template already contains the core ideation contract and prompt rules for `prompt`, `style`, `title`, instrumental behavior, and duration hints.
- Current conclusion: the custom GPT is useful as a reference resource, but it is not a blocker for reconstructing the lesson because the template JSON already exposes the main prompt contract we need.

## Adaptation Assessment

Changes that are correctly adapted for this repo's goals:

- Replacing `Kie AI` with the local Suno hybrid wrapper preserves the Suno outcome while removing pay-as-you-go dependency.
- Replacing `FFMPEG API` with local ffmpeg preserves the combine step while reducing cost and external coupling.
- Replacing Google Sheets with `manifest.json` preserves observability in a more local-friendly way.
- Keeping concept generation provider-swappable matches the project's broader goal of tool substitution based on economics.

Changes that needed source-informed tightening:

- The original workflow rendered a fixed `1280:720` landscape video, so the rebuild now defaults to that resolution.
- The original prompt agent had explicit rules for vocal songs and duration hints, so the rebuild now supports `songLengthHint` and stronger vocal/lyrics behavior in concept generation.

Remaining differences that are still acceptable but should be remembered:

- The original workflow was form-driven and accepted an uploaded landscape image; the rebuild is config-driven and uses `coverImagePath`.
- The original workflow logged to shared services; the rebuild logs locally.
- The original workflow used Kie-specific Suno request parameters (`styleWeight`, `weirdnessConstraint`, `audioWeight`) that are not part of the current local Suno wrapper contract.
- Direct Suno creation can reject overly long description-style prompts even when the old Kie/OpenAI path tolerated much longer instructions, so the rebuild now keeps instrumental Suno descriptions intentionally compact.

## Fidelity Risks Still Open

- The full lesson video may reveal operator guidance, quality heuristics, or timing assumptions that the template JSON alone does not capture.
- The attached Google Sheet and Ideator GPT may define review habits or formatting expectations that are not fully mirrored one-to-one.
- The lesson may rely on Kie-specific Suno behavior that differs from direct Suno generation.

## Next Source-Faithful Step

Use the YouTube tutorial / lesson video to compare:

1. spoken workflow intent
2. operator expectations and quality gates
3. how much the lesson relied on Kie-specific Suno behavior in practice
4. whether the rebuild should be labeled:
   - `source-faithful recreation`, or
   - `economically optimized alternative implementation`
