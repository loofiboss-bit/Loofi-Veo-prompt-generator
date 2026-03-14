import { logger } from './loggerService';

export const RECENT_COMMANDS_KEY = 'command-palette-recent';
export const MAX_RECENT_COMMANDS = 5;

const DEFAULT_GROUP_TITLE = 'Commands';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface CommandPaletteCommand {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  group?: string;
  keywords?: string[];
  action: () => void;
}

export interface CommandPaletteCommandGroup {
  title: string;
  commands: Array<{ command: CommandPaletteCommand; index: number }>;
}

interface RankedCommand {
  command: CommandPaletteCommand;
  index: number;
  score: number;
}

class CommandPaletteService {
  loadRecentCommandIds(storage: StorageLike | null = this.getBrowserStorage()): string[] {
    if (!storage) {
      return [];
    }

    try {
      const raw = storage.getItem(RECENT_COMMANDS_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return this.sanitizeRecentCommandIds(parsed);
    } catch (error) {
      logger.warn('Command palette recent-command storage read failed', {
        error,
      });
      return [];
    }
  }

  saveRecentCommandIds(
    recentCommandIds: string[],
    storage: StorageLike | null = this.getBrowserStorage(),
  ): void {
    if (!storage) {
      return;
    }

    try {
      storage.setItem(
        RECENT_COMMANDS_KEY,
        JSON.stringify(this.sanitizeRecentCommandIds(recentCommandIds)),
      );
    } catch (error) {
      logger.warn('Command palette recent-command storage write failed', {
        error,
      });
    }
  }

  getNextRecentCommandIds(commandId: string, recentCommandIds: string[]): string[] {
    return this.sanitizeRecentCommandIds([
      commandId,
      ...recentCommandIds.filter((id) => id !== commandId),
    ]).slice(0, MAX_RECENT_COMMANDS);
  }

  getDisplayedCommands(
    commands: CommandPaletteCommand[],
    query: string,
    recentCommandIds: string[],
  ): CommandPaletteCommand[] {
    const normalizedQuery = this.normalizeQuery(query);

    if (!normalizedQuery) {
      if (recentCommandIds.length === 0) {
        return commands;
      }

      const recents = recentCommandIds
        .map((recentId) => commands.find((command) => command.id === recentId))
        .filter((command): command is CommandPaletteCommand => Boolean(command));

      const recentIdsSet = new Set(recents.map((command) => command.id));
      const remaining = commands.filter((command) => !recentIdsSet.has(command.id));

      return [...recents, ...remaining];
    }

    return commands
      .map((command, index) => ({
        command,
        index,
        score: this.getSearchScore(command, normalizedQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.index - right.index;
      })
      .map((item) => item.command);
  }

  getGroupedCommands(
    displayedCommands: CommandPaletteCommand[],
    query: string,
    recentCommandIds: string[],
    recentTitle: string,
  ): CommandPaletteCommandGroup[] {
    const hasQuery = this.normalizeQuery(query).length > 0;
    const result: CommandPaletteCommandGroup[] = [];
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

    const groups = new Map<string, RankedCommand[]>();

    remainingItems.forEach((command, index) => {
      const groupName = command.group ?? DEFAULT_GROUP_TITLE;
      const existing = groups.get(groupName) ?? [];
      existing.push({ command, index, score: 0 });
      groups.set(groupName, existing);
    });

    for (const [groupTitle, groupCommands] of groups.entries()) {
      result.push({
        title: groupTitle,
        commands: groupCommands.map(({ command }) => ({ command, index: runningIndex++ })),
      });
    }

    return result;
  }

  private getSearchScore(command: CommandPaletteCommand, normalizedQuery: string): number {
    const label = this.normalizeQuery(command.label);
    const description = this.normalizeQuery(command.description ?? '');
    const shortcut = this.normalizeQuery(command.shortcut ?? '');
    const keywords = (command.keywords ?? []).map((keyword) => this.normalizeQuery(keyword));

    if (label === normalizedQuery) {
      return 500;
    }

    if (label.startsWith(normalizedQuery)) {
      return 400;
    }

    if (label.includes(normalizedQuery)) {
      return 300;
    }

    if (keywords.some((keyword) => keyword.includes(normalizedQuery))) {
      return 200;
    }

    if (description.includes(normalizedQuery)) {
      return 150;
    }

    if (shortcut.includes(normalizedQuery)) {
      return 100;
    }

    return 0;
  }

  private sanitizeRecentCommandIds(values: unknown[]): string[] {
    return values.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
  }

  private normalizeQuery(value: string): string {
    return value.trim().toLowerCase();
  }

  private getBrowserStorage(): StorageLike | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      return window.localStorage;
    } catch {
      return null;
    }
  }
}

export const commandPaletteService = new CommandPaletteService();
