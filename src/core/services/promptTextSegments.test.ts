import { describe, expect, it } from 'vitest';
import { segmentPromptText } from './promptTextSegments';

describe('prompt text segments', () => {
  it('protects full multi-sentence dialogue and resumes narration at a structural audio field', () => {
    const dialogue =
      'Dr. Åsa likes 4k resolution. Then she says hello. Audio: is part of her speech.';
    const text = `A scene. Dialogue: the speaker says: ${dialogue} Audio: photorealistic room tone.`;
    const segments = segmentPromptText(text, dialogue);
    expect(segments.filter((segment) => segment.protected).map((segment) => segment.text)).toEqual([
      `Dialogue: the speaker says: ${dialogue} `,
    ]);
    expect(segments.at(-1)).toEqual({ protected: false, text: 'Audio: photorealistic room tone.' });
    expect(segments.map((segment) => segment.text).join('')).toBe(text);
  });
  it('handles escaped quotes, curly quotes, and incomplete quotes without placeholders', () => {
    const text =
      'A "She said \\"4k resolution\\". Then 8k resolution." B “photorealistic. Again!” C "unfinished';
    const segments = segmentPromptText(text);
    expect(segments.filter((segment) => segment.protected)).toHaveLength(3);
    expect(segments.map((segment) => segment.text).join('')).toBe(text);
  });
});
