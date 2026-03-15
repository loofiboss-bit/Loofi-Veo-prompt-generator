import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test-utils';
import { LivePromptPreview } from './LivePromptPreview';
import type { PromptState } from '@core/types';

function makePromptState(overrides: Partial<PromptState> = {}): PromptState {
  return {
    idea: '',
    artStyle: '',
    customArtStyle: '',
    lightingStyle: '',
    colorPalette: '',
    cameraMovement: '',
    cameraDistance: '',
    lensType: '',
    timeOfDay: '',
    weather: '',
    environment: '',
    characterArchetype: '',
    characterAge: '',
    characterGender: '',
    ambientSound: '',
    aspectRatio: '',
    motionIntensity: '',
    ...overrides,
  } as PromptState;
}

describe('LivePromptPreview', () => {
  it('renders nothing when the assembled preview is empty', () => {
    const { container } = render(<LivePromptPreview promptState={makePromptState()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders preview content when the idea is present', () => {
    render(
      <LivePromptPreview
        promptState={makePromptState({
          idea: 'A neon-lit alley at midnight',
          cameraMovement: 'dolly in',
          aspectRatio: '16:9',
        })}
      />,
    );

    expect(screen.getByText('Live Preview')).toBeInTheDocument();
    expect(screen.getByText(/A neon-lit alley at midnight/)).toBeInTheDocument();
    expect(screen.getByText(/Camera: dolly in/)).toBeInTheDocument();
    expect(screen.getByText(/Aspect ratio: 16:9/)).toBeInTheDocument();
  });
});
