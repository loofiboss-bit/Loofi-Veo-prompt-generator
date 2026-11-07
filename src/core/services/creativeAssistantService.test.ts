import { describe, expect, it, vi, beforeEach } from 'vitest';
import { creativeAssistantService } from './creativeAssistantService';

vi.mock('./gemini/aiClient', () => ({
  cleanJson: vi.fn((str: string) => str),
  getAiClientAsync: vi.fn().mockResolvedValue(null), // Test heuristic fallback by default
  getPromptModel: vi.fn(() => 'gemini-3.5-flash'),
  resilientCall: vi.fn(),
}));

describe('creativeAssistantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates heuristic suggestions covering camera, lighting and iteration instructions offline', async () => {
    const suggestions = await creativeAssistantService.generateSuggestions({
      idea: 'A detective walking down a misty alley',
      currentPrompt: 'A detective in a trenchcoat stands in an alleyway.',
    });

    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    const categories = suggestions.map((s) => s.category);
    expect(categories).toContain('camera');
    expect(categories).toContain('lighting');
    expect(categories).toContain('iteration-prompt');

    for (const sug of suggestions) {
      expect(sug.title).toBeTruthy();
      expect(sug.description).toBeTruthy();
      expect(sug.suggestedInstruction).toBeTruthy();
    }
  });

  it('detects conceptual deviations when the prompt misses essential idea constraints', async () => {
    const suggestions = await creativeAssistantService.generateSuggestions({
      idea: 'En man som springer i kraftigt regn under natten',
      currentPrompt: 'En man som springer längs en solig strandväg.',
    });

    const dev = suggestions.find((s) => s.category === 'deviation');
    expect(dev).toBeDefined();
    expect(dev?.title).toContain('avvikelse');
    expect(dev?.suggestedInstruction).toContain('nattmiljö');
  });

  it('provides refined camera advice when movement is already present in prompt', async () => {
    const suggestions = await creativeAssistantService.generateSuggestions({
      idea: 'A sports car chase',
      currentPrompt: 'A red sports car accelerates with a fast tracking camera and wide angle.',
    });

    const cam = suggestions.find((s) => s.category === 'camera');
    expect(cam).toBeDefined();
    expect(cam?.title).toContain('skärpedjup');
  });

  it('supports English heuristic suggestions and Storyboard continuity checks', () => {
    const suggestions = creativeAssistantService.generateHeuristicSuggestions({
      idea: 'Night rain chase',
      currentPrompt: 'A runner sprinting through a sunny street.',
      neighboringShotSummary: 'Shot 1: Neon rooftop overview at dusk',
      language: 'en',
    });

    expect(suggestions.some((s) => s.title.includes('Add dynamic camera movement'))).toBe(true);
    expect(suggestions.some((s) => s.title.includes('Storyboard continuity alignment'))).toBe(true);
    expect(suggestions.some((s) => s.category === 'deviation')).toBe(true);
  });
});
