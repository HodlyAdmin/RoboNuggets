let currentRunId = null;
let allCandidates = [];
let currentFilter = 'all';
let compareMode = false;
let lightboxOpen = false;
let lightboxIndex = -1;
let lightboxZoomed = false;
let lightboxDragging = false;
let lightboxDragStart = { x: 0, y: 0 };
let lightboxPan = { x: 0, y: 0 };
let focusedCandidateIndex = -1;
let runPrompts = {};

// DOM Elements
const runList = document.getElementById('run-list');
const runCountEl = document.getElementById('run-count');
const candidateGrid = document.getElementById('candidate-grid');
const runSummary = document.getElementById('run-summary');
const filtersContainer = document.getElementById('filters');
const batchApproveBtn = document.getElementById('batch-approve');
const exportApprovedBtn = document.getElementById('export-approved');
const toastContainer = document.getElementById('toast-container');
const progressBarContainer = document.getElementById('progress-bar-container');
const compareToggle = document.getElementById('compare-toggle');
const shortcutsBtn = document.getElementById('shortcuts-btn');

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxMedia = document.getElementById('lightbox-media');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxMeta = document.getElementById('lightbox-meta');
const lightboxCloseBtn = document.getElementById('lightbox-close');
const lightboxPrevBtn = document.getElementById('lightbox-prev');
const lightboxNextBtn = document.getElementById('lightbox-next');
const lbApproveBtn = document.getElementById('lb-approve');
const lbRejectBtn = document.getElementById('lb-reject');
const lbRedoBtn = document.getElementById('lb-redo');

// Modals
const shortcutsModal = document.getElementById('shortcuts-modal');
const promptModal = document.getElementById('prompt-modal');
const promptContent = document.getElementById('prompt-content');

// Init
window.onload = async () => {
    await fetchRuns();
};

async function fetchRuns() {
    try {
        const res = await fetch('/api/runs');
        const runs = await res.json();

        runCountEl.innerText = `${runs.length} Runs`;
        renderRunList(runs);

        if (runs.length > 0) {
            selectRun(runs[0].id);
        } else {
            runList.innerHTML = '<li class="empty">No runs found</li>';
            candidateGrid.innerHTML = '<div class="empty-state">No runs recorded in the output directory.</div>';
        }
    } catch (err) {
        showToast('Error', 'Failed to fetch runs');
    }
}

function renderRunList(runs) {
    runList.innerHTML = '';
    runs.forEach(run => {
        const li = document.createElement('li');
        li.className = 'run-item';
        li.dataset.id = run.id;
        if (run.id === currentRunId) li.classList.add('active');

        const dateStr = new Date(run.createdAt).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        li.innerHTML = `
            <span class="run-name">${run.projectName}</span>
            <span class="run-meta">${dateStr} • ${run.status || 'unknown'}</span>
        `;

        li.onclick = () => selectRun(run.id);
        runList.appendChild(li);
    });
}

async function selectRun(runId) {
    currentRunId = runId;
    focusedCandidateIndex = -1;

    // Update active state in sidebar
    document.querySelectorAll('.run-item').forEach(li => {
        li.classList.toggle('active', li.dataset.id === runId);
    });

    candidateGrid.innerHTML = '<div class="loading-spinner"></div>';

    try {
        // Fetch candidates and run details in parallel
        const [candRes, runRes] = await Promise.all([
            fetch(`/api/runs/${runId}/candidates`),
            fetch(`/api/runs/${runId}`)
        ]);
        allCandidates = await candRes.json();
        const runData = await runRes.json();
        runPrompts = runData.prompts || {};

        renderSummary();
        renderProgressBar();
        applyFilter(currentFilter);

        filtersContainer.style.display = 'flex';
        progressBarContainer.style.display = 'flex';
        batchApproveBtn.disabled = false;
        exportApprovedBtn.disabled = false;
    } catch (err) {
        showToast('Error', 'Failed to fetch candidates');
    }
}

function renderSummary() {
    const stats = getStats();
    runSummary.innerHTML = `
        <div class="summary-info">
            <div class="summary-stat">
                <span class="label">Total</span>
                <span class="value">${stats.total}</span>
            </div>
            <div class="summary-stat">
                <span class="label">Approved</span>
                <span class="value" style="color: var(--accent-success)">${stats.approved}</span>
            </div>
            <div class="summary-stat">
                <span class="label">Rejected</span>
                <span class="value" style="color: var(--accent-danger)">${stats.rejected}</span>
            </div>
            <div class="summary-stat">
                <span class="label">Pending</span>
                <span class="value" style="color: var(--accent-primary)">${stats.pending}</span>
            </div>
        </div>
    `;
}

