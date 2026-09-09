# Working on Interstice

A chill, desktop-first word-building game: keyboard primary, mouse drag-and-drop
secondary. Preserve the useful manual/debug sandbox and its lean shared engine.
[SPEC.md](SPEC.md) owns product rules, direction, and open decisions;
[README.md](README.md) owns run commands, dictionary provenance, and host operations.

## Source map

- `crates/interstice-engine/`: one deterministic Rust rules core, native API and
  native regressions; compiled to Wasm for the browser.
- `src/game/runtime.ts`: Wasm initialization and synchronous browser/Bun boundary.
- `src/game/generated.ts`: Rust-generated data contracts and metadata; rebuild,
  never hand-edit. Native analysis calls the Rust library directly.
- `app/page.tsx`: UI orchestration, dictionary loading and engine dispatch.
- `app/layout.tsx`, `app/globals.css`: page shell and global presentation.
- `src/components/`: board, rack, draft, tiles, popups, and debug controls.
- `src/hooks/`: keyboard selection, drag-and-drop, responsive cell sizing.
- `src/utils/`: UI board/rack lookups, sticker counts, transforms and dictionary loading.
- `src/types/`, `src/constants/`: UI selection types and presentation constants.
- `public/dictionnary/french.txt`: current dictionary; preserve its bytes.
- `deploy/`, `compose*.yaml`, `Dockerfile`: serving and deployment recipes.

## Changes

- Read the relevant code and SPEC first. State a small task's outcome and non-goals;
  keep the diff focused, then report the evidence and any remaining limitations.
- Treat SPEC's craft and inspection principles as core requirements, not a final
  polish pass. For each changed interaction consider proportion, continuity,
  rhythm, material, state feedback, input feel, sound/silence, causality and restraint.
  Preserve simplicity; do not substitute toolbars or explanatory prose for clear
  board interactions. Game counters belong to play, not draft.
- Apply SPEC's discovery vision across design work: consider how curiosity could
  reveal a playable possibility beyond an assumed boundary. Keep surprises sparse,
  consequences legible and ordinary play satisfying. The vision is agreed; a
  universal mechanic and individual surprises still require design decisions.
- Give game actions one owner. Keyboard, pointer, debug, and future headless clients
  must share rule execution, not grow separate UI copies of the rules.
- Preserve the appearance, bespoke scoring, and snappy interaction. Fix causes;
  avoid extra work in render/input paths and unnecessary abstraction.
- Keep outcomes explainable: inspect word/score contributions, tile ownership,
  rejection reasons and budget transitions through the shared engine. Extend debug
  tools when a concrete question warrants it, not as speculative infrastructure.
  Reproduce scenarios with seeds/actions; record policies, rules, lexicon and
  sampling conditions for simulations. Do not claim balance from anecdotes.
- Developer tooling is primary. Optional player-facing inspection should reward
  curiosity without exposing a dashboard, internal logs or default explanatory
  clutter. Keep debug controls themselves concise: short labels, useful data.
- Do not invent gameplay, budgets, progression, servers, or frameworks. Open
  product choices in SPEC stay open until decided. No dictionary replacement
  without explicit review of licensing and gameplay effects.
- Keep documentation honest about current versus planned behavior. Do not add
  shims or speculative scaffolding to make an unfinished feature look complete.

## Verify the changed surface

- Use Bun 1.3.13, Node 24 and the pinned Rust 1.97.1 toolchain with Wasm target
  and wasm-bindgen-cli 0.2.121. See README for setup and native examples.
- `bun run dev` first builds the Rust engine and generated interface. Rust edits
  require rebuilding and reloading; UI edits retain normal Fast Refresh.
- `bun run check` checks Rust formatting/Clippy, TypeScript/lint, native and
  Bun/Wasm regressions, and native/Wasm parity. `bun run build` separately produces
  the static export. Report local and remote results separately; configured CI
  is not a successful CI run.
- Exercise actual browser behavior for UI changes, including keyboard interaction;
  reproduce bugs and confirm the fix. Keep tests for meaningful behavior and edges,
  not source-text assertions. Report exactly what was exercised.
- Check motion at normal speed and at handoffs, rapid mixed input, relevant desktop
  sizes and reduced motion. Presentation must not delay rule commits or lose
  interrupting input. Compare focused alternatives rather than adding effects.

## Live-work safety

The dev-01 checkout is a public development bind mount: React/TypeScript edits are
live through Fast Refresh; Rust edits require rebuilding the generated engine.
Neither requires a commit, push, or deploy. Do not commit
unless asked. Do not change hosts, deploy, switch DNS, or access credentials without
explicit authorization. Never commit tokens or copy authentication state.
