import { Panel, SectionHeading } from '../components/DataDisplay';
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
 * Nothing here writes. Forming a team, changing a state and filling one with
 * server characters are a moderator's work and live in the event operations
 * section. The reason is reach rather than tidiness: this page is reached by
 * players who came to read the ladder, and a "create team" form and a roster
 * editor sitting on it put a delete-shaped control within a click of a refresh
 * button for no benefit to the reader.
 */
export function SurvivalTeamsPage() {
  const { data, error, loading } = useApiResource<{ teams: Team[] }>(
    `/api/events/${SurvivalMode}/teams`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival teams"
        subtitle="The teams on the Survival ladder, and who is on them."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel title="Teams">
        {data?.teams.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No team has been formed on Survival.</p>
        ) : null}

        <div className="space-y-4">
          {(data?.teams ?? []).map((team) => (
            <TeamCard key={team.id} team={team} mayWrite={false} onWrite={noop} onChanged={noop} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** A write this page never makes, because the controls that make one live elsewhere. */
function noop(): void {}
