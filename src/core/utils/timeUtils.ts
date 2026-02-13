/**
 * Formats a time in seconds to SRT timecode format (HH:MM:SS,ms)
 * e.g. 12.5 -> 00:00:12,500
 */
export const formatTimecode = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const mm = date.toISOString().substr(14, 5); // MM:SS
  const hh = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const ms = Math.floor((seconds % 1) * 1000)
    .toString()
    .padStart(3, '0');
  return `${hh}:${mm},${ms}`;
};
