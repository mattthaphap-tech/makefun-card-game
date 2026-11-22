// EMBER PACT — deck: build, shuffle and draw. Pure functions over plain
// arrays; the game state in main.js owns the decks themselves.

import { CARDS, DECK_LIST } from './config.js';

const BY_ID = new Map(CARDS.map((c) => [c.id, c]));

// A fresh copy of a card definition, so played copies never share state.
export function cardById(id) {
  const def = BY_ID.get(id);
  if (!def) throw new Error('unknown card ' + id);
  return { ...def, also: def.also ? { ...def.also } : undefined };
}

// A shuffled 30-card deck. rng is a function returning [0, 1).
export function buildDeck(rng) {
  const deck = DECK_LIST.map(cardById);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

// Draw the top card, or null when the deck is empty (fatigue, handled by the
// caller: an empty deck costs 1 life per draw).
export function drawFrom(deck) {
  return deck.length > 0 ? deck.pop() : null;
}
