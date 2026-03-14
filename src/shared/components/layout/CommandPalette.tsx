import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  commandPaletteService,
  type CommandPaletteCommand,
} from '@core/services/commandPaletteService';
import { AppDialog } from '@shared/components/ui/AppDialog';

export type { CommandPaletteCommand } from '@core/services/commandPaletteService';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recentTitle?: string;
  searchPlaceholder: string;
  emptyMessage: string;
  commands: CommandPaletteCommand[];
}

export function CommandPalette({
  isOpen,
  onClose,
  title,
  recentTitle = 'Recent',
  searchPlaceholder,
  emptyMessage,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayedCommands = useMemo(() => {
    return commandPaletteService.getDisplayedCommands(commands, query, recentCommandIds);
  }, [commands, query, recentCommandIds]);

  const groupedCommands = useMemo(() => {
    return commandPaletteService.getGroupedCommands(
      displayedCommands,
      query,
      recentCommandIds,
      recentTitle,
    );
  }, [displayedCommands, query, recentCommandIds, recentTitle]);

  useEffect(() => {
    if (!isOpen) return;

    setQuery('');
    setActiveIndex(0);

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    setRecentCommandIds(commandPaletteService.loadRecentCommandIds());

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex < displayedCommands.length) {
      return;
    }
    setActiveIndex(0);
  }, [activeIndex, displayedCommands.length]);

  const executeCommand = (command: CommandPaletteCommand) => {
    const nextRecents = commandPaletteService.getNextRecentCommandIds(command.id, recentCommandIds);

    setRecentCommandIds(nextRecents);
    commandPaletteService.saveRecentCommandIds(nextRecents);

    command.action();
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (displayedCommands.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % displayedCommands.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (displayedCommands.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + displayedCommands.length) % displayedCommands.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      if (displayedCommands.length === 0) return;
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      if (displayedCommands.length === 0) return;
      setActiveIndex(displayedCommands.length - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const command = displayedCommands[activeIndex];
      if (!command) return;
      executeCommand(command);
    }
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      layer="overlay"
      dialogClassName="max-h-[75vh]"
      bodyClassName="space-y-3"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={searchPlaceholder}
        className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        aria-label={searchPlaceholder}
      />

      <div className="max-h-[48vh] overflow-y-auto rounded-lg border border-slate-700/60 bg-slate-950/40">
        {displayedCommands.length === 0 ? (
          <p className="px-4 py-5 text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          <ul aria-label={title}>
            {groupedCommands.map((group, groupIndex) => (
              <li key={`${group.title}-${groupIndex}`}>
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.title}
                </p>
                <ul>
                  {group.commands.map(({ command, index }) => {
                    const isActive = index === activeIndex;
                    return (
                      <li key={command.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => executeCommand(command)}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                            isActive
                              ? 'bg-cyan-600/20 text-cyan-100'
                              : 'text-slate-200 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{command.label}</div>
                            {command.description && (
                              <div className="truncate text-xs text-slate-400">
                                {command.description}
                              </div>
                            )}
                          </div>
                          {command.shortcut && (
                            <kbd className="rounded border border-slate-600/70 bg-slate-900/80 px-2 py-0.5 text-xs text-slate-300">
                              {command.shortcut}
                            </kbd>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppDialog>
  );
}
