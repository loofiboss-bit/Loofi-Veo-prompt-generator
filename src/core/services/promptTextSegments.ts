export interface PromptTextSegment {
  text: string;
  protected: boolean;
}

const DIALOGUE_PREFIX = 'dialogue: the speaker says:';
const FOLLOWING_DIRECTIVES = [
  'Audio:',
  'Use purposeful composition,',
  'Keep the clip to one readable action,',
  'Rich cinematic staging,',
  'Captured on large-format film,',
  'One continuous unbroken shot for ',
];

function quoteEnd(text: string, start: number): number {
  const closing = text[start] === '“' ? '”' : '"';
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') index++;
    else if (text[index] === closing) return index + 1;
  }
  // An unfinished quote is safer to keep than to silently edit spoken words.
  return text.length;
}

/** Dialogue ends at a structural directive, never at sentence punctuation. */
export function segmentPromptText(prompt: string, sourceDialogue = ''): PromptTextSegment[] {
  const segments: PromptTextSegment[] = [];
  const lower = prompt.toLowerCase();
  let cursor = 0;
  let plainStart = 0;
  while (cursor < prompt.length) {
    let end = cursor;
    if (prompt[cursor] === '"' || prompt[cursor] === '“') {
      end = quoteEnd(prompt, cursor);
    } else if (
      lower.startsWith(DIALOGUE_PREFIX, cursor) &&
      (cursor === 0 || /\s/.test(prompt[cursor - 1]))
    ) {
      const speechStart = cursor + DIALOGUE_PREFIX.length;
      const leadingSpace = prompt.slice(speechStart).match(/^\s*/)?.[0].length ?? 0;
      const matchesSource =
        sourceDialogue.length > 0 && prompt.startsWith(sourceDialogue, speechStart + leadingSpace);
      const minimumEnd = matchesSource
        ? speechStart + leadingSpace + sourceDialogue.length
        : speechStart;
      end = prompt.length;
      for (let index = speechStart; index < prompt.length; index++) {
        if (prompt[index] === '"' || prompt[index] === '“') {
          index = quoteEnd(prompt, index) - 1;
        } else if (
          matchesSource &&
          index >= minimumEnd &&
          /\s/.test(prompt[index - 1]) &&
          FOLLOWING_DIRECTIVES.some((directive) => prompt.startsWith(directive, index))
        ) {
          end = index;
          break;
        }
      }
    }
    if (end > cursor) {
      if (cursor > plainStart)
        segments.push({ text: prompt.slice(plainStart, cursor), protected: false });
      segments.push({ text: prompt.slice(cursor, end), protected: true });
      cursor = end;
      plainStart = end;
    } else cursor++;
  }
  if (plainStart < prompt.length)
    segments.push({ text: prompt.slice(plainStart), protected: false });
  return segments;
}

/** Require every protected dialogue span to remain exact and in its original order. */
export function assertProtectedPromptTextPreserved(
  source: string,
  proposed: string,
  sourceDialogue = '',
): void {
  const protectedSegments = segmentPromptText(source, sourceDialogue)
    .filter((segment) => segment.protected)
    .map((segment) => segment.text);
  let cursor = 0;
  for (const segment of protectedSegments) {
    const found = proposed.indexOf(segment, cursor);
    if (found < 0)
      throw new Error(
        'The AI response changed or omitted protected dialogue. Allow dialogue rewriting to change it.',
      );
    cursor = found + segment.length;
  }
}
