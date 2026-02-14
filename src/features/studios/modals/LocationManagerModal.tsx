import React, { useState, useEffect } from 'react';
import { LocationProfile } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { useLocationStore } from '@core/store/useLocationStore';
import * as geminiService from '@core/services/geminiService';
import type { UIStrings } from '@core/constants';

interface LocationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  uiStrings: UIStrings;
}

const LocationManagerModal: React.FC<LocationManagerModalProps> = ({
  isOpen,
  onClose,
  addToast,
  uiStrings: _uiStrings,
}) => {
  const { locations, addLocation, updateLocation, deleteLocation } = useLocationStore();
  const [view, setView] = useState<'grid' | 'form'>('grid');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [formData, setFormData] = useState<LocationProfile>({
    id: '',
    name: '',
    description: '',
    visualTags: [],
    referenceImage: undefined,
  });

  // Helper state for visual tags input
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCreateNew = () => {
    setFormData({
      id: Date.now().toString(),
      name: '',
      description: '',
      visualTags: [],
    });
    setTagInput('');
    setView('form');
  };

  const handleEdit = (loc: LocationProfile) => {
    setFormData({ ...loc });
    setTagInput('');
    setView('form');
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      addToast('Location name is required.', 'error');
      return;
    }

    if (locations.some((l) => l.id === formData.id)) {
      updateLocation(formData.id, formData);
      addToast('Location updated.', 'success');
    } else {
      addLocation(formData);
      addToast('New location created.', 'success');
    }
    setView('grid');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this location? This cannot be undone.')) {
      deleteLocation(id);
      addToast('Location deleted.', 'info');
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      addToast('Please enter a location name first.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      // Use existing visual tags as style hint
      const styleHint = formData.visualTags.join(', ');
      const desc = await geminiService.generateLocationDescription(formData.name, styleHint, 'en');
      setFormData((prev) => ({ ...prev, description: desc }));
      addToast('Description generated.', 'success');
    } catch (_error) {
      addToast('Failed to generate description.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.visualTags.includes(tagInput.trim())) {
      setFormData((prev) => ({ ...prev, visualTags: [...prev.visualTags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, visualTags: prev.visualTags.filter((t) => t !== tag) }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[95] p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        className="relative bg-slate-900/80 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden"
      >
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="map-pin" className="w-6 h-6 text-emerald-400" />
              Location Library
            </h2>
            <p className="text-sm text-slate-400 mt-1">Manage reusable sets and environments.</p>
          </div>
          <div className="flex gap-3">
            {view === 'grid' && (
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg transition-transform hover:scale-105"
              >
                <Icon name="plus" className="w-4 h-4" />
                Add Location
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Icon name="cancel" className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6">
          {view === 'grid' ? (
            locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <Icon name="map-pin" className="w-16 h-16 opacity-20 mb-4" />
                <p>No locations saved yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => handleEdit(loc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEdit(loc);
                      }
                    }}
                    className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/30 transition-all group relative cursor-pointer hover:bg-slate-800/60"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-slate-200 text-lg truncate pr-6">{loc.name}</h3>
                      <button
                        onClick={(e) => handleDelete(loc.id, e)}
                        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-3 mb-4 min-h-[3rem] italic">
                      {loc.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {loc.visualTags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300 border border-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {loc.visualTags.length > 3 && (
                        <span className="px-2 py-0.5 text-[10px] text-slate-500">
                          +{loc.visualTags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Form View
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <TextAreaInput
                    label="Location Name"
                    name="locName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Abandoned Space Station, Cozy Cabin"
                    rows={1}
                    autoFocus
                  />

                  <div className="relative">
                    <TextAreaInput
                      label="Visual Description (Prompt)"
                      name="locDesc"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of lighting, texture, and atmosphere..."
                      rows={6}
                    />
                    <button
                      onClick={handleGenerateDescription}
                      disabled={isGenerating || !formData.name}
                      className="absolute top-0 right-0 mt-8 mr-2 p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded-md transition-colors disabled:opacity-50"
                      title="Auto-Generate Description with AI"
                    >
                      {isGenerating ? (
                        <Icon name="spinner" className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon name="magic" className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                    <label htmlFor="locationTagInput" className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                      Visual Tags
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        id="locationTagInput"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add tag..."
                        className="flex-grow bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button
                        onClick={handleAddTag}
                        className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.visualTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 border border-slate-600"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-400"
                          >
                            <Icon name="cancel" className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Placeholder for future Image Upload */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 border-dashed text-center text-slate-500 text-xs">
                    <Icon name="image" className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Reference Image (Coming Soon)
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => setView('grid')}
                  className="px-6 py-2 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name.trim()}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ml-auto flex items-center gap-2"
                >
                  <Icon name="check" className="w-4 h-4" />
                  Save Location
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationManagerModal;
