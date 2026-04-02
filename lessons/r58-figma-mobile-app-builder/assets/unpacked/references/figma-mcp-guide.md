# Figma MCP Guide

## What Is It?

Figma's official MCP server lets AI tools (Claude Code, Cursor, Copilot, etc.) read your Figma designs directly — not as screenshots, but as structured data (layers, colors, spacing, components, layout rules). This means AI can generate much better code from your designs.

There are two versions:
- **Remote server** (`https://mcp.figma.com/mcp`) — paste Figma links, includes "Code to Canvas" feature
- **Desktop server** (`http://127.0.0.1:3845/mcp`) — works with your current selection in Dev Mode

---

## Setup for Claude Code

```bash
# Remote (recommended)
claude mcp add --transport http figma-remote-mcp https://mcp.figma.com/mcp

# Desktop (alternative — requires Figma desktop app in Dev Mode)
claude mcp add --transport http figma-desktop-mcp http://127.0.0.1:3845/mcp
```

Type `/mcp` in Claude Code to manage servers and authenticate.

---

## What Tools Does It Give You?

| Tool | What It Does |
|------|-------------|
| `get_design_context` | Gives you a structured code representation of your Figma selection (React + Tailwind by default, customizable) |
| `get_variable_defs` | Pulls out colors, spacing, typography tokens |
| `get_screenshot` | Takes a PNG screenshot of your selection for visual reference |
| `get_metadata` | Returns layer structure (IDs, names, types, positions, sizes) |
| `get_code_connect_map` | Shows which Figma components map to which code components |
| `add_code_connect_map` | Links a Figma element to a code component |
| `get_code_connect_suggestions` | Auto-detects component mappings between Figma and your codebase |
| `create_design_system_rules` | Generates rule files so AI output matches your design system |
| `get_figjam` | Reads FigJam diagrams as structured data |
| `generate_diagram` | Creates FigJam diagrams from Mermaid syntax (flowcharts, sequence diagrams, etc.) |
| `generate_figma_design` | **Code to Canvas** — captures your running UI and turns it into editable Figma layers (Claude Code only) |
| `whoami` | Shows who's authenticated |

---

## Cool Things People Have Built

