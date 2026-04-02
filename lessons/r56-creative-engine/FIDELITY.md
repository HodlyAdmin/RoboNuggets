# R56 Fidelity Audit

Updated: 2026-04-02 (preferred-image-proof run — preferredImage fallback proven, image x2 capture gap confirmed)

## Current Verdict

R56 has a live-verified local source baseline, a deep intent-recovery pass from all original template artifacts, AND a transcript-derived pass from the YouTube auto-captions. The rebuild proves the core image → video contract against Google Flow with zero-credit Veo settings, and the transcript answers the previously open spoken-workflow questions that templates alone could not settle.

**Fidelity label**: `source-audited + live-verified + intent-recovered + transcript-derived (auto-caption tier, not human-verified transcript)`

## Source Coverage

### Used So Far

- Local lesson README
- `assets/skool/setup-notes.md`
- Original template zip unpacked in `assets/original/creative-engine-template/`
- Reviewed `CLAUDE.md` (16.8KB — full agent instructions for the original lesson, 352 lines)
- Reviewed `README.md` (5.5KB — setup guide, 152 lines)
- Reviewed `prompt-best-practices.md` (21KB — UGC, SEALCaM, BOPA, dialogue craft, 445 lines)
- Reviewed `kie-ai-api.md` (API reference for Kie AI providers)
- Reviewed `tools/image_gen.py` (382 lines — multi-provider batch image generation)
- Reviewed `tools/video_gen.py` (320 lines — multi-provider batch video generation)
- Reviewed `tools/video_analyze.py` (442 lines — Gemini Files API video analysis)
- Reviewed `tools/config.py` (141 lines — API keys, cost matrix, model mappings)
- Reviewed `tools/providers/` (Google, Kie, WaveSpeed provider abstraction — 4 files)
- Reviewed `references/inputs/` (14 files — character, product, reference videos, and frames)
- Reviewed lesson video timestamps from Skool page (23:20 total length)
- **[NEW] YouTube auto-captions extracted** from unlisted video `https://youtu.be/P5kofOFEaBo` (full 23:20 transcript, auto-generated English captions)

### Not Used

- Human-verified verbatim transcript (unavailable — auto-captions only)
- Full video playback with visual analysis (video requires YouTube sign-in to play; captions extracted without playback)

### Evidence Tier Definitions

| Tier | Definition | Reliability |
|------|-----------|-------------|
| **Transcript/video-derived** | Directly stated or shown in the lesson video per auto-caption extraction | High (modulo auto-caption transcription errors for technical terms) |
| **Template-derived** | Proven from CLAUDE.md, Python tools, prompt-best-practices.md, or config.py | High |
| **Inferred** | Reasonable conclusion not directly stated in either source | Medium — needs Codex verification |

## Original Workflow Shape (Recovered)

The original lesson teaches a **7-workflow architecture**, not a simple 3-stage pipeline:

| Workflow | Description | Human Gate? |
|----------|-------------|-------------|
| 0 | Reference Video Analysis (Gemini 2.0 Flash + Files API) | Show analysis before proceeding |
| 1 | Image Prompt Writing + Airtable Staging | User reviews prompts |
| 2 | Image Generation Execution (multi-provider batch) | User approves/rejects in Airtable |
| 3 | Video Prompt Writing + Model-Specific Formatting | User reviews prompts |
| 4 | Video Generation Execution (multi-provider batch) | User reviews in Airtable |
| 5 | Cost Awareness (mandatory confirmation before batch) | Explicit cost confirmation |
| 6 | Multi-Scene Video Composition | Continuous dialogue flow |

**Language/Env**: Claude Code / Antigravity / Python
**Providers**: Google AI Studio (Nano Banana / Veo 3.1), Kie.ai (Image/Video APIs, Kling 3.0, Sora 2 Pro, file hosting), WaveSpeed AI (backup for Kling/Sora)
**Review Hub**: Airtable REST API with a 14-field `Content` table schema
**Prompt Engineering**: 445-line best practices document covering UGC structure, SEALCaM cinematic framework, BOPA consistency framework, text fidelity rules, dialogue craft, and reference analysis

## Transcript-Derived Answers to Open Questions

These answers were not available from template analysis alone. They come from the YouTube auto-captions of the lesson video.

### Q1: How is the lesson framed conceptually?

