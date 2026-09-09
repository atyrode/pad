# Skrabble

A solo French word-building game. Play at **https://games.tyrode.dev/skrabble/**.

Desktop first, keyboard primary, mouse drag-and-drop secondary. The first encounter
combines drafting, placement and scoring with separate play/redraw budgets.
A manual/debug sandbox remains available; maps, shops and progression are not.
See [SPEC.md](SPEC.md) for current rules, planned direction, and open decisions;
[AGENTS.md](AGENTS.md) is the short contributor guide.

## Play

The debug panel starts collapsed behind the top-left menu button. Open it for
manual controls; close it to smoothly recenter the board and rack. The toggle is
keyboard-accessible, hidden controls are skipped, and reduced-motion preferences
disable the transition. Opening or closing the panel preserves the game.

The game opens directly in **Draft**. Type an offered letter, or use **1 / 2 / 3**
to choose a column (vowels occupy 1 and 3). Right-clicking an offer or dragging it
into a draft slot also works. After 13 choices the final blank slides in
automatically, followed by the encounter: **100 points, 4 plays, 3 redraws**.
No start button is required. Flights and the final settled-bag pause are
interruptible presentation; the underlying actions commit immediately.

The game area receives focus on load; Tab or a click can return focus to it.
With that area focused:

- **Arrows** select/move a board cell; **letters** place a matching rack tile,
  falling back to a zero-point blank.
- **Tab** changes placement direction while a cell is selected.
  **Shift+Tab** leaves the game area; **Escape** clears selection and releases focus.
- **Backspace** recalls the latest pending placement; **Space** shuffles the rack;
  **Enter** commits a valid play. The first word must cover the central star.
- **1–7** select rack slots for redraw; **Enter** confirms and **Escape** cancels.
  **Delete** also opens redraw selection. The rack-side redraw icon selects or
  confirms; dragging one rack tile onto it redraws just that tile immediately.
  Each accepted redraw costs one redraw, not a play, and preserves unselected slots.
- Reaching 100 wins; using the last play below 100 loses. **Enter** or the retry
  icon at the existing Play position retries with the same drafted bag.
- The menu's **Game / Sandbox** selector changes mode explicitly. In Game,
  **Restart game** closes the menu and returns to a fresh draft and encounter.
  Selecting **Game** from Sandbox also starts a fresh draft. In the sandbox,
  **Clear sandbox** clears gameplay, and Delete discards rather than selecting
  redraw. Manual draft still requires 14 picks, Exit Draft and Draw All.

The menu, rack actions and debug controls are native keyboard-focusable
buttons; game shortcuts do not override their normal keyboard behavior. A blank
chooser accepts **A–Z** or a letter button, **Tab / Shift+Tab** navigate inside it,
and **Escape** cancels without moving the tile. Dictionary loading failures show a
retry control; retrying retains the current game.

Once the page **and French dictionary** have loaded, play works without a network
connection in that open tab: drafting, drawing, word validation, and scoring are
all local. There is no account, database, or game backend. **Refreshing or
reopening offline is not supported, and reloading loses the current game.** No
service worker or saved-game feature is added by this deployment.

## Local development

