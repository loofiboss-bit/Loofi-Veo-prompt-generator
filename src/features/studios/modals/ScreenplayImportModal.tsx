import React, { useState, useMemo } from 'react';
import {
  parseScreenplayText,
  convertScreenplayToShots,
  DIRECTOR_STYLE_CONFIGS,
} from '@core/services/screenplayParserService';
import type { DirectorStylePreset } from '@core/types/screenplay';
import type { Shot } from '@core/types';
import Icon from '@shared/components/ui/Icon';

interface ScreenplayImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportShots: (
    shots: Shot[],
    extractedData: { characters: string[]; locations: string[] },
  ) => void;
}

const DEFAULT_SAMPLE = `EXT. CYBERPUNK PLAZA - NIGHT

Rain falls across the holographic billboards. NOVA steps into the light, gripping a memory drive.

NOVA
(urgent)
We only have three minutes before the lockdown.

SFX: Distant siren howl.

INT. UNDERGROUND SAFE HOUSE - CONTINUOUS

CYRUS examines the data console as the screens flicker.`;

export const ScreenplayImportModal: React.FC<ScreenplayImportModalProps> = ({
  isOpen,
  onClose,
  onImportShots,
}) => {
  const [scriptText, setScriptText] = useState(DEFAULT_SAMPLE);
  const [selectedDirectorStyle, setSelectedDirectorStyle] =
    useState<DirectorStylePreset>('atmospheric-scifi');

  const parsedDoc = useMemo(() => {
    return parseScreenplayText(scriptText);
  }, [scriptText]);

  const previewShots = useMemo(() => {
    return convertScreenplayToShots(parsedDoc, selectedDirectorStyle);
  }, [parsedDoc, selectedDirectorStyle]);

  if (!isOpen) return null;

  const handleImport = () => {
    onImportShots(previewShots, {
      characters: parsedDoc.extractedCharacters,
      locations: parsedDoc.extractedLocations,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Icon name="document" className="text-primary text-2xl" />
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                AI Screenplay Breakdown Engine
              </h2>
              <p className="text-xs text-muted-foreground">
                Parse Fountain / Markdown scripts into Scenes, Shots, and Production Bible profiles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Body Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto flex-1">
          {/* Left Column: Script Input & Director Style */}
          <div className="space-y-4 flex flex-col">
            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Screenplay Text (Fountain / Markdown)</span>
                <span className="text-[11px] text-primary">
                  {parsedDoc.scenes.length} Scenes detected
                </span>
              </label>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Paste Fountain screenplay or script text here..."
                className="w-full flex-1 min-h-[220px] rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              />
            </div>

            {/* Director Style Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="director-style-select"
                className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
              >
                <Icon name="sparkles" className="text-sm text-primary" />
                Director Style Profile
              </label>
              <select
                id="director-style-select"
                value={selectedDirectorStyle}
                onChange={(e) => setSelectedDirectorStyle(e.target.value as DirectorStylePreset)}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {Object.values(DIRECTOR_STYLE_CONFIGS).map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.displayName}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground italic">
                {DIRECTOR_STYLE_CONFIGS[selectedDirectorStyle].description}
              </p>
            </div>
          </div>

          {/* Right Column: Breakdown Preview */}
          <div className="space-y-4 flex flex-col border-t md:border-t-0 md:border-l border-border/60 md:pl-6 pt-4 md:pt-0">
            {/* Extracted Entities */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Characters ({parsedDoc.extractedCharacters.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {parsedDoc.extractedCharacters.length > 0 ? (
                    parsedDoc.extractedCharacters.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">None detected</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Locations ({parsedDoc.extractedLocations.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {parsedDoc.extractedLocations.length > 0 ? (
                    parsedDoc.extractedLocations.map((loc) => (
                      <span
                        key={loc}
                        className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground truncate max-w-[120px]"
                      >
                        {loc}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">None detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Generated Shot Sequence Preview */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Generated Shot Sequence ({previewShots.length} shots)</span>
              </label>
              <div className="flex-1 max-h-[220px] overflow-y-auto space-y-2 rounded-lg border border-border/60 bg-background/50 p-2.5">
                {previewShots.map((shot, idx) => (
                  <div
                    key={shot.id}
                    className="rounded-md border border-border/40 bg-card p-2 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-primary font-mono text-[11px]">SHOT #{idx + 1}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                        {shot.duration}s • {shot.camera}
                      </span>
                    </div>
                    <p className="text-foreground/90 line-clamp-2 text-[11px]">{shot.action}</p>
                    {shot.dialogue && (
                      <p className="text-[11px] text-muted-foreground italic truncate">
                        &ldquo;{shot.dialogue}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-3 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {previewShots.length} shots ready to import into Storyboard
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border/70 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Icon name="plus" className="text-sm" />
              Import {previewShots.length} Shots
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
