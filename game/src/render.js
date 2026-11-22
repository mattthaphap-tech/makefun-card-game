// EMBER PACT — render: everything drawn on the 1280 x 800 canvas.
// Canvas 2D only, system fonts only, no images: every card, portrait and
// icon is drawn from shapes, so the game needs no asset files at all.

import { ELEMENTS, VIEW_W, VIEW_H, LAYOUT, kindLabel } from './config.js';

// ---------- small helpers ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

// ---------- element icons (shape + colour, never text alone) ----------

export function drawElementIcon(ctx, elementId, cx, cy, r, fill) {
  const el = ELEMENTS[elementId];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = fill || el.color;
  ctx.strokeStyle = el.dark;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.beginPath();
  if (el.shape === 'flame') {
    // A flame: a teardrop that curls at the tip.
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r * 0.9, r * 0.1, -r * 0.55, -r * 0.55, 0, -r);
    ctx.bezierCurveTo(r * 0.25, -r * 0.45, r * 0.3, -r * 0.1, r * 0.55, r * 0.25);
    ctx.bezierCurveTo(r * 0.75, r * 0.6, r * 0.45, r, 0, r);
  } else if (el.shape === 'drop') {
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.85, -r * 0.1, r * 0.8, r * 0.55, 0, r);
    ctx.bezierCurveTo(-r * 0.8, r * 0.55, -r * 0.85, -r * 0.1, 0, -r);
  } else if (el.shape === 'leaf') {
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.9, -r * 0.5, r * 0.9, r * 0.6, 0, r);
    ctx.bezierCurveTo(-r * 0.9, r * 0.6, -r * 0.9, -r * 0.5, 0, -r);
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(0, r * 0.8);
  } else {
    // Rock: a hexagon.
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ---------- cards ----------

function drawCardFace(ctx, card, x, y, w, h, compact) {
  const el = ELEMENTS[card.element];
  // Paper body.
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#f7ecd4';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = el.dark;
  ctx.stroke();
  // Element colour band across the top.
  ctx.save();
  roundRect(ctx, x + 2, y + 2, w - 4, 30, 8);
  ctx.clip();
  ctx.fillStyle = el.color;
  ctx.fillRect(x + 2, y + 2, w - 4, 30);
  ctx.restore();
  // Cost gem, top left.
  ctx.beginPath();
  ctx.arc(x + 17, y + 17, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#2b2118';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f7ecd4';
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 15px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 17, y + 18);
  // Element icon, top right.
  drawElementIcon(ctx, card.element, x + w - 20, y + 17, 11, '#f7ecd4');
  // Name, centred under the band, with room to breathe. In a crowded
  // played row the cards overlap, so the name shrinks to stay readable.
  ctx.fillStyle = '#2b2118';
  ctx.font = compact ? 'bold 11px Verdana, sans-serif' : 'bold 13px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.name, x + w / 2, y + 52);
  // Rules text, padded away from the card edges. Small (played) cards show
  // at most two lines so the text never runs into the power circle.
  ctx.font = (compact ? '10px' : '11px') + ' Verdana, sans-serif';
  ctx.fillStyle = '#4a3b2c';
  let lines = wrapText(ctx, card.text, w - 24);
  if (h < 170) lines = lines.slice(0, 2);
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + 76 + i * 14));
  // Power footer: big number in a circle, kind label beneath it — the label
  // sits clear of the circle, never overlapping it or the card edge.
  const small = h < 170;
  const footerY = y + h - (small ? 30 : 34);
  const pr = small ? 16 : 18;
  ctx.fillStyle = el.color;
  ctx.beginPath();
  ctx.arc(x + w / 2, footerY, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + (small ? 16 : 18) + 'px Verdana, sans-serif';
  ctx.fillText(String(card.power), x + w / 2, footerY + 1);
  if (!small) {
    ctx.fillStyle = el.dark;
    ctx.font = 'bold 10px Verdana, sans-serif';
    ctx.fillText(kindLabel(card.kind), x + w / 2, y + h - 8);
  }
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 10);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#3a2417');
  grad.addColorStop(1, '#1d1008');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c98a2e';
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 7);
  ctx.strokeStyle = 'rgba(201,138,46,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawElementIcon(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.22, '#e8491d');
}

