import { Newspaper, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, describeError } from '../../api';
import { DataTable, Panel, SectionHeading, formatDate } from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { readSessionToken } from '../../session';

/** One news item, as the client shows it on the login screen. */
type NewsItem = {
  id: number;
  title: string;
  body: string;
  important: boolean;
  publishedAt: string;
};

/** What a write on this page reports back. */
type Report = { kind: 'success' | 'error'; message: string };

/**
 * The news the server publishes, and everything that can be done to it.
 *
 * It is the manager's page rather than the reader's one: a player signing in sees
 * the same rows on the login screen and reads them on a page of their own, and
 * this is the other end of the same table — the place an item is written,
 * corrected and withdrawn from. Both pages exist because they answer different
 * questions of the same row, and merging them would put a delete button on the
 * page a player reads their server's news on.
 *
 * An item is corrected in place rather than withdrawn and written again, so the
 * date a player signed in and saw stays the date it was published and a link to
 * it does not change under whoever was sent it. The form sends only the fields
 * that were filled in, for the same reason: an edit that posts everything it holds
 * blanks a title nobody meant to touch.
 */
export function AdminNewsPage() {
  const [status, setStatus] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);

  const news = useApiResource<{ news: NewsItem[] }>('/api/manager/news');

  /**
   * Runs one write and reads the list again.
   *
   * The list is re-read rather than patched: an item that is edited in place has
   * four fields and the row on screen is three of them plus a date, and a table
   * that guessed at the fourth would be showing a correction nobody made.
   */
  async function write(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      setEditing(null);
      news.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="News"
        subtitle="What the login screen says, and everything that can be done to it."
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

      {editing === null ? null : (
        <NewsEditor
          item={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(title, body, important) =>
            write(
              () =>
                apiRequest(`/api/manager/news/${editing.id}`, {
                  method: 'PUT',
                  token: readSessionToken(),
                  body: { title, body, important },
                }),
              'The news item was corrected.',
            )
          }
        />
      )}

      <Panel title="Published news">
        {news.error === null ? null : <StatusMessage kind="error">{news.error}</StatusMessage>}

        <DataTable
          rows={news.data?.news ?? []}
          rowKey={(row) => row.id}
          empty="No news has been published."
          loading={news.loading}
          loadingLabel="Reading the news…"
          columns={[
            {
              header: 'Title',
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <Link
                    to={`/admin/news/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.important ? <Badge variant="warning">important</Badge> : null}
                </span>
              ),
            },
            { header: 'Published', cell: (row) => formatDate(row.publishedAt) },
            {
              header: 'Actions',
              className: 'text-right',
              cell: (row) => (
                <span className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={busy}>
                        <Trash2 />
                        Withdraw
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Withdraw “{row.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The item is deleted. Players who sign in will not see it, and a link
                        already sent to it will say it is gone.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            write(
                              () =>
                                apiRequest(`/api/manager/news/${row.id}`, {
                                  method: 'DELETE',
                                  token: readSessionToken(),
                                }),
                              'The news item was withdrawn.',
                            )
                          }
                        >
                          Withdraw
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </span>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

/** The form that publishes a news item. */
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
 * The form that corrects one published item.
 *
 * It is the composer filled in with the item's own words rather than a second
 * component: the two forms ask for the same three things, and a page with two
 * nearly identical forms on it is a page where a reader is looking for the
 * difference between them. It is above the list rather than inside each row
 * because an item is corrected one at a time and opening one leaves the list
 * visible behind it.
 */
function NewsEditor({
  item,
  busy,
  onSave,
  onCancel,
}: {
  item: NewsItem;
  busy: boolean;
  onSave: (title: string, body: string, important: boolean) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [important, setImportant] = useState(item.important);

  const ready = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Panel
      title={`Correct “${item.title}”`}
      description="The item is corrected in place: the date it was published does not change."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-news-title">Title</Label>
          <Input
            id="edit-news-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-news-body">Body</Label>
          <Textarea
            id="edit-news-body"
            rows={6}
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

        <div className="flex gap-2">
          <Button disabled={busy || !ready} onClick={() => onSave(title.trim(), body.trim(), important)}>
            Save the correction
          </Button>

          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Panel>
  );
}
