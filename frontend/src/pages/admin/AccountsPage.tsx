import { ShieldCheck, ShieldMinus, ShieldPlus } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../../api';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { readSessionToken } from '../../session';

/**
 * Every account, and the staff roles it holds.
 *
 * This is the page that decides who may use the rest of this dashboard, so it is
 * manager-only at the route: a moderator can run the events and cannot hand out the
 * permission to do so. The roles are read back from the server on every load rather
 * than patched locally after a grant, because a role is the one thing on this
 * dashboard whose effect is invisible until the next request — a list that claimed a
 * grant the server refused would be worse than a slow one.
 */

/** One role an account holds. */
type HeldRole = { role: string; grantedAt: string };

/** One account, as the backend lists it. */
type Account = {
  id: number;
  displayName: string;
  mainCharacterName: string | null;
  currentCharacterName: string | null;
  characterCount: number;
  bannedUntil: string | null;
  banReason: string | null;
  roles: HeldRole[];
};

/** The roles this deployment knows, in the order they are offered. */
const roles = [
  { value: 'moderator', label: 'Moderator' },
  { value: 'manager', label: 'Manager' },
] as const;

export function AccountsPage() {
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const accounts = useApiResource<{ accounts: Account[] }>('/api/manager/roles');

  const shown = (accounts.data?.accounts ?? []).filter((account) => {
    const needle = submitted.toLowerCase();

    if (needle.length === 0) {
      return true;
    }

    return (
      account.displayName.toLowerCase().includes(needle) ||
      (account.mainCharacterName ?? '').toLowerCase().includes(needle) ||
      account.roles.some((held) => held.role.includes(needle))
    );
  });

  async function changeRole(
    accountId: number,
    role: string,
    grant: boolean,
  ) {
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
      accounts.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Accounts and roles"
        subtitle="Every account on the server, and the staff roles it holds."
      />

      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}
      {accounts.error === null ? null : <StatusMessage kind="error">{accounts.error}</StatusMessage>}

      <Panel>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(term.trim());
          }}
        >
          <div className="min-w-48 flex-1 space-y-2">
            <Input
              id="account-term"
              type="text"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search an account, character or role"
              aria-label="Search an account, character or role"
            />
          </div>

          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Panel>

      <Panel title="Accounts">
        <DataTable
          rows={shown}
          rowKey={(row) => row.id}
          empty={accounts.loading ? 'Reading the accounts…' : 'No account matched that search.'}
          columns={[
            { header: 'Account', cell: (row) => row.displayName },
            { header: 'Main character', cell: (row) => row.mainCharacterName },
            { header: 'Current character', cell: (row) => row.currentCharacterName },
            {
              header: 'Characters',
              cell: (row) => formatNumber(row.characterCount),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Banned until',
              cell: (row) =>
                row.bannedUntil === null ? (
                  <Badge variant="secondary">no</Badge>
                ) : (
                  formatDate(row.bannedUntil)
                ),
            },
            {
              header: 'Roles',
              cell: (row) => <RoleButtons account={row} busy={busy} onChange={changeRole} />,
            },
          ]}
        />
      </Panel>
    </div>
  );
}

/**
 * The grant and revoke controls for one account's roles.
 *
 * A role the account already holds is shown as a badge and offers a way off it; a
 * role it does not hold is a button that grants it. Both directions are on the same
 * cell rather than in a dialog, because the question an operator is answering is
 * "does this person hold it", and answering that should not cost a click.
 *
 * The revoke button is drawn for the manager role whatever the account holds, and
 * the server is what refuses the last one. Drawing it and having it refuse is better
 * than hiding it: an operator who cannot take the role off somebody needs to be told
 * why, and "the button is missing" is not that.
 */
function RoleButtons({
  account,
  busy,
  onChange,
}: {
  account: Account;
  busy: boolean;
  onChange: (accountId: number, role: string, grant: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((role) => {
        const held = account.roles.some((known) => known.role === role.value);

        return held ? (
          <Badge key={role.value} variant="outline" className="gap-1">
            <ShieldCheck className="size-3" />
            {role.label}
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(account.id, role.value, false)}
              className="ml-0.5 rounded hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Take the ${role.label} role away from ${account.displayName}`}
            >
              <ShieldMinus className="size-3" />
            </button>
          </Badge>
        ) : (
          <Button
            key={role.value}
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onChange(account.id, role.value, true)}
            aria-label={`Give ${account.displayName} the ${role.label} role`}
          >
            <ShieldPlus />
            {role.label}
          </Button>
        );
      })}

      {account.roles.length === 0 ? (
        <span className="text-xs text-muted-foreground">Player</span>
      ) : null}
    </div>
  );
}
