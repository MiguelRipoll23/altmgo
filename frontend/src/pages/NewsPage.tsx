import { Newspaper } from 'lucide-react';
import { useState } from 'react';
import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
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
 * The news the server has published, newest first.
 *
 * The page is read-only and open to any signed-in account, because it shows the same
 * rows the client draws on the login screen and there is nothing here a player could
 * do with it that they cannot do in game. Publishing an item is a manager action and
 * it lives in the admin frame, on the mail and news page.
 *
 * It is a list of the titles rather than the items expanded one under another,
 * because a news item is a paragraph written for the login screen and most of them
 * are not worth reading; the list says what has been said and when, and one click
 * opens the one somebody cares about.
 */
export function NewsPage() {
  const { data, error, loading } = useApiResource<{ news: NewsItem[] }>('/api/news');
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="News"
        subtitle="What the server has published, newest first."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel>
        <DataTable
          rows={data?.news ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the news…' : 'No news has been published.'}
          columns={[
            {
              header: 'Title',
              cell: (row) => (
                <button
                  type="button"
                  onClick={() => setOpen(open === row.id ? null : row.id)}
                  className="flex items-center gap-2 text-left font-medium text-primary hover:underline"
                >
                  <Newspaper className="size-3.5 shrink-0" />
                  {row.title}
                  {row.important ? <Badge variant="warning">important</Badge> : null}
                </button>
              ),
            },
            { header: 'Published', cell: (row) => formatDate(row.publishedAt) },
          ]}
        />
      </Panel>

      {expanded(data?.news ?? [], open)}
    </div>
  );
}

/**
 * The body of one news item, below the list, once its title has been opened.
 *
 * One item at a time rather than a page of them: the list is an index, and an index
 * that expands everything is just a wall. Clicking the open title closes it again,
 * because the same click that opened a long paragraph is the one somebody makes to
 * get rid of it.
 */
function expanded(news: NewsItem[], open: number | null) {
  const item = news.find((candidate) => candidate.id === open);

  if (!item) {
    return null;
  }

  return (
    <Panel title={item.title}>
      <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
        Published {formatDate(item.publishedAt)}
      </p>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {item.body}
      </p>
    </Panel>
  );
}
