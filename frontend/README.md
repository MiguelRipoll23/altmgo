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
| `/dashboard/mail` | redirects to the inbox; the other mailboxes are `/dashboard/mail/outbox` and `/dashboard/mail/all` |
| `/dashboard/mail/inbox/:id`, `/dashboard/mail/outbox/:id`, `/dashboard/mail/all/:id` | one message, under the mailbox it was opened from |
| `/dashboard/clans`, `/dashboard/clans/:id` | the clan directory, and one clan with its roster |
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
- **The dashboard publishes on arrival, and by refresh.** Signing in is what makes a game joinable,
  so the address is written when the overview loads; the button is the same work by hand, for a player
  who opened a game afterwards. Nothing publishes without a session token, so no prefetcher or
  scanner can act on a player's behalf.
- **"Discoverable" is a state, not a button.** When the write corrected an address, the button says
  so for fifteen seconds with a countdown rather than offering an action that would do nothing, and
  then goes back to offering itself. "Nothing was published" is reported as one of two sentences,
  because it means either that the stored address was already right — nothing to do — or that no
  character of the account has ever connected, in which case the reader's next step is to open a game
  and press the button again. The button stays pressable in both cases, because a disabled control
  tells the player to reload the page instead.
