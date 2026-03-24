document.getElementById('toggle').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'toggleCritiq' });

  // Toggle stored state
  chrome.storage.local.get(['critiq_active'], (res) => {
    const next = !res.critiq_active;
    chrome.storage.local.set({ critiq_active: next });
    document.getElementById('toggle').textContent = next ? 'Deactivate' : 'Activate on this page';
  });
  window.close();
});

document.getElementById('clear').addEventListener('click', () => {
  if (confirm('Clear all comments?')) {
    chrome.runtime.sendMessage({ type: 'clearComments' });
    window.close();
  }
});

// Set initial button text
chrome.storage.local.get(['critiq_active'], (res) => {
  document.getElementById('toggle').textContent = res.critiq_active ? 'Deactivate' : 'Activate on this page';
});
