# altmgo frontend

Vite + React + Tailwind single-page site. Vercel detects the Vite preset, and `vercel.json` pins it
and adds the rewrite that sends every path to `index.html`, because routing happens in the browser.

## Pages

| path | what it is |
| --- | --- |
| `/` | the front door: sign in or register |
| `/register` | creates the account the game logs in with |
| `/signin` | signs in and keeps the bearer token |
| `/dashboard` | the account's characters, each one's published address, and whether the game server answers |
| `/:code` | the host link: exactly four digits |
| anything else | not found |

The single-segment route is the host link and it decides for itself whether the segment is a code;
the named routes above win by being static, which is what keeps `/dashboard` a page rather than a
code that happens to be spelled that way.

## Styling

`src/theme.ts` holds the class strings the pages share, and `src/index.css` defines the `mgo` accent
in Tailwind's `@theme`. Both are lifted from the home page the game server itself serves, so the two
look like one site.

## Environment

| name | what it is |
| --- | --- |
| `VITE_API_BASE_URL` | origin of the backend deployment, no trailing slash. Unset keeps calls relative, for a single-origin deployment |

## Commands

```sh
npm install
npm run dev        # vite, on http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

## Notes worth keeping

- **The token is in localStorage.** It is a bearer token with no cookie behind it, so it cannot be
  marked httpOnly and localStorage is the only place a page can keep one across reloads. A token the
  backend stops accepting is treated as the end of a session, not as an error to display.
- **The health check is relayed by the backend.** The browser cannot call it directly: this site is
  https and the game server answers plain http, and a mixed request is refused before it leaves.
- **The host link writes on a button, not on load.** A prefetch or a link scanner must not be able to
  publish an address on a player's behalf.
