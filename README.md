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
- **A dashboard** with a fixed sidebar of sections — overview, characters, news, mail, clans, games,
  survival, tournament and rankings — reading the game server's own tables. The overview leads with
  how many players are connected and which gameplay lobby each is in, taken from `character_presence`
  rather than from a total the server keeps, so the count and the list beside it are the same reading
  of the same moment. Only `type_id = 2` rows are listed: the gate and the account server are
  permanent services nobody plays on. It also shows the public address the signed-in account's most
  recently active character publishes, with a button to re-publish it after a network change.
- **Every page reads.** There is no control anywhere in the dashboard that changes what the server
  holds. That is deliberate rather than unfinished: the ladder, the bracket, the rosters, the news and
  the mail are all written by the game and the players, and a browser that could also write them
  would be a second source of truth for each — one the client knows nothing about, and whose next
  read contradicts it.
- **Every page is open to any signed-in account.** There are no roles, so there is no section that
  only one person may open and no permission the server has to look up before it can answer. The
  things an account may read about are its own characters and its own mail, and the queries name the
  account in the lookup rather than filtering afterwards, so another account's rows are never found.
- **The interface is shadcn/ui on Radix, with lucide icons.** The components live in
  `frontend/src/components/ui/` and the design tokens in `frontend/src/index.css`, so a colour is
  changed in one place rather than written into every page.
- **Making a game joinable.** A host whose game is reachable only on the tailnet the players share is
  sent a chat line in game: `Go to <site> and sign in to make your game joinable to other players
  outside your network`. Signing in publishes the caller's public address for every character of the
  account that has a connection row, and the dashboard says whether that made it discoverable.

## Environment variables

One project reads them from Vercel's project settings.

| name | what it is |
| --- | --- |
| `DATABASE_URL` | Neon connection string — the **pooled** one |
| `JWT_SECRET` | signs this site's session tokens |


`VITE_API_BASE_URL` is deliberately **not** set: with one origin the calls stay relative. It is still
honoured if it is set, which is what running the site and the API as two projects would need.

`JWT_SECRET` signs this site's own session tokens, and nothing outside this app verifies them — so it
does **not** have to be the game server's secret, and a value of its own is better. It is still a real
secret: it is what makes a token the backend issues unforgeable, so keep it in the Vercel
environment, never in the repository.

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

The write happens at `POST /api/auth/login`, and the response carries a `discoverable` boolean so the
page knows whether it had anywhere to write. It covers every character of the account that signed in
and holds a row in `character_connections` — that is, every character the game server has seen.
**The connection table is the only thing consulted.** A row there means there is an address to
correct; no row means there is no endpoint anyone will read, so nothing is written for it, and the
sign-in says so rather than treating it as a failure the player did nothing to cause.

The write is a no-op for a row that already holds the address, and the server says so by leaving that
character out of the list it answers with. That list is what tells the dashboard whether anything
actually happened, which is the difference between "your game is now discoverable" and a request that
was merely made: publishing happens on arrival, so without it every visit would claim a correction
that never occurred.

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