// One card, possibly mid-flight from the hand to the played zone, possibly
// dimmed (unaffordable) or lifted (hovered). opts: faceDown, dim, hover,
// surge, fromX, fromY, born, now.
export function drawCard(ctx, card, x, y, w, h, opts) {
  const o = opts || {};
  let dx = x;
  let dy = y;
  if (o.born !== undefined && o.now !== undefined) {
    const t = Math.min(1, (o.now - o.born) / 320);
    const e = easeOut(t);
    if (o.fromX !== undefined) dx = o.fromX + (x - o.fromX) * e;
    if (o.fromY !== undefined) dy = o.fromY + (y - o.fromY) * e;
  }
  if (o.hover) dy -= 16;
  ctx.save();
  if (o.dim) ctx.globalAlpha = 0.45;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  if (o.faceDown) drawCardBack(ctx, dx, dy, w, h);
  else drawCardFace(ctx, card, dx, dy, w, h, o.compact);
  ctx.restore();
  if (o.surge) {
    // SURGE ribbon across the played card.
    ctx.save();
    ctx.translate(dx + w / 2, dy + 14);
    ctx.rotate(-0.06);
    roundRect(ctx, -46, -11, 92, 22, 11);
    ctx.fillStyle = '#ffb347';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7c1d08';
    ctx.stroke();
    ctx.fillStyle = '#7c1d08';
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SURGE +2', 0, 1);
    ctx.restore();
  }
}

// ---------- portraits, bars, pips, badges ----------

function drawPortrait(ctx, who, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (who === 'asha') {
    // Asha, Ember Initiate: warm skin, dark hair with a flame-red streak.
    ctx.fillStyle = '#f2c89b';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = '#2b1a12';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.28, r * 0.82, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e8491d';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.9);
    ctx.quadraticCurveTo(x - r * 0.1, y - r * 1.15, x + r * 0.15, y - r * 0.85);
    ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.6, x - r * 0.5, y - r * 0.9);
    ctx.fill();
    ctx.fillStyle = '#2b1a12';
    ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.05, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.32, y - r * 0.05, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7c3a1d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y + r * 0.28, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    // Vex, the Ember Warden: grey hood with a pointed peak, a face lost in
    // shadow, burning ember eyes above a dark mouth-mask. The face stays
    // dark so the glowing eyes — not a pale stripe — are what you read.
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // Hood peak rising over the face, rim-lit so it reads against the hood.
    ctx.fillStyle = '#23262e';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.5);
    ctx.lineTo(x, y - r * 1.05);
    ctx.lineTo(x + r * 0.55, y - r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8d7d6b';
    ctx.stroke();
    // Face in shadow.
    ctx.fillStyle = '#5a4632';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.18, r * 0.44, r * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hood rim around the face.
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#454b57';
    ctx.stroke();
    // Mouth-mask: a narrow dark band low on the face, clearly below the eyes.
    ctx.fillStyle = '#171008';
    ctx.fillRect(x - r * 0.34, y + r * 0.26, r * 0.68, r * 0.16);
    // Burning ember eyes, glowing above the mask.
    ctx.save();
    ctx.shadowColor = '#ff9d00';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(x - r * 0.24, y - r * 0.02, r * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.24, y - r * 0.02, r * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.arc(x - r * 0.24, y - r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.24, y - r * 0.02, r * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = who === 'asha' ? '#e8491d' : '#8d7d6b';
  ctx.stroke();
}

function drawLifeBar(ctx, x, y, w, h, life, maxLife) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#1d1008';
  ctx.fill();
  const frac = Math.max(0, life / maxLife);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, (h - 4) / 2);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#e8491d');
    grad.addColorStop(1, '#ffb347');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(life + ' / ' + maxLife, x + w / 2, y + h / 2 + 1);
}

