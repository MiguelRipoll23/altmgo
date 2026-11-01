import { CalendarClock, ChevronRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import { LoadingBlock } from './DataDisplay';
import type { Schedule } from './Schedule';
import { formatEpoch } from './Schedule';

/**
 * How a window of time is said on a card.
 *
 * A zero epoch is the column's way of saying there is no bound rather than the
 * first of January 1970, so it is said in words: an event that has already opened
 * is open now, and one that never closes says so instead of printing a date
 * nobody set.
 */
function windowOf(schedule: Schedule): string {
  const opens =
    schedule.publish_start === 0 ? 'Open now' : `Opens ${formatEpoch(schedule.publish_start)}`;

  if (schedule.publish_end === 0) {
    return `${opens} · no closing time`;
  }

  return `${opens} — closes ${formatEpoch(schedule.publish_end)}`;
}

/**
 * The scheduled events, as cards that are each a link to the event's own page.
 *
 * This is a list of cards rather than a table because an event is not a row of
 * figures: its name, when it opens, how many teams it takes and whether it is
 * open are four different kinds of thing, and a table of them asks a reader to
 * hold four columns in their head to answer "can I enter this one". A card is
 * read in one pass, and a card that fills the width of the page can say more than
 * four short cells can.
 *
 * The whole card is the link, and it leads to a page rather than expanding here,
 * so an event can be sent to somebody and opened on its own.
 */
export function EventCards({
  schedules,
  basePath,
  empty,
  loading = false,
  loadingLabel = 'Loading…',
}: {
  schedules: Schedule[];
  /** The section the cards live under, so the link is that section's event. */
  basePath: string;
  empty: string;
  /** Whether the schedules are still being read. */
  loading?: boolean;
  /** What the reading is, for the case where there is nothing to keep on screen. */
  loadingLabel?: string;
}) {
  if (schedules.length === 0) {
    return loading ? (
      <LoadingBlock label={loadingLabel} />
    ) : (
      <p className="text-base text-muted-foreground">{empty}</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {schedules.map((schedule) => (
        <Link
          key={schedule.id}
          to={`${basePath}/${schedule.id}`}
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card/50 px-4 py-4 transition hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold tracking-tight text-foreground">
              {schedule.name}
            </h3>
            {schedule.enabled ? null : <Badge variant="secondary">not open</Badge>}
          </div>

          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" />
            {windowOf(schedule)}
          </p>

          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <Users className="size-4 shrink-0" />
            {schedule.team_capacity} teams in the field
          </p>

          <span className="mt-auto inline-flex items-center gap-1.5 text-base font-medium text-primary">
            See the event
            <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}
