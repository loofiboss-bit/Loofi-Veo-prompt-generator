import { describe, expect, it } from 'vitest';
import { CREATOR_RECIPES } from '@core/config/creatorRecipes';
import { buildRecipeDraft } from './creatorRecipeService';

describe('creator recipes', () => {
  it('provides twelve stable recipes and three offline examples', () => {
    expect(CREATOR_RECIPES).toHaveLength(12);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.category === 'social')).toHaveLength(6);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.category === 'story')).toHaveLength(3);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.category === 'music')).toHaveLength(3);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.exampleId)).toHaveLength(3);
    expect(new Set(CREATOR_RECIPES.map((recipe) => recipe.id)).size).toBe(12);
    for (const recipe of CREATOR_RECIPES) {
      expect(recipe.sceneCount).toBeGreaterThanOrEqual(3);
      expect(recipe.sceneCount).toBeLessThanOrEqual(6);
      expect(recipe.sceneIdeas).toHaveLength(recipe.sceneCount);
    }
  });
  it('builds editable project-owned local video artifacts without provider execution', () => {
    const draft = buildRecipeDraft(CREATOR_RECIPES[0], 'Show a coffee ritual', 'project-one');
    expect(draft.projectId).toBe('project-one');
    expect(draft.video.idea).toBe('Show a coffee ritual');
    expect(draft.artifact?.provenance.provider).toBe('local');
    expect(draft.artifact?.kind).toBe('video');
  });
  it('keeps music recipes on the existing local music compiler', () => {
    const draft = buildRecipeDraft(CREATOR_RECIPES[9], 'A quiet dawn', 'music-project');
    expect(draft.mode).toBe('music');
    expect(draft.music.topic).toBe('A quiet dawn');
    expect(draft.artifact?.kind).toBe('music');
    expect(draft.artifact?.provenance.provider).toBe('local');
  });
});