function drawPips(ctx, x, y, energy, max) {
  for (let i = 0; i < max; i++) {
    ctx.beginPath();
    ctx.arc(x + i * 20 + 8, y + 8, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < energy ? '#ffb347' : 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#c98a2e';
    ctx.stroke();
  }
  ctx.fillStyle = '#f7ecd4';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Energy ' + energy + '/' + max, x + max * 20 + 14, y + 8);
}

function drawBadges(ctx, x, y, side) {
  let cx = x;
  ctx.textBaseline = 'middle';
  if (side.shield > 0) {
    ctx.fillStyle = '#1d7fd6';
    ctx.beginPath();
    ctx.moveTo(cx + 12, y);
    ctx.lineTo(cx + 24, y + 4);
    ctx.lineTo(cx + 24, y + 14);
    ctx.quadraticCurveTo(cx + 24, y + 24, cx + 12, y + 28);
    ctx.quadraticCurveTo(cx, y + 24, cx, y + 14);
    ctx.lineTo(cx, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Shield ' + side.shield, cx + 30, y + 14);
    cx += 110;
  }
  if (side.venom > 0) {
    drawElementIcon(ctx, 'thorn', cx + 10, y + 13, 10, '#3fae5a');
    ctx.fillStyle = '#a5e887';
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Venom ' + side.venom, cx + 26, y + 14);
  }
}

// ---------- layout for input hit-testing ----------

export function handRects(state) {
  const rects = [];
  const n = state.player.hand.length;
  if (n === 0) return rects;
  const gap0 = LAYOUT.hand.gap;
  const w = LAYOUT.hand.cardW;
  // The hand is centred on the table while it fits; once it would run under
  // the END TURN button (x >= 1096) it fans tighter and centres on the space
  // left of the button instead, so no card's power circle or kind label is
  // ever covered. The 10-card hand still shows every card.
  const uncappedTotal = n * gap0 - (gap0 - w);
  let gap = gap0;
  let cx = VIEW_W / 2;
  if (VIEW_W / 2 + uncappedTotal / 2 > 1088) {
    cx = (24 + 1088) / 2;
    gap = Math.min(gap0, (1088 - 24 - w) / Math.max(1, n - 1));
  }
  const total = n * gap - (gap - w);
  let x = cx - total / 2;
  for (let i = 0; i < n; i++) {
    rects.push({ x, y: LAYOUT.hand.y, w, h: LAYOUT.hand.cardH, index: i });
    x += gap;
  }
  return rects;
}

export function layoutFor(state) {
  const lay = { hand: [], endTurn: null, start: null, restart: null };
  if (state.screen === 'game') {
    lay.hand = handRects(state);
    lay.endTurn = { ...LAYOUT.endTurn };
  } else if (state.screen === 'title') {
    lay.start = { x: 490, y: 560, w: 300, h: 64 };
  } else if (state.screen === 'over') {
    lay.restart = { x: 490, y: 580, w: 300, h: 64 };
  }
  return lay;
}

// ---------- the table ----------

function drawBackground(ctx, now) {
  const grad = ctx.createRadialGradient(640, 380, 80, 640, 400, 760);
  grad.addColorStop(0, '#3a1f0e');
  grad.addColorStop(0.55, '#241208');
  grad.addColorStop(1, '#120a05');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // The table: a warm felt oval.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(640, 420, 620, 330, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(94, 46, 18, 0.55)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(201,138,46,0.5)';
  ctx.stroke();
  ctx.restore();
  // Drifting embers.
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const px = (i * 137.5 + 60) % VIEW_W;
    const py = (VIEW_H - ((now * 0.02 + i * 53) % (VIEW_H + 40))) % (VIEW_H + 40) - 20;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now * 0.001 + i);
    ctx.fillStyle = i % 3 === 0 ? '#ffb347' : '#e8491d';
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = 'rgba(10, 5, 2, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, LAYOUT.topBar.h);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('EMBER PACT', 24, 28);
  ctx.fillStyle = '#c9b18a';
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText('a duel of four elements', 190, 29);
  // Turn + round, centred.
  let turnText = '';
  if (state.screen === 'game') {
    turnText = state.turn === 'player' ? 'YOUR TURN' : 'VEX IS THINKING...';
    turnText = 'ROUND ' + state.round + '  —  ' + turnText;
  } else if (state.screen === 'title') {
    turnText = 'A DUEL OF FOUR ELEMENTS';
  } else {
    turnText = state.result === 'win' ? 'VICTORY' : 'DEFEAT';
  }
  ctx.fillStyle = state.turn === 'vex' && state.screen === 'game' ? '#e8491d' : '#f7ecd4';
  ctx.font = 'bold 16px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(turnText, VIEW_W / 2, 28);
  ctx.fillStyle = '#8d7d6b';
  ctx.font = '12px Verdana, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(state.muted ? 'M: sound off' : 'M: mute', VIEW_W - 24, 28);
}

function drawDuelist(ctx, state, who, area) {
  // who is the portrait identity ('asha' / 'vex'); the state key is
  // 'player' / 'vex'.
  const side = state[who === 'asha' ? 'player' : 'vex'];
  const portrait = area.portrait;
  drawPortrait(ctx, who, portrait.x, portrait.y, portrait.r);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f7ecd4';
  ctx.font = 'bold 17px Verdana, sans-serif';
  const title = who === 'asha' ? 'ASHA — Ember Initiate' : 'VEX — Ember Warden';
  ctx.fillText(title, area.name.x, area.name.y);
  drawLifeBar(ctx, area.lifeBar.x, area.lifeBar.y, area.lifeBar.w, area.lifeBar.h, side.life, 30);
  drawPips(ctx, area.pips.x, area.pips.y, side.energy, side.energyMax);
  // Shield / venom badges sit under the name, clear of the card backs.
  drawBadges(ctx, area.badges.x, area.badges.y, side);
  // Deck pile with its count, placed where the hand cannot cover it.
  const deckX = area.deck.x;
  const deckY = area.deck.y;
  drawCardBack(ctx, deckX, deckY, 44, 62);
  ctx.fillStyle = '#f7ecd4';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Deck ' + side.deck.length, deckX + 22, deckY + 78);
}

function drawVexHand(ctx, state) {
  const n = state.vex.hand.length;
  if (n === 0) return;
  const gap = LAYOUT.vexHand.gap;
  const w = LAYOUT.vexHand.cardW;
  const h = LAYOUT.vexHand.cardH;
  const total = n * gap - (gap - w);
  let x = LAYOUT.vexHand.x - total / 2 + 160;
  for (let i = 0; i < n; i++) {
    drawCardBack(ctx, x, LAYOUT.vexHand.y, w, h);
    x += gap;
  }
  ctx.fillStyle = '#c9b18a';
  ctx.font = '12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Vex's hand — " + n + ' cards', LAYOUT.vexHand.x + 160, LAYOUT.vexHand.y + h + 16);
}

function drawPlayedZone(ctx, state, now) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c9b18a';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.fillText('VEX PLAYED', LAYOUT.playedVex.x + 130, LAYOUT.middle.y + 4);
  ctx.fillText('YOU PLAYED', LAYOUT.playedYou.x + 130, LAYOUT.middle.y + 4);
  const w = 110;
  const h = 150;
  const y = LAYOUT.middle.y + 18;
  // Each side's played cards stay inside its own zone: Vex 300-744, you
  // 760-1264. A busy late turn can play 5-6 cards; the row fans tighter
  // instead of running into the other side or off the canvas.
  const stepFor = (n, zoneW) => (n <= 1 ? 96 : Math.min(96, (zoneW - w) / (n - 1)));
  const vexStep = stepFor(state.played.vex.length, 444);
  const youStep = stepFor(state.played.player.length, 504);
  state.played.vex.forEach((entry, i) => {
    drawCard(ctx, entry.card, LAYOUT.playedVex.x + i * vexStep, y, w, h, {
      surge: entry.surge, compact: state.played.vex.length >= 5, fromX: entry.fromX, fromY: entry.fromY, born: entry.born, now,
    });
  });
  state.played.player.forEach((entry, i) => {
    drawCard(ctx, entry.card, LAYOUT.playedYou.x + i * youStep, y, w, h, {
      surge: entry.surge, compact: state.played.player.length >= 5, fromX: entry.fromX, fromY: entry.fromY, born: entry.born, now,
    });
  });
  if (state.played.vex.length === 0 && state.played.player.length === 0) {
    ctx.fillStyle = 'rgba(247,236,212,0.35)';
    ctx.font = '13px Verdana, sans-serif';
    ctx.fillText('No cards played yet this turn — play two of one element for a Surge.', VIEW_W / 2, y + 70);
  }
  // Last-action log line.
  ctx.fillStyle = '#f7ecd4';
  ctx.font = '14px Verdana, sans-serif';
  ctx.fillText(state.log[state.log.length - 1] || '', LAYOUT.log.x, LAYOUT.log.y);
}

