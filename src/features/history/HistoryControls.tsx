import React from 'react';
import { useAppStore } from '@core/store/useAppStore';
import { useStore } from 'zustand';
import Icon from '@shared/components/ui/Icon';

const HistoryControls: React.FC = () => {
  // Access temporal store — typed via useAppStore export
  const temporalStore = useAppStore.temporal;
  const { undo, redo } = temporalStore.getState();

  // Subscribe to temporal state changes to re-render buttons
  const pastLength = useStore(temporalStore, (state) => state.pastStates.length);
  const futureLength = useStore(temporalStore, (state) => state.futureStates.length);

  return (
    <div className="flex gap-1 items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
      <button
        onClick={() => undo()}
        disabled={pastLength === 0}
        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
        title={`Undo (${pastLength}) - Ctrl+Z`}
      >
        <Icon name="undo" className="w-4 h-4" />
      </button>
      <div className="w-px h-3 bg-slate-700"></div>
      <button
        onClick={() => redo()}
        disabled={futureLength === 0}
        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
        title={`Redo (${futureLength}) - Ctrl+Shift+Z`}
      >
        <Icon name="redo" className="w-4 h-4" />
      </button>
    </div>
  );
};

export default HistoryControls;
