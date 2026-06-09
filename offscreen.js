// offscreen.js

let stockfish = new Worker('lib/stockfish.js');

stockfish.postMessage('uci');
stockfish.postMessage('setoption name MultiPV value 1');

let currentFen = '';
let currentTarget = null;
let currentColor = null;

let previousScore = 0; // centipawns
let currentScore = 0; // centipawns

stockfish.onmessage = function(event) {
    const line = event.data;
    
    // Parse score
    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
    if (scoreMatch) {
        let val = parseInt(scoreMatch[2], 10);
        if (scoreMatch[1] === 'mate') {
            // Mate in X is worth a lot of centipawns
            val = val > 0 ? 30000 - val : -30000 - val;
        }
        currentScore = val;
    }

    if (line && line.startsWith('bestmove')) {
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
    if (message.target === 'offscreen' && message.type === 'EVALUATE_FEN') {
        currentFen = message.fen;
        currentTarget = message.lastMoveTarget;
        currentColor = message.lastMoveColor;
        
        stockfish.postMessage('position fen ' + message.fen);
        stockfish.postMessage('go depth 14');
    }
});
