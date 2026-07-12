import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SafeModeRecovery } from './SafeModeRecovery';

describe('SafeModeRecovery', () => {
  it('offers bounded recovery actions and task-specific help', () => {
    const onExit = vi.fn();
    const onContinue = vi.fn();
    localStorage.setItem('ui-settings', 'broken');
    localStorage.setItem('veo_project_keep', 'project');
    render(
      <SafeModeRecovery
        status={{ enabled: true, reason: 'crash-loop', crashCount: 3 }}
        onExit={onExit}
        onContinue={onContinue}
      />,
    );
    expect(screen.getByRole('alertdialog')).toHaveTextContent('3 repeated starts failed');
    expect(screen.getAllByRole('link')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /continue in safe mode/i }));
    expect(onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /reset app settings/i }));
    expect(localStorage.getItem('ui-settings')).toBeNull();
    expect(localStorage.getItem('veo_project_keep')).toBe('project');
    expect(onExit).toHaveBeenCalledOnce();
  });
});
