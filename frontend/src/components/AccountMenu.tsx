import { ChevronUp, LogOut, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearSessionToken, type StaffRole } from '../session';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

/**
 * Who is signed in, at the foot of the sidebar, and what that account may do.
 *
 * It is a card that opens rather than a panel that is always there because the
 * two facts it carries are read once and then never again: the name, when
 * signing in, and the roles, when working out why a control is missing. Leaving
 * them in view spends the top of every page on a heading nobody reads, and the
 * sign-out button is the one control that has to be reachable from every screen
 * rather than the one that deserves permanent space.
 *
 * The roles are shown inside the menu only, because the menu is where the
 * question "why is that button not there" is answered, and answering it takes
 * the two facts together. A second line of role text under the name would say the
 * same thing on every page of both frames in a place nobody looks, so the closed
 * card carries the name and nothing else, set to the same measure as the section
 * links above it because the account name is a heading rather than a figure.
 */
export function AccountMenu({
  accountName,
  roles,
  frame,
}: {
  /**
   * The name to show, or nothing while the server is being asked for it.
   *
   * It is drawn as a placeholder bar rather than as words, because a control that
   * briefly says "your account" to somebody who is signed in is a lie told in the
   * one place on the page that is about who they are, and a blank one is only a
   * moment of a request already in flight.
   */
  accountName: string | null;
  roles: StaffRole[];
  /**
   * The way out of the frame this menu is drawn in, when there is one.
   *
   * The dashboard and the admin dashboard are two frames over one account, so the
   * card that says who is signed in is also where the switch between them belongs:
   * it is the one control that is present on every page of both, and the reason to
   * make it a menu rather than a fixed link is that a player has no use for the
   * admin frame at all — the item is drawn only where it leads somewhere.
   */
  frame?: { to: string; label: string; icon: LucideIcon };
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={accountName === null ? 'Account and roles' : `${accountName}, account and roles`}
      >
        {accountName === null ? (
          // `flex-1` rather than a fixed width, so the chevron is already where it
          // is going to be and the card does not move under the reader's cursor as
          // the name arrives.
          <span
            className="h-4 w-24 max-w-full flex-1 animate-pulse rounded bg-muted"
            aria-hidden="true"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{accountName}</span>
        )}
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium text-foreground">
            {accountName ?? 'Signed in'}
          </span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            Signed in
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {roles.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">This account holds no staff role.</p>
        ) : (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Roles
            </DropdownMenuLabel>

            <div className="flex flex-wrap gap-1.5 px-2 pb-2">
              {roles.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
            </div>
          </>
        )}

        {frame === undefined ? null : (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => {
                navigate(frame.to);
              }}
            >
              <frame.icon />
              {frame.label}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            clearSessionToken();
            navigate('/', { replace: true });
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
