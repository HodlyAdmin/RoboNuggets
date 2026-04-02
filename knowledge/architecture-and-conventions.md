# RoboNuggets Architecture & Conventions

*Decisions logged: March 2026 — Updated: April 2, 2026 (model-fit log + Flow verification updates)*

## Current Architecture: Hybrid Local Runtime

The repo is no longer purely "CDP-first" across every tool. The current standard is:

- **Gemini text/prompting work** should prefer the local API helper (`shared/api-gemini.js`) when the task does not require browser-only UI behavior.
- **Google web media generation** (Flow, Lyria, other browser-only surfaces) still uses **Chrome DevTools Protocol (CDP)** against the shared Chrome instance on port `9333`.
- **Suno music generation** should prefer the local **hybrid wrapper** (`suno-wrapper` via `shared/api-suno.js`). Raw browser/CDP Suno drivers remain fallback engines or implementation details, not the lesson-facing contract.

If an older doc says "everything is CDP-first", treat that as historical context rather than the current rule.

### Shared Runtime Contracts

| Runtime | Purpose | Standard Entry Point |
|--------|---------|----------------------|
| Gemini API | Concepts, metadata, timestamps, structured text generation | `shared/api-gemini.js` |
| Chrome CDP | Google web automation and media interception | `shared/chrome-ai.js`, `shared/chrome-flow.js`, `shared/chrome-lyria.js` |
| Suno hybrid wrapper | Suno generation with session renewal + Wingman/manual fallback | `shared/api-suno.js` → `suno-wrapper` |

For Flow-backed lesson code specifically, prefer the wrapper seam in `shared/flow-wrapper/index.js`. It currently delegates to `shared/chrome-flow.js`, but lessons should stop depending on raw Flow UI automation directly.

## Wrapper Pattern Guidance

The **hybrid wrapper pattern** is a strong fit for many creative web platforms, but not every platform should use the exact same implementation strategy as Suno.

- Use a wrapper when the lesson needs a **stable local contract** such as `generate`, `status`, `list`, or `download`, while the provider underneath is an unstable web UI.
- The wrapper should hide browser state, auth/session renewal, retry policy, and human-intervention states from the lesson module.
- Prefer a **job-oriented wrapper** over a fake “official API clone” unless the provider’s web requests are actually stable enough to replay safely.

### When the Pattern Fits Well

- Generative media tools with a clear submit → wait → artifact flow
- Authenticated dashboards where a browser session is the real credential
- Platforms where the browser implementation may change, but the lesson contract should stay stable

### When the Pattern Does Not Fit Cleanly

- Real-time collaborative apps with heavy websocket/state sync
- Surfaces where the artifact only exists inside a live canvas or editor state
- Products where the UI is so volatile that a browser worker is still required, but a thin wrapper may add little value unless it also adds queueing and state persistence

### Google Flow Guidance

For **Google Flow**, the wrapper pattern is still workable and probably desirable, and the repo now has an initial wrapper seam in `shared/flow-wrapper/index.js`. It should remain a **wrapper around the existing CDP driver**, not a Suno-style token replay clone.

- Flow generation currently depends on browser-native project setup, model/aspect controls, and CDP media interception in `shared/chrome-flow.js`.
- The wrapper currently adds a stable lesson-facing entry point plus local job-state persistence under the run output directory.
- A good Flow wrapper would expose stable endpoints like `start-job`, `get-status`, and `get-artifact`, while using the CDP/browser worker internally.
- Inference: Flow should be wrapped as a **browser-backed service boundary**, not reverse-engineered into a pretend public REST API unless that proves durable from direct evidence.
- Do **not** let one verified lesson baseline silently become the global Flow default. Settings like `aspectRatio`, `subMode` (`Frames` vs `Ingredients`), `variantCount` (`x1`–`x4`), model choice, and `requireZeroCredits` must stay explicit at the lesson or intake layer.

### Media Extraction Strategy

**Never rely on the native browser Download button** from an attached Chrome session when using CDP/browser automation. The macOS "Save As" OS dialog can intercept it and deadlock Node.js indefinitely.

