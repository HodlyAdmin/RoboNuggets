# Figma MCP Workspace

This workspace is set up for the **Figma → Code → Figma** workflow using Claude Code + the official Figma MCP server.

## What's Available

- **Figma subagent** — auto-triggers on any Figma-related request (paste a URL, mention design work)
- **`/figma` command** — type this to explicitly start a Figma session
- **`references/figma-mcp-guide.md`** — full tool reference, prompts, and resources
- **`references/examples/`** — 6 demo apps built with this workflow

## Figma MCP Setup

If the user hasn't connected Figma yet, run:
```
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```
Then tell them to restart Claude Code, type `/mcp`, find **figma**, and click **Authenticate**.

## UI Quality Standards

Apply these to every generated UI — no exceptions.

- **Icons**: Lucide via CDN — `<i data-lucide="name"></i>` + `lucide.createIcons()` at end of body. Never use emoji as icons.
- **Photos**: Unsplash CDN — `https://images.unsplash.com/photo-[ID]?w=500&q=80` as CSS `background-image` with a dark gradient overlay for legibility.
- **Stars/ratings**: Lucide `star` icon with `fill: currentColor` — never ⭐ emoji.

## Workflow

**Figma → Code**: paste a Figma Community URL → `get_design_context` → generate HTML/React faithful to the design.

**Code → Figma**: run a local server → `generate_figma_design` → your UI becomes editable Figma layers.
