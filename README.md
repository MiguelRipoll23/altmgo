# AltMGO

The companion site for the AltMGO game server: accounts, the characters they own, and the page a
tailnet host is sent to so their game can be joined from outside their network.

One repository, one Vercel project, one origin:

| folder | what it is |
| --- | --- |
| `frontend/` | Vite + React + Tailwind single-page site, built to `frontend/dist` and served as static files |
| `backend/` | Hono app, reading the game's Neon database |
| `api/` | the deployment's one function: a catch-all that hands every `/api/...` request to the Hono app |

`vercel.json` at the root builds the site, serves `frontend/dist`, and wires the two together. Because
the site and the API share an origin, the browser calls `/api/...` directly: there is no cross-origin
request to allow, no build-time API origin to set, and — the reason it matters most here — the address
the site publishes is read from the request's own connection rather than through a proxy hop that
would have to be trusted to pass it along.

## What it does

- **Register and sign in** with the credentials the game itself uses. An account made here can be
  signed into in game and the other way round, because both store the same password digest over the
  same `accounts` row.
- **A dashboard** with a sidebar of sections — overview, characters, games, survival, tournament and
  rankings — reading the game server's own tables. The overview leads with how many players are
  connected and which lobby each is in, taken from `character_presence` rather than from a total the
  server keeps, so the count and the list beside it are the same reading of the same moment.
- **Moderator and manager tooling.** A moderator can form a survival team, put a character on one
  (which is how a `server-` prefixed character from a dedicated match room joins — there is no client
  on the other end of a room nobody is sitting at), change a team or member state, and publish an
  event so it becomes enterable. A manager holds every one of those and can additionally write an
  official message into a Discord channel.
- **Making a game joinable.** A host whose game is reachable only on the tailnet the players share is
  sent a chat line in game: `Go to <site> and sign in to make your game joinable to other players
  outside your network`. Signing in publishes the caller's public address for every character of the
  account that has a connection row, and the dashboard says whether that made it discoverable.

## Who may do what

The staff surface is decided by one table, `account_roles`, holding one row per account per role. It
was a single integer column on `accounts` before this change, which could only ever say "one of
these", and every reader had to agree what each number meant — the change is what lets a dashboard
ask "is this a moderator" and be answered.

A **manager holds every moderator permission**. A manager is somebody who has been trusted with the
moderation work as well, so making them re-approve the same actions under a second role would be
ceremony rather than safety. The two names are still kept apart wherever the distinction is the point.

Granting a role is a row:

```sql
insert into account_roles (account_id, role) values (:account, 'moderator')
```

The dashboard reads the roles on every request rather than trusting them from the session token, so a
revoked role stops working at once instead of whenever the token it was minted into expires. The
browser is told the roles at sign-in so the sidebar can show the sections that account may open, but
that is a hint and never the permission.

## Environment variables

One project reads them from Vercel's project settings.

| name | what it is |
| --- | --- |
| `DATABASE_URL` | Neon connection string — the **pooled** one |
| `JWT_SECRET` | signs this site's session tokens |
| `DISCORD_BOT_TOKEN` | bot token the manager writes official messages from — optional |

`VITE_API_BASE_URL` is deliberately **not** set: with one origin the calls stay relative. It is still
honoured if it is set, which is what running the site and the API as two projects would need.

`JWT_SECRET` signs this site's own session tokens, and nothing outside this app verifies them — so it
does **not** have to be the game server's secret, and a value of its own is better. It is still a real
secret: it is what makes a token the backend issues unforgeable, so keep it in the Vercel
environment, never in the repository.

`DISCORD_BOT_TOKEN` is optional. With it absent, the Discord message control is refused rather than
failing halfway through a send. It is a token of *this* deployment: the game server holds one of its
own for its slash commands, and publishing that one here would hand the bot to every signed-in
moderator.

## Local development

```sh
npm install                   # once, at the root — this is an npm workspaces repo

cd backend && cp .env.example .env    # DATABASE_URL, JWT_SECRET, SERVER_IP
cd frontend && cp .env.example .env   # VITE_API_BASE_URL, see below

npm run dev                   # vite, on http://localhost:5173

# the API, in another shell, from the root
vercel dev                    # on http://localhost:3000
```

Locally the two run on two ports, so they are two origins and the frontend needs
`VITE_API_BASE_URL=http://localhost:3000` to reach the API. Deployed they are one origin, and that is
exactly why the variable is unset there.

## Deploying

1. Push this folder to a Git repository.
2. Import it into Vercel as **one project**, with the repository root as the root directory — that is
   where `vercel.json`, `api/` and the workspaces `package.json` live.
3. Set `DATABASE_URL` and `JWT_SECRET`. `DATABASE_URL` is the Neon connection string; Neon's pooled
   endpoint is the right one, because a function invocation is a connection.
4. Nothing else is typed in by hand: `vercel.json` pins the build command, the output directory and
   the route order below.

## How the two halves are wired at the edge

`vercel.json` lists its rewrites in the order they are applied, and the order is the whole point:

1. `/api/(.*)` → the function. Without this rule only **one** path segment reaches the app: Vercel's
   own route for the catch-all function covers `/api/<segment>` and answers every deeper path with a
   404, so `/api/auth/login` would never arrive.
2. `/(.*)` → `/index.html`, so a deep link like `/dashboard` loads the site and the browser routes it.
   It has to come second — it matches `/api/...` too, and the first rule that matches wins.

## Publishing the address

A host's game is reachable at the address the game server saw their client at — which on a tailnet is
the tailnet address, reachable by the players and by nobody else. Signing in corrects it: the site
reads the address the request arrived from and writes it where the game server hands it out.

The write covers every character of the account that signed in and holds a row in
`character_connections` — that is, every character the game server has seen. **The connection table
is the only thing consulted.** A row there means there is an address to correct; no row means there is
no endpoint anyone will read, so nothing is written for it.

Whether the character is in a room is deliberately **not** asked. The row outlives the room, the game
server overwrites the address when a client registers its endpoint and again when a host's own game
server starts, and a game opened after signing in is a reason to press refresh rather than a reason
the sign-in did nothing:

```sql
update character_connections
set public_ip = :address, updated_at = now()
where character_id = :character_id
```

Only the address is corrected. The port the client listens on is already right, because the client
reports it itself; only the address the server saw was wrong, since it saw the tailnet one.

Three properties of the address are worth knowing, because they are what the design is:

- It is the **caller's**, read from the request the browser sent. Nobody can publish an address for
  somebody else's game, and a token is the whole permission.
- It is **IPv4 only**. The game stores the address in a sixteen-byte field, so a v6 connection has
  nowhere to publish and is refused rather than truncated.
- It is **superseded by the game server**. The server writes what it saw when a client registers its
  endpoint, and again when a host's own game server starts, so a corrected address survives only
  until one of those happens again. That is why the dashboard keeps a refresh button: open the game,
  then press it.
