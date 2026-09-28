import { LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { buttonVariants } from '../components/ui/button';

/** The front door: an account either exists already or does not. */
export function HomePage() {
  return (
    <PageLayout width="narrow">
      <PageHeading subtitle="Create your account to start playing on this server" />

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Link
            to="/signin"
            className={`${buttonVariants({ size: 'lg' })} w-full justify-center`}
          >
            <LogIn />
            Sign in
          </Link>
          <Link
            to="/register"
            className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full justify-center`}
          >
            <UserPlus />
            Register
          </Link>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
