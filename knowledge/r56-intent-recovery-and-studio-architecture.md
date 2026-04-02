# R56 Intent Recovery & Creative Studio Architecture

*Created: 2026-04-02 — Source: Opus deep-analysis pass*
*Updated: 2026-04-02 — Deep source-artifact line-by-line comparison (Claude Opus planner pass)*
*Updated: 2026-04-02 — Transcript/video-derived pass: YouTube auto-caption extraction from `https://youtu.be/P5kofOFEaBo` — previously open spoken-workflow questions resolved at the auto-caption tier*

This document serves two purposes:

1. **Recover the true human workflow intent** for R56 from all available source artifacts (template pack, CLAUDE.md, setup notes, prompt-best-practices, original Python tool code, video timestamps)
2. **Recommend how R56 should evolve** into a generalized creative-studio pattern for Flow wrapper design, multimodal hero selection, and digital citizenship

---

## Part 1: R56 Human Workflow Intent Recovery

### Source Artifacts Analyzed

| Source | Location | Weight |
|--------|----------|--------|
| Original `CLAUDE.md` (16.8KB agent instructions) | `assets/original/creative-engine-template/CLAUDE.md` | **Primary** — the operational contract |
| Original `README.md` (5.5KB setup guide) | `assets/original/creative-engine-template/README.md` | **Primary** — first-run experience |
| Prompt best practices (21KB) | `assets/original/.../references/docs/prompt-best-practices.md` | **Primary** — prompt engineering contract |
| Video timestamps from Skool page | `assets/skool/setup-notes.md` | **Secondary** — structural outline |
| Original Python tools (~60KB total) | `assets/original/.../tools/` | **Primary** — runtime behavior contract |
| Kie AI API reference | `assets/original/.../references/docs/kie-ai-api.md` | Supporting |
| Reference input media (14 files) | `assets/original/.../references/inputs/` | Supporting — proves sample content |

### The True 7-Workflow Architecture

The original lesson is **not just a 3-stage pipeline**. It teaches a 7-workflow architecture:

#### Workflow 0: Reference Video Analysis (Optional)
- **Intent**: Before writing any prompts, the human can drop reference videos into `references/inputs/` and Claude/Antigravity analyzes them via Gemini 2.0 Flash + Files API.
- **Output**: An 11-field structured analysis (hook, person, setting, camera, product interaction, pacing, tone, dialogue, audio, authenticity score, prompt notes).
- **Human gate**: The analysis summary is shown to user before any prompts are written.
- **Rebuild gap**: **Completely absent from current R56 rebuild.** The rebuild has no reference-video analysis step.

#### Workflow 1: Image Prompt Writing + Airtable Staging
- **Intent**: The agent gathers product name, reference photos, variation count, style preferences, model choice, aspect ratio, resolution, and variations-per-record from the human.
- **Key detail**: Reference images are uploaded to Kie.ai for hosted URLs OR passed as local paths to Google.
- **Airtable**: Records created with `Image Prompt`, `Reference Images` (attachments), and `Image Status: Pending`.
- **Human gate**: User reviews and sets status to Approved or Rejected in Airtable.
- **Rebuild status**: The local rebuild generates images directly from config prompts. The Airtable staging and human approval loop is optional/disabled.

#### Workflow 2: Image Generation Execution
- **Intent**: Agent reads all `Pending` records from Airtable, generates `num_variations` (1 or 2) image variants per record, uploads results back to Airtable.
- **Key details**:
  - Google provider is **synchronous** (no polling)
  - Kie AI provider is **asynchronous** (submit → poll)
  - Mixed-provider batches are supported (some records Google, others Kie)
  - Auto-detects aspect ratio from prompt prefix (`9:16. ...`)
  - Mandatory cost confirmation before batch execution
- **Rebuild status**: Config-driven single-prompt generation. No batch, no mixed providers, no cost confirmation gate.

