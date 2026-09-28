import { useState } from 'react';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

/** One clan as the directory lists it. */
type Clan = {
  id: number;
  name: string;
  comment: string;
  notice: string;
  noticeAt: string | null;
  /** Whether the clan is taking applications. */
  open: boolean;
  leaderName: string | null;
  memberCount: number;
  applicationCount: number;
  createdAt: string | null;
};

/** One member of a clan. */
type ClanMember = {
  characterId: number;
  name: string;
  rank: number;
  isLeader: boolean;
};

/** One character waiting to be let into a clan. */
type ClanApplication = {
  id: number;
  characterId: number;
  characterName: string;
  appliedAt: string;
};

type ClanProfile = { clan: Clan; members: ClanMember[]; applications: ClanApplication[] };

/** The orderings the backend accepts, kept in step with the query it runs. */
const sorts = [
  { value: 'name', label: 'Name' },
  { value: 'members', label: 'Roster size' },
  { value: 'recent', label: 'Newest' },
] as const;

/**
 * Every clan on the server, and the record of whichever one is selected.
 *
 * The page draws what the game already stores and writes nothing: a roster, a
 * notice, an emblem timestamp and the queue of characters waiting to join are all
 * facts the clan set up in the client, and the dashboard's job here is to make them
 * legible to somebody who is not holding the clan screen open. Accepting an
 * application is the clan leader's action in the game, not one this page performs.
 *
 * The applications are shown here rather than hidden behind a staff role because
 * they are a public queue in the client too — the joinable-clan list reads the same
 * rows — and a leader answering them does it in the game.
 */
export function ClansPage() {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<string>('name');
  const [submitted, setSubmitted] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const list = useApiResource<{ clans: Clan[] }>(
    `/api/clans?term=${encodeURIComponent(submitted)}&sort=${sort}`,
  );
  const profile = useApiResource<ClanProfile>(
    selected === null ? null : `/api/clans/${selected}`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Clans"
        subtitle="Every clan on the server, and the record of the one you select."
      />

      <Panel>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(term.trim());
          }}
        >
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="clan-term">Search</Label>
            <Input
              id="clan-term"
              type="text"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Clan name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clan-sort">Order by</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger id="clan-sort" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sorts.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Panel>

      {list.error === null ? null : <StatusMessage kind="error">{list.error}</StatusMessage>}

      <Panel title="Clans">
        <DataTable
          rows={list.data?.clans ?? []}
          rowKey={(row) => row.id}
          empty={list.loading ? 'Searching…' : 'No clan matched that search.'}
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(row.id)}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name}
                  </button>
                  {row.open ? null : <Badge variant="secondary">closed</Badge>}
                </span>
              ),
            },
            { header: 'Leader', cell: (row) => row.leaderName },
            {
              header: 'Members',
              cell: (row) => formatNumber(row.memberCount),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Waiting',
              cell: (row) => formatNumber(row.applicationCount),
              className: 'text-right tabular-nums',
            },
            { header: 'Comment', cell: (row) => row.comment },
          ]}
        />
      </Panel>

      {selected === null ? null : (
        <Panel title={profile.data?.clan.name ?? 'Clan'}>
          {profile.error === null ? null : (
            <StatusMessage kind="error">{profile.error}</StatusMessage>
          )}

          {profile.loading ? (
            <p className="text-sm text-muted-foreground">Loading the clan…</p>
          ) : null}

          {profile.data === null ? null : (
            <div className="space-y-6">
              <ClanFacts clan={profile.data.clan} />

              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Roster
                </h2>

                <DataTable
                  rows={profile.data.members}
                  rowKey={(row) => row.characterId}
                  empty="This clan has no members."
                  columns={[
                    {
                      header: 'Character',
                      cell: (row) => (
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{row.name}</span>
                          {row.isLeader ? <Badge>leader</Badge> : null}
                        </span>
                      ),
                    },
                    {
                      header: 'Rank',
                      cell: (row) => row.rank,
                      className: 'text-right tabular-nums',
                    },
                  ]}
                />
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Waiting to join
                </h2>

                <DataTable
                  rows={profile.data.applications}
                  rowKey={(row) => row.id}
                  empty="Nobody is waiting to join this clan."
                  columns={[
                    { header: 'Character', cell: (row) => row.characterName },
                    { header: 'Applied', cell: (row) => formatDate(row.appliedAt) },
                  ]}
                />
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/**
 * The figures of one clan, above its roster.
 *
 * The notice is given a line of its own rather than a column, because it is the one
 * field on this page written by a player for other players and the only one that
 * runs to more than a few words. It is shown even when it is empty rather than
 * hidden, so a clan with no notice reads as having none rather than as having no
 * field at all.
 */
function ClanFacts({ clan }: { clan: Clan }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Leader" value={clan.leaderName} />
        <Detail label="Members" value={formatNumber(clan.memberCount)} />
        <Detail label="Applications" value={formatNumber(clan.applicationCount)} />
        <Detail label="Taking applications" value={clan.open ? 'Yes' : 'No'} />
        <Detail label="Created" value={formatDate(clan.createdAt)} />
        <Detail label="Notice published" value={formatDate(clan.noticeAt)} />
      </dl>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Notice</p>
        <p className="mt-1 text-sm text-foreground/90">
          {clan.notice.trim().length === 0 ? 'This clan has published no notice.' : clan.notice}
        </p>
      </div>

      {clan.comment.trim().length === 0 ? null : (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Comment</p>
          <p className="mt-1 text-sm text-foreground/90">{clan.comment}</p>
        </div>
      )}
    </div>
  );
}

/** One labelled figure of a clan. */
function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground/90">{value ?? '—'}</dd>
    </div>
  );
}
