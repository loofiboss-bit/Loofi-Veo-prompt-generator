import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryStepper, type DeliveryStepperProps } from './DeliveryStepper';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const props: DeliveryStepperProps = {
  busy: false,
  running: false,
  anyBatchRunning: false,
  capabilitiesAvailable: true,
  hasDiagnostics: true,
  isDiagnosticCurrent: true,
  hasPreview: true,
  isPreviewCurrent: true,
  hasExportedJob: true,
  hasSavedJob: false,
  batchFormatsCount: 1,
  buttonClass: '',
  onCheck: vi.fn(),
  onReview: vi.fn(),
  onExport: vi.fn(),
  onBatchExport: vi.fn(),
  onCancel: vi.fn(),
};

describe('delivery steps', () => {
  it('marks rendering complete without claiming the output was saved', () => {
    const { rerender } = render(<DeliveryStepper {...props} />);
    const nav = screen.getByRole('navigation', { name: 'Delivery steps' });
    expect(within(nav).getByText('Export video').parentElement).toHaveTextContent('✓');
    expect(within(nav).getByText('Save file').parentElement).not.toHaveTextContent('✓');
    rerender(<DeliveryStepper {...props} hasSavedJob />);
    expect(within(nav).getByText('Save file').parentElement).toHaveTextContent('✓');
  });
});