function drawPlayerHand(ctx, state, now) {
  const rects = handRects(state);
  rects.forEach((rect, i) => {
    const card = state.player.hand[i];
    const affordable = card.cost <= state.player.energy && state.turn === 'player';
    drawCard(ctx, card, rect.x, rect.y, rect.w, rect.h, {
      dim: !affordable,
      hover: state.hover === i && state.turn === 'player',
    });
  });
  // Key hints under the hand.
  ctx.fillStyle = '#8d7d6b';
  ctx.font = '12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Click a card or press 1-7 to play it  •  Space: end turn  •  M: mute', VIEW_W / 2, 786);
}

function drawEndTurn(ctx, state) {
  const b = LAYOUT.endTurn;
  const enabled = state.screen === 'game' && state.turn === 'player';
  roundRect(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = enabled ? '#e8491d' : '#4a4238';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = state.endTurnHover && enabled ? '#ffb347' : '#7c1d08';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('END TURN', b.x + b.w / 2, b.y + b.h / 2 + 1);
}

function drawFloats(ctx, state, now) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of state.floats) {
    const age = now - f.born;
    const t = age / 1400;
    if (t >= 1) continue;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 22px Verdana, sans-serif';
    ctx.fillText(f.text, f.x, f.y - t * 46);
  }
  ctx.restore();
}

