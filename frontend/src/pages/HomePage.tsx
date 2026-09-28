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
    <PageLayout width="narrow">
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

    </PageLayout>
  );
}
