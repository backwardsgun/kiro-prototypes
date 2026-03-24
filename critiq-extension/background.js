// Critiq — Background service worker

// Capture visible tab screenshot
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl });
    });
    return true; // async response
  }

  if (msg.type === 'getComments') {
    chrome.storage.local.get(['critiq_comments'], (result) => {
      sendResponse({ comments: result.critiq_comments || [] });
    });
    return true;
  }

  if (msg.type === 'saveComments') {
    chrome.storage.local.set({ critiq_comments: msg.comments }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'clearComments') {
    chrome.storage.local.set({ critiq_comments: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
