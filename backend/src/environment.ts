/**
 * Settings the backend runs on. Every one is an environment variable of the
 * Vercel project, and each is read when it is needed rather than at import
 * time: a serverless function is started per invocation, so a value that is
 * absent should fail the request that wanted it instead of the whole module.
 */
export type Environment = {
  /** Neon connection string. */
  readonly databaseUrl: string;

  /** Key the session tokens are signed with, and the host-link codes derived from. */
  readonly jwtSecret: string;
};

/** Reads one setting, refusing a value that is absent or blank. */
function readSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

/** Reads the settings every request needs. */
export function readEnvironment(): Environment {
  return {
    databaseUrl: readSetting('DATABASE_URL'),
    jwtSecret: readSetting('JWT_SECRET'),
  };
}

/**
 * The game server's address, when one is configured.
 *
 * It is optional deliberately. A deployment can be reachable only on the tailnet
 * the players share — the game server joins it rather than being exposed — and
 * then there is no address an internet-hosted function can ask. A health check
 * that says so is more useful than one that refuses to start.
 *
 * Accepts `host` or `host:port`, with or without a scheme.
 */
export function readServerIp(): string | undefined {
  const address = process.env.SERVER_IP?.trim();
  if (!address) {
    return undefined;
  }

  return address.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
