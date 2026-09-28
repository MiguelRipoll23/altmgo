# altmgo frontend

Vite + React + Tailwind single-page site. It is built by the `vercel.json` at the repository root,
which also carries the rewrite that sends every path to `index.html`, because routing happens in the
browser. There is deliberately no `vercel.json` here: this app is not deployed on its own.

## Pages

| path | what it is |
| --- | --- |
| `/` | the front door: sign in or register |
| `/register` | creates the account the game logs in with |
| `/signin` | signs in and keeps the bearer token |
| `/dashboard` | the server's figures and the caller's published address, whose tile carries the update button |
| `/dashboard/characters`, `/dashboard/characters/:id` | the caller's own characters, and one of them in full |
| `/dashboard/news`, `/dashboard/news/:id` | the published news, and one item on a page of its own so it can be linked to |
| `/dashboard/mail` | redirects to the inbox; the other mailbox is `/dashboard/mail/outbox` |
| `/dashboard/mail/inbox/:id`, `/dashboard/mail/outbox/:id` | one message, under the mailbox it was opened from |
| `/dashboard/clans`, `/dashboard/clans/:id` | the clan directory as cards carrying each clan's own emblem, and one clan with its roster |
| `/dashboard/games` | the game rooms that are up right now |
| `/dashboard/survival/events`, `/dashboard/survival/events/:id`, `/dashboard/survival/teams` | the Survival schedule, one event, and the ladder |
| `/dashboard/tournament`, `/dashboard/tournament/:id{,/bracket,/fixtures}` | the tournament list, and one event's registrations, bracket and fixtures |
| `/dashboard/rankings/players`, `/dashboard/rankings/clans` | the player and clan boards, as two pages |
| anything else | not found |

Every one of these reads. There is no control on any page that changes what the server holds, because
a value written in the browser is a second source of truth for something the game is already the
source of, and the two disagree the moment the client acts on its own copy.

## Styling

`src/theme.ts` holds the class strings the pages share, and `src/index.css` defines the `mgo` accent
in Tailwind's `@theme`. Both are lifted from the home page the game server itself serves, so the two
look like one site.

## Environment

| name | what it is |
| --- | --- |
| `VITE_API_BASE_URL` | origin of the API, no trailing slash. Deliberately unset in production, where the site and the API share an origin and the calls stay relative; set it to `http://localhost:3000` to develop against a local API |

## Commands

```sh
npm install          # once, at the repository root — this is an npm workspace
npm run dev          # vite, on http://localhost:5173
npm run build        # tsc --noEmit && vite build
npm run typecheck
```

## Notes worth keeping

- **The token is in localStorage.** It is a bearer token with no cookie behind it, so it cannot be
  marked httpOnly and localStorage is the only place a page can keep one across reloads. A token the
  backend stops accepting is treated as the end of a session, not as an error to display.
- **The account name comes from the server, not the token.** The token carries a display name as a
  claim, but that is a snapshot from whenever it was issued, so a renamed account would be greeted by
  the old one until the session expired. `GET /api/account` reads the row instead, and the sidebar
  waits for it rather than printing the name it happened to be given.
- **Signing in publishes the address, and says whether it could.** `POST /api/auth/login` writes the
  caller's address for every character that has a connection row and answers with a `discoverable`
  boolean — true when the account has such a character at all. Nothing publishes without a session
  token, so no prefetcher or scanner can act on a player's behalf.
- **"Discoverable" is a state, not a button.** For fifteen seconds after a discoverable sign-in the
  overview's address tile says so rather than offering an action that would do nothing, and then goes
  back to offering itself. It says only that — no counter, since a number to watch is a thing to wait
  on rather than a thing to read. The answer is held in a module variable, not in
  `localStorage`, so a reload drops it — a reader who reloads is saying they are no longer looking at
  the moment they arrived at. The window is counted from a wall-clock deadline rather than by
  decrementing a number, so a browser throttling timers in a background tab cannot stretch it.
- **An account with no connection row still gets the button.** That is the only case where it is
  worth anything: the fix is to open a game and press it, and a disabled control cannot deliver that.
  A publish that corrected nothing reports one of two sentences, because it means either that the
  stored address was already right — nothing to do — or that no character has ever connected, which
  needs the opposite of doing nothing.
- **The clans are cards because a clan is recognised, not scanned.** The emblem the clan drew in the
  game is the one part of it that is not a figure, and a table has nowhere to put a picture — so the
  emblem had no place on the page at all until the directory became a grid. The band is square
  because the emblem is 32×32, and the emblem is held to its own pixels rather than scaled smoothly,
  since a 32×32 drawing interpolated to four times its size is a blur. A clan that drew nothing, and
  one whose emblem fails to load, both show a flag: a broken-image icon would say less about the clan
  than the icon that stands in for every clan the game has no emblem for.
- **The emblem is fetched as a blob, not pointed at.** An `<img src>` cannot send the session token,
  so the card calls `apiBlob` — the one response the API serves that is not JSON — and shows the
  result from an object URL, which is revoked when the card goes away rather than left to the
  collector. The directory carries only a `hasEmblem` boolean and the picture is asked for just for
  the clans that have one.
