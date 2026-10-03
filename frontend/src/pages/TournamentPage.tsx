import { EventCards } from '../components/EventCards';
import { SectionHeading } from '../components/DataDisplay';
import type { Schedule } from '../components/Schedule';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

/** Lobby selector of Tournament. */
const TournamentMode = 3;

/**
 * The Tournament events that are published, each one a card leading to its own page.
 *
 * There is no box to type an event id into here. A reader who knows the id is a
 * moderator working from a log, and everybody else is asking "which event is on",
 * which is a question about names and dates rather than about numbers — so the
 * events are named, and each one is a card that leads to its registrations,
 * bracket and fixtures.
 *
 * Like Survival, the page is open to any signed-in account: the events and the
 * bracket behind them are what the client announces, so a player may read them
 * here.
 *
 * Nothing here writes. Publishing an event, correcting its window and withdrawing
 * it are a moderator's work, and the server is what performs them; this page shows
 * what has been published and leaves it at that.
 */
export function TournamentPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const schedules = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${TournamentMode}/schedules`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading title="Tournament" />

      {schedules.error === null ? null : (
        <StatusMessage kind="error">{schedules.error}</StatusMessage>
      )}

      <EventCards
        schedules={schedules.data?.schedules ?? []}
        basePath={`${basePath}/tournament`}
        empty="No Tournament event is scheduled."
        loading={schedules.loading}
        loadingLabel="Reading the events…"
      />
    </div>
  );
}
