import { database } from './database.js';

/**
 * The news the client shows on the login screen.
 *
 * It is a module of its own rather than part of the staff reads because the news is
 * not a staff thing: a player sees the same rows on their way into the game, and the
 * dashboard section that shows them is read-only and open to any signed-in account.
 * The manager's news page reads the same query and then adds the writing, which is
 * the only difference between the two.
 */

/** One news item, as the client shows it on the login screen. */
export type NewsRow = {
  id: number;
  title: string;
  body: string;
  important: boolean;
  time: Date;
};

/**
 * The most recent news items, newest first.
 *
 * The window is fixed rather than asked for, because a player has no pagination
 * control over what the login screen showed them and a news list longer than this
 * is a list the game itself does not reach. Newest first rather than by id, because
 * an item published late is the one somebody signing in now needs to see.
 */
export async function listNews(limit: number): Promise<NewsRow[]> {
  const rows = await database()`
    select news.id, news.title, news.body, news.important, news.time
    from news
    order by news.time desc nulls last, news.id desc
    limit ${limit}
  `;

  // The driver answers `Record<string, any>[]`, which describes no shape at all and
  // so would let a renamed column arrive as a silently `undefined` value.
  return rows as unknown as NewsRow[];
}

/**
 * One news item, for the page that shows it in full.
 *
 * The read is by id rather than by title because the detail page is reached from
 * a list that already named the row: re-finding the item by its title would make
 * two items with the same title indistinguishable, and the second one would show
 * the first one's body.
 *
 * Nothing is returned when there is no such item, and the route turns that into a
 * 404 rather than an empty page — a withdrawn item has a link in a browser
 * history and an operator following one should be told it is gone.
 */
export async function findNews(newsIdentifier: number): Promise<NewsRow | undefined> {
  const rows = await database()`
    select news.id, news.title, news.body, news.important, news.time
    from news
    where news.id = ${newsIdentifier}
    limit 1
  `;

  return rows[0] as unknown as NewsRow | undefined;
}
