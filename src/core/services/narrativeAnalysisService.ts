import type { NarrativeIssue, NarrativeIssueType, NarrativeIssueSeverity } from '@core/types';

interface SceneData {
  id: string;
  promptText: string;
  orderIndex: number;
}

class NarrativeAnalysisService {
  private static instance: NarrativeAnalysisService;

  static getInstance(): NarrativeAnalysisService {
    if (!NarrativeAnalysisService.instance) {
      NarrativeAnalysisService.instance = new NarrativeAnalysisService();
    }
    return NarrativeAnalysisService.instance;
  }

  /**
   * Analyze a sequence of scenes for narrative coherence issues.
   * RAI-ADR-001 §4: Max severity is 'warning', use suggestive language.
   */
  analyzeSequence(scenes: SceneData[]): NarrativeIssue[] {
    if (scenes.length < 2) return [];

    const issues: NarrativeIssue[] = [];
    let idCounter = 0;

    const makeIssue = (
      type: NarrativeIssueType,
      sceneIds: string[],
      severity: NarrativeIssueSeverity,
      suggestion: string,
      fixAction?: string,
    ): NarrativeIssue => ({
      id: `narrative-${idCounter++}`,
      type,
      sceneIds,
      severity,
      suggestion,
      fixAction,
    });

    // Check for missing transitions between adjacent scenes
    for (let i = 0; i < scenes.length - 1; i++) {
      const current = scenes[i];
      const next = scenes[i + 1];

      if (this.hasAbruptSceneChange(current.promptText, next.promptText)) {
        issues.push(
          makeIssue(
            'missing-transition',
            [current.id, next.id],
            'warning',
            `Consider adding a transition between scenes ${i + 1} and ${i + 2} to improve visual flow`,
            'Add a transitional scene or include transition keywords',
          ),
        );
      }
    }

    // Check for pacing issues (very similar consecutive scenes)
    for (let i = 0; i < scenes.length - 1; i++) {
      const similarity = this.textSimilarity(scenes[i].promptText, scenes[i + 1].promptText);
      if (similarity > 0.7) {
        issues.push(
          makeIssue(
            'pacing',
            [scenes[i].id, scenes[i + 1].id],
            'info',
            `Scenes ${i + 1} and ${i + 2} are quite similar — consider varying content for better pacing`,
          ),
        );
      }
    }

    // Check for duplicate themes across all scenes
    const themeGroups = this.findDuplicateThemes(scenes);
    for (const group of themeGroups) {
      if (group.sceneIds.length >= 3) {
        issues.push(
          makeIssue(
            'duplicate-theme',
            group.sceneIds,
            'info',
            `The theme "${group.theme}" appears across ${group.sceneIds.length} scenes — consider varying themes for diversity`,
          ),
        );
      }
    }

    // Check for character jumps (character mentioned then absent then mentioned again)
    const characterIssues = this.detectCharacterJumps(scenes);
    for (const issue of characterIssues) {
      issues.push(makeIssue('character-jump', issue.sceneIds, 'warning', issue.suggestion));
    }

    return issues;
  }

  private hasAbruptSceneChange(current: string, next: string): boolean {
    const transitionKeywords = [
      'transition',
      'dissolve',
      'fade',
      'cut to',
      'meanwhile',
      'later',
      'next',
      'then',
      'cross-fade',
      'wipe',
    ];
    const nextLower = next.toLowerCase();
    const hasTransition = transitionKeywords.some((kw) => nextLower.includes(kw));
    if (hasTransition) return false;

    // Check if scenes share any significant words (indicating continuity)
    const sharedWords = this.getSharedSignificantWords(current, next);
    return sharedWords.length < 2;
  }

  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(
      a
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const wordsB = new Set(
      b
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    return intersection / Math.max(wordsA.size, wordsB.size);
  }

  private getSharedSignificantWords(a: string, b: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
    ]);
    const wordsA = new Set(
      a
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w)),
    );
    const wordsB = new Set(
      b
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w)),
    );

    const shared: string[] = [];
    for (const word of wordsA) {
      if (wordsB.has(word)) shared.push(word);
    }
    return shared;
  }

  private findDuplicateThemes(scenes: SceneData[]): Array<{ theme: string; sceneIds: string[] }> {
    const themeMap = new Map<string, string[]>();
    const themeKeywords = [
      'sunset',
      'sunrise',
      'night',
      'day',
      'rain',
      'snow',
      'forest',
      'ocean',
      'city',
      'desert',
      'mountain',
      'space',
      'underwater',
      'war',
      'love',
      'chase',
      'dance',
      'fight',
      'explore',
    ];

    for (const scene of scenes) {
      const lower = scene.promptText.toLowerCase();
      for (const theme of themeKeywords) {
        if (lower.includes(theme)) {
          const existing = themeMap.get(theme) ?? [];
          existing.push(scene.id);
          themeMap.set(theme, existing);
        }
      }
    }

    return Array.from(themeMap.entries())
      .filter(([, ids]) => ids.length >= 3)
      .map(([theme, sceneIds]) => ({ theme, sceneIds }));
  }

  private detectCharacterJumps(
    scenes: SceneData[],
  ): Array<{ sceneIds: string[]; suggestion: string }> {
    // Extract character-like words (capitalized words that appear multiple times)
    const characterMap = new Map<string, number[]>();

    for (let i = 0; i < scenes.length; i++) {
      const words = scenes[i].promptText.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
      const uniqueWords = new Set(words);
      for (const word of uniqueWords) {
        const indices = characterMap.get(word) ?? [];
        indices.push(i);
        characterMap.set(word, indices);
      }
    }

    const issues: Array<{ sceneIds: string[]; suggestion: string }> = [];

    for (const [character, indices] of characterMap) {
      if (indices.length < 2) continue;
      // Check for gaps of 2+ scenes
      for (let i = 0; i < indices.length - 1; i++) {
        const gap = indices[i + 1] - indices[i];
        if (gap > 2) {
          issues.push({
            sceneIds: [scenes[indices[i]].id, scenes[indices[i + 1]].id],
            suggestion: `"${character}" appears in scenes ${indices[i] + 1} and ${indices[i + 1] + 1} with ${gap - 1} scenes in between — consider maintaining character continuity`,
          });
        }
      }
    }

    return issues;
  }
}

export const narrativeAnalysisService = NarrativeAnalysisService.getInstance();
