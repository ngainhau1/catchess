// background.js

let creating;
async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

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

// Forward messages between content script ↔ offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'EVALUATE_FEN') {
      // Forward ALL fields to offscreen (fen + lastMoveTarget + lastMoveColor)
      setupOffscreenDocument('offscreen.html').then(() => {
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'EVALUATE_FEN',
          fen: message.fen,
          lastMoveTarget: message.lastMoveTarget,
          lastMoveColor: message.lastMoveColor
        });
      });
    }

    if (message.target === 'content') {
      // Forward from offscreen → content script (active tab)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, message);
        }
      });
    }

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
    console.error('[Background] Error:', err);
  }
});

// Forward engine level changes to offscreen
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
}
