// Critiq — Prototype Feedback Tool

let state = {
  prototypeUrl: '',
  loaded: false,
  commentMode: false,
  sidebarOpen: true,
  comments: [],
  selectedCommentId: null,
  newCommentPos: null,
  userName: 'Reviewer',
  currentScreen: ''
};

// --- IndexedDB for screenshots ---
const DB_NAME = 'our-notes-db';
const DB_STORE = 'screenshots';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveScreenshot(commentId, dataUrl) {
  if (!dataUrl) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(dataUrl, commentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getScreenshot(commentId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(commentId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteScreenshot(commentId) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(commentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function clearAllScreenshots() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// --- State persistence (comments in localStorage, screenshots in IndexedDB) ---
function loadState() {
  const saved = localStorage.getItem('our-notes-comments');
  if (saved) {
    try { state.comments = JSON.parse(saved); } catch(e) {}
  }
  const savedUrl = localStorage.getItem('our-notes-url');
  if (savedUrl) {
    state.prototypeUrl = savedUrl;
    state.loaded = true;
    state.currentScreen = savedUrl;
  }
  const savedName = localStorage.getItem('our-notes-username');
  if (savedName) state.userName = savedName;
}

function saveComments() {
  // Only save metadata — screenshots live in IndexedDB
  const toSave = state.comments.map(c => {
    const { screenshot, ...rest } = c;
    return { ...rest, hasScreenshot: !!screenshot };
  });
  localStorage.setItem('our-notes-comments', JSON.stringify(toSave));
}

function saveUrl() {
  localStorage.setItem('our-notes-url', state.prototypeUrl);
}

function currentComments() {
  return state.comments.filter(c => c.screen === state.currentScreen);
}

// --- Init ---
async function initApp() {
  loadState();
  // Hydrate screenshots from IndexedDB
  for (const c of state.comments) {
    if (c.hasScreenshot) {
      c.screenshot = await getScreenshot(c.id);
    }
  }
  render();
}

// --- Rendering ---
function render() {
  const app = document.getElementById('app');
  if (!state.loaded) {
    // Welcome state — centered URL input, no sidebar
    app.innerHTML = `
      ${renderTopBar()}
      <div class="main-layout">
        <div class="viewport">
          <div class="welcome">
            <div class="welcome-content">
              <h2>Leave feedback on any prototype</h2>
              <p>Paste a prototype URL above to load it. Then click anywhere on the screen to drop a pin and leave a comment.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    app.innerHTML = `
      ${renderTopBar()}
      <div class="main-layout">
        ${renderViewport()}
        ${renderSidebar()}
      </div>
    `;
  }
  attachListeners();
}

function renderTopBar() {
  const count = currentComments().length;
  return `
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="logo">
          <span class="logo-dot"></span>
          <span>Critiq</span>
        </div>
        <div class="url-bar">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#8892a4"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5C4.42 14.5 1.5 11.58 1.5 8S4.42 1.5 8 1.5 14.5 4.42 14.5 8 11.58 14.5 8 14.5z"/></svg>
          <input class="url-input" id="url-input" type="text" placeholder="Paste prototype URL and press Enter..." value="${state.prototypeUrl}">
          <button class="btn btn-primary" id="load-btn" style="padding: 4px 10px; font-size: 12px;">Load</button>
        </div>
      </div>
      <div class="top-bar-right">
        ${state.loaded ? `
          <button class="btn btn-ghost ${state.commentMode ? 'active' : ''}" id="toggle-comment-mode">
            📌 ${state.commentMode ? 'Done commenting' : 'Add comment'}
          </button>
          ${count > 0 ? `<span class="comment-count">${count}</span>` : '<span class="comment-count" style="display:none">0</span>'}
        ` : ''}
        <button class="btn btn-ghost" id="toggle-sidebar">
          ${state.sidebarOpen ? '◀' : '▶'} Notes
        </button>
        ${state.comments.length > 0 ? `<button class="btn btn-ghost" id="export-btn">📄 Export to PDF</button>` : ''}
        <button class="btn btn-ghost" id="start-over-btn" title="Start over">↺ Start over</button>
      </div>
    </div>
  `;
}

function renderViewport() {
  const pins = currentComments().map((c, i) => `
    <div class="pin ${state.selectedCommentId === c.id ? 'selected' : ''}"
         style="left: ${c.x}%; top: ${c.y}%;"
         data-comment-id="${c.id}">
      <span class="pin-number">${i + 1}</span>
    </div>
  `).join('');

  const newCommentForm = state.newCommentPos ? `
    <div class="new-comment-form" style="left: ${Math.min(state.newCommentPos.x, 70)}%; top: ${Math.min(state.newCommentPos.y + 2, 80)}%;">
      <textarea id="new-comment-text" placeholder="Leave a comment..." autofocus></textarea>
      <div class="new-comment-form-actions">
        <button class="btn btn-ghost" id="cancel-comment">Cancel</button>
        <button class="btn btn-primary" id="save-comment">Post</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="viewport">
      <div class="viewport-iframe-wrapper">
        <iframe id="prototype-frame" src="${state.prototypeUrl}"></iframe>
        <div class="viewport-overlay ${state.commentMode ? 'active' : ''}" id="viewport-overlay">
          ${pins}
          ${newCommentForm}
        </div>
      </div>
    </div>
  `;
}

function renderSidebar() {
  const comments = currentComments();
  return `
    <div class="sidebar ${state.sidebarOpen ? '' : 'collapsed'}">
      <div class="sidebar-header">
        <h2>Comments</h2>
        <button class="btn btn-ghost" id="clear-all-btn" style="font-size: 11px; padding: 3px 8px;">Clear all</button>
      </div>
      <div class="sidebar-content">
        ${comments.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <h3>No comments yet</h3>
            <p>Click anywhere on the prototype to drop a pin and leave feedback.</p>
          </div>
        ` : comments.map((c, i) => renderCommentCard(c, i)).join('')}
      </div>
    </div>
  `;
}

function renderCommentCard(c, i) {
  const thumbnail = c.screenshot
    ? `<div class="comment-thumbnail" data-screenshot="${c.id}"><img src="${c.screenshot}" alt="Screenshot"></div>`
    : '';
  return `
    <div class="comment-card ${state.selectedCommentId === c.id ? 'selected' : ''}" data-comment-id="${c.id}">
      <div class="comment-card-header">
        <div class="comment-author">
          <div class="comment-avatar">${c.author.charAt(0).toUpperCase()}</div>
          <span class="comment-name">${c.author}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="comment-pin-number">${i + 1}</span>
          <button class="btn btn-danger delete-comment-btn" data-comment-id="${c.id}" title="Delete">✕</button>
        </div>
      </div>
      <div class="comment-text">${c.text}</div>
      ${thumbnail}
      <div class="comment-meta">
        <span class="comment-time">${formatTime(c.timestamp)}</span>
      </div>
    </div>
  `;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString();
}

// --- Event listeners ---
function attachListeners() {
  const urlInput = document.getElementById('url-input');
  const loadBtn = document.getElementById('load-btn');
  if (urlInput) urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadPrototype(); });
  if (loadBtn) loadBtn.addEventListener('click', loadPrototype);

  // Toggle comment mode — PARTIAL update, no iframe rebuild
  const toggleMode = document.getElementById('toggle-comment-mode');
  if (toggleMode) {
    toggleMode.addEventListener('click', () => {
      state.commentMode = !state.commentMode;
      state.newCommentPos = null;
      // Update overlay class without rebuilding iframe
      const overlay = document.getElementById('viewport-overlay');
      if (overlay) {
        overlay.classList.toggle('active', state.commentMode);
        // Remove any new-comment form
        const form = overlay.querySelector('.new-comment-form');
        if (form) form.remove();
      }
      // Update button appearance
      toggleMode.classList.toggle('active', state.commentMode);
      toggleMode.innerHTML = `📌 ${state.commentMode ? 'Done commenting' : 'Add comment'}`;
    });
  }

  // Toggle sidebar
  const toggleSidebar = document.getElementById('toggle-sidebar');
  if (toggleSidebar) {
    toggleSidebar.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen;
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('collapsed', !state.sidebarOpen);
      toggleSidebar.innerHTML = `${state.sidebarOpen ? '◀' : '▶'} Notes`;
    });
  }

  // Start over
  const startOverBtn = document.getElementById('start-over-btn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', async () => {
      if (!confirm('Start over? This will clear the loaded prototype and all comments.')) return;
      if (window._iframePoller) clearInterval(window._iframePoller);
      await clearAllScreenshots();
      state.prototypeUrl = '';
      state.loaded = false;
      state.commentMode = false;
      state.comments = [];
      state.selectedCommentId = null;
      state.newCommentPos = null;
      state.currentScreen = '';
      localStorage.removeItem('our-notes-comments');
      localStorage.removeItem('our-notes-url');
      render();
    });
  }

  // Export
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', openExportModal);

  // Viewport overlay click — drop pin
  const overlay = document.getElementById('viewport-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('.pin') || e.target.closest('.new-comment-form')) return;
      const rect = overlay.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      state.newCommentPos = { x, y };
      state.selectedCommentId = null;
      // Partial update — just update overlay and sidebar, don't rebuild iframe
      updateOverlay();
      updateSidebar();
      setTimeout(() => {
        const ta = document.getElementById('new-comment-text');
        if (ta) ta.focus();
      }, 50);
    });
  }

  // Pin clicks
  document.querySelectorAll('.pin').forEach(pin => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedCommentId = pin.dataset.commentId;
      state.newCommentPos = null;
      updateOverlay();
      updateSidebar();
    });
  });

  // Comment card clicks
  document.querySelectorAll('.comment-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-comment-btn')) return;
      state.selectedCommentId = card.dataset.commentId;
      state.newCommentPos = null;
      updateOverlay();
      updateSidebar();
    });
  });

  // Delete comment
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.commentId;
      await deleteScreenshot(id);
      state.comments = state.comments.filter(c => c.id !== id);
      if (state.selectedCommentId === id) state.selectedCommentId = null;
      saveComments();
      updateOverlay();
      updateSidebar();
      updateCommentCount();
    });
  });

  // Save new comment
  const saveBtn = document.getElementById('save-comment');
  if (saveBtn) saveBtn.addEventListener('click', saveNewComment);

  // Cancel new comment
  const cancelBtn = document.getElementById('cancel-comment');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      state.newCommentPos = null;
      updateOverlay();
    });
  }

  // Enter to submit
  const textarea = document.getElementById('new-comment-text');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNewComment(); }
    });
  }

  // Clear all
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Clear all comments for this screen?')) return;
      const toDelete = state.comments.filter(c => c.screen === state.currentScreen);
      for (const c of toDelete) await deleteScreenshot(c.id);
      state.comments = state.comments.filter(c => c.screen !== state.currentScreen);
      state.selectedCommentId = null;
      saveComments();
      updateOverlay();
      updateSidebar();
      updateCommentCount();
    });
  }

  // Thumbnail click → lightbox
  const sidebarContent = document.querySelector('.sidebar-content');
  if (sidebarContent) attachThumbnailListeners(sidebarContent);

  // Track iframe navigation
  const iframe = document.getElementById('prototype-frame');
  if (iframe) {
    if (window._iframePoller) clearInterval(window._iframePoller);

    // For cross-origin iframes, we can't read the URL but we can detect navigation via load event
    iframe.addEventListener('load', () => {
      let newUrl = '';
      try { newUrl = iframe.contentWindow.location.href; } catch(e) { newUrl = 'screen_' + Date.now(); }
      if (newUrl && newUrl !== 'about:blank' && newUrl !== state.currentScreen) {
        state.currentScreen = newUrl;
        state.selectedCommentId = null;
        state.newCommentPos = null;
        updateOverlay();
        updateSidebar();
        updateCommentCount();
      }
    });

    // Also poll for same-origin SPA-style navigation
    window._iframePoller = setInterval(() => {
      try {
        const newUrl = iframe.contentWindow.location.href;
        if (newUrl && newUrl !== 'about:blank' && newUrl !== state.currentScreen) {
          state.currentScreen = newUrl;
          state.selectedCommentId = null;
          state.newCommentPos = null;
          updateOverlay();
          updateSidebar();
          updateCommentCount();
        }
      } catch(e) { /* cross-origin */ }
    }, 500);
  }
}

