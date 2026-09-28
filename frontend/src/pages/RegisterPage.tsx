import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, describeError } from '../api';
import { PageHeading, PageLayout } from '../components/PageLayout';
import { StatusMessage } from '../components/StatusMessage';
import type { StatusKind } from '../components/StatusMessage';
import { hintClassName, inputClassName, labelClassName, panelClassName, primaryButtonClassName } from '../theme';

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
    setStatus({ kind: 'progress', message: 'Creating account…' });

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
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_-]+"
              title="3 to 32 characters. Letters, digits, underscores and hyphens only."
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClassName}
            />
            <p className={hintClassName}>This is the ID you sign into the game with.</p>
          </div>

          <div>
            <label htmlFor="password" className={labelClassName}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
            />
            <p className={hintClassName}>
              Use a unique password that you don't use anywhere else.
            </p>
          </div>

          <button type="submit" disabled={submitting} className={`${primaryButtonClassName} w-full`}>
            Create account
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already registered?{' '}
        <Link to="/signin" className="font-medium text-mgo-400 hover:text-mgo-500">
          Sign in
        </Link>
      </p>
    </PageLayout>
  );
}
