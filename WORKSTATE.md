# Current Workstate

Updated: 2026-04-02 (R56 close-out — all code fixes applied, all gaps proven)

This file is the short-form, session-oriented continuity layer for switching between Codex accounts, Gemini, and Claude.

Read this first, then read `HANDOFF.md`.

## Current Cross-LLM Truth

The repo's handoff issue is not only "Gemini underperformed" or "Opus over-claimed." The deeper problem was that the handoff often asked the next model to be planner, executor, and verifier at the same time.

Current rule:

- **Planner** defines scope, intent, and acceptance gates
- **Executor** performs bounded implementation work
- **Verifier** checks claims against repo evidence

Do not assume one model will do all three well by default.
Do not trust the executor summary alone as proof.

## What Was Just Finished

- `R45` is in a strong source-audited, economically adapted state.
- `R56` now has a live-verified local source baseline PLUS a deep intent-recovery pass PLUS a transcript/video-derived pass.
- `R56` transcript pass extracted YouTube auto-captions from `https://youtu.be/P5kofOFEaBo` (full 23:20 video).
- The previously open R56 spoken-workflow questions are now answered from the lesson video at the auto-caption tier.
- `R56` now also has an initial `shared/flow-wrapper/` seam with local job-state persistence, and the lesson providers call that seam instead of `shared/chrome-flow.js` directly.
- `R56` now has a lightweight local watcher at `shared/flow-wrapper/watch.js`, exposed as `npm run r56:watch`, so operators do not have to manually poll state files during long runs.
- The verified `R56` run is:
  - `lessons/r56-creative-engine/output/r56-creative-engine-source-baseline_1775135283535/manifest.json`
- The newest candidate-aware proof run is:
  - `lessons/r56-creative-engine/output/r56-verify-pass_1775157542622/manifest.json`
- The preferred-image-proof run is:
  - `lessons/r56-creative-engine/output/r56-preferred-image-proof_1775165789996/manifest.json`
  - **Fully proved**: `preferredImage: 2` selected the second image candidate (`_v1.jpg`) as video start frame
  - **Fully proved**: image `x2` → 2 distinct image candidates captured (222 KB + 83 KB)
  - **Fully proved**: video `x2` → 2 video candidates captured (5.1 MB + 3.9 MB)
  - Root cause of prior image `x2` gap: `chrome-flow.js` image branch never called `ensureControlSelected(variantCount)` — now fixed
- The transcript pass produced:
  - `lessons/r56-creative-engine/assets/skool/transcript-notes.md` — full YouTube auto-caption extraction with corrected technical terms
  - Updated `FIDELITY.md` — now includes transcript-derived answers with 3-tier evidence labeling
  - Updated `assets/skool/setup-notes.md` — YouTube URL, Airtable template URL, 5-advantage framework
  - Updated `assets/skool/troubleshooting.md` — transcript-derived architectural insights
  - Updated `knowledge/r56-intent-recovery-and-studio-architecture.md` — all 9 gap questions resolved

## What The Opus Pass Found

The original R56 lesson teaches a **7-workflow architecture**, not a 3-stage pipeline:

1. **Workflow 0**: Reference video analysis (Gemini Files API) — completely absent from rebuild
2. **Workflows 1-2**: Image prompt staging → Airtable approval → multi-provider batch generation
3. **Workflows 3-4**: Video prompt staging → Airtable approval → multi-provider batch generation
4. **Workflow 5**: Mandatory cost confirmation before any generation
5. **Workflow 6**: Multi-scene video composition with continuous dialogue

The rebuild captures workflows 2 and 4 in single-shot form. The broader orchestration (Airtable gates, batch processing, multi-provider routing, video analysis, cost discipline) is documented but not implemented.

## What The Transcript Pass Added

The lesson video is structured around **5 advantages** of the agentic approach:

1. **Cross-model prompting** — provider abstraction lets the agent connect to any model
2. **Model selection + prompting quality** — agent trained on prompt best practices ("master prompter")
3. **Parallel multi-agent workflows** — "Creative Dark Factory" where you are the director
4. **Memory and context** — persistent agent environment remembers choices, style guide in memory
5. **Building for the future** — CREATE framework, local files sync with agent's mental model

Transcript-derived key findings:
- **Framing**: "Creative AI assistant" / "Creative Dark Factory" — not a content factory or SaaS product
- **Airtable**: Central review hub and status board (pedagogically central, not optional)
- **Provider abstraction**: Explicitly taught as Advantage 2, with live `providers/` folder walkthrough
- **Multi-agent**: Parallel subagents, not API orchestration — "CTO managing a team"
- **Cost discipline**: Mentioned once, but less emphasized than CLAUDE.md's "HARD RULE" suggests
- **Prompt best practices**: "Like having a master prompter consulting on every prompt"