### 1. Tetris Game from a FigJam Flowchart
Designer Felix Lee drew a flowchart in FigJam describing Tetris game logic, connected it to Claude Code via MCP, and got a **complete playable Tetris game** — in a single prompt.
- Source: [The Designer's Playbook](https://adplist.substack.com/p/how-to-build-with-figma-mcp-the-designers)

### 2. CRM Dashboard in an Afternoon
Teams have taken CRM dashboard designs from Figma Community and generated working code with 8+ complex UI components in a single afternoon — work that previously took 2-3 days.
- Source: [Composio Blog](https://composio.dev/blog/how-to-use-figma-mcp-with-claude-code-to-build-pixel-perfect-designs)

### 3. Chat UI from Material 3 Design
Builder.io tested generating a Material 3 chat interface — 215 lines of React and 350 lines of CSS produced in ~4 minutes. The result closely matched the Figma design.
- Source: [Builder.io](https://www.builder.io/blog/figma-mcp-server)

### 4. Production Design System Generation
Anxhi Subashi built a full production-ready design system — generating merge-ready components directly from Figma. Key insight: clean Figma structure (semantic names, proper variables) is essential.
- Source: [Medium](https://anxhisubashi.medium.com/how-to-build-a-production-ready-design-system-from-figma-using-figma-mcp-bab35dca65dc)

### 5. Font Archive Website
A designer building an online archive of the Rotis font used Figma MCP with Cursor and got accurate colors, correct layouts, and even button hover states — from a single prompt.
- Source: [Design Philosophy](https://designphilosophy.substack.com/p/getting-remarkable-results-quickly)

### 6. AI-Designed Landing Page Inside Figma
Using figma-console-mcp, AI agents designed a full landing page directly inside Figma.
- Source: [GitHub](https://github.com/southleft/figma-console-mcp)

### 7. Code to Canvas (Bidirectional Loop)
Build something in Claude Code, preview it in the browser, say "Send this to Figma" — your live UI becomes editable Figma frames (real layers, not screenshots). Then refine in Figma and push updates back to code.
- Source: [Figma Blog](https://www.figma.com/blog/introducing-claude-code-to-figma/)

---

## Example Prompts That Work Well

### Basic Design-to-Code
```
I want to convert this Figma design to code.
Figma URL: [paste link]
Stack: Next.js 14 + Tailwind + TypeScript.
Analyze the design, extract the color palette, and tell me which section to build first.
```

### Framework-Specific
```
Generate my Figma selection in Vue
Generate my Figma selection in plain HTML + CSS
Generate my Figma selection in iOS (SwiftUI)
```

### Component-Aware
```
Generate my Figma selection using components from src/components/ui
Generate my Figma selection using components from src/ui and style with Tailwind
```

### Design System Speedrun
```
Read the design system file, extract tokens, generate base components
(Button, Card, Input, Badge), then build the homepage using those components
```

### FigJam to Code
```
Create a flowchart for the user authentication flow using the Figma MCP generate_diagram tool
```

### Capture Running UI Back to Figma
```
Start a local server for my app and capture the UI in a new Figma file
```

### Refinement
```
Replace custom Tailwind values with standard utility classes.
Avoid arbitrary values like p-[40px]; use default spacing instead.
```

---

## Speed & Cost Benchmarks

| Task | Time | Token Cost |
|------|------|-----------|
| Small component (card, hero block) | ~20 seconds | ~$0.10 |
| Full page with 6 sections | couple of minutes | ~$0.21 |
| Dashboard with 8+ components | single afternoon | varies |

Teams report **50-70% reduction** in initial development time with mature design systems.

---

## Tips for Best Results

1. **Break it up** — do the nav bar, then sidebar, then content card. Don't try the entire page at once.
2. **Two-step approach** — first get the design context for structure, then get a screenshot for visual reference.
3. **Clean your Figma files** — use semantic layer names, Auto Layout everywhere, proper component variants, design tokens.
4. **Set up Code Connect** — maps Figma components to your actual code components for much better output (requires Org/Enterprise plan).
5. **Use `create_design_system_rules`** — generates rule files so AI output matches your tech stack.
6. **Be specific in prompts** — specify framework, file location, component library to use.

---

## Third-Party / Community MCP Servers

| Project | What It Does | Link |
|---------|-------------|------|
| **Framelink** (GLips) | Open-source, works with free Figma accounts, simplifies context | [GitHub](https://github.com/GLips/Figma-Context-MCP) |
| **TalkToFigma** (Grab) | Read AND write Figma — create, modify, delete elements programmatically | [GitHub](https://github.com/grab/cursor-talk-to-figma-mcp) |
| **figma-console-mcp** | Exposes your design system as an API | [GitHub](https://github.com/southleft/figma-console-mcp) |
| **figma-use** | CLI with 100+ commands for controlling Figma | [GitHub](https://github.com/dannote/figma-use) |
| **figma-pilot** | AI agents control Figma via code execution | [GitHub](https://github.com/youware-labs/figma-pilot) |
| **ZapCode** | Figma plugin that connects designs to AI coding assistants | [Figma Community](https://www.figma.com/community/plugin/1454956820198178710/zapcode-figma-mcp-figma-to-code-with-ai) |

---

## Key Resources & Links

**Official Figma**
- [Figma MCP Server Intro](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Developer Docs — Tools & Prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Setup Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [MCP Catalog](https://www.figma.com/mcp-catalog/)
- [Official Demo File](https://www.figma.com/community/file/1512743243938825047/demo-mcp)
- [Write Effective Prompts](https://developers.figma.com/docs/figma-mcp-server/write-effective-prompts/)
- [Code to Canvas Blog Post](https://www.figma.com/blog/introducing-claude-code-to-figma/)
- [Design Systems + MCP](https://www.figma.com/blog/design-systems-ai-mcp/)

**Tutorials & Walkthroughs**
- [Builder.io — Design to Code with Figma MCP](https://www.builder.io/blog/figma-mcp-server)
- [Builder.io — Claude Code + Figma MCP](https://www.builder.io/blog/claude-code-figma-mcp-server)
- [Builder.io — Claude Code to Figma](https://www.builder.io/blog/claude-code-to-figma)
- [LogRocket — How to Structure Figma Files for MCP](https://blog.logrocket.com/ux-design/design-to-code-with-figma-mcp/)
- [Composio — Pixel Perfect Designs](https://composio.dev/blog/how-to-use-figma-mcp-with-claude-code-to-build-pixel-perfect-designs)

**Community Examples & Experiences**
- [The Designer's Playbook (Tetris from FigJam)](https://adplist.substack.com/p/how-to-build-with-figma-mcp-the-designers)
- [Getting Remarkable Results Quickly](https://designphilosophy.substack.com/p/getting-remarkable-results-quickly)
- [Production-Ready Design System from Figma](https://anxhisubashi.medium.com/how-to-build-a-production-ready-design-system-from-figma-using-figma-mcp-bab35dca65dc)
- [Pixel-Perfect Code Generation](https://medium.com/@reuvenaor85/the-way-to-figma-mcp-pixel-perfect-code-generation-for-react-tailwind-1623fd5383b8)
- [A Better Figma MCP](https://cianfrani.dev/posts/a-better-figma-mcp/)
- [How to Write High-Quality MCP Prompts](https://eoncodes.substack.com/p/how-to-write-high-quality-mcp-prompts)
- [10 Specialized Figma MCP Prompts (GitHub Gist)](https://gist.github.com/eonist/1d18de2ecd2e18bacf36ddc669d3bddf)

**Video Tutorials**
- [Figma MCP Collection — Official Videos](https://help.figma.com/hc/en-us/articles/35280808976151-Figma-MCP-collection-MCP-collection-overview)
- [Design Systems + Code Connect + MCP (feat. Jake Albaugh)](https://help.figma.com/hc/en-us/articles/36189347137047-Figma-MCP-collection-Figma-Developer-Workflows-design-systems-Code-Connect-MCP-and-Make-feat-Jake-Albaugh)
