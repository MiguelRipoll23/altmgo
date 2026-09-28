import { Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
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

type Game = {
  id: number;
  name: string;
  comment: string;
  hostName: string | null;
  lobbyName: string | null;
  players: number;
  maximumPlayers: number;
  mode: number;
  status: number;
  hasPassword: boolean;
  updatedAt: string;
};

/**
 * The rooms that are up right now.
 *
 * A room stops being listed once the host stops writing to it, so an empty list
 * means no game is being hosted rather than that the page has lost the rooms it
 * once showed. The list is a live thing by nature and is not a record of what
 * was played.
 *
 * A manager can correct a room's name and comment and can remove the room, and the
 * page says plainly what that is worth. A game row belongs to the host, who writes
 * it again on every heartbeat: a corrected name lasts until the host next saves its
 * own, and a comment corrected mid-game is a comment the players read until the
 * round ends. It is still worth having — a host that has gone quiet leaves its room
 * listed, and a room with a name nobody would choose is the first thing a manager
 * wants to fix without opening a database — but a control that silently undoes
 * itself is worse than one that says that it will.
 */
export function GamesPage() {
  const mayWrite = useMayManage();
  const rooms = useApiResource<{ games: Game[] }>('/api/games');
  const { data, error, loading, reload } = rooms;

  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [removing, setRemoving] = useState<Game | null>(null);

  /**
   * Runs a room write, says how it went, and reads the rooms again.
   *
   * Reloading rather than patching, for the same reason as everywhere else here: the
   * player count and the status are the host's to move, and a row patched from what
   * a write returned is a row the host has already contradicted.
   */
  async function write(action: () => Promise<unknown>, done: string) {
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      rooms.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Games" subtitle="The rooms that are being hosted right now." />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}
      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>

        {loading || data === null ? null : (
          <p className="text-sm text-muted-foreground">
            {formatNumber(data.games.length)} {data.games.length === 1 ? 'room' : 'rooms'} being hosted
          </p>
        )}
      </div>

      {mayWrite ? (
        <p className="text-xs text-muted-foreground">
          A room belongs to the host, who writes it again on every heartbeat. A name or a
          comment corrected here lasts until the host next saves its own — which is what you
          want for a room whose host has gone quiet, and not what you want mid-game.
        </p>
      ) : null}

      <Panel>
        <DataTable
          rows={data?.games ?? []}
          rowKey={(row) => row.id}
          empty="No game is being hosted right now."
          loading={loading}
          loadingLabel="Reading the rooms…"
          columns={[
            {
              header: 'Room',
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{row.name}</span>
                  {row.hasPassword ? <Badge variant="warning">password</Badge> : null}
                </span>
              ),
            },
            { header: 'Host', cell: (row) => row.hostName },
            { header: 'Lobby', cell: (row) => row.lobbyName },
            {
              header: 'Players',
              cell: (row) => `${row.players} / ${row.maximumPlayers}`,
              className: 'text-right tabular-nums',
            },
            { header: 'Comment', cell: (row) => row.comment },
            { header: 'Updated', cell: (row) => formatDate(row.updatedAt) },
            ...(mayWrite
              ? [
                  {
                    header: '',
                    cell: (row: Game) => (
                      <RoomActions game={row} onWrite={write} onRemove={() => setRemoving(row)} />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Panel>

      {removing === null ? null : (
        <AlertDialog open onOpenChange={(open) => (open ? null : setRemoving(null))}>
          <AlertDialogContent>
            <AlertDialogTitle>Remove {removing.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The room is deleted, and with it its players, its rounds, its results and its
              statistics. If its host is still connected it will write to a row that is gone:
              the room may come back on the host&apos;s next save, or it may not. The list
              will say which.
            </AlertDialogDescription>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const gone = removing;
                  setRemoving(null);
                  void write(
                    () =>
                      apiRequest(`/api/games/${gone.id}`, {
                        method: 'DELETE',
                        token: readSessionToken(),
                      }),
                    `${gone.name} was removed.`,
                  );
                }}
              >
                Remove it
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

/**
 * The edit and remove controls for one room.
 *
 * Editing expands under the row rather than opening a page, for the reason the
 * schedule rows do: the values being changed are the ones already on the row, so the
 * operator is editing the room they meant rather than a copy of it.
 *
 * The controls are drawn for the manager role rather than for the frame, so a manager
 * reading the public list has them there too — the same rule the server applies, and
 * the reason the page behaves the same whichever of the two addresses to it the
 * browser is on.
 */
function RoomActions({
  game,
  onWrite,
  onRemove,
}: {
  game: Game;
  onWrite: (action: () => Promise<unknown>, done: string) => Promise<void>;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(game.name);
  const [comment, setComment] = useState(game.comment);

  if (!editing) {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil />
          Edit
        </Button>

        <Button variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1 space-y-2">
          <Label htmlFor={`game-name-${game.id}`}>Name</Label>
          <Input
            id={`game-name-${game.id}`}
            value={name}
            maxLength={16}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor={`game-comment-${game.id}`}>Comment</Label>
          <Input
            id={`game-comment-${game.id}`}
            value={comment}
            maxLength={128}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        <Button
          disabled={name.trim().length === 0 || (name === game.name && comment === game.comment)}
          onClick={() => {
            void onWrite(
              () =>
                apiRequest(`/api/games/${game.id}`, {
                  method: 'PUT',
                  token: readSessionToken(),
                  body: { name: name.trim(), comment },
                }),
              `${game.name} was corrected.`,
            );
            setEditing(false);
          }}
        >
          Save
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            setName(game.name);
            setComment(game.comment);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        The host writes this row again on its next save, so this lasts until then.
      </p>
    </div>
  );
}
