import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '@core/store/useAppStore';
import EmptyState from '@shared/components/EmptyState';

import TimelinePlayer from './TimelinePlayer';

export const TimelinePage: React.FC = () => {
  const navigate = useNavigate();
  const shots = useAppStore((state) => state.sbShots);
  const playableShots = shots.filter((shot) => shot.generatedVideoUrl);

  if (playableShots.length === 0) {
    return (
      <div className="min-h-full bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-cyan-950/20">
          <EmptyState
            icon="🎞️"
            title="Timeline is ready when you have generated clips"
            description={
              'Generate video from your prompt or storyboard first, then return here to review timing, transitions, and export options.'
            }
            actionLabel="Back to Prompt Builder"
            onAction={() => navigate('/')}
            className="w-full border-none bg-transparent shadow-none"
          />
        </div>
      </div>
    );
  }

  return <TimelinePlayer shots={shots} onClose={() => navigate('/')} />;
};

export default TimelinePage;
