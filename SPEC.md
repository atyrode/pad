# Skrabble: product and baseline contract

## Status and boundaries

Skrabble is a solo French word-building game with a first draft-and-encounter loop
and a separate manual/debug sandbox. Preserve its appearance, bespoke scoring,
debug controls and snappy feel. Desktop comes first; keyboard is primary and mouse
drag-and-drop is secondary. See [README](README.md) for running and hosting, and
[AGENTS](AGENTS.md) for contributor obligations.

The approved implementation scope includes the first encounter described below.
Maps, shops, between-encounter progression, saves and multiplayer remain future
work. Inspiration from OMG Words, Balatro, Slay the Spire and Noita concerns design,
not copying code or assets. This document separates implemented rules from ideas.

## Core vision: a familiar game with unexpected possibilities

At first, Skrabble should read as a clear, approachable roguelike word game.
Through curiosity and experimentation, the player discovers that some boundaries
they assumed were fixed are actually playable: something that looked like a title,
decoration or interface can participate in the game. The desired feeling is
"I didn't think I was allowed to do that—and the game noticed."

This is a core design lens across the game, not merely a title-theft feature.
Consider what an inquisitive player might try at each stage, without requiring a
secret in every screen. Establish ordinary expectations before occasionally
breaking them; restraint gives each discovery room to matter.

- Apparent rule-breaking reveals an intentional possibility, not an unreliable
  engine or an actual software exploit. Preserve trust in input and consequences.
- Let discovery teach through a clear reaction. The first encounter is a surprise;
  later encounters can become informed decisions and creative uses of knowledge.
- Prefer useful gameplay consequences and combinations to isolated novelty.
  Curiosity need not always be punished, and secrets must not become compulsory
  chores or make straightforward play feel like the wrong way to play.
- Keep the normal surface simple. Do not announce every possibility, add a
  dedicated "secrets" menu, or turn discovery into mouse-only pixel hunting.
- A possible shared grammar is that interface and play are made from the same
  things, with familiar actions working in unexpected places. This is a hypothesis,
  not a requirement that every label be movable or every surprise use one system.
  Carefully authored exceptions remain an option. Compare concrete interactions
  before deciding whether a common mechanic is useful; build no speculative
  abstraction or catalogue of gimmicks in anticipation.

Title theft is the first proposed expression of this vision, not an implemented
rule. Its specific tradeoff remains in the future-design section below.

## Seven principles

1. **Keyboard-first full control:** every normal action should be reachable without
   a mouse; pointer controls use the same rules, not a parallel implementation.
2. **Immediate input:** state changes synchronously with accepted commands;
   animations only illustrate results and never own, delay or gate game state.
3. **Interruptible play:** no real-time pressure; thinking and stepping away are
   allowed. Do not introduce timers or reflex-dependent rewards.
4. **Combinatorial depth:** seek interesting word, board and bag combinations,
   rather than complexity from menus or layers of unrelated systems.
5. **One shared engine:** one Rust rules core compiles natively for headless
   experiments and to Wasm for browser play; no duplicate rules or HTTP service.
6. **Inspectable, reproducible results:** expose understandable score breakdowns
   and reproduce engine state from a seed and actions under the same rules/lexicon.
7. **Minimal architecture and tooling:** one small Rust crate alongside the existing
   React/TypeScript UI, plain data and functions, useful checks; no plugins, ECS
   or process bureaucracy.

## Craft is a core requirement

Keep the game simple, but make each of its few elements deliberate. Polish is not
a decorative finishing pass or permission to add controls. Remove accidental
decisions and unnecessary effects; every detail should serve comprehension,
continuity, feel or character.

- **Proportion and hierarchy:** question size, ratios, typography, score numerals,
  spacing, borders, corners and empty space together. Useful cells and unavailable
  space should not compete equally for attention without a reason.
- **Continuity:** a tile is a persistent object, not a succession of pictures.
  Preserve its position, dimensions and appearance across dragging, flight and
  landing. Board and rack transitions should maintain their spatial relationship.
- **Rhythm:** consider recognition, action, travel, arrival and acknowledgment.
  Routine input stays immediate; meaningful completions get room to register.
  Animations remain interruptible presentation, never delayed rule execution.
- **Material and character:** movement, shadows, color and sound should describe
  the same coherent object. Prefer restrained, precise, slightly playful feedback
  over unrelated visual flourishes or simulated realism for its own sake.
