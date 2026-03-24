// Our Notes — Prototype Feedback Tool

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
  app.innerHTML = `
    ${renderTopBar()}
    <div class="main-layout">
      ${renderViewport()}
      ${renderSidebar()}
    </div>
  `;
  attachListeners();
}

function renderTopBar() {
  const count = currentComments().length;
  return `
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="logo">
          <span class="logo-dot"></span>
          <span>Our Notes</span>
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
        <button class="btn btn-ghost" id="start-over-btn" title="Start over">↺ Start over</button>
      </div>
    </div>
  `;
}

function renderViewport() {
  if (!state.loaded) {
    return `
      <div class="viewport">
        <div class="welcome">
          <div class="welcome-content">
            <h2>Leave feedback on any prototype</h2>
            <p>Paste a prototype URL above to load it. Then click anywhere on the screen to drop a pin and leave a comment.</p>
          </div>
        </div>
      </div>
    `;
  }

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

function loadPrototype() {
  const urlInput = document.getElementById('url-input');
  if (!urlInput) return;
  let url = urlInput.value.trim();
  if (!url) return;
  if (!url.startsWith('http')) url = 'https://' + url;
  if (window._iframePoller) clearInterval(window._iframePoller);
  state.prototypeUrl = url;
  state.currentScreen = url;
  state.loaded = true;
  state.newCommentPos = null;
  state.selectedCommentId = null;
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
