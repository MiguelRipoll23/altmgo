import { Link } from 'react-router-dom';
import { DataTable, Panel, SectionHeading, formatDate } from './DataDisplay';
import { StatusMessage } from './StatusMessage';
import { useApiResource } from './useApiResource';
import { Badge } from './ui/badge';

/** Which side of a delivery a mailbox lists. */
export type MailboxName = 'inbox' | 'outbox';

/** One message in the caller's own mail, on either side of the delivery. */
type AccountMessage = {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  recipientName: string;
  sentAt: string;
  isRead: boolean;
  received: boolean;
};

/** What each mailbox is called, and what it says when it is empty. */
const mailboxes: Record<MailboxName, { title: string; empty: string }> = {
  inbox: {
    title: 'Inbox',
    empty: 'Your inbox is empty.',
  },
  outbox: {
    title: 'Outbox',
    empty: 'None of your characters has sent any mail.',
  },
};

/**
 * One window of one mailbox.
 *
 * A mail row is a single message with a read and a deleted flag at each end, so
 * the two mailboxes are two views of one table rather than two tables. A message
 * deleted on one side is out of that side's list and in the other's, which is
 * what the flags are for — and it is why there is no third list holding both: a
 * union of these two is the same rows a second time, in a different order the
 * reader did not ask for.
 *
 * The list is subjects, both names and the date, not bodies: a letter is a
 * paragraph, and a mailbox that expanded every one of them underneath its own list
 * would be a wall. The unread mark is carried because an inbox is the one list
 * where what has not been read yet is the whole point, and the game draws the same
 * letter the same way. A message in the outbox is never marked, because the read
 * flag belongs to the other end of it.
 *
 * A subject links to `/mail/<box>/<id>` rather than to `/mail/<id>` with the box
 * carried alongside. The two mailboxes are separate pages, and a reader who
 * opens a letter from the outbox should be able to share that address and land on
 * the letter, with the mailbox they were reading named in it rather than left in a
 * piece of state the link would have to guess.
 */
export function Mailbox({ mailbox }: { mailbox: MailboxName }) {
  const { data, error, loading } = useApiResource<{ mail: AccountMessage[] }>(
    `/api/mail?box=${mailbox}`,
  );

  const copy = mailboxes[mailbox];

  return (
    <div className="space-y-6">
      <SectionHeading title={copy.title} />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel>
        <DataTable
          rows={data?.mail ?? []}
          rowKey={(row) => row.id}
          empty={copy.empty}
          loading={loading}
          loadingLabel="Reading the mailbox…"
          columns={[
            {
              header: 'Subject',
              cell: (row) => (
                <Link
                  to={`/dashboard/mail/${mailbox}/${row.id}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  {row.subject}
                  {row.received && !row.isRead ? <Badge>new</Badge> : null}
                </Link>
              ),
            },
            { header: 'From', cell: (row) => row.senderName },
            { header: 'To', cell: (row) => row.recipientName },
            { header: 'Sent', cell: (row) => formatDate(row.sentAt) },
          ]}
        />
      </Panel>
    </div>
  );
}
