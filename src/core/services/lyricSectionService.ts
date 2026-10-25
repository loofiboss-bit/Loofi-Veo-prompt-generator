/** A section keeps its exact source bytes; identity is its heading and occurrence. */
export interface LyricSection {
  id: string;
  tag: string;
  name: string;
  occurrence: number;
  start: number;
  end: number;
  raw: string;
  content: string;
}

const SECTION_ERRORS = {
  ambiguous: 'Choose a specific occurrence of this lyric section.',
  missing: 'The selected lyric section no longer exists.',
  locked: 'That section is locked.',
  structure: 'The response changed lyric section order or count. Keep the original draft.',
  response: 'The AI response omitted or ambiguously changed the selected section.',
};

export class LyricSectionError extends Error {
  constructor(public readonly code: keyof typeof SECTION_ERRORS) {
    super(SECTION_ERRORS[code]);
    this.name = 'LyricSectionError';
  }
}

const normalizeName = (value: string): string => value.trim().toLowerCase();

export function parseLyricSections(lyrics: string): LyricSection[] {
  const headings = Array.from(lyrics.matchAll(/^\[([^\]\r\n]+)\]/gm));
  const occurrences = new Map<string, number>();
  return headings.map((heading, index) => {
    const tag = heading[0];
    const name = normalizeName(heading[1]);
    const occurrence = (occurrences.get(name) ?? 0) + 1;
    occurrences.set(name, occurrence);
    const start = heading.index!;
    const end = headings[index + 1]?.index ?? lyrics.length;
    const raw = lyrics.slice(start, end);
    return {
      id: `${tag} #${occurrence}`,
      tag,
      name,
      occurrence,
      start,
      end,
      raw,
      content: raw.slice(tag.length).trim(),
    };
  });
}

function parseSelector(selector: string): { name: string; occurrence?: number } {
  const match = /^\[([^\]]+)\](?:\s*#(\d+))?$/.exec(selector.trim());
  return {
    name: normalizeName(match?.[1] ?? selector),
    occurrence: match?.[2] ? Number(match[2]) : undefined,
  };
}

export function resolveLyricSection(lyrics: string, selector: string): LyricSection | undefined {
  const requested = parseSelector(selector);
  const matches = parseLyricSections(lyrics).filter(
    (section) =>
      section.name === requested.name &&
      (requested.occurrence === undefined || section.occurrence === requested.occurrence),
  );
  if (matches.length > 1) throw new LyricSectionError('ambiguous');
  return matches[0];
}

/** Bare legacy locks intentionally protect every occurrence of their heading. */
export function isLyricSectionLocked(section: LyricSection, locks: string[]): boolean {
  return locks.some((lock) => {
    const requested = parseSelector(lock);
    return (
      requested.name === section.name &&
      (requested.occurrence === undefined || requested.occurrence === section.occurrence)
    );
  });
}

export function setLyricSectionLocked(
  lyrics: string,
  selector: string,
  locks: string[],
  locked: boolean,
): string[] {
  const selected = resolveLyricSection(lyrics, selector);
  if (!selected) throw new LyricSectionError('missing');
  const sections = parseLyricSections(lyrics);
  // Expand a legacy whole-heading lock before toggling one repeated occurrence.
  const otherLocks = locks.filter((lock) => parseSelector(lock).name !== selected.name);
  const matching = sections.filter((section) => section.name === selected.name);
  const retained = matching
    .filter((section) =>
      section.id === selected.id ? locked : isLyricSectionLocked(section, locks),
    )
    .map((section) => (matching.length === 1 ? section.tag : section.id));
  return [...otherLocks, ...retained];
}

export function transformLyricSections(
  lyrics: string,
  transform: (section: LyricSection) => string,
): string {
  const sections = parseLyricSections(lyrics);
  if (!sections.length) return lyrics;
  return lyrics.slice(0, sections[0].start) + sections.map(transform).join('');
}

/** Replace content while keeping the original separator to the following section. */
export function replaceLyricSectionContent(section: LyricSection, content: string): string {
  const separator = /(?:\r?\n[ \t]*)+$/.exec(section.raw)?.[0] ?? '';
  return `${section.tag}\n${content.trim()}${separator}`;
}

export function haveMatchingLyricStructure(
  original: LyricSection[],
  proposed: LyricSection[],
): boolean {
  return (
    original.length === proposed.length &&
    original.every((section, index) => section.name === proposed[index].name)
  );
}
