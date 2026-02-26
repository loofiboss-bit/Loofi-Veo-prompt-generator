import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppDialog } from '@shared/components/ui/AppDialog';

const RECENT_COMMANDS_KEY = 'command-palette-recent';
const MAX_RECENT_COMMANDS = 5;

export interface CommandPaletteCommand {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  group?: string;
  action: () => void;
}

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

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) => {
      const haystacks = [command.label, command.description ?? '', command.shortcut ?? '']
        .join(' ')
        .toLowerCase();
      return haystacks.includes(normalizedQuery);
    });
  }, [commands, query]);

  const displayedCommands = useMemo(() => {
    const hasQuery = query.trim().length > 0;
    if (hasQuery) {
      return filteredCommands;
    }

    if (recentCommandIds.length === 0) {
      return filteredCommands;
    }

    const recents = recentCommandIds
      .map((recentId) => filteredCommands.find((command) => command.id === recentId))
      .filter((command): command is CommandPaletteCommand => Boolean(command));

    const recentIdsSet = new Set(recents.map((command) => command.id));
    const remaining = filteredCommands.filter((command) => !recentIdsSet.has(command.id));

    return [...recents, ...remaining];
  }, [filteredCommands, query, recentCommandIds]);

  const groupedCommands = useMemo(() => {
    const hasQuery = query.trim().length > 0;
    const result: Array<{
      title: string;
      commands: Array<{ command: CommandPaletteCommand; index: number }>;
    }> = [];

    let runningIndex = 0;

    if (!hasQuery && recentCommandIds.length > 0) {
      const recentSet = new Set(recentCommandIds);
      const recentItems = displayedCommands.filter((command) => recentSet.has(command.id));
      if (recentItems.length > 0) {
        result.push({
          title: recentTitle,
          commands: recentItems.map((command) => ({ command, index: runningIndex++ })),
        });
      }
    }

    const remainingItems =
      !hasQuery && recentCommandIds.length > 0
        ? displayedCommands.filter((command) => !recentCommandIds.includes(command.id))
        : displayedCommands;

    const groups = new Map<string, CommandPaletteCommand[]>();
    for (const command of remainingItems) {
      const groupName = command.group ?? 'Commands';
      const existing = groups.get(groupName) ?? [];
      existing.push(command);
      groups.set(groupName, existing);
    }

    for (const [groupTitle, groupCommands] of groups.entries()) {
      result.push({
        title: groupTitle,
        commands: groupCommands.map((command) => ({ command, index: runningIndex++ })),
      });
    }

    return result;
  }, [displayedCommands, query, recentCommandIds, recentTitle]);

  useEffect(() => {
    if (!isOpen) return;

    setQuery('');
    setActiveIndex(0);

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {
      const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setRecentCommandIds(parsed.filter((value): value is string => typeof value === 'string'));
        }
      }
    } catch {
      setRecentCommandIds([]);
    }

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex < displayedCommands.length) {
      return;
    }
    setActiveIndex(0);
  }, [activeIndex, displayedCommands.length]);

  const executeCommand = (command: CommandPaletteCommand) => {
    const nextRecents = [command.id, ...recentCommandIds.filter((id) => id !== command.id)].slice(
      0,
      MAX_RECENT_COMMANDS,
    );

    setRecentCommandIds(nextRecents);
    try {
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(nextRecents));
    } catch {
      // Ignore storage write failures (private mode/quota)
    }

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
