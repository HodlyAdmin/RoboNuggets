# Handoff Summary: RoboNuggets R45 Autonomous Music Pipeline

## Context & Objective
The primary objective of the last session was to harden the **R45 Autonomous Music Creator** pipeline, ensuring it acts as a fully automated, production-grade, and zero-cost music generation module that reliably interacts with Suno without requiring paid CAPTCHA solvers or brittle wrapper APIs.

## Key Technical Milestones Reached
1. **Autonomous Google SSO Flow:**
    - The pipeline now leverages Chromium Persistent Profiles.
    - The bot natively intercepts the Clerk SSO login modal on Suno, locates the **"Continue with Google"** button, and authenticates autonomously because your credentials are saved in the raw local browser state.
2. **Wingman Fallback Architecture (Human-in-the-Loop):**
    - The system is built to survive unexpected blocks like aggressive hCaptcha challenges, insufficient credit toasts, or random Google security checks.
    - Instead of crashing, the script triggers a physical system beep (`\x07`), pulls the Chrome window to the foreground, and pauses sequence execution indefinitely.
    - A human can resolve the issue manually (e.g., clicking a crosswalk, or manually pressing 'Create song'). The exact millisecond the network registers your manual intervention, the pipeline organically intercepts the `Bearer` token and resumes autonomous operations seamlessly.
3. **Native React DOM Injection:**
    - Overcame Suno's React framework blocking "Create song" button activations.
    - By injecting `Object.getOwnPropertyDescriptor` into the text fields, the script forces `input` and `change` events, successfully stimulating the virtual DOM and avoiding "greyed out" functional buttons.

