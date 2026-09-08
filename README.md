# Skrabble

A solo French word-tile game. Play at **https://games.tyrode.dev/skrabble/**.

## Play

The existing game starts with an empty bag. Enter **Draft**, choose 14 suggested
tiles (right-click selects a tile, or drag it into the draft area), then **Exit
Draft** and **Draw All**. Arrow keys move the selector, letters place tiles, Tab
changes direction, Backspace undoes a placement, and the green Play button scores
a valid word. The first word must cover the central star.

Once the page **and French dictionary** have loaded, play works without a network
connection in that open tab: drafting, drawing, word validation, and scoring are
all local. There is no account, database, or game backend. **Refreshing or
reopening offline is not supported, and reloading loses the current game.** No
service worker or saved-game feature is added by this deployment.

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

```sh
docker compose -f compose.dev.yaml up -d --build --wait
docker compose -f compose.dev.yaml logs -f game
# Stop without deleting the checkout or build caches:
docker compose -f compose.dev.yaml stop
# Resume:
docker compose -f compose.dev.yaml up -d --wait
```

Dependencies and `.next` use Docker volumes, separate from host installs.
After changing dependencies, update and commit `bun.lock`, then restart the
container to install the new frozen lockfile. Rebuild if changing its base image
or Dockerfile. Development and production recipes use the same default port;
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

## Local development

Use Bun 1.3.13 and Node 24 (the same versions/pins as the Docker build):

```sh
bun install --frozen-lockfile
bun run dev
# Open http://localhost:3000/skrabble/
bun run build
```

Production is served by the container, not `next start`: Next.js exports static
files to `out/`. The `/skrabble` mount is a build-time setting in `next.config.ts`;
the dictionary URL and Caddy route use the same prefix. The stale npm lockfile was
removed; `bun.lock` is authoritative. No gameplay redesign was made. Two
nullable-direction guards were required for TypeScript's production build;
browser metadata now describes the game. Next.js and React were updated to
patched versions before exposing the development server.
