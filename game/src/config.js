// EMBER PACT — configuration: elements, the 20-card set, the 30-card deck,
// layout constants and the seeded random number generator.
// Every value here is original: own names, own numbers, own art direction.

// Canvas the game is drawn on (1280 x 800, fixed).
export const VIEW_W = 1280;
export const VIEW_H = 800;

// Duel rules.
export const START_LIFE = 30;
export const MAX_ENERGY = 10;
export const MAX_HAND = 10;
export const OPENING_HAND = 3;
// Vex moves second every round, so he opens with one extra card: the
// classic second-player compensation. Measured over 200 greedy-vs-greedy
// games it takes the duel from ~72/28 to ~56/44 — contested, with the
// player still favoured. Drawing two a turn instead flips it to ~30/70,
// which is too much; scoring tweaks alone move nothing, because Vex already
// plays every card he can afford.
export const VEX_OPENING_BONUS = 1;
export const SURGE_BONUS = 2;

// Four elements. Colour AND shape code every card, never text alone.
export const ELEMENTS = {
  flame: { name: 'Flame', color: '#e8491d', dark: '#7c1d08', light: '#ffb347', shape: 'flame' },
  tide: { name: 'Tide', color: '#1d7fd6', dark: '#0b3d6e', light: '#8fd4ff', shape: 'drop' },
  thorn: { name: 'Thorn', color: '#3fae5a', dark: '#14532a', light: '#a5e887', shape: 'leaf' },
  stone: { name: 'Stone', color: '#9a8a76', dark: '#453d33', light: '#e0d3b8', shape: 'rock' },
};

// Effect kinds. A card has one main effect and may carry one secondary effect
// in `also` (its own power, never Surge-boosted).
//   damage — hurt the other side (shield absorbs first)
//   heal   — restore your own life
//   shield — gain shield that absorbs damage before life
//   venom  — poison the other side; it bites at the start of their next turn
//   draw   — draw that many cards
export const CARDS = [
  // Flame — damage.
  { id: 'ember-spark', name: 'Ember Spark', element: 'flame', cost: 1, kind: 'damage', power: 2, text: 'Deal 2 damage.' },
  { id: 'flame-lash', name: 'Flame Lash', element: 'flame', cost: 2, kind: 'damage', power: 4, text: 'Deal 4 damage.' },
  { id: 'cinder-burst', name: 'Cinder Burst', element: 'flame', cost: 3, kind: 'damage', power: 6, text: 'Deal 6 damage.' },
  { id: 'phoenix-dive', name: 'Phoenix Dive', element: 'flame', cost: 4, kind: 'damage', power: 5, text: 'Deal 5 damage. Draw a card.', also: { kind: 'draw', power: 1 } },
  { id: 'wildfire', name: 'Wildfire', element: 'flame', cost: 5, kind: 'damage', power: 9, text: 'Deal 9 damage.' },
  // Tide — heal and shield.
  { id: 'healing-rain', name: 'Healing Rain', element: 'tide', cost: 2, kind: 'heal', power: 4, text: 'Restore 4 life.' },
  { id: 'tidewall', name: 'Tidewall', element: 'tide', cost: 2, kind: 'shield', power: 5, text: 'Gain 5 shield.' },
  { id: 'moonlit-pool', name: 'Moonlit Pool', element: 'tide', cost: 3, kind: 'heal', power: 6, text: 'Restore 6 life.' },
  { id: 'deep-current', name: 'Deep Current', element: 'tide', cost: 3, kind: 'shield', power: 7, text: 'Gain 7 shield.' },
  { id: 'spring-rebirth', name: 'Spring Rebirth', element: 'tide', cost: 5, kind: 'heal', power: 9, text: 'Restore 9 life.' },
  // Thorn — venom.
  { id: 'thorn-prick', name: 'Thorn Prick', element: 'thorn', cost: 1, kind: 'venom', power: 2, text: 'Venom 2: it bites for 2 next turn.' },
  { id: 'briar-snare', name: 'Briar Snare', element: 'thorn', cost: 2, kind: 'venom', power: 4, text: 'Venom 4: it bites for 4 next turn.' },
  { id: 'root-grasp', name: 'Root Grasp', element: 'thorn', cost: 2, kind: 'venom', power: 3, text: 'Venom 3. Draw a card.', also: { kind: 'draw', power: 1 } },
  { id: 'nightshade', name: 'Nightshade', element: 'thorn', cost: 3, kind: 'venom', power: 5, text: 'Venom 5: it bites for 5 next turn.' },
  { id: 'widows-bloom', name: "Widow's Bloom", element: 'thorn', cost: 4, kind: 'venom', power: 7, text: 'Venom 7: it bites for 7 next turn.' },
  // Stone — shield, draw, heavy hits.
  { id: 'stone-skin', name: 'Stone Skin', element: 'stone', cost: 1, kind: 'shield', power: 3, text: 'Gain 3 shield.' },
  { id: 'quarry-shift', name: 'Quarry Shift', element: 'stone', cost: 2, kind: 'draw', power: 2, text: 'Draw 2 cards.' },
  { id: 'boulder-slam', name: 'Boulder Slam', element: 'stone', cost: 3, kind: 'damage', power: 6, text: 'Deal 6 damage.' },
  { id: 'granite-guard', name: 'Granite Guard', element: 'stone', cost: 3, kind: 'shield', power: 8, text: 'Gain 8 shield.' },
  { id: 'avalanche', name: 'Avalanche', element: 'stone', cost: 6, kind: 'damage', power: 11, text: 'Deal 11 damage.' },
];

// The 30-card deck: every distinct card once, plus a second copy of ten cheap
// workhorses so early hands have real choices.
export const DECK_LIST = [
  ...CARDS.map((c) => c.id),
  'ember-spark', 'flame-lash', 'thorn-prick', 'stone-skin', 'healing-rain',
  'tidewall', 'briar-snare', 'quarry-shift', 'cinder-burst', 'deep-current',
];

// Small deterministic PRNG (mulberry32) so staged scenes are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Human labels for the power number printed on a card.
export function kindLabel(kind) {
  switch (kind) {
    case 'damage': return 'DMG';
    case 'heal': return 'HEAL';
    case 'shield': return 'SHIELD';
    case 'venom': return 'VENOM';
    case 'draw': return 'DRAW';
    default: return kind.toUpperCase();
  }
}

// Fixed layout of the 1280 x 800 table.
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 54 },
  vex: { portrait: { x: 84, y: 128, r: 44 }, name: { x: 150, y: 96 }, lifeBar: { x: 150, y: 122, w: 300, h: 20 }, pips: { x: 150, y: 152 }, badges: { x: 150, y: 176 }, deck: { x: 500, y: 96 } },
  vexHand: { x: 640, y: 78, cardW: 84, cardH: 118, gap: 62 },
  middle: { y: 250, h: 190 },
  playedVex: { x: 300, y: 268 },
  playedYou: { x: 760, y: 268 },
  log: { x: 640, y: 452 },
  you: { portrait: { x: 70, y: 512, r: 30 }, name: { x: 115, y: 490 }, lifeBar: { x: 115, y: 502, w: 280, h: 18 }, pips: { x: 115, y: 530 }, badges: { x: 440, y: 504 }, deck: { x: 1180, y: 468 } },
  hand: { y: 556, cardW: 128, cardH: 184, gap: 128 },
  endTurn: { x: 1096, y: 690, w: 150, h: 56 },
};
