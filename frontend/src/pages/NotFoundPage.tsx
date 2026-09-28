import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { buttonVariants } from '../components/ui/button';

/** Shown for a path that is not a page, and for a single segment that is not a code. */
export function NotFoundPage() {
  return (
    <PageLayout>
      <PageHeading subtitle="That page does not exist" />

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <Link to="/" className={`${buttonVariants({ size: 'lg' })} w-full justify-center`}>
            <ArrowLeft />
            Back to the home page
          </Link>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
