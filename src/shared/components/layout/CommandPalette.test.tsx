import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CommandPalette, type CommandPaletteCommand } from './CommandPalette';

function createCommands(overrides: Partial<CommandPaletteCommand>[] = []): CommandPaletteCommand[] {
  const base: CommandPaletteCommand[] = [
    {
      id: 'search',
      label: 'Open Search',
      description: 'Find content',
      shortcut: 'Ctrl+F',
      action: vi.fn(),
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Configure app',
      shortcut: 'Ctrl+,',
      action: vi.fn(),
    },
  ];

  return base.map((item, index) => ({ ...item, ...(overrides[index] ?? {}) }));
}

describe('CommandPalette', () => {
  beforeEach(() => {
    localStorage.removeItem('command-palette-recent');
  });

  it('renders command groups', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands([{ group: 'Navigation' }, { group: 'Workspace' }])}
      />,
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CommandPalette
        isOpen={false}
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters commands by search query', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Type a command...'), {
      target: { value: 'settings' },
    });

    expect(screen.getByText('Open Settings')).toBeInTheDocument();
    expect(screen.queryByText('Open Search')).not.toBeInTheDocument();
  });

  it('ranks matching commands deterministically for search queries', () => {
    const commands: CommandPaletteCommand[] = [
      {
        id: 'substring',
        label: 'Open Settings',
        description: 'Go to preferences',
        action: vi.fn(),
      },
      {
        id: 'exact',
        label: 'Settings',
        description: 'Exact match',
        action: vi.fn(),
      },
      {
        id: 'prefix',
        label: 'Settings Panel',
        description: 'Prefix match',
        action: vi.fn(),
      },
      {
        id: 'keyword',
        label: 'Open Preferences',
        keywords: ['settings'],
        action: vi.fn(),
      },
      {
        id: 'description',
        label: 'Help',
        description: 'Read settings documentation',
        action: vi.fn(),
      },
    ];

    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    fireEvent.change(screen.getByLabelText('Type a command...'), {
      target: { value: 'settings' },
    });

    const expectedLabels = [
      'SettingsExact match',
      'Settings PanelPrefix match',
      'Open SettingsGo to preferences',
      'Open Preferences',
      'HelpRead settings documentation',
    ];

    const visibleCommandButtons = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((label) => expectedLabels.includes(label));

    expect(visibleCommandButtons).toEqual(expectedLabels);
  });

  it('executes active command on Enter and closes palette', () => {
    const onClose = vi.fn();
    const commands = createCommands();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    const input = screen.getByLabelText('Type a command...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(commands[1].action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when Escape is pressed in search input', () => {
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Type a command...'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows recently executed commands first after reopening', () => {
    const onClose = vi.fn();
    const commands = createCommands();

    const { rerender } = render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    fireEvent.click(screen.getByText('Open Settings'));

    rerender(
      <CommandPalette
        isOpen={false}
        onClose={onClose}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    rerender(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    expect(screen.getByText('Recent')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.some((button) => button.textContent?.includes('Open Settings'))).toBe(true);
  });

  it('hides the recent section while a search query is active', () => {
    localStorage.setItem('command-palette-recent', JSON.stringify(['settings']));

    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Type a command...'), {
      target: { value: 'settings' },
    });

    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
  });

  it('shows empty message when no command matches', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Type a command...'), {
      target: { value: 'no-match' },
    });

    expect(screen.getByText('No commands')).toBeInTheDocument();
  });

  it('focuses the close button when opened', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const closeButton = within(dialog).getByLabelText('Close dialog');
    expect(closeButton).toHaveFocus();
  });

  it('cycles focus to first focusable element when tabbing from the last item', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const lastCommandButton = screen.getByRole('button', { name: /Open Settings/i });
    lastCommandButton.focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(within(dialog).getByLabelText('Close dialog')).toHaveFocus();
  });

  it('cycles focus to last focusable element on Shift+Tab from first element', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const closeButton = within(dialog).getByLabelText('Close dialog');
    const lastCommandButton = screen.getByRole('button', { name: /Open Settings/i });

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(lastCommandButton).toHaveFocus();
  });

  it('does not execute or close when Enter is pressed with no matching command', () => {
    const onClose = vi.fn();
    const commands = createCommands();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    const input = screen.getByLabelText('Type a command...');
    fireEvent.change(input, { target: { value: 'definitely-no-match' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(commands[0].action).not.toHaveBeenCalled();
    expect(commands[1].action).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('recovers gracefully when recent commands storage is malformed JSON', () => {
    localStorage.setItem('command-palette-recent', '{not-valid-json');

    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    expect(screen.getByText('Open Search')).toBeInTheDocument();
    expect(screen.getByText('Open Settings')).toBeInTheDocument();
  });

  it('ignores non-string entries in recent commands storage', () => {
    localStorage.setItem('command-palette-recent', JSON.stringify(['settings', 123, null]));

    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        title="Command Palette"
        recentTitle="Recent"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={createCommands()}
      />,
    );

    expect(screen.getByText('Recent')).toBeInTheDocument();
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.some((button) => button.textContent?.includes('Open Settings'))).toBe(true);
  });

  it('executes commands even when recent-command storage writes fail', () => {
    const onClose = vi.fn();
    const commands = createCommands();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    fireEvent.click(screen.getByText('Open Search'));

    expect(commands[0].action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();

    setItemSpy.mockRestore();
  });

  it('wraps selection to last command on ArrowUp from first item', () => {
    const onClose = vi.fn();
    const commands = createCommands();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    const input = screen.getByLabelText('Type a command...');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(commands[1].action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('moves selection to last command with End key', () => {
    const onClose = vi.fn();
    const commands = createCommands();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    const input = screen.getByLabelText('Type a command...');

    fireEvent.keyDown(input, { key: 'End' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commands[1].action).toHaveBeenCalledOnce();
  });

  it('moves selection to first command with Home key', () => {
    const onClose = vi.fn();
    const commands = createCommands();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        title="Command Palette"
        searchPlaceholder="Type a command..."
        emptyMessage="No commands"
        commands={commands}
      />,
    );

    const input = screen.getByLabelText('Type a command...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    fireEvent.keyDown(input, { key: 'Home' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commands[0].action).toHaveBeenCalledOnce();
  });
});
