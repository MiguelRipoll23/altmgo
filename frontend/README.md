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
| `/dashboard/news`, `/admin/news` | the published news, newest first |
| `/dashboard/news/:id`, `/admin/news/:id` | one news item, on a page of its own so it can be linked to |
| `/dashboard/mail` | redirects to the inbox; the other mailboxes are `/dashboard/mail/outbox` and `/dashboard/mail/all` |
| `/dashboard/mail/inbox/:id`, `/dashboard/mail/outbox/:id`, `/dashboard/mail/all/:id` | one message, under the mailbox it was opened from |
| `/dashboard/survival/events`, `/dashboard/survival/teams` | the Survival schedule and the ladder, as two pages |
| `/dashboard/rankings/players`, `/dashboard/rankings/clans` | the player and clan boards, as two pages |
| `/admin/announcements/mail/:id` | one game master message, as it was sent to every inbox |
| `/admin` | the same overview read as the server rather than as the account, plus what is published |
| anything else | not found |

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
- **The dashboard publishes on arrival, and by refresh.** Signing in is what makes a game joinable,
  so the address is written when the page loads; the refresh button is the same work by hand, for a
  player who opened a game afterwards. Nothing publishes without a session token, so no prefetcher or
  scanner can act on a player's behalf.
