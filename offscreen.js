// offscreen.js

let stockfish = new Worker('lib/stockfish.js');

stockfish.postMessage('uci');
stockfish.postMessage('setoption name MultiPV value 1');

let currentFen = '';

stockfish.onmessage = function(event) {
    const line = event.data;
    console.log('[Offscreen Stockfish] received:', line);
    if (line && line.startsWith('bestmove')) {
        const match = line.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (match && match[1]) {
            chrome.runtime.sendMessage({
                target: 'content',
                type: 'BEST_MOVE',
                fen: currentFen,
                move: match[1]
            });
        }
    }
};

chrome.runtime.onMessage.addListener((message) => {
    if (message.target === 'offscreen' && message.type === 'EVALUATE_FEN') {
        console.log('[Offscreen] Evaluating FEN:', message.fen);
        currentFen = message.fen;
        stockfish.postMessage('position fen ' + message.fen);
        stockfish.postMessage('go depth 14');
    }
});
