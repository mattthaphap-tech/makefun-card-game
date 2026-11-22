# Ember Pact

[![make.fun bounty](https://img.shields.io/badge/make.fun-best--card--game-ff6b35)](https://make.fun/bounty/best-card-game-20261122-1826)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Ember Pact** is an original duel card game for the [make.fun "Make the best card game" bounty](https://make.fun/bounty/best-card-game-20261122-1826). You are Asha, Ember Initiate, duelling Vex, the Ember Warden. Both start with 30 life; first to 0 loses.

## How it plays

- **Four elements, colour- and shape-coded:** Flame (damage), Tide (heal and shield), Thorn (venom), Stone (shield, draw, heavy hits). 20 distinct cards in a 30-card deck.
- **The Surge:** play two cards of one element in a turn and the second gains **+2 power**. Every hand is a decision: spend now, hold for a Surge, or shield up.
- **Vex, the AI opponent:** greedy but readable — he takes lethal when he can, heals only when hurt, shields when threatened, and chases Surge chains. He plays one card at a time with visible delays and a "VEX IS THINKING..." banner, so you can read and counter him. He moves second every round, so he opens with one extra card to keep the duel contested.
- **Venom** bites again at the start of the afflicted side's turn. **Shield** absorbs damage before life. **Fatigue:** an empty deck costs 1 life per draw. Energy refills each round and grows from 1 to 10.

## Controls

| Input | Action |
| --- | --- |
| Click a card / keys `1`–`7` | Play that card |
| `Space` or End Turn button | End your turn |
| `Enter` | Start the duel |
| `R` | Duel again from a win or loss screen |
| `M` | Mute |

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome. No build step, no network request — every script, sound (WebAudio oscillators) and image (canvas-drawn) is part of the game itself.

## Layout

- `game/index.html` — the page
- `game/src/config.js` — elements, the 20-card set, deck list, layout
- `game/src/deck.js` — deck building, shuffling, drawing
- `game/src/ai.js` — Vex's card scoring and choices
- `game/src/audio.js` — WebAudio sound effects
- `game/src/input.js` — mouse and keyboard input
- `game/src/render.js` — all canvas drawing
- `game/src/main.js` — game state and the turn engine
- `main.ts` — the make.fun hand-in program (Node 22, stdlib only)
- `screenshots/` — title, mid-game table, win and loss screens
