import { describe, it, expect } from 'vitest';
import { decode, encode, createWavHeader } from './audio';

describe('decode (base64 → Uint8Array)', () => {
  it('should decode a simple base64 string', () => {
    // "Hello" in base64 is "SGVsbG8="
    const result = decode('SGVsbG8=');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
    expect(String.fromCharCode(...result)).toBe('Hello');
  });

  it('should decode an empty string', () => {
    const result = decode('');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });

  it('should decode binary data correctly', () => {
    // Create known byte sequence
    const bytes = new Uint8Array([0, 127, 255, 128, 1]);
    const base64 = btoa(String.fromCharCode(...bytes));
    const result = decode(base64);
    expect(result).toEqual(bytes);
  });

  it('should handle padded base64', () => {
    // "A" = "QQ==" (2 padding chars)
    const result = decode('QQ==');
    expect(result.length).toBe(1);
    expect(result[0]).toBe(65); // 'A'
  });
});

describe('encode (Uint8Array → base64)', () => {
  it('should encode a simple byte array', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const result = encode(bytes);
    expect(result).toBe('SGVsbG8=');
  });

  it('should encode an empty array', () => {
    const bytes = new Uint8Array([]);
    const result = encode(bytes);
    expect(result).toBe('');
  });

  it('should round-trip correctly', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    const encoded = encode(original);
    const decoded = decode(encoded);
    expect(decoded).toEqual(original);
  });

  it('should produce valid base64 characters', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const result = encode(bytes);
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('createWavHeader', () => {
  it('should create a 44-byte header', () => {
    const header = createWavHeader(1000, 24000, 1, 16);
    expect(header.byteLength).toBe(44);
  });

  it('should start with RIFF marker', () => {
    const header = createWavHeader(1000, 24000, 1, 16);
    const view = new DataView(header);
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    expect(riff).toBe('RIFF');
  });

  it('should contain WAVE format', () => {
    const header = createWavHeader(1000, 24000, 1, 16);
    const view = new DataView(header);
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11),
    );
    expect(wave).toBe('WAVE');
  });

  it('should contain fmt chunk marker', () => {
    const header = createWavHeader(1000, 24000, 1, 16);
    const view = new DataView(header);
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15),
    );
    expect(fmt).toBe('fmt ');
  });

  it('should contain data chunk marker', () => {
    const header = createWavHeader(1000, 24000, 1, 16);
    const view = new DataView(header);
    const data = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39),
    );
    expect(data).toBe('data');
  });

  it('should set file size correctly (36 + dataLength)', () => {
    const dataLength = 48000;
    const header = createWavHeader(dataLength, 24000, 1, 16);
    const view = new DataView(header);
    expect(view.getUint32(4, true)).toBe(36 + dataLength);
  });

  it('should set PCM format code (1)', () => {
    const header = createWavHeader(1000, 24000, 1, 16);
    const view = new DataView(header);
    expect(view.getUint16(20, true)).toBe(1);
  });

  it('should set channel count', () => {
    const header = createWavHeader(1000, 24000, 2, 16);
    const view = new DataView(header);
    expect(view.getUint16(22, true)).toBe(2);
  });

  it('should set sample rate', () => {
    const header = createWavHeader(1000, 44100, 1, 16);
    const view = new DataView(header);
    expect(view.getUint32(24, true)).toBe(44100);
  });

  it('should set byte rate (sampleRate * numChannels * bitsPerSample/8)', () => {
    const header = createWavHeader(1000, 24000, 2, 16);
    const view = new DataView(header);
    // 24000 * 2 * 2 = 96000
    expect(view.getUint32(28, true)).toBe(96000);
  });

  it('should set block align (numChannels * bitsPerSample/8)', () => {
    const header = createWavHeader(1000, 24000, 2, 16);
    const view = new DataView(header);
    expect(view.getUint16(32, true)).toBe(4); // 2 * 2
  });

  it('should set bits per sample', () => {
    const header = createWavHeader(1000, 24000, 1, 24);
    const view = new DataView(header);
    expect(view.getUint16(34, true)).toBe(24);
  });

  it('should set data chunk size', () => {
    const dataLength = 9600;
    const header = createWavHeader(dataLength, 24000, 1, 16);
    const view = new DataView(header);
    expect(view.getUint32(40, true)).toBe(dataLength);
  });
});
