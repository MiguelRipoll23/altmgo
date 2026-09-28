import { readEnvironment } from './environment.js';

/**
 * Why a Discord write was refused, in terms the dashboard can show as they are.
 */
export type DiscordRefusal =
  | { reason: 'not-configured' }
  | { reason: 'invalid-channel' }
  | { reason: 'rejected' };

/** The outcome of one Discord write. */
export type DiscordOutcome = { ok: true } | { ok: false; refusal: DiscordRefusal };

/**
 * Base URL of the Discord REST API, and the user agent every call identifies
 * itself with — Discord refuses a call that does not.
 */
const ApiBaseUrl = 'https://discord.com/api/v10';
const UserAgent = 'altmgo-dashboard';

/** A channel is named by a snowflake, which is decimal digits and nothing else. */
const ChannelIdentifierPattern = /^\d{1,20}$/;

/**
 * How long one call may take before it is abandoned. A dashboard write that
 * hangs is a button that never comes back, so the bound is short enough that a
 * caller hears about it and long enough for a slow request to finish.
 */
const RequestTimeoutMilliseconds = 10000;

/**
 * Whether this deployment can write to Discord at all.
 *
 * The bot token is a secret of this deployment and is never sent to the browser:
 * the write is made here, server-side, so the token is not a thing a page can
 * read. The game server holds a token of its own for its slash commands, and
 * publishing that one here would hand the bot to every signed-in moderator.
 */
export function isDiscordConfigured(): boolean {
  return readDiscordToken() !== undefined;
}

/** The bot token, or nothing when the deployment has not been given one. */
function readDiscordToken(): string | undefined {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  return token && token.length > 0 ? token : undefined;
}

/**
 * Writes a message from the bot into one channel of the guild.
 *
 * The message is never allowed to ping a role or everyone in the guild. A
 * dashboard write is an announcement, and an announcement that can mention
 * `@everyone` is one moderator click away from reaching every member of a guild
 * they only meant to inform — so the ability to do it is simply not offered here.
 *
 * The bot posts as itself and cannot speak for the staff who wrote the text, so
 * the author is named in the message body rather than implied by it.
 */
export async function sendChannelMessage(
  channelIdentifier: string,
  content: string,
): Promise<DiscordOutcome> {
  const token = readDiscordToken();
  if (!token) {
    return { ok: false, refusal: { reason: 'not-configured' } };
  }

  if (!ChannelIdentifierPattern.test(channelIdentifier)) {
    return { ok: false, refusal: { reason: 'invalid-channel' } };
  }

  const text = content.trim();
  if (text.length === 0 || text.length > 2000) {
    // Discord's own limit, refused here so the page can say what is wrong rather
    // than posting a message that is silently cut at 2000 characters.
    return { ok: false, refusal: { reason: 'rejected' } };
  }

  const response = await fetch(`${ApiBaseUrl}/channels/${channelIdentifier}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': UserAgent,
    },
    body: JSON.stringify({ content: text }),
    signal: AbortSignal.timeout(RequestTimeoutMilliseconds),
  });

  // Discord answers a channel the bot cannot see in this guild with 403 or 404,
  // and both mean the same thing to the person who pressed the button: that
  // channel is not somewhere this bot can write.
  return response.ok ? { ok: true } : { ok: false, refusal: { reason: 'rejected' } };
}
