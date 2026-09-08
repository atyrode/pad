# Working on Skrabble

A chill, desktop-first word-building game: keyboard primary, mouse drag-and-drop
secondary. Preserve the useful manual/debug sandbox and its lean shared engine.
[SPEC.md](SPEC.md) owns product rules, direction, and open decisions;
[README.md](README.md) owns run commands, dictionary provenance, and host operations.

## Source map

- `src/game/game.ts`: deterministic `GameState`/`GameAction` transitions and play
  evaluation shared by the browser and Bun/headless callers.
- `app/page.tsx`: UI orchestration, dictionary loading and engine dispatch.
- `app/layout.tsx`, `app/globals.css`: page shell and global presentation.
- `src/components/`: board, rack, draft, tiles, popups, and debug controls.
- `src/hooks/`: keyboard selection, drag-and-drop, responsive cell sizing.
- `src/utils/`: board/rack/bag helpers, scoring, stickers, transforms, dictionary.
- `src/types/`, `src/constants/`: shared data shapes and board constants.
- `public/dictionnary/french.txt`: current dictionary; preserve its bytes.
- `deploy/`, `compose*.yaml`, `Dockerfile`: serving and deployment recipes.

## Changes

- Read the relevant code and SPEC first. State a small task's outcome and non-goals;
  keep the diff focused, then report the evidence and any remaining limitations.
- Give game actions one owner. Keyboard, pointer, debug, and future headless clients
  must share rule execution, not grow separate UI copies of the rules.
- Preserve the appearance, bespoke scoring, and snappy interaction. Fix causes;
  avoid extra work in render/input paths and unnecessary abstraction.
- Do not invent gameplay, budgets, progression, servers, or frameworks. Open
  product choices in SPEC stay open until decided. No dictionary replacement
  without explicit review of licensing and gameplay effects.
- Keep documentation honest about current versus planned behavior. Do not add
  shims or speculative scaffolding to make an unfinished feature look complete.

## Verify the changed surface

- Use Bun 1.3.13 and Node 24. Run `bun install --frozen-lockfile`, then `bun run dev`;
  see README for URLs and the headless API example.
- `bun run check` runs `typecheck`, `lint` and `test`; `bun run build` separately
  produces the static export. CI is configured for both gates. Report local and
  remote results separately; a configured workflow is not a successful CI run.
- Exercise actual browser behavior for UI changes, including keyboard interaction;
  reproduce bugs and confirm the fix. Keep tests for meaningful behavior and edges,
  not source-text assertions. Report exactly what was exercised.

## Live-work safety

The dev-01 checkout is a public development bind mount: ordinary source edits are
live through Fast Refresh, with no commit, push, or deploy required. Do not commit
unless asked. Do not change hosts, deploy, switch DNS, or access credentials without
explicit authorization. Never commit tokens or copy authentication state.
