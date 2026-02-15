/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useEffect, useState } from 'react';
import { PromptTemplate, CustomPreset, PromptState } from '@core/types';
import { Icon } from '@shared/components/ui';
import { filterItem } from '@core/utils/search';

interface TemplatesPanelProps {
  builtInTemplates: PromptTemplate[];
  customPresets: CustomPreset[];
  onSelect: (template: PromptTemplate | CustomPreset) => void;
  onDeletePreset: (id: string) => void;
  onUpdatePreset?: (preset: CustomPreset) => void;
  currentPromptState?: PromptState;
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
    edit?: string;
    save?: string;
    cancel?: string;
    updateSettings?: string;
    updateSettingsConfirm?: string;
    renamePlaceholder?: string;
  };
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  builtInTemplates,
  customPresets,
  onSelect,
  onDeletePreset,
  onUpdatePreset,
  currentPromptState,
  onClose,
  uiStrings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          cancelEditing();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingId]);

  const startEditing = (preset: CustomPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveName = (preset: CustomPreset) => {
    if (editName.trim() && onUpdatePreset) {
      onUpdatePreset({ ...preset, name: editName.trim() });
      setEditingId(null);
    }
  };

  const updateParams = (preset: CustomPreset) => {
    if (onUpdatePreset && currentPromptState && window.confirm(uiStrings.updateSettingsConfirm)) {
      onUpdatePreset({ ...preset, params: currentPromptState });
      setEditingId(null);
    }
  };

  const filterPredicate = (template: { name: string; description?: string }) => {
    return filterItem(searchQuery, template.name, template.description);
  };

  const customItemsWithDesc = customPresets.map((p) => ({ ...p, description: p.params.idea }));

  const filteredCustom =
    searchQuery.trim() === '' ? customItemsWithDesc : customItemsWithDesc.filter(filterPredicate);

  const filteredBuiltIn =
    searchQuery.trim() === '' ? builtInTemplates : builtInTemplates.filter(filterPredicate);

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`${uiStrings.deletePresetConfirm} "${name}"?`)) {
      onDeletePreset(id);
    }
  };

  const handleApply = (template: PromptTemplate | CustomPreset) => {
    setApplyingId(template.id);
    setTimeout(() => {
      onSelect(template);
      // Don't need to reset applyingId here because component likely unmounts,
      // but if not:
      setApplyingId(null);
    }, 600); // Wait for visual feedback
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Modal backdrop click-to-close; has role="dialog" and keyboard handler
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-panel-title"
      tabIndex={-1}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Stops propagation to prevent backdrop dismiss; presentation-only interaction */}
      <div
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
        tabIndex={-1}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="templates-panel-title" className="text-lg font-semibold text-slate-100">
            {uiStrings.title}
          </h2>
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
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="w-full bg-slate-800/60 backdrop-blur-sm border rounded-lg shadow-sm text-slate-200 placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 pl-10 border-slate-700"
              aria-label="Search templates"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {filteredCustom.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">
                {uiStrings.yourPresetsTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustom.map((preset) => (
                  <div
                    key={preset.id}
                    className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 flex flex-col"
                  >
                    {editingId === preset.id ? (
                      <div className="flex flex-col gap-3 h-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.currentTarget.value)}
                          placeholder={uiStrings.renamePlaceholder}
                          className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-slate-200 text-sm focus:ring-cyan-500 focus:border-cyan-500"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => saveName(preset)}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded p-2 text-xs flex justify-center"
                            title={uiStrings.save}
                          >
                            <Icon name="check" className="w-4 h-4" />
                          </button>
                          {onUpdatePreset && currentPromptState && (
                            <button
                              onClick={() => updateParams(preset)}
                              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded p-2 text-xs flex justify-center"
                              title={uiStrings.updateSettings}
                            >
                              <Icon name="sliders" className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={cancelEditing}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white rounded p-2 text-xs flex justify-center"
                            title={uiStrings.cancel}
                          >
                            <Icon name="cancel" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-grow">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-md font-bold text-slate-100 pr-2">{preset.name}</h3>
                            <div className="flex space-x-1">
                              {onUpdatePreset && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(preset);
                                  }}
                                  className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 flex-shrink-0"
                                  aria-label={`${uiStrings.edit} ${preset.name}`}
                                >
                                  <Icon name="edit" className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDelete(e, preset.id, preset.name)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                                aria-label={`${uiStrings.deletePreset} ${preset.name}`}
                              >
                                <Icon name="trash" className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p
                            className="text-sm text-slate-300 mb-4 italic truncate"
                            title={preset.description}
                          >
                            &quot;{preset.description}&quot;
                          </p>
                        </div>
                        <button
                          onClick={() => handleApply(preset)}
                          disabled={applyingId === preset.id}
                          className={`w-full mt-auto px-3 py-2 text-sm font-semibold rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
                            applyingId === preset.id
                              ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                              : 'bg-slate-700 text-white hover:bg-slate-600'
                          }`}
                        >
                          {applyingId === preset.id ? (
                            <>
                              <Icon name="check" className="w-4 h-4 animate-bounce" />
                              <span>Applied!</span>
                            </>
                          ) : (
                            uiStrings.use
                          )}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {filteredBuiltIn.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2">
                {uiStrings.builtInTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBuiltIn.map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center mb-2">
                        <Icon name={template.icon} className="w-5 h-5 text-cyan-400 mr-3" />
                        <h3 className="text-md font-bold text-slate-100">{template.name}</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-4">{template.description}</p>
                    </div>
                    <button
                      onClick={() => handleApply(template)}
                      disabled={applyingId === template.id}
                      className={`w-full mt-auto px-3 py-2 text-sm font-semibold rounded-md transition-all duration-300 flex items-center justify-center gap-2 ${
                        applyingId === template.id
                          ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                          : 'bg-cyan-600 text-white hover:bg-cyan-500'
                      }`}
                    >
                      {applyingId === template.id ? (
                        <>
                          <Icon name="check" className="w-4 h-4 animate-bounce" />
                          <span>Applied!</span>
                        </>
                      ) : (
                        uiStrings.use
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {filteredCustom.length === 0 && filteredBuiltIn.length === 0 && (
            <div className="text-center py-12 text-slate-300">
              <p>{uiStrings.noResults}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesPanel;
