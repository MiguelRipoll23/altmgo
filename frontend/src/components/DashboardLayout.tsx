import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearSessionToken, isModerator, type StaffRole } from '../session';
import { secondaryButtonClassName } from '../theme';

/**
 * One section of the dashboard. The role is what decides whether the section is
 * offered at all, and it is named rather than implied: a section nobody can
 * open is not a section, and showing it greyed out would only invite the click
 * that is then refused.
 */
type Section = {
  path: string;
  label: string;
  /** The role a caller needs, or nothing when any signed-in account may open it. */
  role?: StaffRole;
};

/**
 * The sections, in the order they are offered.
 *
 * Overview is first because it is what an operator opens the dashboard for, and
 * the rest follow the shape of the game: who you are, what you are playing, what
 * you are ranked by, and finally the two event modes the staff tooling acts on.
 */
const sections: Section[] = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/dashboard/characters', label: 'Characters' },
  { path: '/dashboard/games', label: 'Games' },
  { path: '/dashboard/survival', label: 'Survival', role: 'moderator' },
  { path: '/dashboard/tournament', label: 'Tournament', role: 'moderator' },
  { path: '/dashboard/rankings', label: 'Rankings' },
];

/** The class a sidebar link wears when it is the section being shown. */
const activeLinkClassName =
  'block rounded-lg border border-mgo-500/30 bg-mgo-500/10 px-4 py-2.5 text-sm font-semibold text-mgo-400';

/** The class a sidebar link wears when it is not. */
const idleLinkClassName =
  'block rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200';

/**
 * The dashboard itself: the sections down the left, the page beside them.
 *
 * The layout is a full-height frame rather than the centred column the public
 * pages use, because a dashboard is read beside something else — an operator
 * has the section open in one window and the list they care about in another, and
 * a column that re-centres on every navigation makes the two impossible to keep
 * side by side.
 *
 * The sidebar collapses above the content on a narrow screen rather than
 * disappearing: a dashboard read on a phone is a dashboard with one section at a
 * time, and hiding the sections entirely would leave no way to reach the others.
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
    <div className="flex min-h-screen flex-col bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(30,64,175,0.18),transparent_60%)] text-slate-100 antialiased lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-slate-800/80 bg-slate-900/40 p-5 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div>
          <p className="text-lg font-extrabold tracking-tight">
            <span className="text-mgo-400">Alt</span>MGO
          </p>
          <p className="mt-1 truncate text-xs text-slate-500" title={accountName}>
            {accountName}
          </p>
          <RoleBadges roles={roles} />
        </div>

        <nav className="flex flex-wrap gap-1 lg:flex-col">
          {visible.map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              end={section.path === '/dashboard'}
              className={({ isActive }) => (isActive ? activeLinkClassName : idleLinkClassName)}
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => {
            clearSessionToken();
            navigate('/', { replace: true });
          }}
          className={`${secondaryButtonClassName} mt-auto w-full`}
        >
          Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
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
        <span
          key={role}
          className="rounded-full border border-mgo-500/30 bg-mgo-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-mgo-400"
        >
          {role}
        </span>
      ))}
    </div>
  );
}
