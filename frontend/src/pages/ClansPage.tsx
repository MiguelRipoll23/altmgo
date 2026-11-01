import { ArrowUpDown, ChevronRight, Funnel, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClanEmblem } from '../components/ClanEmblem';
import { LoadingBlock, SectionHeading, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { cn } from '../lib/utils';

/**
 * One clan as the directory lists it.
 *
 * Exported rather than kept here because the clan's own page reads the same row out
 * of a different query: the directory and the record are two reads of one clan, and
 * the fields below are the fields both of them answer for.
 */
export type Clan = {
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
  /** Whether the clan has drawn an emblem the server can serve as a picture. */
  hasEmblem: boolean;
};

/** One member of a clan. */
export type ClanMember = {
  characterId: number;
  name: string;
  rank: number;
  isLeader: boolean;
};

/** One character waiting to be let into a clan. */
export type ClanApplication = {
  id: number;
  characterId: number;
  characterName: string;
  appliedAt: string;
};

/** A clan in full: its record, its roster and the applications waiting on it. */
export type ClanProfile = { clan: Clan; members: ClanMember[]; applications: ClanApplication[] };

/** The orderings the backend accepts, kept in step with the query it runs. */
const sorts = [
  { value: 'name', label: 'Name' },
  { value: 'members', label: 'Roster size' },
  { value: 'recent', label: 'Newest' },
] as const;

/** Which side of the applications a search is looking at. */
const statuses = [
  { value: 'all', label: 'All clans' },
  { value: 'open', label: 'Taking applications' },
  { value: 'closed', label: 'Closed' },
] as const;

/**
 * Every clan on the server, as a directory of them.
 *
 * The page draws what the game already stores and writes nothing: a roster, a
 * notice, an emblem timestamp and the queue of characters waiting to join are all
 * facts the clan set up in the client, and the dashboard's job here is to make them
 * legible to somebody who is not holding the clan screen open. Accepting an
 * application is the clan leader's action in the game, not one this page performs.
 *
 * The applications are shown rather than hidden behind a staff role because they are
 * a public queue in the client too — the joinable-clan list reads the same rows —
 * and a leader answering them does it in the game.
 *
 * A clan's name leads to the clan rather than opening it underneath this list. The
 * record is three things long — its figures, its roster, its queue — and it used to
 * arrive as a panel at the foot of a directory the reader was still scrolling
 * through, on a page that grew with every clan that was opened, and it had no
 * address of its own to be sent to anybody. It is a page now, and this is the
 * directory it is reached from.
 *
 * The filter fields are behind a Filters button and the order is on the control line
 * above the list, the way the games page is laid out. The form they used to sit in
 * was a panel of its own above the directory, so a reader who had come to look at
 * clans met two headings, a search field, two dropdowns and two buttons before the
 * first clan. The list is the page; the controls are one line above it, and the
 * count sits beside them rather than inside a panel title of its own.
 *
 * The cards themselves are not inside a panel either. A card inside a bordered box
 * is two frames around one thing, and the games page had already dropped the outer
 * one — the grid of cards is the content, and a panel around it was a third frame
 * that said the things below it were the things below it.
 */
export function ClansPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<string>('name');
  const [status, setStatus] = useState<string>('all');
  const [submitted, setSubmitted] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = useApiResource<{ clans: Clan[] }>(
    `/api/clans?term=${encodeURIComponent(submitted)}&sort=${sort}&status=${status}`,
  );

  const clans = list.data?.clans ?? [];

  // How many of the filters are applied, which is what the button's badge counts.
  // The typed term counts only once it has been submitted, because until then it
  // has not narrowed anything — a badge that counted a word the reader was still
  // typing would say the list is filtered before the list agrees.
  const activeFilters = (submitted.length > 0 ? 1 : 0) + (status !== 'all' ? 1 : 0);
  const busy = activeFilters > 0;

  function clearFilters() {
    setTerm('');
    setSubmitted('');
    setStatus('all');
    setSort('name');
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Clans" />

      {list.error === null ? null : <StatusMessage kind="error">{list.error}</StatusMessage>}

      {/* The controls, in one line, once there is a list to control. While the
          first read is in flight there is nothing to filter, sort or count, so
          the line is not drawn rather than drawn from an empty list. */}
      {list.data === null ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Funnel aria-hidden="true" />
                Filters
                {activeFilters === 0 ? null : (
                  <Badge variant="secondary" className="ml-1">
                    {formatNumber(activeFilters)}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>Narrow the clans by name or applications.</DialogDescription>
              </DialogHeader>

              {/* The fields are a form because the name is searched on submit
                  rather than on every keystroke: a reader halfway through typing an
                  unfamiliar name should not watch the list change under the field
                  they are typing in. The Applications dropdown is not submitted
                  with it — a filter that has been chosen has been chosen — so
                  choosing one filters the list straight away. */}
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitted(term.trim());
                  // The search has been asked for, so the dialog it was asked in
                  // has nothing left to say; the list behind it is the answer.
                  setFiltersOpen(false);
                }}
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-base text-muted-foreground">Search</span>
                  <span className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="clan-term"
                      type="text"
                      value={term}
                      onChange={(event) => setTerm(event.target.value)}
                      placeholder="Clan name"
                      className="pl-9"
                    />
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-base text-muted-foreground">Applications</span>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full" aria-label="Applications">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearFilters}
                    disabled={!busy && sort === 'name'}
                  >
                    Clear filters
                  </Button>

                  <Button type="submit">Search</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger aria-label="Order by" className="w-auto justify-start">
              <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Order by</span>
              <SelectValue className="flex-1 text-left" />
            </SelectTrigger>
            <SelectContent>
              {sorts.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* The read the reader asked for. It spins while the answer is in
              flight and is disabled for that moment, so a second press cannot
              start a second read of the same list. */}
          <Button
            variant="outline"
            onClick={list.reload}
            disabled={list.loading}
          >
            <RefreshCw className={cn(list.loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </Button>

          {/* How many clans answered, beside the controls that asked. The list is
              filtered by the server, so this is the count of what came back rather
              than of everything the server holds. */}
          <p className="text-base text-muted-foreground tabular-nums">
            {formatNumber(clans.length)} clans
          </p>
        </div>
      )}

      {clans.length === 0 ? (
        list.loading ? (
          <LoadingBlock centered label="Searching…" />
        ) : (
          <p className="text-base text-muted-foreground">No clan matched that search.</p>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clans.map((clan) => (
            <li key={clan.id} className="min-w-0">
              <ClanCard clan={clan} basePath={basePath} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One clan, as a card.
 *
 * A card and not a row for the same reason the rooms are cards: a clan is something
 * a player recognises rather than a line of figures to scan, and the emblem is the
 * thing they recognise it by. A table has nowhere to put a picture, so the one piece
 * of a clan that is not a number had no place on the page at all.
 *
 * The whole card is the link, as on the characters page, because a clan is a page of
 * its own and a card whose link is a few characters of its name is a card that can
 * only be shared from that corner of itself. The arrow at the end says so in the
 * width an arrow costs, and the words "See the clan" went with the height they were
 * taking from every card.
 *
 * The emblem is a small square beside the words rather than the full-width banner
 * above them it used to be. A square emblem as wide as the card makes the card as
 * tall as that square, and it left the card mostly empty whenever the clan's own
 * sentence was short — a directory of a dozen clans was a screen and a half of
 * picture for about three lines of text each. The emblem is what a reader recognises
 * a clan by, not what they read, so it is sized like an icon and the words are given
 * the width a line of them needs.
 */
function ClanCard({ clan, basePath }: { clan: Clan; basePath: string }) {
  return (
    <Link
      to={`${basePath}/clans/${clan.id}`}
      className="group flex h-full items-center gap-4 overflow-hidden rounded-xl border border-border bg-card/50 px-4 py-3.5 transition hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ClanEmblem clanId={clan.id} name={clan.name} hasEmblem={clan.hasEmblem} size="size-16" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
            {clan.name}
          </h2>
          <Badge variant={clan.open ? 'success' : 'secondary'}>
            {clan.open ? 'open' : 'closed'}
          </Badge>
        </div>

        <p className="truncate text-base text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {formatNumber(clan.memberCount)}
          </span>{' '}
          {clan.memberCount === 1 ? 'member' : 'members'}
        </p>

        <p className="truncate text-base text-muted-foreground">
          {clan.comment === '' ? 'No comment' : clan.comment}
        </p>
      </div>

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
