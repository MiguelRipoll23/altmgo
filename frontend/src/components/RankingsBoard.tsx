import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DataTable, Panel, SectionHeading, formatNumber } from './DataDisplay';
import { StatusMessage } from './StatusMessage';
import { useApiResource } from './useApiResource';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

/** Whether the board being shown is about players or about clans. */
export type BoardSubject = 'players' | 'clans';

/** One board a subject is measured on. */
type BoardOption = { value: string; label: string };

/**
 * The boards of each subject, kept in step with the ones the backend names.
 *
 * The two lists do not overlap: a host rating and an instructor rating are votes
 * cast about a character, and there is nothing for a clan to be rated on. A
 * subject's board is therefore chosen from its own list rather than from a union,
 * so the page cannot offer a board the API would refuse.
 *
 * Each list is a non-empty tuple rather than an array because the page opens on
 * the first board of whichever subject it is showing, and a subject with no
 * boards is not a subject a page can be written for.
 */
const boards: Record<BoardSubject, readonly [BoardOption, ...BoardOption[]]> = {
  players: [
    { value: 'gradePoint', label: 'Grade points' },
    { value: 'score', label: 'Score' },
    { value: 'activeness', label: 'Time played' },
    { value: 'hostRating', label: 'Host rating' },
    { value: 'instructorRating', label: 'Instructor rating' },
  ],
  clans: [
    { value: 'gradePoint', label: 'Grade points' },
    { value: 'score', label: 'Clan score' },
    { value: 'activeness', label: 'Time played' },
  ],
};

/** What each subject's page is called, since the two are separate pages. */
const subjects: Record<BoardSubject, { title: string; subtitle: string }> = {
  players: {
    title: 'Player rankings',
    subtitle: 'The boards the game shows for a character, computed the same way from the same data.',
  },
  clans: {
    title: 'Clan rankings',
    subtitle: 'The boards the game shows for a clan, computed the same way from the same data.',
  },
};

/** Rows one page of a board holds. */
const PageSize = 25;

type Entry = { rank: number; identifier: number; name: string; value: number };
type Page = { entries: Entry[]; total: number };

/**
 * One window of one board, for one subject.
 *
 * The board is not stored: there is no ranking table, so every board here is the
 * same projection the game server runs. Host and instructor ratings are shown as
 * the star average rather than as the 8.8 fixed point the column holds, because a
 * dashboard that printed `1178` for a 4.6-star host would be reporting the
 * storage format rather than the rating.
 *
 * Players and clans are two pages rather than one page with a subject selector,
 * because they are two different sets of boards: a host rating is a vote cast
 * about a character and there is nothing for a clan to be rated on, so the choice
 * between them is not a filter over one list but a change of which list is being
 * shown. The sidebar's sub-options are where that choice is made, and making it
 * in the address rather than in a control is what gives each subject a link that
 * can be shared and reloaded.
 */
export function RankingsBoard({ subject }: { subject: BoardSubject }) {
  const [board, setBoard] = useState(boards[subject][0].value);
  const [month, setMonth] = useState(false);
  const [from, setFrom] = useState(0);

  // The board is held in state, so a subject whose lists do not overlap can be
  // left holding one the API would refuse. The request falls back to the first
  // board of the subject being read until the reader picks another, rather than
  // asking for a board that is not on this page and rendering the refusal.
  const offered = boards[subject];
  const shown = offered.some((option) => option.value === board) ? board : offered[0].value;

  const { data, error, loading, reload } = useApiResource<Page>(
    `/api/rankings/${subject}?board=${shown}&month=${month}&from=${from}&limit=${PageSize}`,
  );

  const lastPage = data === null ? 0 : Math.max(0, Math.ceil(data.total / PageSize) - 1);

  return (
    <div className="space-y-6">
      <SectionHeading title={subjects[subject].title} subtitle={subjects[subject].subtitle} />

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="board">Board</Label>
            <Select
              value={shown}
              onValueChange={(next) => {
                setBoard(next);
                setFrom(0);
              }}
            >
              <SelectTrigger id="board" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {offered.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 pb-3 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={month}
              onChange={(event) => setMonth(event.target.checked)}
              className="size-4 accent-primary"
            />
            This month only
          </label>
        </div>
      </Panel>

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel>
        <DataTable
          rows={data?.entries ?? []}
          rowKey={(row) => row.identifier}
          empty={loading ? 'Reading the board…' : 'Nothing is ranked on this board yet.'}
          columns={[
            {
              header: '#',
              cell: (row) => row.rank,
              className: 'text-right tabular-nums text-muted-foreground',
            },
            { header: 'Name', cell: (row) => row.name },
            {
              header: 'Value',
              cell: (row) => formatNumber(row.value),
              className: 'text-right tabular-nums',
            },
          ]}
        />
      </Panel>

      {data === null || data.total === 0 ? null : (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setFrom(Math.max(0, from - PageSize))}
            disabled={from === 0}
          >
            <ChevronLeft />
            Previous
          </Button>

          <p className="text-sm text-muted-foreground">
            {formatNumber(from + 1)}–{formatNumber(Math.min(from + PageSize, data.total))} of{' '}
            {formatNumber(data.total)}
          </p>

          <Button
            onClick={() => {
              setFrom(from + PageSize);
              reload();
            }}
            disabled={from >= lastPage * PageSize}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