function getStats() {
    return {
        total: allCandidates.length,
        approved: allCandidates.filter(c => c.decision === 'approved').length,
        rejected: allCandidates.filter(c => c.decision === 'rejected').length,
        redo: allCandidates.filter(c => c.decision === 'redo').length,
        pending: allCandidates.filter(c => c.decision === 'pending').length
    };
}

function renderProgressBar() {
    const stats = getStats();
    const total = stats.total || 1;
    const reviewed = stats.approved + stats.rejected + stats.redo;

    document.getElementById('progress-approved').style.width = `${(stats.approved / total) * 100}%`;
    document.getElementById('progress-rejected').style.width = `${(stats.rejected / total) * 100}%`;
    document.getElementById('progress-redo').style.width = `${(stats.redo / total) * 100}%`;
    document.getElementById('progress-label').textContent = `${reviewed}/${stats.total} reviewed`;
}

function applyFilter(status) {
    currentFilter = status;

    document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });

    const filtered = status === 'all'
        ? allCandidates
        : allCandidates.filter(c => c.decision === status);

    renderCandidates(filtered);
}

function getPromptForStage(stageKey) {
    if (stageKey.includes('image') && runPrompts.imageGeneration) {
        return runPrompts.imageGeneration;
    }
    if (stageKey.includes('video') && runPrompts.videoGeneration) {
        return runPrompts.videoGeneration;
    }
    return '';
}

function renderCandidates(candidates) {
    candidateGrid.innerHTML = '';
    candidateGrid.classList.toggle('compare-mode', compareMode);

    if (candidates.length === 0) {
        candidateGrid.innerHTML = '<div class="empty-state">No candidates matching the current filter.</div>';
        return;
    }

    if (compareMode) {
        renderCompareMode(candidates);
        return;
    }

    candidates.forEach((cand, idx) => {
        candidateGrid.appendChild(createCandidateCard(cand, idx));
    });
}

function renderCompareMode(candidates) {
    // Group candidates by stage
    const stageGroups = {};
    candidates.forEach(cand => {
        if (!stageGroups[cand.stage]) stageGroups[cand.stage] = [];
        stageGroups[cand.stage].push(cand);
    });

    let globalIdx = 0;
    for (const [stageKey, stageCands] of Object.entries(stageGroups)) {
        const typeLbl = stageKey.includes('image') ? '🖼 Image' : stageKey.includes('video') ? '🎬 Video' : '🎵 Audio';
        const label = document.createElement('div');
        label.className = 'compare-row-label';
        label.textContent = `${typeLbl} Generation — ${stageCands.length} candidates`;
        candidateGrid.appendChild(label);

        stageCands.forEach(cand => {
            candidateGrid.appendChild(createCandidateCard(cand, globalIdx));
            globalIdx++;
        });
    }
}

