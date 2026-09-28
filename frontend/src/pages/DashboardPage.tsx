import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiRequest, describeError } from '../api';
import { PageLayout, PlainHeading } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import { clearSessionToken, readSessionToken } from '../session';
import { panelClassName, secondaryButtonClassName } from '../theme';

/** One character and the address it has published. */
type Character = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  publicAddress: string | null;
  publicPort: number | null;
};

type CharactersResponse = {
  account: { id: number; displayName: string };
  characters: Character[];
};

type HealthResponse = {
  online: boolean;
  status: number | null;
  latencyMilliseconds: number;
  reason?: string | null;
};

/** The connection the game server is reached over, as the badge shows it. */
function healthClassName(health: HealthResponse | null): string {
  const base = 'rounded-lg border px-4 py-3 text-sm font-medium';

  if (health === null) {
    return `${base} border-slate-700 bg-slate-800/60 text-slate-300`;
  }

  return health.online
    ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
    : `${base} border-red-500/30 bg-red-500/10 text-red-300`;
}

/** What the badge says. */
function healthMessage(health: HealthResponse | null): string {
  if (health === null) {
    return 'Checking the game server…';
  }

  return health.online
    ? `Game server online, answered in ${health.latencyMilliseconds} ms`
    : `Game server unreachable${health.reason ? ` — ${health.reason}` : ''}`;
}

/** The signed-in view: who you are, what you own, and whether the server is up. */
export function DashboardPage() {
  const navigate = useNavigate();
  const token = readSessionToken();

  const [accountName, setAccountName] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      navigate('/signin', { replace: true });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = await apiRequest<CharactersResponse>('/api/characters', { token });
      setAccountName(payload.account.displayName);
      setCharacters(payload.characters);
    } catch (caught) {
      // A token the backend no longer accepts is not an error to report: it is
      // simply the end of a session, and the sign-in page is where sessions end.
      if (caught instanceof ApiError && caught.status === 401) {
        clearSessionToken();
        navigate('/signin', { replace: true });
        return;
      }

      setError(describeError(caught));
    } finally {
      setLoading(false);
    }

    // Asked separately, and never allowed to fail the page: an unreachable game
    // server is a fact worth showing, not a reason to show nothing at all.
    try {
      setHealth(await apiRequest<HealthResponse>('/api/health'));
    } catch {
      setHealth({ online: false, status: null, latencyMilliseconds: 0 });
    }
  }, [navigate, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageLayout width="wide">
      <PlainHeading
        title={accountName === null ? 'Your characters' : `Signed in as ${accountName}`}
        subtitle="Every character you own, with the address the game is reachable at from outside your network."
      />

      <div className="space-y-4">
        <div className={healthClassName(health)}>{healthMessage(health)}</div>

        {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

        {loading && characters.length === 0 ? (
          <StatusMessage kind="progress">Loading your characters…</StatusMessage>
        ) : null}

        {!loading && characters.length === 0 && error === null ? (
          <StatusMessage kind="progress">
            This account has no characters yet. Create one in game and it will appear here.
          </StatusMessage>
        ) : null}

        {characters.map((character) => (
          <div key={character.id} className={panelClassName}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{character.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Rank {character.rank} · {character.experience} experience
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  character.publicAddress
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-400'
                }`}
              >
                {character.publicAddress ? 'Address published' : 'No address yet'}
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-slate-500">Public address</p>
              <p className="mt-1 font-mono text-sm text-slate-200">
                {character.publicAddress ?? 'Not registered yet'}
                {character.publicAddress && character.publicPort
                  ? `:${character.publicPort}`
                  : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={secondaryButtonClassName}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearSessionToken();
            navigate('/', { replace: true });
          }}
          className={secondaryButtonClassName}
        >
          Sign out
        </button>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Wrong or missing address? Open a game in the lobby and use the link it sends you in chat.
      </p>
    </PageLayout>
  );
}