Use Bun 1.3.13, Node 24, and Rust 1.97.1. `rust-toolchain.toml` pins the Rust
compiler, `wasm32-unknown-unknown` target, rustfmt and Clippy. With
[rustup](https://rustup.rs/) installed, set up the pinned toolchain and matching
Wasm binding generator:

```sh
rustup toolchain install 1.97.1 --profile minimal \
  --target wasm32-unknown-unknown --component rustfmt --component clippy
cargo +1.97.1 install wasm-bindgen-cli --version 0.2.121 --locked
```

`wasm-bindgen-cli` must match the crate's exact `wasm-bindgen = 0.2.121` pin.
`Cargo.lock` is authoritative for Rust dependencies; `bun.lock` is authoritative
for JavaScript dependencies. Keep both lockfiles when building.

An optional Nix development shell is:

```sh
nix shell nixpkgs#rustc nixpkgs#cargo nixpkgs#wasm-bindgen-cli \
  nixpkgs#gcc nixpkgs#lld nixpkgs#rustfmt nixpkgs#clippy --command bash
rustc --version
wasm-bindgen --version
```

The current packages supply the required Wasm standard library, Rust 1.97.1 and
wasm-bindgen-cli 0.2.121. This command does not pin the `nixpkgs` input:
check those versions before use, and use the rustup setup above if they differ.
The repository toolchain file governs rustup, not Nix-provided compilers.

Then, from the repository root:

```sh
bun install --frozen-lockfile
bun run dev
# Open http://localhost:3000/skrabble/
bun run typecheck
bun run lint
bun run test:rust
bun run test
bun run test:parity
bun run check
bun run build
```

- `build:engine` (`bun scripts/build-engine.ts`) builds the native tools and Wasm
  core and generates the frontend interface.
- `dev` runs `build:engine` before `next dev`; `build` does the same before
  `next build`.
- `test:rust` runs `cargo test --locked --workspace`; `test` runs `bun test src`;
  `test:parity` runs `bun scripts/verify-engine.ts`. Build the engine first when
  running Wasm tests or parity directly.
- `check` builds the engine, checks Cargo formatting and Clippy, typechecks/lints,
  and runs native tests, Bun/Wasm tests and native/Wasm parity. The static
  production build remains a separate gate.

Generated outputs are `src/game/generated.ts` (Rust-derived data types/metadata),
`src/generated/engine/*` (Wasm JavaScript, declarations and binary),
`public/engine/<fingerprint>.wasm`, and
`target/release/{engine-cli,export-interface}`. Do not edit generated files:
rebuild from Rust. Generated frontend artifacts and `target/` are ignored and
excluded from Docker build input; the container builds its own copies.

Rust edits require rebuilding the engine, restarting the development server and
reloading the browser; `bun run dev` performs the rebuild at startup, not on every
Rust edit. React/TypeScript UI edits retain normal Next.js Fast Refresh.
The app uses Next.js 16.3.4 and React 19.2.8. These are available commands and
checks, not a claim that CI or every browser scenario has passed.

Production is served by the container, not `next start`: Next.js exports static
files to `out/`. The `/skrabble` mount is a build-time setting in `next.config.ts`;
the dictionary URL and Caddy route use the same prefix.

## One Rust engine: native and Wasm

`crates/skrabble-engine` owns the rules, seeded randomness, actions and evaluation.
It compiles natively for headless work and to Wasm for browser play. React and
TypeScript provide presentation and a serialization adapter, not a second rules
implementation. The browser keeps the French dictionary in a persistent Rust
`Lexicon`; it does not transfer the lexicon on each action.

### Typed native API

Native callers use `skrabble_engine::{engine, model, rules, Dictionary}` directly.
For example, save this as `crates/skrabble-engine/examples/draft.rs`, then run
`cargo run --locked -p skrabble-engine --example draft` from the repository root:

```rust
use skrabble_engine::{
    engine::{apply_action, create_game},
    model::GameAction,
    rules::evaluate_play,
    Dictionary,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dictionary: Dictionary =
        std::fs::read_to_string("public/dictionnary/french.txt")?
            .lines()
            .map(|word| word.trim().to_uppercase())
            .filter(|word| !word.is_empty())
            .collect();
    let mut state = create_game(42);
    apply_action(
        &mut state,
        &GameAction::NewEncounter { config: None },
        Some(&dictionary),
    )?;
    for _ in 0..13 {
        apply_action(
            &mut state,
            &GameAction::DraftPick { column: 2.0, to: None },
            Some(&dictionary),
        )?;
    }
    println!("{:#?}", evaluate_play(&state, Some(&dictionary)));
    Ok(())
}
```

This completes the draft, automatically adds the blank, starts an encounter and
draws seven tiles; no word is placed yet. `create_game(seed: u32)` alone creates
manual sandbox state. If the dictionary is unavailable (`None`), the completed
encounter draft waits for `GameAction::StartEncounter` with a loaded dictionary.
Browser loading/retry performs that recovery automatically.

`apply_action(&mut GameState, &GameAction, Option<&Dictionary>)` returns
`Result<ActionEffect, String>`: accepted commands mutate the state; rejected
commands leave it unchanged. The native action hot path uses typed values with no
JSON serialization or full-state clone. `evaluate_play(&GameState,
Option<&Dictionary>)` returns a `PlayEvaluation` with words, score breakdown and
play eligibility. This in-process API is the simulation path; load a dictionary
once and reuse it across actions.

A seed plus the same ordered actions reproduces state under the **same rules and
lexicon**. State can be serialized for inspection; this is not an implemented
saved-game feature, HTTP service, solver or persistence layer.

### Browser/Bun adapter and debug CLI

Callers of `src/game/runtime.ts` await `initializeEngine()` once, then use the
synchronous `createGame`, `applyAction` and `evaluatePlay` adapter functions.
Bun can supply the generated binary explicitly:

```ts
import { initializeEngine, createGame } from './src/game/runtime';

await initializeEngine(
  await Bun.file('src/generated/engine/skrabble_engine_bg.wasm').arrayBuffer(),
);
const state = createGame(42);
```

The browser loader uses the fingerprinted public Wasm asset. Initialization is
asynchronous; accepted gameplay actions remain synchronous after initialization.
The native `target/release/engine-cli` reads one JSON request per line and writes
one JSON result per line for `create`, `apply`, `evaluate` and `trace`. Use it for
interop, debug and parity checks, not as a JSON subprocess in a simulation hot loop.

### Native/Wasm parity

After `bun run build:engine`, `bun run test:parity` compares seeded transitions
and evaluations between the native CLI and the Bun-loaded Wasm core. Its
synthetic lexicon exercises mechanics, not French word coverage or balance.
Optional migration comparisons load an external compatibility module at runtime:

```sh
bun scripts/verify-engine.ts --reference /absolute/path/to/reference-engine.ts
bun scripts/verify-engine.ts --browser-fixture /tmp/skrabble-browser-fixture.json
```

The reference module must export compatible `createGame`, `applyAction` and
`evaluatePlay` functions; it is not shipped with the app or retained as a second
rules implementation. `--browser-fixture` writes replay traces and edge cases
with expected hashes for separate Chromium verification; it does not launch or
verify Chromium by itself. The two options can be combined. Neither a fixture
nor a passing native/Bun comparison proves browser acceptance or a remote CI run.

## Dictionary provenance

`public/dictionnary/french.txt` exactly matches the
[Thecoolsim/French-Scrabble-ODS8](https://github.com/Thecoolsim/French-Scrabble-ODS8)
mirror: **411,430 lines**, Git blob
`25c321d6c35abf9406ceafdbe2bb78127d8c67ae`.
That match identifies the source bytes; a public mirror is **not evidence of a
redistribution license**. Retain the current bytes; any replacement needs explicit
review of rights, coverage, normalization, and gameplay effects.

Possible alternatives to review—not adopted dictionaries—include the official
[Grammalecte v7.7 lexical export](https://www.grammalecte.net/dic/lexique-grammalecte-fr-v7.7.zip)
(its `README_lexique.txt` declares MPL-2.0) and the
[en-wl/wordlist](https://github.com/en-wl/wordlist) `Copyright` file for English
word-list licensing.

## Run anywhere with Docker Compose

Requirements: Docker Engine/Desktop with Docker Compose v2 or newer. A checkout
and internet access are needed to build (image/package downloads and Google Fonts
at build time); the resulting runtime serves all game assets locally.

```sh
docker compose up -d --build --wait
# Open http://127.0.0.1:8093/skrabble/
docker compose logs -f game
docker compose down
# Start again without rebuilding:
docker compose up -d --wait
```

Set `SKRABBLE_PORT=8094` if the default port is occupied. The host binding is
loopback-only; place your own HTTPS reverse proxy in front for public access.
`deploy/Caddyfile.public` is an optional Caddy site recipe for the default port
(import it into your existing Caddy configuration). It preserves `/skrabble` and
returns 404 for other paths. No machine identity or dotfiles repository is needed.

The image is a static Next.js export served by Caddy on port **8080**. Node, Bun
and Rust tooling exist only in the build stage. Base images are digest-pinned;
JavaScript dependencies use `bun.lock` with `--frozen-lockfile`, and Rust builds
use `Cargo.lock` with `--locked`. Compose runs read-only, non-root, with no
Linux capabilities. There are no data volumes to migrate. `restart:
unless-stopped` restarts the container when Docker starts; ensure Docker itself
starts at boot (rootless Docker also needs user lingering).

To move hosts, clone this repository and run the same Compose commands, or
transfer the built image with `docker save` / `docker load` and start with
`docker compose up -d --no-build --wait`. Update the destination's HTTPS proxy and
DNS. Existing open tabs continue playing even when the service is stopped.

## Live development on dev-01

The live development checkout is `/home/alex/scrabble` on **dev-01**. Its source
is bind-mounted into the development container. React/TypeScript UI edits update
the browser through Next.js Fast Refresh. Rust edits require an engine rebuild,
development-server restart and browser reload; starting `dev` rebuilds the engine.
**Source edits need no commit, push, image rebuild, or host activation.** This is
deliberately a public development server: visitors see work in progress and may
see development error overlays. The Next.js toolbar is hidden; Fast Refresh
remains enabled for the UI.
Treat edits here as live changes. Do not change hosting, deploy, switch DNS, or
handle credentials without explicit authorization; the commands below are
operational reference, not permission to run them.

```sh
docker compose -f compose.dev.yaml up -d --build --wait
docker compose -f compose.dev.yaml logs -f game
# Stop without deleting the checkout or build caches:
docker compose -f compose.dev.yaml stop
# Resume:
docker compose -f compose.dev.yaml up -d --wait
```

Dependencies and `.next` use Docker volumes, separate from host installs.
After changing JavaScript dependencies, update `bun.lock`, then restart the
container to install the new frozen lockfile. Rust dependency changes require
updating `Cargo.lock` and rebuilding the engine; keep the binding generator and
crate pins aligned. Commit only when requested.
Rebuild the image if changing its base image, Dockerfile or installed toolchain.
Development and production recipes use the same default port;
stop one before starting the other, or set `SKRABBLE_PORT` to a different port.

The host owns one stable Caddy HTTPS edge: **`games.tyrode.dev` →
`127.0.0.1:8093`**. The game checkout owns its `/skrabble` path. DNS is an
unproxied **A record `games` → `152.53.112.19`**. The edge is declared in the
dotfiles repository; normal game iteration does not touch it.

## Clever Cloud standby

The existing `skrabble` Docker application in the **Tyrode** organization is
stopped, not deleted, for reuse after development. `.clever.json` is its
CLI-generated link (IDs and deployment URLs, no credentials). Clever Cloud
builds the same production `Dockerfile` directly; it does not run Compose.
Its runtime is one nano instance and builds use a dedicated M instance.

With an authorized [Clever Tools](https://www.clever.cloud/developers/doc/cli/)
session, from this repository:

```sh
# Deploy the current committed branch when returning to managed hosting:
clever deploy --alias skrabble
# Stop / resume the retained application:
clever stop --alias skrabble
clever restart --alias skrabble
clever logs --alias skrabble
clever domain diag --alias skrabble
```

The app's required non-secret settings are:

```sh
clever env set CC_DOCKER_EXPOSED_HTTP_PORT 8080 --alias skrabble
clever env set CC_HEALTH_CHECK_PATH /skrabble/ --alias skrabble
clever scale --alias skrabble --flavor nano --build-flavor M --instances 1
```

To return to Clever Cloud, deploy the desired committed branch and verify the
provider URL before switching DNS. The custom domain remains attached to the
retained app. The Paris DNS target is **CNAME `games` →
`domain.par.clever-cloud.com`**, DNS only; use `clever domain diag` to confirm it.
Wait for valid custom-domain HTTPS before stopping the dev-01 container.
Never commit tokens or copy CLI authentication state.