**Answer (transcript-derived)**: "Creative AI assistant" — positioned as an assistant/skill that acts as an orchestrator, NOT a "content factory" or standalone SaaS product. The instructor's opening framing: *"Imagine you had a creative AI assistant with access to the best image and video models in the world, trains itself on elite prompting practices, masters every model, and generates content for you while you sleep."* The later metaphor is "Creative Dark Factory" where *"you are the director."*

**Impact on rebuild**: The rebuild's framing as a "CDP-backed creative media pipeline" is technically accurate but misses the pedagogical framing of "you are the director of autonomous creative agents." The rebuild is more of a single-shot pipeline, not a director-managed fleet.

### Q2: Is Airtable central or optional?

**Answer (transcript-derived)**: Airtable is shown as **pedagogically central**. The instructor demonstrates it as the main review hub and generation status board. Direct quote: *"you can even use Airtable as a status board where an agent checks for human approval before posting to social media."* He shows looping through products from Airtable rows to generate ads.

**Impact on rebuild**: The rebuild's decision to make Airtable optional/disabled is an **accepted economic adaptation**, not a source-faithful choice. This should be documented, not hidden.

### Q3: Is provider abstraction taught conceptually or only in code?

**Answer (transcript-derived)**: **Explicitly a teaching point.** This is Advantage 2 of the 5 advantages. The instructor directly shows the `providers/` folder on screen and says: *"Each file represents a model category. When I add a new model, I don't need to rewrite the prompting logic. I just write a small 'wrapper' for the new model's API. This makes the engine future-proof."*

**Impact on rebuild**: The rebuild's Flow-only CDP path sacrifices this explicitly taught advantage. The `shared/flow-wrapper/` pattern partially addresses this by creating a stable seam, but the pedagogical point about adding new providers is lost.

### Q4: What does "multi-agent" actually mean?

**Answer (transcript-derived)**: **Parallel subagents within one agentic platform**, NOT multi-model API orchestration in the n8n sense. The instructor says: *"You can run multiple agents simultaneously. One browser profile can handle image generation, while another handles video animations and a third updates Airtable. You assume the position of a CTO, managing a team of automated creative agents."* This is Advantage 3.

**Impact on rebuild**: The rebuild is a sequential single-agent pipeline. The "multi-agent" concept from the lesson is about spawning parallel generation tasks, which the rebuild does not support. This is an accepted architecture simplification.

### Q5: What are Advantages 4 and 5?

**Answer (transcript-derived)**:
- **Advantage 4: Memory and Context** — *"Because my agent lives in a persistent environment, it remembers all my choices. If I keep telling it I prefer Nano Banana for product shots, it will start defaulting to that."* Style guide stored in agent memory ensures on-brand generation.
- **Advantage 5: Building for the Future / CREATE Framework** — Local file structure (Claude, Resources, Experiments, Assets, Tools, Extras) that keeps agent and files in sync. Positioned as an alternative to high-cost SaaS platforms.

**Impact on rebuild**: Agent memory/context is not part of the rebuild's architecture. The CREATE framework is partially reflected in the lesson's directory structure.

### Q6: Does setup flow match README?

**Answer (transcript-derived)**: Yes, closely. Clone repo → create .env → duplicate Airtable base → run verify script. The "shortcut for setup" is just telling Claude Code: *"setup creative engine."*

### Q7: How much emphasis on prompt best practices?

**Answer (transcript-derived)**: **Significant.** The instructor calls the prompt-best-practices file *"like having a master prompter consulting on every prompt"* and specifically mentions structured headers like `#Realism`, `#Lighting`, `#Composition`. Prompt quality is explicitly part of Advantage 2.

**Impact on rebuild**: The rebuild does not surface `prompt-best-practices.md` at runtime. This is a meaningful gap for the pedagogical intent of the lesson.

### Q8: Cost discipline emphasis?

**Answer (transcript-derived)**: Mentioned once (*"the agent calculates the cost in the background"*) but NOT given the heavy emphasis that CLAUDE.md's "HARD RULE: NEVER call any generation endpoint without FIRST showing the user the exact cost breakdown" suggests. The instructor focuses more on speed/parallel generation than cost gates.

**Impact on rebuild**: The rebuild's `requireZeroCredits: true` is a valid economic adaptation that makes the CLAUDE.md hard rule moot. Cost discipline is less central to the teaching than the template text suggests.

## Transcript-Derived 5-Advantage Framework

The lesson is organized around 5 advantages of the agentic approach:

