import { Link } from 'react-router-dom';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { blockButtonClassName, panelClassName, primaryButtonClassName } from '../theme';

/** Shown for a path that is not a page, and for a single segment that is not a code. */
export function NotFoundPage() {
  return (
    <PageLayout>
      <PageHeading subtitle="That page does not exist" />

      <div className={panelClassName}>
        <Link to="/" className={`${primaryButtonClassName} ${blockButtonClassName}`}>
          Back to the home page
        </Link>
      </div>
    </PageLayout>
  );
}
