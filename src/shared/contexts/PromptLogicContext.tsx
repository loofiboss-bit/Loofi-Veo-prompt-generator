/**
 * PromptLogicContext
 *
 * Eliminates the `promptLogic` prop-bag drilling through
 * App → AppScaffold → PromptWorkspace.
 *
 * Provide at the App level after calling usePromptLogic();
 * consume anywhere in the prompt-builder subtree via usePromptLogicContext().
 */

import React, { createContext, useContext } from 'react';
import type { usePromptLogic } from '@shared/hooks/usePromptLogic';

type PromptLogicValue = ReturnType<typeof usePromptLogic>;

const PromptLogicContext = createContext<PromptLogicValue | null>(null);

export function PromptLogicProvider({
  value,
  children,
}: {
  value: PromptLogicValue;
  children: React.ReactNode;
}) {
  return <PromptLogicContext.Provider value={value}>{children}</PromptLogicContext.Provider>;
}

export function usePromptLogicContext(): PromptLogicValue {
  const ctx = useContext(PromptLogicContext);
  if (!ctx) {
    throw new Error('usePromptLogicContext must be used inside <PromptLogicProvider>');
  }
  return ctx;
}
