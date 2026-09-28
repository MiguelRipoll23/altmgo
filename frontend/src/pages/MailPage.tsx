import { Mail, Send } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';

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

/** The three boxes, and what each is called. */
const boxes = [
  { name: 'inbox', label: 'Inbox' },
  { name: 'outbox', label: 'Outbox' },
  { name: 'all', label: 'All' },
] as const;

/**
 * The caller's own mail: what was sent to their characters and what they sent.
 *
 * It is the one list on the dashboard that is about the person reading it rather
 * than about the server. It is also the one place the two sides of a delivery
 * live together, because a mail row is a single message with a read and a deleted
 * flag per end — so the page offers the inbox, the outbox and both, rather than
 * making the reader go and look for what they wrote in the list of what they were
 * sent.
 *
 * The chosen box is in the address rather than in a piece of state, so it is a
 * link somebody can be sent, and so the detail page a subject opens can send the
 * reader back to the box they were reading rather than to the default one.
 *
 * The list is subjects and dates, not bodies: a letter is a paragraph, and a
 * mailbox that expands every one of them underneath its own list is a wall. The
 * unread mark is carried because an inbox is the one place a list of things not
 * yet read is the entire point, and the game draws the same letter the same way.
 */
export function MailPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const [search] = useSearchParams();
  const requested = search.get('box') ?? 'inbox';
  const box = boxes.some((entry) => entry.name === requested) ? requested : 'inbox';

  const { data, error, loading } = useApiResource<{ mail: AccountMessage[] }>(
    `/api/mail?box=${box}`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Mail"
        subtitle="What the server and your own characters have said to each other."
      />

      <nav className="flex flex-wrap gap-1" aria-label="Mailbox">
        {boxes.map((entry) => (
          <Link
            key={entry.name}
            to={`${basePath}/mail?box=${entry.name}`}
            aria-current={entry.name === box ? 'page' : undefined}
            className={[
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
              entry.name === box
                ? 'bg-primary/10 font-semibold text-primary'
                : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            ].join(' ')}
          >
            {entry.name === 'outbox' ? <Send className="size-4 shrink-0" /> : <Mail className="size-4 shrink-0" />}
            {entry.label}
          </Link>
        ))}
      </nav>

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel>
        <DataTable
          rows={data?.mail ?? []}
          rowKey={(row) => row.id}
          empty={
            loading
              ? 'Reading the mailbox…'
              : box === 'outbox'
                ? 'None of your characters has sent any mail.'
                : box === 'all'
                  ? 'There is no mail on this account yet.'
                  : 'Your inbox is empty.'
          }
          columns={[
            {
              header: 'Subject',
              cell: (row) => (
                <Link
                  to={`${basePath}/mail/${row.id}?box=${box}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Mail className="size-3.5 shrink-0" />
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
