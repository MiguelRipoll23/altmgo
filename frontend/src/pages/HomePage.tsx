import { Gamepad2, LogIn, Users, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { formatNumber } from '../components/DataDisplay';
import { PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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

/** The public front door: a welcome, a live server pulse, and account access. */
export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: StatusKind; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pulse = useApiResource<ServerPulse>('/api/server/pulse');

  function selectMode(value: string) {
    if (value !== 'signin' && value !== 'register') {
      return;
    }

    setMode(value);
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
    <PageLayout width="landing">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-center lg:gap-16">
        <section className="space-y-8 text-center lg:text-left">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Welcome to
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              <span className="text-primary">Alt</span>MGO
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              An alternative server for playing Metal Gear Online 2.
            </p>
          </div>

          <div>
            {pulse.data === null ? (
              <p
                role={pulse.error ? 'alert' : 'status'}
                className="text-sm text-muted-foreground"
              >
                {pulse.error ?? 'Loading server activity…'}
              </p>
            ) : (
              <div className="mx-auto grid max-w-sm grid-cols-2 gap-5 lg:mx-0">
                <PulseStat
                  icon={Users}
                  label="Players online"
                  value={formatNumber(pulse.data.playersOnline)}
                />
                <PulseStat
                  icon={Gamepad2}
                  label="Games hosted"
                  value={formatNumber(pulse.data.totalGames)}
                />
              </div>
            )}
          </div>
        </section>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold normal-case tracking-normal text-foreground">
              {registering ? 'Create your account' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {registering
                ? 'Use the same ID and password you will play with.'
                : 'Sign in with the account you use in game.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={selectMode}>
              <TabsList aria-label="Account access">
                <TabsTrigger value="signin" disabled={submitting}>
                  <LogIn />
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="register" disabled={submitting}>
                  <UserPlus />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <AuthForm
                  mode="signin"
                  username={username}
                  password={password}
                  status={status}
                  submitting={submitting}
                  onUsernameChange={setUsername}
                  onPasswordChange={setPassword}
                  onSubmit={handleSubmit}
                />
              </TabsContent>

              <TabsContent value="register">
                <AuthForm
                  mode="register"
                  username={username}
                  password={password}
                  status={status}
                  submitting={submitting}
                  onUsernameChange={setUsername}
                  onPasswordChange={setPassword}
                  onSubmit={handleSubmit}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function PulseStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 text-left">
      <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-2xl font-extrabold tabular-nums text-foreground">{value}</span>
        <span className="block truncate text-sm text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function AuthForm({
  mode,
  username,
  password,
  status,
  submitting,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: {
  mode: AuthMode;
  username: string;
  password: string;
  status: { kind: StatusKind; message: string } | null;
  submitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const registering = mode === 'register';

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      <div>
        <Label htmlFor="username" className="mb-2 block">
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
          onChange={(event) => onUsernameChange(event.target.value)}
        />
        {registering ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            3–32 characters: letters, numbers, _ or -.
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password" className="mb-2 block">
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
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        {registering ? (
          <p className="mt-1.5 text-sm text-muted-foreground">At least 6 characters.</p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {registering ? <UserPlus /> : <LogIn />}
        {submitting
          ? registering
            ? 'Creating account…'
            : 'Signing in…'
          : registering
            ? 'Create account'
            : 'Sign in'}
      </Button>
    </form>
  );
}
