import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

/**
 * One section of a sidebar, and the sub-options it is split into when it is more
 * than one page.
 *
 * A sub-option is a page of its own, with a path, rather than a view of the
 * section's page. That is what makes it a sub-option in the only sense that
 * matters: each one can be linked to, reloaded and opened in a second window on
 * its own, which a switch inside one page cannot do for any of its settings.
 */
export type SidebarSubSection = { path: string; label: string };

export type SidebarSection = {
  path: string;
  label: string;
  icon: LucideIcon;
  children?: SidebarSubSection[];
};

/** The classes a section row carries, active or not. Both frames draw the same. */
function sectionClasses(isActive: boolean): string {
  return [
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base transition',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  ].join(' ');
}

/**
 * The classes a section row carries in the reduced column, where there is no room
 * for its label.
 *
 * Centred and square rather than the expanded row's left-aligned block: the row's
 * whole content is one icon, and an icon hung off the left edge of a narrow
 * column sits under the control that opens it rather than between the edges the
 * reader is aiming between. The selected fill is the same as the expanded row's
 * so a reader who collapses the column and then expands it again finds the same
 * row lit in the same place.
 */
function railSectionClasses(isActive: boolean): string {
  return [
    'flex w-full items-center justify-center rounded-lg py-2.5 transition',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  ].join(' ');
}

/**
 * The classes a sub-option carries in the reduced column's flyout.
 *
 * The expanded column indents sub-options under a rule to show they belong to the
 * section above. A flyout has no such column to indent within — it opens beside
 * the icon rather than under it — so the belonging is carried by the flyout's own
 * heading instead, and the rows go back to the plain label shape.
 */
function railSubSectionClasses(isActive: boolean): string {
  return [
    'flex items-center whitespace-nowrap rounded-md px-3 py-2 text-left text-base transition',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ');
}

/**
 * The classes a sub-option carries: the same shape as its section, set smaller
 * and indented under a rule, so a reader sees that it belongs to the section
 * above rather than reading it as a section of its own.
 */
function subSectionClasses(isActive: boolean): string {
  return [
    'flex items-center rounded-lg py-2 pl-3 pr-3 text-base transition',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  ].join(' ');
}

/**
 * Whether a section row is the one being read.
 *
 * A section that is a page of its own is matched by prefix, so News stays lit
 * while one of its items is open. A section that is only a heading with a
 * disclosure is matched exactly: it has no page, so there is nothing of its own
 * for the reader to be on, and lighting it beside the sub-option that *is*
 * selected says the reader is in two places at once. The sub-option carries that
 * answer on its own.
 */
function isSectionSelected(section: SidebarSection, pathname: string): boolean {
  if (section.children !== undefined) {
    return pathname === section.path;
  }

  if (section.path.split('/').filter(Boolean).length === 1) {
    return pathname === section.path;
  }

  return pathname === section.path || pathname.startsWith(`${section.path}/`);
}

/**
 * Whether a section holds the page being read, sub-options included.
 *
 * This is what opens a section's list by itself, and it is deliberately a
 * different question from whether the row is selected: a heading opens because
 * the reader is inside it, and is not lit because they are not on it.
 */
function containsPage(section: SidebarSection, pathname: string): boolean {
  return pathname === section.path || pathname.startsWith(`${section.path}/`);
}

/** Whether a sub-option is the one being read, including pages nested under it. */
function isSubSectionActive(subSection: SidebarSubSection, pathname: string): boolean {
  return pathname === subSection.path || pathname.startsWith(`${subSection.path}/`);
}

/** The id a section's sub-option list is named by, for the control that opens it. */
function subListId(section: SidebarSection): string {
  return `sub-${section.path.replace(/[^a-z]+/gi, '-')}`;
}

/**
 * The column of sections down the side of a frame.
 *
 * A section that is more than one page is a heading with a disclosure, not a
 * link. It was a link, and that was wrong twice over: it sent a reader to an
 * address that is not a page — the bare section path, which only exists to
 * redirect to the first of its sub-options — and it made the sub-options
 * something a reader only found by arriving at the section, so the fastest way
 * to reach the Survival teams was a click that went nowhere and then another.
 *
 * The list starts closed, so the column is the same length whichever sections
 * have sub-options. A section holding the page being read opens itself, because a
 * closed list cannot say which of its pages is open; that is a default rather
 * than a rule, so a reader who closes the section they are standing in keeps it
 * closed. Opening a section is not the same as being on it, so the heading does
 * not light up when one of its sub-options is the page — the sub-option says so
 * on its own, and two lit rows would say the reader was in two places.
 *
 * It is one component because both frames draw the same column over the same
 * pages, and two copies of this list is two things to keep correct: a sub-option
 * added to one frame and not the other is a page a reader can open in one place
 * and not the other.
 */
export function SidebarNav({
  sections,
  reduced = false,
}: {
  sections: SidebarSection[];
  /**
   * Whether the column has been collapsed to icons only. See `SidebarRail` for
   * what that frame can and cannot reach.
   */
  reduced?: boolean;
}) {
  const { pathname } = useLocation();
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  if (reduced) {
    return <SidebarRail sections={sections} />;
  }

  return (
    // The list is the part of the column that grows: `min-h-0` lets it shrink
    // inside the flex column rather than pushing the account card off the foot of
    // the window, and the scrolling is confined to it so the wordmark above and the
    // account card below stay where they are.
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pb-1">
      {sections.map((section) => {
        if (section.children === undefined) {
          return (
            <Link
              key={section.path}
              to={section.path}
              className={sectionClasses(isSectionSelected(section, pathname))}
            >
              <section.icon className="size-4 shrink-0" />
              {section.label}
            </Link>
          );
        }

        const open = opened[section.path] ?? containsPage(section, pathname);

        return (
          <div key={section.path} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setOpened((state) => ({ ...state, [section.path]: !open }))}
              className={sectionClasses(isSectionSelected(section, pathname))}
              aria-expanded={open}
              aria-controls={subListId(section)}
            >
              <section.icon className="size-4 shrink-0" />
              {section.label}
              <ChevronRight
                className={cn(
                  'ml-auto size-4 shrink-0 transition-transform duration-150',
                  open && 'rotate-90',
                )}
              />
            </button>

            {open ? (
              <div
                id={subListId(section)}
                className="flex flex-col gap-1 border-l border-border pl-3"
              >
                {section.children.map((subSection) => (
                  <Link
                    key={subSection.path}
                    to={subSection.path}
                    className={subSectionClasses(isSubSectionActive(subSection, pathname))}
                    aria-current={isSubSectionActive(subSection, pathname) ? 'page' : undefined}
                  >
                    {subSection.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The column of sections reduced to their icons.
 *
 * A reduced column rather than no column at all, because the two are different
 * requests. Putting the column away entirely is right on a phone, where the
 * column is a drawer laid over the page and the page needs the width. On a wide
 * window the column is part of the layout beside the page, and removing it buys
 * the page about ten characters of width — which is not worth losing the reader's
 * place in the frame. A reader who has put the column away has usually done it
 * to see more of a wide table, not to stop navigating, so the icons stay and keep
 * working.
 *
 * An icon on its own does not say which section it is, so every row carries its
 * label as a tooltip and as an accessible name. The accessible name is what a
 * screen reader announces and what a browser shows as the row's text, and it is
 * the same string either way — one row cannot have a name for a reader and a
 * different one for a hover.
 *
 * A section with sub-options cannot be a link here, for the reason it is not a
 * link in the expanded column either: the bare section path is a redirect to the
 * first sub-option, and clicking it to reach the second one is a click that goes
 * nowhere and then another. So the icon opens a flyout instead, which is the
 * expanded column's disclosure drawn somewhere it fits. Opening one is by hover
 * as well as by click, because a flyout that needs a click is not a flyout to a
 * reader aiming for it with the pointer — they arrive over the icon and the list
 * is what they wanted. It stays open while the pointer is over either the icon or
 * the flyout, so moving across the gap between them does not dismiss it under the
 * pointer.
 *
 * The flyout is also reachable by keyboard, and that is why the icon is a button
 * rather than a plain image: `Enter` and `Space` open it, `Escape` closes it, and
 * a flyout that only hover can open is a flyout some readers cannot open at all.
 * The same state drives both, so the two cannot disagree about what is open.
 *
 * It is drawn in the same order and with the same selected rows as the expanded
 * column, because they are the same navigation: the reader who is standing on
 * the Survival teams and collapses the column has to find the same row lit.
 */
function SidebarRail({ sections }: { sections: SidebarSection[] }) {
  const { pathname } = useLocation();
  const [flyingOut, setFlyingOut] = useState<string | null>(null);

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pb-1"
      // Escape closes an open flyout. It is the same key the shell listens for to
      // put the column away, so closing the flyout first is what a reader pressing
      // it once expects — and both handlers run, which is correct: a reader who
      // wanted the column away gets it, and one who only wanted the list closed
      // has already expanded the column back rather than being left in a column
      // they cannot leave.
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setFlyingOut(null);
        }
      }}
    >
      {sections.map((section) => {
        if (section.children === undefined) {
          return (
            <Link
              key={section.path}
              to={section.path}
              className={railSectionClasses(isSectionSelected(section, pathname))}
              title={section.label}
              aria-label={section.label}
              aria-current={isSectionSelected(section, pathname) ? 'page' : undefined}
            >
              <section.icon className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          );
        }

        const open = flyingOut === section.path;

        return (
          <div
            key={section.path}
            className="relative"
            // Hovering the row opens the flyout, and so does hovering the flyout
            // itself. The handler clears the state on leave, so the gap between
            // the icon and the panel needs closing — hence `pt-1` on the panel
            // below, which is what makes the two one hover target rather than two
            // that each end the other's.
            onMouseEnter={() => setFlyingOut(section.path)}
            onMouseLeave={() => setFlyingOut(null)}
          >
            <button
              type="button"
              onClick={() => setFlyingOut(open ? null : section.path)}
              className={railSectionClasses(isSectionSelected(section, pathname))}
              title={section.label}
              aria-label={section.label}
              aria-expanded={open}
              aria-haspopup="true"
            >
              <section.icon className="size-4 shrink-0" aria-hidden="true" />
            </button>

            {open ? (
              // `pt-1` is the hover bridge described above: it makes the space
              // between the icon and this panel part of the row, so the pointer
              // crossing it is still inside the thing that is open.
              <div
                className="absolute left-full top-0 z-50 ml-2 w-max pt-1"
                role="group"
                aria-label={section.label}
              >
                <div className="min-w-40 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  <p className="px-3 py-1.5 text-base font-semibold text-muted-foreground">
                    {section.label}
                  </p>

                  {section.children.map((subSection) => {
                    const active = isSubSectionActive(subSection, pathname);

                    return (
                      <Link
                        key={subSection.path}
                        to={subSection.path}
                        className={railSubSectionClasses(active)}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setFlyingOut(null)}
                      >
                        {subSection.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
