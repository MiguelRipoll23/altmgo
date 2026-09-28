import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import {
  isManager,
  isModerator,
  readSessionAccount,
  readSessionRoles,
  readSessionToken,
  type StaffRole,
} from '../session';

/**
 * The layout every admin section renders inside.
 *
 * It is the one place that knows an admin page needs a session, so each section
 * does not: the account name and the roles are read once here and handed down
 * through the layout rather than re-read by every page. A browser with no token is
 * sent to sign in and remembers where it was going.
 */
export function AdminRoute() {
  const location = useLocation();
  const token = readSessionToken();

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  const roles = readSessionRoles();

  return (
    <AdminLayout accountName={readSessionAccount()} roles={roles}>
      <Outlet />
    </AdminLayout>
  );
}

/**
 * A section that only one staff role may open.
 *
 * The check here is a convenience, not the permission: it decides what the browser
 * draws, while the API decides what it is allowed to do. A browser with an edited
 * role list sees the section and is then refused every call in it, which is the
 * right way round — the page is not the boundary, the server is.
 *
 * An account without the role is sent to the admin overview rather than shown an
 * empty page, because "you may not open this" is more useful told by sending them
 * somewhere they can act than by rendering nothing.
 */
export function AdminStaffSection({ role, page }: { role: StaffRole; page: ReactNode }) {
  const roles = readSessionRoles();
  const permitted = role === 'manager' ? isManager(roles) : isModerator(roles);

  if (!permitted) {
    return <Navigate to="/admin" replace />;
  }

  return <>{page}</>;
}