async function loadPrototype() {
  const urlInput = document.getElementById('url-input');
  if (!urlInput) return;
  let url = urlInput.value.trim();
  if (!url) return;
  if (!url.startsWith('http')) url = 'https://' + url;

  // Auto start over — clear previous session
  if (window._iframePoller) clearInterval(window._iframePoller);
  await clearAllScreenshots();
  state.comments = [];
  state.selectedCommentId = null;
  state.newCommentPos = null;
  state.commentMode = false;
  localStorage.removeItem('our-notes-comments');

  state.prototypeUrl = url;
  state.currentScreen = url;
  state.loaded = true;
  saveUrl();
  render();
}

async function saveNewComment() {
  const textarea = document.getElementById('new-comment-text');
  if (!textarea || !textarea.value.trim()) return;

  const commentText = textarea.value.trim();
  const pinX = state.newCommentPos.x;
  const pinY = state.newCommentPos.y;

  // Capture screenshot BEFORE any DOM changes — hide overlay + pins first
  let screenshot = null;
  try {
    screenshot = await captureScreenshot(pinX, pinY);
  } catch(e) {
    console.warn('Screenshot capture failed:', e);
  }

  const comment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    screen: state.currentScreen,
    x: pinX,
    y: pinY,
    text: commentText,
    author: state.userName,
    timestamp: Date.now(),
    screenshot: screenshot
  };

  // Save screenshot to IndexedDB
  if (screenshot) {
    await saveScreenshot(comment.id, screenshot);
  }

  state.comments.push(comment);
  state.newCommentPos = null;
  state.selectedCommentId = comment.id;
  saveComments();
  // Partial update — don't rebuild iframe
  updateOverlay();
  updateSidebar();
  updateCommentCount();
  showToast('Comment added');
}

