// ui.js

const ICONS = {
    brilliant: '<circle cx="50" cy="50" r="50" fill="#26c2a3"/><text x="50" y="75" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">!!</text>',
    great: '<circle cx="50" cy="50" r="50" fill="#5b8bb0"/><text x="50" y="75" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">!</text>',
    best: '<circle cx="50" cy="50" r="50" fill="#96bc4b"/><path d="M50 15 L61 38 L86 42 L68 59 L72 84 L50 72 L28 84 L32 59 L14 42 L39 38 Z" fill="white"/>',
    excellent: '<circle cx="50" cy="50" r="50" fill="#96bc4b"/><path d="M30 50 L45 65 L70 30" stroke="white" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    good: '<circle cx="50" cy="50" r="50" fill="#96b585"/><path d="M30 50 L45 65 L70 30" stroke="white" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    inaccuracy: '<circle cx="50" cy="50" r="50" fill="#f0c15c"/><text x="50" y="75" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">?!</text>',
    mistake: '<circle cx="50" cy="50" r="50" fill="#e58f2a"/><text x="50" y="75" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">?</text>',
    blunder: '<circle cx="50" cy="50" r="50" fill="#ca3431"/><text x="50" y="75" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">??</text>'
};

// Cached settings
let settings = { showArrow: true, showIcons: true, showEval: true };

if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ showArrow: true, showIcons: true, showEval: true }, (items) => {
        settings = items;
    });
}

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            if (changes.showArrow !== undefined) settings.showArrow = changes.showArrow.newValue;
            if (changes.showIcons !== undefined) settings.showIcons = changes.showIcons.newValue;
            if (changes.showEval !== undefined) settings.showEval = changes.showEval.newValue;
            if (!settings.showArrow) clearArrows();
            if (!settings.showIcons) clearIcons();
            if (!settings.showEval) clearEval();
        }
    });
}

function clearArrows() {
    const overlay = document.getElementById('catchess-overlay');
    if (overlay) overlay.querySelectorAll('.catchess-arrow').forEach(el => el.remove());
}
function clearIcons() {
    const overlay = document.getElementById('catchess-overlay');
    if (overlay) overlay.querySelectorAll('.review-icon').forEach(el => el.remove());
}
function clearEval() {
    const el = document.getElementById('catchess-eval');
    if (el) el.remove();
}

// ─── SVG Overlay ──────────────────────────────────────────────
function getOverlay() {
    const boardElement = document.querySelector('wc-chess-board') || document.querySelector('.board');
    if (!boardElement) return null;

    let overlay = document.getElementById('catchess-overlay');
    if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.id = 'catchess-overlay';
        overlay.setAttribute('viewBox', '0 0 100 100');
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'shadow');
        filter.innerHTML = '<feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.4"/>';
        defs.appendChild(filter);

        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '4');
        marker.setAttribute('refX', '5');
        marker.setAttribute('refY', '2');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 6 2, 0 4');
        polygon.setAttribute('fill', 'rgba(152, 251, 152, 0.9)');
        marker.appendChild(polygon);
        defs.appendChild(marker);

        overlay.appendChild(defs);
        boardElement.appendChild(overlay);
    }
    return { overlay, boardElement };
}

function getCoords(squareStr, isFlipped) {
    if (!squareStr || squareStr.length !== 2) return null;
    const file = squareStr.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(squareStr[1]) - 1;
    let x = (file * 12.5) + 6.25;
    let y = ((7 - rank) * 12.5) + 6.25;
    if (isFlipped) { x = 100 - x; y = 100 - y; }
    return { x, y };
}

// ─── Drawing ──────────────────────────────────────────────────
function drawArrow(move) {
    if (!settings.showArrow || !move || move.length < 4) return;

    const ctx = getOverlay();
    if (!ctx) return;

    const isFlipped = ctx.boardElement.classList.contains('flipped');
    const from = getCoords(move.substring(0, 2), isFlipped);
    const to = getCoords(move.substring(2, 4), isFlipped);

    clearArrows();
    if (!from || !to) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'catchess-arrow');
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);
    line.setAttribute('stroke', 'rgba(152, 251, 152, 0.9)');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    line.setAttribute('filter', 'url(#shadow)');
    ctx.overlay.appendChild(line);

    console.log(`[UI] Arrow: ${move}`);
}

function drawReviewIcon(targetSquare, classification) {
    if (!settings.showIcons || !ICONS[classification]) return;

    const ctx = getOverlay();
    if (!ctx) return;

    const isFlipped = ctx.boardElement.classList.contains('flipped');
    const coords = getCoords(targetSquare, isFlipped);
    if (!coords) return;

    clearIcons();

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'review-icon');
    g.setAttribute('transform', `translate(${coords.x + 3.125} ${coords.y - 3.125}) scale(0.04)`);
    g.setAttribute('filter', 'url(#shadow)');
    g.innerHTML = ICONS[classification];
    ctx.overlay.appendChild(g);

    console.log(`[UI] Icon: ${classification} @ ${targetSquare}`);
}

function updateEvalBar(scoreObj) {
    if (!settings.showEval) { clearEval(); return; }

    const boardElement = document.querySelector('wc-chess-board') || document.querySelector('.board');
    if (!boardElement) return;

    let evalBox = document.getElementById('catchess-eval');
    if (!evalBox) {
        evalBox = document.createElement('div');
        evalBox.id = 'catchess-eval';
        evalBox.style.cssText = 'position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.75);color:#fff;padding:4px 10px;border-radius:4px;font:bold 13px/1.4 sans-serif;z-index:10000;border:1px solid #555;';
        boardElement.appendChild(evalBox);
    }

    let text = 'Eval: ';
    if (scoreObj.type === 'mate') {
        text += 'M' + Math.abs(scoreObj.value);
    } else {
        text += (scoreObj.value > 0 ? '+' : '') + (scoreObj.value / 100).toFixed(2);
    }
    text += ` (d${scoreObj.depth})`;
    evalBox.textContent = text;
}

// ─── Message listener ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'content') return;

    switch (message.type) {
        case 'BEST_MOVE':
            console.log(`[UI] #${message.evalId} Best move: ${message.move}`);
            drawArrow(message.move);
            break;

        case 'REVIEW_MOVE':
            console.log(`[UI] #${message.evalId} ${message.classification} @ ${message.square}`);
            drawReviewIcon(message.square, message.classification);
            break;

        case 'EVAL_UPDATE':
            updateEvalBar(message.data);
            break;

        case 'OPPONENT_MOVED':
            clearArrows();
            clearIcons();
            break;
    }
});
