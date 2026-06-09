// background.js

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['WORKERS'],
      justification: 'Running Stockfish WebAssembly in a Web Worker'
    });
    await creating;
    creating = null;
  }
}

// Forward messages from content script to offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'EVALUATE_FEN') {
      setupOffscreenDocument('offscreen.html').then(() => {
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'EVALUATE_FEN',
          fen: message.fen
        });
      });
      // No longer returning true to prevent "message channel closed" warnings
    }

    if (message.target === 'content') {
      // Forward from offscreen to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, message);
        }
      });
    }

    // Handle offscreen requesting initial engine level
    if (message.type === 'REQUEST_ENGINE_LEVEL') {
      chrome.storage.sync.get({ engineLevel: 20 }, (items) => {
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'UPDATE_ENGINE_LEVEL',
          level: items.engineLevel
        });
      });
    }
  } catch (err) {
    console.error('[Background] Error processing message:', err);
  }
});

// Listen for storage changes and forward to offscreen
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.engineLevel) {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'UPDATE_ENGINE_LEVEL',
        level: changes.engineLevel.newValue
      });
    }
  });
} else {
  console.error('[CatChess] CRITICAL ERROR: chrome.storage is missing. Please go to chrome://extensions and click the RELOAD button.');
}
