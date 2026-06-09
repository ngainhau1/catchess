// scraper.js

/**
 * Parses the Chess.com board and generates a basic FEN string.
 * Note: Castling rights and en passant are omitted for simplicity,
 * which might cause engine to miss castling moves.
 */
function getBoardFEN() {
    const pieces = document.querySelectorAll('.piece');
    if (!pieces || pieces.length === 0) return null;

    // Initialize 8x8 empty board
    const board = Array(8).fill(null).map(() => Array(8).fill(''));

    pieces.forEach(piece => {
        let pieceType = '';
        let file = -1;
        let rank = -1;

        // Extract piece type (wp, bn, wq, etc.)
        const typeMatch = piece.className.match(/(w|b)(p|n|b|r|q|k)/);
        if (typeMatch) {
            const color = typeMatch[1];
            const pType = typeMatch[2];
            pieceType = color === 'w' ? pType.toUpperCase() : pType.toLowerCase();
        }

        // Extract position (square-11 to square-88)
        // 11 = a1 (file 1, rank 1), 88 = h8 (file 8, rank 8)
        const squareMatch = piece.className.match(/square-(\d)(\d)/);
        if (squareMatch) {
            file = parseInt(squareMatch[1], 10) - 1; // 0-7
            rank = parseInt(squareMatch[2], 10) - 1; // 0-7
        }

        if (pieceType && file >= 0 && rank >= 0) {
            board[rank][file] = pieceType;
        }
    });

    // Build FEN string for piece placement
    let fenRows = [];
    // FEN starts from rank 8 down to rank 1
    for (let r = 7; r >= 0; r--) {
        let emptyCount = 0;
        let rowStr = '';
        for (let f = 0; f < 8; f++) {
            if (board[r][f] === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowStr += emptyCount;
                    emptyCount = 0;
                }
                rowStr += board[r][f];
            }
        }
        if (emptyCount > 0) {
            rowStr += emptyCount;
        }
        fenRows.push(rowStr);
    }

    const lastMove = getLastMoveInfo(pieces);
    const activeColor = lastMove ? (lastMove.color === 'w' ? 'b' : 'w') : 'w';
    const fen = fenRows.join('/') + ` ${activeColor} KQkq - 0 1`;
    return { fen, pieces, lastMove };
}

function getLastMoveInfo(pieces) {
    // Chess.com adds .highlight class to start and end squares.
    // The end square of the last move usually has a piece on it.
    const highlights = document.querySelectorAll('.highlight');
    if (!highlights || highlights.length === 0) return null;

    let targetSquare = null;
    let color = null; // 'w' or 'b'

    // Look for a piece that is on a highlighted square
    pieces.forEach(piece => {
        const squareMatch = piece.className.match(/square-(\d)(\d)/);
        if (!squareMatch) return;
        
        const squareClass = `square-${squareMatch[1]}${squareMatch[2]}`;
        
        // Check if any highlight has this squareClass
        let isHighlighted = false;
        highlights.forEach(h => {
            if (h.className.includes(squareClass)) isHighlighted = true;
        });

        if (isHighlighted) {
            const typeMatch = piece.className.match(/(w|b)(p|n|b|r|q|k)/);
            if (typeMatch) {
                color = typeMatch[1];
                // Convert 11-88 to a1-h8
                const file = String.fromCharCode('a'.charCodeAt(0) + parseInt(squareMatch[1], 10) - 1);
                const rank = squareMatch[2];
                targetSquare = file + rank;
            }
        }
    });

    return targetSquare ? { targetSquare, color } : null;
}

let lastFen = '';
let pendingFenData = null;

// Use setInterval to survive SPA navigations and stabilize animations
setInterval(() => {
    const data = getBoardFEN();
    if (data && data.fen) {
        if (pendingFenData && pendingFenData.fen === data.fen) {
            // FEN is stable for 2 consecutive ticks
            if (data.fen !== lastFen) {
                console.log('[CatChess] Found new stable board state:', data.fen);
                lastFen = data.fen;
                
                chrome.runtime.sendMessage({
                    type: 'EVALUATE_FEN',
                    fen: data.fen,
                    lastMoveTarget: data.lastMove ? data.lastMove.targetSquare : null,
                    lastMoveColor: data.lastMove ? data.lastMove.color : null
                });
            }
        } else {
            pendingFenData = data;
        }
    }
}, 300);

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.altKey) {
        if (e.key.toLowerCase() === 'a') toggleSetting('showArrow', 'Arrows');
        if (e.key.toLowerCase() === 'i') toggleSetting('showIcons', 'Review Icons');
        if (e.key.toLowerCase() === 'e') toggleSetting('showEval', 'Eval Bar');
    }
});

function toggleSetting(key, name) {
    if (!chrome.storage) return; // Fail gracefully
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
    toast.timeoutId = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}
