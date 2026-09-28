import { ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeading, formatDate } from '../components/DataDisplay';
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

/**
 * How much of a body the preview shows, in characters.
 *
 * It is a length rather than a paragraph count because a news body is one
 * paragraph written for a login screen, and cutting on a word boundary inside
 * the first few sentences is what makes the list readable as a list: a preview
 * long enough to need scrolling is the whole item, and then the click is work.
 */
const PreviewLength = 220;

/**
 * The news the server has published, newest first.
 *
 * The page is read-only and open to any signed-in account, because it shows the same
 * rows the client draws on the login screen and there is nothing here a player could
 * do with it that they cannot do in game. It is a copy of what the client already
 * says, so a row here cannot disagree with the client's own view of it.
 *
 * It is a blog rather than a table because a news item is prose, not a row. A
 * table of titles says what has been said and when, which is what somebody
 * skimming wants and what somebody actually reading does not: the second they
 * arrive at the one they care about, they should be able to tell it from the
 * others without opening all of them. So each entry carries its own opening, its
 * own date, and its own "important" mark, and the whole entry is the link — one
 * click reads the item in full, on a page of its own that can be shared and
 * reloaded.
 *
 * `basePath` is which frame is drawing the list, because the two keep their own
 * copy of every read section and the detail page is a route rather than a piece
 * of state: the entry has to lead back to the list the reader was looking at.
 */
export function NewsPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const { data, error, loading } = useApiResource<{ news: NewsItem[] }>('/api/news');

  return (
    <div className="space-y-6">
      <SectionHeading
        title="News"
        subtitle="What the server has published, newest first."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {loading ? (
        <p className="text-base text-muted-foreground">Reading the news…</p>
      ) : (data?.news ?? []).length === 0 ? (
        <p className="text-base text-muted-foreground">No news has been published.</p>
      ) : (
        <div className="space-y-4">
          {(data?.news ?? []).map((item) => (
            <Link
              key={item.id}
              to={`${basePath}/news/${item.id}`}
              className="block rounded-xl border border-border bg-card/50 px-5 py-4 transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <Newspaper
                  className={`size-4 shrink-0 ${item.important ? 'text-amber-400' : 'text-muted-foreground'}`}
                />
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                  {item.title}
                </h2>
                {item.important ? <Badge variant="warning">important</Badge> : null}
              </div>

              <p className="text-base uppercase tracking-widest text-muted-foreground">
                {formatDate(item.publishedAt)}
              </p>

              <p className="mt-3 text-base leading-relaxed text-foreground/80">
                {preview(item.body)}
              </p>

              <span className="mt-3 inline-flex items-center gap-1.5 text-base font-medium text-primary">
                Read the whole item
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The opening of a body, cut at a word boundary.
 *
 * A cut in the middle of a word is the tell that a preview was cut by a counter
 * rather than chosen, so the last word that fits is dropped along with the
 * ellipsis that replaces the rest.
 */
function preview(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();

  if (text.length <= PreviewLength) {
    return text;
  }

  const cut = text.slice(0, PreviewLength);
  const lastSpace = cut.lastIndexOf(' ');

  return `${cut.slice(0, lastSpace === -1 ? PreviewLength : lastSpace)}…`;
}
