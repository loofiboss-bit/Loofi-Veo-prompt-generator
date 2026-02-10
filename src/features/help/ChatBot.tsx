
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Chat, GenerateContentResponse } from '@google/genai';
import * as geminiService from '@core/services/geminiService';
import { ChatMessage } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import { useAppStore } from '@core/store/useAppStore'; 

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  // Access Store Actions for "Showrunner" capabilities
  const { 
      addShot, 
      setPromptState, 
      resetAll,
      sbShots
  } = useAppStore();

  useEffect(() => {
    // Initialize with a welcome message and a fresh session
    setMessages([{
        id: 'initial',
        role: 'model',
        text: 'I am the Director. I can edit your project directly. Try "Add a new scene" or "Change aspect ratio to 9:16".'
    }]);
    
    // Initialize Chat Session with Tools
    chatSessionRef.current = geminiService.createAppChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, executingAction]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userInput]);
    setInput('');
    setIsLoading(true);

    try {
        if (!chatSessionRef.current) {
             chatSessionRef.current = geminiService.createAppChat();
        }

        // 1. Send User Message
        let response = await chatSessionRef.current.sendMessage({ message: userInput.text });
        
        // 2. Loop to handle Tool Calls (Function Calling)
        while (response.functionCalls && response.functionCalls.length > 0) {
            const functionCalls = response.functionCalls;
            const functionResponses = [];

            for (const call of functionCalls) {
                const { name, args } = call;
                let result: Record<string, any> = { result: "success" }; // Default success

                // --- Execute App Action ---
                setExecutingAction(`Executing: ${name}...`);
                
                try {
                    switch (name) {
                        case 'add_scene':
                            addShot('video');
                            result = { result: "Added a new empty shot to the storyboard." };
                            break;
                            
                        case 'clear_timeline':
                            resetAll();
                            result = { result: "Timeline cleared and workspace reset." };
                            break;
                            
                        case 'set_aspect_ratio':
                            if (args && typeof args.ratio === 'string') {
                                setPromptState({ aspectRatio: args.ratio });
                                result = { result: `Aspect ratio set to ${args.ratio}` };
                            } else {
                                result = { error: "Missing ratio argument" };
                            }
                            break;
                            
                        case 'set_mood':
                            if (args && typeof args.mood === 'string') {
                                // Update multiple fields to match mood
                                setPromptState({ 
                                    artStyle: 'Cinematic', // Default base
                                    lightingStyle: args.mood,
                                    characterMood: args.mood
                                });
                                result = { result: `Applied ${args.mood} mood settings.` };
                            }
                            break;
                            
                        case 'export_project':
                            // Since export is a modal UI state usually local to components,
                            // we can't easily trigger it from global store without refactor.
                            // We'll notify user.
                            result = { result: "Export modal triggering is not yet supported via voice, please click the Export button manually." };
                            break;

                        default:
                            result = { error: `Unknown tool: ${name}` };
                    }
                } catch (err) {
                    console.error("Tool Execution Error", err);
                    result = { error: `Failed to execute ${name}: ${(err as Error).message}` };
                }
                
                // Add to responses list
                functionResponses.push({
                    id: call.id,
                    name: name,
                    response: result
                });
            }
            
            setExecutingAction(null);

            // 3. Send Tool Results back to Gemini to get final text response
            const parts = functionResponses.map(r => ({
                functionResponse: {
                    name: r.name,
                    response: r.response,
                    id: r.id
                }
            }));

            response = await chatSessionRef.current.sendMessage({
                message: parts
            });
        }

        // 4. Final Text Response
        const finalText = response.text || "Action completed.";
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: finalText 
        }]);

    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: "Sorry, I lost connection to the studio director service." 
        }]);
    } finally {
        setIsLoading(false);
        setExecutingAction(null);
    }
  };

  return (
    <>
      <div className={`fixed bottom-4 right-4 z-[90] transition-all duration-300 ${isOpen ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-4 shadow-lg flex items-center justify-center border-2 border-white/20"
          aria-label="Open AI Director"
        >
          <Icon name="chat" className="w-8 h-8" />
        </button>
      </div>

      <div className={`fixed bottom-4 right-4 z-[90] w-[calc(100%-2rem)] max-w-md h-[70vh] max-h-[600px] flex flex-col bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30 transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-2xl">
          <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <Icon name="magic" className="w-5 h-5" />
            Showrunner (App Control)
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700" aria-label="Close chat">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 shadow-sm ${
                  msg.role === 'user' 
                  ? 'bg-cyan-600 text-white rounded-br-none' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}>
                {msg.role === 'model' && (
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Icon name="video" className="w-3 h-3" /> Director
                    </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          
          {/* Action Feedback */}
          {executingAction && (
             <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-cyan-900/30 border border-cyan-500/30 rounded-bl-none flex items-center gap-2">
                <Icon name="sliders" className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs italic text-cyan-200 font-mono">{executingAction}</span>
              </div>
            </div>
          )}
          
          {isLoading && !executingAction && (
             <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-bl-none flex items-center gap-2">
                <Icon name="spinner" className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-xs italic text-slate-400">Processing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-900/50">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="e.g. Set ratio to 9:16 and add a scene"
              className="flex-grow bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 p-3 text-sm shadow-inner"
              disabled={isLoading}
            />
            <button 
                type="submit" 
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl p-3 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-900/20" 
                disabled={isLoading || !input.trim()}
            >
              <Icon name="arrow-right" className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
