// offscreen.js

let stockfish = new Worker('lib/stockfish.js');

stockfish.postMessage('uci');
stockfish.postMessage('setoption name MultiPV value 1');

let currentFen = '';
let currentTarget = null;
let currentColor = null;
let currentUserColor = null;
let currentIsUserTurn = false;

let previousScore = 0;
let currentScore = 0;

let evalTimeoutId = null;

stockfish.onmessage = function(event) {
    const line = event.data;

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

        // Always send eval update
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
        if (match && match[1]) {
            // Send best move with isUserTurn flag — UI decides whether to show arrow
            chrome.runtime.sendMessage({
                target: 'content',
                type: 'BEST_MOVE',
                move: match[1],
                isUserTurn: currentIsUserTurn
            });

            // Classify the last move
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

                // Only send review icon if the classified move was made by the USER
                const isUserMove = (currentColor === currentUserColor);

                console.log(`[Engine] Classification: ${classification} (diff=${diff}) for ${currentColor}'s move. isUserMove=${isUserMove}`);

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
    }
};

chrome.runtime.onMessage.addListener((message) => {
    try {
        if (message.target === 'offscreen') {
            if (message.type === 'EVALUATE_FEN') {
                console.log('[Engine] Evaluating:', message.fen, 'isUserTurn:', message.isUserTurn);
                currentFen = message.fen;
                currentTarget = message.lastMoveTarget || null;
                currentColor = message.lastMoveColor || null;
                currentUserColor = message.userColor || null;
                currentIsUserTurn = message.isUserTurn || false;

                stockfish.postMessage('stop');
                stockfish.postMessage('position fen ' + message.fen);
                stockfish.postMessage('go depth 12');

                if (evalTimeoutId) clearTimeout(evalTimeoutId);
                evalTimeoutId = setTimeout(() => {
                    console.error('[Engine] Timeout for FEN:', currentFen);
                    stockfish.postMessage('stop');
                    stockfish.postMessage('ucinewgame');
                    evalTimeoutId = null;
                }, 3000);

            } else if (message.type === 'UPDATE_ENGINE_LEVEL') {
                stockfish.postMessage(`setoption name Skill Level value ${message.level}`);
            }
        }
    } catch (err) {
        console.error('[Engine] Error:', err);
    }
});

chrome.runtime.sendMessage({ type: 'REQUEST_ENGINE_LEVEL' });
