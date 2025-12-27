
import { useState, useCallback, useRef } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistoryState = <T>(initialPresent: T, debounceTimeout = 500) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const lastUpdateTime = useRef<number>(0);

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
    // Update time to prevent merging next typing with this undo operation if user starts typing immediately
    lastUpdateTime.current = 0; 
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
    lastUpdateTime.current = 0;
  }, [canRedo]);

  const set = useCallback((newPresent: T) => {
    const now = Date.now();
    const isRapidUpdate = now - lastUpdateTime.current < debounceTimeout;

    setState(currentState => {
      const { past, present } = currentState;
      if (newPresent === present) {
        return currentState;
      }

      // If update is rapid and we have history, update current state without pushing to history
      // This effectively groups rapid keystrokes into a single undo step.
      if (isRapidUpdate && past.length > 0) {
        return {
          past: past,
          present: newPresent,
          future: [],
        };
      }

      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      };
    });
    lastUpdateTime.current = now;
  }, [debounceTimeout]);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
    lastUpdateTime.current = 0;
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
