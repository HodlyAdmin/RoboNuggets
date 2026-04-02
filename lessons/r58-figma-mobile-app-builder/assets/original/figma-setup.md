# Figma MCP Setup — Agent Instructions

You are setting up the Figma MCP integration for the user. Work through these steps in order. Do each step yourself unless it is marked **[USER MUST DO]** — for those steps, tell the user exactly what to do and wait for them to confirm before continuing.

---

## Step 1 — Register the MCP Server

Run this command:

```
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
```

Confirm to the user that it ran successfully.

---

## Step 2 — Restart and Authenticate [USER MUST DO]

Tell the user:

> "Now I need you to do two things I can't do myself:
> 1. Close Claude Code completely and reopen it — MCP servers only load at startup.
> 2. Once it reopens, type `/mcp`, find **figma** in the list, and click **Authenticate**. A browser window will open — log into your Figma account and click **Allow Access**.
>
> Let me know when that's done."

Wait for the user to confirm before proceeding.

---

## Step 3 — Verify the Connection

Call `whoami` or any available Figma tool to confirm the connection is live. Report back to the user what tools you now have access to.

---

## Step 4 — Test With a Real File

Pick any file from figma.com/community, call `get_design_context` on it, and describe the design to the user — colors, fonts, layout, overall feel. If it works, tell the user they're fully set up.
