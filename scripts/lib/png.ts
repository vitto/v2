/*
  The pixels of a PNG, with nothing to install: the chunks read by hand, the image data inflated
  with node:zlib and unfiltered as the PNG specification says (filters 0 to 4). Enough for the
  screenshots of Chrome: 8 bits per channel, grey, grey and alpha, RGB or RGBA, not interlaced.
*/
import { inflateSync } from 'node:zlib';

export interface Pixels {
  width: number;
  height: number;
  /** 1 grey, 2 grey and alpha, 3 RGB, 4 RGBA. */
  channels: number;
  data: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: Record<number, number> = { 0: 1, 4: 2, 2: 3, 6: 4 };

export const decodePng = (png: Uint8Array): Pixels => {
  const buffer = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
  if (SIGNATURE.some((byte, i) => buffer[i] !== byte)) throw new Error('not a PNG');
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Buffer[] = [];
  for (let at = 8; at + 8 <= buffer.length; ) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString('ascii', at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, color, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      channels = CHANNELS[color] ?? 0;
      if (depth !== 8 || !channels || interlace !== 0)
        throw new Error(`a PNG this reader does not read: depth ${depth}, colour type ${color}, interlace ${interlace}`);
    } else if (type === 'IDAT') data.push(body);
    else if (type === 'IEND') break;
    at += 12 + length;
  }
  if (!width || !height) throw new Error('a PNG without a header');
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[row + x - channels] : 0;
      const b = y > 0 ? out[row - stride + x] : 0;
      const c = x >= channels && y > 0 ? out[row - stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = a;
      else if (filter === 2) predicted = b;
      else if (filter === 3) predicted = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`a PNG row with filter ${filter}`);
      out[row + x] = (raw[line + x] + predicted) & 255;
    }
  }
  return { width, height, channels, data: out };
};

/** Red, green, blue 0-255 and alpha 0-1 of the pixel at x, y. */
export const pixelAt = (image: Pixels, x: number, y: number): [number, number, number, number] => {
  const at = (Math.floor(y) * image.width + Math.floor(x)) * image.channels;
  const d = image.data;
  if (image.channels === 1) return [d[at], d[at], d[at], 1];
  if (image.channels === 2) return [d[at], d[at], d[at], d[at + 1] / 255];
  return [d[at], d[at + 1], d[at + 2], image.channels === 4 ? d[at + 3] / 255 : 1];
};
