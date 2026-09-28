import { useEffect, useState } from 'react';
import { ChevronRight, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiBlob } from '../api';
import { LoadingBlock, Panel, SectionHeading, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { readSessionToken } from '../session';

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
 * What the list panel says above the rows: how many clans answered, and under
 * which of the three filters they answered.
 *
 * A count with no filter beside it is a number nobody can act on — twelve clans is
 * only good news if you asked for the taking-applications ones. While the search is
 * being read the line says so rather than counting the rows that are already on
 * screen, which would be the previous search's answer.
 */
function describeSearch(
  clans: Clan[] | undefined,
  filtered: boolean,
  term: string,
  status: string,
  order: string,
  loading: boolean,
): string {
  if (loading) {
    return 'Searching…';
  }

  if (clans === undefined) {
    return 'Every clan on the server.';
  }

  const count = `${formatNumber(clans.length)} ${clans.length === 1 ? 'clan' : 'clans'}`;

  if (!filtered) {
    return `${count}, ordered by ${order.toLowerCase()}.`;
  }

  const side = statuses.find((option) => option.value === status)?.label ?? 'All clans';

  return term.length === 0
    ? `${count} · ${side.toLowerCase()}, ordered by ${order.toLowerCase()}.`
    : `${count} matching “${term}” · ${side.toLowerCase()}, ordered by ${order.toLowerCase()}.`;
}

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
 */
export function ClansPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<string>('name');
  const [status, setStatus] = useState<string>('all');
  const [submitted, setSubmitted] = useState('');

  const list = useApiResource<{ clans: Clan[] }>(
    `/api/clans?term=${encodeURIComponent(submitted)}&sort=${sort}&status=${status}`,
  );

  // The name is searched on submit rather than on every keystroke, so a reader who
  // is halfway through typing an unfamiliar name does not watch the list change under
  // the field they are typing in. The other two are dropdowns: a filter that has been
  // chosen has been chosen.
  const filtered = submitted.length > 0 || status !== 'all';
  const order = sorts.find((option) => option.value === sort)?.label ?? 'Name';
  const clans = list.data?.clans ?? [];

  function clearFilters() {
    setTerm('');
    setSubmitted('');
    setStatus('all');
    setSort('name');
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Clans"
        subtitle="Every clan on the server. A clan's name opens its record."
      />

      <Panel>
        <form
          // The three fields share a row and the buttons get one of their own,
          // rather than all four competing for the same line. A field that grows to
          // fill what is left beside two fixed-width dropdowns ends up a different
          // width on every window, and the buttons land wherever the remaining space
          // ran out — which on a wide screen is the far edge of the panel, so
          // "Search" is a long way from the field it searches.
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(term.trim());
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
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
              <Label htmlFor="clan-status">Applications</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="clan-status">
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

            <div className="space-y-2">
              <Label htmlFor="clan-sort">Order by</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger id="clan-sort">
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
          </div>

          <div className="flex gap-2">
            {/* The accent, not the secondary weight: Search is the action this
                form exists to perform, and it is the only submit button on any
                page that was not already drawn that way. Clear keeps the ghost
                weight beside it, which is the whole difference between the two —
                one does the thing, the other undoes it. */}
            <Button type="submit">
              Search
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              disabled={!filtered && sort === 'name'}
            >
              Clear
            </Button>
          </div>
        </form>
      </Panel>

      {list.error === null ? null : <StatusMessage kind="error">{list.error}</StatusMessage>}

      <Panel
        title="Clans"
        description={describeSearch(
          list.data?.clans,
          filtered,
          submitted,
          status,
          order,
          list.loading,
        )}
      >
        {clans.length === 0 ? (
          list.loading ? (
            <LoadingBlock label="Searching…" />
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
      </Panel>
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
 * only be shared from that corner of itself.
 *
 * The band is square rather than the rooms' wide one, and that is the emblem's own
 * shape: the game draws these 32x32, so a band of any other ratio would either crop
 * the picture or letterbox it in a space that is pretending to be something it is
 * not. The emblem is held to its pixels rather than scaled smoothly, because at four
 * times its own size a 32x32 image interpolated is a blur, and the drawing is the
 * point of it.
 */
function ClanCard({ clan, basePath }: { clan: Clan; basePath: string }) {
  return (
    <Link
      to={`${basePath}/clans/${clan.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/50 transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ClanEmblem hasEmblem={clan.hasEmblem} clanId={clan.id} name={clan.name} />

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
            {clan.name}
          </h2>
          {clan.open ? null : <Badge variant="secondary">closed</Badge>}
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {formatNumber(clan.memberCount)}
          </p>
          <p className="text-base text-muted-foreground tabular-nums">
            {clan.memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>

        <dl className="space-y-1 text-base">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">Leader</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground">
              {clan.leaderName ?? 'unknown'}
            </dd>
          </div>

          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">Waiting</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground tabular-nums">
              {formatNumber(clan.applicationCount)}{' '}
              {clan.applicationCount === 1 ? 'character' : 'characters'}
            </dd>
          </div>
        </dl>

        {/* The comment is the clan's own sentence about itself, and it is the part
            a reader reads to choose between two otherwise identical cards, so it
            is given the card's width and its remaining height rather than one
            line in a column. */}
        <p className="min-h-10 text-base text-muted-foreground">
          {clan.comment === '' ? 'No comment' : clan.comment}
        </p>

        <span className="mt-auto inline-flex items-center gap-1.5 text-base font-medium text-primary">
          See the clan
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * The emblem a clan drew in the game, or a flag in its place.
 *
 * The game stores an emblem as 768 bytes of packed palette indices, which the
 * backend decodes into a 32x32 PNG and serves from its own route. It cannot be
 * pointed at with a plain `src`, because the image the browser fetches by URL would
 * not carry the session token — so it is fetched here as a blob and shown from an
 * object URL, and the object URL is revoked when the card goes away.
 *
 * A clan that has drawn nothing shows the flag rather than an empty square, and a
 * clan whose emblem fails to load falls back to the same flag: the card's job is to
 * identify a clan, and a broken image icon would say less about it than the icon
 * that stands in for every clan the game has no emblem for.
 */
function ClanEmblem({
  hasEmblem,
  clanId,
  name,
}: {
  hasEmblem: boolean;
  clanId: number;
  name: string;
}) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    if (!hasEmblem) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void apiBlob(`/api/clans/${clanId}/emblem`, { token: readSessionToken() })
      .then((blob) => {
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        // The placeholder is already on screen and stays there. An emblem that
        // will not load is not worth a line of text over the clan's own name.
      });

    return () => {
      cancelled = true;

      // Revoked rather than left to the collector: a directory that is paged
      // through and paged back would otherwise hold one blob per clan it had
      // shown, for as long as the tab was open.
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [clanId, hasEmblem]);

  return (
    <div className="flex aspect-square w-full items-center justify-center border-b border-border bg-muted/20">
      {source === null ? (
        <Flag className="size-8 text-muted-foreground/50" aria-hidden="true" />
      ) : (
        <img
          src={source}
          alt={`${name}'s emblem`}
          className="size-full object-contain [image-rendering:pixelated]"
        />
      )}
    </div>
  );
}
