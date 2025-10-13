import React, { useEffect } from 'react';
import { PronunciationTerm } from '../types';
import Icon from './Icon';

interface PronunciationGuideProps {
  guideData: PronunciationTerm[];
  onClose: () => void;
  uiStrings: {
    title: string;
  };
}

const PronunciationGuide: React.FC<PronunciationGuideProps> = ({ guideData, onClose, uiStrings }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pronunciation-guide-title"
    >
      <div
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="pronunciation-guide-title" className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Icon name="audio" className="w-6 h-6 text-cyan-400" />
            {uiStrings.title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close pronunciation guide"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto">
          <ul className="space-y-4">
            {guideData.map((item, index) => (
              <li key={index} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="text-md font-bold text-slate-100">{item.term}</h3>
                  <p className="text-sm text-cyan-400 font-mono">[{item.pronunciation}]</p>
                </div>
                <p className="text-sm text-slate-400 mt-2">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PronunciationGuide;
