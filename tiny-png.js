// Creates PNG from raw RGBA pixels (Uint8ClampedArray)
// Credit: https://github.com/devongovett/png.js (simplified)

import zlib from "zlib";

/**
 * Very basic PNG builder for RGBA buffer
 * @param {Uint8ClampedArray} rgba
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function createPNG(rgba, width, height) {
  const scanlines = [];
  const bytesPerPixel = 4;

  // Add 0 filter byte at start of each row
  for (let y = 0; y < height; y++) {
    scanlines.push(0); // filter type 0
    const start = y * width * bytesPerPixel;
    const end = start + width * bytesPerPixel;
    scanlines.push(...rgba.slice(start, end));
  }

  const imageData = Buffer.from(scanlines);
  const compressed = zlib.deflateSync(imageData);

  const chunks = [
    pngChunk('IHDR', Buffer.from([
      ...toBytes(width), ...toBytes(height),
      8, // bit depth
      6, // color type (RGBA)
      0, // compression
      0, // filter
      0  // interlace
    ])),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    ...chunks
  ]);
}

function pngChunk(type, data) {
  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  return Buffer.concat([
    toBytes(data.length), // length
    Buffer.from(type),
    data,
    toBytes(crc)
  ]);
}

function toBytes(num) {
  return Buffer.from([
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff
  ]);
}

// Basic CRC32 implementation for PNG
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return ~crc >>> 0;
}

const table = (() => {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++)
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[n] = c;
  }
  return table;
})();
