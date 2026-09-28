import { Badge } from './ui/badge';

/** One member of a roster. */
export type Member = { slot: number; character_id: number; name: string; state: number };

/** One team, with everything its card has to show. */
export type Team = {
  id: number;
  name: string;
  comment: string;
  state: number;
  match_type: number;
  lobby_name: string | null;
  consecutive_wins: number;
  paid_reward: number;
  created_at: string;
  members: Member[];
};

/** The team state as the numbers it is stored as, for showing what a row holds. */
const teamStateNames: Record<number, string> = { 1: 'Joinable', 9: 'Queued' };

/** The member state as the numbers it is stored as, for showing what a row holds. */
const memberStateNames: Record<number, string> = { 1: 'Pending', 2: 'Ready' };

/**
 * The roster, as a grid of cards rather than a table.
 *
 * A team is four or five people, and the table asked a reader to hold three
 * columns in their head to answer the only question the roster is asked — who is
 * on it, and are they ready — while the surrounding team card is already a card,
 * so a table inside it was a table inside a card inside a panel. The tournament
 * pages draw their entries and their fixtures as small bordered tiles for exactly
 * the same reason, and a roster is closer to one of those than to a column of
 * figures: it is a handful of people, read one at a time.
 *
 * The slot is on the tile rather than in a column because it is the one thing
 * about a member that is not about the member: it is the order the team put them
 * in, and a reader scanning a roster wants the name first.
 */
function Roster({ team }: { team: Team }) {
  if (team.members.length === 0) {
    return <p className="text-sm text-muted-foreground">This team has nobody on it.</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {team.members.map((member) => (
        <li
          key={member.slot}
          className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {member.slot}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {member.name}
            </span>
            {member.name.startsWith('server-') ? <Badge variant="secondary">server</Badge> : null}
          </div>

          <div className="flex items-center justify-between gap-2 pl-6">
            <Badge variant={member.state === 2 ? 'success' : 'secondary'}>
              {memberStateNames[member.state] ?? `State ${member.state}`}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * One team and its roster.
 *
 * It draws no controls, and that is a decision rather than an oversight. The team
 * state, each member's state, the roster itself and the team's own name and comment
 * are all written by the event subsystem and by the players in the client, and a
 * dashboard that could move them would be a second place to keep them correct: one
 * whose writes the client knows nothing about, and whose next read contradicts.
 *
 * The numbers are therefore read the way the client will draw them — a state as the
 * word the client uses for it, a dedicated match character marked as one — rather
 * than as the integers they are stored as.
 */
export function TeamCard({ team }: { team: Team }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{team.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {teamStateNames[team.state] ?? `State ${team.state}`} · {team.members.length} member
            {team.members.length === 1 ? '' : 's'} · {team.consecutive_wins} win
            {team.consecutive_wins === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Roster team={team} />
      </div>
    </div>
  );
}
