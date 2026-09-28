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
export function SidebarNav({ sections }: { sections: SidebarSection[] }) {
  const { pathname } = useLocation();
  const [opened, setOpened] = useState<Record<string, boolean>>({});

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
