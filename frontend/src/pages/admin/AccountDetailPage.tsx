import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, describeError } from '../../api';
import {
  DataTable,
  LoadingBlock,
  Panel,
  SectionHeading,
  formatDate,
  formatNumber,
} from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import { Badge } from '../../components/ui/badge';
import { readSessionToken } from '../../session';
import { RoleButtons, type HeldRole } from './AccountsPage';

/** One account, as its own page reads it. */
type Account = {
  id: number;
  displayName: string;
  slots: number;
  mainCharacterId: number | null;
  mainCharacterName: string | null;
  currentCharacterId: number | null;
  currentCharacterName: string | null;
  bannedUntil: string | null;
  banReason: string | null;
  roles: HeldRole[];
};

/** One of the account's characters, as this page lists it. */
type OwnedCharacter = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  totalRewards: number;
  lobbyName: string | null;
  createdAt: string;
  lastSeenAt: string | null;
};

/**
 * One account: its record, who plays on it, and the roles it holds.
 *
 * The accounts list was the only place any of this was visible, which made the
 * list carry two jobs — find an account, and act on it. A manager who wanted to
 * see who played on an account had to read it off six columns of every other
 * account, and a manager who wanted to grant a role had to trust that the row
 * they were looking at was the row the button was about.
 *
 * It is a page for the same reason the character and the clan are pages: the
 * address should name the account, so it can be refreshed, opened beside the
 * list, and sent to the colleague who is dealing with the same player.
 *
 * The roles stay here as well as on the list. Granting a role is something a
 * manager does while scanning accounts, and a page behind a click is a click
 * between a question and its answer; the control is the same one in both places
 * rather than a second implementation, so the two cannot disagree about what a
 * role is.
 */
export function AccountDetailPage() {
  const { identifier } = useParams();
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const account = useApiResource<{ account: Account; characters: OwnedCharacter[] }>(
    `/api/manager/accounts/${identifier}`,
  );

  const record = account.data?.account ?? null;
  const characters = account.data?.characters ?? [];

  async function changeRole(accountId: number, role: string, grant: boolean) {
    setBusy(true);
    setStatus(null);

    try {
      await apiRequest('/api/manager/roles', {
        method: grant ? 'POST' : 'DELETE',
        token: readSessionToken(),
        body: { accountId, role },
      });

      setStatus({
        kind: 'success',
        message: grant
          ? `The ${role} role was granted.`
          : `The ${role} role was taken away.`,
      });
      account.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/accounts"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All accounts
      </Link>

      <SectionHeading
        title={record?.displayName ?? 'Account'}
        subtitle="The account as the game stores it: who plays on it, how many characters it may hold, and what it is allowed to do."
      />

      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}
      {account.error === null ? null : <StatusMessage kind="error">{account.error}</StatusMessage>}

      <Panel title="Record">
        {record === null ? (
          account.loading ? (
            <LoadingBlock label="Reading the account…" />
          ) : account.error === null ? (
            <p className="text-sm text-muted-foreground">That account could not be read.</p>
          ) : null
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Account id" value={formatNumber(record.id)} />
              <Detail
                label="Characters"
                value={`${formatNumber(characters.length)} of ${formatNumber(record.slots)} slots`}
              />
              <Detail
                label="Main character"
                value={record.mainCharacterName}
                to={
                  record.mainCharacterId === null
                    ? null
                    : `/admin/characters/${record.mainCharacterId}`
                }
              />
              <Detail
                label="Current character"
                value={record.currentCharacterName}
                to={
                  record.currentCharacterId === null
                    ? null
                    : `/admin/characters/${record.currentCharacterId}`
                }
              />
              <Detail
                label="Banned until"
                value={record.bannedUntil === null ? 'No' : formatDate(record.bannedUntil)}
              />
              <Detail label="Reason" value={record.banReason} />
            </dl>

            {overSlots(characters.length, record.slots) ? (
              <p className="mt-5 text-xs text-muted-foreground">
                The account holds more characters than its slots allow. The game compares
                these two numbers when a character is made, so this is worth a look rather
                than a rule the page is enforcing.
              </p>
            ) : null}
          </>
        )}
      </Panel>

      {record === null ? null : (
        <Panel title="Roles" description="What this account is allowed to do on the dashboard.">
          <RoleButtons
            accountId={record.id}
            displayName={record.displayName}
            roles={record.roles}
            busy={busy}
            onChange={changeRole}
          />
        </Panel>
      )}

      <Panel title="Characters, most recently seen first">
        <DataTable
          rows={characters}
          rowKey={(row) => row.id}
          empty={
            account.loading
              ? 'Reading the characters…'
              : 'This account has no characters.'
          }
          loading={account.loading}
          loadingLabel="Reading the characters…"
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <Link
                  to={`/admin/characters/${row.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              header: 'Experience',
              cell: (row) => formatNumber(row.experience),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Rewards',
              cell: (row) => formatNumber(row.totalRewards),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Lobby',
              cell: (row) =>
                row.lobbyName === null ? (
                  <Badge variant="secondary">none</Badge>
                ) : (
                  row.lobbyName
                ),
            },
            { header: 'Created', cell: (row) => formatDate(row.createdAt) },
            { header: 'Last seen', cell: (row) => formatDate(row.lastSeenAt) },
          ]}
        />
      </Panel>
    </div>
  );
}

/** One labelled figure of an account. */
function Detail({
  label,
  value,
  to = null,
}: {
  label: string;
  value: string | null;
  /** Where the figure is a record in its own right, and so has a page. */
  to?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground/90">
        {value === null ? (
          '—'
        ) : to === null ? (
          value
        ) : (
          <Link to={to} className="text-primary hover:underline">
            {value}
          </Link>
        )}
      </dd>
    </div>
  );
}

/** Whether the account is holding more characters than its slots allow. */
function overSlots(used: number, slots: number): boolean {
  return used > slots;
}
