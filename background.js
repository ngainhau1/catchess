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

// Track which tab sent the last EVALUATE_FEN so we can reply precisely
let lastSenderTabId = null;

chrome.runtime.onMessage.addListener((message, sender) => {
  try {
    // Content script → offscreen
    if (message.type === 'EVALUATE_FEN') {
      if (sender.tab) lastSenderTabId = sender.tab.id;
      setupOffscreenDocument('offscreen.html').then(() => {
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'EVALUATE_FEN',
          evalId: message.evalId,
          fen: message.fen,
          lastMoveTarget: message.lastMoveTarget,
          lastMoveColor: message.lastMoveColor,
          userColor: message.userColor
        });
      });
    }

    // Content script → UI (lightweight, no engine needed)
    if (message.type === 'OPPONENT_MOVED') {
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, { target: 'content', type: 'OPPONENT_MOVED' });
      }
    }

    // Offscreen → content script (forward to the correct tab)
    if (message.target === 'content') {
      if (lastSenderTabId) {
        chrome.tabs.sendMessage(lastSenderTabId, message);
      }
    }

    // Offscreen requests engine level
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
