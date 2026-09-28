import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
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
import { useMayManage } from '../components/useStaffRole';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { readSessionToken } from '../session';
import { Textarea } from '../components/ui/textarea';
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
 * Almost nothing here is written, and the exception is deliberate. A roster, a
 * leader and a pending application are facts the game owns — promoting somebody,
 * expelling a member and accepting an application all move rows the client is the
 * only thing that should be moving — and a dashboard that could do them would be a
 * second place to keep them correct, and a worse one, because such a write would
 * satisfy the foreign keys while breaking rules nothing checks.
 *
 * A clan's own text is different. A name, a comment and a notice are things a
 * leader types, and a manager who cannot correct one of them is left explaining in
 * chat what a form could have said. So those are editable here, and the roster
 * underneath still is not.
 */
export function ClanDetailPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const { identifier } = useParams();
  const mayWrite = useMayManage();
  const detail = useApiResource<ClanProfile>(`/api/clans/${identifier}`);

  const { data, error, loading } = detail;
  const clan = data?.clan ?? null;

  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  /**
   * Runs a clan write, says how it went, and reads the clan again.
   *
   * Reloading rather than patching is the same rule the event pages follow: the
   * roster and the queue are the game's to move, and a list patched from what a
   * write returned is a list the server has already contradicted.
   */
  async function write(action: () => Promise<unknown>, done: string) {
    setStatus(null);

    try {
      const said = await action();
      setStatus({
        kind: 'success',
        message: typeof said === 'string' ? said : done,
      });
      detail.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to={`${basePath}/clans`}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All clans
      </Link>

      <SectionHeading
        title={clan?.name ?? 'Clan'}
        subtitle="The clan as it stands in the game: its record, its roster and who is waiting to join."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}
      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      <Panel>
        {clan === null ? (
          loading ? (
            <LoadingBlock label="Reading the clan…" />
          ) : error === null ? (
            <p className="text-sm text-muted-foreground">That clan could not be read.</p>
          ) : null
        ) : (
          <ClanFacts clan={clan} />
        )}
      </Panel>

      {mayWrite ? (
        <ClanControls clan={clan} identifier={identifier} onWrite={write} />
      ) : null}

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
 * The controls that correct or remove a clan.
 *
 * Only the three text fields, and the removal. Nothing here touches the roster,
 * the leader or the queue of applications, because those are the game's to move —
 * a control here would satisfy the foreign keys while producing a clan whose leader
 * is not in it, which is a worse outcome than not offering the button.
 *
 * The removal asks first, and says afterwards what went with it. Deleting a clan
 * looks like one line leaving a directory, and the roster going with it is forty
 * people leaving theirs; the server counts both and the sentence names them, so
 * the operator is not left guessing how much they just removed.
 */
function ClanControls({
  clan,
  identifier,
  onWrite,
}: {
  clan: Clan | null;
  identifier: string | undefined;
  onWrite: (action: () => Promise<unknown>, done: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(true);

  // The fields are seeded from the clan once, and re-seeded whenever a different
  // clan is opened, so a correction abandoned halfway is not carried onto the next
  // clan the reader opens. It is done during the render rather than in an effect
  // because an effect would paint the previous clan's text for one frame, and on a
  // form that is the frame somebody reads before pressing save.
  //
  // The seed is keyed on the id rather than on the values, so a correction saved and
  // then re-read back does not throw away what the operator has typed since.
  const [seeded, setSeeded] = useState<number | null>(null);

  if (clan !== null && seeded !== clan.id) {
    setSeeded(clan.id);
    setName(clan.name);
    setComment(clan.comment);
    setNotice(clan.notice);
    setOpen(clan.open);
  }

  // Every hook above runs whatever the clan is, so the component may return early
  // once they have: a read that has not arrived is a read in progress, and returning
  // before the hooks would make the number of hooks depend on the data.
  if (clan === null) {
    return null;
  }

  const unchanged =
    name === clan.name &&
    comment === clan.comment &&
    notice === clan.notice &&
    open === clan.open;

  return (
    <>
      <Panel title="Correct this clan">
        <p className="mb-4 text-sm text-muted-foreground">
          The three things a leader types. The roster, the leader and the applications are
          not here — those are the game&apos;s to move.
        </p>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clan-name">Name</Label>
              <Input
                id="clan-name"
                value={name}
                maxLength={15}
                onChange={(event) => setName(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Up to fifteen characters, and unique across the server.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clan-comment">Comment</Label>
              <Input
                id="clan-comment"
                value={comment}
                maxLength={128}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clan-notice">Notice</Label>
              <Textarea
                id="clan-notice"
                value={notice}
                maxLength={512}
                rows={4}
                onChange={(event) => setNotice(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {notice.length} of 512. Saving moves the notice&apos;s timestamp, because a
                corrected notice has been published again.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={open}
                onChange={(event) => setOpen(event.target.checked)}
                className="size-4 accent-primary"
              />
              Accepting applications
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={unchanged || name.trim().length === 0}
                onClick={() => {
                  void onWrite(
                    () =>
                      apiRequest(`/api/clans/${identifier}`, {
                        method: 'PUT',
                        token: readSessionToken(),
                        body: { name: name.trim(), comment, notice, open },
                      }),
                    'The clan was corrected.',
                  ).then(() => setEditing(false));
                }}
              >
                Save
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setName(clan.name);
                  setComment(clan.comment);
                  setNotice(clan.notice);
                  setOpen(clan.open);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>

            <Button variant="destructive" onClick={() => setRemoving(true)}>
              <Trash2 />
              Remove
            </Button>
          </div>
        )}
      </Panel>

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove {clan.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The clan is deleted, and so is its roster of {clan.memberCount} and its{' '}
            {clan.applicationCount} waiting application{clan.applicationCount === 1 ? '' : 's'}.
            The characters themselves are not touched — they are simply no longer in a clan.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onWrite(
                  () =>
                    apiRequest<{ message: string }>(`/api/clans/${identifier}`, {
                      method: 'DELETE',
                      token: readSessionToken(),
                    }).then((result) => result.message),
                  `${clan.name} was removed.`,
                );
              }}
            >
              Remove it
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Notice</p>
        <p className="mt-1 text-sm text-foreground/90">
          {clan.notice.trim().length === 0 ? 'This clan has published no notice.' : clan.notice}
        </p>
      </div>

      {clan.comment.trim().length === 0 ? null : (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Comment</p>
          <p className="mt-1 text-sm text-foreground/90">{clan.comment}</p>
        </div>
      )}
    </div>
  );
}

/** One labelled figure of a clan. */
function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground/90">{value ?? '—'}</dd>
    </div>
  );
}
