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

  /** Address of the game server, host and port, without a scheme. */
  readonly serverIp: string;
};

/** Reads one setting, refusing a value that is absent or blank. */
function readSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

/** Reads every setting the backend runs on. */
export function readEnvironment(): Environment {
  return {
    databaseUrl: readSetting('DATABASE_URL'),
    jwtSecret: readSetting('JWT_SECRET'),
    serverIp: readSetting('SERVER_IP'),
  };
}
