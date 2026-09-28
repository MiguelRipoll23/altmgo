import type { ReactNode } from 'react';

/** The heading every dashboard section opens with. */
export function SectionHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle === undefined ? null : <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

/** A card a panel of controls or a list sits in. */
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur sm:p-6">
      {title === undefined ? null : (
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">{title}</h2>
      )}
      {children}
    </section>
  );
}

/**
 * One figure, with the word under it that says what it counts.
 *
 * The label is not decoration: a bare number on a dashboard of numbers is
 * unreadable a week later, and "connected players" is the difference between a
 * figure somebody acts on and one they have to look up.
 */
export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
      <p className="text-3xl font-extrabold tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

/** One column of a data table. */
export type Column<T> = {
  header: string;
  /** Renders the cell. Returning nothing renders an em dash rather than a blank. */
  cell: (row: T) => ReactNode;
  /** Extra classes for the header and its cells, for right-aligned numbers. */
  className?: string;
};

/**
 * A table of results, with a line for the case where there are none.
 *
 * The empty line says what was looked for rather than showing nothing: an empty
 * table is either "no such character", "no games running" or "the query failed",
 * and only the sentence tells those apart.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-800/60 last:border-b-0">
              {columns.map((column) => (
                <td key={column.header} className={`px-3 py-2.5 text-slate-300 ${column.className ?? ''}`}>
                  {column.cell(row) ?? <span className="text-slate-600">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A number rendered the way the dashboard shows figures: grouped, never blank. */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/** A timestamp, or the word that says there is not one. */
export function formatDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return new Date(value).toLocaleString();
}