## Important Notes for Next Session
- **Commits:** The codebase tracking the Wingman overrides and Google SSO flows have been successfully committed locally to the `main` branch.
- **Gemini Rate Limits:** You were experiencing `429 RESOURCE_EXHAUSTED` bursts from Google Generative Language. Built-in instruction: wait 60 seconds between running `r45` tests to let the API token bucket refresh.
- **Saved-Concept Production Mode:** R45 now supports `songConceptsPath` plus `skipTimestamps=true`, so repeated Suno production tests can bypass Gemini entirely when concepts are already saved.
- **Fresh Local Intake Mode:** R45 also supports `ideaIntakePath` and inline `ideaSeeds`, so new album ideas can be turned into fresh concepts without Gemini when you want a reusable local intake workflow.
- **Concept Provider Seam:** R45 now has an explicit `conceptProvider` layer (`auto`, `gemini`, `saved-concepts`, `local-intake`). That keeps the lesson contract stable if concept generation later moves to a paid Gemini tier or an MCP-backed LLM.
- **Single-Run Guard:** R45 now creates a local live-run lock file and refuses overlapping live executions on the same machine. If the previous process died unexpectedly, stale locks are automatically cleared once the PID is confirmed dead.
- **Suno Variant Selection:** The local Suno API client now ranks completed clips so non-preview/full generations are preferred over incidental early preview completions.
- **Output Housekeeping:** R45 now auto-cleans its `output/` folder before dry/live runs. Empty timestamp folders and `.DS_Store` noise are removed, while older failed/concept/test runs are moved into the hidden `output/.archive/` folder. Manual cleanup is also available with `npm run r45:clean`.
- **Original R45 Assets Preserved:** The original Skool lesson attachments are now stored locally in `lessons/r45-auto-music-creator/assets/original/`, including the original n8n template JSON `R45 _ Auto Music Creator (by RoboNuggets).json` and the sample image. Use `lessons/r45-auto-music-creator/FIDELITY.md` and `lessons/r45-auto-music-creator/assets/skool/setup-notes.md` as the source-faithfulness audit trail.
- **Source-Baseline Fixtures:** R45 now has a repeatable source-aligned baseline config at `lessons/r45-auto-music-creator/config.source-baseline.json` plus structured local intake at `lessons/r45-auto-music-creator/ideas.source-baseline.json`. Use that combo when retesting the lesson against original assets without burning Gemini quota.
- **Suno Prompt-Length Rule:** A real live failure showed that Suno can reject description-style prompts as `Description is too long`. The lesson now compacts local-intake instrumental prompts and enforces a final 180-character Suno description cap before submission.
- **suno-wrapper Module:** The `suno-wrapper` directory is currently showing as an embedded git repository. It may need to be initialized as a submodule or its internal `.git` removed if it should be tracked as a regular folder.
- **Local Architecture Decision:** In this repo, the intended standard is the local `suno-api` hybrid wrapper. The code already includes a no-`2Captcha` Wingman/manual fallback path that beeps, foregrounds the browser, and resumes once the user solves the Suno/Google block.
- **Project Goal:** This repo is meant to become a cost-leveraged recreation library for RoboNuggets lessons, preferring tools already paid for or locally runnable over pay-as-you-go APIs whenever the lesson outcome can still be preserved.
- **Lesson Fidelity Caveat:** Some lesson implementations were originally generated from lesson descriptions plus Gemini prompting rather than the original lesson transcripts or videos. Treat those modules as outcome-oriented reconstructions, not guaranteed faithful reproductions, until they receive a transcript/video-based fidelity pass.
- **Custom GPT Assessment:** The R45 `Ideator and Timestamp GPT` resource appears to be a ChatGPT custom GPT, not a Gemini Gem. Its internal instructions are not directly exposed, but the original n8n template already reveals the core ideation contract, so it is a reference resource rather than a hard dependency.
- **Vector Memory Source:** The portable vector memory kit lives in `/Users/ryanpotteiger/Documents/AntiGravity/_templates/vector-memory`, and this repo already has it installed under `.agent/memory`. Re-ingest after meaningful doc or architecture updates with `node .agent/memory/ingest.js`.
- **Model-Fit Log:** The running recommendation log for Codex, Gemini Flash, Gemini 3.1 Pro, Claude Opus, and Claude Sonnet now lives at `knowledge/model-fit-and-handoff-guidance.md`. Update it when real repo work teaches us a better role fit.
- **Full Course Assets Nearby:** `/Users/ryanpotteiger/Documents/AntiGravity/_templates/AI Agents Full Course 2026 - Master Agentic AI/All Demo Files` contains reusable patterns that are relevant here, especially `Video-to-Action via Gemini Passthrough.md`, `multi-agent-chrome-skill/`, and `model-chat-skill/`.
- **Video-to-Action Relevance:** The repo also includes `shared/skills/video-to-action/SKILL.md`, matching the course material. Use that pattern when exact lesson behavior matters and a description-only rebuild may drift from what the video actually teaches.
- **Lesson Rebuild Standard:** There is now a repo-wide playbook at `knowledge/lesson-rebuild-playbook.md` plus a helper scaffold script at `shared/lesson-fidelity-scaffold.js`. Use these to give future lessons the same `assets/original/`, `assets/skool/`, and `FIDELITY.md` structure that R45 now has.
- **R56 Verified Source Baseline:** `lessons/r56-creative-engine/` now has a live-verified local baseline. The proven run is `lessons/r56-creative-engine/output/r56-creative-engine-source-baseline_1775135283535/manifest.json`, with a real JPEG image artifact and a real MP4 video artifact.
- **Verified Flow Free Path:** The current working R56 video contract is `Video -> Frames -> 9:16 -> x2 -> Veo 3.1 - Fast [Lower Priority]`, and the driver refuses to submit unless Flow visibly shows `Generating will use 0 credits`.
- **Flow Reference Handling:** R56 now uploads the original source reference images into Flow for the image stage, then uploads the generated image back into Flow as the video start frame.
- **Flow Timeout + Extraction Reality:** The free lower-priority Veo path may need the full `600000ms` timeout. Direct network interception is still used first, but completed video can also be recovered through DOM media extraction when Flow serves the asset behind `media.getMediaUrlRedirect`.
- **Flow Architecture Decision:** After R56, the preferred next Google-media architecture task is to extract a `flow-wrapper` local service so future lessons call a stable hybrid API instead of embedding raw Flow CDP logic.
- **Flow Wrapper Seam Landed:** The repo now has an initial `shared/flow-wrapper/` layer. `R56` image/video providers call that wrapper, and it persists per-job state under each run's `output/.flow-jobs/` directory. It still delegates browser execution to `shared/chrome-flow.js`, so candidate-aware extraction and provider-side cleanup remain the next wrapper milestones.
- **R56 Transcript Status:** R56 now has a transcript/video-derived pass from YouTube auto-captions for the unlisted lesson video (`https://youtu.be/P5kofOFEaBo`). Treat it as `transcript-derived (auto-caption tier)`, not as a human-verified or visual-playback-certified transcript pass.
- **Baseline Is Not Global Default:** The verified R56 free path (`Frames`, `9:16`, `x2`, lower-priority Veo) is the current source baseline for that lesson. It must not silently become the default for all future Flow tasks. Keep model, ratio, candidate count, and credit policy intake/config driven.
- **Creative QA (Heuristic Capture Implementation):** R56 now has a hero selection gate (`shared/hero-selection.js`) wired into the flow-wrapper. The underlying `chrome-flow.js` implements a heuristic capture method that intercepts multiple media payloads (>50KB) and returns them as candidates. Status: *Live-Verified (Partially)* — multi-variant evaluation and manual review are proven for single runs.
- **Gemini as Judge:** Current inference: Gemini is the strongest first-choice multimodal judge for creative-media QA inside this repo, but the evaluation contract should remain swappable.
- **Studio-Grade Digital Citizenship:** Naming projects is not enough. Shared-account automation should also minimize candidate clutter, archive or remove stale local runs, and move toward provider-side cleanup rules for Flow and Suno in multi-user environments.
- **R56 Intent Recovery (Opus Pass):** A deep analysis of all original R56 template artifacts revealed the lesson teaches a **7-workflow architecture**, not a 3-stage pipeline. The full analysis is at `knowledge/r56-intent-recovery-and-studio-architecture.md`. High-priority remaining gaps: no reference video analysis, prompt engineering contract not surfaced at runtime, and preferred-image choice is only partially restored through config rather than a separate review UI.
- **R56 Fidelity Label:** Now `source-audited + live-verified + intent-recovered + transcript-derived (auto-caption tier)`. The `FIDELITY.md` now separates transcript-derived, template-derived, and inferred claims.
- **Flow Wrapper Design:** A full architectural recommendation for the `flow-wrapper` module (job-oriented, candidate-aware, state-persistent) is documented in `knowledge/r56-intent-recovery-and-studio-architecture.md`. It should be a Node module with a stable import interface, not a fake REST API.
- **Hero Selection & Candidate-Aware Extraction:** `shared/hero-selection.js` is wired into `shared/flow-wrapper/index.js`. The `chrome-flow.js` driver implements heuristic capture of media variants (>50KB) by URL. Status: *Live-Verified (Partially)*.
- **R56 Candidate-Aware Proof Runs:** `lessons/r56-creative-engine/output/r56-verify-pass_1775157542622/manifest.json` yielded `2` saved video candidates and the `judge` policy selected a winner. Additionally, `lessons/r56-creative-engine/output/r56-manual-review_1775159203078/manifest.json` yielded an image and successfully gated it with a `needs-review` status via the `manual` policy.
- **Digital Citizenship Framework (Downgraded & Partially Built):** The `chrome-flow.js` driver's `deleteFlowProject` has been explicitly disabled. The Google Flow dashboard no longer exposes project names in a way that allows us to safely target deletions by name; attempting to do so risks deleting other team members' work in a shared account. Local candidate pruning via `cleanupFlowJob` exists but remains an explicit step, not yet automated into the default R56 generation sequence or newly proven here.
- **Operator Watcher:** `shared/flow-wrapper/watch.js` now provides a lightweight local poller for Flow job state, exposed as `npm run r56:watch`. It surfaces `running`, `needs-review`, `completed`, and `failed`. Desktop notification support is implemented for macOS, but notification firing has not been independently verifier-proven yet.
- **R56 Status Update:** Now labeled as `source-audited + live-verified + intent-recovered + transcript-derived (auto-caption tier)`, with partial live proof for candidate-aware hero selection and manual review. Provider-side cleanup remains suspended and broader repeatability across runs remains unproven.
- **Flow Wrapper Maturity:** The wrapper provides a job-oriented, candidate-aware, state-persistent abstraction. It should not be considered "fully hardened" until proven across broader scenarios.
- **Current Model Recommendation:** Use Codex as planner/verifier by default. Use Gemini 3 Flash for bounded executor work and proof collection. Use Gemini 3.1 Pro (High) when the executor task is ambiguous browser/CDP debugging. Use Claude Opus for source-intent recovery and broader lesson-architecture analysis.

