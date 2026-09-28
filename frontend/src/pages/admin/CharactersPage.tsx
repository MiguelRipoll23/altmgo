import { useState } from 'react';
import { Link } from 'react-router-dom';
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

/** The orderings the backend accepts, kept in step with the query it runs. */
const sorts = [
  { value: 'name', label: 'Name' },
  { value: 'experience', label: 'Experience' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'recent', label: 'Recently seen' },
] as const;

/**
 * Every character on the server, searchable by character or by account name.
 *
 * A name opens that character's own page rather than expanding a profile under
 * the directory. It used to expand here, which meant the page grew every time a
 * character was opened, the record arrived below the list the reader was still
 * working through, and it had no address — so a moderator looking at the same
 * character twice, or sending one to a colleague, had nothing to link to.
 *
 * The search is submitted rather than run on each keystroke: the term is bound
 * into a query that counts and pages, and a request per letter would make the
 * field slower to use than the thing it searches.
 */
export function CharactersPage() {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<string>('name');
  const [submitted, setSubmitted] = useState('');

  const list = useApiResource<{ characters: Character[] }>(
    `/api/admin/characters?term=${encodeURIComponent(submitted)}&sort=${sort}`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Characters"
        subtitle="Every character on the server. A name opens that character's profile."
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
                <Link
                  to={`/admin/characters/${row.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
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
    </div>
  );
}
