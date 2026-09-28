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

/** The window, once the rows are in. */
type Page = { entries: Entry[]; total: number };

type Entry = { rank: number; identifier: number; name: string; value: number };

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
 *
 * The paging is drawn at the foot of the board rather than below it as a row of
 * its own, because the buttons and the count are statements about the rows above
 * them: a reader who turns a page should not have to look away from the board to
 * find out whether there is another one, and the window should not be somewhere
 * else on the page that a narrow window can scroll past on its own.
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
  const name = offered.find((option) => option.value === shown)?.label ?? shown;

  const { data, error, loading } = useApiResource<Page>(
    `/api/rankings/${subject}?board=${shown}&month=${month}&from=${from}&limit=${PageSize}`,
  );

  // The window is measured off the rows that arrived rather than off the request,
  // so a board that returned fewer than a full page says where it stopped rather
  // than claiming a range it does not have.
  const first = data === null || data.entries.length === 0 ? 0 : from + 1;
  const last = data === null ? 0 : from + data.entries.length;
  const pages = data === null ? 1 : Math.max(1, Math.ceil(data.total / PageSize));
  const page = Math.floor(from / PageSize) + 1;

  return (
    <div className="space-y-6">
      <SectionHeading title={subjects[subject].title} subtitle={subjects[subject].subtitle} />

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full space-y-2 sm:w-56">
            <Label htmlFor="board">Board</Label>
            <Select
              value={shown}
              onValueChange={(next) => {
                setBoard(next);
                setFrom(0);
              }}
            >
              <SelectTrigger id="board">
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

          <label className="flex h-9 items-center gap-2 text-sm text-foreground/80">
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

      {/* The count, the board's name and the paging all describe the same list, so
          they are drawn with it: a heading that says "Grade points" above a card
          that says "nothing is ranked here" and a count of zero on the button row
          below is three statements about one list that a reader has to reconcile. */}
      <Panel
        title={name}
        description={describeBoard(data, loading, month)}
        footer={
          data === null || data.total === 0 ? null : (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => setFrom(Math.max(0, from - PageSize))}
                disabled={from === 0 || loading}
              >
                <ChevronLeft />
                Previous
              </Button>

              <p className="text-sm text-muted-foreground">
                {formatNumber(first)}–{formatNumber(last)} of {formatNumber(data.total)}
                <span className="mx-2 text-border">·</span>
                page {formatNumber(page)} of {formatNumber(pages)}
              </p>

              <Button
                onClick={() => setFrom(from + PageSize)}
                disabled={loading || last >= data.total}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          )
        }
      >
        <DataTable
          rows={data?.entries ?? []}
          rowKey={(row) => row.identifier}
          empty="Nothing is ranked on this board yet."
          loading={loading}
          loadingLabel="Reading the board…"
          columns={[
            {
              // The rank column is given a width rather than being left to the
              // table's own layout. There are three columns on a full-width card, so
              // an unconstrained first column takes a third of the card and a
              // right-aligned rank floats in the middle of it, a long way from the
              // name it belongs to and from the edge of the card.
              header: '#',
              cell: (row) => row.rank,
              className: 'w-14 text-right tabular-nums text-muted-foreground',
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
    </div>
  );
}

/**
 * The sentence above the rows: how many are ranked, and over what.
 *
 * While the board is being read it says so rather than counting the rows still on
 * screen from the board that was being read before, which is a count of a board the
 * reader has already been shown and one they are no longer looking at.
 */
function describeBoard(data: Page | null, loading: boolean, month: boolean): string {
  if (loading) {
    return 'Reading the board…';
  }

  if (data === null) {
    return 'The boards the game shows, computed from the same data.';
  }

  const count = `${formatNumber(data.total)} ${data.total === 1 ? 'entry' : 'entries'}`;

  return month ? `${count}, counted from the first of this month.` : `${count}, counted over all time.`;
}