// Persistent screen capture — prompt only once per session
let _captureStream = null;
let _captureVideo = null;

async function initCaptureStream() {
  if (_captureStream) {
    const track = _captureStream.getVideoTracks()[0];
    if (track && track.readyState === 'live') return;
    _captureStream = null;
  }
  _captureStream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    preferCurrentTab: true
  });
  _captureStream.getVideoTracks()[0].addEventListener('ended', () => {
    _captureStream = null;
    _captureVideo = null;
  });
  // Create a hidden video element to read frames from
  if (_captureVideo) _captureVideo.remove();
  _captureVideo = document.createElement('video');
  _captureVideo.srcObject = _captureStream;
  _captureVideo.style.position = 'fixed';
  _captureVideo.style.top = '-9999px';
  _captureVideo.muted = true;
  document.body.appendChild(_captureVideo);
  await _captureVideo.play();
}

async function captureScreenshot(pinXPercent, pinYPercent) {
  const wrapper = document.querySelector('.viewport-iframe-wrapper');
  if (!wrapper) return null;

  const overlay = document.getElementById('viewport-overlay');
  if (overlay) overlay.style.display = 'none';
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    await initCaptureStream();

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const vw = _captureVideo.videoWidth;
    const vh = _captureVideo.videoHeight;

    // Scale factor between video resolution and CSS viewport
    const scaleX = vw / window.innerWidth;
    const scaleY = vh / window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = rect.width * scaleX;
    canvas.height = rect.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      _captureVideo,
      rect.left * scaleX, rect.top * scaleY,
      rect.width * scaleX, rect.height * scaleY,
      0, 0,
      canvas.width, canvas.height
    );

    drawPinHighlight(ctx, pinXPercent, pinYPercent, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch(e) {
    console.warn('Screen capture failed, trying html2canvas fallback:', e);
    return captureScreenshotFallback(wrapper, pinXPercent, pinYPercent);
  } finally {
    if (overlay) overlay.style.display = '';
  }
}

