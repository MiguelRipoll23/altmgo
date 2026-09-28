import {
  Flag,
  Gamepad2,
  LayoutDashboard,
  Mail,
  Medal,
  Newspaper,
  Shield,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { StaffRole } from '../session';
import { AccountMenu } from './AccountMenu';

/**
 * One section of the player dashboard.
 *
 * There is no role on it, and that is the definition of the frame: every section
 * here is a read, and every one of them is a read any signed-in account may make.
 */
type Section = { path: string; label: string; icon: LucideIcon };

/**
 * The sections, in the order they are offered.
 *
 * The order is the shape of a session rather than the shape of the schema: who is
 * on, what the server has said to them, who they play with and where, what is
 * running, the two event ladders, and finally where they stand on the boards.
 * News and mail sit second and third because they are the two things addressed to
 * the reader personally — the client shows the news on the way in and the mail in
 * the inbox, and these are the same two lists without leaving the browser.
 *
 * Nothing here writes. Everything that changes the server moved to the admin frame,
 * which is reached from the account card at the foot of this column: a signed-in
 * player has no use for it, so a section here implying there is more of the
 * dashboard than there is would be a link to nothing.
 */
const sections: Section[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/news', label: 'News', icon: Newspaper },
  { path: '/dashboard/mail', label: 'Mail', icon: Mail },
  { path: '/dashboard/clans', label: 'Clans', icon: Flag },
  { path: '/dashboard/games', label: 'Games', icon: Gamepad2 },
  { path: '/dashboard/survival', label: 'Survival', icon: Swords },
  { path: '/dashboard/tournament', label: 'Tournament', icon: Trophy },
  { path: '/dashboard/rankings', label: 'Rankings', icon: Medal },
];

/** The player dashboard: a fixed column of sections down the left, the page beside them. */
export function DashboardLayout({
  accountName,
  roles,
  children,
}: {
  accountName: string;
  roles: StaffRole[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 overflow-y-auto border-r border-border bg-card/60 px-5 pb-6 pt-5">
        <p className="text-lg font-extrabold tracking-tight">
          <span className="text-primary">Alt</span>MGO
        </p>

        <nav className="flex flex-1 flex-col gap-1">
          {sections.map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              end={section.path === '/dashboard'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                  isActive
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                ].join(' ')
              }
            >
              <section.icon className="size-4 shrink-0" />
              {section.label}
            </NavLink>
          ))}
        </nav>

        <AccountMenu
          accountName={accountName}
          roles={roles}
          frame={{ to: '/admin', label: 'Admin dashboard', icon: Shield }}
        />
      </aside>

      <main className="min-w-0 pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
