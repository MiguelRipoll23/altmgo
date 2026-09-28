import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { Panel } from './DataDisplay';
import { StatusMessage } from './StatusMessage';
import { readSessionToken } from '../session';
import { inputClassName, labelClassName, primaryButtonClassName } from '../theme';

/**
 * Writes an official message from the bot into a channel of the guild.
 *
 * The channel is named by its snowflake rather than picked from a list: the
 * dashboard has no model of the guild's channels, and the one figure an operator
 * always has to hand is the id of the channel they mean. Typing it is deliberate
 * — a dropdown of channels this deployment cannot enumerate would be a list of
 * guesses.
 */
export function DiscordMessageCard() {
  const [channelIdentifier, setChannelIdentifier] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setStatus(null);

    try {
      await apiRequest('/api/manager/discord/messages', {
        method: 'POST',
        token: readSessionToken(),
        body: { channelId: channelIdentifier.trim(), content },
      });

      setStatus({ kind: 'success', message: 'The message was sent.' });
      setContent('');
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setSending(false);
    }
  }

  const ready = channelIdentifier.trim().length > 0 && content.trim().length > 0;

  return (
    <Panel title="Send a Discord message">
      <p className="mb-4 text-sm text-slate-400">
        Posts an official message from the bot. The message cannot mention a role or everyone in the
        guild.
      </p>

      <div className="space-y-4">
        {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

        <div>
          <label htmlFor="channel" className={labelClassName}>
            Channel id
          </label>
          <input
            id="channel"
            type="text"
            inputMode="numeric"
            value={channelIdentifier}
            onChange={(event) => setChannelIdentifier(event.target.value)}
            placeholder="123456789012345678"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="content" className={labelClassName}>
            Message
          </label>
          <textarea
            id="content"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className={inputClassName}
          />
        </div>

        <button
          type="button"
          onClick={() => void send()}
          disabled={!ready || sending}
          className={primaryButtonClassName}
        >
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </Panel>
  );
}