#### Workflow 3: Video Prompt Writing + Approval
- **Intent**: For each **approved** image, the agent writes video prompts with model-specific formatting:
  - **Veo 3.1**: Natural sentence with dialogue in quotes
  - **Kling 3.0 / Sora 2 Pro**: Structured YAML-style fields (`dialogue:`, `action:`, `camera:`, `emotion:`, `voice_type:`)
- **Human gate**: User reviews video prompts in Airtable before generation.
- **Key detail**: The lesson explicitly teaches two different prompt formats for two provider categories.
- **Rebuild gap**: Current rebuild only uses the Veo natural-sentence format. Structured Kling/Sora prompts are not represented.

#### Workflow 4: Video Generation Execution
- **Intent**: Agent reads `Pending Video` records, submits with image-as-start-frame, polls for completion, uploads results to Airtable.
- **Key details**:
  - `preferred_image` parameter lets user choose which generated image variant becomes the video start frame
  - Multi-provider batch: one batch can mix Veo, Kling, and Sora records
  - WaveSpeed AI as an explicit backup provider for Kling/Sora
  - Duration is configurable per model (4-8s for Veo, 3-15s for Kling, 10-15s for Sora)
  - Sound can be enabled for Kling 3.0
- **Rebuild status**: Single-video generation through Flow CDP. `videoConfig.preferredImage` now restores a source-faithful 1-based override for which generated image becomes the video start frame, but there is no separate review UI. No multi-provider. No Kling/Sora path.

#### Workflow 5: Cost Awareness (Mandatory)
- **Intent**: The lesson makes cost confirmation a **hard rule**: never generate without showing exact cost breakdown and getting explicit user confirmation.
- **Key detail**: Cost is calculated per-unit by model and provider. Separate confirmation for image and video batches.
- **Rebuild gap**: The rebuild uses zero-credit Flow, which makes this less critical — but the pedagogical intent (cost discipline) is absent from the current contract.

#### Workflow 6: Multi-Scene Videos
- **Intent**: For longer content, the lesson teaches splitting across multiple clips with continuous dialogue flow. Brand name only in scene 1.
- **Rebuild gap**: Not represented in current rebuild.

### The True Prompt Engineering Contract

The original lesson includes a comprehensive **445-line prompt best practices document** that teaches:

1. **Standard UGC structure** — 7-field structured prompts for casual, authentic content
2. **SEALCaM framework** — 6-element cinematic prompting (Subject, Environment, Action, Lighting, Camera, Metatokens) for hero shots and brand films
3. **BOPA consistency framework** — Backgrounds, Outfits, Poses, Angles for multi-image character consistency
4. **Text/Product fidelity rules** — Packaging text as a standalone directive, not buried in style instructions
5. **Dialogue/Script craft** — 150-char cap, conversational tone, category-specific dialogue patterns
6. **Reference image analysis** — YAML-style extraction of product and character attributes before prompting

**Rebuild gap**: The current rebuild uses a single prompt per stage from config. The pedagogical richness of the original prompt engineering contract is not captured in the rebuild's runtime or documentation.

### What The Rebuild Gets Right

Despite the gaps above, the rebuild accurately captures several core intents:

