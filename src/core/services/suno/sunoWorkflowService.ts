import type {
  FlowVeoScenePack,
  SunoExportMode,
  SunoPack,
  SunoProductionBrief,
  SunoSettings,
  SunoToFlowVeoShot,
  SunoVideoBridgeBrief,
  ProductionRun,
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
    targetProfile: settings.targetProfile ?? 'suno-v5.5',
    songIdea: settings.topic,
    genreStack: splitTokens(settings.genre || pack.style).slice(0, 4),
    subgenre: splitTokens(pack.style)[0] ?? settings.genre,
    mood: settings.mood || 'Cinematic',
    bpm: settings.tempo || 'Auto',
    key: settings.key ?? 'Auto',
    timeSignature: settings.timeSignature ?? '4/4',
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
    mixMasterNotes:
      settings.mixNotes ??
      'Clean mix, wide stereo image, controlled low end, release-ready loudness.',
    energyCurve:
      settings.energyCurve ?? 'Measured intro, rising verse, peak chorus, resolved outro',
    sectionLengths: Object.fromEntries(
      Object.entries(sections).map(([section, text]) => [
        section,
        Math.max(8, Math.round(text.split(/\s+/).filter(Boolean).length * 0.6)),
      ]),
    ),
    vocalRange: settings.isInstrumental
      ? 'Not applicable'
      : (settings.vocalRange ?? 'Comfortable mid-range'),
    instrumentRoles: Object.fromEntries(
      splitTokens(settings.instruments || pack.style)
        .slice(0, 8)
        .map((instrument, index) => [
          instrument,
          index === 0 ? 'lead motif' : index === 1 ? 'rhythmic foundation' : 'supporting texture',
        ]),
    ),
    voiceNotes: settings.voiceNotes,
    customModelNotes: settings.customModelNotes,
    personaNotes: settings.personaNotes,
    tasteGuidance: settings.tasteGuidance,
    studioHandoff: {
      target: 'studio-1.2',
      alternates: ['instrumental alternate', 'reduced-vocal alternate'],
      warpMarkers: [],
      removeFxIntent: 'Keep a dry alternate before mastering effects.',
      requestedStems: ['vocals', 'drums', 'bass', 'music'],
      exportFormats: ['WAV', 'MIDI'],
    },
    rightsChecklist: settings.rightsChecklist ?? {
      ownsOrLicensedLyrics: false,
      hasVoiceConsent: false,
      hasTrainingReferenceRights: false,
      avoidsArtistImitation: true,
    },
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
- Energy curve: ${brief.energyCurve}
- Vocal range: ${brief.vocalRange}
- Target: ${brief.targetProfile} / ${brief.studioHandoff.target}
- Studio exports: ${brief.studioHandoff.exportFormats.join(', ')}
- Rights confirmed: lyrics=${brief.rightsChecklist.ownsOrLicensedLyrics}, voice=${brief.rightsChecklist.hasVoiceConsent}, training references=${brief.rightsChecklist.hasTrainingReferenceRights}, avoids imitation=${brief.rightsChecklist.avoidsArtistImitation}
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
  timedSections: scenePack.shotCards.reduce<SunoVideoBridgeBrief['timedSections']>(
    (sections, shot, index) => {
      const durationSeconds = shot.durationSeconds ?? 8;
      const startSeconds = sections.reduce((total, section) => total + section.durationSeconds, 0);
      sections.push({
        section:
          index === 0
            ? '[Intro]'
            : index === scenePack.shotCards.length - 1
              ? '[Outro]'
              : `[Section ${index + 1}]`,
        startSeconds,
        durationSeconds,
      });
      return sections;
    },
    [],
  ),
});

export const createSunoBriefFromProductionRun = (run: ProductionRun): SunoVideoBridgeBrief => {
  const acceptedShots = run.shots.filter((shot) => shot.status === 'accepted');
  let cursor = 0;
  const timedSections = acceptedShots.map((shot, index) => {
    const section = {
      section:
        index === 0
          ? '[Intro]'
          : index === acceptedShots.length - 1
            ? '[Outro]'
            : `[Section ${index + 1}]`,
      startSeconds: cursor,
      durationSeconds: shot.durationSeconds,
    };
    cursor += shot.durationSeconds;
    return section;
  });
  return {
    mood: run.promptSnapshot.characterMood || run.promptSnapshot.lightingStyle || 'cinematic',
    pacing: acceptedShots.length > 3 ? 'fast-cut montage' : 'measured cinematic pacing',
    bpm: acceptedShots.length > 3 ? '128 BPM' : '92 BPM',
    instruments: ['cinematic drums', 'warm bass', 'texture pads'],
    vocalStyle: 'optional understated vocal hook',
    hookIdeas: acceptedShots.map((shot) => shot.title).slice(0, 3),
    sectionStructure: timedSections.map((section) => section.section),
    avoidTags: ['real artist names', 'real voice cloning', 'copyrighted lyrics'],
    timedSections,
  };
};

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
