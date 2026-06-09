// offscreen.js

let stockfish = new Worker('lib/stockfish.js');

stockfish.postMessage('uci');
stockfish.postMessage('setoption name MultiPV value 1');

let currentFen = '';
let currentTarget = null;
let currentColor = null;

let previousScore = 0; // centipawns
let currentScore = 0; // centipawns

let evalTimeoutId = null;

stockfish.onmessage = function(event) {
    const line = event.data;
    // Uncomment for extreme verbosity, but it might spam the console
    // console.log('[Engine Raw]', line);
    
    const scoreMatch = line.match(/info depth (\d+).*score (cp|mate) (-?\d+)/);
    if (scoreMatch) {
        let depth = parseInt(scoreMatch[1], 10);
        let type = scoreMatch[2];
        let val = parseInt(scoreMatch[3], 10);
        
        let scoreVal = val;
        if (type === 'mate') {
            // Mate in X is worth a lot of centipawns
            scoreVal = val > 0 ? 30000 - val : -30000 - val;
        }

        // Normalize score to White's perspective
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
        console.log('[Engine] Received bestmove:', line);
        
        // Clear the timeout since the engine responded successfully
        if (evalTimeoutId) {
            clearTimeout(evalTimeoutId);
            evalTimeoutId = null;
        }

        const match = line.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (match && match[1]) {
            chrome.runtime.sendMessage({
                target: 'content',
                type: 'BEST_MOVE',
                fen: currentFen,
                move: match[1]
            });
            
            // Classify move
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

                chrome.runtime.sendMessage({
                    target: 'content',
                    type: 'REVIEW_MOVE',
                    square: currentTarget,
                    classification: classification
                });
            }
            
            previousScore = currentScore;
        }
    }
};

chrome.runtime.onMessage.addListener((message) => {
    try {
        if (message.target === 'offscreen') {
            if (message.type === 'EVALUATE_FEN') {
                console.log('[Engine] Received FEN to evaluate:', message.fen);
                currentFen = message.fen;
                currentTarget = message.lastMoveTarget;
                currentColor = message.lastMoveColor;
                
                stockfish.postMessage('position fen ' + message.fen);
                stockfish.postMessage('go depth 14');

                // Set a timeout to catch stuck engine (e.g. invalid FEN)
                if (evalTimeoutId) clearTimeout(evalTimeoutId);
                evalTimeoutId = setTimeout(() => {
                    console.error(`[Engine] Timeout! Stockfish did not return 'bestmove' for FEN: ${currentFen}`);
                    console.warn('[Engine] Attempting to reset engine state...');
                    stockfish.postMessage('stop');
                    stockfish.postMessage('ucinewgame');
                    // Reset timeout id
                    evalTimeoutId = null;
                }, 2000);

            } else if (message.type === 'UPDATE_ENGINE_LEVEL') {
                console.log('[Engine] Updating Skill Level to:', message.level);
                stockfish.postMessage(`setoption name Skill Level value ${message.level}`);
            }
        }
    } catch (err) {
        console.error('[Engine] CRITICAL ERROR during message handling:', err);
    }
});

// Request initial engine level from background
chrome.runtime.sendMessage({ type: 'REQUEST_ENGINE_LEVEL' });
