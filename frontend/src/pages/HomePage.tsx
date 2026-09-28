import { Link } from 'react-router-dom';
import { PageHeading, PageLayout } from '../components/PageLayout';
import {
  blockButtonClassName,
  panelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '../theme';

/** The front door: an account either exists already or does not. */
export function HomePage() {
  return (
    <PageLayout>
      <PageHeading subtitle="Create your account to start playing on this server" />

      <div className={panelClassName}>
        <div className="space-y-3">
          <Link to="/signin" className={`${primaryButtonClassName} ${blockButtonClassName}`}>
            Sign in
          </Link>
          <Link to="/register" className={`${secondaryButtonClassName} ${blockButtonClassName}`}>
            Register
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Hosting a game? Open the link the lobby sent you in game to publish the address it is
        reachable at.
      </p>
    </PageLayout>
  );
}
