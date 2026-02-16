/**
 * Tabs Component Tests
 * Verifies rendering, tab switching, keyboard navigation, and ARIA attributes.
 */

import React from 'react';
import { render, screen, fireEvent } from '../../../test-utils';
import Tabs from './Tabs';

// Mock Icon to avoid SVG sprite dependency
vi.mock('./Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

const mockTabs = [
  { label: 'First', content: <div>First Content</div> },
  { label: 'Second', content: <div>Second Content</div> },
  { label: 'Third', content: <div>Third Content</div> },
];

describe('Tabs', () => {
  it('renders all tab buttons', () => {
    render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Third' })).toBeInTheDocument();
  });

  it('marks active tab as selected', () => {
    render(<Tabs tabs={mockTabs} activeTabIndex={1} onTabChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows content of active tab only', () => {
    render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={vi.fn()} />);
    expect(screen.getByText('First Content')).toBeInTheDocument();
    expect(screen.queryByText('Second Content')).not.toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const onTabChange = vi.fn();
    const { user } = render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={onTabChange} />);
    await user.click(screen.getByRole('tab', { name: 'Third' }));
    expect(onTabChange).toHaveBeenCalledWith(2);
  });

  it('navigates with ArrowRight key', () => {
    const onTabChange = vi.fn();
    render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={onTabChange} />);
    const firstTab = screen.getByRole('tab', { name: 'First' });
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith(1);
  });

  it('navigates with ArrowLeft key (wraps around)', () => {
    const onTabChange = vi.fn();
    render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={onTabChange} />);
    const firstTab = screen.getByRole('tab', { name: 'First' });
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith(2); // wraps to last
  });

  it('navigates with Home key', () => {
    const onTabChange = vi.fn();
    render(<Tabs tabs={mockTabs} activeTabIndex={2} onTabChange={onTabChange} />);
    const thirdTab = screen.getByRole('tab', { name: 'Third' });
    fireEvent.keyDown(thirdTab, { key: 'Home' });
    expect(onTabChange).toHaveBeenCalledWith(0);
  });

  it('navigates with End key', () => {
    const onTabChange = vi.fn();
    render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={onTabChange} />);
    const firstTab = screen.getByRole('tab', { name: 'First' });
    fireEvent.keyDown(firstTab, { key: 'End' });
    expect(onTabChange).toHaveBeenCalledWith(2);
  });

  it('renders tab with icon when provided', () => {
    const tabsWithIcon = [
      { label: 'Settings', content: <div>Settings</div>, icon: 'settings' as const },
    ];
    render(<Tabs tabs={tabsWithIcon} activeTabIndex={0} onTabChange={vi.fn()} />);
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });

  it('has correct ARIA tabpanel attributes', () => {
    render(<Tabs tabs={mockTabs} activeTabIndex={0} onTabChange={vi.fn()} />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-0');
    expect(panel).toHaveAttribute('id', 'tabpanel-0');
  });

  it('sets correct tabIndex on tabs', () => {
    render(<Tabs tabs={mockTabs} activeTabIndex={1} onTabChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveAttribute('tabindex', '-1');
  });
});
