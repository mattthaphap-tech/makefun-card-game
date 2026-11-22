// EMBER PACT — main: game state, the turn engine, the Surge, and the loop.
// The turn engine is the heart of the game, and the one place a previous
// build failed: its turn-start routine only ever ran for the player, so the
// opponent never got energy, never drew, never played. Here there is exactly
// ONE routine, beginTurn(side), and both the player and Vex go through it:
// energy refill, venom tick, draw, and (for Vex) the AI. No side has its own
// private path into a turn.

import { START_LIFE, MAX_ENERGY, MAX_HAND, OPENING_HAND, VEX_OPENING_BONUS, SURGE_BONUS, mulberry32 } from './config.js';
import { buildDeck, drawFrom, cardById as lookupCard } from './deck.js';
import { chooseAiCard } from './ai.js';
import { SoundBank } from './audio.js';
import { attachInput } from './input.js';
import { drawGame, layoutFor, handRects } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sounds = new SoundBank();
const params = new URLSearchParams(location.search);

// ---------- state ----------

function freshSide() {
  return { life: START_LIFE, maxLife: START_LIFE, shield: 0, venom: 0, energy: 0, energyMax: 1, hand: [], deck: [], discard: [] };
}

const state = {
  screen: 'title', // 'title' | 'game' | 'over'
  result: null, // 'win' | 'lost'
  round: 0,
  turn: 'player', // whose turn it is right now
  phase: 'idle', // 'player' | 'ai' | 'over'
  player: freshSide(),
  vex: freshSide(),
  played: { player: [], vex: [] }, // cards played this turn, with flight data
  elementsPlayed: { player: [], vex: [] }, // elements played this turn (Surge)
  log: [],
  floats: [],
  stats: { cardsPlayed: { player: 0, vex: 0 }, surges: 0 },
  hover: -1,
  endTurnHover: false,
  muted: false,
  surgeFlash: 0,
  seed: Number(params.get('seed') || 1) || 1,
  aiToken: 0, // incremented on restart so a stale AI loop aborts
};

function other(side) {
  return side === 'player' ? 'vex' : 'player';
}

function nameOf(side) {
  return side === 'player' ? 'Asha' : 'Vex';
}

function addFloat(x, y, text, color) {
  state.floats.push({ x, y, text, color, born: performance.now() });
  if (state.floats.length > 24) state.floats.shift();
}

