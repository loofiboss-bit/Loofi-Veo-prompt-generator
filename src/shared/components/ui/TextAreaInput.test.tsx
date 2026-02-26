import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test-utils';
import TextAreaInput from './TextAreaInput';

const { appState, locationState } = vi.hoisted(() => ({
  appState: {
    characterBank: [
      {
        id: 'char-1',
        name: 'Alice',
        wardrobe: 'Jacket',
        attributes: { age: 'Adult', gender: 'Female' },
      },
    ],
    variables: { HERO_NAME: 'Alice Johnson' },
  },
  locationState: {
    locations: [{ id: 'loc-1', name: 'City Park', description: 'A bright city park.' }],
  },
}));

vi.mock('./Tooltip', () => ({
  default: ({ text }: { text: string }) => <span data-testid="tooltip">{text}</span>,
}));

vi.mock('./Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock('@shared/components/AutocompleteMenu', () => ({
  default: ({
    items,
    onSelect,
    onClose,
  }: {
    items: Array<{ id: string; label: string; type: string }>;
    onSelect: (item: { id: string; label: string; type: string; description?: string }) => void;
    onClose: () => void;
  }) => (
    <div data-testid="autocomplete-menu">
      {items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item)}>
          {item.label}
        </button>
      ))}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => appState,
}));

vi.mock('@core/store/useLocationStore', () => ({
  useLocationStore: () => locationState,
}));

describe('TextAreaInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label, info tooltip, and character counter', () => {
    render(
      <TextAreaInput
        label="Prompt"
        name="prompt"
        value="hello"
        onChange={vi.fn()}
        maxLength={100}
        info="Helpful info"
      />,
    );

    expect(screen.getByText('Prompt')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Helpful info');
    expect(screen.getByText('5 / 100')).toBeInTheDocument();
  });

  it('shows error text and marks textarea invalid', () => {
    render(
      <TextAreaInput
        label="Prompt"
        name="prompt"
        value=""
        onChange={vi.fn()}
        error="Prompt is required"
      />,
    );

    const textarea = screen.getByRole('textbox');
    expect(screen.getByText('Prompt is required')).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<TextAreaInput label="Prompt" name="prompt" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { name: 'prompt', value: 'New prompt', selectionStart: 10 },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('calls onEnhance when magic button is clicked', () => {
    const onEnhance = vi.fn();
    render(
      <TextAreaInput
        label="Prompt"
        name="prompt"
        value="Some prompt"
        onChange={vi.fn()}
        onEnhance={onEnhance}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /magic/i }));
    expect(onEnhance).toHaveBeenCalledTimes(1);
  });

  it('shows autocomplete for @ trigger and selects an item', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    render(<TextAreaInput label="Prompt" name="prompt" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { name: 'prompt', value: '@ali', selectionStart: 4 },
    });

    expect(screen.getByTestId('autocomplete-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));
    vi.runAllTimers();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].target.value).toContain('Alice');

    vi.useRealTimers();
  });

  it('shows autocomplete for # trigger and inserts location text on select', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    render(<TextAreaInput label="Prompt" name="prompt" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { name: 'prompt', value: '#city', selectionStart: 5 },
    });

    expect(screen.getByTestId('autocomplete-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'City Park' }));
    vi.runAllTimers();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].target.value).toContain('City Park');

    vi.useRealTimers();
  });

  it('shows autocomplete for {{ variable trigger and inserts wrapped variable token', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    render(<TextAreaInput label="Prompt" name="prompt" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { name: 'prompt', value: '{{hero', selectionStart: 6 },
    });

    expect(screen.getByTestId('autocomplete-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'HERO_NAME' }));
    vi.runAllTimers();

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].target.value).toContain('{{HERO_NAME}}');

    vi.useRealTimers();
  });

  it('closes autocomplete when Escape is pressed', () => {
    render(<TextAreaInput label="Prompt" name="prompt" value="" onChange={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { name: 'prompt', value: '@ali', selectionStart: 4 },
    });
    expect(screen.getByTestId('autocomplete-menu')).toBeInTheDocument();

    fireEvent.keyUp(textarea, { key: 'Escape' });

    expect(screen.queryByTestId('autocomplete-menu')).not.toBeInTheDocument();
  });

  it('forwards blur events to onBlur callback', () => {
    vi.useFakeTimers();
    const onBlur = vi.fn();

    render(
      <TextAreaInput
        label="Prompt"
        name="prompt"
        value="blur test"
        onChange={vi.fn()}
        onBlur={onBlur}
      />,
    );

    fireEvent.blur(screen.getByRole('textbox'));
    vi.runAllTimers();

    expect(onBlur).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
