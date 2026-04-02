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
- **Full Course Assets Nearby:** `/Users/ryanpotteiger/Documents/AntiGravity/_templates/AI Agents Full Course 2026 - Master Agentic AI/All Demo Files` contains reusable patterns that are relevant here, especially `Video-to-Action via Gemini Passthrough.md`, `multi-agent-chrome-skill/`, and `model-chat-skill/`.
- **Video-to-Action Relevance:** The repo also includes `shared/skills/video-to-action/SKILL.md`, matching the course material. Use that pattern when exact lesson behavior matters and a description-only rebuild may drift from what the video actually teaches.
- **Lesson Rebuild Standard:** There is now a repo-wide playbook at `knowledge/lesson-rebuild-playbook.md` plus a helper scaffold script at `shared/lesson-fidelity-scaffold.js`. Use these to give future lessons the same `assets/original/`, `assets/skool/`, and `FIDELITY.md` structure that R45 now has.

## Cross-LLM Handoff Workflow

If you need to switch from Codex to Gemini or another LLM because of token limits, use this file as the entrypoint and tell the next model to follow this exact workflow:

1. Read `HANDOFF.md` first for current repo state and active decisions.
2. Read `knowledge/architecture-and-conventions.md` for repo-wide technical rules.
3. Read `knowledge/lesson-rebuild-playbook.md` for the standard rebuild process.
4. Read the target lesson's `README.md`, `FIDELITY.md` if present, and `assets/skool/setup-notes.md`.
5. Use the target lesson's `config.source-baseline.json` if it exists; otherwise scaffold the source-fidelity files first with `npm run lesson:fidelity:scaffold -- --lesson-dir lessons/<lesson-dir>`.
6. Verify by running the real lesson command or dry run, and save the output artifacts or failure notes locally instead of only describing what should happen.

The key rule is: **handoff through files and runnable baselines, not through chat history.**

## Current Next-Lesson Target

If another LLM is picking up the next major build task, the current recommended target is:

- `lessons/r56-creative-engine/`

Target instruction:

- Read `HANDOFF.md` first.
- Then apply the repo's lesson rebuild standard to `lessons/r56-creative-engine/`.
- Preserve or unpack original lesson assets where available.
- Create or refine `assets/skool/`, `assets/original/`, and `FIDELITY.md` as needed.
- Prefer writing findings into repo files over chat-only summaries.
- Leave the lesson in a state where Codex can review and verify it.

## Recommended Gemini -> Codex Loop

This is a safe multi-LLM pattern for this repo:

1. Use Gemini to do source capture, note extraction, transcript/video summarization, first-pass lesson drafting, or broad implementation work.
2. Make Gemini write its findings into repo files:
   - `assets/skool/setup-notes.md`
   - `assets/skool/troubleshooting.md`
   - `FIDELITY.md`
   - baseline config/fixture files when useful
3. Then hand the repo back to Codex for:
   - multi-file coherence checks
   - architecture corrections
   - bug fixing
   - live verification
   - review of whether the rebuilt lesson actually matches repo standards

This pattern is encouraged. Gemini does not need to be perfect to be useful, as long as its work lands in the repo in a reviewable form.

## Fallback Prompt For Another LLM

If you want a one-shot prompt to give Gemini, use this:

> Read `HANDOFF.md` and follow the Cross-LLM Handoff Workflow exactly. Then work on `lessons/<target-lesson>/` using the repo's lesson rebuild standard. Do not rely on prior chat context. Write important findings into repo files, use or create source-fidelity artifacts (`assets/original/`, `assets/skool/`, `FIDELITY.md`, source baseline files), and verify your work by running the relevant lesson command instead of only describing a plan.