// ---------- screens ----------

function drawTitle(ctx, state, now) {
  drawBackground(ctx, now);
  // Element legend strip.
  const legendY = 470;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f7ecd4';
  ctx.font = 'bold 15px Verdana, sans-serif';
  ctx.fillText('FOUR ELEMENTS — ONE PACT', VIEW_W / 2, legendY - 34);
  const names = ['flame', 'tide', 'thorn', 'stone'];
  const descs = ['Damage', 'Heal & shield', 'Venom that bites again', 'Shield, draw & heavy hits'];
  names.forEach((id, i) => {
    const x = 300 + i * 227;
    drawElementIcon(ctx, id, x, legendY, 20);
    ctx.fillStyle = ELEMENTS[id].color;
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.fillText(ELEMENTS[id].name, x, legendY + 34);
    ctx.fillStyle = '#c9b18a';
    ctx.font = '12px Verdana, sans-serif';
    ctx.fillText(descs[i], x, legendY + 54);
  });
  // Title.
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('EMBER PACT', VIEW_W / 2, 210);
  ctx.fillStyle = '#f7ecd4';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('You are Asha, Ember Initiate. Duel Vex, the Ember Warden — first to 0 life loses.', VIEW_W / 2, 290);
  ctx.font = '16px Verdana, sans-serif';
  ctx.fillStyle = '#c9b18a';
  ctx.fillText('Play two cards of one element in a turn and the second gains +2 power: the Surge.', VIEW_W / 2, 330);
  ctx.fillText('Energy refills each round and grows to 10. Venom bites again at the start of the turn.', VIEW_W / 2, 356);
  // Start button.
  const b = layoutFor(state).start;
  const pulse = 0.75 + 0.25 * Math.sin(now * 0.004);
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = '#e8491d';
  ctx.globalAlpha = pulse;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffb347';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.fillText('BEGIN THE DUEL', VIEW_W / 2, b.y + b.h / 2 + 1);
  ctx.fillStyle = '#8d7d6b';
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText('Click the button or press Enter  •  1-7 play cards  •  Space ends your turn', VIEW_W / 2, 660);
}

