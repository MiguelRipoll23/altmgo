# AltMGO

The companion site for the AltMGO game server: accounts, the characters they own, and the page a
tailnet host is sent to so their game can be joined from outside their network.

One repository, two deployments:

| folder | what it is |
| --- | --- |
| `frontend/` | Vite + React + Tailwind single-page site, deployed to Vercel as static files |
| `backend/` | Hono app over the game's Postgres, deployed to k3s as `mgo2-web-backend` |
| `deploy/` | the k3s Deployment and Service for the backend |

The site is on Vercel and the API is a TLS container in the cluster, reached at
`https://raspberrypi.tailbb45e2.ts.net:10000`. Every browser call is therefore cross-origin and carries the
`/api` prefix, which the app's CORS middleware allows. On load the frontend calls `/health`; when the
backend cannot be reached it tells the visitor to connect to Tailscale rather than failing page by
page. The address the site publishes is read from the socket the request arrived on — the Service
keeps it with `externalTrafficPolicy: Local` — rather than through a proxy hop that would have to be
trusted to pass it along.

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

The Vercel project runs the site and needs no variables; its default API origin is the cluster's
backend. `VITE_API_BASE_URL` is still honoured and is what a local frontend sets to reach a backend
on another port.

The `mgo2-web-backend` Deployment reads these from the `mgo2-web-secrets` secret in the `mgo2`
namespace:

| name | what it is |
| --- | --- |
| `DATABASE_URL` | the game's Postgres URL, e.g. `postgresql://user:password@mgo2-postgres:5432/mgo2` |
| `JWT_SECRET` | signs this site's session tokens |

`JWT_SECRET` signs this site's own session tokens, and nothing outside this app verifies them — so it
does **not** have to be the game server's secret, and a value of its own is better. It is still a real
secret: it is what makes a token the backend issues unforgeable, so keep it in the secret, never in
the repository.

## Local development

```sh
npm install                   # once, at the root — this is an npm workspaces repo

cd backend && cp .env.example .env    # DATABASE_URL, JWT_SECRET
cd frontend && cp .env.example .env   # VITE_API_BASE_URL=http://localhost:9090

npm run dev                   # vite, on http://localhost:5173

# the API, in another shell
npm run dev --workspace backend      # builds and serves on http://localhost:9090
```

Locally the backend runs without TLS, so the frontend's `VITE_API_BASE_URL` is
`http://localhost:9090`. Deployed, the frontend defaults to `https://raspberrypi.tailbb45e2.ts.net:10000` and the
variable is unset.

## Deploying

The site and the API are deployed separately.

**Frontend (Vercel).** Import the repository root as one Vercel project. `vercel.json` pins the build
command and the output directory, and the only rewrite sends every path to `index.html` so a deep
link like `/dashboard` loads the site. No environment variables are required.

**Backend (k3s).**

1. Build the image from the repository root and load it into the cluster's containerd:
   ```sh
   docker build -t mgo2-web-backend:local .
   docker save mgo2-web-backend:local | sudo k3s ctr images import -
   ```
2. Create the `mgo2-web-secrets` secret if it does not exist yet (see the comments in
   `deploy/backend/kustomization.yaml`).
3. Apply the Deployment and Service:
   ```sh
   sudo kubectl apply -f deploy/backend/kustomization.yaml
   ```
   The Service is a `LoadBalancer` on the node's address, port 9090, over plain HTTP. A Tailscale
   Funnel publishes it on 10000, and the Funnel is the only thing terminating TLS in front of it.

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
