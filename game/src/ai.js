// EMBER PACT — Vex, the AI opponent. Greedy but readable: he scores every
// card he can afford and plays the best one, again and again until he cannot
// afford another. His priorities, in order:
//   1. take lethal when he can,
//   2. heal only when hurt, shield when threatened,
//   3. chain a Surge (a second card of an element already played this turn),
//   4. otherwise take the most value per energy.
// He never holds back a playable card, so he acts on most turns and can win.

// self and foe are the two duelists: { life, shield, venom, maxLife? }.
// elementsPlayed is the list of elements this side already played this turn.
// opts is Vex-only tuning (the player side calls without it): damageWeight
// presses the attack, surgeExtra chases Surge chains harder.
export function scoreCard(card, self, foe, elementsPlayed, surgeBonus, opts) {
  const damageWeight = (opts && opts.damageWeight) || 1;
  const surgeExtra = (opts && opts.surgeExtra) || 0;
  const surgeReady = elementsPlayed.includes(card.element);
  let score = 0;

  if (card.kind === 'damage') {
    score = card.power * damageWeight;
    // Lethal is everything: damage that ends the duel beats any other play.
    if (card.power >= foe.life + foe.shield) score += 100;
    // Punching through a big shield is worth less than hitting bare life.
    if (foe.shield > 0) score -= Math.min(foe.shield, card.power) * 0.15;
  } else if (card.kind === 'heal') {
    // Score only the life actually restored: healing at full life is worth
    // nothing, however big the number on the card.
    const maxLife = self.maxLife || 30;
    const healed = Math.max(0, Math.min(card.power, maxLife - self.life));
    if (self.life <= 12) score = healed * 1.6;
    else if (self.life <= 22) score = healed * 0.9;
    else score = healed * 0.25; // barely hurt: healing is nearly wasted
  } else if (card.kind === 'shield') {
    score = card.power * 0.9;
    if (self.life <= 12) score *= 1.25; // threatened: shield up
    if (foe.life <= 6) score *= 0.6; // foe nearly dead: attack instead
  } else if (card.kind === 'venom') {
    score = card.power * 1.15;
    if (foe.venom === 0) score += 1.5; // first venom sets the clock ticking
  } else if (card.kind === 'draw') {
    score = 2.5 + card.power * 0.8; // cards are future plays
  }

  // A secondary effect (Phoenix Dive, Root Grasp) adds most of its own value.
  if (card.also) {
    if (card.also.kind === 'draw') score += 2.5 + card.also.power * 0.8;
    if (card.also.kind === 'damage') score += card.also.power * 0.8;
    if (card.also.kind === 'heal') score += card.also.power * 0.5;
    if (card.also.kind === 'shield') score += card.also.power * 0.6;
    if (card.also.kind === 'venom') score += card.also.power * 0.8;
  }

  // Surge: +2 power on the second card of an element is worth chasing.
  if (surgeReady) score += surgeBonus * 2 + 1 + surgeExtra;
  // Slight preference for cheap cards, so he spends his energy well.
  score -= card.cost * 0.2;
  return score;
}

// Index of the best affordable card in hand, or -1 when nothing is worth
// playing (or nothing is affordable). A greedy AI with a low bar plays.
export function chooseAiCard(hand, energy, self, foe, elementsPlayed, surgeBonus, opts) {
  let best = -1;
  let bestScore = 0.5;
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    if (card.cost > energy) continue;
    const score = scoreCard(card, self, foe, elementsPlayed, surgeBonus, opts);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}
