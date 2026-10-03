import { Menu, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AccountMenu } from './AccountMenu';
import { SidebarNav, type SidebarSection } from './SidebarNav';
import { Button } from './ui/button';

/** The width the column is given on a window wide enough to hold one. */
const WideWindow = '(min-width: 1024px)';

/** Whether the window is wide enough that the column is part of the layout. */
function isWideWindow(): boolean {
  return window.matchMedia(WideWindow).matches;
}

/** How much of the navigation column is on screen. */
type ColumnState = 'open' | 'reduced' | 'hidden';

/**
 * The frame both dashboards are drawn in: a column of sections and the page
 * beside them, with the column able to be reduced or put away.
 *
 * It is one component for both frames because the two shells were the same shell
 * twice over, and a responsive frame is exactly the sort of thing that goes wrong
 * in one copy and not the other: a padding that accounts for the column on a
 * desktop and not on a phone, a control that exists in one frame and not the
 * other. What differs between them — which sections are offered, the wordmark and
 * where the account card leads out to — is passed in, and everything else is
 * drawn here once.
 *
 * The column is hidden on a narrow window from the start rather than after a
 * first render, because a phone that opens on a 256-pixel column has no page
 * visible at all, and a dashboard whose first impression is a drawer is a
 * dashboard nobody has seen the dashboard of. It is open on a wide one, where the
 * column is part of the layout rather than something laid over it.
 *
 * A wide window has three column states rather than two, and the third is the
 * reduced one: the column narrows to its icons and stays on screen. It is a real
 * state rather than a nicety because putting the column away entirely and
 * narrowing it are different requests on a desktop. Away is right for a phone,
 * where the column is a drawer over the page and the page needs the width. On a
 * wide window the column is beside the page, and removing it buys the page about
 * ten characters — not worth losing the reader's place in the frame to get, when
 * the reader who asked for more room usually wants to see a wide table rather
 * than to stop navigating. So the reduce control keeps the icons on screen and
 * working, and only the drawer-style hide is the thing that takes the column off.
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
  brand,
  children,
}: {
  sections: SidebarSection[];
  accountName: string | null;
  /** The wordmark at the head of the column. */
  brand: ReactNode;
  children: ReactNode;
}) {
  // A narrow window only ever has two states — the drawer out or away — because
  // a reduced column on a phone is a column of icons with nothing under them and
  // no page beside them, which is not a layout. The initial read is made once,
  // before the first render, so a phone never flashes an open drawer.
  const [column, setColumn] = useState<ColumnState>(isWideWindow() ? 'open' : 'hidden');
  const location = useLocation();
  const arrived = useRef(false);

  /** Whether the column is on screen in any form. */
  const shown = column !== 'hidden';

  /**
   * Narrows the column, or opens it back out.
   *
   * On a narrow window this is the drawer, so the two states are out and away and
   * there is nothing between them. On a wide one it steps between the full column
   * and the icon rail.
   */
  function toggleColumn() {
    if (!isWideWindow()) {
      setColumn(column === 'hidden' ? 'open' : 'hidden');
      return;
    }

    setColumn(column === 'open' ? 'reduced' : 'open');
  }

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
      setColumn('hidden');
    }
  }, [location.pathname, location.search]);

  // Escape closes it, because a drawer with no keyboard way out is a drawer some
  // people cannot use at all. It is a control the reader pressed, so it is honoured
  // on a wide window too: a column left open on a desktop is a column they asked
  // to have.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setColumn('hidden');
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
        setColumn('hidden');
      }
    };

    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {shown ? (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setColumn('hidden')}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id="frame-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex max-w-[85vw] flex-col gap-6 border-r border-border bg-card/60 pb-6 pt-5 transition-transform duration-200 ease-out',
          // The gutter and the width both move between the three states, so the
          // column is padded when it has labels and not when it has only icons.
          // Reducing the width alone would leave the icons floating in a wide
          // empty box, which reads as a column that failed to draw.
          column === 'open'
            ? 'w-72 px-5 lg:w-64 lg:max-w-none'
            : 'w-20 px-3 lg:max-w-none',
          shown ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* The control that reduces the column sits at its head in both of the
            states where there is a head, and it is the same button either way:
            what changes is which way the panel points. It is inside the column
            rather than over the page because it acts on the column — a control
            floating on top of the page beside a visible column is two controls
            for the same thing, and one of them is somewhere the reader has to
            look for. */}
        <div className="flex items-center justify-between gap-2">
          {column === 'reduced' ? null : brand}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleColumn()}
            className={cn(column === 'reduced' && 'mx-auto')}
            aria-label={column === 'reduced' ? 'Expand the navigation' : 'Collapse the navigation'}
            aria-expanded={shown}
            aria-controls="frame-navigation"
          >
            {column === 'reduced' ? <PanelLeft /> : <PanelLeftClose />}
          </Button>
        </div>

        <SidebarNav sections={sections} reduced={column === 'reduced'} />

        <AccountMenu accountName={accountName} reduced={column === 'reduced'} />
      </aside>

      {shown ? null : (
        <Button
          variant="outline"
          size="icon"
          onClick={() => toggleColumn()}
          className="fixed left-3 top-3 z-30"
          aria-label="Show the navigation"
          aria-expanded={shown}
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
          column === 'open' ? 'lg:pl-64' : column === 'reduced' ? 'lg:pl-20' : 'lg:pl-0',
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8',
            // The button that brings the column back is drawn over the top of the
            // page, so the page is given room for it rather than starting under it.
            // The reduced column does not need that room, because it sits beside
            // the page rather than over it.
            column === 'reduced' ? undefined : shown ? undefined : 'pt-16 lg:pt-8',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
