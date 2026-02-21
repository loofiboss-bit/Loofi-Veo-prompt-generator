import { describe, it, expect } from 'vitest';
import { formatTimecode } from './timeUtils';

describe('formatTimecode', () => {
  it('should format 0 seconds', () => {
    expect(formatTimecode(0)).toBe('00:00:00,000');
  });

  it('should format whole seconds', () => {
    expect(formatTimecode(5)).toBe('00:00:05,000');
  });

  it('should format fractional seconds with milliseconds', () => {
    expect(formatTimecode(12.5)).toBe('00:00:12,500');
  });

  it('should format minutes', () => {
    expect(formatTimecode(90)).toBe('00:01:30,000');
  });

  it('should format hours', () => {
    expect(formatTimecode(3661)).toBe('01:01:01,000');
  });

  it('should handle sub-second precision', () => {
    const result = formatTimecode(1.234);
    expect(result).toContain(',234');
  });

  it('should pad hours with leading zeros', () => {
    const result = formatTimecode(30);
    expect(result).toMatch(/^\d{2}:/);
  });

  it('should pad milliseconds to 3 digits', () => {
    const result = formatTimecode(1.1);
    expect(result).toContain(',100');
  });
});
