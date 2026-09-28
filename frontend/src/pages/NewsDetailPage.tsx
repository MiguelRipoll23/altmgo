import { ArrowLeft, Newspaper } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingBlock, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
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
 *
 * The back link is the first thing on the page rather than something below the
 * heading. A page reached from a list is read in that order — where am I, what is
 * this — and a link under a title is a link the eye has already passed.
 *
 * The item is drawn in its card whether or not it has arrived, so the page is the
 * same page while it is being read rather than a heading followed by a sentence in
 * the place the card will be.
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
      <Link
        to={listPath}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All news
      </Link>

      <SectionHeading
        title={item?.title ?? 'News'}
        subtitle="One item, as it is drawn on the login screen."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {/* Drawn in a card whether or not the item has arrived, so the page is the same
          page while it is being read: the reading sits inside the card the item will
          be drawn in rather than replacing the card with a sentence. */}
      <Panel>
        {item === null ? (
          loading ? (
            <LoadingBlock label="Reading the item…" />
          ) : error === null ? (
            <p className="text-sm text-muted-foreground">That news item could not be read.</p>
          ) : null
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Newspaper className="size-4 shrink-0 text-muted-foreground" />
              {item.important ? <Badge variant="warning">important</Badge> : null}
            </div>

            <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
              Published {formatDate(item.publishedAt)}
            </p>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {item.body}
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
