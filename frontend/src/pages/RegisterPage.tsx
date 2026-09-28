import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type RegistrationResponse = {
  account: { id: number; displayName: string };
};

/**
 * Creates the account the game itself logs in against, which is why the rules
 * here are the game's: a name of 3 to 32 characters, letters, digits, `_` and
 * `-` only, and a password of at least 6 characters. Anything this page accepted
 * that the game would not would be an account the player could not play with.
 */
export function RegisterPage() {
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
      const payload = await apiRequest<RegistrationResponse>('/api/auth/register', {
        method: 'POST',
        body: { displayName: username.trim(), password },
      });

      setStatus({
        kind: 'success',
        message: `Account created. Welcome, ${payload.account.displayName}! You can sign in now.`,
      });
      setUsername('');
      setPassword('');
    } catch (error) {
      setStatus({ kind: 'error', message: describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <PageHeading subtitle="Create your account to start playing on this server" />

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

            <div className="space-y-3">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                title="3 to 32 characters. Letters, digits, underscores and hyphens only."
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <p className="text-base text-muted-foreground">
                This is the ID you sign into the game with.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="text-base text-muted-foreground">
                Use a unique password that you don't use anywhere else.
              </p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              <UserPlus />
              {submitting ? 'Registering…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-base text-muted-foreground">
        Already registered?{' '}
        <Link to="/signin" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </PageLayout>
  );
}
