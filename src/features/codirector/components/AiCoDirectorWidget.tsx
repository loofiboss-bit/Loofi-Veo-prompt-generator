import React, { useState, useEffect, useRef } from 'react';
import { aiCoDirectorService } from '@core/services/aiCoDirectorService';
import type {
  CoDirectorStatus,
  CoDirectorMessage,
  CoDirectorActionRecord,
} from '@core/types/coDirector';
import Icon from '@shared/components/ui/Icon';
import { logger } from '@core/services/loggerService';

export interface AiCoDirectorWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
}

const QUICK_DIRECTIVES = [
  'Byt till 50mm objektiv och motljus',
  'Lägg till en FPV-drönardykning',
  'Gör scenen dramatisk med djupa skuggor',
  'Ny tagning: kuriren flyr över hustaken',
];

export const AiCoDirectorWidget: React.FC<AiCoDirectorWidgetProps> = ({
  className = '',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [status, setStatus] = useState<CoDirectorStatus>(aiCoDirectorService.getStatus());
  const [messages, setMessages] = useState<CoDirectorMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [actionsLog, setActionsLog] = useState<CoDirectorActionRecord[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to service events
  useEffect(() => {
    const unsubStatus = aiCoDirectorService.onStatusChange(setStatus);
    const unsubMessage = aiCoDirectorService.onMessage((newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });
    const unsubAction = aiCoDirectorService.onAction((newAction) => {
      setActionsLog((prev) => [newAction, ...prev]);
    });

    return () => {
      unsubStatus();
      unsubMessage();
      unsubAction();
    };
  }, []);

  // Auto scroll messages to bottom
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleToggleConnect = async () => {
    if (status === 'disconnected') {
      await aiCoDirectorService.connect();
    } else {
      aiCoDirectorService.disconnect();
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    try {
      await aiCoDirectorService.sendDirective(text);
    } catch (err) {
      logger.warn('Failed to send directive:', err);
    }
  };

  const handleQuickDirective = async (directive: string) => {
    try {
      await aiCoDirectorService.sendDirective(directive);
    } catch (err) {
      logger.warn('Failed to send quick directive:', err);
    }
  };

  return (
    <aside
      aria-label="AI Co-Director"
      className={`fixed bottom-6 right-20 z-50 transition-all ${className}`}
    >
      {/* Minimized Floating Beacon */}
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => {
            setIsExpanded(true);
            if (status === 'disconnected') {
              void aiCoDirectorService.connect();
            }
          }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 via-primary to-purple-600 p-0.5 shadow-xl hover:scale-105 active:scale-95 transition-transform"
          title="Open AI Co-Director (Gemini Live)"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/90 text-cyan-400 group-hover:bg-slate-900/80 transition-colors">
            <Icon name="video" className="text-xl animate-pulse" />
          </div>

          {/* Status Glow Ring */}
          {status === 'listening' && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          )}
          {status === 'thinking' && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 animate-pulse"></span>
            </span>
          )}
        </button>
      ) : (
        /* Expanded Co-Director Window */
        <div className="flex flex-col w-96 max-h-[32rem] rounded-2xl border border-slate-700/80 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                <Icon name="video" className="text-sm" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  AI Co-Director
                  <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-mono text-primary font-normal">
                    Gemini Live
                  </span>
                  {actionsLog.length > 0 && (
                    <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300">
                      {actionsLog.length} {actionsLog.length === 1 ? 'action' : 'actions'}
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      status === 'listening'
                        ? 'bg-emerald-400 animate-pulse'
                        : status === 'thinking'
                          ? 'bg-amber-400 animate-pulse'
                          : status === 'speaking'
                            ? 'bg-purple-400 animate-pulse'
                            : 'bg-slate-500'
                    }`}
                  />
                  <span className="capitalize">
                    {status === 'listening'
                      ? 'Lyssnar (Live)'
                      : status === 'thinking'
                        ? 'Analyserar vision...'
                        : status === 'speaking'
                          ? 'Regisserar...'
                          : 'Frånkopplad'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleConnect}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  status !== 'disconnected'
                    ? 'text-emerald-400 hover:bg-emerald-950/50'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title={status !== 'disconnected' ? 'Disconnect' : 'Connect'}
              >
                <Icon name={status !== 'disconnected' ? 'activity' : 'play'} className="text-sm" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Minimize widget"
              >
                <Icon name="chevron-down" className="text-sm" />
              </button>
            </div>
          </div>

          {/* Soundwave Visualizer Bar */}
          <div className="flex items-center justify-center gap-1 h-6 bg-slate-900/40 border-b border-slate-800/60 px-4">
            {[4, 8, 14, 20, 12, 18, 24, 15, 9, 17, 11, 6].map((h, idx) => (
              <span
                key={idx}
                style={{
                  height:
                    status === 'speaking'
                      ? `${Math.max(4, h * 1.1)}px`
                      : status === 'listening'
                        ? `${Math.max(3, (h % 6) + 3)}px`
                        : '3px',
                }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  status === 'speaking'
                    ? 'bg-purple-400'
                    : status === 'listening'
                      ? 'bg-cyan-400'
                      : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs min-h-[14rem] max-h-[18rem]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                <Icon name="video" className="text-3xl text-cyan-400/40" />
                <p className="text-xs">
                  Säg vad du vill regissera eller klicka på en snabbvalsanvisning nedan.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user'
                      ? 'items-end'
                      : msg.sender === 'system'
                        ? 'items-center text-center'
                        : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : msg.sender === 'system'
                          ? 'bg-slate-900 text-slate-400 border border-slate-800 text-[11px]'
                          : 'bg-slate-800/90 text-slate-100 border border-slate-700/60'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>

                  {/* Render Mutation Action Badges */}
                  {msg.executedActions && msg.executedActions.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1 w-full max-w-[85%]">
                      {msg.executedActions.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center gap-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/50 px-2 py-1 text-[11px] text-cyan-300 font-mono"
                        >
                          <Icon name="sparkles" className="text-xs text-amber-400 shrink-0" />
                          <span className="truncate">{act.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Directives Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/60 no-scrollbar">
            {QUICK_DIRECTIVES.map((directive, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickDirective(directive)}
                className="shrink-0 rounded-full border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {directive}
              </button>
            ))}
          </div>

          {/* Interactive Input Form */}
          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 border-t border-slate-800 bg-slate-900/90 p-2.5"
          >
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                !isMuted
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={!isMuted ? 'Mute microphone' : 'Unmute microphone'}
            >
              <Icon name="video" className="text-xs" />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ge regi: 'byt till 50mm och motljus'..."
              className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-xs"
              title="Skicka regianvisning"
            >
              <Icon name="arrow-up-right" className="text-xs" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
