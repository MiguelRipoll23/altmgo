import { CircleUser, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearSessionToken } from '../session';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

/**
 * Who is signed in, at the foot of the sidebar, and the way out.
 *
 * The trigger is an icon and nothing else, in every width of the column. The
 * account name was written across the foot of every page — a heading-sized line
 * above the sign-out, read once on arrival and then never again — and it crowded
 * out the last section in the column, which is the one somebody is more likely to
 * be reaching for. A figure on every page that nobody reads is space taken from
 * the page.
 *
 * The name has not been dropped so much as moved: the popover opens on the name in
 * full, which is where it is read — a reader opens this to sign out or to check
 * who they are, and both are answered by opening it. The trigger keeps the name
 * as its accessible name and as its tooltip in the meantime, so a screen reader
 * announces it and a pointer finds it on hover, and neither has to open anything
 * to learn whose session they are in.
 *
 * It is one control rather than two shapes of one, which is why it needs no
 * `reduced`: the reduced column was the icon and the open column was the name, so
 * the same control was drawn differently at two widths and a reader who had the
 * column open had a different thing under the pointer than one who had it closed.
 * An icon fits both, so there is one drawing.
 *
 * It is a card that opens rather than a panel that is always there because the
 * name is read once and then never again. Leaving it in view spends the foot of
 * every page on a heading nobody reads, and the sign-out button is the one
 * control that has to be reachable from every screen rather than the one that
 * deserves permanent space.
 */
export function AccountMenu({ accountName }: {
  /**
   * The name the account is signed in as, or nothing while the server is being
   * asked for it.
   *
   * Nothing here shows it, so the only thing the absence changes is the tooltip
   * and the accessible name, both of which fall back to the bare word "Account".
   * There is no placeholder bar for it any more: the trigger has no text to hold
   * open, so there is nothing for a placeholder to stand in for.
   */
  accountName: string | null;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center justify-center rounded-lg border border-border bg-card/60 px-3 py-2.5 text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={accountName === null ? 'Account' : `${accountName}, account`}
        title={accountName ?? 'Account'}
      >
        <CircleUser className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>

      {/* Opens upwards, over the page rather than off the foot of the window: it
          is pinned to the bottom of the column, and a menu that opened downwards
          from the last control on a page is a menu with nowhere to go. It is
          aligned to the trigger's start so the name sits over the column rather
          than out in the middle of the page. */}
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="truncate font-medium text-foreground">
          {accountName ?? 'Signed in'}
        </DropdownMenuLabel>

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