
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Chat } from '@google/genai';
import * as geminiService from '../services/geminiService';
import { ChatMessage } from '../types';
import Icon from './Icon';

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with a welcome message
    setMessages([{
        id: 'initial',
        role: 'model',
        text: 'Hello! How can I help you architect your next prompt?'
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

    if (!chatSessionRef.current) {
        chatSessionRef.current = geminiService.createChat();
    }
    
    let fullResponse = '';
    const modelResponseId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: modelResponseId, role: 'model', text: '...' }]);

    try {
        const stream = await geminiService.sendMessageToChatStream(chatSessionRef.current, input);
        
        for await (const chunk of stream) {
            fullResponse += chunk.text;
            setMessages(prev => prev.map(msg => 
                msg.id === modelResponseId ? { ...msg, text: fullResponse } : msg
            ));
        }
    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => prev.map(msg => 
            msg.id === modelResponseId ? { ...msg, text: "Sorry, I encountered an error. Please try again." } : msg
        ));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`fixed bottom-4 right-4 z-[90] transition-all duration-300 ${isOpen ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
          aria-label="Open AI Chat Assistant"
        >
          <Icon name="chat" className="w-8 h-8" />
        </button>
      </div>

      <div className={`fixed bottom-4 right-4 z-[90] w-[calc(100%-2rem)] max-w-md h-[70vh] max-h-[600px] flex flex-col bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">AI Assistant</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700" aria-label="Close chat">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-3 py-2 bg-slate-800 text-slate-300">
                <Icon name="spinner" className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-grow bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 p-2 text-sm"
              disabled={isLoading}
            />
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg p-2 disabled:opacity-50" disabled={isLoading || !input.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
