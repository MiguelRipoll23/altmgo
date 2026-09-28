import { deflateSync } from 'node:zlib';

/**
 * The emblem block the game stores, as the client's decoder reads it.
 *
 * 4 magic + 1 flag + 48 palette + 512 pixels = 565 of it is read, and the block is
 * 768, so the last 203 bytes are padding. Both emblems on the live server have all
 * 203 of them zero, which is what confirms the pixels stop where this says they do.
 */
const EmblemBytes = 768;

/** Where the four bytes of magic sit, and what they are. */
const Magic = 'EMBD';

/** Pixels are 32 by 32, which is what makes the emblem square. */
const Width = 32;
const Height = 32;

/** Sixteen colours of three bytes each, immediately after the flag byte. */
const PaletteOffset = 5;
const PaletteEntries = 16;

/** Where the packed indices begin, and how many bytes of them there are. */
const PixelsOffset = 53;
const PixelsBytes = (Width * Height) / 2;

/** Length of the magic at the front of the block. */
const MagicBytes = 4;

/**
 * True when the block is laid out the way the client expects to read it.
 *
 * The length and the magic are all that is checked, and that is enough: the block
 * is a fixed 768 bytes, so anything long enough with the right four bytes at the
 * front is the format rather than something that merely resembles it. The 203 bytes
 * of padding at the end are not checked, because there is nothing to gain from
 * refusing an emblem over bytes nothing reads — and everything to lose if a future
 * client puts something there.
 */
export function isEmblem(bytes: Uint8Array): boolean {
  if (bytes.length < EmblemBytes) {
    return false;
  }

  return Magic === Buffer.from(bytes.subarray(0, MagicBytes)).toString('latin1');
}

/**
 * Which half of a byte is the pixel on the left.
 *
 * Two pixels are packed into every byte and the client's notes do not say which
 * half comes first. The two orders are exact horizontal mirrors, so a symmetric
 * emblem cannot tell them apart, and the disassembly of the decoder did not yield
 * the unpack. It is settled instead by what the stored bytes look like drawn.
 *
 * Reading the wrong half of each byte transposes every adjacent pixel pair, which
 * turns each 2px run into two 1px fragments. Measured over the emblems on the
 * live server, the high-nibble reading is the one that keeps shapes whole:
 *
 *   - the drawn `altmgo` emblem is 34 horizontal runs under this reading and 70
 *     under the other, and every one of the 34 is at least 2px wide where 39 of
 *     the 70 are single pixels
 *   - its perimeter is 140 rather than 212, and it has no isolated speckle
 *   - the hand-painted red in the `test name` emblem is one connected blob of 124
 *     pixels under this reading, and six disconnected pieces under the other
 *
 * So this is measured, not assumed. It is still the one line to change if an
 * emblem ever renders mirrored against the game.
 */
const EmblemLeftNibbleIsHigh = true;

/** The emblem as 32x32 RGBA, ready to be written out. */
export type EmblemImage = { width: number; height: number; rgba: Buffer };

/**
 * Decodes a stored emblem into RGBA pixels.
 *
 * The result is opaque: the format has no transparent colour, and index 0 is
 * whatever the clan drew its background as — white in one emblem on the live
 * server and black in another. Guessing that one index meant "transparent" would
 * punch a hole in whichever clan happened to use it as a real colour, so the
 * block is shown exactly as the game stores it and the card supplies the surface
 * behind it.
 */
export function decodeEmblem(emblem: Uint8Array): EmblemImage {
  // Copied rather than indexed in place so the reads below are total: the caller
  // has already established that the block is a full-length emblem, and a
  // defensive length check here would only duplicate `isEmblem`.
  const block = Buffer.from(emblem.buffer, emblem.byteOffset, EmblemBytes);
  const rgba = Buffer.alloc(Width * Height * 4);

  for (let y = 0; y < Height; y++) {
    for (let x = 0; x < Width; x++) {
      const packed = block.readUInt8(PixelsOffset + y * (Width / 2) + (x >> 1));
      const high = packed >> 4;
      const low = packed & 0x0f;
      const index = (x % 2 === 0) === EmblemLeftNibbleIsHigh ? high : low;

      const at = PaletteOffset + index * 3;
      const target = (y * Width + x) * 4;

      rgba[target] = block.readUInt8(at);
      rgba[target + 1] = block.readUInt8(at + 1);
      rgba[target + 2] = block.readUInt8(at + 2);
      rgba[target + 3] = 0xff;
    }
  }

  return { width: Width, height: Height, rgba };
}

/* The PNG writer below is here rather than in a dependency because the only
 * thing encoded is a 32x32 image of 8-bit RGBA, and that is a signature, three
 * chunks and a CRC — about forty lines against a package that would be larger
 * than the backend. `node:zlib` supplies the only part that is not arithmetic. */

/** The eight bytes every PNG begins with. */
const PngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32 over one chunk's type and data, as the format requires. */
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/** One length-typed-data-crc chunk. */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

/**
 * Encodes RGBA pixels as a PNG.
 *
 * Every scanline carries filter type 0, "none", which costs a byte per row and
 * compresses about as well as it does for an image this size — the alternative
 * filters exist for photographs, and there is one flat block of 32 rows here.
 */
export function encodePng({ width, height, rgba }: EmblemImage): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 6; // colour type: truecolour with alpha
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlacing

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    PngSignature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Decodes a stored emblem and encodes it, or nothing when it is not one. */
export function emblemToPng(emblem: Uint8Array | null | undefined): Buffer | null {
  if (emblem === null || emblem === undefined || !isEmblem(emblem)) {
    return null;
  }

  return encodePng(decodeEmblem(emblem));
}
