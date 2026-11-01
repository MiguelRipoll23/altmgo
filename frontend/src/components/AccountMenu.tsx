import { CircleUser, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
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
 * The trigger says "My Account" beside the icon rather than the account's name. The
 * name is in the popover, and it is the only thing in the popover that is a fact
 * rather than a command, so that is where it is read: a reader opens this to sign
 * out or to check who they are, and both are answered by opening it.
 *
 * What the trigger needs to say is what the control *is*, and a name is the wrong
 * answer to that. An account name is a string of whatever its owner typed, set at
 * the width of that string: two accounts reading "Mike" and "mike_the_2004_gamer"
 * put the control at two widths, and the one beside the column's other rows is a
 * heading there, so a long name was reflowing the foot of every page. "My
 * Account" is the same width every time and is the name of the thing rather than
 * of the person.
 *
 * So the name moved rather than went. The trigger keeps it as its accessible name
 * and as its tooltip, so a screen reader announces it and a pointer finds it on
 * hover, and neither has to open anything to learn whose session they are in.
 *
 * In the reduced column it is the icon alone. There is no room for two words in
 * eighty pixels, and "My Account" truncated to "My Acco…" is worse than no label
 * at all: it is not a control anybody can recognise, and it is the one control on
 * the page that opens onto the way out.
 *
 * It is a card that opens rather than a panel that is always there because the
 * name is read once and then never again. Leaving it in view spends the foot of
 * every page on a heading nobody reads, and the sign-out button is the one
 * control that has to be reachable from every screen rather than the one that
 * deserves permanent space.
 */
export function AccountMenu({
  accountName,
  reduced = false,
}: {
  /**
   * The name the account is signed in as, or nothing while the server is being
   * asked for it.
   *
   * It is not drawn on the trigger, so the only thing its absence changes is the
   * tooltip and the accessible name, both of which fall back to "My Account".
   */
  accountName: string | null;
  /** Whether the column has been reduced to icons, leaving no room for the label. */
  reduced?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center rounded-lg border border-border bg-card/60 px-3 py-2.5 text-base font-medium text-foreground transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
          reduced ? 'justify-center' : 'gap-3',
        )}
        aria-label={accountName === null ? 'My Account' : `My Account, ${accountName}`}
        title={accountName ?? 'My Account'}
      >
        <CircleUser className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

        {reduced ? null : <span className="truncate">My Account</span>}
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