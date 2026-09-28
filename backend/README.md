# altmgo backend

A Hono app deployed as the one function the site runs. `src/index.ts` default-exports the app, the
repository root's `api/[...path].ts` re-exports that default, and the `vercel.json` there routes every
`/api/...` request to it — letting Hono's own router match the path, so this folder holds no Vercel
configuration of its own.

## Endpoints

Everything lives under `/api`. The site and the API share an origin, so the frontend calls it
relatively and the browser reaches the function directly.

| method | path | what it does |
| --- | --- | --- |
| `POST` | `/api/auth/register` | creates the game's own account row |
| `POST` | `/api/auth/login` | returns a bearer token, the account and its roles |
| `GET` | `/api/characters` | the signed-in account and its characters, with the address each published |
| `POST` | `/api/addresses` | publishes the caller's address for the account's characters that have a connection row |
| `GET` | `/api/overview` | how many players are connected, and which lobby each is in |
| `GET` | `/api/characters/:id` | one character's profile |
| `GET` | `/api/games` | the game rooms that are up right now |
| `GET` | `/api/survival` | the Survival teams and their rosters |
| `GET` | `/api/tournament?event=N` | one Tournament event: registrations, bracket and fixtures |
| `GET` | `/api/events/:mode/schedules` | the events scheduled in one lobby mode |
| `GET` | `/api/rankings/players` | a window of a player board |
| `GET` | `/api/rankings/clans` | a window of a clan board |

Everything wants `Authorization: Bearer <token>` from `/api/auth/login` except the two `/api/auth`
routes and the two in `characterRoutes` that the player's own account needs.

### The staff routes

The staff surface is grouped by what it may do rather than by what it acts on, and each group
checks its own role:

| method | path | role | what it does |
| --- | --- | --- | --- |
| `POST` | `/api/moderator/teams` | moderator | forms a team in a lobby mode |
| `POST` | `/api/moderator/teams/:id/members` | moderator | puts a character on a team by name — the path that admits a `server-` one |
| `PUT` | `/api/moderator/teams/:id/members/:slot` | moderator | sets a member's state |
| `PUT` | `/api/moderator/teams/:id/state` | moderator | sets a team's state |
| `POST` | `/api/moderator/schedules` | moderator | publishes an event, which is what makes it enterable |
| `DELETE` | `/api/moderator/schedules/:id` | moderator | withdraws an event |
| `GET` | `/api/manager/discord` | manager | whether this deployment can write to Discord |
| `POST` | `/api/manager/discord/messages` | manager | writes a message from the bot into a channel |

A **manager holds every moderator permission**: a manager is somebody who has been trusted with the
moderation work as well, so making them re-approve the same actions under a second role would be
ceremony rather than safety. The two names are still checked separately wherever the distinction is
the point — the dashboard shows which one an account holds, and granting one does not grant the
other.

## Layout

| file | what lives there |
| --- | --- |
| `src/index.ts` | the app itself: middleware, route mounting, the JSON error front, and the default export Vercel takes |
| `src/environment.ts` | the settings, each refused when absent |
| `src/database.ts` | the Neon client, the unique-violation test and the raw-SQL escape hatch |
| `src/authentication.ts` | password hashing, session tokens, and the three middlewares |
| `src/roles.ts` | the staff role names, the `account_roles` read, and the two predicates |
| `src/accounts.ts` | the `accounts` queries |
| `src/characters.ts` | the character list for the player's own dashboard |
| `src/clientAddress.ts` | the address a request arrived from, IPv4 only |
| `src/publicAddresses.ts` | an account's connected characters, and the public address write |
| `src/presence.ts` | the connected-player counts and the lobby breakdown |
| `src/dashboardQueries.ts` | the character, game, survival and tournament reads |
| `src/rankingsQueries.ts` | the five player boards and the three clan boards |
| `src/moderationWrites.ts` | the writes a moderator makes, each refusing with a reason |
| `src/discord.ts` | the manager's Discord write, made server-side |
| `src/routes/` | one file per group of routes |

## Notes worth keeping

- **The password digest is the game's.** Accounts hold `md5(password)` in lowercase hex, because
  that is what the client sends and what the server stores. The site hashes the same way so the two
  share credentials. That is a deliberate property of the game, not a choice made here.
- **`HS256` is named on both sides.** `hono/jwt`'s `verify` requires an algorithm, and passing it is
  what stops a token from choosing its own; the game server's handler names it too.
- **The address is read from the forwarded header.** Vercel terminates TLS in front of the function,
  so the socket address is the edge's, not the visitor's. Only IPv4 is accepted — the game stores the
  public address in a sixteen-byte field, so a v6 address has nowhere to go. Sharing an origin with
  the site is what keeps this honest: the browser calls the function directly, so the forwarded header
  names the visitor rather than an intermediate deployment.
- **Errors are JSON.** `app.onError` answers with `{ "error": "..." }` so the pages can show the
  reason rather than parsing a Vercel error page. Those messages are written for the player.
- **Roles are read per request, not from the token.** The token names the account and nothing about
  its permissions, so a revoked role stops working immediately rather than whenever the token it was
  minted into happens to expire. A role written into the token would be a claim the account could
  keep presenting for a week after being demoted. The browser is told the roles at sign-in so the
  sidebar can show the sections it may open, but that is a hint: every route reads them again, and an
  edited role list in local storage buys nothing.
- **A role is a name, not a number.** `account_roles` holds one row per account per role. It was a
  single integer column on `accounts` before, which could only ever say "one of these" — and every
  reader then had to agree what each number meant, which is the thing that made the column
  unreadable without a lookup table nobody had written down. A manager outranks a moderator by
  holding both, which is what makes the hierarchy a fact about the roles rather than a comparison
  scattered across the code.

## Commands

```sh
npm install          # once, at the repository root — this is an npm workspace
npm run typecheck    # tsc --noEmit
vercel dev           # from the repository root, on http://localhost:3000
```