## Cross-LLM Handoff Workflow

If you need to switch from Codex to Gemini or another LLM because of token limits, use this file as the entrypoint and tell the next model to follow this exact workflow:

1. Read `WORKSTATE.md` first for current session state and immediate priorities.
2. Read `HANDOFF.md` for current repo state and active decisions.
3. Read `knowledge/architecture-and-conventions.md` for repo-wide technical rules.
4. Read `knowledge/lesson-rebuild-playbook.md` for the standard rebuild process.
5. Read the target lesson's `README.md`, `FIDELITY.md` if present, and `assets/skool/setup-notes.md`.
6. Use the target lesson's `config.source-baseline.json` if it exists; otherwise scaffold the source-fidelity files first with `npm run lesson:fidelity:scaffold -- --lesson-dir lessons/<lesson-dir>`.
7. Verify by running the real lesson command or dry run, and save the output artifacts or failure notes locally instead of only describing what should happen.

The key rule is: **handoff through files and runnable baselines, not through chat history.**

## General Handoff Rule

The repo's earlier handoff style still expected too much from the next model. In practice, many failures came from asking one agent to:

- understand source intent
- design the implementation
- execute the code changes
- verify its own claims

That is too much to assume from any single model consistently.

Going forward, the standard handoff is **role-based**, not model-branded:

