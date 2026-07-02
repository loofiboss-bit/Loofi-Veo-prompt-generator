import type {
  FlowVeoScenePack,
  SunoExportMode,
  SunoPack,
  SunoProductionBrief,
  SunoSettings,
  SunoToFlowVeoShot,
  SunoVideoBridgeBrief,
} from '@core/types';

const COMMERCIAL_WARNING =
  'Use descriptive style terms instead of naming real artists, real voices, or copyrighted lyrics.';

const splitTokens = (value: string): string[] =>
  value
    .split(/[,/]/)
    .map((token) => token.trim())
    .filter(Boolean);

const parseSections = (lyrics: string): Record<string, string> => {
  const sections: Record<string, string> = {};
  const matches = lyrics.matchAll(/\[([^\]]+)\]([\s\S]*?)(?=\n\[[^\]]+\]|$)/g);

  for (const match of matches) {
    sections[match[1].toLowerCase()] = match[2].trim();
  }

  return sections;
};

export const buildSunoProductionBrief = (
  settings: SunoSettings,
  pack: SunoPack,
): SunoProductionBrief => {
  const sections = parseSections(pack.lyrics);

  return {
    songIdea: settings.topic,
    genreStack: splitTokens(settings.genre || pack.style).slice(0, 4),
    subgenre: splitTokens(pack.style)[0] ?? settings.genre,
    mood: settings.mood || 'Cinematic',
    bpm: settings.tempo || 'Auto',
    key: 'Auto',
    timeSignature: '4/4',
    vocalStyle: settings.isInstrumental ? 'Instrumental' : settings.voice,
    vocalTexture: settings.isInstrumental ? 'No vocal' : 'Clear, expressive, human-readable',
    language: settings.language,
    lyrics: pack.lyrics,
    sections: {
      intro: sections.intro ?? '',
      verse: sections.verse ?? sections['verse 1'] ?? '',
      preChorus: sections['pre-chorus'] ?? '',
      chorus: sections.chorus ?? sections.hook ?? '',
      bridge: sections.bridge ?? '',
      dropBreakdown: sections.drop ?? sections.breakdown ?? '',
      outro: sections.outro ?? '',
    },
    instrumentation: settings.instruments || splitTokens(pack.style).slice(0, 3).join(', '),
    productionStyle: pack.style,
    mixMasterNotes: 'Clean mix, wide stereo image, controlled low end, release-ready loudness.',
    avoidTags: ['real artist names', 'real voice cloning', 'copyrighted lyrics'],
    commercialUseWarning: COMMERCIAL_WARNING,
  };
};

export const exportSunoPack = (
  settings: SunoSettings,
  pack: SunoPack,
  mode: SunoExportMode,
): string => {
  const brief = buildSunoProductionBrief(settings, pack);

  switch (mode) {
    case 'simple-prompt':
      return `${pack.title}: ${settings.topic}. ${pack.style}`;
    case 'custom-mode-prompt':
      return [`Style of Music:\n${pack.style}`, `Lyrics:\n${pack.lyrics}`, COMMERCIAL_WARNING].join(
        '\n\n',
      );
    case 'lyrics-only':
      return pack.lyrics;
    case 'style-tags-only':
      return pack.style;
    case 'json':
      return JSON.stringify(brief, null, 2);
    case 'full-production-brief':
    default:
      return `# ${pack.title}

## Style Tags
${pack.style}

## Lyrics
${pack.lyrics}

## Production Brief
- Idea: ${brief.songIdea}
- Mood: ${brief.mood}
- BPM: ${brief.bpm}
- Key: ${brief.key}
- Time signature: ${brief.timeSignature}
- Vocal: ${brief.vocalStyle} (${brief.vocalTexture})
- Instrumentation: ${brief.instrumentation}
- Mix/master: ${brief.mixMasterNotes}
- Avoid: ${brief.avoidTags.join(', ')}

${brief.commercialUseWarning}`;
  }
};

export const createSunoBriefFromFlowVeo = (scenePack: FlowVeoScenePack): SunoVideoBridgeBrief => ({
  mood: scenePack.styleBible || 'cinematic',
  pacing: scenePack.shotCards.length > 3 ? 'fast-cut montage' : 'measured cinematic pacing',
  bpm: scenePack.shotCards.length > 3 ? '128 BPM' : '92 BPM',
  instruments: ['cinematic drums', 'warm bass', 'texture pads'],
  vocalStyle: 'optional understated vocal hook',
  hookIdeas: scenePack.shotCards.map((shot) => shot.title).slice(0, 3),
  sectionStructure: ['[Intro]', '[Verse]', '[Chorus]', '[Bridge]', '[Outro]'],
  avoidTags: ['real artist names', 'real voice cloning', 'copyrighted lyrics'],
});

export const createFlowVeoShotsFromLyrics = (
  lyrics: string,
  aspectRatio: string = '16:9',
): SunoToFlowVeoShot[] => {
  const sections = parseSections(lyrics);
  const entries = Object.entries(sections);
  const source = entries.length ? entries : [['chorus', lyrics]];

  return source.map(([section, text], index) => ({
    section,
    visuals: text.trim().slice(0, 180) || `Visual motif for ${section}`,
    cameraMovement: index % 2 === 0 ? 'slow push-in' : 'lateral tracking shot',
    editRhythm: /chorus|hook|drop/i.test(section) ? 'cut on downbeats' : 'hold longer phrases',
    aspectRatio,
    transition: index === 0 ? 'fade in' : 'match cut from previous section',
  }));
};
