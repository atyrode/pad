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

## Current hosting: Clever Cloud

The `skrabble` Docker application is in the **Tyrode** organization. `.clever.json`
is the CLI-generated application link (IDs and deployment URLs, no credentials).
Clever Cloud builds the same `Dockerfile` directly; it does not run Compose.
HTTPS is managed by the provider. The runtime is one nano instance; builds use a
dedicated M instance, so Next.js does not have to build within the small runtime's
memory limit.

With an authorized [Clever Tools](https://www.clever.cloud/developers/doc/cli/)
session, from this repository:

```sh
# Deploy the current committed branch (uncommitted changes are not deployed):
clever deploy --alias skrabble
# Stop / start independently of your development computer:
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

To recreate on Clever Cloud rather than reuse the linked application, create a
new Docker app with `clever create --type docker skrabble --org Tyrode --alias
skrabble-new`, apply the settings above with the new alias, and deploy. Attach
`games.tyrode.dev` to the new app, removing its association from the old app first
if necessary. In Cloudflare DNS, the current record is **CNAME `games` →
`domain.par.clever-cloud.com`**, DNS only. `clever domain diag` reports the correct
target for another region. Never commit tokens or copy CLI authentication state.

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
removed; `bun.lock` is authoritative. No gameplay redesign or dependency upgrade
was made. Two nullable-direction guards were required for TypeScript's production
build; browser metadata now describes this game rather than the original starter.
