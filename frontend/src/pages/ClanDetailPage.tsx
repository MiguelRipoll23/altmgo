import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ClanEmblem } from '../components/ClanEmblem';
import {
  DataTable,
  LoadingBlock,
  Panel,
  SectionHeading,
  formatDate,
  formatNumber,
} from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import type { Clan, ClanMember, ClanApplication, ClanProfile } from './ClansPage';

/**
 * One clan: its record, its roster and the characters waiting to be let in.
 *
 * It is a page rather than a panel that appeared at the foot of the directory, for
 * the same reason the news and mail details are pages: a clan is something a player
 * sends to somebody, and an address that opens the directory with a clan expanded
 * under it is an address that cannot be pasted anywhere. It was also a page that
 * read badly: a clan opened below a directory the reader was still scrolling
 * through, on a page that got longer every time one was opened, so the record a
 * reader had asked for arrived underneath everything they did not.
 *
 * The list it came from keeps the filters it was filtered by out of the address, and
 * that is deliberate: a clan's address should be the clan. A reader who filters to
 * the open clans, opens one and shares the link gets a link to the clan rather than
 * to one reader's view of the directory.
 *
 * Nothing here writes, and that is not an oversight. A name, a comment and a
 * notice are things a leader types in the client, and a roster, a leader and a
 * pending application are rows the game owns — promoting somebody, expelling a
 * member and accepting an application all move rows the client is the only thing
 * that should be moving. A dashboard that could do them would be a second place to
 * keep them correct, and a worse one, because such a write would satisfy the
 * foreign keys while breaking rules nothing checks. The server is what runs the
 * clan; this page shows what it has.
 */
export function ClanDetailPage() {
  const { identifier } = useParams();
  const detail = useApiResource<ClanProfile>(`/api/clans/${identifier}`);

  const { data, error, loading } = detail;
  const clan = data?.clan ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/clans"
        className="inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All clans
      </Link>

      <SectionHeading title={clan?.name ?? 'Clan'} />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel>
        {clan === null ? (
          loading ? (
            <LoadingBlock label="Reading the clan…" />
          ) : error === null ? (
            <p className="text-base text-muted-foreground">That clan could not be read.</p>
          ) : null
        ) : (
          /* The emblem stands beside the clan's own figures rather than in a band of
             its own above them. On the directory card it is a full-width band because
             the card is mostly the emblem; here the record is mostly figures, and a
             square the width of the panel would push the roster a long way down the
             page for a 32px drawing. It is the same emblem, drawn by the same
             component, at the size this page has room for. */
          <div className="flex items-start gap-4">
            <ClanEmblem clanId={clan.id} name={clan.name} hasEmblem={clan.hasEmblem} size="size-24" />

            <div className="min-w-0 flex-1">
              <ClanFacts clan={clan} />
            </div>
          </div>
        )}
      </Panel>

      {data === null ? null : (
        <Panel title="Roster, by rank">
          <DataTable
            rows={[...data.members].sort((left, right) => left.rank - right.rank)}
            rowKey={(row) => row.characterId}
            empty="This clan has no members."
            columns={[
              {
                header: 'Character',
                cell: (row: ClanMember) => (
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{row.name}</span>
                    {row.isLeader ? <Badge>leader</Badge> : null}
                  </span>
                ),
              },
              {
                header: 'Rank',
                cell: (row: ClanMember) => row.rank,
                className: 'text-right tabular-nums',
              },
            ]}
          />
        </Panel>
      )}

      {data === null ? null : (
        <Panel title="Waiting to join, oldest first">
          <DataTable
            rows={[...data.applications].sort(
              (left, right) =>
                new Date(left.appliedAt).getTime() - new Date(right.appliedAt).getTime(),
            )}
            rowKey={(row: ClanApplication) => row.id}
            empty="Nobody is waiting to join this clan."
            columns={[
              { header: 'Character', cell: (row: ClanApplication) => row.characterName },
              { header: 'Applied', cell: (row: ClanApplication) => formatDate(row.appliedAt) },
            ]}
          />
        </Panel>
      )}
    </div>
  );
}

/**
 * The figures of one clan, above its roster.
 *
 * The notice is given a band of its own rather than a column, because it is the one
 * field on this page written by a player for other players and the only one that
 * runs to more than a few words. It is shown even when it is empty rather than
 * hidden, so a clan with no notice reads as having none rather than as having no
 * field at all.
 */
function ClanFacts({ clan }: { clan: Clan }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Leader" value={clan.leaderName} />
        <Detail label="Members" value={formatNumber(clan.memberCount)} />
        <Detail label="Applications" value={formatNumber(clan.applicationCount)} />
        <Detail label="Taking applications" value={clan.open ? 'Yes' : 'No'} />
        <Detail label="Created" value={formatDate(clan.createdAt)} />
        <Detail label="Notice published" value={formatDate(clan.noticeAt)} />
      </dl>

      <div>
        <p className="text-base uppercase tracking-widest text-muted-foreground">Notice</p>
        <p className="mt-1 text-base text-foreground/90">
          {clan.notice.trim().length === 0 ? 'This clan has published no notice.' : clan.notice}
        </p>
      </div>

      {clan.comment.trim().length === 0 ? null : (
        <div>
          <p className="text-base uppercase tracking-widest text-muted-foreground">Comment</p>
          <p className="mt-1 text-base text-foreground/90">{clan.comment}</p>
        </div>
      )}
    </div>
  );
}

/** One labelled figure of a clan. */
function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-base uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base text-foreground/90">{value ?? '—'}</dd>
    </div>
  );
}
