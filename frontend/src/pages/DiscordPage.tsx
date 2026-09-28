import { Send } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { Panel, SectionHeading } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { readSessionToken } from '../session';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

/**
 * The Discord tools, which is where writing to the guild lives.
 *
 * It is a section of its own rather than a card at the foot of the overview
 * because it is the one control on that page that reaches outside the game: an
 * operator who came to look at the player count should not have a send button
 * from that page within reach of the click that dismisses a refresh.
 *
 * The composer is manager-only on the server, and this page is reached by
 * moderators too — a moderator is told the message needs the manager role
 * rather than being shown a form that would be refused.
 */
export function DiscordPage() {
  const configured = useApiResource<{ configured: boolean }>('/api/manager/discord');

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Discord"
        subtitle="Write to the server's guild from here."
      />

      {configured.data?.configured === false ? (
        <StatusMessage kind="error">
          This deployment has no Discord bot configured, so nothing sent from here will arrive.
        </StatusMessage>
      ) : null}

      <DiscordMessageCard />
    </div>
  );
}

/**
 * Writes an official message from the bot into a channel of the guild.
 *
 * The channel is named by its snowflake rather than picked from a list: the
 * dashboard has no model of the guild's channels, and the one figure an operator
 * always has to hand is the id of the channel they mean. Typing it is
 * deliberate — a dropdown of channels this deployment cannot enumerate would be
 * a list of guesses.
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
      <p className="mb-4 text-sm text-muted-foreground">
        Posts an official message from the bot. The message cannot mention a role or everyone in the
        guild. Sending is a manager action — a moderator can see this page but the server refuses
        the write.
      </p>

      <div className="space-y-4">
        {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

        <div className="space-y-2">
          <Label htmlFor="channel">Channel id</Label>
          <Input
            id="channel"
            type="text"
            inputMode="numeric"
            value={channelIdentifier}
            onChange={(event) => setChannelIdentifier(event.target.value)}
            placeholder="123456789012345678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Message</Label>
          <Textarea
            id="content"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>

        <Button onClick={() => void send()} disabled={!ready || sending}>
          <Send />
          {sending ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </Panel>
  );
}
