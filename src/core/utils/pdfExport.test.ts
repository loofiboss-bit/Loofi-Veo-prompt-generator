import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jsPDF and autoTable before imports
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockRoundedRect = vi.fn();
const mockSetFont = vi.fn();
const mockSetPage = vi.fn();
const mockGetNumberOfPages = vi.fn().mockReturnValue(1);

vi.mock('jspdf', () => {
  class MockJsPDF {
    text = mockText;
    save = mockSave;
    setFontSize = mockSetFontSize;
    setTextColor = mockSetTextColor;
    setDrawColor = mockSetDrawColor;
    setFillColor = mockSetFillColor;
    roundedRect = mockRoundedRect;
    setFont = mockSetFont;
    setPage = mockSetPage;
    getNumberOfPages = mockGetNumberOfPages;
    internal = {
      pageSize: { width: 210, height: 297 },
    };
  }
  return { default: MockJsPDF };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

import { generateShotList } from './pdfExport';

describe('generateShotList', () => {
  const mockShots = [
    { id: 1, action: 'Walking through corridor', camera: 'Tracking shot' },
    { id: 2, action: 'Close-up on face', camera: 'Close-up' },
  ];

  const mockContext = {
    style: 'Cinematic noir',
    character: 'Detective Smith',
    setting: 'Dark alley at night',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNumberOfPages.mockReturnValue(1);
  });

  it('should generate a PDF with the default project name', () => {
    generateShotList(mockShots, mockContext);
    expect(mockSave).toHaveBeenCalledWith('veo-production-shotlist.pdf');
  });

  it('should use custom project name for filename', () => {
    generateShotList(mockShots, mockContext, 'My Movie');
    expect(mockSave).toHaveBeenCalledWith('my-movie-shotlist.pdf');
  });

  it('should render title text', () => {
    generateShotList(mockShots, mockContext, 'Test');
    expect(mockText).toHaveBeenCalledWith(
      'Production Shot List',
      expect.any(Number),
      20,
      expect.any(Object),
    );
  });

  it('should render global context values', () => {
    generateShotList(mockShots, mockContext);
    expect(mockSetFont).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalled();
  });

  it('should set appropriate font sizes', () => {
    generateShotList(mockShots, mockContext);
    expect(mockSetFontSize).toHaveBeenCalledWith(22);
    expect(mockSetFontSize).toHaveBeenCalledWith(12);
    expect(mockSetFontSize).toHaveBeenCalledWith(14);
    expect(mockSetFontSize).toHaveBeenCalledWith(10);
  });

  it('should handle empty shots array', () => {
    generateShotList([], mockContext);
    expect(mockSave).toHaveBeenCalled();
  });

  it('should sanitize special characters in project name for filename', () => {
    generateShotList(mockShots, mockContext, 'Hello World! #1');
    expect(mockSave).toHaveBeenCalledWith('hello-world---1-shotlist.pdf');
  });

  it('should add footer to each page', () => {
    mockGetNumberOfPages.mockReturnValue(2);
    generateShotList(mockShots, mockContext);
    expect(mockSetPage).toHaveBeenCalledWith(1);
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });
});
