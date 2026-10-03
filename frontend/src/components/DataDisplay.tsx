import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
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

/**
 * The heading every dashboard section opens with.
 *
 * It takes a title and nothing else, and it used to take a sentence under it as
 * well. Every page carried one, and they were all the same kind of line: the
 * title restated in a longer sentence, saying what the page is about to a reader
 * who had just read what the page is called. The titles are already that
 * sentence. What a page needs under its heading is its own content — a count, a
 * description of the list below it — and that belongs in the panel it sits over,
 * where it can be read as part of that panel rather than as a promise about the
 * page.
 *
 * So the prop is gone rather than merely unused: leaving it would make putting a
 * sentence back a one-word change on a page, and every page had one for a reason
 * that turned out not to be a reason.
 *
 * `className` is for the page that needs the heading to sit tighter against
 * something drawn immediately under it. The heading carries its own bottom margin
 * because it is normally the first thing in a page and the gap below it is the
 * page's; a page that puts its own line there would otherwise have to reach in
 * and pull the heading up from outside, which is a coupling to the exact margin
 * rather than a statement of the gap wanted here.
 */
export function SectionHeading({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-6', className)}>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h1>
    </div>
  );
}

/** A card a panel of controls or a list sits in. */
export function Panel({ title, description, footer, children, className }: {
  title?: string;
  description?: ReactNode;
  /** A band under the content, for paging or a count. Drawn inside the card. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headed = title !== undefined || description !== undefined;

  return (
    <Card className={className}>
      {headed ? (
        <CardHeader>
          {title === undefined ? null : <CardTitle>{title}</CardTitle>}
          {description === undefined ? null : <CardDescription>{description}</CardDescription>}
        </CardHeader>
      ) : null}

      {/* The card's own content band carries no top padding of its own, because it
          normally sits under a heading band that has already given the card its
          space. A panel with no heading has nothing above it doing that, so it puts
          the padding back — otherwise its first line is drawn against the top border
          of the card, which is what a body of text touching the frame looks like. */}
      <CardContent className={cn(headed ? undefined : 'pt-5 sm:pt-6')}>{children}</CardContent>

      {footer === undefined ? null : <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

/**
 * A panel that is still being read.
 *
 * It is drawn inside the card the content will arrive in rather than above it or in
 * place of it, because the position of the reading message is the position of the
 * answer: a page that shows a card with nothing in it has shown an empty box, and a
 * page that shows the message outside the card has shown it somewhere the content is
 * not going to be.
 *
 * The words are the ones the page would have said, and a spinner rides beside them
 * because a sentence with nothing moving on it reads as a page that has settled on
 * an empty answer.
 */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-1 text-base text-muted-foreground">
      <RefreshCw className="size-4 shrink-0 animate-spin" />
      {label}
    </p>
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
 *
 * The action, when there is one, is drawn inside the tile rather than beside it:
 * a figure with a control of its own is a figure and a control that belong
 * together, and a button floating in a row of tiles under the one it acts on is a
 * button somebody has to work out which tile it belongs to. It is separated by
 * space and not by a rule — a line inside a card splits it into two things, and
 * this is one thing: a figure and the button that brings it up to date.
 */
export function StatTile({
  label,
  value,
  textual = false,
  action,
}: {
  label: string;
  value: ReactNode;
  /** Whether the value is a word or an address rather than a figure. */
  textual?: boolean;
  /** A control for this figure, drawn inside the tile below the label. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 px-4 py-4">
      <div className="flex-1">
        <p
          className={cn(
            'font-extrabold tracking-tight text-foreground',
            textual ? 'font-mono text-base break-all' : 'text-3xl tabular-nums',
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-base uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>

      {action === undefined ? null : <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * The figures, while they are still being read.
 *
 * A tile with an em dash in it is a figure that has not arrived, and a bordered
 * card with a label under a dash says "this is a count, and it is zero" to anyone
 * glancing at it — the label is the part that misleads, because there is nothing
 * that says whether the dash is the answer or the absence of one. So the tiles are
 * not drawn at all while there is nothing to put in them: a page of figures in
 * flight is a row of quiet blocks, and the figures arrive as tiles.
 *
 * They are blocks rather than cards for the same reason. A card with a border and
 * no content is an empty box, and an empty box repeated across the top of a page
 * looks like something failed.
 *
 * They are the shape of the row they stand in for, which is the part that is easy
 * to get wrong. A skeleton in a different grid from the real thing does not save
 * anybody time: the page is laid out twice and reflows the moment the figures
 * land, so the reader watches the content jump under them after a wait that was
 * supposed to be still. `tallIndex` is for the one tile in a row that carries a
 * control as well as a figure, which makes it taller than the rest — the grid
 * stretches its neighbours to match it, here as it does there, so only that one
 * block is given a height.
 */
export function FigureSkeletons({
  count = 4,
  tallIndex,
  className,
}: {
  count?: number;
  /**
   * Which block stands in for a tile that carries a control as well as a figure,
   * and so is taller than the ones beside it. The rest are left without a height
   * so the grid stretches them to the tall one, the way it stretches the real
   * tiles to each other.
   */
  tallIndex?: number;
  /** The grid the tiles will be drawn in, so the blocks do not reflow on arrival. */
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse rounded-xl bg-muted/30',
            index === tallIndex ? 'h-44' : null,
          )}
        />
      ))}
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
 * and only the sentence tells those apart. While the rows are being read it is a
 * loading line inside the same card rather than the empty sentence, because a table
 * that says "no rooms are being hosted" for the half second before the rooms arrive
 * is a page telling the reader something it does not know.
 *
 * A table that already has rows says it is reading again underneath them, rather
 * than emptying itself. The rows on screen are the last ones that were true, and a
 * board that blanks itself while the next page is fetched is a board that loses the
 * reader's place every time they turn a page.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  loading = false,
  loadingLabel = 'Loading…',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty: string;
  /** Whether the rows are still being read. */
  loading?: boolean;
  /** What the reading is, for the case where there is nothing to keep on screen. */
  loadingLabel?: string;
}) {
  if (rows.length === 0) {
    return loading ? (
      <LoadingBlock label={loadingLabel} />
    ) : (
      <p className="text-base text-muted-foreground">{empty}</p>
    );
  }

  return (
    <div>
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

      {loading ? (
        <div className="mt-3">
          <LoadingBlock label={loadingLabel} />
        </div>
      ) : null}
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

/**
 * A date with no time on it, or the word that says there is not one.
 *
 * A second formatter rather than a flag on the first, because the two are asked
 * for opposite reasons and a flag would leave every caller choosing. A time is
 * wanted when the time is the answer — when a character was last seen, when a
 * letter was sent — because two things on the same day are told apart by the hour
 * they happened. A date alone is wanted when the day is the whole of it, which is
 * the case for a news item: news is published when there is something to say and
 * read whenever a reader arrives, so the hour it went up is not a fact about
 * anything the reader does with it.
 *
 * It is the browser's own date formatting, so it reads in the reader's locale and
 * their own order — the same choice `formatDate` makes, for the same reason.
 */
export function formatDay(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
}