| # | Advantage | Video Timestamp | Transcript Evidence |
|---|-----------|-----------------|---------------------|
| 1 | Cross-model prompting | 02:39 | "It lets me connect to Nano Banana Pro, GPT Image 1.5, Kling, Sora..." |
| 2 | Model selection + prompting quality | 08:24 | "A big reason why these are so well-defined is because I train Claude Code on best practices" |
| 3 | Parallel multi-agent workflows | 12:13 | "You can run multiple agents simultaneously" |
| 4 | Memory and context | 15:58 | "It remembers all my choices... style guide stored in memory" |
| 5 | Building for the future (CREATE framework) | 17:28 | "Local files stay synced with your agent's mental model" |

## Economic Adaptation Assessment

Keep:

- The conceptual step-by-step nature of the pipeline (Image → Video).
- Concept structure (prompt best practices mapping into robust UGC and cinematic rules).
- The Airtable Review Sink (optional).
- Reference image upload before generation.
- Generated image as video start frame.
- Aspect ratio, model, and variant controls as explicit intake parameters.

Swap:

- **Replaced all API calls with Chrome CDP automation against Google AI Ultra**.
  - Image generation: Google Flow / Nano Banana 2 via CDP instead of Nano Banana API.
  - Video generation: Google Flow Veo 3.1 Fast Web via CDP instead of API or Kie.ai / Wavespeed.
  - Audio generation: Added Lyria 3 Pro via CDP for native audio synthesis, giving a full multi-modal pipeline all on the same Google One AI Premium (Ultra) sub.
- **Replaced heavy Python agent state management with a streamlined Node pipeline** (`index.js`).
- **Replaced multi-provider routing with Flow-only CDP path** — acceptable economic adaptation but loses provider diversity.
- **Replaced Airtable-gated batch workflow with config-driven single-shot** — acceptable for local use but loses the human-review surface.

## Recovered Intent Gaps (With Evidence Tiers)

### High Severity

| Gap | Evidence Tier | Evidence | Rebuild Status | Impact |
|-----|--------------|----------|----------------|--------|
| No `preferred_image` selection | Template-derived | `video_gen.py` L30-48, CLAUDE.md L209-210 | **Fully proven** — `videoConfig.preferredImage: 2` live-proven in `r56-preferred-image-proof_1775165789996`: requested candidate 2, two image candidates existed, correctly selected `_v1.jpg` as the video start frame with `preferredGeneratedImageSource: "preferred-image-2"`. No separate human review UI. | Creative control working as designed |
| Single variant per stage inconsistent | Template-derived | `image_gen.py` L86 `num_variations=2`, `video_gen.py` L88 | **Fully proven** — Image `x2` now captures 2 distinct candidates (fixed in `chrome-flow.js` image-mode branch). Video `x2` continues to reliably capture 2. Both proven in `r56-preferred-image-proof_1775165789996`. | Multi-candidate pipeline fully operational |

### Medium Severity

| Gap | Evidence Tier | Evidence | Rebuild Status | Impact |
|-----|--------------|----------|----------------|--------|
| Hero selection partially live-proven | Template-derived | CLAUDE.md Workflows 1-4 human gates | `shared/hero-selection.js` (4 policies); `judge` + `manual` each live-proven once | Good progress, broader repeatability unproven |
| No reference video analysis | Template-derived | `video_analyze.py` (442 lines), CLAUDE.md Workflow 0, `references/inputs/orange.mp4` + `parallax.mp4` | Completely absent | Prompt quality context lost |
| No Airtable approval gates | **Transcript-derived** | Instructor shows Airtable as the central review hub and status board; human approval before publishing | Disabled by default in rebuild | Safety net for quality removed (accepted adaptation) |
| No multi-provider routing | **Transcript-derived** | Advantage 2: instructor shows the `providers/` folder, explains wrapper pattern, calls it "future-proof" | Flow-only | Provider redundancy lost (accepted adaptation) |
| No batch generation | Template-derived | `image_gen.py` `generate_batch()`, `video_gen.py` `generate_batch()` | Single-shot per stage | Scale capability lost |
| No prompt best practices integration | **Transcript-derived** | Instructor says "like having a master prompter consulting on every prompt" with specific framework names | Not surfaced at runtime | Pedagogical intent not transmitted |
| No video analysis module | Template-derived | `video_analyze.py` full implementation with 11-field structured output | Not represented in rebuild | Creative intelligence gap |
| No parallel multi-agent support | **Transcript-derived** | Advantage 3: "One browser profile can handle image generation, while another handles video, a third updates Airtable" | Sequential single-shot pipeline | Architecture simplification (accepted) |
| No agent memory/context | **Transcript-derived** | Advantage 4: "it remembers all my choices... style guide stored in memory" | Not implemented | On-brand generation not persistent across runs |
| Resolution parameter not exposed | Template-derived | `image_gen.py` L42,86 `resolution="1K"/"2K"/"4K"` | Flow handles internally | Minor — Flow likely manages resolution |