async function captureScreenshotFallback(wrapper, pinXPercent, pinYPercent) {
  try {
    const canvas = await html2canvas(wrapper, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1e1e1e',
      scale: 1,
      ignoreElements: (el) => el.classList.contains('viewport-overlay')
    });
    const ctx = canvas.getContext('2d');
    drawPinHighlight(ctx, pinXPercent, pinYPercent, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch(e) {
    console.warn('html2canvas fallback also failed:', e);
    return null;
  }
}

function drawPinHighlight(ctx, pinXPercent, pinYPercent, width, height) {
  const cx = (pinXPercent / 100) * width;
  const cy = (pinYPercent / 100) * height;
  const radius = 24;

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 153, 0, 0.2)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#FF9900';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF9900';
  ctx.fill();
}

// --- Lightbox ---
function openLightbox(screenshotUrl) {
  const existing = document.getElementById('screenshot-lightbox');
  if (existing) existing.remove();

  const lightbox = document.createElement('div');
  lightbox.id = 'screenshot-lightbox';
  lightbox.className = 'lightbox-overlay';
  lightbox.innerHTML = `
    <div class="lightbox-content">
      <img src="${screenshotUrl}" class="lightbox-image" alt="Screenshot">
      <button class="lightbox-close" id="lightbox-close">✕</button>
    </div>
  `;
  document.body.appendChild(lightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.id === 'lightbox-close') lightbox.remove();
  });
}

