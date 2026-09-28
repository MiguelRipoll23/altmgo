import { Bot, Plus, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { readSessionToken } from '../session';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DataTable } from './DataDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

/** One server character and the team it is on. */
export type ServerCharacter = {
  id: number;
  name: string;
  team_id: number | null;
  team_name: string | null;
};

/** A team the pool can be pointed at, which is the set the picker offers. */
export type FillableTeam = { id: number; name: string };

/** The value meaning "no team", which is distinct from any team. */
const NoTeam = 'none';

/**
 * The pool of `server-` characters, and the control that puts one on a team.
 *
 * These characters stand in for the dedicated match rooms: there is no client at
 * the other end of a room nobody is sitting at, so a moderator places them by
 * name. They are created on demand rather than seeded — asking for six makes
 * six, and the rest are made the next time they are asked for — so a deployment
 * that never runs a match never carries sixteen rows nobody has heard of.
 *
 * Moving rather than adding is what the control offers, because a server
 * character fills one slot on one team at a time. The dropdown says which team
 * each is on now, so putting one on a second team visibly takes it off the
 * first rather than appearing to do both.
 */
export function ServerCharacterPool({
  characters,
  teams,
  onChanged,
}: {
  characters: ServerCharacter[];
  teams: FillableTeam[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wants, setWants] = useState('1');

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);

    try {
      await action();
      onChanged();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    await run(() =>
      apiRequest('/api/moderator/server-characters', {
        method: 'POST',
        token: readSessionToken(),
        body: { count: Number(wants) },
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32 space-y-2">
          <label htmlFor="pool-size" className="text-sm font-medium text-foreground/80">
            How many
          </label>
          <input
            id="pool-size"
            type="number"
            min={1}
            max={16}
            value={wants}
            onChange={(event) => setWants(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background/60 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button onClick={() => void create()} disabled={busy}>
          <Plus />
          {busy ? 'Working…' : 'Create server characters'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Created on demand, up to sixteen. Any that already exist are used as they are.
        </p>
      </div>

      {error === null ? null : (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <DataTable
        rows={characters}
        rowKey={(row) => row.id}
        empty="No server character has been created yet."
        columns={[
          {
            header: 'Character',
            cell: (row) => (
              <span className="flex items-center gap-2">
                <Bot className="size-4 text-muted-foreground" />
                <span className="font-mono text-xs">{row.name}</span>
                <Badge variant="secondary">server</Badge>
              </span>
            ),
          },
          { header: 'On team', cell: (row) => row.team_name },
          {
            header: 'Put on',
            cell: (row) => (
              <span className="flex items-center gap-2">
                <Select
                  value={String(row.team_id ?? NoTeam)}
                  onValueChange={(next) => {
                    const teamId = next === NoTeam ? undefined : Number(next);
                    void run(() =>
                      apiRequest(`/api/moderator/server-characters/${row.id}`, {
                        method: 'PUT',
                        token: readSessionToken(),
                        body: teamId === undefined ? {} : { teamId },
                      }),
                    );
                  }}
                  disabled={busy}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="No team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NoTeam}>No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Take ${row.name} off its team`}
                  disabled={busy || row.team_id === null}
                  onClick={() =>
                    void run(() =>
                      apiRequest(`/api/moderator/server-characters/${row.id}`, {
                        method: 'PUT',
                        token: readSessionToken(),
                        body: {},
                      }),
                    )
                  }
                >
                  <Undo2 />
                </Button>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
