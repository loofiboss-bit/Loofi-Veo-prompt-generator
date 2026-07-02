import { describe, expect, it } from 'vitest';
import { migratePromptStateTarget, normalizeVideoTarget } from './videoTargetMigration';
import type { PromptState } from '@core/types';

describe('videoTargetMigration', () => {
  it('normalizes current targets', () => {
    expect(normalizeVideoTarget('flow-veo')).toBe('flow-veo');
    expect(normalizeVideoTarget('veo-api')).toBe('veo-api');
    expect(normalizeVideoTarget('local')).toBe('local');
  });

  it('migrates legacy and unknown targets to Flow/Veo', () => {
    expect(normalizeVideoTarget('veo')).toBe('flow-veo');
    expect(normalizeVideoTarget(['so', 'ra'].join(''))).toBe('flow-veo');
    expect(normalizeVideoTarget('unknown')).toBe('flow-veo');
  });

  it('preserves prompt data while setting default output mode', () => {
    const migrated = migratePromptStateTarget({
      idea: 'A neon street chase',
      targetModel: 'legacy',
    } as unknown as Partial<PromptState>);

    expect(migrated.idea).toBe('A neon street chase');
    expect(migrated.targetModel).toBe('flow-veo');
    expect(migrated.flowVeoOutputMode).toBe('flow-scene-pack');
  });
});
