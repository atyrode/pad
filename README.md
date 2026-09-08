# Skrabble

A solo French word-tile sandbox. Play at **https://games.tyrode.dev/skrabble/**.

Desktop first, keyboard primary, mouse drag-and-drop secondary. The current
manual/debug sandbox has drafting, drawing, placement, scoring, and board/tile
experiments—not a run, encounter map, shop, or progression loop.
See [SPEC.md](SPEC.md) for current rules, planned direction, and open decisions;
[AGENTS.md](AGENTS.md) is the short contributor guide.

## Play

The game starts with an empty bag. Enter **Draft**, then use **1 / 2 / 3** in the
focused draft area to choose an offered column (vowels occupy 1 and 3; the final
blank occupies 2). Right-clicking an offer or dragging it into the draft area also
works. After 14 picks, use **Exit Draft**, then **Draw All**; neither is automatic.

The game area receives focus on load; Tab or a click can return focus to it.
With that area focused:

- **Arrows** select/move a board cell; **letters** place a matching rack tile,
  falling back to a zero-point blank.
- **Tab** changes placement direction while a cell is selected.
  **Shift+Tab** leaves the game area; **Escape** clears selection and releases focus.
- **Backspace** recalls the latest pending placement; **Space** shuffles the rack;
  **Enter** commits a valid play. The first word must cover the central star.
- **Delete** discards the selected board tile, or the first rack tile when no cell
  is selected. Locked tiles cannot be discarded.

Draw, redraw, reset, mode, shuffle and Play controls are native keyboard-focusable
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

Use Bun 1.3.13 and Node 24 (matching the Docker build):

```sh
bun install --frozen-lockfile
bun run dev
# Open http://localhost:3000/skrabble/
bun run typecheck
bun run lint
bun run test
bun run check
bun run build
```

`check` runs typecheck, lint and tests; the static production build is a separate
gate. `.github/workflows/ci.yml` is configured to run both after a frozen install.
The app uses Next.js 16.3.4 and React 19.2.8. These commands and workflow describe
available checks, not a claim that CI or every browser scenario has passed.

Production is served by the container, not `next start`: Next.js exports static
files to `out/`. The `/skrabble` mount is a build-time setting in `next.config.ts`;
the dictionary URL and Caddy route use the same prefix. `bun.lock` is the
authoritative dependency lockfile.

## Headless TypeScript API

The browser and Bun use the same framework-free `src/game/game.ts` engine.
Callers supply a `ReadonlySet<string>` of uppercase dictionary words (or `null`
while unavailable, which prevents committing a play). For example, save this as
`example.ts` at the repository root and run `bun run example.ts`:

```ts
import { createGame, applyAction, evaluatePlay, type GameAction } from './src/game/game';

const dictionary: ReadonlySet<string> = new Set(
  (await Bun.file('public/dictionnary/french.txt').text()).split('\n')
    .map(word => word.trim().toUpperCase()).filter(Boolean),
);
let state = createGame(42);
function act(action: GameAction) {
  const result = applyAction(state, action, dictionary);
  if (!result.ok) throw new Error(result.reason);
  state = result.state;
}
act({ type: 'set-mode', mode: 'draft' });
for (let pick = 0; pick < 14; pick++) act({ type: 'draft-pick', column: pick === 13 ? 5 : 2 });
act({ type: 'set-mode', mode: 'game' });
act({ type: 'draw', count: 'all' });
console.log(evaluatePlay(state, dictionary));
```

This drafts and draws a rack; evaluation reports that no word is placed yet.
`applyAction` returns an accepted state or a rejection reason with unchanged state;
`evaluatePlay` exposes words, score breakdown and play eligibility. A seed plus
the same ordered actions reproduces state under the **same rules and lexicon**.
State is JSON-compatible plain data, not an implemented saved-game feature.
This is an in-process API, not an HTTP service, solver or persistence layer.

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

The image is a static Next.js export served by Caddy on port **8080**. Node and Bun
exist only in the build stage. Base images are digest-pinned, dependencies use
`bun.lock` with `--frozen-lockfile`, and Compose runs read-only, non-root, with no
Linux capabilities. There are no data volumes to migrate. `restart:
unless-stopped` restarts the container when Docker starts; ensure Docker itself
starts at boot (rootless Docker also needs user lingering).

To move hosts, clone this repository and run the same Compose commands, or
transfer the built image with `docker save` / `docker load` and start with
`docker compose up -d --no-build --wait`. Update the destination's HTTPS proxy and
DNS. Existing open tabs continue playing even when the service is stopped.

## Live development on dev-01

The live development checkout is `/home/alex/scrabble` on **dev-01**. Its source
is bind-mounted into the development container, so editing the checkout updates
the browser through Next.js Fast Refresh. **Ordinary edits need no commit, push,
image rebuild, or host activation.** This is deliberately a public development
server: visitors see work in progress and may see development error overlays.
The Next.js toolbar is hidden; Fast Refresh remains enabled.
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
After changing dependencies, update `bun.lock`, then restart the
container to install the new frozen lockfile. Commit only when requested.
Rebuild if changing its base image or Dockerfile.
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