function createCandidateCard(cand, displayIndex) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.id = `cand-${cand.id}`;
    card.dataset.idx = displayIndex;
    card.tabIndex = 0;

    card.onfocus = () => {
        focusedCandidateIndex = displayIndex;
        document.querySelectorAll('.candidate-card.focused').forEach(c => c.classList.remove('focused'));
        card.classList.add('focused');
    };

    const isVideo = cand.path.endsWith('.mp4');
    const mediaHtml = isVideo
        ? `<video src="${cand.mediaUrl}" muted loop preload="metadata"></video><div class="sound-indicator">🔇</div>`
        : `<img src="${cand.mediaUrl}" loading="lazy">`;

    const fileSize = cand.meta?.size ? formatSize(cand.meta.size) : 'Unknown size';
    const typeLabel = cand.stage.includes('image') ? 'Image' : cand.stage.includes('video') ? 'Video' : 'Audio';

    const promptStr = getPromptForStage(cand.stage);
    const truncatedPrompt = promptStr.length > 80 ? promptStr.substring(0, 80) + '...' : promptStr;
    const promptHtml = promptStr
        ? `<div class="prompt-preview" onclick="showPromptModal('${escapeAttr(promptStr)}')">${escapeHtml(truncatedPrompt)}<span class="prompt-expand-hint"> ▸ expand</span></div>`
        : '';

    card.innerHTML = `
        <div class="media-preview" data-cand-idx="${displayIndex}" onmouseenter="playVideo(this)" onmouseleave="pauseVideo(this)">
            ${mediaHtml}
            <div class="stage-badge">${typeLabel}</div>
            ${cand.selected ? '<div class="winner-badge">Winner</div>' : ''}
        </div>
        <div class="card-body">
            <div class="card-header">
                <div>
                    <div class="cand-title">Candidate ${cand.index + 1}</div>
                    <div class="cand-meta">${fileSize} • ${cand.selected ? 'Runner Select' : 'Runner Alternate'}</div>
                </div>
            </div>
            ${promptHtml}
            <div class="card-actions">
                <button class="btn btn-approve ${cand.decision === 'approved' ? 'active' : ''}" onclick="submitReview('${cand.id}', 'approved')">Approve</button>
                <button class="btn btn-reject ${cand.decision === 'rejected' ? 'active' : ''}" onclick="submitReview('${cand.id}', 'rejected')">Reject</button>
                <button class="btn btn-redo ${cand.decision === 'redo' ? 'active' : ''}" onclick="submitReview('${cand.id}', 'redo')">Redo</button>
            </div>

            <div class="notes-area" style="display: ${cand.decision === 'redo' ? 'block' : 'none'}">
                <textarea placeholder="Reason for redo..." onblur="updateNotes('${cand.id}', this.value)">${cand.notes || ''}</textarea>
            </div>
        </div>
    `;

    // Wire up media click for lightbox
    const mediaPreview = card.querySelector('.media-preview');
    mediaPreview.addEventListener('click', (e) => {
        // Don't open lightbox if clicking sound indicator
        if (e.target.classList.contains('sound-indicator')) return;
        const ci = getFilteredCandidateIndex(cand);
        openLightbox(ci);
    });

    // Wire up video click for sound toggle
    if (isVideo) {
        const video = card.querySelector('video');
        const soundIcon = card.querySelector('.sound-indicator');
        video.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVideoPlayback(video, soundIcon);
        });
    }

    return card;
}

function getFilteredCandidates() {
    return currentFilter === 'all'
        ? allCandidates
        : allCandidates.filter(c => c.decision === currentFilter);
}

function getFilteredCandidateIndex(cand) {
    return getFilteredCandidates().indexOf(cand);
}

// ============================================================
// LIGHTBOX
// ============================================================
function openLightbox(index) {
    const filtered = getFilteredCandidates();
    if (index < 0 || index >= filtered.length) return;

    lightboxIndex = index;
    lightboxOpen = true;
    lightboxZoomed = false;
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderLightboxContent();
}

function closeLightbox() {
    lightboxOpen = false;
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
    // Pause any playing video
    const vid = lightboxMedia.querySelector('video');
    if (vid) vid.pause();
}

function renderLightboxContent() {
    const filtered = getFilteredCandidates();
    const cand = filtered[lightboxIndex];
    if (!cand) return;

    const isVideo = cand.path.endsWith('.mp4');
    const fileSize = cand.meta?.size ? formatSize(cand.meta.size) : 'Unknown size';
    const typeLabel = cand.stage.includes('image') ? 'Image' : cand.stage.includes('video') ? 'Video' : 'Audio';
    const statusLabel = cand.decision.charAt(0).toUpperCase() + cand.decision.slice(1);

    if (isVideo) {
        lightboxMedia.innerHTML = `<video src="${cand.mediaUrl}" controls autoplay loop style="max-width:90vw;max-height:75vh;border-radius:0.75rem;"></video>`;
    } else {
        lightboxMedia.innerHTML = `<img src="${cand.mediaUrl}" style="max-width:90vw;max-height:75vh;object-fit:contain;border-radius:0.75rem;cursor:zoom-in;">`;
        setupImageZoom();
    }

    lightboxTitle.textContent = `Candidate ${cand.index + 1}`;
    lightboxMeta.textContent = `${typeLabel} • ${fileSize} • ${statusLabel} • ${lightboxIndex + 1}/${filtered.length}`;

    // Update action button states
    lbApproveBtn.className = `btn btn-approve btn-sm ${cand.decision === 'approved' ? 'active' : ''}`;
    lbRejectBtn.className = `btn btn-reject btn-sm ${cand.decision === 'rejected' ? 'active' : ''}`;
    lbRedoBtn.className = `btn btn-redo btn-sm ${cand.decision === 'redo' ? 'active' : ''}`;
}

