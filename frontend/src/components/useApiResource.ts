import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest, describeError } from '../api';
import { readSessionToken } from '../session';

/** What a page that loads something needs to know about it. */
export type Resource<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Reads the resource again, for a refresh button. */
  reload: () => void;
};

/**
 * Loads one resource from the API and tracks its state.
 *
 * A token the backend no longer accepts is not an error to report here: it is
 * the end of a session, and the sign-in page is where sessions end. The hook
 * answers that by loading nothing and leaving `data` null, and the page's own
 * guard sends the browser to sign in.
 */
export function useApiResource<T>(path: string | null): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiRequest<T>(path, { token: readSessionToken() })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }

        // A 401 is the session ending rather than a page with nothing to show,
        // so it is not rendered as a failure — the page redirects instead.
        if (!(caught instanceof ApiError && caught.status === 401)) {
          setError(describeError(caught));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  return { data, error, loading, reload };
}
