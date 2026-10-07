import type { PromptArtifactV1, VideoPromptVariant, MusicPromptVariant } from '@core/types';
import { optimizeMusicPromptArtifact } from './promptStudioService';

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
      'Prompt:\n' +
      video.prompt +
      '\n\nNegative prompt:\n' +
      video.negativePrompt +
      '\n\nSettings checklist:\n' +
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
  return {
    ...artifact,
    primary: variants[0],
    alternatives: [variants[1], variants[2]],
    provenance: { ...artifact.provenance, source: 'editor' },
  };
}

/** Reapply locked source blocks after a whole-pack optimization. */
export function preserveLockedLyricSections(
  original: string,
  proposed: string,
  locks: string[],
): string {
  const blocks = (value: string) => value.split(/(?=^\[[^\]]+\])/m);
  const locked = blocks(original).filter((block) => locks.some((tag) => block.startsWith(tag)));
  const seen = new Set<string>();
  const result = blocks(proposed)
    .map((block) => {
      const source = locked.find(
        (entry) =>
          entry.slice(0, entry.indexOf(']') + 1) === block.slice(0, block.indexOf(']') + 1),
      );
      if (source) seen.add(source);
      return source ?? block;
    })
    .join('');
  return result + locked.filter((block) => !seen.has(block)).join('');
}

/** Keep every non-selected section byte-identical, especially locked sections. */
export function replaceStudioLyricSection(
  original: string,
  proposed: string,
  section: string,
  locks: string[],
): string {
  if (locks.includes(section)) throw new Error('That section is locked.');
  const blocks = (value: string) => value.split(/(?=^\[[^\]]+\])/m);
  const replacement = blocks(proposed).find((block) => block.startsWith(section));
  if (!replacement?.trim()) throw new Error('The AI response omitted the selected section.');
  return blocks(original)
    .map((block) => (block.startsWith(section) ? replacement : block))
    .join('');
}

export async function rewriteStudioLyricSection(
  artifact: PromptArtifactV1,
  section: string,
  direction: string,
  locks: string[],
  variantIndex: 0 | 1 | 2 = 0,
): Promise<PromptArtifactV1> {
  if (artifact.kind !== 'music') throw new Error('A music artifact is required.');
  if (locks.includes(section)) throw new Error('That section is locked.');
  const primary = [artifact.primary, ...artifact.alternatives][variantIndex] as MusicPromptVariant;
  const input = artifact.input as import('@core/types').MusicPromptArtifactInput;
  const optimized = await optimizeMusicPromptArtifact({
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
  });
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
