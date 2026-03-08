import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { PromptLogicProvider, usePromptLogicContext } from './PromptLogicContext';

describe('PromptLogicContext', () => {
  it('throws when used outside PromptLogicProvider', () => {
    expect(() => {
      renderHook(() => usePromptLogicContext());
    }).toThrow('usePromptLogicContext must be used inside <PromptLogicProvider>');
  });

  it('returns the provided value inside the provider', () => {
    const mockValue = {
      generatedPrompt: null,
      isLoading: false,
      handleGeneratePrompt: () => {},
    } as unknown as ReturnType<typeof import('@shared/hooks/usePromptLogic').usePromptLogic>;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PromptLogicProvider value={mockValue}>{children}</PromptLogicProvider>
    );

    const { result } = renderHook(() => usePromptLogicContext(), { wrapper });
    expect(result.current).toBe(mockValue);
  });
});
