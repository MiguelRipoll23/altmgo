import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

/** One section of a page that is reached by its own address. */
export type PageTab = {
  /** The address this section is read at. */
  to: string;
  label: string;
  /** A figure worn beside the label, for the size of what is on the other side. */
  badge?: ReactNode;
};

/**
 * The sections of one page, each of which is a page of its own.
 *
 * These are links rather than a set of buttons over one view, and that is the whole
 * argument for them. A tab that is a button holds its choice in the component: it
 * cannot be copied, reloaded, opened in a second window, or reached by the back
 * button, and the address on the page keeps saying the section you are on while
 * something else is drawn. Every other choice in the dashboard is made in the
 * address for the same reasons — the sidebar's sub-options, the three mailboxes,
 * the two rankings — and a page that offered the same choice three different ways
 * would be the odd one out.
 *
 * They are drawn as tabs rather than as the sidebar's sub-options because they are
 * not a navigation tree: they are one record read three ways, they are a row across
 * the top of the page rather than a column down its side, and the one being read is
 * the only one lit, because the record is one record rather than three pages a
 * reader is inside one of.
 *
 * The count rides on the label rather than inside the section, so a reader can tell
 * which of the three has something in it before they go to it.
 */
export function PageTabs({ tabs, label }: { tabs: PageTab[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-x-1 gap-y-2 border-b border-border">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          // The first tab is a prefix of the others, so without `end` the whole row
          // would be lit the moment any of them is opened.
          end
          className={({ isActive }) =>
            cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-base font-medium transition',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )
          }
        >
          {tab.label}

          {tab.badge === undefined ? null : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-base tabular-nums text-muted-foreground">
              {tab.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
