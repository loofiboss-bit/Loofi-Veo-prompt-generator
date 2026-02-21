import { describe, it, expect } from 'vitest';
import { generateFCPXML } from './xmlExport';
import type { Shot, CharacterProfile } from '@core/types';

const makeShot = (overrides: Partial<Shot> = {}): Shot =>
  ({
    id: 1,
    type: 'video' as const,
    action: 'A dramatic zoom on the subject',
    camera: 'Close-up',
    characterId: 'char-1',
    generatedVideoUrl: 'blob:http://example.com/1',
    takes: [],
    selectedTakeIndex: 0,
    visualLink: false,
    duration: 5,
    transition: { type: 'cut', duration: 0 },
    ...overrides,
  }) as Shot;

const makeCharacter = (overrides: Partial<CharacterProfile> = {}): CharacterProfile =>
  ({
    id: 'char-1',
    name: 'John',
    attributes: { age: '30', gender: 'male', ethnicity: '', bodyType: '', skinTone: '' },
    appearance: {},
    ...overrides,
  }) as CharacterProfile;

describe('generateFCPXML', () => {
  it('should produce valid FCPXML header', () => {
    const xml = generateFCPXML([], []);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<!DOCTYPE fcpxml>');
    expect(xml).toContain('<fcpxml version="1.10">');
  });

  it('should use default project title', () => {
    const xml = generateFCPXML([], []);
    expect(xml).toContain('name="Veo_Timeline"');
  });

  it('should use custom project title', () => {
    const xml = generateFCPXML([], [], 'My Film');
    expect(xml).toContain('name="My Film"');
  });

  it('should use default 24 fps format', () => {
    const xml = generateFCPXML([], [], 'Test', 24);
    expect(xml).toContain('FFVideoFormat1080p24');
  });

  it('should skip shots without generatedVideoUrl', () => {
    const shots = [makeShot({ generatedVideoUrl: undefined })];
    const xml = generateFCPXML(shots, []);
    expect(xml).not.toContain('<asset-clip');
  });

  it('should generate asset resources for valid shots', () => {
    const shots = [makeShot()];
    const xml = generateFCPXML(shots, [makeCharacter()]);
    expect(xml).toContain('<asset id="r1"');
    expect(xml).toContain('clip_001.mp4');
  });

  it('should generate spine clips for valid shots', () => {
    const shots = [makeShot()];
    const xml = generateFCPXML(shots, [makeCharacter()]);
    expect(xml).toContain('<asset-clip name="Shot 1"');
    expect(xml).toContain('ref="r1"');
  });

  it('should resolve character names from character bank', () => {
    const shots = [makeShot({ characterId: 'char-1' })];
    const characters = [makeCharacter({ id: 'char-1', name: 'Alice' })];
    const xml = generateFCPXML(shots, characters);
    expect(xml).toContain('value="Alice"');
  });

  it('should use "Unknown Actor" for unresolved characters', () => {
    const shots = [makeShot({ characterId: 'nonexistent' })];
    const xml = generateFCPXML(shots, []);
    expect(xml).toContain('value="Unknown Actor"');
  });

  it('should add action text as note', () => {
    const shots = [makeShot({ action: 'Walking through door' })];
    const xml = generateFCPXML(shots, []);
    expect(xml).toContain('<note>Walking through door</note>');
  });

  it('should sanitize XML special characters in action', () => {
    const shots = [makeShot({ action: 'A <bold> & "quoted" shot' })];
    const xml = generateFCPXML(shots, []);
    expect(xml).not.toContain('<bold>');
    expect(xml).not.toContain('&');
  });

  it('should handle multiple shots with sequential offsets', () => {
    const shots = [makeShot({ id: 1, duration: 5 }), makeShot({ id: 2, duration: 3 })];
    const xml = generateFCPXML(shots, []);
    expect(xml).toContain('Shot 1');
    expect(xml).toContain('Shot 2');
    expect(xml).toContain('offset="0/2400s"');
  });

  it('should use default duration of 5 for shots without duration', () => {
    const shots = [makeShot({ duration: undefined as unknown as number })];
    const xml = generateFCPXML(shots, []);
    // 5 * 24 = 120 frames * 100 = 12000
    expect(xml).toContain('12000/2400s');
  });

  it('should produce correct frame duration for non-default fps', () => {
    const xml = generateFCPXML([], [], 'Test', 30);
    expect(xml).toContain('FFVideoFormat1080p30');
    expect(xml).toContain('frameDuration="100/3000s"');
  });
});
