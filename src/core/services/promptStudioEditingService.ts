import type { PromptArtifactV1, VideoPromptVariant, MusicPromptVariant } from '@core/types';
import { optimizeMusicPromptArtifact, revalidatePromptArtifact } from './promptStudioService';

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

/** Reapply locked source blocks after a whole-pack optimization, preserving repeated section identities. */
export function preserveLockedLyricSections(
  original: string,
  proposed: string,
  locks: string[],
): string {
  const blocks = (value: string) => value.split(/(?=^\[[^\]]+\])/m);
  const origBlocks = blocks(original);

  const tagCounts = new Map<string, number>();
  const originalTagged = origBlocks.map((block) => {
    const tagMatch = block.match(/^\[[^\]]+\]/);
    const tag = tagMatch ? tagMatch[0] : '';
    const occurrence = (tagCounts.get(tag) ?? 0) + 1;
    tagCounts.set(tag, occurrence);
    const indexedTag = `${tag} #${occurrence}`;
    const isLocked = locks.some((l) => l === tag || l === indexedTag);
    return { block, tag, occurrence, indexedTag, isLocked };
  });

  const lockedEntries = originalTagged.filter((item) => item.isLocked);
  if (lockedEntries.length === 0) return proposed;

  const usedOriginalBlocks = new Set<string>();
  const propCounts = new Map<string, number>();

  const proposedMapped = blocks(proposed).map((block) => {
    const tagMatch = block.match(/^\[[^\]]+\]/);
    const tag = tagMatch ? tagMatch[0] : '';
    const occurrence = (propCounts.get(tag) ?? 0) + 1;
    propCounts.set(tag, occurrence);
    const indexedTag = `${tag} #${occurrence}`;

    const match =
      lockedEntries.find(
        (entry) =>
          !usedOriginalBlocks.has(entry.block) &&
          (entry.indexedTag === indexedTag ||
            (entry.tag === tag && entry.occurrence === occurrence)),
      ) ?? lockedEntries.find((entry) => !usedOriginalBlocks.has(entry.block) && entry.tag === tag);

    if (match) {
      usedOriginalBlocks.add(match.block);
      return match.block;
    }
    return block;
  });

  const unplaced = lockedEntries.filter((entry) => !usedOriginalBlocks.has(entry.block));
  return proposedMapped.join('') + unplaced.map((e) => e.block).join('');
}

/** Keep every non-selected section byte-identical, especially locked sections. */
export function replaceStudioLyricSection(
  original: string,
  proposed: string,
  section: string,
  locks: string[],
): string {
  if (locks.includes(section)) throw new Error('That section is locked.');
  const indexMatch = section.match(/^(\[[^\]]+\])\s*#(\d+)$/);
  const targetTag = indexMatch ? indexMatch[1] : section;
  const targetOccurrence = indexMatch ? parseInt(indexMatch[2], 10) : 1;

  if (locks.includes(targetTag) || locks.includes(`${targetTag} #${targetOccurrence}`)) {
    throw new Error('That section is locked.');
  }

  const blocks = (value: string) => value.split(/(?=^\[[^\]]+\])/m);
  const replacement = blocks(proposed).find((block) => block.startsWith(targetTag));
  if (!replacement?.trim()) throw new Error('The AI response omitted the selected section.');

  let currentOccur = 0;
  return blocks(original)
    .map((block) => {
      if (block.startsWith(targetTag)) {
        currentOccur += 1;
        if (currentOccur === targetOccurrence || (!indexMatch && currentOccur === 1)) {
          return replacement;
        }
      }
      return block;
    })
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
