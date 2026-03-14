import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./loggerService', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import {
  commandPaletteService,
  MAX_RECENT_COMMANDS,
  type CommandPaletteCommand,
} from './commandPaletteService';

function createCommand(
  id: string,
  label: string,
  overrides: Partial<CommandPaletteCommand> = {},
): CommandPaletteCommand {
  return {
    id,
    label,
    action: vi.fn(),
    ...overrides,
  };
}

describe('commandPaletteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads only string recent command ids from storage', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify(['settings', 42, null, 'help'])),
      setItem: vi.fn(),
    };

    expect(commandPaletteService.loadRecentCommandIds(storage)).toEqual(['settings', 'help']);
  });

  it('returns an empty recent-command list when storage contains malformed json', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('{bad-json'),
      setItem: vi.fn(),
    };

    expect(commandPaletteService.loadRecentCommandIds(storage)).toEqual([]);
  });

  it('deduplicates command ids and caps recent command history', () => {
    const longHistory = Array.from({ length: MAX_RECENT_COMMANDS }, (_, index) => `cmd-${index}`);

    expect(commandPaletteService.getNextRecentCommandIds('cmd-2', longHistory)).toEqual([
      'cmd-2',
      'cmd-0',
      'cmd-1',
      'cmd-3',
      'cmd-4',
    ]);

    expect(commandPaletteService.getNextRecentCommandIds('new-command', longHistory)).toHaveLength(
      MAX_RECENT_COMMANDS,
    );
  });

  it('ranks query matches deterministically by relevance and preserves stable tie order', () => {
    const commands: CommandPaletteCommand[] = [
      createCommand('substring', 'Open Settings'),
      createCommand('exact', 'Settings'),
      createCommand('prefix', 'Settings Panel'),
      createCommand('keyword', 'Open Preferences', { keywords: ['settings'] }),
      createCommand('description', 'Help', { description: 'Read settings documentation' }),
      createCommand('shortcut', 'Quick Actions', { shortcut: 'settings' }),
      createCommand('prefix-2', 'Settings Overview'),
    ];

    expect(commandPaletteService.getDisplayedCommands(commands, 'settings', [])).toEqual([
      commands[1],
      commands[2],
      commands[6],
      commands[0],
      commands[3],
      commands[4],
      commands[5],
    ]);
  });

  it('shows recent commands first when query is empty and groups them separately', () => {
    const commands: CommandPaletteCommand[] = [
      createCommand('history', 'Open History', { group: 'Workspace' }),
      createCommand('settings', 'Open Settings', { group: 'Navigation' }),
      createCommand('help', 'Open Help', { group: 'Navigation' }),
    ];

    const displayed = commandPaletteService.getDisplayedCommands(commands, '', ['settings']);
    const groups = commandPaletteService.getGroupedCommands(displayed, '', ['settings'], 'Recent');

    expect(displayed).toEqual([commands[1], commands[0], commands[2]]);
    expect(groups).toEqual([
      {
        title: 'Recent',
        commands: [{ command: commands[1], index: 0 }],
      },
      {
        title: 'Workspace',
        commands: [{ command: commands[0], index: 1 }],
      },
      {
        title: 'Navigation',
        commands: [{ command: commands[2], index: 2 }],
      },
    ]);
  });

  it('does not create a recent group while actively searching', () => {
    const commands: CommandPaletteCommand[] = [
      createCommand('settings', 'Open Settings', { group: 'Navigation' }),
      createCommand('help', 'Help', { description: 'Settings guide', group: 'Support' }),
    ];

    const displayed = commandPaletteService.getDisplayedCommands(commands, 'settings', [
      'settings',
    ]);
    const groups = commandPaletteService.getGroupedCommands(
      displayed,
      'settings',
      ['settings'],
      'Recent',
    );

    expect(groups.map((group) => group.title)).toEqual(['Navigation', 'Support']);
  });
});