| Intent | Status |
|--------|--------|
| Image → Video pipeline structure | ✅ Correct |
| Reference images uploaded before generation | ✅ Correct |
| Generated image becomes video start frame | ✅ Correct |
| UGC-style prompt tone (amateur iPhone, casual framing) | ✅ Correct |
| Dialogue embedded in video prompts | ✅ Correct |
| Zero-cost path preferred | ✅ Correct (economic adaptation) |
| Digital citizenship (project naming) | ✅ Correct |
| Aspect ratio control | ✅ Correct |
| Audio generation as optional extension | ✅ Correct (original didn't include audio separately) |

### What The Rebuild Gets Wrong or Misses

| Gap | Severity | Description | Current Status |
|-----|----------|-------------|----------------|
| No reference video analysis | Medium | Workflow 0 is entirely absent | Unchanged |
| No Airtable approval gates | Medium | The human-in-the-loop review surface is disabled by default | Accepted adaptation |
| No multi-provider routing | Medium | Original teaches Google + Kie + WaveSpeed; rebuild is Flow-only | Accepted adaptation |
| No cost confirmation gate | Low | Zero-credit Flow makes this less relevant | Resolved by `requireZeroCredits` |
| No batch generation | Medium | Original generates N variations × M records; rebuild is single-shot | Accepted adaptation |
| Preferred-image selection only partially restored | Medium | User can now choose which variant becomes video start frame via `videoConfig.preferredImage` (template evidence: `video_gen.py` L30-48), but there is no separate review UI | Reduced |
| No structured Kling/Sora prompts | Low | Only matters if non-Google video providers are re-enabled | Accepted adaptation |
| No prompt best practices integration | Medium | 445-line prompt guide not surfaced to lesson user at runtime | Unchanged |
| No multi-scene video support | Low | Future enhancement | Unchanged |
| No video analysis module | Medium | Gemini Files API video analysis not represented (442-line `video_analyze.py` + 2 sample videos in template) | Unchanged |
| Hero selection across variants | High | ~~Pipeline grabs first result~~ Now has `shared/hero-selection.js` with 4 policies | **Partially Live-Verified** (`judge` + `manual` each proven once) |
| Single variant per stage | High | Original defaults to 2 variations; video `x2` proven once, image still often yields 1 | **Partially Improved** |

### Transcript Gap Assessment (RESOLVED — Auto-Caption Pass)

The following questions were resolved via YouTube auto-caption extraction from the unlisted video at `https://youtu.be/P5kofOFEaBo` (2026-04-02).

| # | Question | Timestamp | Answer (Auto-Caption-Derived) |
|---|----------|-----------|-------------------------------|
| 1 | What framing does the instructor give? | 00:00–00:31 | "Creative AI assistant" — trains on best practices, generates while you sleep. Later: "Creative Dark Factory" where "you are the director." |
| 2 | How does the instructor motivate multi-provider? | 00:31–02:39 | Pain points: complex prompts, manual repetition, n8n/Wave "spaghetti of nodes," model-update breakage, workflow inflexibility |
| 3 | What is the live demo sequence? | 02:39–08:24 | Cross-model prompting: "create 10 ads for this lipstick brand using GPT Image 1.5 and Nano Banana Pro" with Airtable as the review surface |
| 4 | Does the instructor add a provider live? | 08:24–12:13 | Shows the `providers/` folder, explains wrapper pattern as "future-proof" — teaches it as Advantage 2 |
| 5 | Multi-agent: batch or orchestration? | 12:13–15:58 | Parallel subagents: "One browser profile can handle image generation, while another handles video and a third updates Airtable" |
| 6 | Advantage 4? | 15:58–17:28 | Memory and Context: "it remembers all my choices" + style guide stored in agent memory |
| 7 | Advantage 5? | 17:28–20:18 | Building for the Future / CREATE framework: local files sync with agent's mental model |
| 8 | Does setup match README? | 20:18–22:27 | Yes — clone, .env, Airtable base, verify script |
| 9 | Prompt best practices emphasis? | Throughout | Significant: "like having a master prompter consulting on every prompt" |

**Remaining limitation**: These are auto-generated captions, not a human-verified transcript. Technical terms were corrected using template cross-reference (e.g., "Cling" → "Kling"), but colloquial speech and exact phrasing are approximate. Visual-only elements of the demo cannot be captured from captions alone.

**Recommendation**: A full video playback with visual analysis (e.g., via Gemini video passthrough) would capture screen-share content, UI interactions, and visual-only demo elements. The auto-caption pass covers all spoken content.

---

## Part 2: Creative Studio Architecture Recommendations

### 2A: Flow Wrapper Design

#### Current State
`shared/chrome-flow.js` is a 572-line monolithic CDP driver that handles:
- Chrome connection
- Flow workspace navigation
- Project creation
- Settings tray manipulation (media type, model, aspect ratio, sub-mode, variant count, zero-credit enforcement)
- Reference image upload
- Prompt injection
- CDP network interception for media capture
- DOM fallback extraction
- Digital citizenship (project naming)

This is a **single-function-does-everything** pattern. It works, but it means every lesson embeds knowledge of Flow's UI structure.

#### Recommended Architecture

```
┌──────────────────────────────────────────────┐
│  Lesson Config (intake/config driven)        │
│  aspectRatio, subMode, variantCount, model,  │
│  requireZeroCredits, candidateCount          │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│  flow-wrapper (local service boundary)       │
│                                              │
│  Stable API:                                 │
│    start-job(prompt, config) → jobId         │
│    get-status(jobId) → status + progress     │
│    get-artifacts(jobId) → [mediaPath, ...]   │
│    get-candidates(jobId) → [{path, meta}...] │
│    cleanup(jobId) → void                     │
│                                              │
│  Internal:                                   │
│    CDP driver (current chrome-flow.js)       │
│    State persistence (job tracking)          │
│    Retry policy                              │
│    Timeout management                        │
└────────────────┬─────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────┐
│  Chrome CDP (port 9333)                      │
│  Google Flow web UI                          │
└──────────────────────────────────────────────┘
```

#### Key Design Decisions

1. **Job-oriented, not request-oriented**: A job ID persists across the full lifecycle (submit → poll → extract → cleanup). This enables resumption after crashes.

2. **Candidate-aware**: When `variantCount` is `x2` or `x4`, `get-candidates()` returns all variants with metadata. The lesson or quality gate chooses the winner.

3. **State file**: Each job writes a `{jobId}.state.json` in a scratch directory. This enables:
   - Resume-after-crash
   - Audit trail
   - Cleanup of stale jobs

4. **Settings should not leak**: The wrapper accepts structured config (`{ aspectRatio, subMode, model, ... }`) and translates to UI interactions internally. Lessons never manipulate Flow's UI directly.

5. **Media extraction contract**: The wrapper guarantees that `get-artifacts()` returns local file paths to saved media. The lesson never sees CDH interception, DOM extraction, or fallback logic.

6. **Do not fake a REST API**: Flow is browser-only. The wrapper should be a Node module with a stable `import` interface, not a pretend HTTP server. If a server boundary is needed later (e.g., for n8n), wrap the module in an Express endpoint at that point.

#### Migration Path

1. Extract the current `generateFlowMedia()` into `shared/flow-wrapper/driver.js`
2. Add `shared/flow-wrapper/index.js` with the stable API surface
3. Add `shared/flow-wrapper/state.js` for job persistence
4. Update `lessons/r56-creative-engine/providers/image-generator.js` and `video-generator.js` to use the wrapper instead of `chrome-flow.js` directly
5. Keep `chrome-flow.js` as a re-export shim for backward compatibility during migration

### 2B: Multimodal Hero Selection

#### The Problem

The original lesson generates 2 variations per record. The rebuild generates 1 and keeps it unconditionally. Neither system asks: *"Is this the best output?"*

#### Proposed Architecture

```
┌─────────────────────────────────────────┐
│  Hero Selection Gate                     │
│                                          │
│  Inputs:                                 │
│    - Original prompt (text)              │
│    - Reference images (if any)           │
│    - Candidate media files [{path, ...}] │
│    - Selection policy (from config)      │
│                                          │
│  Outputs:                                │
│    - heroPath (selected winner)          │
│    - heroIndex (which candidate)         │
│    - confidence (0.0–1.0)                │
│    - reason (why this one won)           │
│    - fallback: 'manual-review'           │
│                                          │
│  Selection Policies:                     │
│    - 'first' — grab candidate 0          │
│    - 'random' — random choice            │
│    - 'judge' — multimodal evaluation     │
│    - 'manual' — always route to human    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Judge Module (pluggable)                │
│                                          │
│  Default: Gemini multimodal evaluation   │
│  Contract:                               │
│    judge(prompt, candidates[]) →         │
│      { winner, confidence, reasoning }   │
│                                          │
│  Evaluation Criteria:                    │
│    - Prompt adherence                    │
│    - Reference fidelity                  │
│    - Technical quality                   │
│    - Text/label accuracy                 │
│    - UGC authenticity (if applicable)    │
└─────────────────────────────────────────┘
```

#### Implementation Notes

1. **Start with `'first'` as default** — that's what the rebuild does today. No regression.
2. **Add `'judge'` as opt-in** — new lesson configs can set `selectionPolicy: 'judge'` to enable multimodal evaluation.
3. **Gemini as default judge** — use `shared/api-gemini.js` in multimodal mode. Pass the prompt text + each candidate image/video. Ask for structured JSON response.
4. **Confidence threshold** — if the judge returns confidence < 0.6, route to `'manual'` review (Airtable row, local file, or terminal prompt).
5. **Manifest recording** — the manifest should include `heroSelection: { policy, winnerIndex, confidence, reason }` per stage.
6. **Do not block on judging for now** — make it async-capable but synchronous by default.

#### Evaluation Prompt Template

```
You are evaluating which AI-generated media candidate best matches the original prompt.

ORIGINAL PROMPT:
{prompt}

REFERENCE IMAGES PROVIDED: {yes/no + descriptions if yes}

CANDIDATES: {N} files attached

For each candidate, evaluate:
1. Prompt Adherence (0-10): Does it match what was requested?
2. Reference Fidelity (0-10): Does it preserve reference content accurately?
3. Technical Quality (0-10): Resolution, artifacts, consistency
4. Text Accuracy (0-10): Are product labels/text preserved correctly?
5. Authenticity (0-10): Does it feel like genuine UGC, not synthetic?

Return JSON:
{
  "winner": <0-indexed candidate number>,
  "confidence": <0.0-1.0>,
  "reasoning": "<one paragraph>",
  "scores": [{ "candidate": 0, "total": N, ... }, ...]
}
```

### 2C: Digital Citizenship in Shared Accounts

#### Current State

The current digital citizenship controls are:
1. ✅ Flow projects are auto-named with a unique slug (`R56_img_...`)
2. ✅ Lyria chats are deleted after media extraction
3. ✅ Local output housekeeping archives stale runs
4. ❌ No provider-side cleanup of Flow projects after extraction
5. ❌ No cleanup of discarded candidate variants in Flow
6. ❌ No shared-account usage log
7. ❌ No Suno project/song cleanup after extraction

#### Recommended Enhancements

##### Tier 1: Immediate (Low-effort, High-impact)

1. **Flow project deletion after extraction**: After `get-artifacts()` returns successfully, the wrapper should offer a `cleanup(jobId)` that navigates back to the project list and deletes the project. This prevents the shared account from accumulating 100+ `R56_img_*` projects.

2. **Candidate pruning**: When hero selection chooses candidate 1 of 2, the un-selected candidate should be logged but can optionally be deleted from the local output to prevent storage sprawl.

3. **Usage log**: Append a line to `shared/.flow-usage.log` (gitignored) with timestamp, project name, model, credit cost, and result. This gives the team visibility into automation activity without needing to check the provider dashboard.

##### Tier 2: Medium-term (Moderate effort)

4. **Suno cleanup**: After track extraction, mark the generated song in Suno's UI as archived or delete it to prevent the shared Suno account from filling with bot-generated tracks.

5. **Rate-limiting awareness**: Track generation frequency per provider and warn when approaching known daily/hourly limits (e.g., Gemini 429s, Flow zero-credit queue depth).

6. **Stale job reaper**: A periodic sweep (or pre-run check) that identifies Flow projects older than N days created by automation and offers to clean them up.

##### Tier 3: Long-term (Studio-grade)

7. **Provider-agnostic cleanup interface**: `shared/cleanup.js` with `cleanupProvider(provider, olderThanDays)` that works across Flow, Suno, Lyria.

8. **Team visibility dashboard**: A simple local HTML report (generated from usage logs) showing generation volume, costs saved, and cleanup status.

9. **Shared account boundary**: If multiple team members run automation simultaneously, job naming should include a user identifier to prevent cross-contamination.

---

## Part 3: Prioritized Action Plan

### Phase 1: Document + Fidelity (No code changes)

1. ✅ Write this analysis document (done)
2. Update R56 `FIDELITY.md` with the recovered intent gaps
3. Update `WORKSTATE.md` to reflect Opus findings

### Phase 2: Flow Wrapper (Architecture)

4. ✅ Introduce `shared/flow-wrapper/` as the lesson-facing seam
5. ✅ Migrate R56 providers to use the wrapper with local job-state persistence
6. Add candidate-aware extraction beyond the current first-artifact contract
7. Extract more of `chrome-flow.js` into wrapper-owned driver/state modules

### Phase 3: Hero Selection (Quality)

8. ✅ Implement selection gate in `shared/hero-selection.js` (4 policies: first, random, judge, manual)
9. ✅ Add `selectionPolicy` and `confidenceThreshold` to R56 config schema (`config.hero-selection.json`)
10. ✅ Wire Gemini multimodal judge via `generateMultimodalJSON` in `shared/api-gemini.js`
11. ✅ Integrate hero selection into `shared/flow-wrapper/index.js` (runs automatically after generation)
12. ✅ Add `selectHeroForJob()` for re-judging existing completed jobs

### Phase 4: Digital Citizenship (Hygiene)

11. Add Flow project cleanup to the wrapper
12. Add usage logging
13. Add candidate pruning

### Phase 5: Transcript Pass (Completed — Auto-Caption Tier)

14. ✅ Extracted YouTube auto-captions from unlisted video `https://youtu.be/P5kofOFEaBo` (full 23:20)
15. ✅ Reconciled transcript findings with template-artifact analysis — all 9 open questions resolved
16. ✅ Updated `FIDELITY.md` to `transcript-derived (auto-caption tier)` — not full `transcript-certified` because the source is auto-generated captions, not a human-verified transcript
17. Saved full transcript notes in `lessons/r56-creative-engine/assets/skool/transcript-notes.md`

---

## Appendix: Mapping Original Workflows to Rebuild Components

| Original Workflow | Original Contract | Current Rebuild | Gap Level |
|---|---|---|---|
| Workflow 0: Video Analysis | `tools/video_analyze.py` + Gemini Files API | Not implemented | Medium |
| Workflow 1: Image Prompt + Airtable | `tools/airtable.py` create_records_batch | Config-driven prompt | Medium |
| Workflow 2: Image Generation | `tools/image_gen.py` multi-provider batch | `providers/image-generator.js` single-shot | Medium |
| Workflow 3: Video Prompt + Approval | Airtable update + human gate | Config-driven prompt | Medium |
| Workflow 4: Video Generation | `tools/video_gen.py` multi-provider batch | `providers/video-generator.js` single-shot | Medium |
| Workflow 5: Cost Awareness | Hard rule in CLAUDE.md | Zero-credit path removes need | Low |
| Workflow 6: Multi-Scene | CLAUDE.md dialogue continuity rules | Not implemented | Low |
| Prompt Engineering | 445-line best practices doc | Single prompt in config | Medium |
| Provider System | `tools/providers/` (Google, Kie, WaveSpeed) | Flow CDP only | Medium |
| Digital Citizenship | Project naming | Project naming + local housekeeping | Partially met |
