# Flash Task 3 Prompt — Review Gallery UI

Paste this entire prompt into a NEW Gemini 3 Flash chat.

---

## PROMPT START

You are executing Task 3 of a multi-phase hardening plan for the RoboNuggets project. This is the biggest standalone piece — a local review gallery web UI.

**Step 1**: Read context files:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/.agent/handoffs/r56-hardening-flash-handoff.md
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/index.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/cli.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/manifest.js
```

Also look at an existing manifest to understand the data shape:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r56-creative-engine/output/r56-preferred-image-proof_1775165789996/manifest.json
```

And list available media files:
```
ls -la /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r56-creative-engine/output/r56-preferred-image-proof_1775165789996/
```

**Step 2**: Install Express (if needed):
```
cd /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets && npm install express
```

**Step 3**: Create these files:

### 1. `shared/creative-engine/review/server.js` — Express server

Requirements:
- Serves static files from `ui/` subdirectory
- Takes `outputDir` as constructor option (default: `lessons/r56-creative-engine/output`)
- API routes:
  - `GET /api/runs` — scan output directory, read each run's `manifest.json`, return array of runs with metadata
  - `GET /api/runs/:runId` — return full manifest for a specific run
  - `GET /api/runs/:runId/candidates` — extract all candidates from all stages (image, video, audio) and return flat array with stage info
  - `POST /api/runs/:runId/candidates/:candidateIndex/review` — body: `{ decision: 'approved' | 'rejected' | 'redo', notes: '' }` — save to `<runDir>/review-decisions.json`
  - `POST /api/runs/:runId/approve-all` — bulk approve all pending candidates
  - `GET /media/*` — serve actual media files by absolute path (security: only serve files within the output directory)
- CORS enabled for local development
- Listen on configurable port (default 3456)

**CRITICAL**: The manifest format from existing runs has this structure:
```json
{
  "stages": {
    "imageGeneration": {
      "status": "completed",
      "imagePath": "/absolute/path/to/file.jpg",
      "flowCandidates": [
        { "index": 0, "path": "/absolute/path.jpg", "selected": true, "meta": { "size": 221729 } },
        { "index": 1, "path": "/absolute/path.jpg", "selected": false, "meta": { "size": 82854 } }
      ],
      "heroSelection": { "policy": "first", "winnerIndex": 0 }
    },
    "videoGeneration": {
      "status": "completed",
      "flowCandidates": [...],
      "heroSelection": {...}
    }
  }
}
```
The review UI must handle BOTH old manifests (with `stages.imageGeneration`, `stages.videoGeneration`) and newer engine manifests.

Media files are stored as absolute paths on disk. The `/media/*` endpoint should map these to serveable URLs. Strategy: strip the output directory prefix and serve relative to it.

### 2. `shared/creative-engine/review/ui/index.html` — Gallery page

Single-page app with:
- Header bar with title "Creative Engine | Review Gallery" and run count
- Run selector (sidebar or top bar showing all available runs with date, project name, status)
- Main content area showing candidates in a responsive grid
- Each candidate card shows:
  - Media preview (image for images, video player for .mp4 files)  
  - Stage badge (Image / Video / Audio)
  - Candidate index (e.g., "Candidate 1 of 2")
  - File size (formatted: KB/MB)
  - Selection status from hero selection (Winner / Runner-up)
  - Review status badge (Pending / Approved / Rejected / Redo)
  - Three action buttons: Approve ✅, Reject ❌, Redo 🔄
  - Notes textarea (visible on Redo)
- Batch approve button in the header
- Filter by review status (All / Pending only)
- Run summary showing total candidates, approved, rejected, pending counts

### 3. `shared/creative-engine/review/ui/gallery.css` — Premium dark mode styles

Design requirements — this needs to look PREMIUM:
- **Background**: Deep slate/charcoal (`#0f1117` or similar dark)
- **Cards**: Glassmorphism with subtle backdrop-blur, translucent borders (`rgba(255,255,255,0.06)`)
- **Accent colors**: 
  - Approve: teal/green gradient (`#10b981` → `#059669`)
  - Reject: warm red (`#ef4444` → `#dc2626`)
  - Redo: amber/orange (`#f59e0b` → `#d97706`)
  - Pending: muted blue (`#6366f1`)
  - Winner: gold badge (`#fbbf24`)
- **Typography**: `'Inter', system-ui, -apple-system, sans-serif`  
- **Card hover**: subtle lift (translateY -2px) with box-shadow deepening
- **Image hover**: subtle scale(1.02) with smooth transition
- **Video cards**: play icon overlay that fades on hover, inline playback on click
- **Status badges**: pill-shaped, semi-transparent background
- **Responsive**: CSS Grid, `auto-fill` with `minmax(320px, 1fr)`
- **Transitions**: all interactive elements have `transition: all 0.2s ease`
- **Scrollbar**: custom thin dark scrollbar
- **Empty state**: elegant message when no runs found

### 4. `shared/creative-engine/review/ui/gallery.js` — Client logic

- Fetch runs on page load
- Show run selector with most recent first
- When a run is selected, fetch candidates and render cards
- Handle approve/reject/redo button clicks → POST to API → update UI immediately (optimistic)
- Handle batch approve → POST → update all cards
- Video elements: play on click, pause on click again, muted autoplay preview on hover
- Filter by status
- Show toast notifications for actions ("Approved candidate 1", "Rejected candidate 2")

### 4. Wire the review server into the engine

Update `shared/creative-engine/index.js`:
- The `review()` method should import and start the review server

Update `shared/creative-engine/cli.js`:
- `--review` should call `engine.review({ port })` which starts the server

**Step 4**: Verify:
```
node shared/creative-engine/cli.js --review --port 3456
```
Then open `http://localhost:3456` and confirm:
- The gallery loads with existing proof runs
- Candidate cards display with images/videos
- Action buttons work

**Rules**:
- Express is the ONLY server dependency
- Static UI is vanilla HTML/CSS/JS (no React, no build step)
- All files are ESM
- Follow existing logging pattern
- Media serving must be secure — only serve files within the configured output directory
- The review UI should work with the existing manifest format from prior proof runs

**Report**: When done, list all files created/modified, confirm the server starts, and describe what the gallery looks like.

## PROMPT END
