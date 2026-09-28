import { ArrowLeft, Newspaper } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';

/** One news item, as the login screen shows it. */
type NewsItem = {
  id: number;
  title: string;
  body: string;
  important: boolean;
  publishedAt: string;
};

/** Which read answers for the item: the player's list or the manager's. */
export type NewsScope = 'player' | 'manager';

/**
 * One news item, on its own page.
 *
 * The list is an index and a news item is a paragraph written for the login
 * screen, so opening one used to push the paragraph under a table rather than
 * give it a page. This is that page: it has an address of its own, so the item
 * can be linked to, reloaded, and opened in a second window beside the list — the
 * same reasons every other page of the dashboard has one.
 *
 * The two frames read the same rows through different routes, because the
 * player's read is open to any signed-in account and the manager's is not, and a
 * page that asked for the manager's read would be refused by a player. Which one
 * is asked for is therefore a prop rather than a guess, and the back link goes
 * to the list of the frame the page was opened from.
 */
export function NewsDetailPage({
  scope,
  listPath,
}: {
  scope: NewsScope;
  /** Where the back link returns to: the news list of this frame. */
  listPath: string;
}) {
  const { identifier } = useParams();
  const path = scope === 'manager' ? `/api/manager/news/${identifier}` : `/api/news/${identifier}`;
  const { data, error, loading } = useApiResource<{ news: NewsItem }>(path);

  const item = data?.news ?? null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="News"
        subtitle="One item, as it is drawn on the login screen."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Link
        to={listPath}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All news
      </Link>

      {item === null ? (
        loading ? (
          <p className="text-sm text-muted-foreground">Reading the item…</p>
        ) : error === null ? (
          <p className="text-sm text-muted-foreground">That news item could not be read.</p>
        ) : null
      ) : (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Newspaper className="size-4 shrink-0 text-muted-foreground" />
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              {item.title}
            </h2>
            {item.important ? <Badge variant="warning">important</Badge> : null}
          </div>

          <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
            Published {formatDate(item.publishedAt)}
          </p>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {item.body}
          </p>
        </Panel>
      )}
    </div>
  );
}
