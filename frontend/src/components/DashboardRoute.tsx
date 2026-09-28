import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { OverviewPage } from '../pages/OverviewPage';
import { isManager, isModerator, readSessionAccount, readSessionRoles, readSessionToken, type StaffRole } from '../session';

/**
 * The layout every dashboard section renders inside.
 *
 * It is the one place that knows a dashboard needs a session, so each section
 * does not: the account name and the roles are read once here and handed down
 * through the layout rather than re-read by every page.
 *
 * A browser with no token is sent to sign in and remembers where it was going,
 * so signing in returns it to the section it asked for rather than to the
 * overview it did not.
 */
export function DashboardRoute() {
  const location = useLocation();
  const token = readSessionToken();

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  const roles = readSessionRoles();

  return (
    <DashboardLayout accountName={readSessionAccount()} roles={roles}>
      <Outlet />
    </DashboardLayout>
  );
}

/** The overview, named as a section so the route table reads as a list of them. */
export function OverviewSection() {
  return <OverviewPage accountName={readSessionAccount()} roles={readSessionRoles()} />;
}

/**
 * A section that only one staff role may open.
 *
 * The check here is a convenience, not the permission: it decides what the
 * browser draws, while the API decides what it is allowed to do. A browser with
 * an edited role list sees the section and is then refused every call in it,
 * which is the right way round — the page is not the boundary, the server is.
 *
 * A signed-in account without the role is sent to the overview rather than shown
 * an empty page, because "you may not open this" is more useful told by sending
 * them somewhere they can act than by rendering nothing.
 */
export function StaffSection({ role, page }: { role: StaffRole; page: ReactNode }) {
  const roles = readSessionRoles();
  const permitted = role === 'manager' ? isManager(roles) : isModerator(roles);

  if (!permitted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{page}</>;
}
