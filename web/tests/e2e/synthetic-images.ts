import zlib from "node:zlib";

export interface SyntheticImageFile {
  name: string;
  mimeType: "image/png";
  buffer: Buffer;
}

export function syntheticPng(name: string, width: number, height: number, seed: number): SyntheticImageFile {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * bytesPerPixel;
      const checker = (Math.floor(x / 24) + Math.floor(y / 24) + seed) % 2;
      raw[offset] = (70 + seed * 31 + checker * 80) % 255;
      raw[offset + 1] = (95 + seed * 43 + checker * 60) % 255;
      raw[offset + 2] = (120 + seed * 17 + checker * 40) % 255;
      raw[offset + 3] = 255;
    }
  }

  return {
    name,
    mimeType: "image/png",
    buffer: encodePng(width, height, raw)
  };
}

export function invalidTextFile(name = "not-an-image.txt") {
  return {
    name,
    mimeType: "text/plain",
    buffer: Buffer.from("NOT A FACE PHOTO. SYNTHETIC INVALID IMAGE INPUT FOR E2E TESTS ONLY.", "utf8")
  };
}

function encodePng(width: number, height: number, raw: Buffer) {
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  return Buffer.concat([uint32(data.length), typeBytes, data, uint32(crc32(crcInput))]);
}

function uint32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
