import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { ROUTES } from '@core/config/routes';
import { useAppStore } from '@core/store/useAppStore';
import EmptyState from '@shared/components/EmptyState';

import TimelinePlayer from './TimelinePlayer';

export const TimelinePage: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as { returnToStudio?: 'story' } | null;
  const shots = useAppStore((state) => state.sbShots);
  const playableShots = shots.filter((shot) => shot.generatedVideoUrl);
  const shouldReturnToStoryboard = navigationState?.returnToStudio === 'story';

  const handleExitTimeline = () => {
    if (shouldReturnToStoryboard) {
      navigate(ROUTES.HOME, { state: { reopenStudio: 'story' } });
      return;
    }

    navigate(ROUTES.HOME);
  };

  if (playableShots.length === 0) {
    return (
      <section className="creator-page min-h-full px-4 py-5 text-slate-100 sm:px-6">
        <header className="creator-page-header mx-auto mb-4 max-w-6xl border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{t('timeline.title', 'Timeline')}</h1>
        </header>
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-5">
          <EmptyState
            icon="🎞️"
            title={t('timeline.emptyTitle', 'Timeline is ready when you have generated clips')}
            description={t(
              'timeline.emptyDescription',
              'Generate video from your prompt or storyboard first, then return here to review timing, transitions, and export options.',
            )}
            actionLabel={
              shouldReturnToStoryboard
                ? t('timeline.backToStoryboard', 'Back to Story Board')
                : t('timeline.backToStudio', 'Back to Prompt Studio')
            }
            onAction={handleExitTimeline}
            className="w-full border-none bg-transparent shadow-none"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="creator-page min-h-full text-slate-100">
      <header className="creator-page-header border-b border-slate-800 px-4 py-3">
        <h1 className="text-2xl font-semibold">{t('timeline.title', 'Timeline')}</h1>
      </header>
      <TimelinePlayer embedded shots={shots} onClose={handleExitTimeline} />
    </section>
  );
};

export default TimelinePage;
