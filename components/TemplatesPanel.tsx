import React, { useEffect, useState } from 'react';
import { PromptTemplate, CustomPreset } from '../types';
import Icon from './Icon';

interface TemplatesPanelProps {
  builtInTemplates: PromptTemplate[];
  customPresets: CustomPreset[];
  onSelect: (template: PromptTemplate | CustomPreset) => void;
  onDeletePreset: (id: string) => void;
  onClose: () => void;
  uiStrings: {
    title: string;
    use: string;
    searchPlaceholder: string;
    noResults: string;
    yourPresetsTitle: string;
    builtInTitle: string;
    deletePreset: string;
    deletePresetConfirm: string;
  };
}

/**
 * Calculates the Levenshtein distance between two strings.
 * This is used for fuzzy matching to account for typos in search.
 * @param a - The first string.
 * @param b - The second string.
 * @returns The number of edits required to change string 'a' to string 'b'.
 */
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i += 1) {
        matrix[0][i] = i;
    }

    for (let j = 0; j <= b.length; j += 1) {
        matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,        // deletion
                matrix[j - 1][i] + 1,        // insertion
                matrix[j - 1][i - 1] + indicator, // substitution
            );
        }
    }

    return matrix[b.length][a.length];
};


const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ builtInTemplates, customPresets, onSelect, onDeletePreset, onClose, uiStrings }) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filterPredicate = (template: { name: string; description?: string; }) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
        return true;
    }
    const name = template.name.toLowerCase();
    const description = template.description?.toLowerCase() || '';

    if (name.includes(query) || description.includes(query)) {
      return true;
    }

    if (query.length > 2) {
      const threshold = query.length > 5 ? 2 : 1;
      const words = `${name} ${description}`.split(/\s+/);
      
      return words.some(word => levenshteinDistance(query, word) <= threshold);
    }
    
    return false;
  };

  const customItemsWithDesc = customPresets.map(p => ({ ...p, description: p.params.idea }));

  const filteredCustom = searchQuery.trim() === ''
    ? customItemsWithDesc
    : customItemsWithDesc.filter(filterPredicate);
  
  const filteredBuiltIn = searchQuery.trim() === ''
    ? builtInTemplates
    : builtInTemplates.filter(filterPredicate);

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`${uiStrings.deletePresetConfirm} "${name}"?`)) {
      onDeletePreset(id);
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-panel-title"
    >
      <div 
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="templates-panel-title" className="text-lg font-semibold text-slate-100">{uiStrings.title}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close templates panel"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="search" className="w-5 h-5 text-slate-400" />
            </div>
            <input
                type="text"
                placeholder={uiStrings.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/60 backdrop-blur-sm border rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 pl-10 border-slate-700"
                aria-label="Search templates"
            />
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
            {filteredCustom.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">{uiStrings.yourPresetsTitle}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredCustom.map(preset => (
                            <div key={preset.id} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 flex flex-col">
                                <div className="flex-grow">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-md font-bold text-slate-100 pr-2">{preset.name}</h3>
                                        <button onClick={(e) => handleDelete(e, preset.id, preset.name)} className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0" aria-label={`Delete preset ${preset.name}`}>
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-4 italic truncate" title={preset.description}>"{preset.description}"</p>
                                </div>
                                <button
                                    onClick={() => onSelect(preset)}
                                    className="w-full mt-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600"
                                >
                                    {uiStrings.use}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {filteredBuiltIn.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">{uiStrings.builtInTitle}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredBuiltIn.map(template => (
                            <div key={template.id} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center mb-2">
                                    <Icon name={template.icon} className="w-5 h-5 text-cyan-400 mr-3" />
                                    <h3 className="text-md font-bold text-slate-100">{template.name}</h3>
                                </div>
                                <p className="text-sm text-slate-400 mb-4">{template.description}</p>
                            </div>
                            <button
                                onClick={() => onSelect(template)}
                                className="w-full mt-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500"
                            >
                                {uiStrings.use}
                            </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {(filteredCustom.length === 0 && filteredBuiltIn.length === 0) && (
                <div className="text-center py-12 text-slate-400">
                    <p>{uiStrings.noResults}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesPanel;