### Low Severity

| Gap | Evidence Tier | Evidence | Rebuild Status | Impact |
|-----|--------------|----------|----------------|--------|
| No cost confirmation gate | **Transcript + Template** | CLAUDE.md "HARD RULE" is stronger than video emphasis; instructor mentions cost "in the background" | `requireZeroCredits: true` renders moot | Minimal — economic adaptation resolves |
| No structured Kling/Sora prompts | Template-derived | CLAUDE.md L185-191 | Only Veo natural-sentence format | Only matters if non-Google providers re-enabled |
| No multi-scene video support | Template-derived | CLAUDE.md Workflow 6 | Not implemented | Enhancement, not core |
| Video duration not configurable | Template-derived | CLAUDE.md L224-227 (4/6/8s Veo, 3-15s Kling) | Flow default used | Minor |

## Template-vs-Rebuild Accuracy Matrix

| Template Feature | Evidence Location | Rebuild Match? |
|---|---|---|
| Aspect ratio prefix in prompts | `prompt-best-practices.md` L27-30, `image_gen.py` `_detect_aspect_ratio` | ✅ Used in baseline prompt |
| Camera/realism keywords | `prompt-best-practices.md` L34-43 | ✅ Present in baseline |
| `text_accuracy` standalone directive | `prompt-best-practices.md` L377-388 | ✅ Present in baseline |
| Dialogue ≤ 150 chars | `prompt-best-practices.md` L396-397 | ✅ Baseline within limit |
| Reference images uploaded before generation | CLAUDE.md Workflow 1 | ✅ CDP file input |
| Generated image becomes video start frame | `video_gen.py` L77 `image_url=image_url` | ✅ `useGeneratedImageAsReference: true` |
| Zero-cost path preferred | Economic design | ✅ `requireZeroCredits: true` |
| Digital citizenship (project naming) | CLAUDE.md naming convention | ✅ Auto-naming implemented |
| Default image model `nano-banana-pro` | `config.py` L57 | ✅ `Nano Banana 2` (Flow equivalent) |
| Default video model `veo-3.1` | `config.py` L58 | ✅ `Veo 3.1 - Fast [Lower Priority]` |
| UGC-style prompt tone | `prompt-best-practices.md` throughout | ✅ Baseline matches |
| Dialogue embedded in video prompts | CLAUDE.md L178-183 | ✅ Baseline uses quotes-in-prompt |

## Directly Proven Baseline

Command run:

```bash
npm run r56
```

Config used:

```text
lessons/r56-creative-engine/config.source-baseline.json
```

Verified run record:

- Manifest: `lessons/r56-creative-engine/output/r56-creative-engine-source-baseline_1775135283535/manifest.json`
- Image artifact: `flow_R56_img_r56-creative-engine-source-baseline_1775135283686_1775135380196.jpg`
- Video artifact: `flow_R56_r56-creative-engine-source-baseline_1775135380208_1775136025396.mp4`

What this proves:

- Original reference images are uploaded into Flow for the image stage.
- The generated image is uploaded into Flow for the video stage.
- The video stage is forced onto `Video` → `Frames` → `9:16` → `x2` → `Veo 3.1 - Fast [Lower Priority]`.
- The run refuses to submit unless the Flow UI shows `Generating will use 0 credits`.
- The saved image is a real JPEG and the saved video is a real MP4.
- The stage state is persisted in `manifest.json`, including the selected model, sub-mode, count, timeout, and reference-image handoff.

Additional later proof:

