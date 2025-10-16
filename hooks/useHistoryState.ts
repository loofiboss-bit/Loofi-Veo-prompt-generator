import { useState, useCallback } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistoryState = <T>(initialPresent: T) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    setState(currentState => {
      const { past, present, future } = currentState;
      const newPast = past.slice(0, past.length - 1);
      const newPresent = past[past.length - 1];
      const newFuture = [present, ...future];
      return { past: newPast, present: newPresent, future: newFuture };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    setState(currentState => {
      const { past, present, future } = currentState;
      const newPast = [...past, present];
      const newPresent = future[0];
      const newFuture = future.slice(1);
      return { past: newPast, present: newPresent, future: newFuture };
    });
  }, [canRedo]);

  const set = useCallback((newPresent: T) => {
    setState(currentState => {
      const { past, present } = currentState;
      if (newPresent === present) {
        return currentState;
      }
      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  return {
    state: state.present,
    setState: set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
};