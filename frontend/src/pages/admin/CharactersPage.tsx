import { useState } from 'react';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

type Character = {
  id: number;
  name: string;
  accountName: string;
  rank: number;
  experience: number;
  totalRewards: number;
  lobbyName: string | null;
  publicAddress: string | null;
  lastSeen: string | null;
};

type CharacterProfile = {
  character: Character & {
    previousName: string | null;
    comment: string;
    createdAt: string;
    lastSeenAt: string | null;
  };
};

/** The orderings the backend accepts, kept in step with the query it runs. */
const sorts = [
  { value: 'name', label: 'Name' },
  { value: 'experience', label: 'Experience' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'recent', label: 'Recently seen' },
] as const;

/**
 * Every character on the server, searchable by character or by account name, and
 * the profile of whichever one is selected.
 *
 * The search is submitted rather than run on each keystroke: the term is bound
 * into a query that counts and pages, and a request per letter would make the
 * field slower to use than the thing it searches.
 */
export function CharactersPage() {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<string>('name');
  const [submitted, setSubmitted] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const list = useApiResource<{ characters: Character[] }>(
    `/api/characters?term=${encodeURIComponent(submitted)}&sort=${sort}`,
  );
  const profile = useApiResource<CharacterProfile>(
    selected === null ? null : `/api/characters/${selected}`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Characters"
        subtitle="Every character on the server, and the profile of the one you select."
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
            <Input
              id="term"
              type="text"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search a character or account"
              aria-label="Search a character or account"
            />
          </div>

          <div className="space-y-2">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger id="sort" className="w-48" aria-label="Order the characters by">
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

      <Panel title="Characters">
        <DataTable
          rows={list.data?.characters ?? []}
          rowKey={(row) => row.id}
          empty="No character matched that search."
          loading={list.loading}
          loadingLabel="Searching…"
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <button
                  type="button"
                  onClick={() => setSelected(row.id)}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </button>
              ),
            },
            { header: 'Account', cell: (row) => row.accountName },
            { header: 'Lobby', cell: (row) => row.lobbyName },
            {
              header: 'Experience',
              cell: (row) => formatNumber(row.experience),
              className: 'text-right tabular-nums',
            },
            { header: 'Last seen', cell: (row) => formatDate(row.lastSeen) },
          ]}
        />
      </Panel>

      {selected === null ? null : (
        <Panel title={profile.data?.character.name ?? 'Character'}>
          {profile.error === null ? null : (
            <StatusMessage kind="error">{profile.error}</StatusMessage>
          )}

          {profile.loading ? (
            <p className="text-sm text-muted-foreground">Loading the profile…</p>
          ) : null}

          {profile.data === null ? null : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Account" value={profile.data.character.accountName} />
              <Detail label="Previous name" value={profile.data.character.previousName} />
              <Detail label="Rank" value={formatNumber(profile.data.character.rank)} />
              <Detail
                label="Experience"
                value={formatNumber(profile.data.character.experience)}
              />
              <Detail
                label="Total rewards"
                value={formatNumber(profile.data.character.totalRewards)}
              />
              <Detail label="Lobby" value={profile.data.character.lobbyName} />
              <Detail label="Public address" value={profile.data.character.publicAddress} />
              <Detail label="Created" value={formatDate(profile.data.character.createdAt)} />
              <Detail
                label="Last seen"
                value={formatDate(profile.data.character.lastSeenAt)}
              />
              <Detail label="Comment" value={profile.data.character.comment} />
            </dl>
          )}
        </Panel>
      )}
    </div>
  );
}

/** One labelled figure of a profile. */
function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground/90">{value ?? '—'}</dd>
    </div>
  );
}
