/**
 * Project Analysis Service Tests
 * v1.8.0 — Project Intelligence Layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { projectAnalysisService } from './projectAnalysisService';
import type { AnalysisRequest } from '@core/types/diagnostics';
import type {
  Shot,
  TimelineTrack,
  TimelineClip,
  PromptState,
  GlobalContext,
  CharacterProfile,
  LocationProfile,
} from '@core/types';
import { INITIAL_STATE } from '@core/constants';

// ─── Fixtures ────────────────────────────────────────────────────────────

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 1,
    type: 'video',
    action: 'A detective walks through a neon-lit alley',
    camera: 'tracking',
    characterId: 'char_1',
    takes: [],
    selectedTakeIndex: 0,
    visualLink: false,
    duration: 5,
    transition: { type: 'cut', duration: 0 },
    ...overrides,
  };
}

function makeClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id: 'video_1',
    resourceId: 1,
    trackId: 'video_main',
    startTime: 0,
    duration: 5,
    offset: 0,
    type: 'video',
    label: 'Shot 1',
    ...overrides,
  };
}

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
  { id: 'audio_dialogue', label: 'Dialogue', type: 'audio', trackType: 'dialogue', zIndex: 0 },
  { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
];

const DEFAULT_CHARACTERS: CharacterProfile[] = [
  {
    id: 'char_1',
    name: 'Detective John',
    attributes: { age: '35', gender: 'male', ethnicity: '', bodyType: 'athletic', skinTone: '' },
    appearance: { hair: 'dark', eyes: 'brown', distinguishingFeatures: '' },
    wardrobe: 'trenchcoat',
    visualPrompt: '',
    fixedSeed: null,
    negativePrompt: '',
  },
];

const DEFAULT_LOCATIONS: LocationProfile[] = [
  {
    id: 'loc_1',
    name: 'Neon Alley',
    description: 'Dark cyberpunk alley',
    visualTags: ['neon', 'rain'],
  },
];

function makeRequest(overrides: Partial<AnalysisRequest> = {}): AnalysisRequest {
  return {
    type: 'full',
    projectId: 'test-project',
    shots: [makeShot()],
    tracks: DEFAULT_TRACKS,
    clips: [makeClip()],
    promptState: INITIAL_STATE,
    globalContext: { style: 'Cyberpunk Noir', character: 'Detective', setting: 'Neon City' },
    characters: DEFAULT_CHARACTERS,
    locations: DEFAULT_LOCATIONS,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('projectAnalysisService', () => {
  describe('analyze()', () => {
    it('returns a complete AnalysisResult', () => {
      const result = projectAnalysisService.analyze(makeRequest());

      expect(result).toBeDefined();
      expect(result.projectId).toBe('test-project');
      expect(result.health).toBeDefined();
      expect(result.sceneConsistency).toBeDefined();
      expect(result.timelineIntegrity).toBeDefined();
      expect(result.dependencyMap).toBeDefined();
      expect(result.allIssues).toBeInstanceOf(Array);
      expect(result.analysisTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.lastAnalyzedAt).toBeGreaterThan(0);
    });

    it('computes health score between 0 and 100', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      expect(result.health.overall).toBeGreaterThanOrEqual(0);
      expect(result.health.overall).toBeLessThanOrEqual(100);
    });

    it('returns 4 health dimensions', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      expect(result.health.dimensions).toHaveLength(4);
      expect(result.health.dimensions.map((d) => d.name)).toEqual([
        'Content Completeness',
        'Prompt Quality',
        'Timeline Completeness',
        'Project Organization',
      ]);
    });
  });

  describe('Project Health Scoring', () => {
    it('scores higher with more complete shots', () => {
      const sparse = projectAnalysisService.analyze(
        makeRequest({ shots: [makeShot({ action: '' })] }),
      );
      const rich = projectAnalysisService.analyze(
        makeRequest({
          shots: [
            makeShot({ id: 1 }),
            makeShot({ id: 2 }),
            makeShot({ id: 3, action: 'Another scene in the rain' }),
          ],
        }),
      );
      expect(rich.health.overall).toBeGreaterThan(sparse.health.overall);
    });

    it('reports warnings for incomplete shots', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ action: '' }), makeShot({ id: 2, action: 'Action' })],
        }),
      );
      const incompleteIssue = result.allIssues.find((i) =>
        i.message.includes('shot(s) have no action description'),
      );
      expect(incompleteIssue).toBeDefined();
    });

    it('assigns correct tier based on score', () => {
      const minimal = projectAnalysisService.analyze(
        makeRequest({
          shots: [],
          clips: [],
          characters: [],
          locations: [],
          globalContext: { style: '', character: '', setting: '' },
        }),
      );
      expect(['Critical', 'Needs Work']).toContain(minimal.health.tier);
    });

    it('scores higher with characters and locations', () => {
      const withoutOrg = projectAnalysisService.analyze(
        makeRequest({
          characters: [],
          locations: [],
          globalContext: { style: '', character: '', setting: '' },
        }),
      );
      const withOrg = projectAnalysisService.analyze(makeRequest());
      expect(withOrg.health.overall).toBeGreaterThan(withoutOrg.health.overall);
    });
  });

  describe('Scene Consistency Validator', () => {
    it('marks valid scenes as consistent', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      expect(result.sceneConsistency.isConsistent).toBe(true);
    });

    it('detects invalid character references', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ characterId: 'nonexistent' })],
        }),
      );
      const charIssue = result.allIssues.find((i) => i.message.includes('unknown character'));
      expect(charIssue).toBeDefined();
      expect(charIssue!.severity).toBe('error');
    });

    it('detects invalid location references', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ locationId: 'nonexistent' })],
        }),
      );
      const locIssue = result.allIssues.find((i) => i.message.includes('unknown location'));
      expect(locIssue).toBeDefined();
    });

    it('warns about zero-duration shots', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ duration: 0 })],
        }),
      );
      const durIssue = result.allIssues.find((i) =>
        i.message.includes('zero or negative duration'),
      );
      expect(durIssue).toBeDefined();
      expect(durIssue!.severity).toBe('error');
    });

    it('warns about unusually long shots', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ duration: 120 })],
        }),
      );
      const longIssue = result.allIssues.find((i) => i.message.includes('unusually long duration'));
      expect(longIssue).toBeDefined();
      expect(longIssue!.severity).toBe('warning');
    });

    it('calculates style drift for empty action shots', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ action: '' })],
        }),
      );
      expect(result.sceneConsistency.shotResults[0].styleDrift).toBe(1.0);
    });

    it('calculates low style drift for descriptive action shots', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ action: 'A detective slowly walks down a dimly lit corridor' })],
        }),
      );
      expect(result.sceneConsistency.shotResults[0].styleDrift).toBe(0.0);
    });
  });

  describe('Timeline Integrity Checker', () => {
    it('validates a clean timeline', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ id: 1 }), makeShot({ id: 2 })],
          clips: [
            makeClip({ id: 'v1', resourceId: 1, startTime: 0, duration: 5 }),
            makeClip({ id: 'v2', resourceId: 2, startTime: 5, duration: 5 }),
          ],
        }),
      );
      expect(result.timelineIntegrity.isValid).toBe(true);
      expect(result.timelineIntegrity.overlaps).toHaveLength(0);
    });

    it('detects timeline gaps', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          clips: [
            makeClip({ id: 'v1', startTime: 0, duration: 5 }),
            makeClip({ id: 'v2', resourceId: 2, startTime: 10, duration: 5 }),
          ],
          shots: [makeShot({ id: 1 }), makeShot({ id: 2 })],
        }),
      );
      expect(result.timelineIntegrity.gaps.length).toBeGreaterThan(0);
      expect(result.timelineIntegrity.gaps[0].duration).toBeCloseTo(5);
    });

    it('detects timeline overlaps', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          clips: [
            makeClip({ id: 'v1', startTime: 0, duration: 8 }),
            makeClip({ id: 'v2', resourceId: 2, startTime: 5, duration: 5 }),
          ],
          shots: [makeShot({ id: 1 }), makeShot({ id: 2 })],
        }),
      );
      expect(result.timelineIntegrity.overlaps.length).toBeGreaterThan(0);
    });

    it('identifies orphan clips', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ id: 1 })],
          clips: [
            makeClip({ id: 'v1', resourceId: 1 }),
            makeClip({ id: 'v_orphan', resourceId: 999, startTime: 10, duration: 5 }),
          ],
        }),
      );
      expect(result.timelineIntegrity.orphanClips).toContain('v_orphan');
    });

    it('identifies unlinked shots', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [makeShot({ id: 1 }), makeShot({ id: 2, action: 'Scene without clip' })],
          clips: [makeClip({ id: 'v1', resourceId: 1 })],
        }),
      );
      expect(result.timelineIntegrity.unlinkedShots).toContain(2);
    });
  });

  describe('Dependency Map Builder', () => {
    it('creates nodes for project, shots, characters, locations, clips', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      const map = result.dependencyMap;

      expect(map.nodes.find((n) => n.type === 'project')).toBeDefined();
      expect(map.nodes.find((n) => n.type === 'shot')).toBeDefined();
      expect(map.nodes.find((n) => n.type === 'character')).toBeDefined();
      expect(map.nodes.find((n) => n.type === 'location')).toBeDefined();
      expect(map.nodes.find((n) => n.type === 'clip')).toBeDefined();
    });

    it('creates edges between shots and characters', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      const charEdge = result.dependencyMap.edges.find(
        (e) => e.from === 'shot_1' && e.to === 'char_char_1',
      );
      expect(charEdge).toBeDefined();
      expect(charEdge!.relationship).toBe('references');
    });

    it('creates edges between clips and shots', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      const clipEdge = result.dependencyMap.edges.find(
        (e) => e.from === 'clip_video_1' && e.to === 'shot_1',
      );
      expect(clipEdge).toBeDefined();
      expect(clipEdge!.relationship).toBe('depends-on');
    });

    it('identifies isolated nodes', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [],
          clips: [],
          // Characters exist but nothing references them
        }),
      );
      // Characters are still connected to project via 'contains'
      // No isolated nodes expected since characters connect to project
      expect(result.dependencyMap.isolatedNodes).toHaveLength(0);
    });

    it('assigns weights based on connections', () => {
      const result = projectAnalysisService.analyze(makeRequest());
      const projectNode = result.dependencyMap.nodes.find((n) => n.type === 'project');
      expect(projectNode!.weight).toBeGreaterThan(0);
    });
  });

  describe('quickHealthCheck()', () => {
    it('returns a health score without full analysis', () => {
      const health = projectAnalysisService.quickHealthCheck(makeRequest());
      expect(health.overall).toBeGreaterThanOrEqual(0);
      expect(health.overall).toBeLessThanOrEqual(100);
      expect(health.tier).toBeDefined();
      expect(health.dimensions).toHaveLength(4);
    });
  });

  describe('Issue sorting', () => {
    it('sorts errors before warnings before info before hints', () => {
      const result = projectAnalysisService.analyze(
        makeRequest({
          shots: [
            makeShot({ id: 1, characterId: 'nonexistent', duration: 0 }),
            makeShot({ id: 2, action: '', duration: 120 }),
          ],
        }),
      );

      if (result.allIssues.length >= 2) {
        const severityOrder = ['error', 'warning', 'info', 'hint'];
        for (let i = 1; i < result.allIssues.length; i++) {
          const prevIdx = severityOrder.indexOf(result.allIssues[i - 1].severity);
          const currIdx = severityOrder.indexOf(result.allIssues[i].severity);
          expect(prevIdx).toBeLessThanOrEqual(currIdx);
        }
      }
    });
  });
});
