import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AiCoDirectorWidget } from './AiCoDirectorWidget';
import { aiCoDirectorService } from '@core/services/aiCoDirectorService';

describe('AiCoDirectorWidget', () => {
  it('renders minimized floating beacon initially', () => {
    render(<AiCoDirectorWidget defaultExpanded={false} />);

    expect(screen.getByTitle('Open AI Co-Director (Gemini Live)')).toBeInTheDocument();
  });

  it('expands into full co-director window when beacon is clicked', () => {
    render(<AiCoDirectorWidget defaultExpanded={false} />);

    const beacon = screen.getByTitle('Open AI Co-Director (Gemini Live)');
    fireEvent.click(beacon);

    expect(screen.getByText('AI Co-Director')).toBeInTheDocument();
    expect(screen.getByText('Gemini Live')).toBeInTheDocument();
  });

  it('renders quick directives and triggers action when clicked', async () => {
    const sendSpy = vi.spyOn(aiCoDirectorService, 'sendDirective');

    render(<AiCoDirectorWidget defaultExpanded={true} />);

    const quickBtn = screen.getByRole('button', {
      name: 'Byt till 50mm objektiv och motljus',
    });
    expect(quickBtn).toBeInTheDocument();

    fireEvent.click(quickBtn);

    expect(sendSpy).toHaveBeenCalledWith('Byt till 50mm objektiv och motljus');
  });

  it('submits text directive from the input bar', async () => {
    const sendSpy = vi.spyOn(aiCoDirectorService, 'sendDirective');

    render(<AiCoDirectorWidget defaultExpanded={true} />);

    const input = screen.getByPlaceholderText(/Ge regi:/i);
    fireEvent.change(input, { target: { value: 'Lägg till en drönardykning' } });

    const submitBtn = screen.getByTitle('Skicka regianvisning');
    fireEvent.click(submitBtn);

    expect(sendSpy).toHaveBeenCalledWith('Lägg till en drönardykning');
  });

  it('minimizes when minimize button is clicked', () => {
    render(<AiCoDirectorWidget defaultExpanded={true} />);

    const minimizeBtn = screen.getByTitle('Minimize widget');
    fireEvent.click(minimizeBtn);

    expect(screen.getByTitle('Open AI Co-Director (Gemini Live)')).toBeInTheDocument();
    expect(screen.queryByText('Gemini Live')).not.toBeInTheDocument();
  });
});
