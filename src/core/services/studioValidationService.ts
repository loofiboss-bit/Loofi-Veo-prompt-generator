import type {
  PromptValidationCheck,
  MusicPromptArtifactInput,
  MusicPromptVariant,
  VideoPromptArtifactInput,
  VideoPromptVariant,
} from '@core/types/promptArtifact';
import { studioVideoRequestIssues } from '@core/config/studioCapabilities';

/** Only the concrete internal API model is qualified; broad manual target labels are not versions. */
export const STUDIO_MODEL_RULE_SOURCES = {
  veo: { sourceUrl: 'https://ai.google.dev/gemini-api/docs/veo', verifiedDate: '2026-10-08' },
  runway: { sourceUrl: 'https://docs.dev.runwayml.com/guides/models/', verifiedDate: '2026-10-08' },
} as const;

export function validateStudioVideo(
  input: VideoPromptArtifactInput,
  variants: VideoPromptVariant[],
): PromptValidationCheck[] {
  const api = input.target === 'veo-api';
  const issues = studioVideoRequestIssues(input);
  const checks: PromptValidationCheck[] = [
    {
      id: 'clarity',
      label: 'Clear idea',
      status: input.idea.trim() ? 'pass' : 'blocked',
      detail: input.idea.trim()
        ? 'The prompt has a concrete creative starting point.'
        : 'Add a scene or outcome before optimizing.',
      evidence: 'heuristic',
      action: { field: 'idea' },
    },
    {
      id: 'target-compatibility',
      label: 'Target compatibility',
      status: api ? (issues.length ? 'blocked' : 'pass') : 'warning',
      detail: api
        ? 'The internal Veo request uses the canonical model capabilities and request validator.'
        : 'Compatibility is unconfirmed. Select a concrete model version and verify its modes, duration and references in the destination.',
      evidence: api ? 'documented' : 'unknown',
      action: { field: 'target' },
      ...(api
        ? STUDIO_MODEL_RULE_SOURCES.veo
        : input.target === 'runway-gen3'
          ? STUDIO_MODEL_RULE_SOURCES.runway
          : {}),
    },
  ];
  for (const issue of issues) {
    checks.push({
      id: `provider-${issue.code}-${issue.field}`,
      label: 'Internal generation requirement',
      status: 'blocked',
      detail: issue.message,
      evidence: 'documented',
      action: {
        field:
          issue.field === 'prompt'
            ? 'idea'
            : issue.field === 'resolution' || issue.field === 'modelId'
              ? 'target'
              : (issue.field as keyof VideoPromptArtifactInput),
      },
      ...STUDIO_MODEL_RULE_SOURCES.veo,
    });
  }
  if (!api && input.mode !== 'text-to-video') {
    const field =
      input.mode === 'image-to-video'
        ? 'firstFrameAssetId'
        : input.mode === 'first-last-frames'
          ? input.firstFrameAssetId || input.startFrame
            ? 'lastFrameAssetId'
            : 'firstFrameAssetId'
          : input.mode === 'ingredients'
            ? 'referenceAssetIds'
            : 'extensionArtifact';
    const hasReference =
      input.mode === 'image-to-video'
        ? Boolean(input.firstFrameAssetId || input.startFrame)
        : input.mode === 'first-last-frames'
          ? Boolean(
              (input.firstFrameAssetId || input.startFrame) &&
              (input.lastFrameAssetId || input.endFrame),
            )
          : input.mode === 'ingredients'
            ? Boolean(input.referenceAssetIds?.length || input.referenceRoles)
            : Boolean(input.extensionArtifact || input.previousClip);
    checks.push({
      id: 'mode',
      label: 'Reference context',
      status: hasReference ? 'pass' : 'warning',
      detail: hasReference
        ? 'Reference context is supplied; select the actual media in the destination.'
        : 'Supply the images or source clip required by the selected mode in the destination.',
      evidence: 'heuristic',
      action: { field },
    });
  }
  variants.forEach((variant, index) => {
    const action = { field: 'variant' as const, variantIndex: index as 0 | 1 | 2 };
    checks.push({
      id: `variant-${index}-text`,
      label: 'Prompt text',
      status: variant.prompt.trim() ? 'pass' : 'blocked',
      detail: variant.prompt.trim()
        ? 'This variant contains prompt text.'
        : 'Add prompt text to this variant.',
      evidence: 'heuristic',
      action,
    });
    checks.push({
      id: `variant-${index}-single-scene`,
      label: 'One scene per clip',
      status: /\bthen\b|\bafter that\b|\bfinally\b/i.test(variant.prompt) ? 'warning' : 'pass',
      detail: 'Consider splitting chained events into separate clips for more reliable results.',
      evidence: 'heuristic',
      action,
    });
    if (input.mode === 'image-to-video')
      checks.push({
        id: `variant-${index}-motion-recipe`,
        label: 'Motion direction',
        status: /\b(motion|moves?|pan|track|orbit|dolly|animate)/i.test(variant.prompt)
          ? 'pass'
          : 'warning',
        detail:
          'Describe the movement you want from the source image; this is writing guidance, not a provider restriction.',
        evidence: 'heuristic',
        action,
      });
  });
  return checks;
}

/** Music guidance is evaluated against every current variant, including manual edits. */
export function validateStudioMusic(
  input: MusicPromptArtifactInput,
  variants: MusicPromptVariant[],
): PromptValidationCheck[] {
  return [
    {
      id: 'topic',
      label: 'Song idea',
      status: input.topic.trim() ? 'pass' : 'blocked',
      detail: input.topic.trim()
        ? 'The song has a concrete emotional or narrative seed.'
        : 'Add a song idea before generating lyrics.',
      evidence: 'heuristic',
      action: { field: 'topic' },
    },
    {
      id: 'language',
      label: 'Lyrics language',
      status: input.language.trim() ? 'pass' : 'warning',
      detail: 'Choose the language for the lyrics.',
      evidence: 'heuristic',
      action: { field: 'language' },
    },
    {
      id: 'rights',
      label: 'Rights-safe handoff',
      status:
        input.rightsChecklist?.avoidsArtistImitation === false
          ? 'blocked'
          : input.instrumental || input.rightsChecklist?.ownsOrLicensedLyrics
            ? 'pass'
            : 'warning',
      detail:
        'Confirm original or licensed lyrics and avoid real-artist imitation before publishing.',
      evidence: 'heuristic',
      action: { field: 'rightsChecklist' },
    },
    ...variants.flatMap((variant, index): PromptValidationCheck[] => [
      {
        id: `variant-${index}-lyrics`,
        label: 'Lyrics structure',
        status: !variant.lyrics.trim()
          ? 'blocked'
          : /\[[^\]]+\]/.test(variant.lyrics)
            ? 'pass'
            : 'warning',
        detail: 'Use section tags or an explicit [Instrumental] marker for arrangement control.',
        evidence: 'heuristic',
        action: { field: 'lyrics', variantIndex: index as 0 | 1 | 2 },
      },
      {
        id: `variant-${index}-style`,
        label: 'Style of Music',
        status: !variant.styleOfMusic.trim()
          ? 'blocked'
          : variant.styleOfMusic.length > 200
            ? 'warning'
            : 'pass',
        detail:
          'Keep the style concise and separate from the lyrics; 200 characters is writing guidance.',
        evidence: 'heuristic',
        action: { field: 'styleOfMusic', variantIndex: index as 0 | 1 | 2 },
      },
    ]),
  ];
}
