// Critiq — Content script overlay
(() => {
  if (window.__critiqLoaded) return;
  window.__critiqLoaded = true;

  let state = {
    active: false,
    commentMode: false,
    showPins: false,
    panelOpen: true,
    editingId: null,
    comments: [],
    currentUrl: location.href,
    newPin: null,
    selectedId: null,
    userName: 'Reviewer'
  };

  // --- Storage helpers ---
  function loadComments() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'getComments' }, (res) => {
        state.comments = res?.comments || [];
        resolve();
      });
    });
  }

  function saveComments() {
    chrome.runtime.sendMessage({ type: 'saveComments', comments: state.comments });
  }

  function currentComments() {
    return state.comments.filter(c => c.screen === state.currentUrl);
  }

  // --- DOM setup ---
  const root = document.createElement('div');
  root.id = 'critiq-root';
  document.body.appendChild(root);

  const pinLayer = document.createElement('div');
  pinLayer.id = 'critiq-pin-layer';
  root.appendChild(pinLayer);

  const panel = document.createElement('div');
  panel.id = 'critiq-panel';
  panel.classList.add('critiq-hidden');
  root.appendChild(panel);

  // --- Render pins ---
  function renderPins() {
    const comments = currentComments();
    const pinsVisible = state.showPins || state.commentMode;
    pinLayer.innerHTML = pinsVisible ? comments.map((c, i) => `
      <div class="critiq-pin ${state.selectedId === c.id ? 'selected' : ''}"
           style="left:${c.x}px;top:${c.y}px;" data-id="${c.id}">
        <span class="critiq-pin-num">${i + 1}</span>
      </div>
    `).join('') : '';

    if (state.newPin) {
      pinLayer.innerHTML += `
        <div class="critiq-pin new" style="left:${state.newPin.x}px;top:${state.newPin.y}px;">
          <span class="critiq-pin-num">+</span>
        </div>
        <div class="critiq-comment-form" style="left:${state.newPin.x + 20}px;top:${state.newPin.y + 10}px;">
          <textarea id="critiq-new-text" placeholder="Leave a comment..." autofocus></textarea>
          <div class="critiq-form-actions">
            <button class="critiq-btn critiq-btn-ghost" id="critiq-cancel">Cancel</button>
            <button class="critiq-btn critiq-btn-primary" id="critiq-post">Post</button>
          </div>
        </div>
      `;
    }

    attachPinListeners();
  }

  function attachPinListeners() {
    pinLayer.querySelectorAll('.critiq-pin:not(.new)').forEach(pin => {
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedId = pin.dataset.id;
        state.newPin = null;
        renderPins();
        renderPanel();
      });
    });

    const postBtn = document.getElementById('critiq-post');
    if (postBtn) postBtn.addEventListener('click', postComment);

    const cancelBtn = document.getElementById('critiq-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      state.newPin = null;
      renderPins();
    });

    const textarea = document.getElementById('critiq-new-text');
    if (textarea) {
      setTimeout(() => textarea.focus(), 50);
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); }
      });
    }
  }

  async function postComment() {
    const textarea = document.getElementById('critiq-new-text');
    if (!textarea || !textarea.value.trim()) return;

    // Capture screenshot
    let screenshot = null;
    try {
      // Temporarily hide our overlay for clean capture
      root.style.display = 'none';
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const res = await chrome.runtime.sendMessage({ type: 'captureScreenshot' });
      screenshot = res?.screenshot || null;
    } catch(e) {
      console.warn('Screenshot failed:', e);
    } finally {
      root.style.display = '';
    }

    // Draw pin highlight on screenshot
    if (screenshot) {
      screenshot = await addPinHighlight(screenshot, state.newPin.x, state.newPin.y);
    }

    const comment = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      screen: state.currentUrl,
      x: state.newPin.x,
      y: state.newPin.y,
      text: textarea.value.trim(),
      author: state.userName,
      timestamp: Date.now(),
      screenshot: screenshot
    };

    state.comments.push(comment);
    state.newPin = null;
    state.selectedId = comment.id;
    saveComments();
    renderPins();
    renderPanel();
    showToast('Comment added');
  }

  function addPinHighlight(dataUrl, px, py) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Convert page coords to screenshot coords
        const scaleX = img.width / window.innerWidth;
        const scaleY = img.height / window.innerHeight;
        const cx = (px - window.scrollX) * scaleX;
        const cy = (py - window.scrollY) * scaleY;

        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 153, 0, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF9900';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF9900';
        ctx.fill();

        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // --- Side panel ---
  function renderPanel() {
    if (!state.active) { panel.classList.add('critiq-hidden'); return; }
    panel.classList.remove('critiq-hidden');
    panel.classList.toggle('critiq-collapsed', !state.panelOpen);

    if (!state.panelOpen) {
      panel.innerHTML = `<button class="critiq-expand-tab" id="critiq-expand" title="Open Critiq panel">◀ Critiq</button>`;
      document.getElementById('critiq-expand')?.addEventListener('click', () => {
        state.panelOpen = true;
        renderPanel();
      });
      return;
    }

    const comments = currentComments();
    const commentCards = comments.length === 0
      ? `<div class="critiq-empty"><div class="critiq-empty-icon">💬</div><p>No comments on this page yet.</p></div>`
      : comments.map((c, i) => {
          const thumb = c.screenshot ? `<div class="critiq-thumb" data-id="${c.id}"><img src="${c.screenshot}"></div>` : '';
          const time = formatTime(c.timestamp);
          const isEditing = state.editingId === c.id;
          const textSection = isEditing
            ? `<div class="critiq-edit-form">
                <textarea class="critiq-edit-textarea" data-id="${c.id}">${c.text}</textarea>
                <div class="critiq-form-actions">
                  <button class="critiq-btn critiq-btn-ghost critiq-btn-sm critiq-cancel-edit" data-id="${c.id}">Cancel</button>
                  <button class="critiq-btn critiq-btn-primary critiq-btn-sm critiq-save-edit" data-id="${c.id}">Save</button>
                </div>
              </div>`
            : `<div class="critiq-card-text">${c.text}</div>`;
          return `
            <div class="critiq-card ${state.selectedId === c.id ? 'selected' : ''}" data-id="${c.id}">
              <div class="critiq-card-head">
                <div class="critiq-avatar">${c.author.charAt(0).toUpperCase()}</div>
                <span class="critiq-author">${c.author}</span>
                <span class="critiq-num">${i + 1}</span>
                ${!isEditing ? `<button class="critiq-edit" data-id="${c.id}" title="Edit">✎</button>` : ''}
                <button class="critiq-delete" data-id="${c.id}">✕</button>
              </div>
              ${textSection}
              ${thumb}
              <div class="critiq-card-time">${time}</div>
            </div>
          `;
        }).join('');

    panel.innerHTML = `
      <div class="critiq-panel-header">
        <span class="critiq-panel-title">Critiq</span>
        <button class="critiq-collapse-btn" id="critiq-collapse" title="Collapse panel">▶</button>
        <div class="critiq-panel-actions">
          <button class="critiq-btn critiq-btn-ghost critiq-btn-sm ${state.showPins ? 'active' : ''}" id="critiq-toggle-pins">
            💬 ${state.showPins ? 'Hide pins' : 'Display comments'}
          </button>
          <button class="critiq-btn critiq-btn-ghost critiq-btn-sm ${state.commentMode ? 'active' : ''}" id="critiq-toggle-mode">
            📌 ${state.commentMode ? 'Done' : 'Add comment'}
          </button>
          ${state.comments.length > 0 ? '<button class="critiq-btn critiq-btn-ghost critiq-btn-sm" id="critiq-export">📄 Export to PDF</button>' : ''}
        </div>
      </div>
      <div class="critiq-panel-body">${commentCards}</div>
    `;
    attachPanelListeners();
  }

  function attachPanelListeners() {
    document.getElementById('critiq-collapse')?.addEventListener('click', () => {
      state.panelOpen = false;
      renderPanel();
    });

    document.getElementById('critiq-toggle-pins')?.addEventListener('click', () => {
      state.showPins = !state.showPins;
      renderPins();
      renderPanel();
    });

    document.getElementById('critiq-toggle-mode')?.addEventListener('click', () => {
      state.commentMode = !state.commentMode;
      state.newPin = null;
      if (state.commentMode) state.showPins = true;
      pinLayer.classList.toggle('comment-mode', state.commentMode);
      renderPins();
      renderPanel();
    });

    document.getElementById('critiq-export')?.addEventListener('click', openExportModal);

    panel.querySelectorAll('.critiq-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.critiq-delete') || e.target.closest('.critiq-edit') || e.target.closest('.critiq-edit-form')) return;
        state.selectedId = card.dataset.id;
        state.newPin = null;
        renderPins();
        renderPanel();
        const c = state.comments.find(c => c.id === card.dataset.id);
        if (c) window.scrollTo({ top: c.y - 200, behavior: 'smooth' });
      });
    });

    panel.querySelectorAll('.critiq-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.comments = state.comments.filter(c => c.id !== btn.dataset.id);
        if (state.selectedId === btn.dataset.id) state.selectedId = null;
        if (state.editingId === btn.dataset.id) state.editingId = null;
        saveComments();
        renderPins();
        renderPanel();
      });
    });

    // Edit
    panel.querySelectorAll('.critiq-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.editingId = btn.dataset.id;
        renderPanel();
        setTimeout(() => {
          const ta = panel.querySelector(`.critiq-edit-textarea[data-id="${btn.dataset.id}"]`);
          if (ta) { ta.focus(); ta.selectionStart = ta.value.length; }
        }, 50);
      });
    });

    // Save edit
    panel.querySelectorAll('.critiq-save-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const ta = panel.querySelector(`.critiq-edit-textarea[data-id="${id}"]`);
        if (ta && ta.value.trim()) {
          const comment = state.comments.find(c => c.id === id);
          if (comment) comment.text = ta.value.trim();
          saveComments();
        }
        state.editingId = null;
        renderPanel();
      });
    });

    // Cancel edit
    panel.querySelectorAll('.critiq-cancel-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.editingId = null;
        renderPanel();
      });
    });

    panel.querySelectorAll('.critiq-thumb').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = state.comments.find(c => c.id === thumb.dataset.id);
        if (c?.screenshot) openLightbox(c.screenshot);
      });
    });
  }

  // --- Page click handler for dropping pins ---
  pinLayer.addEventListener('click', (e) => {
    if (!state.commentMode) return;
    if (e.target.closest('.critiq-pin') || e.target.closest('.critiq-comment-form')) return;
    state.newPin = { x: e.pageX, y: e.pageY };
    state.selectedId = null;
    renderPins();
  });

  // --- Lightbox ---
  function openLightbox(src) {
    const lb = document.createElement('div');
    lb.className = 'critiq-lightbox';
    lb.innerHTML = `<img src="${src}"><button class="critiq-lb-close">✕</button>`;
    document.body.appendChild(lb);
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.classList.contains('critiq-lb-close')) lb.remove();
    });
  }

  // --- Toast ---
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'critiq-toast';
    t.textContent = '✓ ' + msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 2000);
  }

  function formatTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return new Date(ts).toLocaleDateString();
  }

  // --- Export modal ---
  function openExportModal() {
    const modal = document.createElement('div');
    modal.className = 'critiq-lightbox';
    modal.innerHTML = `
      <div class="critiq-export-modal">
        <h3>Export to PDF</h3>
        <label>Reviewer name</label>
        <input type="text" id="critiq-exp-name" value="${state.userName}" placeholder="Enter name...">
        <label>Review date</label>
        <input type="date" id="critiq-exp-date" value="${new Date().toISOString().split('T')[0]}">
        <div class="critiq-form-actions">
          <button class="critiq-btn critiq-btn-ghost" id="critiq-exp-cancel">Cancel</button>
          <button class="critiq-btn critiq-btn-primary" id="critiq-exp-go">Export PDF</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'critiq-exp-cancel') modal.remove();
    });
    document.getElementById('critiq-exp-go').addEventListener('click', () => {
      const name = document.getElementById('critiq-exp-name').value.trim() || 'Reviewer';
      const date = document.getElementById('critiq-exp-date').value;
      modal.remove();
      generatePDF(name, date);
    });
  }

  function generatePDF(reviewer, date) {
    const grouped = {};
    for (const c of state.comments) {
      if (!grouped[c.screen]) grouped[c.screen] = [];
      grouped[c.screen].push(c);
    }
    const sections = Object.entries(grouped).map(([screen, cmts], si) => {
      let label = screen;
      try { label = new URL(screen).pathname || screen; } catch(e) {}
      const rows = cmts.map((c, i) => {
        const ss = c.screenshot ? `<div style="margin-top:10px"><img src="${c.screenshot}" style="max-width:100%;border-radius:6px;border:1px solid #e0e0e0"></div>` : '';
        return `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:10px;page-break-inside:avoid">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="background:#FF9900;color:#000;font-weight:700;font-size:11px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">${i+1}</span>
            <strong style="font-size:13px">${c.author}</strong>
            <span style="font-size:11px;color:#888;margin-left:auto">${new Date(c.timestamp).toLocaleString()}</span>
          </div>
          <div style="font-size:14px;line-height:1.6">${c.text}</div>${ss}
        </div>`;
      }).join('');
      return `<div style="margin-bottom:32px;page-break-inside:avoid"><h3 style="font-size:15px;background:#f5f5f5;padding:8px 12px;border-radius:6px;margin-bottom:12px;word-break:break-all">Screen ${si+1}: ${label}</h3>${rows}</div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Critiq — Review Export</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;padding:40px;max-width:900px;margin:0 auto}@media print{body{padding:20px}}</style>
