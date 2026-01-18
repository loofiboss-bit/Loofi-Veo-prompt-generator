
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { Shot } from '../types';
import * as geminiService from '../services/geminiService';
import * as sfxService from '../services/sfxService';
import { extractLastFrame } from '../utils/videoUtils';

interface FoleyWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: Shot;
    onApply: (soundBlob: Blob, description: string) => void;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const FoleyWizardModal: React.FC<FoleyWizardModalProps> = ({ 
    isOpen, onClose, shot, onApply, addToast 
}) => {
    const [step, setStep] = useState<'analyze' | 'select' | 'generate' | 'preview'>('analyze');
    const [detectedSounds, setDetectedSounds] = useState<string[]>([]);
    const [selectedSound, setSelectedSound] = useState<string | null>(null);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewFrame, setPreviewFrame] = useState<string | null>(null);
    
    const audioRef = useRef<HTMLAudioElement>(null);

    // Initial Analysis
    useEffect(() => {
        if (isOpen && shot.generatedVideoUrl) {
            const analyze = async () => {
                try {
                    setStep('analyze');
                    setIsProcessing(true);
                    
                    // 1. Get Frame
                    const frame = await extractLastFrame(shot.generatedVideoUrl!);
                    setPreviewFrame(`data:${frame.mimeType};base64,${frame.data}`);

                    // 2. Analyze with Gemini Vision
                    const sounds = await geminiService.analyzeImageForSFX(frame.data);
                    setDetectedSounds(sounds);
                    
                    setIsProcessing(false);
                    setStep('select');
                } catch (e) {
                    console.error(e);
                    addToast("Failed to analyze video frame.", 'error');
                    onClose();
                }
            };
            analyze();
        } else if (isOpen && !shot.generatedVideoUrl) {
            addToast("No video available to analyze.", 'error');
            onClose();
        }
    }, [isOpen, shot]);

    const handleGenerate = async () => {
        if (!selectedSound) return;
        
        setStep('generate');
        setIsProcessing(true);

        try {
            const blob = await sfxService.generateSound(selectedSound);
            const url = URL.createObjectURL(blob);
            
            setGeneratedBlob(blob);
            setGeneratedAudioUrl(url);
            setStep('preview');
        } catch (e) {
            addToast("Failed to generate audio.", 'error');
            setStep('select');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        if (generatedBlob && selectedSound) {
            onApply(generatedBlob, selectedSound);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[150] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="audio" className="w-6 h-6 text-yellow-400" />
                        Auto-Foley
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Visual Context */}
                    {previewFrame && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-slate-700 aspect-video relative">
                            <img src={previewFrame} alt="Analyzed Frame" className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                {isProcessing && step === 'analyze' && (
                                    <div className="bg-black/70 px-4 py-2 rounded-full text-xs font-bold text-yellow-400 animate-pulse flex items-center gap-2">
                                        <Icon name="search" className="w-4 h-4" />
                                        Scanning Visuals...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step: Select */}
                    {step === 'select' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-300">
                                AI detected potential sounds. Select one to generate:
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {detectedSounds.map((sound, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedSound(sound)}
                                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                                            selectedSound === sound 
                                            ? 'bg-yellow-900/30 border-yellow-500 text-yellow-200' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                    >
                                        🔊 {sound}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedSound}
                                className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Sound
                            </button>
                        </div>
                    )}

                    {/* Step: Generating */}
                    {step === 'generate' && (
                        <div className="text-center py-8">
                            <Icon name="spinner" className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
                            <p className="text-slate-300 font-medium">Synthesizing Audio...</p>
                            <p className="text-slate-500 text-sm mt-1">"{selectedSound}"</p>
                        </div>
                    )}

                    {/* Step: Preview */}
                    {step === 'preview' && generatedAudioUrl && (
                        <div className="space-y-6">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center">
                                <audio ref={audioRef} src={generatedAudioUrl} controls className="w-full" />
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setStep('select')}
                                    className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleConfirm}
                                    className="flex-grow py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Icon name="check" className="w-4 h-4" />
                                    Add to Scene
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FoleyWizardModal;
