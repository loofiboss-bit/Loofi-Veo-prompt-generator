
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// This file contains utility functions for handling raw audio data,
// specifically for encoding/decoding base64 and creating AudioBuffers
// from raw PCM data as required by the Gemini API.

/**
 * Decodes a base64 string into a Uint8Array of bytes.
 * This is required because the browser's `atob` function returns a binary string.
 * @param base64 The base64-encoded string.
 * @returns A Uint8Array of the decoded bytes.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer that can be played by the Web Audio API.
 * The Gemini Live API sends raw PCM data, not a standard file format like .wav or .mp3.
 * @param data The raw audio data as a Uint8Array.
 * @param ctx The AudioContext to create the buffer in.
 * @param sampleRate The sample rate of the audio (e.g., 24000 for TTS/Live).
 * @param numChannels The number of audio channels (typically 1 for mono).
 * @returns A promise that resolves with the playable AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // The raw data is 16-bit PCM, so we create a Int16Array view on the buffer.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert the 16-bit integer sample to a float between -1.0 and 1.0.
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Encodes a Uint8Array of bytes into a base64 string.
 * This is required to send audio data (e.g., from the microphone) to the Live API.
 * @param bytes The Uint8Array of bytes to encode.
 * @returns The base64-encoded string.
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Creates a standard WAV header for raw PCM data.
 * @param dataLength Total bytes of audio data
 * @param sampleRate Sample rate (e.g., 24000)
 * @param numChannels Number of channels (e.g., 1 for mono)
 * @param bitsPerSample Bit depth (e.g., 16)
 * @returns An ArrayBuffer containing the 44-byte WAV header
 */
export function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): ArrayBuffer {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return header;
}
