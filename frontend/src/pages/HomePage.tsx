import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { formatNumber } from '../components/DataDisplay';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { rememberSignIn, writeSessionToken } from '../session';

type AuthMode = 'signin' | 'register';

type ServerPulse = {
  playersOnline: number;
  totalGames: number;
};

type LoginResponse = {
  token: string;
  discoverable: boolean;
};

type RegistrationResponse = {
  account: { id: number; displayName: string };
};

/** The public front door: welcome, server activity, sign-in and registration. */
export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: StatusKind; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pulse = useApiResource<ServerPulse>('/api/server/pulse');

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStatus(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      if (mode === 'signin') {
        const payload = await apiRequest<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: { displayName: username.trim(), password },
        });

        writeSessionToken(payload.token);
        rememberSignIn(payload.discoverable);
        const requested = (location.state as { from?: string } | null)?.from;
        navigate(requested ?? '/dashboard', { replace: true });
        return;
      }

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
      setMode('signin');
    } catch (error) {
      setStatus({ kind: 'error', message: describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  const registering = mode === 'register';

  return (
    <PageLayout width="form">
      <PageHeading subtitle="Your home for Metal Gear Online 2" />

      <Card className="mb-5">
        <CardContent className="pt-5 sm:pt-6">
          {pulse.data === null ? (
            <p
              role={pulse.error ? 'alert' : 'status'}
              className="text-center text-base text-muted-foreground"
            >
              {pulse.error ?? 'Loading server activity…'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-center" aria-live="polite">
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-foreground">
                  {formatNumber(pulse.data.playersOnline)}
                </p>
                <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">
                  Players online
                </p>
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-foreground">
                  {formatNumber(pulse.data.totalGames)}
                </p>
                <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">
                  Games
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-5 sm:pt-6">
          <div
            role="group"
            aria-label="Choose an account action"
            className="grid grid-cols-2 gap-3"
          >
            <Button
              type="button"
              variant={registering ? 'outline' : 'default'}
              aria-pressed={!registering}
              disabled={submitting}
              onClick={() => selectMode('signin')}
            >
              <LogIn />
              Sign in
            </Button>
            <Button
              type="button"
              variant={registering ? 'default' : 'outline'}
              aria-pressed={registering}
              disabled={submitting}
              onClick={() => selectMode('register')}
            >
              <UserPlus />
              Register
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {status === null ? null : (
              <StatusMessage kind={status.kind}>{status.message}</StatusMessage>
            )}

            <div>
              <Label htmlFor="username" className="mb-3 block">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={registering ? 3 : undefined}
                maxLength={registering ? 32 : undefined}
                pattern={registering ? '[A-Za-z0-9_-]+' : undefined}
                title={
                  registering
                    ? '3 to 32 characters. Letters, digits, underscores and hyphens only.'
                    : undefined
                }
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              {registering ? (
                <p className="mt-1.5 text-base text-muted-foreground">
                  This is the ID you sign into the game with.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="password" className="mb-3 block">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
                minLength={registering ? 6 : undefined}
                maxLength={registering ? 128 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {registering ? (
                <p className="mt-1.5 text-base text-muted-foreground">
                  Use a unique password that you don&apos;t use anywhere else.
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {registering ? <UserPlus /> : <LogIn />}
              {submitting
                ? registering
                  ? 'Registering…'
                  : 'Signing in…'
                : registering
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
