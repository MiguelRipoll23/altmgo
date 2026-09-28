import { LayoutDashboard, Medal, Shield, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { type StaffRole } from '../session';
import { AccountMenu } from './AccountMenu';

/** One section of the player dashboard. */
type Section = { path: string; label: string; icon: LucideIcon };

/**
 * The sections, in the order they are offered.
 *
 * There are only two, and that is the point of the split rather than a shortfall:
 * everything an operator administers moved to the admin frame, which is reached from
 * the account card at the foot of this column. What is left is what a player comes
 * for — how many people are on, and where they stand on the boards.
 *
 * The admin frame is offered on the account card rather than as a section here
 * because a signed-in player has no use for it. A moderator who has not opened the
 * admin frame yet should not find a section implying there is more of the dashboard
 * than there is; the card is where somebody who *is* staff already looking for it
 * will go, and it carries the same switch back.
 */
const sections: Section[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
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
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 overflow-y-auto border-r border-border bg-card/60 p-5">
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
