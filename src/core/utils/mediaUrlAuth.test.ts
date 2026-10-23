import { describe, it, expect } from 'vitest';
import { appendApiKeyToMediaUrl } from './mediaUrlAuth';

describe('appendApiKeyToMediaUrl', () => {
  it('should return null when mediaUrl is null', () => {
    expect(appendApiKeyToMediaUrl(null, 'test-api-key')).toBeNull();
  });

  it('should return empty string when mediaUrl is empty', () => {
    expect(appendApiKeyToMediaUrl('', 'test-api-key')).toBe('');
  });

  it('should return unchanged mediaUrl when apiKey is null', () => {
    const url = 'https://example.com/media.mp4';
    expect(appendApiKeyToMediaUrl(url, null)).toBe(url);
  });

  it('should return unchanged mediaUrl when apiKey is empty', () => {
    const url = 'https://example.com/media.mp4';
    expect(appendApiKeyToMediaUrl(url, '')).toBe(url);
  });

  it('should return unchanged mediaUrl for blob URLs', () => {
    const blobUrl = 'blob:http://localhost:3000/550e8400-e29b-41d4-a716-446655440000';
    expect(appendApiKeyToMediaUrl(blobUrl, 'test-api-key')).toBe(blobUrl);
  });

  it('should return unchanged mediaUrl if it already contains key= in query parameters', () => {
    const urlWithKey1 = 'https://example.com/media.mp4?key=existing_key';
    const urlWithKey2 = 'https://example.com/media.mp4?foo=bar&key=existing_key';

    expect(appendApiKeyToMediaUrl(urlWithKey1, 'new-key')).toBe(urlWithKey1);
    expect(appendApiKeyToMediaUrl(urlWithKey2, 'new-key')).toBe(urlWithKey2);
  });

  it('should append key using ? separator when mediaUrl has no query parameters', () => {
    const url = 'https://example.com/media.mp4';
    const result = appendApiKeyToMediaUrl(url, 'secret123');
    expect(result).toBe('https://example.com/media.mp4?key=secret123');
  });

  it('should append key using & separator when mediaUrl already has query parameters', () => {
    const url = 'https://example.com/media.mp4?format=mp4&quality=high';
    const result = appendApiKeyToMediaUrl(url, 'secret123');
    expect(result).toBe('https://example.com/media.mp4?format=mp4&quality=high&key=secret123');
  });

  it('should encode special characters in the API key', () => {
    const url = 'https://example.com/media.mp4';
    const specialApiKey = 'key with spaces & special=chars#123?';
    const result = appendApiKeyToMediaUrl(url, specialApiKey);
    expect(result).toBe(
      `https://example.com/media.mp4?key=${encodeURIComponent(specialApiKey)}`,
    );
  });
});
