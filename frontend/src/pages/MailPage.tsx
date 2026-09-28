import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';

/** One message in the caller's own inbox. */
type InboxMessage = {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  sentAt: string;
  isRead: boolean;
};

/**
 * The caller's own inbox: the mail the server has sent to their characters.
 *
 * It is the one list on the dashboard that is about the person reading it rather
 * than about the server, and it is the only mail a player is shown — the game
 * master outbox is a manager's view of what was said to everybody, and it is not
 * reachable from here.
 *
 * The list is subjects and dates, not bodies: a letter is a paragraph, and an
 * inbox that expands every one of them underneath its own list is a wall. The
 * read flag is carried because an inbox is the one place a list of unread things
 * is the point, and the game shows the same letter the same way.
 */
export function MailPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const { data, error, loading } = useApiResource<{ mail: InboxMessage[] }>('/api/mail');

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Mail"
        subtitle="What the server has sent to your characters, newest first."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel>
        <DataTable
          rows={data?.mail ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the inbox…' : 'Your inbox is empty.'}
          columns={[
            {
              header: 'Subject',
              cell: (row) => (
                <Link
                  to={`${basePath}/mail/${row.id}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Mail className="size-3.5 shrink-0" />
                  {row.subject}
                  {row.isRead ? null : <Badge>new</Badge>}
                </Link>
              ),
            },
            { header: 'From', cell: (row) => row.senderName },
            { header: 'Sent', cell: (row) => formatDate(row.sentAt) },
          ]}
        />
      </Panel>
    </div>
  );
}
