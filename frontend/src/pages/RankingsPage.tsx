import { useState } from 'react';
import { DataTable, Panel, SectionHeading, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { inputClassName, labelClassName, primaryButtonClassName, secondaryButtonClassName } from '../theme';

type Entry = { rank: number; identifier: number; name: string; value: number };
type Page = { entries: Entry[]; total: number };

/** Whether the board being shown is a clan board or a player board. */
type Subject = 'players' | 'clans';

/** The boards of each subject, kept in step with the ones the backend names. */
const boards = {
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
} as const;

/** Rows one page of a board holds. */
const PageSize = 25;

/**
 * The ranking boards, one window of one at a time.
 *
 * The figures are the same ones the in-game screens show, derived from the same
 * stored data: there is no ranking table, so every board here is the same
 * projection the game server runs. Host and instructor ratings are shown as the
 * star average rather than as the 8.8 fixed point the column holds, because a
 * dashboard that printed `1178` for a 4.6-star host would be reporting the
 * storage format rather than the rating.
 */
export function RankingsPage() {
  const [subject, setSubject] = useState<Subject>('players');
  const [board, setBoard] = useState('gradePoint');
  const [month, setMonth] = useState(false);
  const [from, setFrom] = useState(0);

  const { data, error, loading, reload } = useApiResource<Page>(
    `/api/rankings/${subject}?board=${board}&month=${month}&from=${from}&limit=${PageSize}`,
  );

  const currentBoards = boards[subject];
  const lastPage = data === null ? 0 : Math.max(0, Math.ceil(data.total / PageSize) - 1);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Rankings"
        subtitle="The boards the game shows, computed the same way from the same data."
      />

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="subject" className={labelClassName}>
              Whose
            </label>
            <select
              id="subject"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value as Subject);
                setBoard(boards[event.target.value as Subject][0].value);
                setFrom(0);
              }}
              className={inputClassName}
            >
              <option value="players">Players</option>
              <option value="clans">Clans</option>
            </select>
          </div>

          <div>
            <label htmlFor="board" className={labelClassName}>
              Board
            </label>
            <select
              id="board"
              value={board}
              onChange={(event) => {
                setBoard(event.target.value);
                setFrom(0);
              }}
              className={inputClassName}
            >
              {currentBoards.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 pb-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={month}
              onChange={(event) => {
                setMonth(event.target.checked);
                setFrom(0);
              }}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
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
              className: 'text-right tabular-nums text-slate-500',
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
          <button
            type="button"
            onClick={() => setFrom(Math.max(0, from - PageSize))}
            disabled={from === 0}
            className={secondaryButtonClassName}
          >
            Previous
          </button>

          <p className="text-sm text-slate-500">
            {formatNumber(from + 1)}–{formatNumber(Math.min(from + PageSize, data.total))} of{' '}
            {formatNumber(data.total)}
          </p>

          <button
            type="button"
            onClick={() => {
              setFrom(from + PageSize);
              reload();
            }}
            disabled={from >= lastPage * PageSize}
            className={primaryButtonClassName}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
