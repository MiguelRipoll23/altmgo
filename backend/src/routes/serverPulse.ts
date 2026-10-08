import { Hono } from 'hono';
import type { AppBindings } from '../authentication.js';
import { readServerFigures } from '../statsQueries.js';

export const serverPulseRoutes = new Hono<AppBindings>();

/** The one public number a visitor cares about before they sign in: is the server up, and is it being used. */
export type ServerPulse = {
  playersOnline: number;
  totalGames: number;
};

/**
 * The one public number a visitor cares about before they sign in: is the server up, and is it being used.
 *
 * It is the same query the overview runs, reused rather than rewritten, and it
 * reads one row so it does not introduce a new shape on the backend: the frontend
 * only ever asks one set of fields and gets one answer.
 */
serverPulseRoutes.get('/pulse', async (context) => {
  const figures = await readServerFigures();

  return context.json({
    playersOnline: figures.connectedPlayers,
    totalGames: figures.totalGames,
  });
});