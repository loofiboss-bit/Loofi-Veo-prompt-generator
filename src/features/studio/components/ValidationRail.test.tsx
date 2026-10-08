import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test-utils';
import { ValidationRail } from './ValidationRail';
import type { PromptArtifactV1 } from '@core/types';

const MOCK_ARTIFACT: PromptArtifactV1 = {
  schemaVersion: 1,
  id: 'test-artifact-1',
  kind: 'video',
  target: 'flow-veo',
  createdAt: '2026-08-15T00:00:00.000Z',
  input: {
    idea: 'Test scene',
    mode: 'text-to-video',
    target: 'flow-veo',
    aspectRatio: '16:9',
    durationSeconds: 8,
  },
  primary: {
    label: 'Primary',
    title: 'Primary Take',
    prompt: 'A test prompt',
    negativePrompt: 'low quality',
    settingsChecklist: ['Duration: 8s'],
    copyPrompt: 'A test prompt',
    copyNegativePrompt: 'low quality',
    copySettingsChecklist: 'Duration: 8s',
    copyAll: 'All content',
  },
  alternatives: [
    {
      label: 'Cinematic',
      title: 'Cinematic Take',
      prompt: 'A cinematic prompt',
      negativePrompt: 'low quality',
      settingsChecklist: ['Duration: 8s'],
      copyPrompt: 'A cinematic prompt',
      copyNegativePrompt: 'low quality',
      copySettingsChecklist: 'Duration: 8s',
      copyAll: 'All content',
    },
    {
      label: 'Control-focused',
      title: 'Control Take',
      prompt: 'A control prompt',
      negativePrompt: 'low quality',
      settingsChecklist: ['Duration: 8s'],
      copyPrompt: 'A control prompt',
      copyNegativePrompt: 'low quality',
      copySettingsChecklist: 'Duration: 8s',
      copyAll: 'All content',
    },
  ],
  provenance: {
    provider: 'local',
    source: 'compiler',
    generatedAt: '2026-08-15T00:00:00.000Z',
    inputHash: 'abc12345',
  },
  validation: [
    {
      id: 'clarity',
      label: 'Creative Clarity',
      status: 'pass',
      detail: 'Core premise is established.',
    },
    {
      id: 'dialogue',
      label: 'Dialogue Syntax',
      status: 'warning',
      detail: 'Consider removing quotes.',
    },
    {
      id: 'blocked-check',
      label: 'Missing Parameters',
      status: 'blocked',
      detail: 'Duration is required.',
    },
  ],
};

describe('ValidationRail', () => {
  it('keeps blocked checks visible while filtering optional checks separately', () => {
    render(<ValidationRail artifact={MOCK_ARTIFACT} statuses={['blocked']} />);
    expect(screen.getByText('Missing Parameters')).toBeInTheDocument();
    expect(screen.queryByText('Creative Clarity')).toBeNull();
    expect(screen.queryByText('Dialogue Syntax')).toBeNull();
  });

  it('renders check labels and details', () => {
    render(<ValidationRail artifact={MOCK_ARTIFACT} />);

    expect(screen.getByText('Creative Clarity')).toBeInTheDocument();
    expect(screen.getByText('Core premise is established.')).toBeInTheDocument();
    expect(screen.getByText('Dialogue Syntax')).toBeInTheDocument();
    expect(screen.getByText('Missing Parameters')).toBeInTheDocument();
  });
});
