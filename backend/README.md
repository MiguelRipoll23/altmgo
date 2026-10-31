# altmgo backend

A Hono app deployed as the `mgo2-web-backend` container in the k3s cluster, serving
`https://raspberrypi.tailbb45e2.ts.net:10000`. `src/index.ts` is the app and `src/server.ts` is the container's
front door: it serves plain HTTP on 9090 and hands everything under `/api` to the app. The site is deployed
separately on Vercel and calls this origin.

## Endpoints

Everything lives under `/api`. The site and the API are on different origins, so the app allows the
cross-origin calls and the browser sends its token in an `Authorization` header.

Every route reads. There is no write here except the two that create a session and the one that
publishes a public address, and those three are the only things a signed-in account may change about
itself.

| method | path | what it does |
| --- | --- | --- |
| `POST` | `/api/auth/register` | creates the game's own account row |
| `POST` | `/api/auth/login` | returns a bearer token |
| `GET` | `/api/account` | who the caller is, read from the account row |
| `GET` | `/api/account/characters` | the signed-in account's characters |
| `GET` | `/api/account/characters/:id` | one of them in full |
| `POST` | `/api/addresses` | publishes the caller's address for the account's characters that have a connection row |
| `GET` | `/api/overview` | how many players are connected, and which lobby each is in |
| `GET` | `/api/server/pulse` | players online and total games, for the public front door |
| `GET` | `/api/games` | the game rooms that are up right now |
| `GET` | `/api/games/:id` | one current game, its stored settings and live roster |
| `GET` | `/api/lobbies` | the gameplay lobbies the server is serving |
| `GET` | `/api/clans` | the clan directory, filtered and ordered |
| `GET` | `/api/clans/:id` | one clan: its notice, roster and waiting applications |
| `GET` | `/api/clans/:id/emblem` | one clan's emblem, decoded to a 32×32 PNG; 404 when it has drawn none |
| `GET` | `/api/survival` | the Survival teams and their rosters |
| `GET` | `/api/tournament?event=N` | one Tournament event: registrations, bracket and fixtures |
| `GET` | `/api/events/:mode/teams` | the teams of any lobby mode |
| `GET` | `/api/events/:mode/schedules` | the events scheduled in one lobby mode |
| `GET` | `/api/news` | the published news, newest first |
| `GET` | `/api/news/:id` | one news item |
| `GET` | `/api/mail?box=inbox\|outbox\|all` | the account's own mail, from either side |
| `GET` | `/api/mail/:id` | one message, if it is in that account's mailbox |
| `GET` | `/api/rankings/players` | a window of a player board |
| `GET` | `/api/rankings/clans` | a window of a clan board |

Everything wants `Authorization: Bearer <token>` from `/api/auth/login` except the two `/api/auth`
routes.

## Layout

| file | what lives there |
| --- | --- |
| `src/index.ts` | the app itself: middleware, route mounting, the JSON error front, and the default export the container serves |
| `src/environment.ts` | the settings, each refused when absent |
| `src/database.ts` | the database client — Neon's HTTP driver for a Neon URL, node-postgres for any other Postgres — the unique-violation test and the raw-SQL escape hatch |
| `src/authentication.ts` | password hashing, session tokens, and the one middleware |
| `src/accounts.ts` | the `accounts` queries |
| `src/characters.ts` | the character list for the account's own dashboard |
| `src/clientAddress.ts` | the address a request arrived from, IPv4 only |
| `src/publicAddresses.ts` | an account's connected characters, and the public address write |
| `src/presence.ts` | the connected-player counts, the server totals and the lobby breakdown |
| `src/dashboardQueries.ts` | the game, lobby, survival and tournament reads |
| `src/newsQueries.ts` | the news list, and one news item by id |
| `src/mailQueries.ts` | a player's own mail, from either side of the delivery |
| `src/rankingsQueries.ts` | the five player boards and the three clan boards |
| `src/clanQueries.ts` | the clan directory, one clan's roster, and its emblem |
| `src/clanEmblem.ts` | the game's 768-byte emblem format: decode, and a PNG writer for the result |
| `src/routes/` | one file per group of routes |

## Notes worth keeping

- **The driver follows the URL.** A `*.neon.tech` URL uses Neon's HTTP driver; any other Postgres URL
  uses node-postgres, which is what the container deployment uses to read the game's own database in
  the cluster. Both are adapted to the same tagged-template surface, so no query knows which one
  answered it.
- **The password digest is the game's.** Accounts hold `md5(password)` in lowercase hex, because
  that is what the client sends and what the server stores. The site hashes the same way so the two
  share credentials. That is a deliberate property of the game, not a choice made here.
- **`HS256` is named on both sides.** `hono/jwt`'s `verify` requires an algorithm, and passing it is
  what stops a token from choosing its own; the game server's handler names it too.
- **The address is read from the forwarded header.** Vercel puts the visitor's address in
  `x-forwarded-for`; the container overwrites it with the socket address, which `externalTrafficPolicy:
  Local` keeps as the visitor's. Only IPv4 is accepted — the game stores the public address in a
  sixteen-byte field, so a v6 address has nowhere to go.
- **Errors are JSON.** `app.onError` answers with `{ "error": "..." }` so the pages can show the
  reason rather than parsing a Vercel error page. Those messages are written for the player.
- **There are no roles.** Every route above wants a valid token and nothing else, so there is no
  `account_roles` read, no per-request permission query, and no name to keep consistent with a
  login screen's badge. The permission a signed-in account has is the one it made for itself: its
  own characters, its own mail, and the server's public state.
- **A character read names its account in the query.** `findCharacterForAccount` takes the account as
  part of the lookup rather than checking the row afterwards, so somebody else's character is not
  found at all. A check that runs after the read is a check that can be forgotten.
- **The emblem is the game's own format, decoded here.** The client stores a clan's emblem as 768
  bytes: `EMBD` magic, a flag byte, 16 RGB palette entries, and 512 bytes holding 1024 four-bit pixel
  indices for a 32×32 image. Nothing in a browser can draw that, so `clanEmblem.ts` unpacks it and
  writes a PNG — which is a signature, three chunks and a CRC, about forty lines against a package
  larger than this backend. `node:zlib` does the only part that is not arithmetic.
- **The emblem is opaque on purpose.** The format has no transparent colour, and index 0 is whatever
  the clan drew its background as — white in one emblem on the live server and black in another.
  Treating that one index as transparent would punch a hole in whichever clan used it as a real
  colour, so the emblem is served exactly as stored.
- **Which half of a byte is the left pixel was measured, not guessed.** The client's notes do not say,
  and the two orders are exact horizontal mirrors, so a symmetric emblem cannot tell them apart. The
  reading is settled by what the stored bytes look like drawn: taking the high nibble first keeps the
  drawn `altmgo` emblem at 34 horizontal runs where the other reading shatters it into 70, keeps its
  perimeter at 140 rather than 212, and keeps the hand-painted red in the `test name` emblem as one
  connected blob of 124 pixels rather than six pieces. `EmblemLeftNibbleIsHigh` is the one line to
  change if an emblem ever renders mirrored against the game.
- **The emblem is its own route because an `<img>` cannot sign in.** The image a browser fetches by
  URL would carry no `Authorization` header, so the card fetches the PNG as a blob and shows it from
  an object URL. The directory carries only a `hasEmblem` boolean, since inlining ~700 characters of
  base64 per clan would mean carrying 150KB to draw a 32px square on the few cards that have one.

## Commands

```sh
npm install          # once, at the repository root — this is an npm workspace
npm run typecheck    # tsc --noEmit
npm run dev          # from this folder: build and serve on http://localhost:9090
```
