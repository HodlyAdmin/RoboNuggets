# Model Fit And Handoff Guidance

Updated: 2026-04-02

This file records what we have learned from actually using different models on this repo. It is not theory-only guidance. Update it when a model clearly succeeds or struggles at a real repo task.

## Current Recommendation

- **Codex**: default `planner + verifier`, and also the safest `executor` for multi-file code surgery
- **Gemini 3 Flash / Flash-style fast models**: bounded executor for repetitive implementation, repo-file updates, and proof collection
- **Gemini 3.1 Pro (High)**: stronger executor for ambiguous browser/CDP debugging than Flash
- **Claude Opus**: best fit for source-intent recovery, lesson-fidelity interpretation, and larger architecture reasoning
- **Claude Sonnet**: bounded executor when the contract is already clear and the task is more implementation than interpretation

## What We Learned

### Codex

Best at:
- turning fuzzy repo goals into bounded task briefs
- catching over-claims from other models
- multi-file coherence checks
- deciding whether work is implemented, partially verified, or actually verified

Current recommendation:
- use Codex as the default planner/verifier
- use Codex as executor when the task is high-risk, cross-cutting, or requires final hardening

### Gemini 3 Flash / Flash-style fast models

Observed strengths in this repo:
- following bounded executor briefs
- making focused code changes
- writing findings into repo files
- running proof-oriented commands when the reporting format is tightly constrained

Observed weakness in this repo:
- drifts into over-claiming when asked to plan, implement, and self-certify in one pass
- weaker fit for ambiguous browser-state debugging loops

Current recommendation:
- use for bounded executor work with explicit acceptance gates
- prefer new chats when phase changes or reporting quality starts degrading
- do not use as the only verifier

### Gemini 3.1 Pro (High)

Observed strengths in this repo:
- better than Flash at reasoning through ambiguous Google Flow / CDP failure modes
- stronger at forming a plausible browser/runtime diagnosis from mixed code + artifact evidence
- good fit for narrow debugging passes that still need restraint
- produced the first successful `R56` verify-pass with `x2` video yielding `2` saved candidates and a live `judge` winner after the earlier Flash-led observability groundwork

Observed weakness in this repo:
- still needs bounded prompts and verifier review
- should not self-upgrade lesson status without manifest-backed proof

Current recommendation:
- use for harder executor passes where the problem is diagnostic, ambiguous, or UI-state heavy
- especially useful for Google/Flow/Lyria debugging

### Claude Opus

Observed strengths in this repo:
- recovering lesson intent from original assets
- identifying source-fidelity gaps
- seeing architecture-level patterns across a lesson

Observed weakness in this repo:
- can still overstate implementation maturity if asked to mix analysis and self-certification

Current recommendation:
- use for source-fidelity, transcript/video intent recovery, and architecture review
- follow with Codex verification/hardening

### Claude Sonnet

Expected fit from current repo experience:
- clear bounded implementation work
- narrower executor role after architecture is already decided

Current recommendation:
- use after the planner has already written the contract

## Professional Workflow

1. **Codex plans**
   - define the target
   - define the role
   - define acceptance gates
   - define proof required

2. **Executor model builds**
   - Flash / Sonnet for bounded implementation
   - Gemini 3.1 Pro for ambiguous debugging
   - Opus for intent recovery and source analysis

3. **Codex verifies**
   - compare claims to manifests, state files, and artifacts
   - downgrade over-claims
   - only then update repo status docs

## Chat Hygiene

- **Stay in the same chat** when the executor is doing one bounded follow-up in the same phase and reporting quality is still good.
- **Start a new chat** when:
  - the task phase changes
  - token pressure starts compressing or distorting reports
  - the model changes
  - the work shifts from proof collection to debugging, or from debugging to implementation

## Current Repo-Specific Picks

- **R45-like lesson hardening**: Codex planner/verifier, Flash or Sonnet executor, Codex final check
- **R56 fidelity / intent recovery**: Opus first, Codex second
- **R56 Flow/CDP debugging**: Gemini 3.1 Pro (High) executor, Codex verifier
- **Proof reruns / filesystem reporting**: Gemini 3 Flash executor, Codex verifier
- **Creative Engine hardening (R56→standalone)**: Opus architect, Flash executor (scaffold/UI/batch/docs), Opus verifier. See `.agent/handoffs/r56-hardening-flash-handoff.md` for full task specs.