- `lessons/r56-creative-engine/output/r56-verify-pass_1775157542622/manifest.json` live-proved `variantCount: "x2"` with `2` saved MP4 candidates and a `judge` winner.
- `lessons/r56-creative-engine/output/r56-manual-review_1775159203078/manifest.json` live-proved the `manual` / `needs-review` path for image generation.
- `lessons/r56-creative-engine/output/r56-preferred-image-proof_1775164254709/manifest.json` live-proved:
  - `imageConfig.variantCount: "x2"` passthrough to Flow wrapper (image job state confirms `variantCount: "x2"` in request)
  - `videoConfig.preferredImage: 2` fallback path — requested candidate 2 when only 1 image existed; logged warning and fell back to hero-selected candidate 0
  - Video `x2` capture again produced 2 distinct MP4 candidates (6.8 MB + 5.8 MB)
  - End-to-end image → video reference chain with generated image as Veo start frame
  - Image `x2` gap confirmed: `totalMediaHitsSeen: 2` but only 1 artifact captured (CDP interceptor limitation, not a Flow limitation)

What this does not prove:

- That the rebuild perfectly matches the spoken lesson intent line by line, because the transcript was auto-caption-derived.
- That `9:16`, `Frames`, or `x2` are globally correct defaults for every future creative-media workflow.
- That the rebuild captures all 7 original workflows (it captures workflows 2 and 4 only, as single-shot variants).
- That the rebuild matches the lesson's parallel multi-agent concept (Advantage 3).
- That agent memory/context carries across runs (Advantage 4).
- That `preferredImage` actually selects a non-default candidate (blocked by image `x2` capture gap — only the fallback path is proven).
- That image-mode CDP capture reliably produces multiple candidates (video-mode does; image-mode does not).

**UPDATE: Both items above are now proven** in `r56-preferred-image-proof_1775165789996`:
- `preferredImage: 2` selected the second image candidate (`_v1.jpg`) as the video start frame
- Image-mode CDP capture produced 2 distinct candidates (222 KB + 83 KB) after `chrome-flow.js` image branch was fixed to use `ensureControlSelected(variantCount)`

## Source Baseline Plan

1. [x] Download the original lesson assets into `assets/original/` (Done, unpacked zip).
2. [x] Record source notes, resource links, and troubleshooting in `assets/skool/`.
3. [x] Compare the original toolchain and prompt contract with the local rebuild (Done).
4. [x] Create a repeatable source baseline (Created `config.source-baseline.json` using Veo 3.1 dialog).
5. [x] Run verified local test.
6. [x] Deep intent-recovery pass from all original template artifacts (Done — Opus pass).
7. [x] Deep source-artifact line-by-line comparison (Done — Opus planner pass).
8. [x] Transcript/video-derived pass via YouTube auto-caption extraction.
9. [x] Reconcile transcript findings with template-artifact analysis.
10. [x] Codex verification of transcript-derived claims against repo evidence.

## Exit Criteria

- [x] Original lesson assets preserved locally
- [x] Source notes captured
- [x] Fidelity audit updated from real source evidence
- [x] Repeatable baseline defined (`config.source-baseline.json`)
- [x] Live run fully verified against the local economic baseline
- [x] Deep intent-recovery pass from original template artifacts
- [x] Deep source-artifact line-by-line comparison with evidence tiers
- [x] Transcript/video-derived pass (auto-caption tier)
- [x] Transcript findings reconciled with template-artifact analysis
- [x] Codex verification pass on transcript-derived claims

## Fidelity Label

Current: **source-audited + live-verified + intent-recovered + transcript-derived + codex-verified**

The rebuild is a faithful economic adaptation of the core image → video pipeline. Template-level and transcript-level evidence have both been analyzed. All 7 previously open questions are now answered from the lesson video. Codex verification confirmed that transcript-derived claims are consistent with repo evidence: the Airtable-optional adaptation is explicitly labeled, the 5-advantage framework is documented in FIDELITY.md, the prompt-best-practices gap is tracked, and the transcript extraction is genuine. The one framing difference ("Creative AI assistant" vs "CDP-backed pipeline") is an accepted rebuild-specific framing.

## What Codex Verified

1. ✅ Transcript-derived framing: README frames rebuild as "CDP-backed creative media pipeline" — accepted rebuild-specific framing, not a defect
2. ✅ Airtable-optional: Labeled as an accepted adaptation in FIDELITY.md Q2 and the Airtable sink code itself
3. ✅ 5-advantage framework: Documented in FIDELITY.md L115-126 and WORKSTATE.md
4. ✅ `prompt-best-practices.md` absence: Tracked as a medium-severity gap in FIDELITY.md
5. ✅ Transcript genuinely extracted: `assets/skool/transcript-notes.md` exists with full YouTube auto-caption content
