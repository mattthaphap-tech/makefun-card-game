// EMBER PACT — input: mouse and keyboard, played with both.
// Hit-testing lives here; main.js supplies the live rectangles through
// `layout()`, which returns the current hand cards, the End Turn button and
// the big buttons on the title / end screens. Keys 1-7 play a hand card,
// Space ends the turn, Enter starts, R restarts from an end screen, M mutes.

function inside(x, y, rect) {
  return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function attachInput(canvas, api) {
  // Mouse position in canvas pixels (the canvas is 1280 x 800 internally).
  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event);
    const lay = api.layout();
    let hover = -1;
    for (const card of lay.hand || []) {
      if (inside(p.x, p.y, card)) hover = card.index;
    }
    api.onHover(hover, inside(p.x, p.y, lay.endTurn));
  });

  canvas.addEventListener('click', (event) => {
    const p = toCanvas(event);
    const lay = api.layout();
    api.onGesture();
    if (lay.start && inside(p.x, p.y, lay.start)) { api.onStart(); return; }
    if (lay.restart && inside(p.x, p.y, lay.restart)) { api.onRestart(); return; }
    if (lay.endTurn && inside(p.x, p.y, lay.endTurn)) { api.onEndTurn(); return; }
    for (const card of lay.hand || []) {
      if (inside(p.x, p.y, card)) { api.onPlayCard(card.index); return; }
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    api.onGesture();
    const key = event.key;
    if (key >= '1' && key <= '7') { api.onPlayCard(Number(key) - 1); return; }
    if (key === ' ' || key === 'Spacebar') { event.preventDefault(); api.onEndTurn(); return; }
    if (key === 'Enter') { api.onStart(); return; }
    if (key === 'r' || key === 'R') { api.onRestart(); return; }
    if (key === 'm' || key === 'M') { api.onMute(); return; }
  });
}
