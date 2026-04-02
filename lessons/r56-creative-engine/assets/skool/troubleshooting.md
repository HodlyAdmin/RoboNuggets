# R56 Troubleshooting Notes

Use this file to capture separate troubleshooting posts, comments, or lesson addenda that materially affect whether the rebuild works.

## Source

- Skool lesson page: https://www.skool.com/robonuggets/classroom/4fd11490?md=410db1af99764d0f9c0f9034ebdd068f
- Support page referenced: "Where to get help" page (linked from lesson page)
- Credential tutorials: linked from lesson page under "Set up API keys"

## Known Failure Modes from Template Source

### 1. Kie.ai Reference Image Expiry (Template-Proven)

From `CLAUDE.md` line 344: "Reference images uploaded to Kie.ai expire after 3 days."

If using the original Kie.ai path, reference images need to be re-uploaded before each generation batch if more than 3 days have passed. The CDP rebuild avoids this by uploading directly to Flow via the browser.

### 2. Airtable Batch Limit (Template-Proven)

From `CLAUDE.md` line 345: "Airtable batch operations are limited to 10 records per request (handled automatically)."

The original `airtable.py` handles this internally. The rebuild's Airtable sink is optional/disabled.

### 3. Video Generation Timing (Template-Proven)

From `CLAUDE.md` line 346: "Video generation takes 2-4 minutes per video (Kling), 10-12 minutes (Sora), varies for Veo 3.1."

The rebuild uses Veo 3.1 Fast (Lower Priority) through Flow, which can take up to 10 minutes for the free-tier queue. The timeout is set at `600000ms` accordingly.

### 4. Double Quotes in Prompts (Template-Proven)

From `prompt-best-practices.md` line 438: "No double quotes inside prompts — they break JSON serialization."

This is a real JSON-serialization issue for the original API path. The CDP rebuild avoids this because prompts are injected via DOM manipulation, not API JSON payloads.

### 5. Google Provider Is Synchronous (Template-Proven)

From `image_gen.py` line 9: "Google is synchronous (no polling). Kie AI is async (submit → poll)."

This means Google AI Studio image generation returns immediately, while Kie.ai requires polling. The original batch architecture is designed around this split.

## Known Failure Modes from CDP Rebuild

### 6. Flow Free-Tier Queue Variability

The lower-priority Veo 3.1 queue can vary significantly in wait time. The `600000ms` timeout is a conservative baseline but some generations still time out during high-demand periods.

### 7. Flow UI Variant Count Inconsistency

When requesting `variantCount: "x2"` for images, Flow sometimes only produces 1 visible candidate in the UI. For video, `x2` consistently yields 2 candidates. The heuristic capture in `chrome-flow.js` handles this by collecting all media payloads >50KB.

### 8. macOS Save-As Dialog Deadlock

From `architecture-and-conventions.md`: Never use the native browser Download button from an attached Chrome session. The macOS "Save As" OS dialog intercepts it and deadlocks Node.js indefinitely. All media extraction uses CDP network interception instead.

### 9. Provider-Side Cleanup Disabled

The `deleteFlowProject` function in `chrome-flow.js` is explicitly disabled because the Flow dashboard no longer exposes project names in a way that allows safe deletion by name in a shared account.

## Notes From Live Verification Runs

### Source Baseline Run (2026-04-02)

- Successfully generated image + video in sequence
- Reference images uploaded to Flow for image stage
- Generated image uploaded to Flow for video stage
- Video stage correctly enforced `0 credits` before submit
- Total runtime: ~12 minutes (most time in Veo queue)

### Verify Pass (2026-04-02)

- `variantCount: "x2"` with `2` saved MP4 candidates
- `judge` policy selected a winner via multimodal Gemini evaluation, via `generateMultimodalJSON()` in `shared/api-gemini.js`

### Manual Review Pass (2026-04-02)

- `manual` policy correctly gated the image with `needs-review` status
- Job state file persisted the `needs-review` status

## Transcript-Derived Architectural Insights

These are not failure modes but conceptual differences between the original lesson intent and the rebuild:

### 10. Lesson Teaches "Creative Dark Factory" Pattern (Transcript-Derived)

The instructor frames the system as a "Creative Dark Factory" where the user is the director and multiple parallel subagents handle image generation, video generation, and Airtable updates simultaneously. The rebuild is a sequential single-shot pipeline. This is not a bug — it's an accepted architecture simplification — but it means the rebuild doesn't demonstrate the parallel multi-agent advantage that is Advantage 3 in the video.

### 11. Provider Abstraction Is a Teaching Point (Transcript-Derived)

The instructor explicitly shows the `providers/` folder and explains the wrapper pattern as a core advantage ("future-proof"). The rebuild's Flow-only CDP path works but does not demonstrate this taught concept. If provider diversity becomes important later, the `shared/flow-wrapper/` seam provides the right insertion point.

### 12. Prompt Best Practices as "Master Prompter" (Transcript-Derived)

The instructor describes the prompt-best-practices file as "like having a master prompter consulting on every prompt." The file exists in `assets/original/.../references/docs/prompt-best-practices.md` (445 lines, 21KB) but is not surfaced to the rebuild's runtime. This is a known medium-severity gap.

### 13. Agent Memory/Context Not Implemented (Transcript-Derived)

Advantage 4 in the video is "Memory and Context" — the agent remembers user preferences across sessions and stores a style guide in its memory. The rebuild has no equivalent persistent memory across runs. Each run starts fresh from config.
