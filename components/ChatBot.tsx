
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Chat } from '@google/genai';
import * as geminiService from '../services/geminiService';
import { ChatMessage, AgentAction } from '../types';
import Icon from './Icon';
import { useAppStore } from '../store/useAppStore'; // Import Store for Actions

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Access Store Actions
  const { 
      sbShots, 
      sbGlobalContext, 
      updateShot, 
      addShot, 
      deleteShot, 
      setSbGlobalContext 
  } = useAppStore();

  useEffect(() => {
    // Initialize with a welcome message
    setMessages([{
        id: 'initial',
        role: 'model',
        text: 'I am the Auto-Director. I can edit your storyboard directly. Try "Change Shot 1 to a close-up" or "Add a new scene".'
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userInput]);
    setInput('');
    setIsLoading(true);

    try {
        // 1. Prepare Context Summary for Agent
        const contextSummary = JSON.stringify({
            globalContext: sbGlobalContext,
            shots: sbShots.map(s => ({
                id: s.id,
                action: s.action,
                camera: s.camera,
                dialogue: s.dialogueText
            }))
        });

        // 2. Call Agent
        const actionResult: AgentAction = await geminiService.directorAgent(userInput.text, contextSummary);

        // 3. Execute Action
        if (actionResult.tool === 'update_shot') {
            if (actionResult.parameters.shotId && actionResult.parameters.field && actionResult.parameters.value) {
                // Determine shot index logic if needed, but store uses ID directly usually. 
                // Gemini might return ID 1, 2 etc from the context list.
                // We trust the ID from context summary mapping.
                updateShot(actionResult.parameters.shotId, actionResult.parameters.field as any, actionResult.parameters.value);
            }
        } else if (actionResult.tool === 'add_shot') {
            addShot('video');
            // If action value provided, update the newly added shot immediately
            if (actionResult.parameters.value) {
                // We need the ID of the new shot. 
                // Since addShot is void in the store and uses setState, we can't get it synchronously easily here 
                // without refactoring store or assuming ID.
                // WORKAROUND: We assume the new shot will have ID = max(ids) + 1. 
                // Ideally, we'd update the shot description in a separate effect or if addShot returned ID.
                // For now, we'll let the user fill it or add a "last shot" update logic.
                // Better approach: Let the agent define content and use update on the *last* shot after adding.
                // Limitation of current synchronous store call pattern. 
                // Let's assume the user just sees a new empty shot for now unless we implement async add.
                // ACTUALLY: We can get the *next* ID deterministically based on current state before adding.
                const nextId = sbShots.length > 0 ? Math.max(...sbShots.map(s => s.id)) + 1 : 1;
                setTimeout(() => {
                    updateShot(nextId, 'action', actionResult.parameters.value);
                }, 100);
            }
        } else if (actionResult.tool === 'remove_shot') {
            if (actionResult.parameters.shotId) {
                deleteShot(actionResult.parameters.shotId);
            }
        } else if (actionResult.tool === 'set_global') {
            if (actionResult.parameters.field && actionResult.parameters.value) {
                setSbGlobalContext(prev => ({
                    ...prev,
                    [actionResult.parameters.field as string]: actionResult.parameters.value
                }));
            }
        }

        // 4. Respond
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: actionResult.reply 
        }]);

    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: "Sorry, I encountered an error trying to process that command." 
        }]);
    } finally {
        setIsLoading(false);
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
            Auto-Director
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700" aria-label="Close chat">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
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
          {isLoading && (
             <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-bl-none flex items-center gap-2">
                <Icon name="spinner" className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-xs italic text-slate-400">Processing command...</span>
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
              placeholder="e.g. Change Shot 2 to a drone shot..."
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
