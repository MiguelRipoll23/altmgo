import { Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
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
 * opens the one somebody cares about — on a page of its own, so the link can be
 * shared, reloaded and opened beside this list.
 *
 * `basePath` is which frame is drawing the list, because the two keep their own
 * copy of every read section and the detail page is a route rather than a piece
 * of state: the title has to lead back to the list the reader was looking at.
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

      <Panel>
        <DataTable
          rows={data?.news ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the news…' : 'No news has been published.'}
          columns={[
            {
              header: 'Title',
              cell: (row) => (
                <Link
                  to={`${basePath}/news/${row.id}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Newspaper className="size-3.5 shrink-0" />
                  {row.title}
                  {row.important ? <Badge variant="warning">important</Badge> : null}
                </Link>
              ),
            },
            { header: 'Published', cell: (row) => formatDate(row.publishedAt) },
          ]}
        />
      </Panel>
    </div>
  );
}
