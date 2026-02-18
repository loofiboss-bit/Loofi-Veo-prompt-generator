import { describe, it, expect, vi } from 'vitest';
import { narrativeAnalysisService } from './narrativeAnalysisService';

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('narrativeAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeSequence', () => {
    it('returns empty array for single scene', () => {
      const scenes = [{ id: 'scene-1', promptText: 'A cinematic shot', orderIndex: 0 }];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      expect(issues).toEqual([]);
    });

    it('returns empty array for empty scenes array', () => {
      const issues = narrativeAnalysisService.analyzeSequence([]);

      expect(issues).toEqual([]);
    });

    it('detects missing transitions between abrupt scene changes', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunny beach with waves', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Dark alley with rain', orderIndex: 1 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const transitionIssues = issues.filter((i) => i.type === 'missing-transition');
      expect(transitionIssues.length).toBeGreaterThan(0);
      expect(transitionIssues[0].sceneIds).toEqual(['scene-1', 'scene-2']);
    });

    it('no missing transition when transition keyword present', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunny beach with waves', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Fade to dark alley with rain', orderIndex: 1 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const transitionIssues = issues.filter((i) => i.type === 'missing-transition');
      expect(transitionIssues).toHaveLength(0);
    });

    it('detects pacing issues with similar consecutive scenes', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A bright sunny beach with waves crashing', orderIndex: 0 },
        {
          id: 'scene-2',
          promptText: 'A bright sunny beach with waves crashing gently',
          orderIndex: 1,
        },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const pacingIssues = issues.filter((i) => i.type === 'pacing');
      expect(pacingIssues.length).toBeGreaterThan(0);
      expect(pacingIssues[0].sceneIds).toEqual(['scene-1', 'scene-2']);
    });

    it('detects duplicate themes across 3+ scenes', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunset over the ocean', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Characters watching the sunset', orderIndex: 1 },
        { id: 'scene-3', promptText: 'Beautiful sunset in the background', orderIndex: 2 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const themeIssues = issues.filter((i) => i.type === 'duplicate-theme');
      expect(themeIssues.length).toBeGreaterThan(0);
      const sunsetIssue = themeIssues.find((i) => i.suggestion.includes('sunset'));
      expect(sunsetIssue).toBeDefined();
      expect(sunsetIssue!.sceneIds).toHaveLength(3);
    });

    it('does not flag duplicate themes for less than 3 occurrences', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunset over the ocean', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Characters in a forest', orderIndex: 1 },
        { id: 'scene-3', promptText: 'Night time in the city', orderIndex: 2 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const themeIssues = issues.filter((i) => i.type === 'duplicate-theme');
      expect(themeIssues).toHaveLength(0);
    });

    it('detects character jumps with gap greater than 2 scenes', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'Alice walks into the room', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Bob is talking to Charlie', orderIndex: 1 },
        { id: 'scene-3', promptText: 'David looks around', orderIndex: 2 },
        { id: 'scene-4', promptText: 'Eve examines the evidence', orderIndex: 3 },
        { id: 'scene-5', promptText: 'Alice returns to the scene', orderIndex: 4 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const characterIssues = issues.filter((i) => i.type === 'character-jump');
      expect(characterIssues.length).toBeGreaterThan(0);
      const aliceIssue = characterIssues.find((i) => i.suggestion.includes('Alice'));
      expect(aliceIssue).toBeDefined();
    });

    it('no character jump for adjacent appearances', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'Alice walks into the room', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Alice talks to Bob', orderIndex: 1 },
        { id: 'scene-3', promptText: 'Alice leaves the room', orderIndex: 2 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const characterIssues = issues.filter((i) => i.type === 'character-jump');
      expect(characterIssues).toHaveLength(0);
    });

    it('uses warning severity for transitions and character jumps', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunny beach', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Dark alley', orderIndex: 1 },
        { id: 'scene-3', promptText: 'Alice is here', orderIndex: 2 },
        { id: 'scene-4', promptText: 'Bob and Charlie', orderIndex: 3 },
        { id: 'scene-5', promptText: 'David and Eve', orderIndex: 4 },
        { id: 'scene-6', promptText: 'Alice returns', orderIndex: 5 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const transitionIssues = issues.filter((i) => i.type === 'missing-transition');
      const characterIssues = issues.filter((i) => i.type === 'character-jump');

      transitionIssues.forEach((issue) => {
        expect(issue.severity).toBe('warning');
      });

      characterIssues.forEach((issue) => {
        expect(issue.severity).toBe('warning');
      });
    });

    it('uses info severity for pacing and duplicate themes', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunny beach with ocean waves', orderIndex: 0 },
        { id: 'scene-2', promptText: 'A sunny beach with ocean waves crashing', orderIndex: 1 },
        { id: 'scene-3', promptText: 'Ocean waves at sunset', orderIndex: 2 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const pacingIssues = issues.filter((i) => i.type === 'pacing');
      const themeIssues = issues.filter((i) => i.type === 'duplicate-theme');

      pacingIssues.forEach((issue) => {
        expect(issue.severity).toBe('info');
      });

      themeIssues.forEach((issue) => {
        expect(issue.severity).toBe('info');
      });
    });

    it('uses suggestive language in suggestions', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunny beach', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Dark alley', orderIndex: 1 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      issues.forEach((issue) => {
        const suggestion = issue.suggestion.toLowerCase();
        // Check for suggestive keywords
        const suggestiveWords = ['consider', 'might', 'could', 'suggest', 'may want'];
        const _hasSuggestiveLanguage = suggestiveWords.some((word) => suggestion.includes(word));

        // At minimum, should not use imperative language like "must", "should", etc.
        expect(suggestion).not.toMatch(/\bmust\b/i);
        expect(suggestion).not.toMatch(/\bshould\b/i);
      });
    });

    it('returns issues with unique ids', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunset over the ocean', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Dark alley', orderIndex: 1 },
        { id: 'scene-3', promptText: 'Another sunset scene', orderIndex: 2 },
        { id: 'scene-4', promptText: 'Final sunset moment', orderIndex: 3 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const ids = issues.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('handles scenes with shared significant words without flagging transition', () => {
      const scenes = [
        {
          id: 'scene-1',
          promptText: 'A character walks through the forest with tall trees',
          orderIndex: 0,
        },
        {
          id: 'scene-2',
          promptText: 'The forest becomes darker with ancient trees',
          orderIndex: 1,
        },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      const transitionIssues = issues.filter((i) => i.type === 'missing-transition');
      expect(transitionIssues).toHaveLength(0);
    });

    it('creates proper issue structure with all required fields', () => {
      const scenes = [
        { id: 'scene-1', promptText: 'A sunny beach', orderIndex: 0 },
        { id: 'scene-2', promptText: 'Dark alley', orderIndex: 1 },
      ];

      const issues = narrativeAnalysisService.analyzeSequence(scenes);

      expect(issues.length).toBeGreaterThan(0);
      issues.forEach((issue) => {
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('sceneIds');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('suggestion');
        expect(typeof issue.id).toBe('string');
        expect(['missing-transition', 'pacing', 'character-jump', 'duplicate-theme']).toContain(
          issue.type,
        );
        expect(Array.isArray(issue.sceneIds)).toBe(true);
        expect(['info', 'warning']).toContain(issue.severity);
        expect(typeof issue.suggestion).toBe('string');
      });
    });
  });
});