// --- Partial re-renders (never rebuild iframe) ---
function updateCommentCount() {
  const countEl = document.querySelector('.comment-count');
  const count = currentComments().length;
  if (countEl) {
    if (count > 0) { countEl.textContent = count; countEl.style.display = ''; }
    else { countEl.style.display = 'none'; }
  }

  // Show/hide export button based on total comments
  const topBarRight = document.querySelector('.top-bar-right');
  let exportBtn = document.getElementById('export-btn');
  if (state.comments.length > 0 && !exportBtn && topBarRight) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost';
    btn.id = 'export-btn';
    btn.innerHTML = '📄 Export to PDF';
    btn.addEventListener('click', openExportModal);
    const startOver = document.getElementById('start-over-btn');
    topBarRight.insertBefore(btn, startOver);
  } else if (state.comments.length === 0 && exportBtn) {
    exportBtn.remove();
  }
}

function updateOverlay() {
  const overlay = document.getElementById('viewport-overlay');
  if (!overlay) return;
  const comments = currentComments();

  const pins = comments.map((c, i) => `
    <div class="pin ${state.selectedCommentId === c.id ? 'selected' : ''}"
         style="left: ${c.x}%; top: ${c.y}%;"
         data-comment-id="${c.id}">
      <span class="pin-number">${i + 1}</span>
    </div>
  `).join('');

  const newCommentForm = state.newCommentPos ? `
    <div class="new-comment-form" style="left: ${Math.min(state.newCommentPos.x, 70)}%; top: ${Math.min(state.newCommentPos.y + 2, 80)}%;">
      <textarea id="new-comment-text" placeholder="Leave a comment..." autofocus></textarea>
      <div class="new-comment-form-actions">
        <button class="btn btn-ghost" id="cancel-comment">Cancel</button>
        <button class="btn btn-primary" id="save-comment">Post</button>
      </div>
    </div>
  ` : '';

  overlay.innerHTML = pins + newCommentForm;
  overlay.classList.toggle('active', state.commentMode);

  // Re-attach pin listeners
  overlay.querySelectorAll('.pin').forEach(pin => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedCommentId = pin.dataset.commentId;
      state.newCommentPos = null;
      updateOverlay();
      updateSidebar();
    });
  });

  // Re-attach form listeners
  const saveBtn = document.getElementById('save-comment');
  if (saveBtn) saveBtn.addEventListener('click', saveNewComment);
  const cancelBtn = document.getElementById('cancel-comment');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { state.newCommentPos = null; updateOverlay(); });
  const textarea = document.getElementById('new-comment-text');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNewComment(); }
    });
  }
}

