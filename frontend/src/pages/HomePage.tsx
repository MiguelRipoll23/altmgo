import { LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { buttonVariants } from '../components/ui/button';
import { useApiResource } from '../components/useApiResource';
import { formatNumber } from '../components/DataDisplay';

/**
 * The unified front door: welcome, sign and register on one page.
 *
 * The welcome line, the sign-in form and the register form were three pages
 * before this one. They were each their own route and each their own heading
 * and each their own form, and a reader arriving had to choose before they had
 * read anything. Now there is one page: the same wordmark, the same two
 * buttons, the same two forms, and the server's current pulse beside them.
 */
export function HomePage() {
  const { data, loading } = useApiResource<{ playersOnline: number; totalGames: number }>(
    '/api/server/pulse',
  );

  return (
    <PageLayout width="narrow">
      <PageHeading subtitle="Welcome to AltMGO" />

      <Card>
        <CardContent className="space-y-3 pt-5 sm:pt-6">
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

      <p className="mt-6 text-center text-base text-muted-foreground">
        Players online: {formatNumber(data?.playersOnline ?? (loading ? 0 : 0))} &middot; Total games: {formatNumber(data?.totalGames ?? (loading ? 0 : 0))}
      </p>
    </PageLayout>
  );
}