- **State legibility:** distinguish available, selected, moving, placed, committed
  and locked states. Communicate validation and resistance near their cause, not
  through redundant instructional panels or silently unresponsive controls.
- **Input feel:** preserve focus, reachable targets, reliable click/drag boundaries
  and predictable rapid input. Keyboard and pointer deserve equivalent feedback;
  interruptions and recovery are part of the interaction, not exceptional cases.
- **Sound and silence:** develop a small related vocabulary only when sound work
  is approved. Consider repetition, overlap, volume, mute and reduced stimulation.
  Silence and calm are intentional; not every hover or keystroke needs an effect.
- **Causality and learning:** discoveries may be unexplained beforehand, but their
  consequences must be attributable afterward. Consistent rules let experience
  become progression. Do not confuse secret possibilities with arbitrary outcomes
  or mouse-only pixel hunting.
- **Restraint:** reserve stronger emphasis for meaningful events. Question every
  animation, color and decoration as seriously as their absence. Do not fill
  empty space or add explanations merely because the interface is sparse.

Review one complete interaction at a time: ordinary draft pick, final blank and
encounter arrival, placement/recall, word commit, redraw. Observe normal speed,
frame-level continuity, rapid mixed input, different desktop sizes and reduced
motion. Compare focused alternatives; do not apply an indiscriminate effects pass.

## Inspection and experimentation are core requirements

These tools are primarily for developers. Player-facing inspection is a separate,
curated layer: the normal game stays quiet, while a curious player can discover
precise scoring or modifier explanations and consistent combinations. Aim for
"they thought about this too," not a programmer dashboard exposed by default.
Developer observability is foundational; optional player-facing depth should be
approachable, restrained and explicitly designed rather than copied from debug UI.

A carefully felt game must also be an explainable game. The browser, debug tools
and headless experiments use the same rule engine, actions and dictionary.

- Preserve seeded reproducibility and plain inspectable state. A seed and ordered
  actions under specified rules and lexicon should reproduce an interesting case.
- Explain scores through contributing words, tiles, stamps and arithmetic.
  Diagnose rejected moves, tile ownership and budget changes at their source,
  rather than reconstructing truth from the rendered screen.
- Grow diagnostic tools when a concrete question cannot be answered reliably.
  Prefer reusable engine capabilities to one-off UI rule copies; do not accumulate
  speculative debug frameworks or expose internal complexity in normal play.
- Word-combination analysis, scripted policies and run simulations are legitimate
  development workflows. Record their rule/configuration version, lexicon, seeds,
  policy, sample size and metrics. A win rate without those conditions is not a
  balance conclusion; an example run is not a statistical study.
- Verify player-facing changes in the real browser and rule changes against the
  shared engine. Report observations, reproducible evidence and limits separately.

Currently available: the shared Rust action/evaluation API, its browser/Bun Wasm
adapter, seed-based replays, score breakdowns, native and Wasm regression checks,
native/Wasm parity tooling and the debug panel. A general solver,
policy-comparison dashboard and persistent run recorder are not implemented.

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

## Delivered first encounter

- The browser opens directly in encounter draft, without an above-board menu,
  instructions or encounter counters. The title and offer/placement cells are the
  draft surface; decorative title tiles remain locked.
- Choose 13 letters from the existing V/C sequence by typing an offered letter,
  using 1/2/3, right-clicking, or dragging. The final blank is picked automatically;
  all 14 letters seed inventory once, and seven are drawn when the dictionary is
  ready. A failed dictionary load can be retried without losing the draft.
- Non-drag picks slide to their draft slots. The automatic blank has a distinct
  appearance, travel and settled-bag beat before the board changes. These are
  interruptible UI presentations of already-committed state, not rule timers.
- An encounter has **4 plays, 3 redraws and a 100-point target**. These are
  provisional configuration values, not an established balance conclusion.
  During play, the only above-board information is score/target and the two
  remaining budgets.
- Valid plays consume one play. Reaching the target wins, including on the last
  play; exhausting plays below the target loses. Invalid plays spend nothing.
- A redraw replaces a selected nonempty subset of current rack tiles for one
  redraw and no play. Unselected slots retain their tiles. Returned tiles can
  recycle into the draw, including the same letters. Board tiles are ineligible.
