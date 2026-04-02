# RoboNuggets

Rebuilt lessons from [The RoboNuggets Community](https://www.skool.com/robonuggets) as locally executable, **agent-operated modules**.

> **What does "agent-operated" mean?**
> The AI agent replaces n8n as the orchestrator. You tell the agent what to build, and it coordinates local wrappers, browser sessions, and media tooling to produce the output. The Node.js modules are tools the agent calls, but you can also run them directly from the CLI for testing.

The current standard is a **hybrid local API + browser fallback** model:

- wrappers such as `suno-wrapper/` expose stable local HTTP contracts to lessons
- API helpers such as `shared/api-gemini.js` handle providers that already have stable APIs
- browser automation remains available behind those wrappers or as explicit fallback engines
- Wingman/manual intervention is a supported recovery mode when anti-bot or auth flows block full autonomy

## Agent Browser Standard

The default operating model for this project is a **dedicated agent Chrome instance** on port `9333`.

Why this is the default:

- It works across both **Codex** and **Google Antigravity**
- It avoids collisions with other Chrome-based automations on the machine
- It keeps agent logins and tabs separate from your day-to-day browser
- It is easier to inspect, troubleshoot, and reuse across lessons

Recommended launch command:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9333 \
  --user-data-dir=/tmp/robonuggets-agent-chrome
```

Log into Skool, Google, Suno, and any other lesson-specific sites in that dedicated profile.

## Supported Control Modes

This project should support more than one browser-control path.

| Mode | Status | When to use it |
|------|--------|----------------|
| Dedicated local Chrome on `9333` | **Primary** | Default for lesson development and repeatable runs |
| Codex-controlled browser/session | Supported fallback | Useful when Codex can attach cleanly to the local agent browser |
| Antigravity built-in browser / sandbox / WebMCP | Supported fallback | Useful when Antigravity's native browser tooling is the easier path for a given lesson |

Important: we are **not** deleting or banning the other paths. The project standard is to prefer the dedicated local Chrome workflow first, while keeping Antigravity-native and other browser-control options available as fallbacks when they are more practical.

## Lessons

| ID | Title | Engine | Status |
|----|-------|--------|--------|
| R1 | Automate Instagram for 365 days | Local dataset + Chrome-rendered cards + Blotato publishing | ✅ Built |
| R2 | Create & Schedule 100 YouTube Shorts | Local quote source + local TTS + local ffmpeg + Blotato adapter | ✅ Built |
| R3 | 4 Social Media Channels, 1 AI Agent | Local article context + Gemini drafts + local IG asset + Blotato adapter | ✅ Built |
| R45 | Auto Music Creator | Gemini or local idea intake + local Suno hybrid wrapper + ffmpeg | ✅ Built |
| R46 | Ultimate Extract System | Local module + template-driven provider/sink adapters | 🚧 Scaffolded |
| R48 | Gemini 3 x N8N Vibecoding Masterclass | Local scaffold + preserved HTML demo + n8n template references | 🚧 Scaffolded |
| R53 | Vibecreate Videos with Claude Code | Local scaffold + lesson notes + sample prompt | 🚧 Scaffolded |
| R56 | The Antigravity Creative Engine | Local scaffold + preserved creative-engine template kit | 🚧 Scaffolded |
| R58 | Antigravity + Figma Mobile App Builder | Local scaffold + preserved Figma starter workspace | 🚧 Scaffolded |
| R59 | Beautiful Websites Agent Kit | Local scaffold + preserved 4-stage website kit | 🚧 Scaffolded |

## Prerequisites

1. **Chrome** running with remote debugging:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9333 \
     --user-data-dir=/tmp/robonuggets-agent-chrome
   ```
   Override the port with `CDP_PORT` env var if needed.

2. **Logged into your Google account** in Chrome

3. **Provider API credentials or wrapper services** as needed for lesson engines
   For R45:
   ```bash
   npm run suno-wrapper:dev
   ```

4. **Logged into [suno.com](https://suno.com)** when a direct Suno browser flow or wrapper Wingman fallback needs it

5. **Node.js** v20+

6. **Optional:** `BLOTATO_API_KEY` in `.env` for live social publishing lessons

## How It Works

```
Original (n8n):  n8n workflow → API calls → Suno/FFmpeg API → output
This build:      AI Agent → local lesson module → provider API or wrapper → local ffmpeg → output
```

1. **You** tell the agent: "Generate a 5-track lofi album"
2. **Agent** generates concepts through the lesson’s configured AI path
3. **Agent** calls the lesson’s local wrapper or browser driver
4. **Wrapper/driver** handles auth, anti-bot friction, and provider-specific execution
5. **Agent** downloads or assembles the resulting media locally

## Helper Scripts

These scripts are tools the agent can invoke, or you can run manually:

```bash
npm install
npm run suno-wrapper:dev # Start the local Suno hybrid wrapper used by R45
npm run r1:dry    # Inspect the original Make blueprint and local dataset plan
npm run r1        # Prepare the next Instagram post package locally
npm run r2:dry    # Inspect the original Make blueprint and local YouTube Shorts plan
npm run r2        # Generate local short-form video assets and a publish-ready queue item
npm run r3:dry    # Inspect the original multi-channel social blueprint and local plan
npm run r3        # Generate local cross-platform drafts and Blotato-ready queue items
npm run r45:dry   # Dry run — generates or loads song concepts only
npm run r45       # Full R45 pipeline using the local Suno hybrid wrapper by default
npm run r45:build # Assemble video from existing audio tracks + manifest
npm run r46:dry   # Inspect the lesson template and write a local extraction plan
npm run r46       # Run the local extractor module with provider/sink adapters
npm run r48:dry   # Inspect the R48 assets and write a local scaffold plan
npm run r48       # Seed a local R48 workspace from the downloaded lesson pack
npm run r53:dry   # Write the local scaffold plan for the video-creation lesson
npm run r53       # Seed a local R53 reference workspace
npm run r56:dry   # Inspect the creative-engine kit and write a local scaffold plan
npm run r56       # Seed a local creative-engine workspace from the downloaded template
npm run r58:dry   # Inspect the Figma lesson kit and write a local scaffold plan
npm run r58       # Seed a local Figma starter workspace
npm run r59:dry   # Inspect the Beautiful Websites kit and write a local scaffold plan
npm run r59       # Seed a local Beautiful Websites workspace
```

## Architecture

The project is converging on a **stable lesson contract with hybrid execution under the hood**.

```
Your Terminal ← lesson module → local wrapper / browser driver → provider site → local output
```

The important rule is that lessons should prefer stable local interfaces over raw page scripts. For example, R45 now treats the local Suno hybrid wrapper as the standard engine, while direct Chrome/CDP flows remain available as alternates or internal implementation details.

Human-in-the-loop is part of the design. When a provider blocks automation with login, CAPTCHA, or credit-state friction, the system should pause cleanly, foreground the browser, and resume after manual recovery instead of crashing.

## Lesson Rebuild Standard

This repo now has a standard source-fidelity workflow for lessons, based on what worked for R45.

- preserve original lesson assets in `assets/original/`
- capture real Skool notes in `assets/skool/`
- write a `FIDELITY.md` audit when exact lesson behavior matters
- create a repeatable source baseline when a lesson has volatile inputs or providers
- verify at least one real local proof run or scaffold output

Playbook: [lesson-rebuild-playbook.md](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/knowledge/lesson-rebuild-playbook.md)

Scaffold the standard file set for a lesson:

```bash
npm run lesson:fidelity:scaffold -- \
  --lesson-dir lessons/r46-ultimate-extract-system \
  --lesson-id R46 \
  --lesson-title "Ultimate Extract System" \
  --source-url "https://www.skool.com/robonuggets/..."
```
