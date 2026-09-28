import { LoadingBlock, SectionHeading } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { TeamCard, type Team } from '../components/TeamCard';
import { useApiResource } from '../components/useApiResource';

/** Lobby selector of Survival, as the event subsystem numbers them. */
const SurvivalMode = 4;

/**
 * The teams on the Survival ladder, with the roster each one holds.
 *
 * It is a page of its own rather than the bottom half of the Survival page: a
 * ladder is a list of rosters and a schedule is a handful of dates, and a reader
 * who came for one should not arrive at it by scrolling past the other. Splitting
 * them gives each a path, so either can be linked to and reloaded on its own.
 *
 * It reads the teams of the Survival mode rather than the wider survival endpoint,
 * so a page about rosters does not also read the schedule it is not drawing.
 *
 * The page is open to any signed-in account, because the ladder is public in the
 * game: a player can see who is on it and what they have won, and hiding that from
 * the dashboard while showing it in the client would be a strange thing to have
 * done.
 *
 * Nothing here writes. Forming a team, renaming one, changing a state, adding a
 * character and removing the team are a moderator's work, and the server is what
 * performs them. The reason is reach as much as tidiness: this page is reached by
 * players who came to read the ladder, and a delete-shaped control a click from a
 * refresh button serves none of them.
 *
 * The teams are drawn as cards in a grid, and their rosters as cards inside them,
 * for the reason the tournament pages draw their registrations and fixtures as
 * cards: a ladder is a handful of teams of a handful of people, and a page of it
 * is read one team at a time rather than by matching columns. They are not inside
 * a panel either — a card inside a card inside a card is three frames saying the
 * same thing, and the outermost one was only there to hold the list.
 */
export function SurvivalTeamsPage() {
  const ladder = useApiResource<{ teams: Team[] }>(`/api/events/${SurvivalMode}/teams`);
  const teams = ladder.data?.teams ?? [];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival teams"
        subtitle="The teams on the Survival ladder, and who is on them."
      />

      {ladder.error === null ? null : (
        <StatusMessage kind="error">{ladder.error}</StatusMessage>
      )}

      {teams.length === 0 ? (
        ladder.loading ? (
          <LoadingBlock label="Reading the teams…" />
        ) : (
          <p className="text-sm text-muted-foreground">No team has been formed on Survival.</p>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
