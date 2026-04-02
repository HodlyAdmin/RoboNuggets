# Figma MCP Starter — Claude Code Workspace

Build real apps from Figma designs in minutes using Claude Code + the official Figma MCP server.

This is the workspace you were given during the workshop. Open this folder in Claude Code and you're ready to go.

---

## What's Inside

```
.claude/agents/figma.md         ← Figma subagent (auto-triggered, runs in background)
.claude/commands/figma.md       ← /figma slash command (explicit, runs inline)
references/figma-mcp-guide.md   ← Full guide: tools, prompts, benchmarks, resources
references/examples/            ← 6 demo apps built live during the session
tools/figma-setup.md            ← Step-by-step Figma MCP setup instructions
```

### Two Ways to Use the Figma Brain

This workspace ships with two Claude Code integrations for Figma — they work differently and complement each other:

**Subagent** (`.claude/agents/figma.md`) — automatic
Claude detects Figma-related work on its own and routes it through this agent in the background. You don't invoke it — just paste a Figma URL or mention design work and it kicks in.

**Slash command** (`.claude/commands/figma.md`) — explicit
Type `/figma` to start a guided Figma session on demand. Use this when you want to be deliberate about starting a Figma workflow, or when the auto-trigger isn't firing.

Both use the same knowledge and quality standards — real icons (Lucide), real photography (Unsplash), full Figma MCP toolset.

---

## Quick Start

### Step 1 — Connect Figma MCP

Open Claude Code in this folder and run:

```
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```

Then restart Claude Code, type `/mcp`, find **figma**, and click **Authenticate**.

Or ask Claude: *"Set up Figma MCP for me"* — the figma agent in `.claude/agents/` will walk you through it automatically.

### Step 2 — Grab a Figma Community Template

Go to [figma.com/community](https://www.figma.com/community) and find any free design template. Copy the URL.

### Step 3 — Build It

Paste the Figma URL into Claude Code:

```
Convert this Figma design to a working HTML app:
[your Figma URL]
```

Claude will read the design, extract colors/fonts/layout, and generate the code.

### Step 4 — Send It Back to Figma (optional)

Once your app is running in a browser:

```
Start a local server for my app and capture the UI back to Figma as a new file
```

Your working UI becomes editable Figma layers.

---

## Example Apps

The `references/examples/` folder has 6 working demos from the session. Open any `index.html` in your browser to see the result. These are what came out of the Figma → Code workflow — no manual design work, no hand-written CSS.

| App | Theme |
|-----|-------|
| coffee-app | Espresso / dark coffee UI |
| drift-app | Automotive / motorsport |
| glow-app | Beauty / wellness |
| leaf-app | Nature / sustainability |
| lift-app | Fitness / gym |
| wander-app | Travel / adventure |

---

## Requirements

- [Claude Code](https://claude.ai/code) installed
- A Figma account (free plan works — the MCP uses OAuth, no API key needed)

---

## Learn More

See `references/figma-mcp-guide.md` for the full breakdown: every MCP tool explained, example prompts, speed benchmarks, and a curated list of tutorials.
