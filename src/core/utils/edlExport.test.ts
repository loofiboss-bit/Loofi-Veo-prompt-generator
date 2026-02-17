import { describe, it, expect } from 'vitest';
import { framesToTimecode, generateEDL } from './edlExport';
import type { Shot } from '@core/types';

describe('framesToTimecode', () => {
  it('should convert 0 frames to 00:00:00:00', () => {
    expect(framesToTimecode(0, 24)).toBe('00:00:00:00');
  });

  it('should convert frames within one second', () => {
    expect(framesToTimecode(12, 24)).toBe('00:00:00:12');
  });

  it('should convert exactly one second', () => {
    expect(framesToTimecode(24, 24)).toBe('00:00:01:00');
  });

  it('should convert frames to minutes', () => {
    // 60 seconds * 24 fps = 1440 frames
    expect(framesToTimecode(1440, 24)).toBe('00:01:00:00');
  });

  it('should convert frames to hours', () => {
    // 3600 seconds * 24 fps = 86400 frames
    expect(framesToTimecode(86400, 24)).toBe('01:00:00:00');
  });

  it('should handle mixed timecode', () => {
    // 1 hour + 2 min + 3 sec + 4 frames = (3600+120+3)*24 + 4 = 89352 + 4 = 89356
    expect(framesToTimecode(89356, 24)).toBe('01:02:03:04');
  });

  it('should pad single digits', () => {
    expect(framesToTimecode(1, 24)).toBe('00:00:00:01');
  });

  it('should work with 30 fps', () => {
    // 30 frames = 1 second at 30fps
    expect(framesToTimecode(30, 30)).toBe('00:00:01:00');
    expect(framesToTimecode(15, 30)).toBe('00:00:00:15');
  });
});

describe('generateEDL', () => {
  const makeShot = (overrides: Partial<Shot> = {}): Shot =>
    ({
      id: 1,
      type: 'video' as const,
      action: 'A dramatic zoom on the subject',
      camera: 'Close-up',
      characterId: '',
      generatedVideoUrl: 'blob:http://example.com/1',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: false,
      duration: 5,
      transition: { type: 'cut', duration: 0 },
      ...overrides,
    }) as Shot;

  it('should produce EDL header with title and FCM', () => {
    const edl = generateEDL([], 'My Project');
    expect(edl).toContain('TITLE: MY_PROJECT');
    expect(edl).toContain('FCM: NON-DROP FRAME');
  });

  it('should sanitize title (special characters replaced with underscores)', () => {
    const edl = generateEDL([], 'Hello World! #1');
    expect(edl).toContain('TITLE: HELLO_WORLD___1');
  });

  it('should skip shots without generatedVideoUrl', () => {
    const shots = [makeShot({ generatedVideoUrl: undefined })];
    const edl = generateEDL(shots);
    // Only header, no event lines
    const lines = edl.trim().split('\n');
    expect(lines).toHaveLength(2); // TITLE + FCM
  });

  it('should generate one event entry per shot with video', () => {
    const shots = [makeShot()];
    const edl = generateEDL(shots, 'TEST', 24);
    expect(edl).toContain('001  001');
    expect(edl).toContain('V     C');
    // Source: 00:00:00:00 to 00:00:05:00
    expect(edl).toContain('00:00:00:00 00:00:05:00');
    // Record: 00:00:00:00 to 00:00:05:00
    expect(edl).toContain('00:00:00:00 00:00:05:00');
  });

  it('should include clip name comment', () => {
    const edl = generateEDL([makeShot()], 'TEST');
    expect(edl).toContain('* FROM CLIP NAME: SHOT_001.mp4');
  });

  it('should include action comment truncated to 60 chars', () => {
    const longAction = 'A'.repeat(100);
    const edl = generateEDL([makeShot({ action: longAction })]);
    expect(edl).toContain('* COMMENT: ' + 'A'.repeat(60) + '...');
  });

  it('should chain record timecodes for multiple shots', () => {
    const shots = [makeShot({ id: 1 }), makeShot({ id: 2 })];
    const edl = generateEDL(shots, 'TEST', 24);
    // First shot record: 00:00:00:00 - 00:00:05:00
    // Second shot record: 00:00:05:00 - 00:00:10:00
    expect(edl).toContain('002  002');
    // The second record-in should be 00:00:05:00
    const lines = edl.split('\n');
    const event2 = lines.find((l) => l.startsWith('002'));
    expect(event2).toContain('00:00:05:00 00:00:10:00');
  });

  it('should use default title VEO_SEQUENCE', () => {
    const edl = generateEDL([]);
    expect(edl).toContain('TITLE: VEO_SEQUENCE');
  });

  it('should use default fps of 24', () => {
    const shots = [makeShot()];
    const edl = generateEDL(shots);
    // 5 seconds * 24 fps = 120 frames = 00:00:05:00
    expect(edl).toContain('00:00:05:00');
  });

  it('should replace newlines in action comments', () => {
    const edl = generateEDL([makeShot({ action: 'line1\nline2' })]);
    expect(edl).not.toContain('\n* COMMENT: line1\nline2');
    expect(edl).toContain('* COMMENT: line1 line2...');
  });
});