function setupImageZoom() {
    const img = lightboxMedia.querySelector('img');
    if (!img) return;

    lightboxZoomed = false;
    lightboxPan = { x: 0, y: 0 };

    img.addEventListener('click', (e) => {
        if (lightboxZoomed) {
            lightboxZoomed = false;
            img.classList.remove('zoomed');
            img.style.transform = '';
            img.style.maxWidth = '90vw';
            img.style.maxHeight = '75vh';
        } else {
            lightboxZoomed = true;
            img.classList.add('zoomed');
            img.style.maxWidth = 'none';
            img.style.maxHeight = 'none';
            lightboxPan = { x: 0, y: 0 };
        }
    });

    img.addEventListener('mousedown', (e) => {
        if (!lightboxZoomed) return;
        lightboxDragging = true;
        lightboxDragStart = { x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y };
        img.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!lightboxDragging) return;
        lightboxPan.x = e.clientX - lightboxDragStart.x;
        lightboxPan.y = e.clientY - lightboxDragStart.y;
        const img = lightboxMedia.querySelector('img');
        if (img) img.style.transform = `translate(${lightboxPan.x}px, ${lightboxPan.y}px)`;
    });

    document.addEventListener('mouseup', () => {
        if (!lightboxDragging) return;
        lightboxDragging = false;
        const img = lightboxMedia.querySelector('img');
        if (img) img.classList.remove('dragging');
    });
}

function lightboxNavigate(direction) {
    const filtered = getFilteredCandidates();
    const newIndex = lightboxIndex + direction;
    if (newIndex < 0 || newIndex >= filtered.length) return;
    lightboxIndex = newIndex;
    lightboxZoomed = false;
    renderLightboxContent();
}

function lightboxReview(status) {
    const filtered = getFilteredCandidates();
    const cand = filtered[lightboxIndex];
    if (!cand) return;
    submitReview(cand.id, status);
    // Refresh lightbox buttons
    setTimeout(() => renderLightboxContent(), 50);
}

// Lightbox event handlers
lightboxCloseBtn.addEventListener('click', closeLightbox);
lightboxPrevBtn.addEventListener('click', () => lightboxNavigate(-1));
lightboxNextBtn.addEventListener('click', () => lightboxNavigate(1));
lbApproveBtn.addEventListener('click', () => lightboxReview('approved'));
lbRejectBtn.addEventListener('click', () => lightboxReview('rejected'));
lbRedoBtn.addEventListener('click', () => lightboxReview('redo'));

// Close on backdrop click
lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Close modals
    if (e.key === 'Escape') {
        if (lightboxOpen) { closeLightbox(); return; }
        if (shortcutsModal.style.display !== 'none') { shortcutsModal.style.display = 'none'; return; }
        if (promptModal.style.display !== 'none') { promptModal.style.display = 'none'; return; }
        return;
    }

    if (lightboxOpen) {
        switch (e.key) {
            case 'ArrowLeft': lightboxNavigate(-1); break;
            case 'ArrowRight': lightboxNavigate(1); break;
            case 'a': case 'A': lightboxReview('approved'); break;
            case 'r': case 'R': lightboxReview('rejected'); break;
            case 'd': case 'D': lightboxReview('redo'); break;
        }
        return;
    }

    // Non-lightbox shortcuts
    switch (e.key) {
        case 'f':
        case 'F': {
            // Open lightbox for focused or first candidate
            const idx = focusedCandidateIndex >= 0 ? focusedCandidateIndex : 0;
            const filtered = getFilteredCandidates();
            if (filtered.length > 0) openLightbox(Math.min(idx, filtered.length - 1));
            break;
        }
        case 'a':
        case 'A': {
            if (focusedCandidateIndex >= 0) reviewFocusedCandidate('approved');
            break;
        }
        case 'r':
        case 'R': {
            if (focusedCandidateIndex >= 0) reviewFocusedCandidate('rejected');
            break;
        }
        case 'd':
        case 'D': {
            if (focusedCandidateIndex >= 0) reviewFocusedCandidate('redo');
            break;
        }
    }
});

function reviewFocusedCandidate(status) {
    const filtered = getFilteredCandidates();
    const cand = filtered[focusedCandidateIndex];
    if (cand) submitReview(cand.id, status);
}

