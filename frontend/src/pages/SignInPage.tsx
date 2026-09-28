import { LogIn } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import { rememberSignIn, writeSessionToken } from '../session';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type LoginResponse = {
  token: string;
  /**
   * Whether the account has a character with a connection row, and so a game
   * other players can be sent to. The sign-in is where the address is written,
   * so this is the server's answer to whether that write had somewhere to go —
   * and it is what the overview's address tile shows as a state rather than a
   * button for the first few seconds after signing in.
   */
  discoverable: boolean;
};

/** Signs in with the credentials the game uses, and keeps the token it answers with. */
export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: StatusKind; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    // The button says what is happening; the banner is only for what happened, so
    // the refusal from the attempt before this one is cleared rather than left up.
    setStatus(null);

    try {
      const payload = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { displayName: username.trim(), password },
      });

      writeSessionToken(payload.token);
      rememberSignIn(payload.discoverable);

      // Signing in returns the browser to the section it asked for, which the
      // dashboard remembered on the way out. Anything else — a mistyped path, or
      // no path at all — lands on the overview rather than on a deep link that
      // may itself have been mistyped.
      const requested = (location.state as { from?: string } | null)?.from;
      navigate(requested ?? '/dashboard', { replace: true });
    } catch (error) {
      setStatus({ kind: 'error', message: describeError(error) });
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <PageHeading subtitle="Sign in with the same ID and password you use in game" />

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              <LogIn />
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-base text-muted-foreground">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Register
        </Link>
      </p>
    </PageLayout>
  );
}
