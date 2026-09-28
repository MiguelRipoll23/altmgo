# altmgo backend

A Hono app deployed as Vercel Functions. Vercel finds the app by the default export in
`src/index.ts` and sends every request to it, letting Hono's router match the path — so the
`vercel.json` here only pins the framework preset, and no build command or output directory is set.

## Endpoints

Everything lives under `/api`, and the folder is its own Vercel project, so the frontend reaches it
across origins.

| method | path | what it does |
| --- | --- | --- |
| `POST` | `/api/auth/register` | creates the game's own account row |
| `POST` | `/api/auth/login` | returns a bearer token and the account |
| `GET` | `/api/characters` | the signed-in account and its characters, with the address each published |
| `GET` | `/api/magic-link/:code` | names the character a host code belongs to, writing nothing |
| `POST` | `/api/magic-link/:code` | publishes the caller's address for that character |
| `GET` | `/api/health` | relays `GET http://<SERVER_IP>/health` |

`GET /api/characters` wants `Authorization: Bearer <token>` from `/api/auth/login`.

## Layout

| file | what lives there |
| --- | --- |
| `src/index.ts` | the entry point Vercel looks for |
| `src/app.ts` | middleware, route mounting, the JSON error front |
| `src/environment.ts` | the three settings, each refused when absent |
| `src/database.ts` | the Neon client and the unique-violation test |
| `src/authentication.ts` | password hashing, session tokens, the auth middleware |
| `src/accounts.ts` | the `accounts` queries |
| `src/characters.ts` | the character list for the dashboard |
| `src/hostLinkCode.ts` | the code derivation, and the address-reading helpers |
| `src/hostLinks.ts` | host resolution and the public address write |
| `src/routes/` | one file per group of routes |

## Notes worth keeping

- **The password digest is the game's.** Accounts hold `md5(password)` in lowercase hex, because
  that is what the client sends and what the server stores. The site hashes the same way so the two
  share credentials. That is a deliberate property of the game, not a choice made here.
- **`HS256` is named on both sides.** `hono/jwt`'s `verify` requires an algorithm, and passing it is
  what stops a token from choosing its own; the game server's handler names it too.
- **The address is read from the forwarded header.** Vercel terminates TLS in front of the function,
  so the socket address is the edge's, not the visitor's. Only IPv4 is accepted — the game stores the
  public address in a sixteen-byte field, so a v6 address has nowhere to go.
- **Errors are JSON.** `app.onError` answers with `{ "error": "..." }` so the pages can show the
  reason rather than parsing a Vercel error page. Those messages are written for the player.

## Commands

```sh
npm install
npm run dev        # vercel dev
npm run typecheck  # tsc --noEmit
```
