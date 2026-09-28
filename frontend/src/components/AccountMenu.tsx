import { LogOut, ShieldCheck, type LucideIcon } from 'lucide-react';
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
 * The roles are shown inside the menu as well, because the menu is where the
 * question "why is that button not there" is answered, and answering it takes
 * the two facts together.
 */
export function AccountMenu({
  accountName,
  roles,
  frame,
}: {
  accountName: string;
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
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account and roles"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{accountName}</span>
          <span className="block text-xs text-muted-foreground">
            {roles.length === 0 ? 'Player' : roles.join(', ')}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium text-foreground">{accountName}</span>
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
