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

function getOverlay() {
    const boardElement = document.querySelector('wc-chess-board') || document.querySelector('.board');
    if (!boardElement) return null;

    let overlay = document.getElementById('catchess-overlay');
    if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.id = 'catchess-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999';

        // Add drop shadow filter for arrows
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'shadow');
        filter.innerHTML = '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>';
        defs.appendChild(filter);

        // Arrow marker
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

    if (isFlipped) {
        x = 100 - x;
        y = 100 - y;
    }
    return { x, y };
}

function drawArrow(move) {
    if (!move || move.length < 4) return;
    const ctx = getOverlay();
    if (!ctx) return;

    const isFlipped = ctx.boardElement.classList.contains('flipped');
    const from = getCoords(move.substring(0, 2), isFlipped);
    const to = getCoords(move.substring(2, 4), isFlipped);

    // Clear existing arrows
    const existingLines = ctx.overlay.querySelectorAll('line');
    existingLines.forEach(line => line.remove());

    if (!from || !to) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${from.x}%`);
    line.setAttribute('y1', `${from.y}%`);
    line.setAttribute('x2', `${to.x}%`);
    line.setAttribute('y2', `${to.y}%`);
    line.setAttribute('stroke', 'rgba(152, 251, 152, 0.9)'); // Màu xanh nhạt tươi
    line.setAttribute('stroke-width', '1.2%'); // Mỏng hơn
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    line.setAttribute('filter', 'url(#shadow)');

    ctx.overlay.appendChild(line);
}

function drawReviewIcon(targetSquare, classification) {
    const ctx = getOverlay();
    if (!ctx || !ICONS[classification]) return;

    const isFlipped = ctx.boardElement.classList.contains('flipped');
    const coords = getCoords(targetSquare, isFlipped);
    if (!coords) return;

    // Remove existing review icons
    const existingIcons = ctx.overlay.querySelectorAll('.review-icon');
    existingIcons.forEach(icon => icon.remove());

    // Create SVG group for the icon
    // Place at the top right of the target square
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'review-icon');
    
    // Position: shift up and right from center. Square is 12.5% wide.
    // X shift: + 3.125%, Y shift: - 3.125%
    const posX = coords.x + 3.125;
    const posY = coords.y - 3.125;
    
    g.setAttribute('transform', `translate(${posX} ${posY}) scale(0.04)`);
    // Scale 0.04 means 100px box becomes 4% of board width
    
    // Add shadow
    g.setAttribute('filter', 'url(#shadow)');

    // Render inner SVG
    g.innerHTML = ICONS[classification];
    
    ctx.overlay.appendChild(g);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.target === 'content') {
        if (message.type === 'BEST_MOVE') {
            console.log('[CatChess] Best move:', message.move);
            drawArrow(message.move);
        }
        if (message.type === 'REVIEW_MOVE') {
            console.log('[CatChess] Move review:', message.classification, 'at', message.square);
            drawReviewIcon(message.square, message.classification);
        }
    }
});
