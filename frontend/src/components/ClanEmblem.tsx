import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { apiBlob } from '../api';
import { readSessionToken } from '../session';

/**
 * The emblem a clan drew in the game, or a flag in its place.
 *
 * The game stores an emblem as 768 bytes of its own packed format, which the
 * backend decodes into a 32x32 PNG. It cannot be pointed at with a plain `src`,
 * because the image the browser fetches by URL would not carry the session token —
 * so it is fetched here as a blob and shown from an object URL, and the object URL
 * is revoked when the clan goes away.
 *
 * A clan that has drawn nothing shows the flag rather than an empty square, and a
 * clan whose emblem fails to load falls back to the same flag: the emblem's job is
 * to identify a clan, and a broken-image icon would say less about it than the icon
 * that stands in for every clan the game has no emblem for.
 *
 * `size` is the width the emblem is drawn at, and the band is the same width
 * whichever it is: the emblem is 32x32, so the square is its own shape and any other
 * ratio would crop the picture or letterbox it. It is held to its pixels rather
 * than scaled smoothly, because a 32x32 drawing interpolated up is a blur, and the
 * drawing is the point of it.
 */
export function ClanEmblem({
  clanId,
  name,
  hasEmblem,
  size,
  className = '',
}: {
  clanId: number;
  name: string;
  hasEmblem: boolean;
  /** Width of the square band, in any Tailwind width. */
  size: string;
  className?: string;
}) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    if (!hasEmblem) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void apiBlob(`/api/clans/${clanId}/emblem`, { token: readSessionToken() })
      .then((blob) => {
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        // The placeholder is already on screen and stays there. An emblem that
        // will not load is not worth a line of text over the clan's own name.
      });

    return () => {
      cancelled = true;

      // Revoked rather than left to the collector: a directory that is paged
      // through and paged back would otherwise hold one blob per clan it had
      // shown, for as long as the tab was open.
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [clanId, hasEmblem]);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 ${size} ${className}`}
    >
      {source === null ? (
        <Flag className="size-8 text-muted-foreground/50" aria-hidden="true" />
      ) : (
        <img
          src={source}
          alt={`${name}'s emblem`}
          className="size-full object-contain [image-rendering:pixelated]"
        />
      )}
    </div>
  );
}