Instead, all drivers use a **CDP Network Interceptor** (`page.on('response', ...)`) armed _before_ the generation prompt is submitted. This traps the raw media payload off the wire, bypassing the OS entirely.

- Audio/video payloads arrive as `video/mp4` or `audio/` MIME types in the `videoplayback` stream
- Minimum buffer size filter: `>50KB` to skip thumbnails and tracking pixels
- Final file is written synchronously with `fs.writeFileSync()`

## Digital Citizenship (Mandatory)

The Google AI Ultra account is **shared with human team members.** All automation MUST:

1. **Delete generated chats** immediately after extracting the media asset (Lyria driver)
2. **Auto-name projects** with a unique slug (e.g., `R56_1774567050471`) so humans can identify and safely ignore bot-created items (Flow driver)
3. **Never leave orphaned scratch data** — unused candidates, untitled projects, or debug sessions in shared interfaces

## CDP Port Convention

To prevent collisions across projects using Chrome DevTools Protocol:

| Port | Assignment |
|------|-----------|
| `9222` | Default Chrome |
| `9223` | Legacy project |
| `9333` | **RoboNuggets** (standard) |
| `9444` | Future project |

Override with the `CDP_PORT` environment variable. Default: `9333`.

**Launch command:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/robonuggets-agent-chrome
```

## Music Generation

- **R45 standard path**: `suno-api` hybrid wrapper. The wrapper owns session renewal, direct API attempts, native browser fallback, and Wingman/manual recovery when Suno or Google blocks automation.
- **Suno browser fallback**: the repo still contains direct browser drivers for Suno, but lessons should treat them as fallbacks or experiments rather than the stable contract.
- **Lyria CDP path**: still valid for lessons that intentionally target Google's music UI. Prompt injection and media interception remain CDP-based there.
- **Model choice should be configurable** at the lesson/config layer rather than hard-coded into browser logic.
- **Prompt size matters in Suno**: description-style prompts that work fine in a generic LLM or an older API wrapper can still fail in the live Suno creation UI. Keep instrumental Suno descriptions compact, and prefer an engine-side length guardrail when lessons derive prompts from richer concept objects.

## Video/Image Generation: Google Flow

- The current R56 source baseline uses Google Flow directly through CDP for both image and video stages.
- Verified free-path video settings are:
  - `Video`
  - `Frames`
  - `9:16`
  - `x2`
  - `Veo 3.1 - Fast [Lower Priority]`
  - visible UI state: `Generating will use 0 credits`
- Lower-priority Veo runs can take substantially longer than the older paid-style assumptions. Treat `600000ms` as a realistic baseline timeout for the free path.
- Media extraction should prefer network interception, but Flow can also surface completed assets via `media.getMediaUrlRedirect` / DOM-backed media sources. A DOM extraction fallback is part of the practical contract now.
- Direct evidence now supports an updated next step: keep pushing Flow behind `shared/flow-wrapper/index.js` until lessons no longer own raw Flow UI logic individually, then add candidate-aware extraction and provider-side cleanup on top of that seam.
- A full wrapper design (job-oriented API, candidate-aware extraction, state persistence) is documented in `knowledge/r56-intent-recovery-and-studio-architecture.md`.

## Creative QA and Selection

For creative-media pipelines, generation is not enough. The system should distinguish:

- requested output contract
- produced candidates
- selected hero asset
- reason for selection

The hero selection gate is now implemented at `shared/hero-selection.js` with four policies:

- **`first`** — Select candidate 0 (default, no regression from previous behavior)
- **`random`** — Random selection from candidates
- **`judge`** — Multimodal Gemini evaluation against the original prompt (via `generateMultimodalJSON` in `shared/api-gemini.js`)
- **`manual`** — Always route to human review (returns null hero)

The flow-wrapper at `shared/flow-wrapper/index.js` runs hero selection automatically after generation and records the result (`policy`, `winnerIndex`, `confidence`, `reason`, `scores`) in the job state file. R56 lesson providers pass `selectionPolicy` and `confidenceThreshold` from config.

**Current limitation:** The underlying `chrome-flow.js` path now supports heuristic multi-payload capture plus DOM fallback metadata, and `R56` has one live proof run where `variantCount: "x2"` produced `2` saved video candidates and a `judge` winner:

- `lessons/r56-creative-engine/output/r56-verify-pass_1775157542622/manifest.json`

That is enough to call competitive Flow-video hero selection **partially live-verified** for the current `R56` path. Revisions to Flow-image confirm the `manual` / `needs-review` run also succeeded for single-shot. Remaining limits:

- the capture remains heuristic rather than provider-certified
- image generation still often yields only one candidate
- provider-side cleanup is completely disabled/downgraded for safety
- local cleanup/logging remain implemented but not newly proven here
- broader repeatability across multiple Flow scenarios is still unproven

Inference: Gemini is a strong default judge for multimodal prompt-vs-output validation, but the `selectHero()` contract is provider-agnostic — another model or local evaluator can replace Gemini by implementing the same interface.

The architectural design, evaluation prompt template, and confidence-threshold routing are documented in `knowledge/r56-intent-recovery-and-studio-architecture.md`.

## Digital Citizenship

The shared-account rule is broader than naming projects. In multi-user creative studios, automation should:

1. Name projects predictably on creation
2. Avoid leaving orphaned dry-run or failed output folders locally
3. Prefer a single selected hero asset over untracked candidate sprawl
4. Archive or delete stale test runs after learnings are captured
5. Minimize clutter inside shared provider accounts such as Flow and Suno

R45 and R56 now handle local output housekeeping better, but provider-side project cleanup and candidate curation should continue to improve toward a true studio-grade standard.

A three-tier digital citizenship roadmap (immediate: Flow project deletion + usage logging, medium-term: Suno cleanup + rate limiting, long-term: provider-agnostic cleanup interface + team dashboard) is documented in `knowledge/r56-intent-recovery-and-studio-architecture.md`.

## Model Fit

Use `knowledge/model-fit-and-handoff-guidance.md` as the running log of which models have performed well at which repo tasks. Current default:

- Codex: planner/verifier
- Gemini Flash: bounded executor / proof collector
- Gemini 3.1 Pro (High): stronger executor for ambiguous browser/CDP debugging
- Claude Opus: source-fidelity and architecture reasoning
- Claude Sonnet: bounded implementation after the contract is already clear

## FFmpeg Pipeline

We use direct `child_process.spawn()` / `execFile()` against `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe` binaries. The deprecated `fluent-ffmpeg` wrapper is explicitly avoided.

## Vector Memory

The local RAG engine (`bge-small-en-v1.5`) indexes the `knowledge/`, `shared/`, `lessons/`, and `.agent/` directories. Query it to retrieve design decisions across all lessons:

```bash
node .agent/memory/query.js "how do we download media from Lyria?"
```

The source template for this memory system lives next to the repo in `/Users/ryanpotteiger/Documents/AntiGravity/_templates/vector-memory`. Treat `.agent/memory` here as an installed working copy, and re-ingest after architecture or lesson-doc changes:

```bash
node .agent/memory/ingest.js
```

## Lesson Recreation Fidelity

This repo's mission is not just "make something similar." It is to recreate RoboNuggets lessons in a way that stays economically viable by preferring already-paid tools, local runtimes, hybrid wrappers, and browser automation over unnecessary pay-as-you-go APIs.

That said, some lesson modules were initially reconstructed from **lesson descriptions** plus prompting, rather than from the original **lesson transcripts or videos**. Those modules may match the intended outcome category without matching the exact toolchain, sequencing, or prompt logic from the actual lesson.

- Treat description-driven lessons as **working reconstructions** until proven otherwise.
- When exact fidelity matters, prefer a **video/transcript-derived pass** before calling the lesson complete.
- Use the nearby course asset `/Users/ryanpotteiger/Documents/AntiGravity/_templates/AI Agents Full Course 2026 - Master Agentic AI/All Demo Files/Video-to-Action via Gemini Passthrough.md` and the in-repo `shared/skills/video-to-action/SKILL.md` pattern to extract procedures from the original lesson media.
- It is acceptable to swap the provider used by a lesson if the economic profile improves, as long as the lesson contract, business outcome, and operational ergonomics stay comparable or improve.