function say(text) {
  state.log.push(text);
  if (state.log.length > 6) state.log.shift();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- the turn engine (one routine, both sides) ----------

function newGame() {
  state.aiToken++;
  state.screen = 'game';
  state.result = null;
  state.round = 0;
  state.player = freshSide();
  state.vex = freshSide();
  state.played = { player: [], vex: [] };
  state.elementsPlayed = { player: [], vex: [] };
  state.log = [];
  state.floats = [];
  state.stats = { cardsPlayed: { player: 0, vex: 0 }, surges: 0 };
  state.hover = -1;
  const rng = mulberry32(state.seed);
  state.player.deck = buildDeck(rng);
  state.vex.deck = buildDeck(rng);
  for (let i = 0; i < OPENING_HAND; i++) {
    state.player.hand.push(drawFrom(state.player.deck));
    state.vex.hand.push(drawFrom(state.vex.deck));
  }
  // Vex moves second: one extra card in his opening hand (see config).
  for (let i = 0; i < VEX_OPENING_BONUS; i++) {
    state.vex.hand.push(drawFrom(state.vex.deck));
  }
  say('The duel begins — Asha versus Vex, the Ember Warden.');
  beginTurn('player');
}

// THE turn-start routine. Both sides enter a turn through this function and
// this function only: energy refill, venom tick, draw, fresh Surge tracking.
// Vex's AI is then kicked off from here, so he can never be skipped.
function beginTurn(side) {
  if (state.screen !== 'game') return;
  const me = state[side];
  if (side === 'player') {
    state.round++;
    state.turn = 'player';
    state.phase = 'player';
  } else {
    state.turn = 'vex';
    state.phase = 'ai';
  }
  // Energy refills each round and grows with the round, up to 10.
  me.energyMax = Math.min(MAX_ENERGY, state.round);
  me.energy = me.energyMax;
  // Venom bites at the start of the afflicted side's turn, then clears.
  // Venom ignores shield: it is poison, not a blow.
  if (me.venom > 0) {
    const bite = me.venom;
    me.life -= bite;
    const y = side === 'player' ? 640 : 130;
    addFloat(640, y, '-' + bite + ' VENOM', '#3fae5a');
    say('Venom bites ' + nameOf(side) + ' for ' + bite + '.');
    sounds.play('venom');
    me.venom = 0;
    if (checkEnd()) return;
  }
  // Draw a card; an empty deck costs 1 life per draw (fatigue).
  const drawn = drawFrom(me.deck);
  if (drawn) {
    if (me.hand.length >= MAX_HAND) {
      me.discard.push(drawn);
      say(nameOf(side) + ' draws, but the hand is full — the card is lost.');
    } else {
      me.hand.push(drawn);
      if (side === 'player') sounds.play('draw');
    }
  } else {
    me.life -= 1;
    say(nameOf(side) + ' draws from an empty deck — fatigue costs 1 life.');
    if (checkEnd()) return;
  }
  // A new turn means a fresh played zone and fresh Surge tracking.
  state.played[side] = [];
  state.elementsPlayed[side] = [];
  if (side === 'player') {
    sounds.play('turn');
  } else {
    runAiTurn();
  }
}

// ---------- playing cards ----------

function applyEffect(side, card, power) {
  const me = state[side];
  const foe = state[other(side)];
  const foeY = side === 'player' ? 130 : 640;
  const meY = side === 'player' ? 640 : 130;
  if (card.kind === 'damage') {
    const absorbed = Math.min(foe.shield, power);
    foe.shield -= absorbed;
    const hurt = power - absorbed;
    foe.life -= hurt;
    addFloat(640, foeY, '-' + power, '#e8491d');
    say(nameOf(side) + ' deals ' + power + ' damage to ' + nameOf(other(side)) + (absorbed ? ' (' + absorbed + ' absorbed by shield).' : '.'));
    sounds.play('damage');
  } else if (card.kind === 'heal') {
    const before = me.life;
    me.life = Math.min(START_LIFE, me.life + power);
    addFloat(640, meY, '+' + (me.life - before), '#1d7fd6');
    say(nameOf(side) + ' restores ' + (me.life - before) + ' life.');
    sounds.play('heal');
  } else if (card.kind === 'shield') {
    me.shield += power;
    addFloat(640, meY, '+' + power + ' SHIELD', '#1d7fd6');
    say(nameOf(side) + ' gains ' + power + ' shield.');
    sounds.play('shield');
  } else if (card.kind === 'venom') {
    foe.venom += power;
    addFloat(640, foeY, 'VENOM ' + power, '#3fae5a');
    say(nameOf(side) + ' poisons ' + nameOf(other(side)) + ' — venom ' + power + '.');
    sounds.play('venom');
  } else if (card.kind === 'draw') {
    for (let i = 0; i < power; i++) {
      const drawn = drawFrom(me.deck);
      if (!drawn) {
        me.life -= 1;
        say(nameOf(side) + ' draws from an empty deck — fatigue costs 1 life.');
      } else if (me.hand.length >= MAX_HAND) {
        me.discard.push(drawn);
      } else {
        me.hand.push(drawn);
      }
    }
    say(nameOf(side) + ' draws ' + power + ' card' + (power > 1 ? 's' : '') + '.');
    sounds.play('draw');
  }
}

function playCard(side, handIndex) {
  if (state.screen !== 'game') return false;
  if (side === 'player' && state.phase !== 'player') return false;
  if (side === 'vex' && state.phase !== 'ai') return false;
  const me = state[side];
  const card = me.hand[handIndex];
  if (!card || card.cost > me.energy) return false;
  // Surge: the second card of one element in a turn gains +2 power.
  const surge = state.elementsPlayed[side].includes(card.element);
  const power = card.power + (surge ? SURGE_BONUS : 0);
  // Flight start: from the hand (player) or from the card backs (Vex).
  // Read the hand rectangles BEFORE the card leaves the hand.
  const rects = side === 'player' ? handRects(state) : null;
  const from = side === 'player' && rects[handIndex]
    ? { x: rects[handIndex].x, y: rects[handIndex].y }
    : { x: 800, y: 90 };
  me.energy -= card.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(card);
  state.elementsPlayed[side].push(card.element);
  state.stats.cardsPlayed[side]++;
  state.played[side].push({ card, surge, fromX: from.x, fromY: from.y, born: performance.now() });
  if (surge) {
    state.stats.surges++;
    state.surgeFlash = performance.now();
    say('SURGE! ' + card.name + ' strikes for ' + power + '.');
    sounds.play('surge');
  } else {
    sounds.play('play');
  }
  applyEffect(side, { ...card, power }, power);
  // A secondary effect (Phoenix Dive, Root Grasp) at its own power.
  if (card.also) applyEffect(side, { ...card, kind: card.also.kind, power: card.also.power }, card.also.power);
  checkEnd();
  return true;
}

// ---------- the AI turn ----------

async function runAiTurn() {
  const token = state.aiToken;
  // "VEX IS THINKING..." — a visible beat so his choices can be read.
  await sleep(750);
  if (token !== state.aiToken || state.screen !== 'game' || state.turn !== 'vex') return;
  for (;;) {
    const idx = chooseAiCard(state.vex.hand, state.vex.energy, state.vex, state.player, state.elementsPlayed.vex, SURGE_BONUS,
      { damageWeight: 1.2, surgeExtra: 2 });
    if (idx < 0) break;
    playCard('vex', idx);
    if (state.screen !== 'game') return;
    await sleep(700);
    if (token !== state.aiToken || state.screen !== 'game' || state.turn !== 'vex') return;
  }
  await sleep(450);
  if (token !== state.aiToken || state.screen !== 'game' || state.turn !== 'vex') return;
  say('Vex ends his turn.');
  beginTurn('player');
}

// ---------- ending the turn, ending the duel ----------

function endPlayerTurn() {
  if (state.screen !== 'game' || state.phase !== 'player') return;
  say('Asha ends her turn.');
  sounds.play('click');
  beginTurn('vex');
}

function checkEnd() {
  if (state.screen !== 'game') return false;
  if (state.vex.life <= 0 && state.player.life <= 0) {
    gameOver(state.vex.life < state.player.life ? 'win' : 'lost');
    return true;
  }
  if (state.vex.life <= 0) { gameOver('win'); return true; }
  if (state.player.life <= 0) { gameOver('lost'); return true; }
  return false;
}

function gameOver(result) {
  state.aiToken++; // stop any AI loop still running
  state.screen = 'over';
  state.result = result;
  state.phase = 'over';
  say(result === 'win' ? 'Vex falls — Asha wins the duel!' : 'Asha falls — Vex wins the duel.');
  sounds.play(result === 'win' ? 'win' : 'lose');
}

// ---------- scene staging for screenshots ----------

// ?scene=title | cover | win | lost — deterministic staged states of the
// game's own code, so the screenshots are real renders, not mockups.
function stageScene(scene) {
  if (scene === 'cover') {
    newGame();
    // A mid-game table: round 5, both sides bloodied, hands full.
    state.round = 5;
    state.player.life = 24;
    state.player.shield = 5;
    state.vex.life = 19;
    state.vex.venom = 3;
    state.player.energy = 2;
    state.player.energyMax = 5;
    state.vex.energy = 4;
    state.vex.energyMax = 5;
    state.player.hand = ['ember-spark', 'flame-lash', 'tidewall', 'briar-snare', 'boulder-slam', 'healing-rain'].map(lookupCard);
    state.vex.hand = ['thorn-prick', 'stone-skin', 'cinder-burst', 'nightshade', 'granite-guard'].map(lookupCard);
    state.player.deck = Array.from({ length: 18 }, () => lookupCard('ember-spark'));
    state.vex.deck = Array.from({ length: 21 }, () => lookupCard('thorn-prick'));
    state.elementsPlayed.player = ['flame'];
    state.played.player = [{ card: lookupCard('cinder-burst'), surge: true, fromX: 300, fromY: 560, born: performance.now() - 400 }];
    state.played.vex = [{ card: lookupCard('boulder-slam'), surge: false, fromX: 800, fromY: 90, born: performance.now() - 400 }];
    state.log = ['Vex played Boulder Slam for 6.', 'SURGE! Cinder Burst strikes for 8 (6 + 2).'];
    state.turn = 'player';
    state.phase = 'player';
  } else if (scene === 'win' || scene === 'lost') {
    newGame();
    state.round = 9;
    state.stats.cardsPlayed = { player: 14, vex: 12 };
    state.stats.surges = 4;
    state.player.energy = 4;
    state.player.energyMax = 5;
    state.vex.energy = 3;
    state.vex.energyMax = 5;
    if (scene === 'win') {
      state.vex.life = 0;
      state.player.life = 11;
    } else {
      state.player.life = 0;
      state.vex.life = 8;
    }
    gameOver(scene);
  }
  // 'title' (or none) leaves the title screen as it is.
}

// ---------- input wiring ----------

attachInput(canvas, {
  layout: () => layoutFor(state),
  onHover: (hover, endTurnHover) => {
    state.hover = hover;
    state.endTurnHover = endTurnHover;
    canvas.style.cursor = hover >= 0 || endTurnHover ? 'pointer' : 'default';
  },
  onGesture: () => sounds.ensure(),
  onStart: () => {
    if (state.screen === 'title') { sounds.play('click'); newGame(); }
  },
  onRestart: () => {
    if (state.screen === 'over') { sounds.play('click'); newGame(); }
  },
  onPlayCard: (index) => {
    if (state.screen === 'game' && state.phase === 'player') playCard('player', index);
  },
  onEndTurn: () => endPlayerTurn(),
  onMute: () => { state.muted = sounds.toggleMute(); },
});

// ---------- main loop ----------

function frame(now) {
  try {
    drawGame(ctx, state, now);
  } catch (err) {
    // Never let one bad frame freeze the table: report and keep going.
    console.error('render error:', err && err.message);
  }
  requestAnimationFrame(frame);
}

stageScene(params.get('scene') || 'title');
requestAnimationFrame(frame);

// Test / probe hook: read-only state plus the same entry points a player
// uses. Playwright drives the real game through this in the playtest.
window.__ember = {
  state,
  newGame,
  playCard,
  endPlayerTurn,
  beginTurn,
  chooseAiCard,
};