1. **Planner / Architect**
   - Understand the lesson intent, source materials, and repo standards
   - Define the implementation plan and acceptance gates
   - Identify what must be proven vs what may remain a gap

2. **Executor**
   - Perform bounded implementation work against the plan
   - Update repo files, configs, and code
   - Avoid broad architectural claims unless the proof is already in the repo

3. **Verifier / Guardrail**
   - Review the actual repo state
   - Compare claims against manifests, artifacts, and runtime evidence
   - Downgrade over-claims and tighten docs before a lesson is called verified

This applies to **all** handoffs:

- Codex account #1 -> Codex account #2
- Codex -> Gemini
- Gemini -> Codex
- Codex -> Claude
- Claude -> Codex
- any future model mix

Inference from current provider positioning: fast models such as Google's Flash line are often a better fit for the **Executor** role than the **Verifier** role. Google's own current Gemini Flash positioning emphasizes low latency, balanced price/performance, and agentic/tool use rather than "trust this model's self-audit by default." Sources: [Gemini 2.5 Flash](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash), [Gemini 2.5 Flash-Lite](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-lite), [Google models overview](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-experimental?hl=en).

So the repo standard should be:

- use a stronger planning/review loop when fidelity or architecture matters
- use faster models for bounded execution when tokens or speed matter
- never let the executor's summary be the only source of truth

## Cross-LLM Acceptance Gates

The R56 review exposed a weakness in the earlier handoff wording: it encouraged verification, but it did not force enough evidence before claiming success.

Going forward, another LLM should not describe a lesson as "verified", "completed", or "baseline-ready" unless the repo contains evidence for each claim.

Required proof rules:

1. **Do not claim a stage succeeded unless the saved artifact matches the claimed media type.**
   - If a lesson claims video generation succeeded, confirm the saved file is actually a video (`.mp4`, `.webm`, etc.), not a poster image or placeholder.
   - If the provider returned the wrong media type, record that as a failed or partial verification, not a success.

2. **Do not claim reference-image support unless the code actually attaches or uploads the reference image.**
   - A prompt saying `Using input image 1` is not enough.
   - If the rebuild only uses text prompts today, document reference-image behavior as a fidelity gap.

3. **Every enabled stage must be reflected in the saved manifest or report.**
   - If audio runs, the manifest must include the audio result or error.
   - If the manifest omits an enabled stage, the run is not fully auditable yet.

4. **Runtime defaults and docs must agree.**
   - If `config.source-baseline.json` is preferred over `config.example.json`, the lesson README and notes should say so.
   - If artifacts are written outside the lesson output directory, document that clearly or fix it before calling the lesson coherent.

5. **Separate these labels clearly in docs and summaries:**
   - `source assets captured`
   - `source-audited`
   - `dry-run verified`
   - `live run partially verified`
   - `live run fully verified`
   - `source-faithful gap remains`

