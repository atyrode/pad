# Skrabble: product and baseline contract

## Status and boundaries

Skrabble is currently a solo French word-building **manual/debug sandbox**, not
an implemented roguelike. Preserve its appearance, bespoke scoring, debug controls
and snappy feel. Desktop comes first; mouse drag-and-drop remains a secondary
input, not a requirement for full control. See [README](README.md) for running and
hosting, and [AGENTS](AGENTS.md) for contributor guidance.

The operator-approved scope is the lean manual sandbox baseline described below.
Future direction is not authorization to add a gameplay loop, map, shop,
play/redraw budgets, progression, saves or multiplayer now. Inspiration from
OMG Words, Balatro and Slay the Spire is about design, not copying code or assets.

## Seven principles

1. **Keyboard-first full control:** every normal action should be reachable without
   a mouse; pointer controls use the same rules, not a parallel implementation.
2. **Immediate input:** state changes synchronously with accepted commands;
   animations only illustrate results and never own, delay or gate game state.
3. **Interruptible play:** no real-time pressure; thinking and stepping away are
   allowed. Do not introduce timers or reflex-dependent rewards.
4. **Combinatorial depth:** seek interesting word, board and bag combinations,
   rather than complexity from menus or layers of unrelated systems.
5. **One shared engine:** browser play and headless experiments consume the same
   rules and commands; no separate simulation engine or HTTP service.
6. **Inspectable, reproducible results:** expose understandable score breakdowns
   and reproduce engine state from a seed and actions under the same rules/lexicon.
7. **Minimal architecture and tooling:** a small TypeScript project, plain data
   and functions, useful checks; no monorepo, plugins, ECS or process bureaucracy.

## Current sandbox rules to preserve

- The board is **11 × 11**, its center is `(5, 5)` in zero-based coordinates,
  and the rack holds **7** tiles. Gameplay board, rack, bag and discard start empty;
  the separate draft screen has its own decorative tiles and suggestions.
- Enter Draft manually. Select **14** tiles in the sequence
  **V C C V C C V C C V C C V blank**. Vowels include Y: a vowel pick offers two
  distinct vowels, a consonant pick offers three distinct consonants, and the
  final pick offers one blank. Distinctness applies within an offer, not the bag.
- Completing the draft seeds a shuffled bag once. It does **not** automatically
  exit Draft, clear the gameplay board or draw. Exit Draft and Draw All remain
  explicit controls. Do not turn the sandbox into an automatic round/run loop.
- A word occurrence is a maximal horizontal or vertical run of at least two
  tiles. A **current word** contains at least one newly placed, unlocked tile;
  entirely locked words are not independently rescored on the current play.
- New tiles must lie in one contiguous row or column; locked tiles may fill gaps.
  At least one current word must exist and **all** current words, including cross
  words, must be accepted by the loaded French dictionary. Single letters alone
  cannot be committed. Play is unavailable while dictionary data is unavailable.
- While the central start sticker is unconsumed, every current word must cover
  the center. After it is consumed, if locked tiles exist, at least one new tile
  must touch a locked tile orthogonally. Diagonal contact does not count.
- Blanks represent a chosen letter for validation but always score **0**. Returning
  a blank to inventory removes its letter assignment; canceling selection must
  not move or lose the tile.
- A valid commit adds the current aggregate score to the running total, locks new
  tiles, consumes stickers beneath them, clears placement undo history and fills
  empty rack slots from the bag. Drawing can recycle discard into an empty bag;
  exhaustion leaves unfilled slots. Committed board tiles do not return on draw.
- Manual/debug controls remain available and may deliberately reset individual
  zones, generate tiles or reset score/stickers. Those explicit debug actions are
  not normal tile-conserving commands and need not simulate an encounter reset.

### Bespoke aggregate score, not standard Scrabble

Let `W` be the current word occurrences. Count each tile once **per occurrence**:
shared letters, their points and active stickers can count in both crossing words.
Locked letters inside a current word count too; consumed stickers do not.

```text
P = sum of tile scores across W + sum of active point-sticker values across W
M = sum of word lengths across W + sum of active multi-sticker values across W
B = 50 if any current word contains exactly 7 new tiles, otherwise 0
play score = (P + B) × M
```

The bingo is added **once**, before multiplication, not once per word. Multi
stickers add their value to `M` (a displayed x2 adds 2); they do not multiply it.
This is one aggregate product, **not** the sum of independently scored words.
The running total accumulates committed play scores; do not reconstruct it by
rescoring the final board or substitute official Scrabble scoring.

## Delivered manual baseline

- `src/game/game.ts` owns framework-free transitions through `createGame`,
  `applyAction` and `evaluatePlay`, with plain `GameState`/`GameAction` data shared
  by React and Bun. Seeded randomness and stable tile IDs live in the engine;
  selection, focus, dragging and presentation remain in the UI.
- Keyboard, pointer and debug controls dispatch the same commands. Normal moves
  conserve playable inventory; draft previews and decorations are separate.
  Invalid commands preserve state, locked tiles cannot move normally, and blank
  selection completes a move only when confirmed. Discard/refill commits
  synchronously; its animation does not change inventory.
- Dictionary failures are visible with an explicit retry that retains game state.
  The existing dictionary bytes and uppercase French lookup are unchanged.
- Typecheck, lint, focused regression tests and the combined `check` command are
  available. CI is configured to run `check` and the static build; configuration
  alone is not evidence that a remote run or browser acceptance has passed.

Verification criteria remain: familiar manual flow and appearance; no tile
duplication/loss or stale commits under rapid mixed input; dictionary recovery;
equal seeded action replays under the same rules and lexicon. Exercise the actual
browser for UI changes and report the scenarios run, not blanket acceptance.
Headless callers can inspect scores/state and compare scripted policies.
**No statistical balance conclusions** until the policies, rules, metrics and
run/encounter conditions being compared are specified. No gameplay loop is
implemented.

Operational safety: the public development deployment bind-mounts its checkout;
ordinary source edits are immediately visible without commits or deployment.
Follow README before changing hosting or exposing partially integrated work.

## Future direction and open decisions — not baseline work

- **Agreed direction:** a finite-run word-building roguelike. Each encounter starts
  with fresh placed letters: clear the board's letters, but preserve the player's
  bag and upgrades to both board and bag. This carryover direction is confirmed;
  encounter transitions are not implemented by the sandbox's debug reset.
- **Round budget: separate play and redraw allowances are agreed.** One redraw
  replaces a selected subset of rack tiles without spending a scoring turn.
  The first encounter's provisional parameters are **4 plays, 3 redraws and a
  100-point target**: win on reaching the target; lose if plays run out below it.
  These are adjustable starting parameters, not a balance conclusion. Encounter
  implementation and between-encounter replenishment remain future work.
- Probably no permanent power progression, but that is not finalized. Do not add
  unlock economies or assume a meta-progression contract.
- Local saves are desired future work, not implemented persistence or guaranteed
  offline reopening. Reloading currently loses the game.
- Multiplayer is optional. Asynchronous shared seeds look promising; do not build
  networking, accounts or multiplayer architecture in anticipation of them.
