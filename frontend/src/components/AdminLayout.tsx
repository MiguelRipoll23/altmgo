import {
  Flag,
  Gamepad2,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  SlidersHorizontal,
  Swords,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { isManager, isModerator, type StaffRole } from '../session';
import { AccountMenu } from './AccountMenu';

/**
 * One section of the admin dashboard. The role is what decides whether the section
 * is offered at all, and it is named rather than implied: a section nobody can open
 * is not a section, and showing it greyed out would only invite the click that is
 * then refused.
 */
type Section = {
  path: string;
  label: string;
  icon: LucideIcon;
  /** The role a caller needs, or nothing when any signed-in account may open it. */
  role?: StaffRole;
};

/**
 * The sections, in the order they are offered.
 *
 * The order follows how an operator works rather than the shape of the schema: who
 * is here, who they play with and what the server has said, then what is running,
 * then the two public ladders, and only at the foot the controls that change any of
 * it. The staff sections sit in the same list rather than under a heading, because
 * an operator moves between "what is running" and "change what is running" as one
 * motion and a heading between them would only be something to scroll past.
 *
 * The read sections are the ones the player dashboard also carries, and the same
 * components answer in both frames. An operator reading a clan roster wants it in
 * the frame they are working in rather than one click and a frame change away.
 *
 * The role on a section is a hint about what to draw, not the permission: the
 * server checks the same role on every call, so a browser with an edited role list
 * sees a section and is then refused by the API.
 */
const sections: Section[] = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/characters', label: 'Characters', icon: Users },
  { path: '/admin/news', label: 'News', icon: Newspaper },
  { path: '/admin/clans', label: 'Clans', icon: Flag },
  { path: '/admin/games', label: 'Games', icon: Gamepad2 },
  { path: '/admin/survival', label: 'Survival', icon: Swords },
  { path: '/admin/tournament', label: 'Tournament', icon: Trophy },
  { path: '/admin/discord', label: 'Discord', icon: MessageSquare, role: 'manager' },
  {
    path: '/admin/event-operations',
    label: 'Event operations',
    icon: SlidersHorizontal,
    role: 'moderator',
  },
  { path: '/admin/accounts', label: 'Accounts and roles', icon: UserCog, role: 'manager' },
  {
    path: '/admin/announcements',
    label: 'Mail and news',
    icon: Newspaper,
    role: 'manager',
  },
];

/** Whether one section may be offered to an account holding these roles. */
function isPermitted(section: Section, roles: StaffRole[]): boolean {
  if (section.role === undefined) {
    return true;
  }

  return section.role === 'manager' ? isManager(roles) : isModerator(roles);
}

/** The admin dashboard: a fixed column of sections down the left, the page beside them. */
export function AdminLayout({
  accountName,
  roles,
  children,
}: {
  accountName: string;
  roles: StaffRole[];
  children: ReactNode;
}) {
  const visible = sections.filter((section) => isPermitted(section, roles));

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 overflow-y-auto border-r border-border bg-card/60 p-5">
        <p className="text-lg font-extrabold tracking-tight">
          <span className="text-primary">Alt</span>MGO
          <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin
          </span>
        </p>

        <nav className="flex flex-1 flex-col gap-1">
          {visible.map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              end={section.path === '/admin'}
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
          frame={{ to: '/dashboard', label: 'Back to dashboard', icon: LayoutDashboard }}
        />
      </aside>

      <main className="min-w-0 pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
