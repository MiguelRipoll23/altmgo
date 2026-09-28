import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../api';
import { readSessionToken } from '../session';
import { DataTable, type Column } from './DataDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

/** One member of a roster. */
export type Member = { slot: number; character_id: number; name: string; state: number };

/** One team, with everything its card has to show. */
export type Team = {
  id: number;
  name: string;
  comment: string;
  state: number;
  match_type: number;
  lobby_name: string | null;
  consecutive_wins: number;
  paid_reward: number;
  created_at: string;
  members: Member[];
};

/** Runs a write and reports what it did, or the sentence for why it could not. */
export type Write = (action: () => Promise<unknown>, done: string) => void;

/** The team state a moderator can put a team into, and what it means. */
const teamStates = [
  { value: 'joinable', label: 'Joinable' },
  { value: 'queued', label: 'Queued' },
] as const;

/** The member state a moderator can put a member into. */
const memberStates = [
  { value: 'pending', label: 'Pending' },
  { value: 'ready', label: 'Ready' },
] as const;

/** The states as the numbers they are stored as, for showing what a row holds. */
const teamStateNames: Record<number, string> = { 1: 'Joinable', 9: 'Queued' };
const memberStateNames: Record<number, string> = { 1: 'Pending', 2: 'Ready' };

/**
 * The roster's columns.
 *
 * The last column is the one a player does not get: it is the control that
 * changes a state, and a team on a public ladder that any signed-in account can
 * read should not also be one any of them can re-queue.
 */
function rosterColumns(team: Team, mayWrite: boolean, onWrite: Write): Column<Member>[] {
  const columns: Column<Member>[] = [
    { header: 'Slot', cell: (row) => row.slot, className: 'text-right tabular-nums' },
    {
      header: 'Character',
      cell: (row) =>
        row.name.startsWith('server-') ? (
          <span className="flex items-center gap-2">
            {row.name}
            <Badge variant="secondary">server</Badge>
          </span>
        ) : (
          row.name
        ),
    },
    { header: 'State', cell: (row) => memberStateNames[row.state] ?? `State ${row.state}` },
  ];

  if (mayWrite) {
    columns.push({
      header: 'Set',
      cell: (row) => (
        <span className="flex flex-wrap gap-1.5">
          {memberStates.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              onClick={() =>
                onWrite(
                  () =>
                    apiRequest(`/api/moderator/teams/${team.id}/members/${row.slot}`, {
                      method: 'PUT',
                      token: readSessionToken(),
                      body: { state: option.value },
                    }),
                  `${row.name} is ${option.label.toLowerCase()}.`,
                )
              }
            >
              {option.label}
            </Button>
          ))}
        </span>
      ),
    });
  }

  return columns;
}

/**
 * One team, its roster, and the controls that act on it.
 *
 * The controls are drawn only for a moderator, and the server refuses the
 * writes whatever the browser drew, so what is decided here is what a player
 * sees rather than what they may do.
 */
export function TeamCard({
  team,
  mayWrite,
  onWrite,
  onChanged,
}: {
  team: Team;
  mayWrite: boolean;
  onWrite: Write;
  onChanged: () => void;
}) {
  const [memberName, setMemberName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(team.name);
  const [comment, setComment] = useState(team.comment);
  const [removing, setRemoving] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{team.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {teamStateNames[team.state] ?? `State ${team.state}`} · {team.members.length} member
            {team.members.length === 1 ? '' : 's'} · {team.consecutive_wins} win
            {team.consecutive_wins === 1 ? '' : 's'}
          </p>
        </div>

        {mayWrite ? (
          <div className="flex flex-wrap gap-2">
            {teamStates.map((option) => (
              <Button
                key={option.value}
                variant="secondary"
                onClick={() =>
                  onWrite(
                    () =>
                      apiRequest(`/api/moderator/teams/${team.id}/state`, {
                        method: 'PUT',
                        token: readSessionToken(),
                        body: { state: option.value },
                      }),
                    `${team.name} is now ${option.label.toLowerCase()}.`,
                  )
                }
              >
                {option.label}
              </Button>
            ))}

            <Button variant="outline" onClick={() => setRenaming((open) => !open)}>
              <Pencil />
              {renaming ? 'Cancel' : 'Edit'}
            </Button>

            <Button variant="destructive" onClick={() => setRemoving(true)}>
              <Trash2 />
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      {renaming ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-border bg-background/40 p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`rename-${team.id}`}>Team name</Label>
            <Input id={`rename-${team.id}`} value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`comment-${team.id}`}>Comment</Label>
            <Input
              id={`comment-${team.id}`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          <Button
            className="sm:col-span-2 sm:w-fit"
            disabled={name.trim().length === 0}
            onClick={() =>
              onWrite(
                () =>
                  apiRequest(`/api/moderator/teams/${team.id}`, {
                    method: 'PUT',
                    token: readSessionToken(),
                    body: { name: name.trim(), comment },
                  }),
                `${team.name} was renamed.`,
              )
            }
          >
            Save
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        <DataTable
          rows={team.members}
          rowKey={(row) => row.slot}
          empty="This team has nobody on it."
          columns={rosterColumns(team, mayWrite, onWrite)}
        />
      </div>

      {mayWrite ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor={`member-${team.id}`}>Add a character</Label>
            <Input
              id={`member-${team.id}`}
              type="text"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              placeholder="Character name, or a server- one"
            />
          </div>

          <Button
            disabled={memberName.trim().length === 0}
            onClick={() => {
              onWrite(
                () =>
                  apiRequest(`/api/moderator/teams/${team.id}/members`, {
                    method: 'POST',
                    token: readSessionToken(),
                    body: { characterName: memberName.trim() },
                  }),
                `${memberName.trim()} was added to ${team.name}.`,
              );
              setMemberName('');
            }}
          >
            <UserPlus />
            Add
          </Button>
        </div>
      ) : null}

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove {team.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The team and its roster are deleted. A team that has already been drawn into a bracket
            cannot be removed — the fixtures still name it.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onWrite(
                  () =>
                    apiRequest(`/api/moderator/teams/${team.id}`, {
                      method: 'DELETE',
                      token: readSessionToken(),
                    }),
                  `${team.name} was removed.`,
                );
                onChanged();
              }}
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
