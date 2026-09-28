import { Hono } from 'hono';
import type { AppBindings } from '../authentication';
import { readServerIp } from '../environment';

export const healthRoutes = new Hono<AppBindings>();

/** How long the game server is given to answer before it counts as away. */
const HealthTimeoutMilliseconds = 4000;

/**
 * Whether the game server is up.
 *
 * The question is asked from here rather than from the browser: the site is
 * served over https and the game server answers plain http, so a browser would
 * refuse the mixed request outright. Relaying it also keeps SERVER_IP on the
 * server, where a setting belongs.
 *
 * Every failure is a 200 carrying a reason, because "the game server is not
 * reachable from here" is an answer to the question the dashboard asked — not an
 * error in asking it.
 */
healthRoutes.get('/health', async (context) => {
  const startedAt = Date.now();
  const serverIp = readServerIp();

  if (!serverIp) {
    return context.json({
      online: false,
      status: null,
      latencyMilliseconds: 0,
      reason:
        'SERVER_IP is not set, so there is no address to ask. A server reachable only on the tailnet has none.',
    });
  }

  try {
    const response = await fetch(`http://${serverIp}/health`, {
      signal: AbortSignal.timeout(HealthTimeoutMilliseconds),
    });

    return context.json({
      online: response.ok,
      status: response.status,
      latencyMilliseconds: Date.now() - startedAt,
      reason: response.ok ? null : `The game server answered ${response.status}.`,
    });
  } catch {
    return context.json({
      online: false,
      status: null,
      latencyMilliseconds: Date.now() - startedAt,
      reason: `Nothing answered at http://${serverIp}/health.`,
    });
  }
});
