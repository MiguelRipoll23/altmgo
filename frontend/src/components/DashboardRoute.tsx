import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { useSessionAccount } from './useSessionAccount';
import { readSessionRoles, readSessionToken } from '../session';
import { OverviewPage } from '../pages/OverviewPage';


/**
 * The layout every player-dashboard section renders inside.
 *
 * It is the one place that knows a dashboard needs a session, so each section
 * does not: the account name and the roles are read once here and handed down
 * through the layout rather than re-read by every page.
 *
 * A browser with no token is sent to sign in and remembers where it was going, so
 * signing in returns it to the section it asked for rather than to the overview it
 * did not.
 *
 * There is no role gate on any of this any more. The sections that were gated moved
 * to the admin frame, which has its own route; what is left is readable by any
 * signed-in account and reads nothing a player could not read in the client.
 */
export function DashboardRoute() {
  const location = useLocation();
  const token = readSessionToken();

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  const account = useSessionAccount();

  return (
    <DashboardLayout accountName={account?.displayName ?? null} roles={readSessionRoles()}>
      <Outlet />
    </DashboardLayout>
  );
}

/**
 * The overview, named as a section so the route table reads as a list of them.
 *
 * The account name is not passed down: the layout shows who is signed in at the
 * foot of the sidebar, and a page that also headed itself with it said the same
 * thing twice on the one screen a player sees first.
 */
export function OverviewSection() {
  return <OverviewPage />;
}
