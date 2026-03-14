export const appendApiKeyToMediaUrl = (
  mediaUrl: string | null,
  apiKey: string | null,
): string | null => {
  if (!mediaUrl || !apiKey || mediaUrl.startsWith('blob:') || mediaUrl.includes('key=')) {
    return mediaUrl;
  }

  const separator = mediaUrl.includes('?') ? '&' : '?';
  return `${mediaUrl}${separator}key=${encodeURIComponent(apiKey)}`;
};
