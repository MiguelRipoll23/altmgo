import { Badge } from './ui/badge';

/** What a lobby restricts, as the lobby itself configured it. */
export type Restrictions = {
  beginnersOnly: boolean;
  expansionRequired: boolean;
  noHeadshots: boolean;
  replaysOnly: boolean;
};

/**
 * The restrictions a lobby carries, as badges — and nothing at all when it carries
 * none.
 *
 * A lobby with no restrictions is the common case, and four columns of "no" for
 * every row is a table that has stopped saying anything. Showing only the flags
 * that are set makes the ones that are set the thing the eye goes to, which is the
 * whole reason the column is here: somebody is scanning for the lobby a beginner
 * can be sent to, and an empty cell answers that faster than four "no"s do.
 */
export function RestrictionBadges({ restrictions }: { restrictions: Restrictions }) {
  const shown = (Object.keys(flagLabels) as (keyof Restrictions)[])
    .filter((name) => restrictions[name])
    .map((name) => flagLabels[name]);

  if (shown.length === 0) {
    return <span className="text-muted-foreground">None</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((label) => (
        <Badge key={label} variant="warning">
          {label}
        </Badge>
      ))}
    </span>
  );
}

/**
 * The words each flag is shown as, which are the client's own terms, in the order
 * a lobby screen shows them. This table is also the list of flags, so a flag added
 * to the query has to be added here or it is silently not shown.
 */
const flagLabels: Record<keyof Restrictions, string> = {
  beginnersOnly: 'Beginners only',
  expansionRequired: 'Expansion required',
  noHeadshots: 'No headshots',
  replaysOnly: 'Replays only',
};
