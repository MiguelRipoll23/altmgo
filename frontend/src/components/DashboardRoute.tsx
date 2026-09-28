import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { useSessionAccount } from './useSessionAccount';
import { readSessionToken } from '../session';
import { OverviewPage } from '../pages/OverviewPage';


/**
 * The layout every player-dashboard section renders inside.
 *
 * It is the one place that knows a dashboard needs a session, so each section
 * does not: the account name is read once here and handed down through the
 * layout rather than re-read by every page.
 *
 * A browser with no token is sent to sign in and remembers where it was going, so
 * signing in returns it to the section it asked for rather than to the overview it
 * did not.
 *
 * There is no role gate here, and none anywhere in the frame: everything it
 * draws is a read any signed-in account may make, so the only question this
 * component answers is whether there is a session at all.
 */
export function DashboardRoute() {
  const location = useLocation();
  const token = readSessionToken();

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  const account = useSessionAccount();

  return (
    <DashboardLayout accountName={account?.displayName ?? null}>
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