// ============================================================
// COMPARE MODE
// ============================================================
compareToggle.addEventListener('click', () => {
    compareMode = !compareMode;
    compareToggle.classList.toggle('active', compareMode);
    compareToggle.textContent = compareMode ? '⬛ Compare' : '⬜ Compare';
    applyFilter(currentFilter);
});

// ============================================================
// SHORTCUTS MODAL
// ============================================================
shortcutsBtn.addEventListener('click', () => {
    shortcutsModal.style.display = shortcutsModal.style.display === 'none' ? 'flex' : 'none';
});
shortcutsModal.querySelector('.shortcuts-modal-backdrop').addEventListener('click', () => {
    shortcutsModal.style.display = 'none';
});
shortcutsModal.querySelector('.shortcuts-close').addEventListener('click', () => {
    shortcutsModal.style.display = 'none';
});

// ============================================================
// PROMPT MODAL
// ============================================================
function showPromptModal(text) {
    promptContent.textContent = text;
    promptModal.style.display = 'flex';
}

promptModal.querySelector('.prompt-modal-backdrop').addEventListener('click', () => {
    promptModal.style.display = 'none';
});
promptModal.querySelector('.prompt-close').addEventListener('click', () => {
    promptModal.style.display = 'none';
});

// ============================================================
// EXPORT
// ============================================================
exportApprovedBtn.addEventListener('click', async () => {
    if (!currentRunId) return;
    exportApprovedBtn.disabled = true;
    try {
        const res = await fetch(`/api/runs/${currentRunId}/export`, { method: 'POST' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showToast('Success', `Exported ${data.count} files to deliverables/`);
    } catch (err) {
        showToast('Error', err.message || 'Export failed');
    } finally {
        exportApprovedBtn.disabled = false;
    }
});

// ============================================================
// CORE FUNCTIONS (preserved from original)
// ============================================================
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function submitReview(candidateId, status) {
    const cand = allCandidates.find(c => c.id === candidateId);
    if (!cand) return;

    // Optimistic UI
    cand.decision = status;
    renderSummary();
    renderProgressBar();

    const card = document.getElementById(`cand-${candidateId}`);
    if (card) {
        card.querySelectorAll('.card-actions button').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.toLowerCase() === status);
        });
        card.querySelector('.notes-area').style.display = status === 'redo' ? 'block' : 'none';

        // Handle filter removal
        if (currentFilter !== 'all' && currentFilter !== status) {
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        }
    }

    try {
        await fetch(`/api/runs/${currentRunId}/candidates/${candidateId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        showToast('Success', `Candidate ${status}`);
    } catch (err) {
        showToast('Error', 'Failed to save review');
    }
}

async function updateNotes(candidateId, notes) {
    const cand = allCandidates.find(c => c.id === candidateId);
    if (!cand) return;
    cand.notes = notes;

    try {
        await fetch(`/api/runs/${currentRunId}/candidates/${candidateId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: cand.decision, notes })
        });
    } catch (err) {
        showToast('Error', 'Failed to save notes');
    }
}

batchApproveBtn.onclick = async () => {
    if (!currentRunId) return;

    try {
        const res = await fetch(`/api/runs/${currentRunId}/approve-all`, { method: 'POST' });
        const data = await res.json();

        // Refresh
        await selectRun(currentRunId);
        showToast('Success', `Approved all candidates`);
    } catch (err) {
        showToast('Error', 'Batch approve failed');
    }
};

// Tooling
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>${type}</strong>: ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function playVideo(container) {
    const video = container.querySelector('video');
    if (video && video.paused) {
        video.muted = true; // Muted for hover preview
        video.play();
    }
}

function pauseVideo(container) {
    const video = container.querySelector('video');
    if (video) {
        video.pause();
        video.currentTime = 0;
        video.muted = true; // Reset to muted for next hover
        // Reset sound indicator
        const icon = container.querySelector('.sound-indicator');
        if (icon) icon.textContent = '🔇';
    }
}

function toggleVideoPlayback(video, soundIcon) {
    if (video.paused) {
        video.muted = false; // Unmute for intentional playback
        video.play();
        if (soundIcon) soundIcon.textContent = '🔊';
    } else {
        video.pause();
        video.muted = true; // Re-mute when paused
        if (soundIcon) soundIcon.textContent = '🔇';
    }
}

// Filter button clicks
document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
    btn.onclick = () => applyFilter(btn.dataset.status);
});

// Util
function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
