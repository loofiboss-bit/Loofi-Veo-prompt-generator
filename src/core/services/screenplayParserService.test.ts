import { describe, it, expect } from 'vitest';
import { parseScreenplayText, convertScreenplayToShots } from './screenplayParserService';

const SAMPLE_FOUNTAIN = `
EXT. NEO TOKYO ROOFTOP - NIGHT

Rain lashes against the illuminated neon signage. KAI stands by the ledge, watching the flying traffic.

KAI
(whispering)
They found the frequency.

SFX: Distant police sirens echo below.

EXT. METROPOLIS HIGHWAY - CONTINUOUS

An unmarked black interceptor speeds through the tunnel.
`;

describe('screenplayParserService', () => {
  it('parses scenes, characters, locations, and dialogue correctly', () => {
    const doc = parseScreenplayText(SAMPLE_FOUNTAIN, 'fountain');

    expect(doc.scenes.length).toBe(2);
    expect(doc.extractedCharacters).toContain('KAI');
    expect(doc.extractedLocations).toContain('NEO TOKYO ROOFTOP');
    expect(doc.extractedLocations).toContain('METROPOLIS HIGHWAY');

    const firstScene = doc.scenes[0];
    expect(firstScene.setting).toBe('EXT');
    expect(firstScene.timeOfDay).toBe('NIGHT');
    expect(firstScene.dialogueBlocks.length).toBe(1);
    expect(firstScene.dialogueBlocks[0].character).toBe('KAI');
    expect(firstScene.dialogueBlocks[0].parenthetical).toBe('whispering');
    expect(firstScene.dialogueBlocks[0].text).toBe('They found the frequency.');
    expect(firstScene.foleyCues.length).toBe(1);
  });

  it('converts screenplay to storyboard shots with director style', () => {
    const doc = parseScreenplayText(SAMPLE_FOUNTAIN, 'fountain');
    const shots = convertScreenplayToShots(doc, 'atmospheric-scifi');

    expect(shots.length).toBeGreaterThanOrEqual(2);
    expect(shots[0].camera).toContain('wide panoramic master');
    expect(shots[0].lighting).toContain('volumetric fog');
    expect(shots[1].dialogue).toBe('They found the frequency.');
  });
});
