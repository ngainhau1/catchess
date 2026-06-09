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

// Cached settings — updated via storage listener, defaults to all ON
let settings = { showArrow: true, showIcons: true, showEval: true };

// Load initial settings
if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({ showArrow: true, showIcons: true, showEval: true }, (items) => {
        settings = items;
        console.log('[UI] Settings loaded:', settings);
    });
}

// Listen for setting changes in real-time
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            if (changes.showArrow !== undefined) settings.showArrow = changes.showArrow.newValue;
            if (changes.showIcons !== undefined) settings.showIcons = changes.showIcons.newValue;
            if (changes.showEval !== undefined) settings.showEval = changes.showEval.newValue;
            console.log('[UI] Settings updated:', settings);

            // Immediately clear hidden elements
            if (!settings.showArrow) clearArrows();
            if (!settings.showIcons) clearIcons();
            if (!settings.showEval) clearEval();
        }
    });
}

function clearArrows() {
    const overlay = document.getElementById('catchess-overlay');
    if (overlay) overlay.querySelectorAll('line').forEach(el => el.remove());
}
function clearIcons() {
    const overlay = document.getElementById('catchess-overlay');
    if (overlay) overlay.querySelectorAll('.review-icon').forEach(el => el.remove());
}
function clearEval() {
    const evalBox = document.getElementById('catchess-eval');
    if (evalBox) evalBox.remove();
}

// ─── SVG Overlay ──────────────────────────────────────────────
function getOverlay() {
    const boardElement = document.querySelector('wc-chess-board') || document.querySelector('.board');
    if (!boardElement) {
        console.warn('[UI] Board element not found!');
        return null;
    }

    let overlay = document.getElementById('catchess-overlay');
    if (!overlay) {
        console.log('[UI] Creating SVG overlay on board element:', boardElement.tagName);
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.id = 'catchess-overlay';
        overlay.setAttribute('viewBox', '0 0 100 100');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'shadow');
        filter.innerHTML = '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>';
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
        console.log('[UI] SVG overlay created and appended. Overlay parent:', overlay.parentElement?.tagName);
    }
    return { overlay, boardElement };
}

function getCoords(squareStr, isFlipped) {
    if (!squareStr || squareStr.length !== 2) return null;
    const file = squareStr.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(squareStr[1]) - 1;

    let x = (file * 12.5) + 6.25;
    let y = ((7 - rank) * 12.5) + 6.25;

    if (isFlipped) {
        x = 100 - x;
        y = 100 - y;
    }
    return { x, y };
}

// ─── Drawing functions (NO storage calls — use cached settings) ──
function drawArrow(move) {
    if (!settings.showArrow) {
        console.log('[UI] Arrow disabled by settings, skipping.');
        return;
    }
    if (!move || move.length < 4) {
        console.warn('[UI] Invalid move for arrow:', move);
        return;
    }

    const ctx = getOverlay();
    if (!ctx) {
        console.error('[UI] Cannot draw arrow — overlay creation failed!');
        return;
    }

    const isFlipped = ctx.boardElement.classList.contains('flipped');
    const from = getCoords(move.substring(0, 2), isFlipped);
    const to = getCoords(move.substring(2, 4), isFlipped);

    // Clear existing arrows
    ctx.overlay.querySelectorAll('line').forEach(line => line.remove());

    if (!from || !to) {
        console.warn('[UI] Invalid coordinates for arrow:', move, from, to);
        return;
    }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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
    console.log(`[UI] Arrow drawn: ${move} (from ${from.x},${from.y} to ${to.x},${to.y})`);
}

function drawReviewIcon(targetSquare, classification) {
    if (!settings.showIcons) return;
    if (!ICONS[classification]) return;

    const ctx = getOverlay();
    if (!ctx) return;

    const isFlipped = ctx.boardElement.classList.contains('flipped');
    const coords = getCoords(targetSquare, isFlipped);
    if (!coords) return;

    // Remove existing review icons
    ctx.overlay.querySelectorAll('.review-icon').forEach(icon => icon.remove());

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'review-icon');

    const posX = coords.x + 3.125;
    const posY = coords.y - 3.125;

    g.setAttribute('transform', `translate(${posX} ${posY}) scale(0.04)`);
    g.setAttribute('filter', 'url(#shadow)');
    g.innerHTML = ICONS[classification];

    ctx.overlay.appendChild(g);
    console.log(`[UI] Review icon drawn: ${classification} at ${targetSquare}`);
}

function updateEvalBar(scoreObj) {
    if (!settings.showEval) {
        clearEval();
        return;
    }

    const boardElement = document.querySelector('wc-chess-board') || document.querySelector('.board');
    if (!boardElement) return;

    let evalBox = document.getElementById('catchess-eval');
    if (!evalBox) {
        evalBox = document.createElement('div');
        evalBox.id = 'catchess-eval';
        evalBox.style.cssText = 'position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:white; padding:5px 10px; border-radius:4px; font-family:sans-serif; font-size:14px; z-index:10000; font-weight:bold; border: 1px solid #444;';
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
    if (message.target === 'content') {
        if (message.type === 'BEST_MOVE') {
            if (message.isUserTurn) {
                console.log('[UI] Best move (YOUR turn):', message.move);
                drawArrow(message.move);
            } else {
                console.log('[UI] Opponent turn — clearing arrow. (Engine found:', message.move, ')');
                clearArrows();
            }
        }
        if (message.type === 'REVIEW_MOVE') {
            console.log('[UI] Your move rated:', message.classification, 'at', message.square);
            drawReviewIcon(message.square, message.classification);
        }
        if (message.type === 'EVAL_UPDATE') {
            updateEvalBar(message.data);
        }
    }
});
