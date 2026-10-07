import { describe, expect, it } from 'vitest';
import {
  buildProjectDocument,
  createEmptyProjectDocument,
  createDefaultProjectComposerState,
} from './editorSessionAdapters';
import { createPromptStudioDraft } from '@core/services/promptStudioDraftService';

describe('project document adapters', () => {
  it('preserves draft and unknown extension fields when rebuilding a document', () => {
    const base = createEmptyProjectDocument({ id: 'a', name: 'A' });
    base.studioDraft = createPromptStudioDraft('a');
    base.studioDraft.video.idea = 'Keep draft';
    base.futureExtension = { nested: 'Keep extension' };
    const composer = createDefaultProjectComposerState();
    composer.gridSize = 36;
    const rebuilt = buildProjectDocument({
      ...base,
      name: 'Updated A',
      composer,
      baseDocument: base,
    });
    expect(rebuilt.studioDraft?.video.idea).toBe('Keep draft');
    expect(rebuilt.futureExtension).toEqual({ nested: 'Keep extension' });
    expect(rebuilt.composer?.gridSize).toBe(36);
    expect(rebuilt.name).toBe('Updated A');
  });
});