</head><body>
<div style="border-bottom:2px solid #FF9900;padding-bottom:16px;margin-bottom:32px">
  <h1 style="font-size:24px;margin-bottom:4px">Prototype Review — Critiq</h1>
  <h2 style="font-size:16px;font-weight:400;color:#555">${location.href}</h2>
  <div style="display:flex;gap:24px;margin-top:8px;font-size:13px;color:#666">
    <span>Reviewer: <strong>${reviewer}</strong></span>
    <span>Date: <strong>${date}</strong></span>
    <span>Total: <strong>${state.comments.length}</strong></span>
  </div>
</div>
${sections}
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;text-align:center">Generated by Critiq</div>
</body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  // --- URL change detection ---
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      state.currentUrl = location.href;
      state.selectedId = null;
      state.newPin = null;
      renderPins();
      renderPanel();
    }
  }).observe(document.body, { childList: true, subtree: true });

  // --- Listen for toggle from popup ---
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggleCritiq') {
      state.active = !state.active;
      if (state.active) {
        loadComments().then(() => { renderPins(); renderPanel(); });
      } else {
        state.commentMode = false;
        pinLayer.classList.remove('comment-mode');
        pinLayer.innerHTML = '';
        panel.classList.add('critiq-hidden');
      }
    }
  });

  // Auto-activate if was active before
  chrome.storage.local.get(['critiq_active'], (res) => {
    if (res.critiq_active) {
      state.active = true;
      loadComments().then(() => { renderPins(); renderPanel(); });
    }
  });
})();