function drawEnd(ctx, state, now) {
  // Dim the table behind the panel.
  ctx.fillStyle = 'rgba(10,5,2,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  roundRect(ctx, 340, 150, 600, 470, 18);
  ctx.fillStyle = '#241208';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = state.result === 'win' ? '#ffb347' : '#e8491d';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state.result === 'win' ? '#ffb347' : '#e8491d';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(state.result === 'win' ? 'VICTORY' : 'DEFEAT', VIEW_W / 2, 240);
  ctx.fillStyle = '#f7ecd4';
  ctx.font = '18px Georgia, serif';
  ctx.fillText(
    state.result === 'win'
      ? 'The Ember Warden bows. The pact is yours, Asha.'
      : 'Vex keeps the ember. The pact slips away — duel again.',
    VIEW_W / 2, 310,
  );
  ctx.font = '15px Verdana, sans-serif';
  ctx.fillStyle = '#c9b18a';
  const s = state.stats;
  ctx.fillText('Rounds played: ' + state.round, VIEW_W / 2, 380);
  ctx.fillText('Cards you played: ' + s.cardsPlayed.player + '  •  Cards Vex played: ' + s.cardsPlayed.vex, VIEW_W / 2, 410);
  ctx.fillText('Surges you triggered: ' + s.surges, VIEW_W / 2, 440);
  ctx.fillText('Final life — you ' + Math.max(0, state.player.life) + ', Vex ' + Math.max(0, state.vex.life), VIEW_W / 2, 470);
  const b = layoutFor(state).restart;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = '#e8491d';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffb347';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Verdana, sans-serif';
  ctx.fillText('DUEL AGAIN', VIEW_W / 2, b.y + b.h / 2 + 1);
  ctx.fillStyle = '#8d7d6b';
  ctx.font = '13px Verdana, sans-serif';
  ctx.fillText('or press R', VIEW_W / 2, 668);
}

// ---------- main draw ----------

export function drawGame(ctx, state, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.screen === 'title') {
    drawTitle(ctx, state, now);
    drawTopBar(ctx, state);
    return;
  }
  drawBackground(ctx, now);
  drawTopBar(ctx, state);
  drawDuelist(ctx, state, 'vex', LAYOUT.vex);
  drawVexHand(ctx, state);
  drawPlayedZone(ctx, state, now);
  drawDuelist(ctx, state, 'asha', LAYOUT.you);
  drawPlayerHand(ctx, state, now);
  drawEndTurn(ctx, state);
  drawFloats(ctx, state, now);
  // Surge flash: a brief warm wash over the table.
  if (state.surgeFlash && now - state.surgeFlash < 350) {
    ctx.fillStyle = 'rgba(255,179,71,' + (0.22 * (1 - (now - state.surgeFlash) / 350)) + ')';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (state.screen === 'over') drawEnd(ctx, state, now);
}
