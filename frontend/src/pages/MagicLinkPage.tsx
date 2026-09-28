import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import {
  blockButtonClassName,
  panelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '../theme';
import { NotFoundPage } from './NotFoundPage';

/**
 * The shape a host code arrives in: four digits and nothing else, which is what
 * the lobby puts in the link it sends. Anything else on a single segment is a
 * mistyped path rather than a link.
 */
const codePattern = /^\d{4}$/;

type HostLinkResponse = {
  character: { id: number; name: string };
  address?: string;
};

/**
 * Where a host is sent by the lobby. Opening it names the character the code was
 * issued for; publishing sends this browser's public address, which is the one
 * fact only the visitor can supply.
 *
 * The write is a button rather than the page load because a preview crawler or a
 * link scanner must not be able to publish an address on a player's behalf.
 */
export function MagicLinkPage() {
  const { code } = useParams<{ code: string }>();
  const usableCode = codePattern.test(code ?? '');

  const [characterName, setCharacterName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: StatusKind; message: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  const path = `/api/magic-link/${code ?? ''}`;

  useEffect(() => {
    if (!usableCode) {
      return undefined;
    }

    let cancelled = false;
    setStatus({ kind: 'progress', message: 'Looking the link up…' });

    apiRequest<HostLinkResponse>(path)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setCharacterName(payload.character.name);
        setStatus(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({ kind: 'error', message: describeError(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, usableCode]);

  const publish = useCallback(async () => {
    setPublishing(true);
    setStatus({ kind: 'progress', message: 'Publishing your address…' });

    try {
      const payload = await apiRequest<HostLinkResponse>(path, { method: 'POST' });
      setCharacterName(payload.character.name);
      setAddress(payload.address ?? null);
      setStatus({ kind: 'success', message: 'Your game is now reachable from outside your network.' });
    } catch (error) {
      setStatus({ kind: 'error', message: describeError(error) });
    } finally {
      setPublishing(false);
    }
  }, [path]);

  if (!usableCode) {
    return <NotFoundPage />;
  }

  return (
    <PageLayout>
      <PageHeading
        subtitle={
          characterName === null
            ? 'Publishing the address your game is reachable at'
            : `This link belongs to ${characterName}`
        }
      />

      <div className={panelClassName}>
        <div className="space-y-4">
          {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

          {address === null ? null : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-slate-500">Published address</p>
              <p className="mt-1 font-mono text-sm text-slate-200">{address}</p>
            </div>
          )}

          {characterName === null ? (
            <Link to="/" className={`${secondaryButtonClassName} ${blockButtonClassName}`}>
              Back to the home page
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className={`${primaryButtonClassName} w-full`}
            >
              {address === null ? 'Publish my address' : 'Publish again'}
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Only the address the game is reached at is written. Anyone you send this link to can use it,
        so share it as you would a password.
      </p>
    </PageLayout>
  );
}
