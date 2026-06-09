// ui.js

function drawArrow(move) {
    // move is e.g., 'e2e4'
    if (!move || move.length < 4) return;

    const boardElement = document.querySelector('wc-chess-board') || document.querySelector('.board');
    if (!boardElement) return;

    // Check if board is flipped
    const isFlipped = boardElement.classList.contains('flipped');

    // Parse files and ranks (0-7)
    // a=0, b=1, c=2, d=3, e=4, f=5, g=6, h=7
    const fromFile = move.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRank = parseInt(move[1]) - 1;
    const toFile = move.charCodeAt(2) - 'a'.charCodeAt(0);
    const toRank = parseInt(move[3]) - 1;

    // Calculate percentage coordinates (each square is 12.5%)
    // Center of square is (file * 12.5) + 6.25
    let fromX = (fromFile * 12.5) + 6.25;
    let fromY = ((7 - fromRank) * 12.5) + 6.25;
    let toX = (toFile * 12.5) + 6.25;
    let toY = ((7 - toRank) * 12.5) + 6.25;

    if (isFlipped) {
        fromX = 100 - fromX;
        fromY = 100 - fromY;
        toX = 100 - toX;
        toY = 100 - toY;
    }

    // Remove old overlay if exists
    let overlay = document.getElementById('catchess-overlay');
    if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.id = 'catchess-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none'; // click through
        overlay.style.zIndex = '9999';

        // Add arrow marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', 'rgba(152, 251, 152, 0.7)'); // Màu xanh nhạt nhẹ

        marker.appendChild(polygon);
        defs.appendChild(marker);
        overlay.appendChild(defs);

        boardElement.appendChild(overlay);
    }

    // Clear existing arrows
    const existingLines = overlay.querySelectorAll('line');
    existingLines.forEach(line => line.remove());

    // Draw new arrow
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${fromX}%`);
    line.setAttribute('y1', `${fromY}%`);
    line.setAttribute('x2', `${toX}%`);
    line.setAttribute('y2', `${toY}%`);
    line.setAttribute('stroke', 'rgba(152, 251, 152, 0.7)'); // Màu xanh nhạt nhẹ
    line.setAttribute('stroke-width', '2.5%'); // Thickness relative to board
    line.setAttribute('marker-end', 'url(#arrowhead)');
    line.style.opacity = '0.8';

    overlay.appendChild(line);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.target === 'content' && message.type === 'BEST_MOVE') {
        console.log('[CatChess] Best move:', message.move);
        drawArrow(message.move);
    }
});