- The existing rack-side discard position serves redraw in an encounter: drop a
  rack tile there, or activate it to select several. Number keys 1–7 select slots;
  Enter or the rack action confirms, Escape cancels. No separate toolbar is needed.
- A finished attempt cannot move tiles or spend budgets. The rack Play control
  becomes Retry same bag; Enter also retries with a fresh shuffled attempt.
  **Restart game** in the debug menu instead starts a new draft and encounter.
- Sandbox mutations require explicitly leaving the encounter. Sandbox resets
  remain separate; they are not full-game restarts. No multi-encounter run or
  upgrade carryover is implemented.

## Delivered manual baseline

- One small Rust crate owns framework-free transitions through `create_game`,
  `apply_action` and `evaluate_play`. Native callers use typed `GameState` and
  `GameAction` values in process; `apply_action` mutates state on acceptance and
  preserves it on rejection, without JSON or a full-state clone in the hot path.
  The same core compiles to Wasm. React/TypeScript handles presentation and the
  serialization adapter in `src/game/runtime.ts`, not another rules implementation.
  Browser/Bun callers await `initializeEngine()` once, then use synchronous
  `createGame`, `applyAction` and `evaluatePlay`. Seeded randomness and stable tile
  IDs live in Rust; selection, focus, dragging and presentation remain in the UI.
- Keyboard, pointer and debug controls dispatch the same commands. Normal moves
  conserve playable inventory; draft previews and decorations are separate.
  Invalid commands preserve state, locked tiles cannot move normally, and blank
  selection completes a move only when confirmed. Discard/refill commits
  synchronously; its animation does not change inventory.
- Dictionary failures are visible with an explicit retry that retains game state.
  The existing dictionary bytes and uppercase French lookup are unchanged.
  Browser play retains a Rust `Lexicon` across actions rather than transferring
  the dictionary on every command.
- `bun run build:engine` generates frontend types/metadata and Wasm artifacts from
  Rust. `rust-toolchain.toml` pins Rust 1.97.1 and its Wasm target;
  `wasm-bindgen-cli` matches the crate's 0.2.121 pin. `Cargo.lock` and `bun.lock`
  are authoritative for their respective dependencies.
- Typecheck, lint, native regressions, Bun/Wasm tests, native/Wasm parity and the
  combined `check` command are available; the static build is a separate gate.
  These are available checks, not evidence that a remote CI run or browser
  acceptance has passed. The JSON-lines native CLI is an interop/debug tool,
  not the typed in-process simulation path.

Verification criteria remain: familiar manual flow and appearance; no tile
duplication/loss or stale commits under rapid mixed input; dictionary recovery;
equal seeded action replays under the same rules and lexicon. Exercise the actual
browser for UI changes and report the scenarios run, not blanket acceptance.
Headless callers can inspect scores/state and compare scripted policies.
**No statistical balance conclusions** until the policies, rules, metrics and
run/encounter conditions being compared are specified. Only the single encounter
above is implemented; no multi-encounter run is available.

Operational safety: the public development deployment bind-mounts its checkout;
React/TypeScript edits retain normal Fast Refresh without commits or deployment.
Rust edits require rebuilding the engine, restarting development and reloading the
browser. Follow README before changing hosting or exposing partially integrated work.

## Future direction and open decisions

- **Agreed direction:** a finite-run word-building roguelike. Between encounters,
  clear placed letters but preserve the player's bag and upgrades to board and bag.
  Carryover and between-encounter replenishment are not implemented.
- **Title theft — design direction, not implemented:** during draft, take at most
  one letter from DRAFT for the bag. The remaining title letters react and lock;
  a negative board stamp appears at the stolen letter's square as the price.
  The tone is playful indignation: the interface noticed the theft, not an error
  message telling the player they used it incorrectly. First discovery becomes an
  informed choice on later runs. Keep this one causal tradeoff, not a letter swap
  plus unrelated rewards or a puzzle. Stamp rules, visibility before theft, draft
  inventory accounting and actual cost at the title's edge-of-board location still
  need decisions and play evidence. It belongs with proper modifier work.
- Probably no permanent power progression, but that is not finalized. Do not add
  unlock economies or assume a meta-progression contract.
- Local saves are desired future work, not implemented persistence or guaranteed
  offline reopening. Reloading currently loses the game.
- Multiplayer is optional. Asynchronous shared seeds look promising; do not build
  networking, accounts or multiplayer architecture in anticipation of them.
