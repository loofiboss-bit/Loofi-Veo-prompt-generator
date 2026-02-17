/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useEffect, useState, useRef } from 'react';
import { PronunciationTerm } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { decode, decodeAudioData } from '@core/utils/audio';
import { useTranslation } from 'react-i18next';
import { logger } from '@core/services/loggerService';

interface PronunciationGuideProps {
  guideData: PronunciationTerm[];
  onClose: () => void;
}

const PronunciationGuide: React.FC<PronunciationGuideProps> = ({ guideData, onClose }) => {
  const { t, i18n } = useTranslation(['studios', 'errors']);
  const errorStrings = i18n.getResourceBundle(i18n.language, 'errors') || {};
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePlayPronunciation = async (term: string, pronunciation: string) => {
    if (activeTerm) {
      // Stop any currently playing audio
      audioSourceRef.current?.stop();
      audioSourceRef.current = null;
      if (activeTerm === term) {
        setActiveTerm(null);
        return;
      }
    }
    setActiveTerm(term);
    try {
      const textToSpeak = `Say the word ${term}, which is pronounced: ${pronunciation}`;
      const base64Audio = await geminiService.generateSpeech(textToSpeak);

      if (!audioContextRef.current) {
        const AudioContextCtor =
          typeof AudioContext !== 'undefined'
            ? AudioContext
            : (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
        if (!AudioContextCtor) {
          throw new Error('AudioContext is not supported in this browser.');
        }
        audioContextRef.current = new AudioContextCtor({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('Failed to initialize audio context.');
      }
      if (ctx.state === 'suspended') await ctx.resume();

      const decodedBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(decodedBytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setActiveTerm(null);
        audioSourceRef.current = null;
      };
      source.start();
      audioSourceRef.current = source;
    } catch (error) {
      logger.error('TTS Error:', getApiErrorMessage(error, errorStrings));
      setActiveTerm(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pronunciation-guide-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close pronunciation guide"
      />
      <div className="relative z-10 bg-slate-900/70 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2
            id="pronunciation-guide-title"
            className="text-lg font-semibold text-slate-100 flex items-center gap-2"
          >
            <Icon name="audio" className="w-6 h-6 text-cyan-400" />
            {t('pronunciationGuide.title')}
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
              <li
                key={index}
                className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-md font-bold text-slate-100">{item.term}</h3>
                    <p className="text-sm text-cyan-400 font-mono">[{item.pronunciation}]</p>
                  </div>
                  <p className="text-sm text-slate-300 mt-2">{item.description}</p>
                </div>
                <button
                  onClick={() => handlePlayPronunciation(item.term, item.pronunciation)}
                  className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 transition-colors flex-shrink-0"
                  aria-label={`Hear pronunciation for ${item.term}`}
                >
                  {activeTerm === item.term ? (
                    <Icon name="spinner" className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon name="audio" className="w-5 h-5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PronunciationGuide;
