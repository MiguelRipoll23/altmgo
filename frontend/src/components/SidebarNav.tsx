import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

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

/** The classes a section link carries, active or not. Both frames draw the same. */
function sectionClasses(isActive: boolean): string {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  ].join(' ');
}

/**
 * The classes a sub-option carries: the same shape as its section, set smaller
 * and indented under it, so a reader sees that it belongs to the section above
 * rather than reading it as a section of its own.
 */
function subSectionClasses(isActive: boolean): string {
  return [
    'flex items-center rounded-lg py-2 pl-9 pr-3 text-xs transition',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  ].join(' ');
}

/**
 * Whether a section is the one being read.
 *
 * A frame's own root — `/dashboard`, `/admin` — is the only path every other path
 * in the column sits under, so it is matched exactly and the rest by prefix.
 * Without that distinction the overview would be highlighted on every page, which
 * is the one thing a sidebar must never be. A section with sub-options is matched
 * by prefix so that it stays lit while one of its own pages is open.
 */
function isSectionActive(section: SidebarSection, pathname: string): boolean {
  if (section.path.split('/').filter(Boolean).length === 1) {
    return pathname === section.path;
  }

  return pathname === section.path || pathname.startsWith(`${section.path}/`);
}

/**
 * The column of sections down the side of a frame, with the sub-options of any
 * section that has them.
 *
 * It is one component because both frames draw the same column over the same
 * pages, and two copies of this list is two things to keep correct: a sub-option
 * added to one frame and not the other is a page a player can open in one place
 * and not the other.
 *
 * Sub-options are always drawn rather than revealed on arrival. One that only
 * appeared inside its section could not be reached from anywhere else, so arriving
 * at the teams would take a click through events and the sub-options would be
 * something a reader found by accident.
 *
 * A sub-option stays lit on the pages nested under it — an event opened from the
 * Survival events, a message opened from the inbox — so the column says where the
 * reader is at every depth rather than going dark one page down.
 */
export function SidebarNav({ sections }: { sections: SidebarSection[] }) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {sections.map((section) => (
        <div key={section.path} className="flex flex-col gap-1">
          <Link to={section.path} className={sectionClasses(isSectionActive(section, pathname))}>
            <section.icon className="size-4 shrink-0" />
            {section.label}
          </Link>

          {(section.children ?? []).map((subSection) => (
            <Link
              key={subSection.path}
              to={subSection.path}
              className={subSectionClasses(
                pathname === subSection.path || pathname.startsWith(`${subSection.path}/`),
              )}
            >
              {subSection.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
