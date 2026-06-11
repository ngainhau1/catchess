// scraper.js — v5 Hybrid (MutationObserver)

let evalCounter = 0;

// ─── Utility functions (unchanged from v4) ────────────────────

function getUserColor() {
    const board = document.querySelector('wc-chess-board');
    if (!board) return 'w';
    return board.classList.contains('flipped') ? 'b' : 'w';
}

function getBoardPlacement() {
    const pieces = document.querySelectorAll('.piece');
    if (!pieces || pieces.length === 0) return null;

    const board = Array(8).fill(null).map(() => Array(8).fill(''));

    pieces.forEach(piece => {
        const typeMatch = piece.className.match(/(w|b)(p|n|b|r|q|k)/);
        const squareMatch = piece.className.match(/square-(\d)(\d)/);
        if (typeMatch && squareMatch) {
            const color = typeMatch[1];
            const pType = typeMatch[2];
            const pieceType = color === 'w' ? pType.toUpperCase() : pType.toLowerCase();
            const file = parseInt(squareMatch[1], 10) - 1;
            const rank = parseInt(squareMatch[2], 10) - 1;
            if (file >= 0 && rank >= 0) board[rank][file] = pieceType;
        }
    });

    let fenRows = [];
    for (let r = 7; r >= 0; r--) {
        let emptyCount = 0;
        let rowStr = '';
        for (let f = 0; f < 8; f++) {
            if (board[r][f] === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) { rowStr += emptyCount; emptyCount = 0; }
                rowStr += board[r][f];
            }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        fenRows.push(rowStr);
    }

    return { placement: fenRows.join('/'), pieces, board };
}

function getLastMoveInfo(pieces) {
    const highlights = document.querySelectorAll('.highlight');
    if (!highlights || highlights.length === 0) return null;

    const highlightedSquares = new Set();
    highlights.forEach(h => {
        const m = h.className.match(/square-(\d)(\d)/);
        if (m) highlightedSquares.add(`${m[1]}${m[2]}`);
    });
    if (highlightedSquares.size === 0) return null;

    let targetSquare = null;
    let color = null;

    pieces.forEach(piece => {
        const squareMatch = piece.className.match(/square-(\d)(\d)/);
        if (!squareMatch) return;
        if (highlightedSquares.has(`${squareMatch[1]}${squareMatch[2]}`)) {
            const typeMatch = piece.className.match(/(w|b)(p|n|b|r|q|k)/);
            if (typeMatch) {
                color = typeMatch[1];
                targetSquare = String.fromCharCode('a'.charCodeAt(0) + parseInt(squareMatch[1], 10) - 1) + squareMatch[2];
            }
        }
    });

    return targetSquare ? { targetSquare, color } : null;
}

function inferCastling(board) {
    let castling = '';
    if (board[0][4] === 'K') {
        if (board[0][7] === 'R') castling += 'K';
        if (board[0][0] === 'R') castling += 'Q';
    }
    if (board[7][4] === 'k') {
        if (board[7][7] === 'r') castling += 'k';
        if (board[7][0] === 'r') castling += 'q';
    }
    return castling || '-';
}

// ─── Board processing (core logic, same as v4) ───────────────

let lastPlacement = '';
let wasUserTurn = false;

function processBoard() {
    try {
        const data = getBoardPlacement();
        if (!data || !data.placement) return;

        // Only process when placement actually changed
        if (data.placement === lastPlacement) return;

        const lastMove = getLastMoveInfo(data.pieces);
        let activeColor = 'w';
        if (lastMove) {
            activeColor = lastMove.color === 'w' ? 'b' : 'w';
        }

        const userColor = getUserColor();
        const isUserTurn = (activeColor === userColor);

        lastPlacement = data.placement;

        if (isUserTurn) {
            const castling = inferCastling(data.board);
            const fen = `${data.placement} ${activeColor} ${castling} - 0 1`;
            evalCounter++;
            const id = evalCounter;

            console.log(`[Scraper] #${id} YOUR TURN. FEN: ${fen}`);

            chrome.runtime.sendMessage({
                type: 'EVALUATE_FEN',
                evalId: id,
                fen: fen,
                lastMoveTarget: lastMove ? lastMove.targetSquare : null,
                lastMoveColor: lastMove ? lastMove.color : null,
                userColor: userColor
            });
            wasUserTurn = true;
        } else {
            if (wasUserTurn) {
                console.log('[Scraper] Opponent moved. Clearing arrow.');
                chrome.runtime.sendMessage({ type: 'OPPONENT_MOVED' });
                wasUserTurn = false;
            }
        }
    } catch (err) {
        console.error('[Scraper] ERROR:', err);
    }
}

// ─── MutationObserver (replaces setInterval) ──────────────────

let debounceTimer = null;
let boardObserver = null;

function scheduleBoardCheck() {
    if (debounceTimer) return; // Already scheduled, skip
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        processBoard();
    }, 100);
}

function initObserver() {
    const board = document.querySelector('wc-chess-board');
    if (!board) return false;

    // Disconnect previous observer if exists (e.g. after SPA navigation)
    if (boardObserver) {
        boardObserver.disconnect();
    }

    boardObserver = new MutationObserver((mutations) => {
        // Quick filter: only care about piece/highlight changes or child additions
        for (const m of mutations) {
            if (m.type === 'childList') {
                // Pieces added/removed (captures, promotions, new game)
                scheduleBoardCheck();
                return;
            }
            if (m.type === 'attributes' && m.target.classList) {
                const cl = m.target.classList;
                if (cl.contains('piece') || cl.contains('highlight')) {
                    scheduleBoardCheck();
                    return;
                }
            }
        }
    });

    boardObserver.observe(board, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true
    });

    return true;
}

// ─── Startup: wait for board to exist ─────────────────────────

function waitForBoard() {
    if (initObserver()) {
        console.log('[Scraper] ✓ MutationObserver attached to wc-chess-board');
        processBoard(); // Process initial board state
        return;
    }
    // Board not yet rendered (SPA navigation) — retry
    setTimeout(waitForBoard, 1000);
}

waitForBoard();

// ─── Keyboard Shortcuts ──────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.altKey) {
        if (e.key.toLowerCase() === 'a') toggleSetting('showArrow', 'Arrows');
        if (e.key.toLowerCase() === 'i') toggleSetting('showIcons', 'Review Icons');
        if (e.key.toLowerCase() === 'e') toggleSetting('showEval', 'Eval Bar');
    }
});

function toggleSetting(key, name) {
    if (!chrome.storage) return;
    chrome.storage.sync.get({[key]: true}, (items) => {
        const newValue = !items[key];
        chrome.storage.sync.set({[key]: newValue}, () => {
            showToast(`${name}: ${newValue ? 'ON' : 'OFF'}`);
        });
    });
}

function showToast(msg) {
    let toast = document.getElementById('catchess-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'catchess-toast';
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#96bc4b; color:#fff; padding:10px 20px; border-radius:5px; z-index:999999; font-family:sans-serif; font-weight:bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: opacity 0.3s; pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}
