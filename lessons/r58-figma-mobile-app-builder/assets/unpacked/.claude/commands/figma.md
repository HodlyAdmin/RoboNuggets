---
name: figma
description: Start a Figma design-to-code session. Paste a Figma URL or describe what you want to build.
---

You are about to do Figma-related work. Ask the user what they want to do, then proceed:

**Option A — Figma → Code**
If they paste a Figma URL:
1. Extract `fileKey` and `nodeId` from the URL (convert `-` to `:` in nodeId)
2. Call `get_design_context` with those values
3. Study the returned code, screenshot, colors, fonts, and layout
4. Generate a working HTML file faithful to the design
5. Use Lucide icons (never emoji), Unsplash photos for backgrounds, Google Fonts

**Option B — Code → Figma**
If they want to send a running UI back to Figma:
1. Ensure the app is running on a local server
2. Call `generate_figma_design` without `outputMode` to get capture instructions
3. Poll with `captureId` every 5 seconds until `status === 'completed'`

**Option C — Setup**
If they haven't connected Figma MCP yet, run:
```
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```
Then instruct them to restart Claude Code and authenticate via `/mcp`.

---

**UI Quality Rules (non-negotiable):**
- Icons: `<i data-lucide="name"></i>` + `lucide.createIcons()` — never emoji
- Photos: `https://images.unsplash.com/photo-[ID]?w=500&q=80` as CSS background-image with dark gradient overlay
- Stars/ratings: Lucide `star` icon with `fill: currentColor` — never ⭐
