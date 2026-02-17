import React, { useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import SelectInput from '@shared/components/ui/SelectInput';
import { Shot } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import * as lipSyncService from '@core/services/lipSyncService';
import { createWavHeader } from '@core/utils/audio';

interface DubbingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: Shot;
  onSave: (lang: string, url: string) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const LANGUAGES = [
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hi', label: 'Hindi' },
];

const DubbingModal: React.FC<DubbingModalProps> = ({ isOpen, onClose, shot, onSave, addToast }) => {
  const [targetLang, setTargetLang] = useState('es');
  const [status, setStatus] = useState<
    'idle' | 'translating' | 'generating_audio' | 'syncing' | 'complete'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState('');

  const handleDub = async () => {
    if (!shot.dialogueText || !shot.generatedVideoUrl) {
      addToast('Shot needs dialogue and a base video.', 'error');
      return;
    }

    setStatus('translating');
    setProgress(10);

    try {
      // 1. Translate
      const translation = await geminiService.translateScript(shot.dialogueText, targetLang);
      setTranslatedText(translation);
      setProgress(30);
      setStatus('generating_audio');

      // 2. Generate TTS
      // Use 'Kore' as default voice for demo, real implementation would map to character's voice ID
      const base64Audio = await geminiService.generateSpeech(translation);

      // Convert to URL
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
      const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(wavBlob);

      setProgress(60);
      setStatus('syncing');

      // 3. Lip Sync
      // LipSync service takes the base video and new audio URL
      // Note: In a real app, we'd need to upload these blobs to a server for processing.
      // Our mock service accepts blob URLs.
      const syncedVideoUrl = await lipSyncService.syncVideo(shot.generatedVideoUrl, audioUrl);

      setResultUrl(syncedVideoUrl);
      setStatus('complete');
      setProgress(100);
    } catch (error) {
      console.error('Dubbing failed', error);
      addToast('Dubbing process failed.', 'error');
      setStatus('idle');
      setProgress(0);
    }
  };

  const handleSaveVersion = () => {
    if (resultUrl) {
      onSave(targetLang, resultUrl);
      addToast(`Saved ${LANGUAGES.find((l) => l.value === targetLang)?.label} version.`, 'success');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="globe" className="w-6 h-6 text-emerald-400" />
            Global Dub
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Input */}
          {status === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Automatically translate dialogue and lip-sync the character for a new language
                audience.
              </p>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Original Script</p>
                <p className="text-slate-200 italic">&quot;{shot.dialogueText}&quot;</p>
              </div>

              <SelectInput
                label="Target Language"
                name="targetLang"
                options={LANGUAGES}
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              />

              <button
                onClick={handleDub}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Icon name="magic" className="w-5 h-5" />
                Start Dubbing Chain
              </button>
            </div>
          )}

          {/* Progress */}
          {(status === 'translating' || status === 'generating_audio' || status === 'syncing') && (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="relative w-20 h-20">
                <Icon name="spinner" className="w-20 h-20 text-emerald-500/20 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-400 font-bold">
                  {progress}%
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-200 capitalize">
                  {status.replace('_', ' ')}...
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {status === 'translating' && 'AI is translating context...'}
                  {status === 'generating_audio' && 'Synthesizing voice actor...'}
                  {status === 'syncing' && 'Reshaping lip movements...'}
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {status === 'complete' && resultUrl && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 relative">
                <video src={resultUrl} className="w-full h-full object-contain" controls autoPlay />
                <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {targetLang.toUpperCase()}
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-lg text-sm text-slate-300 border border-slate-700/50">
                <span className="text-emerald-400 font-bold mr-2">Translation:</span>&quot;
                {translatedText}&quot;
              </div>

              <button
                onClick={handleSaveVersion}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="check" className="w-5 h-5" />
                Save as {LANGUAGES.find((l) => l.value === targetLang)?.label} Version
              </button>
            </div>
          )}
        </div>
      </div>
    </AppDialog>
  );
};

export default DubbingModal;
