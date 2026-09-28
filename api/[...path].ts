import application from '../backend/src/index.js';

/**
 * The one function this deployment runs.
 *
 * Vercel turns every file under `api/` into a function and routes to it by path,
 * so a catch-all file answers everything under `/api` and the Hono app — which
 * already routes `/api/...` itself — needs nothing else.
 *
 * Sharing an origin with the site is what makes the rest work: the browser calls
 * this function directly, so there is no cross-origin request to allow and the
 * player's address is read from the request's own connection rather than from a
 * proxy hop that would have to be trusted to pass it along.
 */
export default application;