6. **When in doubt, under-claim.**
   - "Image stage succeeded, video artifact type still unverified" is good.
   - "Pipeline completed" is not acceptable if an enabled stage timed out, produced the wrong artifact type, or was not persisted.

Recommended closing format for another LLM:

- exact command run
- config file used
- manifest path
- artifact paths
- what was directly proven
- what is inferred but not yet proven
- what remains broken or unimplemented

## Planner / Executor / Verifier Loop

When handing work to another model, prefer this sequence:

1. **Planner writes the contract**
   - target lesson or module
   - exact files to read first
   - exact problem statement
   - bounded tasks
   - acceptance gates
   - proof required before success can be claimed

2. **Executor performs the bounded work**
   - changes only what is needed
   - writes findings into repo files
   - runs the requested commands
   - reports exact evidence, not broad confidence statements

3. **Verifier audits the result**
   - checks claims against files, manifests, and artifacts
   - verifies docs and runtime match
   - decides whether the work is:
     - implemented
     - partially verified
     - fully verified
     - still source-gap heavy

If the same model has to do all three roles, it should still write as if these are separate checkpoints. That reduces over-claiming.

## Current Next Target

R56 no longer needs a first-pass rebuild. If another LLM is picking up the next major task, the current recommended target is:

- architecture: continue maturing the `flow-wrapper` hybrid local API around `shared/chrome-flow.js`
- lesson work: move to the next unaudited lesson using `knowledge/lesson-rebuild-playbook.md`
- optional fidelity work: escalate R56 from auto-caption-derived to visual-playback / human-verified transcript fidelity if exact screen-share behavior becomes important

Target instruction:

- Read `HANDOFF.md` first.
- Reuse the R45 and R56 `FIDELITY.md` files as the current best examples of source-audited lesson rebuilds.
- Prefer writing findings into repo files over chat-only summaries.
- Leave either the wrapper or the target lesson in a state where Codex can review and verify it.

## Recommended Gemini -> Codex Loop

This is a safe multi-LLM pattern for this repo:

1. Use Gemini to do source capture, note extraction, transcript/video summarization, or bounded implementation work.
2. Make Gemini write its findings into repo files:
   - `assets/skool/setup-notes.md`
   - `assets/skool/troubleshooting.md`
   - `FIDELITY.md`
   - baseline config/fixture files when useful
3. Prefer giving Gemini an explicit **executor brief** rather than asking it to self-certify the whole lesson.
4. Then hand the repo back to Codex for:
   - multi-file coherence checks
   - architecture corrections
   - bug fixing
   - live verification
   - review of whether the rebuilt lesson actually matches repo standards

This pattern is encouraged. Gemini does not need to be perfect to be useful, as long as its work lands in the repo in a reviewable form and a separate verifier reviews the claims.

## Recommended Fast-Executor Prompt Shape

For Flash, Sonnet, or any model you want to use mainly for execution, the prompt should be shaped like this:

- read these files first
- here is the bounded task
- here are the exact acceptance gates
- do not self-certify beyond the evidence
- update repo files, not just chat
- report commands run, files changed, proof, and remaining gaps

That is a better fit than saying "take over the lesson and finish it" with no role separation.

## Recommended Claude Handoff

If you are handing off the next lesson to Claude instead of Gemini:

- Prefer **Claude Opus** when the task is source-fidelity heavy, transcript/video interpretation matters, or the lesson needs broader architecture judgment.
- Prefer **Claude Sonnet** when the task is mostly bounded implementation work against a clear existing contract.

Current recommendation for the next lesson-build handoff: **Claude Opus first-pass, then Codex review/hardening.**

Use `WORKSTATE.md` as the first-file entrypoint for Claude.

## Fallback Prompt For Another LLM

If you want a one-shot prompt to give Gemini, use this:

> Read `HANDOFF.md` and follow the Cross-LLM Handoff Workflow exactly. Then work on `lessons/<target-lesson>/` using the repo's lesson rebuild standard. Do not rely on prior chat context. Write important findings into repo files, use or create source-fidelity artifacts (`assets/original/`, `assets/skool/`, `FIDELITY.md`, source baseline files), and verify your work by running the relevant lesson command instead of only describing a plan.
