import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { helpCategories, searchHelp, getTopicsByCategory, type HelpTopic } from '../../data/helpContent';

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
    const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>([]);

    useEffect(() => {
        if (searchQuery) {
            setFilteredTopics(searchHelp(searchQuery));
            setSelectedCategory(null);
        } else if (selectedCategory) {
            setFilteredTopics(getTopicsByCategory(selectedCategory));
        } else {
            setFilteredTopics([]);
        }
    }, [searchQuery, selectedCategory]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCategoryClick = (category: string) => {
        setSelectedCategory(category);
        setSearchQuery('');
        setSelectedTopic(null);
    };

    const handleTopicClick = (topic: HelpTopic) => {
        setSelectedTopic(topic);
    };

    const handleBack = () => {
        if (selectedTopic) {
            setSelectedTopic(null);
        } else if (selectedCategory || searchQuery) {
            setSelectedCategory(null);
            setSearchQuery('');
        }
    };

    return createPortal(
        <>
            {/* Backdrop */}
            <div className="help-backdrop" onClick={onClose} />

            {/* Panel */}
            <div className={`help-panel ${isOpen ? 'help-panel-open' : ''}`}>
                {/* Header */}
                <div className="help-header">
                    <div className="help-header-content">
                        {(selectedCategory || selectedTopic || searchQuery) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
                                leftIcon={
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                }
                            >
                                Back
                            </Button>
                        )}
                        <h2 className="help-title">
                            {selectedTopic ? selectedTopic.title : 'Help Center'}
                        </h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        leftIcon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        }
                    >
                        Close
                    </Button>
                </div>

                {/* Search */}
                <div className="help-search">
                    <Input
                        type="text"
                        placeholder="Search help topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        }
                        fullWidth
                    />
                </div>

                {/* Content */}
                <div className="help-content">
                    {selectedTopic ? (
                        /* Topic Detail */
                        <div className="help-topic-detail animate-fade-in">
                            <div className="help-topic-category">{selectedTopic.category}</div>
                            <div className="help-topic-content">
                                {selectedTopic.content.split('\n\n').map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    ) : filteredTopics.length > 0 ? (
                        /* Topic List */
                        <div className="help-topic-list">
                            {filteredTopics.map((topic) => (
                                <button
                                    key={topic.id}
                                    className="help-topic-item animate-fade-in-up"
                                    onClick={() => handleTopicClick(topic)}
                                >
                                    <div className="help-topic-item-header">
                                        <h3>{topic.title}</h3>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                    <p className="help-topic-item-preview">
                                        {topic.content.substring(0, 100)}...
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Category Grid */
                        <div className="help-categories">
                            {helpCategories.map((category, index) => (
                                <button
                                    key={category}
                                    className="help-category-card animate-fade-in-up"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                    onClick={() => handleCategoryClick(category)}
                                >
                                    <div className="help-category-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                            <path d="M2 17l10 5 10-5" />
                                            <path d="M2 12l10 5 10-5" />
                                        </svg>
                                    </div>
                                    <h3>{category}</h3>
                                    <p>{getTopicsByCategory(category).length} topics</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="help-footer">
                    <p>
                        Need more help?{' '}
                        <a href="https://github.com/yourusername/loofi-veo-prompt-generator" target="_blank" rel="noopener noreferrer">
                            View Documentation
                        </a>
                    </p>
                </div>
            </div>

            <style>{`
        .help-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: var(--z-modal);
          animation: fade-in var(--transition-base);
        }

        .help-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 480px;
          max-width: 90vw;
          background: var(--color-bg-primary);
          border-left: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
          z-index: calc(var(--z-modal) + 1);
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform var(--transition-base);
        }

        .help-panel-open {
          transform: translateX(0);
        }

        .help-header {
          padding: var(--spacing-6);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-4);
        }

        .help-header-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-3);
          flex: 1;
        }

        .help-title {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin: 0;
        }

        .help-search {
          padding: var(--spacing-4) var(--spacing-6);
          border-bottom: 1px solid var(--color-border);
        }

        .help-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-6);
        }

        .help-categories {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--spacing-4);
        }

        .help-category-card {
          padding: var(--spacing-6);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .help-category-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-500);
        }

        .help-category-icon {
          width: 48px;
          height: 48px;
          margin-bottom: var(--spacing-4);
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500));
          border-radius: var(--radius-md);
          color: white;
        }

        .help-category-card h3 {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-2);
        }

        .help-category-card p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .help-topic-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-3);
        }

        .help-topic-item {
          padding: var(--spacing-4);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .help-topic-item:hover {
          border-color: var(--color-primary-500);
          box-shadow: var(--shadow-sm);
        }

        .help-topic-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-2);
        }

        .help-topic-item h3 {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          margin: 0;
        }

        .help-topic-item-preview {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .help-topic-detail {
          max-width: 600px;
        }

        .help-topic-category {
          display: inline-block;
          padding: var(--spacing-1) var(--spacing-3);
          background: var(--color-primary-100);
          color: var(--color-primary-700);
          border-radius: var(--radius-full);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          margin-bottom: var(--spacing-4);
        }

        .help-topic-content {
          font-size: var(--font-size-base);
          color: var(--color-text-primary);
          line-height: 1.7;
        }

        .help-topic-content p {
          margin-bottom: var(--spacing-4);
          white-space: pre-wrap;
        }

        .help-footer {
          padding: var(--spacing-4) var(--spacing-6);
          border-top: 1px solid var(--color-border);
          text-align: center;
        }

        .help-footer p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .help-footer a {
          color: var(--color-primary-500);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
        }

        .help-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .help-panel {
            width: 100vw;
            max-width: 100vw;
          }

          .help-categories {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </>,
        document.body
    );
};

export default HelpPanel;
