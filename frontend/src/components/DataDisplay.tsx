import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

/**
 * The building blocks every page of the dashboard is written from.
 *
 * They sit on the shadcn primitives rather than replacing them: a `Panel` is a
 * `Card`, a `DataTable` is a `Table` with a column description, and a page that
 * needs something the wrapper does not offer reaches for the primitive underneath
 * instead of growing a second style for the same thing.
 */

/** The heading every dashboard section opens with. */
export function SectionHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      {subtitle === undefined ? null : <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** A card a panel of controls or a list sits in. */
export function Panel({ title, description, children, className }: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {title === undefined && description === undefined ? (
        <CardContent>{children}</CardContent>
      ) : (
        <>
          <CardHeader>
            {title === undefined ? null : <CardTitle>{title}</CardTitle>}
            {description === undefined ? null : <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </>
      )}
    </Card>
  );
}

/**
 * One figure, with the word under it that says what it counts.
 *
 * The label is not decoration: a bare number on a dashboard of numbers is
 * unreadable a week later, and "connected players" is the difference between a
 * figure somebody acts on and one they have to look up.
 *
 * A value that is a word rather than a number — an address, a name — is set in a
 * smaller size than a figure, because it is a length of text and not a count,
 * and a count set in a monospace size small enough for an address reads as a
 * quantity that happens to be missing.
 */
export function StatTile({
  label,
  value,
  textual = false,
}: {
  label: string;
  value: ReactNode;
  /** Whether the value is a word or an address rather than a figure. */
  textual?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-4">
      <p
        className={cn(
          'font-extrabold tracking-tight text-foreground',
          textual ? 'font-mono text-sm break-all' : 'text-3xl tabular-nums',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
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
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.header} scope="col" className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.header} className={column.className}>
                {column.cell(row) ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
