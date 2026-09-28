# AltMGO

The companion site for the AltMGO game server: accounts, the characters they own, and the page a
tailnet host is sent to so their game can be joined from outside their network.

Two deployments, one repository:

| folder | what it is | Vercel root directory |
| --- | --- | --- |
| `frontend/` | Vite + React + Tailwind single-page site | `frontend` |
| `backend/` | Hono API on Vercel Functions, reading the game's Neon database | `backend` |

They are **two Vercel projects**, because Vercel detects one framework per project and these are
two: the frontend is a static Vite build, the backend is a Hono app whose routes run as functions.

## What it does

- **Register and sign in** with the credentials the game itself uses. An account made here can be
  signed into in game and the other way round, because both store the same password digest over the
  same `accounts` row.
- **Dashboard** listing the account's characters, the public address each has published, and whether
  the game server is answering.
- **Host links.** A host whose game is reachable only on the tailnet the players share is sent a chat
  line in game: `Go to <site>/<code> to make your game available to join from other players outside
  your network`. Opening it publishes the visitor's public address for that character.

## Environment variables

Both projects read them from Vercel's project settings.

| project | name | what it is |
| --- | --- | --- |
| backend | `DATABASE_URL` | Neon connection string — the **pooled** one |
| backend | `JWT_SECRET` | the game server's own secret |
| backend | `SERVER_IP` | game server address, `host` or `host:port`, no scheme — optional, see below |
| frontend | `VITE_API_BASE_URL` | origin of the backend deployment, no trailing slash |

`JWT_SECRET` does double duty: it signs the site's session tokens, and it is the key the host-link
code is derived from. It must be the **same value the game server has**, or the codes the lobby
sends will not resolve. It is also the game's bearer-token signing key, so it is a real secret —
keep it in the Vercel environment, never in the repository.

## Local development

```sh
# backend
cd backend
cp .env.example .env          # fill in the three values
npm install
npm run dev                   # vercel dev, on http://localhost:3000

# frontend, in another shell
cd frontend
cp .env.example .env
npm install
npm run dev                   # vite, on http://localhost:5173
```

Point `VITE_API_BASE_URL` at `http://localhost:3000` while developing locally.

## Deploying

1. Push this folder to a Git repository.
2. Create a Vercel project for `backend/`, with **Root Directory** `backend`, and set the three
   environment variables. `DATABASE_URL` is the Neon connection string; Neon's pooled endpoint is
   the right one, because a function invocation is a connection.
3. Create a second project for `frontend/`, with **Root Directory** `frontend`, and set
   `VITE_API_BASE_URL` to the backend's production origin.
4. The framework presets are pinned in each `vercel.json`, so neither project needs build settings
   typed in by hand.

## The health check

The dashboard reports whether the game server is reachable. The check is relayed by the backend with
a plain `GET http://<SERVER_IP>/health` rather than asked from the browser: this site is served over
https and the game server answers plain http, so a browser would refuse the mixed request outright.

The game server grew a `/health` route for this, answered under an allow-all CORS policy. It returns
`{"status":"ok","timestamp":"..."}` and touches no store.

**`SERVER_IP` is optional, and on a tailnet-only deployment there is no right value for it.** When
the game server joins the players' tailnet rather than being exposed, nothing on the internet can
reach it, so the check can only report that it cannot ask. That is why an unset `SERVER_IP` answers
`{"online": false, "reason": "..."}` instead of failing — and why the dashboard shows the reason
rather than an error. Set it to the public address of the game server's HTTP API once that exists
(a tunnel, or a port forward); the deployed site then needs a redeploy to pick the value up.

## The host link contract

The code in the URL is derived, never stored, so it can only be resolved by someone holding the same
secret. In full:

1. `secret` is `JWT_SECRET` as UTF-8 bytes, `name` is the character's name as UTF-8 bytes, taken
   exactly and case included.
2. `digest = HMAC-SHA256(key = secret, message = name)`.
3. `value` = the first four bytes of `digest` read big-endian.
4. `code` = `value mod 10000`, as decimal with leading zeros to four digits.

| secret | name | code |
| --- | --- | --- |
| `secret` | `Snake` | `1068` |
| `secret` | `Raiden` | `5274` |
| `a-long-base64-secret` | `OCELOT` | `0150` |

A code is resolved **only against characters hosting a game right now** — the hosts of `games` rows
updated within the last hour. That is the whole reason four digits are enough: a handful of
concurrent hosts is a handful of codes, where the whole character table would collide constantly and
a code would stop naming one character. A code that matches two hosts is refused rather than
guessed.

The write is a single column:

```sql
update character_connections
set public_ip = :address, updated_at = now()
where character_id = :character_id
```

Only the address is corrected. The port the client listens on is already right, because the client
reports it itself; only the address the server saw was wrong, since it saw the tailnet one.

> **The link is a credential.** Anyone who has it can change that character's published address
> while that host is in a game, which is why the page asks before writing rather than writing on
> load — a prefetcher or a link scanner would otherwise be able to act on it.

The full contract, from the game server's side, is in that repository's `docs/HOST_LINKS.md`.
