import { Menu, PanelLeftClose, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { StaffRole } from '../session';
import { AccountMenu } from './AccountMenu';
import { SidebarNav, type SidebarSection } from './SidebarNav';
import { Button } from './ui/button';

/** The width the column is given on a window wide enough to hold one. */
const WideWindow = '(min-width: 1024px)';

/** Whether the window is wide enough that the column is part of the layout. */
function isWideWindow(): boolean {
  return window.matchMedia(WideWindow).matches;
}

/**
 * The frame both dashboards are drawn in: a column of sections and the page
 * beside them, with the column able to be put away.
 *
 * It is one component for both frames because the two shells were the same shell
 * twice over, and a responsive frame is exactly the sort of thing that goes wrong
 * in one copy and not the other: a padding that accounts for the column on a
 * desktop and not on a phone, a control that exists in one frame and not the
 * other. What differs between them — which sections are offered, the wordmark and
 * where the account card leads out to — is passed in, and everything else is
 * drawn here once.
 *
 * The column is collapsed on a narrow window from the start rather than after a
 * first render, because a phone that opens on a 256-pixel column has no page
 * visible at all, and a dashboard whose first impression is a drawer is a
 * dashboard nobody has seen the dashboard of. It is open on a wide one, where the
 * column is part of the layout rather than something laid over it.
 *
 * Collapsing on a wide window is the same control doing the same thing: the
 * column is taken out of the layout and the page takes the whole width, and the
 * button that put it away is still on screen to put it back. The one thing that
 * is not the same is the backdrop, which is hidden on a wide window — a dimmed
 * page behind a column that is not covering anything is a page that looks broken.
 *
 * Only the list of sections scrolls, not the column. A column that scrolls as one
 * piece takes the wordmark and the account card away with it, so a long list
 * leaves a reader who wants the way out unable to reach the way out, and a reader
 * who has been handed to another account has to scroll back up to do it. The three
 * parts are pinned instead: the wordmark, the list, and the account card at the
 * foot, which is the one control on every page of both frames.
 */
export function DashboardShell({
  sections,
  accountName,
  roles,
  frame,
  brand,
  children,
}: {
  sections: SidebarSection[];
  accountName: string | null;
  roles: StaffRole[];
  /** The way out of this frame, which only the account card leads to. */
  frame: { to: string; label: string; icon: LucideIcon };
  /** The wordmark at the head of the column; the two frames word it differently. */
  brand: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(isWideWindow);
  const location = useLocation();
  const arrived = useRef(false);

  // Following a link on a phone has to put the column away again: the page it
  // opened is behind the column, and a reader who tapped a section on a narrow
  // window is looking at the column rather than the section.
  //
  // On a wide window nothing is put away. The column is part of the layout there
  // rather than a drawer laid over the page, so a section that closes it every
  // time it is followed turns a desktop dashboard into one that has to be opened
  // again after every click — and the reader who opened it by hand would watch it
  // close itself for having been used.
  //
  // The first arrival is not a change of page either, and treating it as one would
  // put the column away on every load, on a wide window above all.
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }

    if (!isWideWindow()) {
      setOpen(false);
    }
  }, [location.pathname, location.search]);

  // Escape closes it, because a drawer with no keyboard way out is a drawer some
  // people cannot use at all. It is a control the reader pressed, so it is honoured
  // on a wide window too: a column left open on a desktop is a column they asked
  // to have.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A window narrowed past the width the column is laid out for has to put it
  // away, or a column that was beside the page is suddenly on top of it.
  useEffect(() => {
    const query = window.matchMedia(WideWindow);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setOpen(false);
      }
    };

    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id="frame-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 border-r border-border bg-card/60 px-5 pb-6 pt-5 transition-transform duration-200 ease-out lg:w-64 lg:max-w-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {brand}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Collapse the navigation"
            aria-expanded={open}
            aria-controls="frame-navigation"
          >
            <PanelLeftClose />
          </Button>
        </div>

        <SidebarNav sections={sections} />

        <AccountMenu accountName={accountName} roles={roles} frame={frame} />
      </aside>

      {open ? null : (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          className="fixed left-3 top-3 z-30"
          aria-label="Show the navigation"
          aria-expanded={open}
          aria-controls="frame-navigation"
        >
          <Menu />
        </Button>
      )}

      {/* The page's own gutter follows the column, and moves with it rather than
          jumping when the column does. */}
      <main
        className={cn(
          'min-w-0 transition-[padding] duration-200 ease-out',
          open ? 'lg:pl-64' : 'lg:pl-0',
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8',
            // The button that brings the column back is drawn over the top of the
            // page, so the page is given room for it rather than starting under it.
            open ? undefined : 'pt-16 lg:pt-8',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
