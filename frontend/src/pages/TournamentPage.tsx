import { EventCards } from '../components/EventCards';
import { SectionHeading } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import type { Schedule } from '../components/ScheduleForm';

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
 * Nothing here writes. Publishing an event, editing its window, withdrawing it and
 * placing the dedicated match characters on a seeded team all moved to the event
 * operations section, for the same reason as Survival: a reader who came to see who
 * is in the bracket should not have a scheduling form within reach of it.
 */
export function TournamentPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const { data, error, loading } = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${TournamentMode}/schedules`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Tournament"
        subtitle="The published events. Open one to see who is in it and how it has gone."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <EventCards
        schedules={data?.schedules ?? []}
        basePath={`${basePath}/tournament`}
        empty="No Tournament event is scheduled."
        loading={loading}
        loadingLabel="Reading the events…"
      />
    </div>
  );
}
