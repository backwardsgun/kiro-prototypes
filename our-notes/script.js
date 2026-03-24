// Our Notes — Prototype Feedback Tool

let state = {
  prototypeUrl: '',
  loaded: false,
  commentMode: false,
  sidebarOpen: true,
  comments: [],
  selectedCommentId: null,
  newCommentPos: null, // { x%, y% }
  userName: 'Reviewer',
  currentScreen: ''
};

// Load from localStorage
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
  localStorage.setItem('our-notes-comments', JSON.stringify(state.comments));
}

function saveUrl() {
  localStorage.setItem('our-notes-url', state.prototypeUrl);
}

// Get comments for current screen
function currentComments() {
  return state.comments.filter(c => c.screen === state.currentScreen);
}

// Init
function initApp() {
  loadState();
  render();
}

// Main render
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

// Render a single comment card (shared by renderSidebar and updateSidebar)
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

// Format timestamp
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString();
}

// Event listeners
function attachListeners() {
  // Load URL
  const urlInput = document.getElementById('url-input');
  const loadBtn = document.getElementById('load-btn');

  if (urlInput) {
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadPrototype();
    });
  }
  if (loadBtn) {
    loadBtn.addEventListener('click', loadPrototype);
  }

  // Toggle comment mode
  const toggleMode = document.getElementById('toggle-comment-mode');
  if (toggleMode) {
    toggleMode.addEventListener('click', () => {
      state.commentMode = !state.commentMode;
      state.newCommentPos = null;
      render();
    });
  }

  // Toggle sidebar
  const toggleSidebar = document.getElementById('toggle-sidebar');
  if (toggleSidebar) {
    toggleSidebar.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen;
      render();
    });
  }

  // Start over
  const startOverBtn = document.getElementById('start-over-btn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      if (!confirm('Start over? This will clear the loaded prototype and all comments.')) return;
      if (window._iframePoller) clearInterval(window._iframePoller);
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
      render();
      // Focus textarea
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
      render();
    });
  });

  // Comment card clicks
  document.querySelectorAll('.comment-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-comment-btn')) return;
      state.selectedCommentId = card.dataset.commentId;
      state.newCommentPos = null;
      render();
    });
  });

  // Delete comment
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.commentId;
      state.comments = state.comments.filter(c => c.id !== id);
      if (state.selectedCommentId === id) state.selectedCommentId = null;
      saveComments();
      render();
    });
  });

  // Save new comment
  const saveBtn = document.getElementById('save-comment');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveNewComment);
  }

  // Cancel new comment
  const cancelBtn = document.getElementById('cancel-comment');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      state.newCommentPos = null;
      render();
    });
  }

  // New comment textarea — Enter to submit
  const textarea = document.getElementById('new-comment-text');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveNewComment();
      }
    });
  }

  // Clear all
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all comments for this screen?')) {
        state.comments = state.comments.filter(c => c.screen !== state.currentScreen);
        state.selectedCommentId = null;
        saveComments();
        render();
      }
    });
  }

  // Thumbnail click → lightbox
  const sidebarContent = document.querySelector('.sidebar-content');
  if (sidebarContent) attachThumbnailListeners(sidebarContent);

  // Track iframe navigation
  const iframe = document.getElementById('prototype-frame');
  if (iframe) {
    // Poll for URL changes since same-origin iframes don't always fire load
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
      } catch(e) {
        // Cross-origin — can't read URL
      }
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

function saveNewComment() {
  const textarea = document.getElementById('new-comment-text');
  if (!textarea || !textarea.value.trim()) return;

  const commentText = textarea.value.trim();
  const pinX = state.newCommentPos.x;
  const pinY = state.newCommentPos.y;

  const comment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    screen: state.currentScreen,
    x: pinX,
    y: pinY,
    text: commentText,
    author: state.userName,
    timestamp: Date.now(),
    screenshot: null
  };

  // Capture screenshot of the iframe wrapper area
  captureScreenshot(pinX, pinY).then(dataUrl => {
    comment.screenshot = dataUrl;
    saveComments();
    updateOverlay();
    updateSidebar();
  }).catch(() => {
    // Screenshot failed (likely cross-origin) — save without it
    saveComments();
    updateOverlay();
    updateSidebar();
  });

  state.comments.push(comment);
  state.newCommentPos = null;
  state.selectedCommentId = comment.id;
  saveComments();
  render();
}

async function captureScreenshot(pinXPercent, pinYPercent) {
  const wrapper = document.querySelector('.viewport-iframe-wrapper');
  if (!wrapper) return null;

  // Hide overlay and new-comment form during capture
  const overlay = document.getElementById('viewport-overlay');
  if (overlay) overlay.style.visibility = 'hidden';

  try {
    // Use Screen Capture API — preferCurrentTab avoids the picker in Chrome
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      preferCurrentTab: true
    });

    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();
    track.stop(); // Stop immediately — we only need one frame

    // Get the iframe wrapper's position relative to the full page
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Create a canvas cropped to just the iframe area
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');

    // Draw the cropped region from the full-page capture
    ctx.drawImage(
      bitmap,
      rect.left * dpr, rect.top * dpr,
      rect.width * dpr, rect.height * dpr,
      0, 0,
      canvas.width, canvas.height
    );
    bitmap.close();

    // Draw highlight circle at pin position
    drawPinHighlight(ctx, pinXPercent, pinYPercent, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.7);
  } catch(e) {
    console.warn('Screen capture failed, trying html2canvas fallback:', e);
    // Fallback to html2canvas for same-origin iframes
    return captureScreenshotFallback(wrapper, pinXPercent, pinYPercent);
  } finally {
    if (overlay) overlay.style.visibility = '';
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

  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 153, 0, 0.2)';
  ctx.fill();

  // Ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#FF9900';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF9900';
  ctx.fill();
}

// Lightbox
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
    if (e.target === lightbox || e.target.id === 'lightbox-close') {
      lightbox.remove();
    }
  });
}

function updateCommentCount() {
  const countEl = document.querySelector('.comment-count');
  const count = currentComments().length;
  if (countEl) {
    if (count > 0) {
      countEl.textContent = count;
      countEl.style.display = '';
    } else {
      countEl.style.display = 'none';
    }
  }
}

// Partial re-renders (avoid iframe rebuild)
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
  overlay.innerHTML = pins;
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
  // Re-attach sidebar listeners
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.commentId;
      state.comments = state.comments.filter(c => c.id !== id);
      if (state.selectedCommentId === id) state.selectedCommentId = null;
      saveComments();
      updateOverlay();
      updateSidebar();
    });
  });
  // Update count badge
  const countEl = document.querySelector('.comment-count');
  if (countEl) countEl.textContent = comments.length;

  // Thumbnail click → lightbox
  attachThumbnailListeners(sidebarContent);
}

// Attach thumbnail click listeners within a container
function attachThumbnailListeners(container) {
  container.querySelectorAll('.comment-thumbnail').forEach(thumb => {
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentId = thumb.dataset.screenshot;
      const comment = state.comments.find(c => c.id === commentId);
      if (comment && comment.screenshot) {
        openLightbox(comment.screenshot);
      }
    });
  });
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
