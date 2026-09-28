import { useApiResource } from './useApiResource';

/** The account the caller is, as the server names it. */
type SessionAccount = { id: number; displayName: string };

/**
 * Who is signed in, read from the server rather than out of the token.
 *
 * The name used to be taken from the JWT, which is free and needs no request — and
 * which is a snapshot from whenever the token was issued. A player who renames
 * would be greeted by the old name until their session expired, the browser could
 * print a name the server had never heard of, and there were two answers to who
 * this was: the one the server was using and the one a heading was printing.
 *
 * Before that it was kept in sessionStorage while the token sat in localStorage, so
 * a new tab or a pasted link had the token that proves who they are and no name to
 * go with it, and the sidebar said "your account" to a signed-in player. That is
 * the failure this fixes; the staleness is the one it does not introduce.
 *
 * The answer is null until it arrives rather than a placeholder string, because the
 * card at the foot of the sidebar is a control and a control that briefly says
 * "your account" is worse than one that is briefly blank. The card stays on screen
 * either way, so signing out never has to wait on this.
 */
export function useSessionAccount(): SessionAccount | null {
  const { data } = useApiResource<{ account: SessionAccount }>('/api/account');

  return data?.account ?? null;
}
