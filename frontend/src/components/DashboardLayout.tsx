import {
  Gamepad2,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Swords,
  Trophy,
  UserSearch,
  Medal,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearSessionToken, isModerator, type StaffRole } from '../session';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

/**
 * One section of the dashboard. The role is what decides whether the section is
 * offered at all, and it is named rather than implied: a section nobody can
 * open is not a section, and showing it greyed out would only invite the click
 * that is then refused.
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
 * Overview is first because it is what an operator opens the dashboard for, and
 * the rest follow the shape of the game: who you are, what you are playing, what
 * you are ranked by, and then the event modes and the Discord tools the staff
 * act through. Survival and Tournament carry no role because a player may read
 * them — the ladder is public in the game — and the pages themselves decide
 * which of their controls to draw.
 */
const sections: Section[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/characters', label: 'Characters', icon: UserSearch },
  { path: '/dashboard/games', label: 'Games', icon: Gamepad2 },
  { path: '/dashboard/survival', label: 'Survival', icon: Swords },
  { path: '/dashboard/tournament', label: 'Tournament', icon: Trophy },
  { path: '/dashboard/rankings', label: 'Rankings', icon: Medal },
  { path: '/dashboard/discord', label: 'Discord', icon: MessageSquare, role: 'moderator' },
];

/**
 * The dashboard itself: a fixed column of sections down the left, the page
 * beside them.
 *
 * The sidebar is fixed rather than sticky for the same reason the layout is a
 * full-height frame: a dashboard is read beside something else, and a list of
 * sections that scrolls away up a long page cannot be used without scrolling
 * back to reach it. Fixing it means the way to the next section is always in
 * the same place, whatever height the page has grown to.
 *
 * The margin on the content is the sidebar's width, because a fixed element is
 * out of the flow and the page would otherwise start underneath it.
 */
export function DashboardLayout({
  accountName,
  roles,
  children,
}: {
  accountName: string;
  roles: StaffRole[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const visible = sections.filter(
    (section) => section.role === undefined || roles.includes(section.role) || isModerator(roles),
  );

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 overflow-y-auto border-r border-border bg-card/60 p-5">
        <div>
          <p className="text-lg font-extrabold tracking-tight">
            <span className="text-primary">Alt</span>MGO
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={accountName}>
            {accountName}
          </p>
          <RoleBadges roles={roles} />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {visible.map((section) => (
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

        <Button
          variant="outline"
          className="mt-auto w-full"
          onClick={() => {
            clearSessionToken();
            navigate('/', { replace: true });
          }}
        >
          <LogOut />
          Sign out
        </Button>
      </aside>

      <main className="min-w-0 pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}

/** The roles the signed-in account holds, so the sidebar says what it may open. */
function RoleBadges({ roles }: { roles: StaffRole[] }) {
  if (roles.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <Badge key={role}>{role}</Badge>
      ))}
    </div>
  );
}