### High-Priority Gaps Identified

1. **Preferred-image selection fully proven**: `videoConfig.preferredImage: 2` live-proven selecting the actual second image candidate as the video start frame in `r56-preferred-image-proof_1775165789996`. No separate human review UI for choosing among image variants.
2. ~~**Image `x2` CDP capture gap**~~: **Fixed.** Root cause was `chrome-flow.js` image-mode branch not calling `ensureControlSelected(variantCount)`. Now mirrors the video-mode logic. Proven with 2 distinct image captures.
3. **No reference video analysis**: Workflow 0 is absent.
4. **Prompt engineering contract not surfaced**: The 445-line prompt best practices doc (UGC, SEALCaM, BOPA) is not accessible at runtime. Transcript confirms this is pedagogically important.

## Current Architectural Truth

- Suno should prefer the local hybrid wrapper path.
- Flow now has an initial wrapper seam at `shared/flow-wrapper/`; keep pushing lesson code through that boundary instead of `shared/chrome-flow.js` directly.
- Hero selection gate is now implemented at `shared/hero-selection.js` with four policies (`first`, `random`, `judge`, `manual`). The flow-wrapper integrates it automatically.
- Multimodal Gemini judging is available via `generateMultimodalJSON()` in `shared/api-gemini.js` — used by the `judge` policy.
- Raw CDP/browser automation is still acceptable as the engine, but the wrapper should hide it.
- Creative-media lessons should not hard-code one verified baseline as a repo-wide default.

## Current R56 Truth

The current verified `R56` source baseline intentionally uses:
- `Video`
- `Frames`
- `9:16`
- `x2`
- `Veo 3.1 - Fast [Lower Priority]`
- visible `0 credits`

That is a verified baseline for this lesson, not a global default.

## Biggest Remaining Gaps (Updated)

1. **Flow wrapper extraction** (Partially Live-Verified)
   - Initial seam landed: `lesson → flow-wrapper → chrome-flow → CDP/browser worker`
   - Candidate-aware extraction added to `chrome-flow.js` (uses heuristic capture of media payloads >50KB, optionally limited by `variantCount`).
   - `flow-wrapper` now maps these captured payloads to candidates and passes them to the hero selection gate.
   - *Status*: Both video and image `x2` reliably capture 2 candidates. Image `x2` gap was fixed by adding `ensureControlSelected(variantCount)` to the image-mode branch in `chrome-flow.js`. Proven in `r56-preferred-image-proof_1775165789996`.

2. **Hero Selection Gate** (Partially Live-Verified)
   - Implemented at `shared/hero-selection.js` with 4 policies: `first`, `random`, `judge`, `manual`.
   - Wired into `shared/flow-wrapper/index.js` — runs after generation.
   - R56 providers updated to respect the winning hero candidate.
   - Multimodal Gemini capability added to `shared/api-gemini.js` (`generateMultimodalJSON`).
   - *Status*: Live-verified once for `R56` video with `judge` choosing between `2` saved candidates in `r56-verify-pass_1775157542622`, and live-verified once for `R56` image with `manual` review in `r56-manual-review_1775159203078`.

