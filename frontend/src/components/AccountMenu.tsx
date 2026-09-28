import { ChevronUp, LogOut } from 'lucide-react';
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
 * It is a card that opens rather than a panel that is always there because the
 * name is read once and then never again. Leaving it in view spends the foot of
 * every page on a heading nobody reads, and the sign-out button is the one
 * control that has to be reachable from every screen rather than the one that
 * deserves permanent space.
 *
 * The closed card carries the name and nothing else, set to the same measure as
 * the section links above it because the account name is a heading rather than a
 * figure.
 */
export function AccountMenu({ accountName }: {
  /**
   * The name to show, or nothing while the server is being asked for it.
   *
   * It is drawn as a placeholder bar rather than as words, because a control that
   * briefly says "your account" to somebody who is signed in is a lie told in the
   * one place on the page that is about who they are, and a blank one is only a
   * moment of a request already in flight.
   */
  accountName: string | null;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={accountName === null ? 'Account' : `${accountName}, account`}
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
