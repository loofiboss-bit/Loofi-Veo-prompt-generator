import type { PromptArtifactV1, VideoPromptVariant, MusicPromptVariant } from '@core/types';
import { optimizeMusicPromptArtifact, revalidatePromptArtifact } from './promptStudioService';
import {
  haveMatchingLyricStructure,
  LyricSectionError,
  isLyricSectionLocked,
  parseLyricSections,
  replaceLyricSectionContent,
  resolveLyricSection,
} from './lyricSectionService';

export type StudioVariantEdits = Partial<Pick<VideoPromptVariant, 'prompt' | 'negativePrompt'>> &
  Partial<Pick<MusicPromptVariant, 'lyrics' | 'styleOfMusic'>>;

export function editStudioVariant(
  artifact: PromptArtifactV1,
  index: 0 | 1 | 2,
  changes: StudioVariantEdits,
): PromptArtifactV1 {
  const variants = [artifact.primary, ...artifact.alternatives];
  const variant = { ...variants[index], ...changes };
  if (artifact.kind === 'video') {
    const video = variant as VideoPromptVariant;
    video.copyPrompt = video.prompt;
    video.copyNegativePrompt = video.negativePrompt;
    video.copySettingsChecklist = video.settingsChecklist.join('\n');
    video.copyAll =
      video.prompt +
      '\n\nNegative prompt: ' +
      video.negativePrompt +
      '\n\n' +
      video.copySettingsChecklist;
  } else {
    const music = variant as MusicPromptVariant;
    music.copyStyle = music.styleOfMusic;
    music.copyLyrics = music.lyrics;
    music.copyAll =
      'Title: ' +
      music.title +
      '\n\nStyle of Music:\n' +
      music.styleOfMusic +
      '\n\nLyrics:\n' +
      music.lyrics +
      '\n\nProduction notes:\n' +
      music.productionNotes.join('\n');
  }
  variants[index] = variant;
  return revalidatePromptArtifact({
    ...artifact,
    primary: variants[0],
    alternatives: [variants[1], variants[2]],
    provenance: { ...artifact.provenance, source: 'editor' },
  });
}

/** Ambiguous AI structures are rejected; locked blocks never move or get appended. */
export function preserveLockedLyricSections(
  original: string,
  proposed: string,
  locks: string[],
): string {
  const source = parseLyricSections(original);
  if (!source.some((section) => isLyricSectionLocked(section, locks))) return proposed;
  const candidate = parseLyricSections(proposed);
  if (!haveMatchingLyricStructure(source, candidate)) {
    throw new LyricSectionError('structure');
  }
  return (
    proposed.slice(0, candidate[0].start) +
    source
      .map((section, index) =>
        isLyricSectionLocked(section, locks) ? section.raw : candidate[index].raw,
      )
      .join('')
  );
}

/** Keep every non-selected section byte-identical, including repeated locked sections. */
export function replaceStudioLyricSection(
  original: string,
  proposed: string,
  section: string,
  locks: string[],
): string {
  const selected = resolveLyricSection(original, section);
  if (!selected) throw new LyricSectionError('missing');
  if (isLyricSectionLocked(selected, locks)) throw new LyricSectionError('locked');
  const source = parseLyricSections(original);
  const candidate = parseLyricSections(proposed);
  const replacement =
    candidate.length === 1 && candidate[0].name === selected.name
      ? candidate[0]
      : haveMatchingLyricStructure(source, candidate)
        ? candidate[source.findIndex((entry) => entry.id === selected.id)]
        : undefined;
  if (!replacement?.content) throw new LyricSectionError('response');
  return (
    original.slice(0, selected.start) +
    replaceLyricSectionContent(selected, replacement.content) +
    original.slice(selected.end)
  );
}

export async function rewriteStudioLyricSection(
  artifact: PromptArtifactV1,
  section: string,
  direction: string,
  locks: string[],
  variantIndex: 0 | 1 | 2 = 0,
  signal?: AbortSignal,
): Promise<PromptArtifactV1> {
  if (signal?.aborted) throw new DOMException('AI request cancelled.', 'AbortError');
  if (artifact.kind !== 'music') throw new Error('A music artifact is required.');
  const primary = [artifact.primary, ...artifact.alternatives][variantIndex] as MusicPromptVariant;
  const selected = resolveLyricSection(primary.lyrics, section);
  if (!selected) throw new LyricSectionError('missing');
  if (isLyricSectionLocked(selected, locks)) throw new LyricSectionError('locked');
  const input = artifact.input as import('@core/types').MusicPromptArtifactInput;
  const optimizeInput = {
    ...input,
    lyrics: primary.lyrics,
    mixNotes: [
      input.mixNotes,
      'Rewrite ' +
        section +
        ' only. ' +
        direction +
        '. Keep the requested lyrics language and all other sections unchanged.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
  const optimized = signal
    ? await optimizeMusicPromptArtifact(optimizeInput, undefined, signal)
    : await optimizeMusicPromptArtifact(optimizeInput);
  const next = editStudioVariant(artifact, variantIndex, {
    lyrics: replaceStudioLyricSection(
      primary.lyrics,
      (optimized.primary as MusicPromptVariant).lyrics,
      section,
      locks,
    ),
  });
  return { ...next, provenance: { ...optimized.provenance } };
}
