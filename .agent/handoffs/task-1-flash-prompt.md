# Flash Task 1 Prompt — Scaffold + Public API + Config Validation

Paste this entire prompt into a NEW Gemini 3 Flash chat.

---

## PROMPT START

You are executing Task 1 of a multi-phase hardening plan for the RoboNuggets project. Read the full handoff document first, then execute only Task 1.

**Step 1**: Read the handoff document:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/.agent/handoffs/r56-hardening-flash-handoff.md
```

**Step 2**: Read these existing files to understand the patterns you must follow:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r56-creative-engine/index.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/logger.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r56-creative-engine/config.source-baseline.json
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/package.json
```

**Step 3**: Execute ONLY Task 1 from the handoff document. Create these files:
1. `shared/creative-engine/index.js` — Public API (`createEngine()`)
2. `shared/creative-engine/config.js` — Config validation + defaults + loader
3. `shared/creative-engine/cli.js` — CLI entry point with arg parsing
4. Update `package.json` with new scripts

**Step 4**: Verify your work:
```
node shared/creative-engine/cli.js --help
node shared/creative-engine/cli.js --config lessons/r56-creative-engine/config.source-baseline.json --dry-run
```

**Rules**:
- All files are ESM (`import`/`export`), no CommonJS
- Follow the existing logging pattern from `shared/logger.js`
- Do NOT modify any existing files except `package.json` (adding scripts only)
- Do NOT touch `shared/chrome-flow.js`, `shared/flow-wrapper/`, or `shared/hero-selection.js`
- The `createEngine().generate()` method should delegate to the existing providers in `lessons/r56-creative-engine/providers/`
- `.review()` and `.resume()` are placeholders for now — just log "not yet implemented" and return

**Report**: When done, list all files created/modified and the output of both verification commands.

## PROMPT END
