# RoboNuggets Architecture & Conventions

*Decisions logged: March 2026 — Updated: April 1, 2026*

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

For **Google Flow**, the wrapper pattern is still workable and probably desirable, but it should be a **wrapper around the existing CDP driver**, not a Suno-style token replay clone.

- Flow generation currently depends on browser-native project setup, model/aspect controls, and CDP media interception in `shared/chrome-flow.js`.
- A good Flow wrapper would expose stable endpoints like `start-job`, `get-status`, and `get-artifact`, while using the CDP/browser worker internally.
- Inference: Flow should be wrapped as a **browser-backed service boundary**, not reverse-engineered into a pretend public REST API unless that proves durable from direct evidence.

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

## Video/Image Generation: Google Flow + Veo 3.1 Fast

- All video is generated at `9:16` aspect ratio, `5s` duration via Veo 3.1 Fast
- Strict parameter injection (aspect ratio, model selection) is enforced before prompting
- Gemini Multimodal Quality Gate evaluates and selects the best of the 4 generated candidates
- All losing candidates are deleted as part of Digital Citizenship cleanup

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
