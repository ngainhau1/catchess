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

    // Guess active color: check if bottom player is active, or just check move list
    // For simplicity, we'll default to white, but in a real match, we should read the clock or last move.
    // Let's assume white. A more advanced version would parse the moves list.
    const fen = fenRows.join('/') + ' w KQkq - 0 1';
    return fen;
}

let lastFen = '';

// Use setInterval instead of MutationObserver to survive SPA navigations
// and board element replacements.
setInterval(() => {
    const fen = getBoardFEN();
    if (fen && fen !== lastFen) {
        console.log('[CatChess] Found new board state:', fen);
        lastFen = fen;
        chrome.runtime.sendMessage({
            type: 'EVALUATE_FEN',
            fen: fen
        });
    }
}, 500);