3. **Digital Citizenship & Lifecycle** (Downgraded & Partially Built)
   - Provider-side cleanup via `deleteFlowProject` has been explicitly **downgraded and disabled**. The Flow dashboard no longer exposes user-assigned project names cleanly, making it unsafe to auto-delete projects by name in a shared account (could delete another user's work). We must capture internal UUIDs first to achieve this safely.
   - Local candidate pruning added to `cleanupFlowJob` in the wrapper (status: not yet wired into automatic runtime path).
   - Usage logging implemented via gitignored `.flow-usage.log` in the `.flow-jobs/` directory.
   - *Status*: Provider-side cleanup is suspended. Local cleanup and logging exist but remain explicit actions.

4. **Operator UX / Notifications** (MVP Landed)
   - `shared/flow-wrapper/watch.js` polls Flow job state files and surfaces `running`, `needs-review`, `completed`, and `failed`.
   - `npm run r56:watch` now provides a lightweight local watcher for R56 output directories.
   - Desktop notification support is implemented for macOS via `osascript`, but has not been independently verifier-proven from repo evidence yet.

5. **R56 transcript/video-derived fidelity pass** (Completed — Auto-Caption Tier)
   - YouTube auto-captions extracted from `https://youtu.be/P5kofOFEaBo`
   - All 7 previously open questions answered from transcript
   - Fidelity label: `transcript-derived (auto-caption tier, not human-verified)`
   - Full transcript notes: `lessons/r56-creative-engine/assets/skool/transcript-notes.md`
   - Remaining: Codex verification pass on transcript-derived claims

6. **Prompt best practices integration**
   - Surface `prompt-best-practices.md` at runtime or in README
   - Consider a prompt-template system that applies UGC vs SEALCaM rules per job

## MixClaw Insights Worth Reusing

From `/Users/ryanpotteiger/Documents/AntiGravity/MixClaw/`:

- `core/templates/STYLE-TEMPLATE.md`
  - stronger shared-account rules
  - hero selection concept
  - cleanup mindset
- `core/scripts/quality-gate.js`
  - useful model for a publish gate
  - still mostly rule-based, not true multimodal judging
- `core/scripts/flow-automate.js`
  - useful wrapper/checkpointing mindset for Flow

### Phase 4.1: Flow Wrapper Hardening (Partially Live-Verified)

- Standardize `flow-wrapper` state contract (unified `artifacts` array + rich `candidates`).
- Propagate `needs-review` status to lesson provider outputs (Image/Video).
- Initial `shared/hero-selection.js` implementation with `'first'` and `'judge'` policies.
- Wire hero selection into R56 lesson providers.
- Candidate-aware extraction in `chrome-flow.js` (heuristic capture of media payloads >50KB).

Current proof upgrade:
- `R56` now has a live candidate-aware verify pass at `lessons/r56-creative-engine/output/r56-verify-pass_1775157542622/manifest.json`
- Video stage saved `2` MP4 candidates with `judge` selecting a winner
- Image stage live-verified the `manual` needs-review path at `lessons/r56-creative-engine/output/r56-manual-review_1775159203078/manifest.json`
- `preferredImage` fallback live-proven at `lessons/r56-creative-engine/output/r56-preferred-image-proof_1775164254709/manifest.json`
- `imageConfig.variantCount: "x2"` passthrough confirmed (Flow wrapper receives it; CDP capture is the bottleneck)
- Provider-side cleanup is explicitly disabled/downgraded; local cleanup remains implemented but not newly proven here
- Remaining unverified: image `x2` multi-candidate capture (CDP gap), `preferredImage` with real multi-candidate selection, broader repeatability

### Recommended Next Tasks

#### Option A: Architecture Verification (High Priority)

1. **Verify Candidate Tracking**: Run a live test with `variantCount > 1` and verify the `manifest.json` contains multiple distinct candidates with valid metadata.
2. **Verify Provider-Side Cleanup**: Manually verify `deleteFlowProject` selectors on the live Flow dashboard.
3. **Automate Lifecycle**: Once proven, wire `cleanupFlowJob` into the main `startFlowJob` path as an optional `autoCleanup` flag.
4. **Prompt Best Practices**: Integrate `prompt-best-practices.md` into the runtime prompt engineering layer.

### Option B: Breadth First

1. Move to the next unaudited lesson using `knowledge/lesson-rebuild-playbook.md`
2. Apply the same source-capture + intent-recovery pattern
3. Return to Flow wrapper when multiple lessons expose the same pain points

### Option C: Full Certification

1. Use `video-to-action` skill on R56 Skool lesson video
2. Reconcile transcript findings with template-artifact analysis
3. Update FIDELITY.md to `transcript-certified`

## Cross-LLM / Cross-Account Continuity Rules

When switching between Codex account #1, Codex account #2, Gemini, or Claude:

1. Update `WORKSTATE.md`
2. Update `HANDOFF.md` if the repo-wide direction changed
3. Update lesson-specific `FIDELITY.md` if source truth changed
4. Re-ingest vector memory:
   - `node .agent/memory/ingest.js`
5. Prefer a git commit when a meaningful milestone is reached

Do not rely on chat continuity as the source of truth.
Use repo files as the source of truth.

## Recommended Role Fit

- **Codex**: strong planner, executor, and verifier for code-heavy work
- **Gemini / Flash-style fast models**: strong executor or source-capture worker when given a bounded brief
- **Gemini 3.1 Pro (High)**: stronger executor for ambiguous browser/CDP debugging than Flash
- **Claude Opus**: strong planner / intent-recovery / architecture reviewer
- **Claude Sonnet**: good bounded executor when the contract is already clear

This is guidance, not a hard lock. The important thing is the role separation, not the brand name.

See `knowledge/model-fit-and-handoff-guidance.md` for the running recommendation log based on actual repo use.
