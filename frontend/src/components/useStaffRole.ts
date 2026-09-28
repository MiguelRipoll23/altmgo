import { isManager, isModerator, readSessionRoles } from '../session';

/**
 * Whether the reader holds a staff role, and so whether a page draws its controls.
 *
 * The role rather than the address, deliberately. Survival, Tournament, the clan
 * directory and the games are all reached from both frames, and keying the controls
 * to the admin prefix would mean the same page behaved differently depending on
 * which of two URLs to the same ladder the browser was on — a moderator who opened
 * the public ladder would be shown a ladder they could not act on, and one sent a
 * link to it from there would be shown the same ladder they could. The role is the
 * permission, and the server is what enforces it; this only decides what is drawn.
 *
 * Read once per render rather than held in state, because the roles only change when
 * somebody signs in, and signing in navigates — so the render that matters is the
 * one after it, and this runs then.
 */
export function useMayModerate(): boolean {
  return isModerator(readSessionRoles());
}

/** Whether the reader may act on what speaks for the server, rather than on an event. */
export function useMayManage(): boolean {
  return isManager(readSessionRoles());
}
