import React, { useEffect, useMemo, useState } from 'react';
import Button from '@shared/components/ui/Button';
import AppDialog from '@shared/components/ui/AppDialog';
import Input from '@shared/components/ui/Input';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import {
  getTopicsByCategory,
  helpCategories,
  helpTopics,
  searchHelp,
  type HelpTopic,
} from '@infrastructure/database/migrations/helpContent';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  initialCategory?: string;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({
  isOpen,
  onClose,
  initialTopic,
  initialCategory,
}) => {
  const { restartTutorial } = useOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialTopic) {
      const topic = helpTopics.find((entry) => entry.id === initialTopic);
      if (topic) {
        setSelectedTopic(topic);
        setSelectedCategory(null);
        setSearchQuery('');
        return;
      }
    }

    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setSelectedTopic(null);
      setSearchQuery('');
      return;
    }

    setSelectedTopic(null);
    setSelectedCategory(null);
    setSearchQuery('');
  }, [initialCategory, initialTopic, isOpen]);

  const filteredTopics = useMemo(() => {
    if (searchQuery.trim()) {
      return searchHelp(searchQuery);
    }
    if (selectedCategory) {
      return getTopicsByCategory(selectedCategory);
    }
    return [];
  }, [searchQuery, selectedCategory]);

  const handleBack = () => {
    if (selectedTopic) {
      setSelectedTopic(null);
      return;
    }

    if (selectedCategory || searchQuery) {
      setSelectedCategory(null);
      setSearchQuery('');
    }
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      layer="overlay"
      placement="right"
      showCloseButton={false}
      bodyClassName="!p-0 !overflow-hidden"
      dialogClassName="!max-w-[min(94vw,520px)] !h-[calc(100vh-2rem)] !max-h-none"
      ariaLabelledBy="help-panel-title"
    >
      <div className="flex h-full flex-col bg-slate-900">
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {(selectedCategory || selectedTopic || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  Back
                </Button>
              )}
              <h2 id="help-panel-title" className="truncate text-lg font-semibold text-slate-100">
                {selectedTopic ? selectedTopic.title : 'Help Center'}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="border-b border-slate-700 px-5 py-4">
          <Input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            fullWidth
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {selectedTopic ? (
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300">
                {selectedTopic.category}
              </div>
              <div className="space-y-3 text-sm leading-6 text-slate-200">
                {selectedTopic.content.split('\n\n').map((paragraph, index) => (
                  <p key={`${selectedTopic.id}-${index}`} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : filteredTopics.length > 0 ? (
            <div className="space-y-3">
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-800"
                  onClick={() => setSelectedTopic(topic)}
                >
                  <h3 className="text-sm font-semibold text-slate-100">{topic.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {topic.content.slice(0, 120)}...
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {helpCategories.map((category) => (
                <button
                  key={category}
                  className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-4 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-800"
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedTopic(null);
                    setSearchQuery('');
                  }}
                >
                  <h3 className="text-sm font-semibold text-slate-100">{category}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {getTopicsByCategory(category).length} topics
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                restartTutorial();
                onClose();
              }}
            >
              Restart Tutorial
            </Button>
            <a
              href="https://github.com/yourusername/loofi-veo-prompt-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-300 underline-offset-2 hover:underline"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </AppDialog>
  );
};

export default HelpPanel;
