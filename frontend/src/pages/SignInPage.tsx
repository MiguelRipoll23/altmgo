import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import { writeSessionToken } from '../session';
import { hintClassName, inputClassName, labelClassName, panelClassName, primaryButtonClassName } from '../theme';

type LoginResponse = {
  token: string;
  account: { id: number; displayName: string };
};

/** Signs in with the credentials the game uses, and keeps the token it answers with. */
export function SignInPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: StatusKind; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ kind: 'progress', message: 'Signing in…' });

    try {
      const payload = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { displayName: username.trim(), password },
      });

      writeSessionToken(payload.token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setStatus({ kind: 'error', message: describeError(error) });
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <PageHeading subtitle="Sign in with the same ID and password you use in game" />

      <div className={panelClassName}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

          <div>
            <label htmlFor="username" className={labelClassName}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClassName}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
            />
            <p className={hintClassName}>The password is never stored on this site.</p>
          </div>

          <button type="submit" disabled={submitting} className={`${primaryButtonClassName} w-full`}>
            Sign in
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-mgo-400 hover:text-mgo-500">
          Register
        </Link>
      </p>
    </PageLayout>
  );
}
