import React, { useState, useEffect, useRef, useCallback } from 'react';
// FIX: `LiveSession` is not an exported member of `@google/genai`.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';
import Icon from './Icon';
import { getApiErrorMessage } from '../utils/errorHandler';

interface VoiceAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    addToast: (message: string, type: 'info' | 'success' | 'error') => void;
    uiStrings: any;
}

type TranscriptEntry = {
    id: string;
    role: 'user' | 'model';
    text: string;
};

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose, addToast, uiStrings }) => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    
    // FIX: The `LiveSession` type is not exported. Use `any` for the session promise.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && status === 'idle') {
            setTranscript([{ id: 'initial', role: 'model', text: "Hello! Press Start to begin our conversation." }]);
        }
    }, [isOpen, status]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const stopSession = useCallback(async () => {
        setStatus('idle');

        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
            sessionPromiseRef.current = null;
        }

        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        mediaStreamSourceRef.current?.disconnect();
        mediaStreamSourceRef.current = null;

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        inputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

    }, []);

    const startSession = async () => {
        if (status !== 'idle') return;

        setStatus('connecting');
        setTranscript(prev => [...prev, { id: 'status-connect', role: 'model', text: "Connecting..." }]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            if (!inputAudioContextRef.current) {
                 inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }
            if (!outputAudioContextRef.current) {
                 outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            const ai = getAiClient();
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('listening');
                        setTranscript(prev => prev.filter(m => m.id !== 'status-connect'));
                        addToast("Connection open. You can start speaking.", 'success');
                        
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const processTranscription = (text: string, role: 'user' | 'model') => {
                             setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                if (last && last.role === role) {
                                    return [...prev.slice(0, -1), { ...last, text: last.text.replace(/…$/, '') + text + '…' }];
                                }
                                return [...prev, { id: Date.now().toString(), role, text: text + '…' }];
                            });
                        };
                        
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                            processTranscription(message.serverContent.inputTranscription.text, 'user');
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                             processTranscription(message.serverContent.outputTranscription.text, 'model');
                        }
                        
                         if (message.serverContent?.turnComplete) {
                            setTranscript(prev => prev.map(m => ({ ...m, text: m.text.replace(/…$/, '') })));
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            setStatus('speaking');
                            const nextStartTime = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                            nextStartTimeRef.current = nextStartTime;

                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                            
                            const source = outputAudioContextRef.current!.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current!.destination);
                            
                            source.onended = () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) {
                                    setStatus('listening');
                                }
                            };
                            
                            source.start(nextStartTime);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(s => s.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            if (status === 'speaking') setStatus('listening');
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        addToast("Voice session error. Please try again.", 'error');
                        setStatus('error');
                        stopSession();
                    },
                    onclose: () => {
                         addToast("Voice session closed.", 'info');
                         // FIX: The conditional check was using a stale `status` value from a closure
                         // and causing a confusing type error. Calling stopSession() unconditionally
                         // is safe because it is idempotent and ensures cleanup always occurs.
                         stopSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'You are a friendly and helpful creative assistant for the Veo Prompt Architect app. Keep your answers concise and focused on helping the user with their video, image, or music creation process.',
                },
            });

            await sessionPromiseRef.current;

        } catch (error) {
            console.error("Failed to start voice session:", error);
            addToast(getApiErrorMessage(error, uiStrings), 'error');
            setStatus('error');
            stopSession();
        }
    };
    
    function createBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    }
    
    const isSessionActive = status === 'connecting' || status === 'listening' || status === 'speaking';

    return (
        <div className={`fixed bottom-4 right-24 z-[90] w-[calc(100%-2rem)] max-w-md h-[70vh] max-h-[600px] flex flex-col bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
            <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                <h2 className="text-lg font-semibold text-slate-100">Voice Assistant</h2>
                <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700" aria-label="Close voice assistant">
                    <Icon name="cancel" className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {transcript.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-700 flex-shrink-0 flex flex-col items-center">
                 <button 
                    onClick={isSessionActive ? stopSession : startSession}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300 border-4 ${
                        isSessionActive ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30' : 
                        'bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30'
                    }`}
                >
                   <Icon name="voice-assistant" className={`w-8 h-8 ${isSessionActive ? 'text-red-400' : 'text-cyan-400'}`} />
                </button>
                <p className="text-sm text-slate-400 mt-3 h-5">
                    {status === 'connecting' && 'Connecting...'}
                    {status === 'listening' && 'Listening...'}
                    {status === 'speaking' && 'Speaking...'}
                    {status === 'idle' && 'Press Start to Talk'}
                    {status === 'error' && 'An error occurred. Please restart.'}
                </p>
            </div>
        </div>
    );
};

export default VoiceAssistant;
