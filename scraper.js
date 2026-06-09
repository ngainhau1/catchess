// scraper.js

/**
 * Detects which color the user is playing by checking board orientation.
 * Chess.com flips the board when the user plays Black.
 */
function getUserColor() {
    const board = document.querySelector('wc-chess-board');
    if (!board) return 'w';
    return board.classList.contains('flipped') ? 'b' : 'w';
}

/**
 * Parses the Chess.com board and generates a FEN placement string.
 * Returns only the piece placement (no turn/castling), plus the raw piece NodeList.
 */
function getBoardPlacement() {
    const pieces = document.querySelectorAll('.piece');
    if (!pieces || pieces.length === 0) return null;

    const board = Array(8).fill(null).map(() => Array(8).fill(''));

    pieces.forEach(piece => {
        let pieceType = '';
        let file = -1;
        let rank = -1;

        const typeMatch = piece.className.match(/(w|b)(p|n|b|r|q|k)/);
        if (typeMatch) {
            const color = typeMatch[1];
            const pType = typeMatch[2];
            pieceType = color === 'w' ? pType.toUpperCase() : pType.toLowerCase();
        }

        const squareMatch = piece.className.match(/square-(\d)(\d)/);
        if (squareMatch) {
            file = parseInt(squareMatch[1], 10) - 1;
            rank = parseInt(squareMatch[2], 10) - 1;
        }

        if (pieceType && file >= 0 && rank >= 0) {
            board[rank][file] = pieceType;
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

    return { placement: fenRows.join('/'), pieces, board };
}

/**
 * Detects the last move by looking at Chess.com's highlight squares.
 * Chess.com uses elements with class "highlight" to mark the source and
 * destination of the most recent move.
 */
function getLastMoveInfo(pieces) {
    const highlights = document.querySelectorAll('.highlight');
    if (!highlights || highlights.length === 0) return null;

    // Collect all highlighted square coordinates
    const highlightedSquares = new Set();
    highlights.forEach(h => {
        const m = h.className.match(/square-(\d)(\d)/);
        if (m) highlightedSquares.add(`${m[1]}${m[2]}`);
    });

    if (highlightedSquares.size === 0) return null;

    // Find the piece sitting on a highlighted square — that's the destination
    let targetSquare = null;
    let color = null;

    pieces.forEach(piece => {
        const squareMatch = piece.className.match(/square-(\d)(\d)/);
        if (!squareMatch) return;
        const sq = `${squareMatch[1]}${squareMatch[2]}`;

        if (highlightedSquares.has(sq)) {
            const typeMatch = piece.className.match(/(w|b)(p|n|b|r|q|k)/);
            if (typeMatch) {
                color = typeMatch[1];
                const file = String.fromCharCode('a'.charCodeAt(0) + parseInt(squareMatch[1], 10) - 1);
                const rank = squareMatch[2];
                targetSquare = file + rank;
            }
        }
    });

    return targetSquare ? { targetSquare, color } : null;
}

/**
 * Infer castling rights from piece positions on the board array.
 */
function inferCastling(board) {
    let castling = '';
    // White King on e1 (file 4, rank 0)
    if (board[0][4] === 'K') {
        if (board[0][7] === 'R') castling += 'K'; // h1 rook
        if (board[0][0] === 'R') castling += 'Q'; // a1 rook
    }
    // Black King on e8 (file 4, rank 7)
    if (board[7][4] === 'k') {
        if (board[7][7] === 'r') castling += 'k'; // h8 rook
        if (board[7][0] === 'r') castling += 'q'; // a8 rook
    }
    return castling || '-';
}

// ─── State ────────────────────────────────────────────────────
let lastPlacement = '';
let pendingPlacement = null;

// ─── Main polling loop ───────────────────────────────────────
setInterval(() => {
    try {
        const data = getBoardPlacement();
        if (!data || !data.placement) return;

        // Debounce: require two identical reads in a row
        if (pendingPlacement !== data.placement) {
            pendingPlacement = data.placement;
            return;
        }

        // Only fire when the placement actually changes
        if (data.placement === lastPlacement) return;

        const lastMove = getLastMoveInfo(data.pieces);

        // Determine active color (whose turn it is)
        let activeColor = 'w';
        if (lastMove) {
            activeColor = lastMove.color === 'w' ? 'b' : 'w';
        } else if (data.placement === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
            activeColor = 'w'; // starting position
        }

        const castling = inferCastling(data.board);
        const fen = `${data.placement} ${activeColor} ${castling} - 0 1`;

        const userColor = getUserColor();

        console.log(`[Scraper] Placement changed. FEN: ${fen}`);
        console.log(`[Scraper] User plays: ${userColor}, Active turn: ${activeColor}, Last move:`, lastMove);

        lastPlacement = data.placement;

        // Only ask Stockfish to evaluate when it is the USER's turn
        if (activeColor === userColor) {
            chrome.runtime.sendMessage({
                type: 'EVALUATE_FEN',
                fen: fen,
                lastMoveTarget: lastMove ? lastMove.targetSquare : null,
                lastMoveColor: lastMove ? lastMove.color : null
            });
        } else {
            console.log(`[Scraper] Skipping evaluation — it is the opponent's turn.`);
        }
    } catch (err) {
        console.error('[Scraper] CRITICAL ERROR:', err);
    }
}, 300);

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
    toast.timeoutId = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}
