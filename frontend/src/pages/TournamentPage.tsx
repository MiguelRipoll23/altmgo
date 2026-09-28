import { EventCards } from '../components/EventCards';
import { SectionHeading } from '../components/DataDisplay';
import { CreateSchedulePanel, type Schedule } from '../components/ScheduleForm';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { useMayModerate } from '../components/useStaffRole';

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
 * A moderator is offered the form that publishes an event, on this page rather than
 * on a console elsewhere, for the reason Survival offers it: publishing is done while
 * looking at what is already published, and the event is drawn in the lobby that
 * selector names rather than in whichever one happened to be selected. Only the
 * publish form lives here; correcting an event's window is done on the event's own
 * page, next to its registrations, because that is where somebody asking about it
 * already is.
 */
export function TournamentPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const mayModerate = useMayModerate();
  const schedules = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${TournamentMode}/schedules`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Tournament"
        subtitle="The published events. Open one to see who is in it and how it has gone."
      />

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

      {mayModerate ? (
        <CreateSchedulePanel mode={TournamentMode} onChanged={schedules.reload} />
      ) : null}
    </div>
  );
}
