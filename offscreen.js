// offscreen.js

let stockfish = new Worker('lib/stockfish.js');

stockfish.postMessage('uci');
stockfish.postMessage('isready');
stockfish.postMessage('setoption name MultiPV value 1');

let currentFen = '';
let currentTarget = null;
let currentColor = null;
let currentUserColor = null;
let currentIsUserTurn = false;

let previousScore = 0;
let currentScore = 0;
let engineReady = false;
let evalTimeoutId = null;

// Track which FEN we expect results for, to ignore stale responses
let expectedFen = '';

stockfish.onmessage = function(event) {
    const line = event.data;

    if (line === 'readyok') {
        engineReady = true;
        console.log('[Engine] Ready.');
        return;
    }

    if (line === 'uciok') {
        console.log('[Engine] UCI initialized.');
        return;
    }

    const scoreMatch = line.match(/info depth (\d+).*score (cp|mate) (-?\d+)/);
    if (scoreMatch) {
        let depth = parseInt(scoreMatch[1], 10);
        let type = scoreMatch[2];
        let val = parseInt(scoreMatch[3], 10);

        let scoreVal = val;
        if (type === 'mate') {
            scoreVal = val > 0 ? 30000 - val : -30000 - val;
        }

        // Normalize to White's perspective
        if (currentFen.includes(' b ')) {
            scoreVal = -scoreVal;
        }

        currentScore = scoreVal;

        // Send eval update
        chrome.runtime.sendMessage({
            target: 'content',
            type: 'EVAL_UPDATE',
            data: { value: val, type: type, depth: depth }
        });
    }

    if (line && line.startsWith('bestmove')) {
        if (evalTimeoutId) {
            clearTimeout(evalTimeoutId);
            evalTimeoutId = null;
        }

        const match = line.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (!match || !match[1]) {
            console.warn('[Engine] bestmove with no valid move:', line);
            return;
        }

        const bestMove = match[1];
        console.log(`[Engine] bestmove: ${bestMove} | isUserTurn: ${currentIsUserTurn}`);

        // Send best move with isUserTurn flag
        chrome.runtime.sendMessage({
            target: 'content',
            type: 'BEST_MOVE',
            move: bestMove,
            isUserTurn: currentIsUserTurn
        });

        // Classify the last move (the move that led to this position)
        if (currentColor && currentTarget) {
            let diff = 0;
            if (currentColor === 'w') {
                diff = currentScore - previousScore;
            } else {
                diff = previousScore - currentScore;
            }

            let classification = 'good';
            if (diff < -300) classification = 'blunder';
            else if (diff < -100) classification = 'mistake';
            else if (diff < -40) classification = 'inaccuracy';
            else if (diff > 150 && Math.abs(previousScore) < 500) classification = 'brilliant';
            else if (diff > 50) classification = 'great';
            else if (diff > 10) classification = 'excellent';
            else if (diff > -10) classification = 'best';

            // Only show review icon for the USER's own moves
            const isUserMove = (currentColor === currentUserColor);
            console.log(`[Engine] ${currentColor}'s move at ${currentTarget}: ${classification} (diff=${diff}, isUserMove=${isUserMove})`);

            if (isUserMove) {
                chrome.runtime.sendMessage({
                    target: 'content',
                    type: 'REVIEW_MOVE',
                    square: currentTarget,
                    classification: classification
                });
            }
        }

        previousScore = currentScore;
    }
};

chrome.runtime.onMessage.addListener((message) => {
    try {
        if (message.target === 'offscreen') {
            if (message.type === 'EVALUATE_FEN') {
                currentFen = message.fen;
                currentTarget = message.lastMoveTarget || null;
                currentColor = message.lastMoveColor || null;
                currentUserColor = message.userColor || null;
                currentIsUserTurn = message.isUserTurn || false;

                console.log(`[Engine] Evaluating: ${message.fen.substring(0, 40)}... isUserTurn=${currentIsUserTurn}`);

                // Just send position + go. Do NOT send 'stop' — it breaks stockfish.js
                stockfish.postMessage('position fen ' + message.fen);
                stockfish.postMessage('go depth 12');

                // Safety timeout — only fires if engine is truly stuck
                if (evalTimeoutId) clearTimeout(evalTimeoutId);
                evalTimeoutId = setTimeout(() => {
                    console.error('[Engine] Timeout! Engine stuck. Sending stop.');
                    stockfish.postMessage('stop');
                    evalTimeoutId = null;
                }, 5000);

            } else if (message.type === 'UPDATE_ENGINE_LEVEL') {
                stockfish.postMessage(`setoption name Skill Level value ${message.level}`);
            }
        }
    } catch (err) {
        console.error('[Engine] Error:', err);
    }
});

chrome.runtime.sendMessage({ type: 'REQUEST_ENGINE_LEVEL' });