function updateSidebar() {
  const sidebarContent = document.querySelector('.sidebar-content');
  if (!sidebarContent) return;
  const comments = currentComments();
  if (comments.length === 0) {
    sidebarContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h3>No comments yet</h3>
        <p>Click anywhere on the prototype to drop a pin and leave feedback.</p>
      </div>
    `;
    return;
  }
  sidebarContent.innerHTML = comments.map((c, i) => renderCommentCard(c, i)).join('');

  sidebarContent.querySelectorAll('.comment-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-comment-btn')) return;
      state.selectedCommentId = card.dataset.commentId;
      state.newCommentPos = null;
      updateOverlay();
      updateSidebar();
    });
  });
  sidebarContent.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.commentId;
      await deleteScreenshot(id);
      state.comments = state.comments.filter(c => c.id !== id);
      if (state.selectedCommentId === id) state.selectedCommentId = null;
      saveComments();
      updateOverlay();
      updateSidebar();
      updateCommentCount();
    });
  });

  const countEl = document.querySelector('.comment-count');
  if (countEl) countEl.textContent = comments.length;
  attachThumbnailListeners(sidebarContent);
}

// --- Toast notification ---
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">✓</span> ${message}`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// --- Export ---
function openExportModal() {
  const existing = document.getElementById('export-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'export-modal';
  modal.className = 'lightbox-overlay';
  modal.innerHTML = `
    <div class="export-modal-content">
      <h3>Export Comments</h3>
      <label class="export-label">Reviewer name</label>
      <input type="text" id="export-reviewer" class="export-input" placeholder="Enter reviewer name..." value="${state.userName}">
      <label class="export-label">Review date</label>
      <input type="date" id="export-date" class="export-input" value="${new Date().toISOString().split('T')[0]}">
      <div class="export-actions">
        <button class="btn btn-ghost" id="export-cancel">Cancel</button>
        <button class="btn btn-primary" id="export-pdf">Export PDF</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.id === 'export-cancel') modal.remove();
  });
  document.getElementById('export-pdf').addEventListener('click', () => {
    const reviewer = document.getElementById('export-reviewer').value.trim() || 'Reviewer';
    const date = document.getElementById('export-date').value || new Date().toISOString().split('T')[0];
    modal.remove();
    generatePDF(reviewer, date);
  });
}

async function generatePDF(reviewerName, reviewDate) {
  // Group comments by screen
  const grouped = {};
  for (const c of state.comments) {
    const key = c.screen || 'Unknown screen';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  // Build HTML for print
  const screenSections = Object.entries(grouped).map(([screen, comments], si) => {
    const commentRows = comments.map((c, i) => {
      const time = new Date(c.timestamp).toLocaleString();
      const screenshotHtml = c.screenshot
        ? `<div class="pdf-screenshot"><img src="${c.screenshot}" alt="Screenshot"></div>`
        : '';
      return `
        <div class="pdf-comment">
          <div class="pdf-comment-header">
            <span class="pdf-comment-number">${i + 1}</span>
            <span class="pdf-comment-author">${c.author}</span>
            <span class="pdf-comment-time">${time}</span>
          </div>
          <div class="pdf-comment-text">${c.text}</div>
          ${screenshotHtml}
        </div>
      `;
    }).join('');

    // Shorten screen URL for display
    let screenLabel = screen;
    try { screenLabel = new URL(screen).pathname || screen; } catch(e) {}

    return `
      <div class="pdf-screen-section">
        <h3>Screen ${si + 1}: ${screenLabel}</h3>
        ${commentRows}
      </div>
    `;
  }).join('');

  const printHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Critiq — Review Export</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 900px; margin: 0 auto; }
  .pdf-header { border-bottom: 2px solid #FF9900; padding-bottom: 16px; margin-bottom: 32px; }
  .pdf-header h1 { font-size: 24px; margin-bottom: 4px; }
  .pdf-header h2 { font-size: 16px; font-weight: 400; color: #555; }
  .pdf-meta { display: flex; gap: 24px; margin-top: 8px; font-size: 13px; color: #666; }
  .pdf-screen-section { margin-bottom: 32px; page-break-inside: avoid; }
  .pdf-screen-section h3 { font-size: 15px; background: #f5f5f5; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; color: #333; word-break: break-all; }
  .pdf-comment { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .pdf-comment-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .pdf-comment-number { background: #FF9900; color: #000; font-weight: 700; font-size: 11px; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
  .pdf-comment-author { font-weight: 600; font-size: 13px; }
  .pdf-comment-time { font-size: 11px; color: #888; margin-left: auto; }
  .pdf-comment-text { font-size: 14px; line-height: 1.6; }
  .pdf-screenshot { margin-top: 10px; }
  .pdf-screenshot img { max-width: 100%; border-radius: 6px; border: 1px solid #e0e0e0; }
  .pdf-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="pdf-header">
    <h1>Prototype Review — Critiq</h1>
    <h2>${state.prototypeUrl}</h2>
    <div class="pdf-meta">
      <span>Reviewer: <strong>${reviewerName}</strong></span>
      <span>Date: <strong>${reviewDate}</strong></span>
      <span>Total comments: <strong>${state.comments.length}</strong></span>
    </div>
  </div>
  ${screenSections}
  <div class="pdf-footer">Generated by Critiq — Prototype Feedback Tool</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(printHtml);
  printWindow.document.close();
  // Give images time to load then trigger print
  setTimeout(() => printWindow.print(), 500);
}

function attachThumbnailListeners(container) {
  container.querySelectorAll('.comment-thumbnail').forEach(thumb => {
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentId = thumb.dataset.screenshot;
      const comment = state.comments.find(c => c.id === commentId);
      if (comment && comment.screenshot) openLightbox(comment.screenshot);
    });
  });
}

// --- Boot ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
