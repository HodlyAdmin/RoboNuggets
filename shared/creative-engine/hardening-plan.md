# Implementation Plan — Final Hardening & Git Cleanup

The user is requesting to "deal with" the current state of the project, which includes 33 uncommitted changes (as seen in the screenshot) and 5% remaining gaps in the R56 hardening session (as documented in `HANDOFF.md`).

## 1. Final Hardening Gaps (Code Fixes)

### Task 1: Wire Cost Tracker into `api-gemini.js`
Currently, the `cost-tracker.js` utility is implemented but not actually receiving token usage data from the Gemini REST calls.
- **Action**: Modify `shared/api-gemini.js` to accept a tracker or allow a global registration of one.
- **Action**: Update `shared/creative-engine/index.js` to initialize a `createCostTracker()` instance for every run and inject it into the pipeline.
- **Action**: Update `manifest.js` to ensure the final cost summary is saved.

### Task 2: Multimodal Selection Improvements
- **Action**: Ensure `selectionPolicy: "judge"` correctly routes to manual review if the API key is missing or the confidence is low.

## 2. Live Verification Run

- **Action**: Execute a live run of the R56 baseline config through the new CLI entry point to verify end-to-end telemetry and artifact capture.
- **Goal**: Confirm that the "Live run through new CLI entry" gap in `HANDOFF.md` is closed.

## 3. Git State & Secret Safety

The screenshot shows an `.env` file staged for commit in the `suno-wrapper` folder, which contains a potentially sensitive `SUNO_COOKIE`.
- **Action**: Identify why 32 changes are appearing in the user's sidebar but not in the agent's `git status`.
- **Action**: Un-stage the `.env` file to prevent accidental secret leakage.
- **Action**: Create a clean final commit with the API key environment changes as requested in the screenshot's message.

## 4. Documentation Update
- **Action**: Finalize `HANDOFF.md` to move R56 to "100% Complete".
