# Flash Task 3b Prompt — Review Gallery UX Polish

Paste this into a NEW Gemini 3 Flash chat AFTER Task 5+6 is done (or in parallel if you want).

---

## PROMPT START

You are performing a UX polish pass on the Review Gallery for the RoboNuggets Creative Engine. The gallery already works — your job is to bring it to modern media-tool quality.

**Step 1**: Read the existing gallery files:
```
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/review/ui/index.html
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/review/ui/gallery.css
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/review/ui/gallery.js
cat /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/shared/creative-engine/review/server.js
```

**Step 2**: Implement ALL of these UX improvements:

### 1. Lightbox / Fullscreen Viewer
- Clicking any media (image or video) opens a fullscreen lightbox overlay
- Dark backdrop with 80% opacity
- Full-resolution media centered in viewport
- Close button (top-right X) + click backdrop to close + Escape key to close
- For video: full native controls (play/pause, volume, seek, fullscreen)
- For images: fit-to-view, click to zoom to native resolution, scroll/drag to pan when zoomed
- Arrow keys (← →) to navigate between candidates while lightbox is open
- Show candidate info overlay in lightbox (Candidate N, size, stage, review status)
- Approve/Reject/Redo buttons visible in lightbox too

### 2. Sound Indicator on Video Cards
- Video cards show a muted speaker icon (🔇) by default at bottom-right
- When clicked and playing with sound, icon changes to speaker with sound (🔊)
- This is a visual cue to users that videos have sound on click
- Note: the `toggleVideoPlayback()` function already exists in gallery.js that unmutes on click

### 3. Keyboard Shortcuts
- **← →** arrow keys: navigate between candidates in lightbox
- **A**: Approve currently selected/focused candidate
- **R**: Reject currently selected/focused candidate
- **D**: Redo currently selected/focused candidate
- **Escape**: Close lightbox
- **F**: Open lightbox for focused candidate (or first candidate if none focused)
- Show a small "⌨ Shortcuts" tooltip/popover accessible from the header

### 4. Progress Bar
- Between the summary bar and the filter buttons, show a slim progress bar:
  - Green fill for approved percentage
  - Red fill for rejected percentage
  - Amber fill for redo percentage
  - Unfilled (dark) for pending
- Example: `[████████░░░░] 5/8 reviewed`
- Update dynamically as reviews happen

### 5. Prompt Preview
- Each candidate card should show a truncated prompt below the file size/meta line
- Get the prompt from the manifest data (it's in `stages.imageGeneration.prompt` / `stages.videoGeneration.prompt`)
- Show first 80 characters with "..." truncation
- Click to expand full prompt in a small modal or expandable area

### 6. Export Approved Button
- Add "Export Approved" button next to "Batch Approve All" in the header
- When clicked, calls `POST /api/runs/:runId/export` which:
  - Creates a `deliverables/` folder inside the run directory
  - Copies all approved candidates to it with clean filenames
  - Returns the path and count
- Show toast with "Exported 3 files to deliverables/"
- Add the route to `server.js`

### 7. Side-by-Side Compare Mode
- Add a "Compare" toggle button in the filters bar
- When active, candidates display in a 2-column layout instead of the grid
- Each row shows 2 candidates from the same stage side by side
- Useful for comparing x2 variant candidates
- Label them clearly: "Candidate 1" vs "Candidate 2"
- Approve/reject buttons visible for both sides

**Step 3**: Also update the API to support the new features:

Add to `server.js`:
- `GET /api/runs/:runId` should now also include `prompts: { imageGeneration: "...", videoGeneration: "..." }` extracted from the manifest stages
- `POST /api/runs/:runId/export` — copies approved candidates to `deliverables/` folder

**Step 4**: Verify by launching the server:
```
cd /Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets
# Kill any existing review server first
lsof -ti:3456 | xargs kill 2>/dev/null; sleep 1
node shared/creative-engine/cli.js --review --port 3456
```

Then open http://localhost:3456 and verify:
- Lightbox opens on media click
- Keyboard shortcuts work
- Progress bar shows
- Sound icon appears on video cards
- Compare mode toggles between grid and side-by-side

**Rules**:
- Modify the existing files (index.html, gallery.css, gallery.js, server.js) — do NOT create new files
- Keep the existing functionality intact — this is additive polish only
- No new npm dependencies
- Keep it vanilla HTML/CSS/JS
- All transitions should be smooth (0.2-0.3s ease)
- The lightbox must feel buttery smooth — no jank

**Report**: When done, list changes made and describe the improvements visible in the browser.

## PROMPT END
