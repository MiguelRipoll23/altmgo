import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { isBackendReachable } from '../api';
import { Button } from './ui/button';

/**
 * The one thing a visitor has to do before the site can work.
 *
 * The backend is on the tailnet, so a browser that has not joined it cannot
 * reach the API. This asks `/health` on load and, when the answer never comes,
 * says why rather than letting every page fail with the same generic error.
 * The retry is there because connecting to Tailscale happens after the page was
 * opened: once it is up, the visitor does not have to reload by hand.
 */
export function BackendHealthNotice() {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setReachable(await isBackendReachable());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (reachable !== false) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive backdrop-blur"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <p>
        Can't reach the AltMGO server. Connect to Tailscale, then reload this page.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => void check()}
        disabled={checking}
      >
        <RefreshCw className={checking ? 'animate-spin' : undefined} />
        Try again
      </Button>
    </div>
  );
}
