// offscreen.js

let stockfish = new Worker('lib/stockfish.js');
stockfish.postMessage('uci');
stockfish.postMessage('isready');
stockfish.postMessage('setoption name MultiPV value 1');

// ─── Evaluation state, keyed by evalId ────────────────────────
let currentEvalId = 0;
let evalMeta = {}; // { evalId → { fen, lastMoveTarget, lastMoveColor, userColor } }

let previousScore = 0;
let currentScore = 0;
let evalTimeoutId = null;

stockfish.onmessage = function(event) {
    const line = event.data;

    if (line === 'readyok' || line === 'uciok') return;

    // Parse score from intermediate depth reports
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
        const meta = evalMeta[currentEvalId];
        if (meta && meta.fen.includes(' b ')) {
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

    // Parse bestmove
    if (line && line.startsWith('bestmove')) {
        if (evalTimeoutId) {
            clearTimeout(evalTimeoutId);
            evalTimeoutId = null;
        }

        const match = line.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (!match || !match[1]) return;

        const bestMove = match[1];
        const meta = evalMeta[currentEvalId];

        if (!meta) {
            console.warn('[Engine] bestmove but no meta for evalId:', currentEvalId);
            return;
        }

        console.log(`[Engine] #${currentEvalId} bestmove: ${bestMove}`);

        // Always send as user's turn (we only evaluate user's turn now)
        chrome.runtime.sendMessage({
            target: 'content',
            type: 'BEST_MOVE',
            evalId: currentEvalId,
            move: bestMove
        });

        // Classify the opponent's last move that led to this position
        if (meta.lastMoveTarget && meta.lastMoveColor) {
            // Score diff: how much did the position change since last evaluation?
            let diff = currentScore - previousScore;
            // If user is black, invert the diff perspective
            if (meta.userColor === 'b') diff = -diff;

            let classification = 'good';
            if (diff < -300) classification = 'blunder';
            else if (diff < -100) classification = 'mistake';
            else if (diff < -40) classification = 'inaccuracy';
            else if (diff > 150 && Math.abs(previousScore) < 500) classification = 'brilliant';
            else if (diff > 50) classification = 'great';
            else if (diff > 10) classification = 'excellent';
            else if (diff > -10) classification = 'best';

            console.log(`[Engine] #${currentEvalId} classify: ${classification} (diff=${diff})`);

            chrome.runtime.sendMessage({
                target: 'content',
                type: 'REVIEW_MOVE',
                evalId: currentEvalId,
                square: meta.lastMoveTarget,
                classification: classification
            });
        }

        previousScore = currentScore;

        // Cleanup old meta entries (keep only last 5)
        const ids = Object.keys(evalMeta).map(Number).sort((a, b) => a - b);
        while (ids.length > 5) {
            delete evalMeta[ids.shift()];
        }
    }
};

// ─── Message listener ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
    try {
        if (message.target === 'offscreen') {
            if (message.type === 'EVALUATE_FEN') {
                const id = message.evalId;
                currentEvalId = id;

                // Store metadata for this evaluation
                evalMeta[id] = {
                    fen: message.fen,
                    lastMoveTarget: message.lastMoveTarget,
                    lastMoveColor: message.lastMoveColor,
                    userColor: message.userColor
                };

                console.log(`[Engine] #${id} go movetime 800: ${message.fen.substring(0, 50)}...`);

                stockfish.postMessage('position fen ' + message.fen);
                stockfish.postMessage('go movetime 800');

                // Safety timeout (only if engine truly stuck)
                if (evalTimeoutId) clearTimeout(evalTimeoutId);
                evalTimeoutId = setTimeout(() => {
                    console.error(`[Engine] #${id} Timeout! Sending stop.`);
                    stockfish.postMessage('stop');
                    evalTimeoutId = null;
                }, 2000);

            } else if (message.type === 'UPDATE_ENGINE_LEVEL') {
                stockfish.postMessage(`setoption name Skill Level value ${message.level}`);
            }
        }
    } catch (err) {
        console.error('[Engine] Error:', err);
    }
});

chrome.runtime.sendMessage({ type: 'REQUEST_ENGINE_LEVEL' });
