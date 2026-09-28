import { Mail, Newspaper, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, describeError } from '../../api';
import { DataTable, Panel, SectionHeading, formatDate } from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { readSessionToken } from '../../session';

/**
 * The two things the server says to its players: the news shown on the login
 * screen, and the game master mail that lands in a character's inbox.
 *
 * They are one page because they are one job — speaking for the server — and because
 * an announcement is usually one of the two rather than both. They write the same
 * tables the game reads, so what appears here is what a player sees on their next
 * login, and nothing is scheduled: a news item is published the moment it is
 * submitted.
 *
 * Mail cannot be withdrawn, so the sent list is the only record of it there will
 * ever be, and each subject opens the message on a page of its own for the same
 * reason: a letter a manager may have to point a player at is a thing that needs
 * an address someone else can be sent to.
 */

/** One news item, as the login screen shows it. */
type NewsItem = {
  id: number;
  title: string;
  body: string;
  important: boolean;
  publishedAt: string;
};

/** One game master mail, as it sits in an inbox. */
type MailMessage = {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  sentAt: string;
};

/** What a write on this page reports back. */
type Report = { kind: 'success' | 'error'; message: string };

export function AnnouncementsPage() {
  const [status, setStatus] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const news = useApiResource<{ news: NewsItem[] }>('/api/manager/news');
  const mail = useApiResource<{ mail: MailMessage[] }>('/api/manager/mail');

  /**
   * Runs one write and reads both lists again.
   *
   * Both are reloaded after every write even when only one changed: they are two
   * small reads, and a list that is one action out of date is a list somebody acts
   * on wrongly.
   */
  async function write(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      news.reload();
      mail.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Mail and news"
        subtitle="What the server says to its players, on the login screen and in the inbox."
      />

      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      <NewsComposer
        busy={busy}
        onPublish={(title, body, important) =>
          write(
            () =>
              apiRequest('/api/manager/news', {
                method: 'POST',
                token: readSessionToken(),
                body: { title, body, important },
              }),
            'The news item was published.',
          )
        }
      />

      <Panel title="Published news">
        {news.error === null ? null : <StatusMessage kind="error">{news.error}</StatusMessage>}

        <DataTable
          rows={news.data?.news ?? []}
          rowKey={(row) => row.id}
          empty={news.loading ? 'Reading the news…' : 'No news has been published.'}
          columns={[
            {
              header: 'Title',
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <Newspaper className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-foreground">{row.title}</span>
                  {row.important ? <Badge variant="warning">important</Badge> : null}
                </span>
              ),
            },
            { header: 'Published', cell: (row) => formatDate(row.publishedAt) },
            {
              header: '',
              cell: (row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void write(
                      () =>
                        apiRequest(`/api/manager/news/${row.id}`, {
                          method: 'DELETE',
                          token: readSessionToken(),
                        }),
                      `"${row.title}" was withdrawn.`,
                    )
                  }
                  aria-label={`Withdraw ${row.title}`}
                >
                  <Trash2 />
                  Withdraw
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <MailComposer
        busy={busy}
        onSend={(subject, body, senderName) =>
          write(
            () =>
              apiRequest('/api/manager/mail', {
                method: 'POST',
                token: readSessionToken(),
                body: { subject, body, senderName },
              }),
            'The message was sent to every inbox.',
          )
        }
      />

      <Panel title="Sent mail">
        {mail.error === null ? null : <StatusMessage kind="error">{mail.error}</StatusMessage>}

        <DataTable
          rows={mail.data?.mail ?? []}
          rowKey={(row) => row.id}
          empty={mail.loading ? 'Reading the sent mail…' : 'No game master mail has been sent.'}
          columns={[
            {
              header: 'Subject',
              cell: (row) => (
                <Link
                  to={`/admin/announcements/mail/${row.id}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Mail className="size-3.5 shrink-0" />
                  {row.subject}
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

/**
 * The form that publishes a news item.
 *
 * "Important" is a checkbox rather than a select because it is a flag the client
 * draws the item in a different colour for, and a flag with three states is a flag
 * somebody will eventually leave on the wrong one.
 */
function NewsComposer({
  busy,
  onPublish,
}: {
  busy: boolean;
  onPublish: (title: string, body: string, important: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);

  const ready = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Panel
      title="Publish a news item"
      description="Shown on the login screen the next time a player connects."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="news-title">Title</Label>
          <Input
            id="news-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="news-body">Body</Label>
          <Textarea
            id="news-body"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={important}
            onChange={(event) => setImportant(event.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          Mark as important
        </label>

        <Button
          disabled={busy || !ready}
          onClick={() => {
            onPublish(title.trim(), body.trim(), important);
            setTitle('');
            setBody('');
            setImportant(false);
          }}
        >
          <Newspaper />
          Publish
        </Button>
      </div>
    </Panel>
  );
}

/**
 * The form that sends a game master mail.
 *
 * The sender name is typed rather than filled from the deployment's name because it
 * is the figure a player reads in their inbox and "from the server" is a worse
 * signature than the one the operators of this server have chosen.
 */
function MailComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (subject: string, body: string, senderName: string) => void;
}) {
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const ready =
    senderName.trim().length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Panel
      title="Send a game master mail"
      description="Lands in the inbox of every character on the server. It cannot be withdrawn."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mail-sender">From</Label>
            <Input
              id="mail-sender"
              type="text"
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              placeholder="The name players will see"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mail-subject">Subject</Label>
            <Input
              id="mail-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mail-body">Message</Label>
          <Textarea
            id="mail-body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <Button
          disabled={busy || !ready}
          onClick={() => {
            onSend(subject.trim(), body.trim(), senderName.trim());
            setSubject('');
            setBody('');
          }}
        >
          <Mail />
          Send to every inbox
        </Button>
      </div>
    </Panel>
  );
}
