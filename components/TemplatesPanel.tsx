import React, { useEffect } from 'react';
import { PromptTemplate } from '../types';
import Icon from './Icon';

interface TemplatesPanelProps {
  templates: PromptTemplate[];
  onSelect: (template: PromptTemplate) => void;
  onClose: () => void;
  uiStrings: {
    title: string;
    use: string;
  };
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ templates, onSelect, onClose, uiStrings }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
        className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-panel-title"
    >
      <div 
        className="bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-700 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 id="templates-panel-title" className="text-lg font-semibold text-gray-100">{uiStrings.title}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close templates panel"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div key={template.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col justify-between">
                <div>
                    <div className="flex items-center mb-2">
                        <Icon name={template.icon} className="w-5 h-5 text-purple-400 mr-3" />
                        <h3 className="text-md font-bold text-gray-100">{template.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{template.description}</p>
                </div>
                <button
                    onClick={() => onSelect(template)}
                    className="w-full mt-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-purple-600 text-white hover:bg-purple-700"
                >
                    {uiStrings.use}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPanel;