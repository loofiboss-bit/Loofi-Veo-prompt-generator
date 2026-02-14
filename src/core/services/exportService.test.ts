import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['line1']),
    output: vi.fn().mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' })),
  };
  return { default: vi.fn(() => mockDoc) };
});

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// Mock JSZip
vi.mock('jszip', () => {
  const mockZip = {
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' })),
  };
  return { default: vi.fn(() => mockZip) };
});

import {
  validateExportData,
  getExportQueue,
  clearCompletedJobs,
  cancelExport,
  getExportStatus,
  downloadExport,
  type ExportJob,
  type ExportFormat,
} from './exportService';

describe('exportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateExportData', () => {
    it('should return invalid for null data', () => {
      const result = validateExportData(null, 'json');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No data provided');
    });

    it('should return invalid for undefined data', () => {
      const result = validateExportData(undefined, 'json');
      expect(result.isValid).toBe(false);
    });

    it('should validate JSON format accepts any object', () => {
      const result = validateExportData({ test: true }, 'json');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate CSV format requires array or object', () => {
      const resultValid = validateExportData([{ a: 1 }], 'csv');
      expect(resultValid.isValid).toBe(true);

      const resultObj = validateExportData({ a: 1 }, 'csv');
      expect(resultObj.isValid).toBe(true);

      const resultString = validateExportData('text', 'csv');
      expect(resultString.isValid).toBe(false);
      expect(resultString.errors).toContain('CSV export requires array or object data');
    });

    it('should validate PDF format requires object', () => {
      const resultValid = validateExportData({ title: 'Test' }, 'pdf');
      expect(resultValid.isValid).toBe(true);

      const resultString = validateExportData('text', 'pdf');
      expect(resultString.isValid).toBe(false);
    });

    it('should accept markdown format with any truthy data', () => {
      const result = validateExportData('some text', 'markdown');
      expect(result.isValid).toBe(true);
    });

    it.each<ExportFormat>(['json', 'txt', 'markdown', 'xml', 'zip'])(
      'should accept %s format with object data',
      (format) => {
        const result = validateExportData({ data: true }, format);
        expect(result.isValid).toBe(true);
      },
    );
  });

  describe('getExportQueue', () => {
    it('should return an array', () => {
      const queue = getExportQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should return a copy (not original reference)', () => {
      const queue1 = getExportQueue();
      const queue2 = getExportQueue();
      expect(queue1).not.toBe(queue2);
    });
  });

  describe('getExportStatus', () => {
    it('should return null for non-existent job', () => {
      const status = getExportStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });

  describe('clearCompletedJobs', () => {
    it('should not throw when queue is empty', () => {
      expect(() => clearCompletedJobs()).not.toThrow();
    });
  });

  describe('cancelExport', () => {
    it('should return false for non-existent job', () => {
      const result = cancelExport('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('downloadExport', () => {
    it('should throw when job has no result', () => {
      const job: ExportJob = {
        id: 'test-job',
        name: 'Test',
        format: 'json',
        data: {},
        status: 'queued',
        progress: 0,
        createdAt: Date.now(),
      };

      expect(() => downloadExport(job)).toThrow('Export job has no result');
    });

    it('should create download link when job has result', () => {
      const mockClick = vi.fn();
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        set href(_v: string) {
          /* no-op */
        },
        set download(_v: string) {
          /* no-op */
        },
        click: mockClick,
      } as unknown as HTMLAnchorElement);

      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const job: ExportJob = {
        id: 'test-job',
        name: 'Test',
        format: 'json',
        data: {},
        status: 'completed',
        progress: 100,
        result: new Blob(['test']),
        createdAt: Date.now(),
        completedAt: Date.now(),
      };

      downloadExport(job, 'test-export.json');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      mockCreateElement.mockRestore();
    });
  });
});
