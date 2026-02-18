import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  return {
    default: function jsPDF() {
      return mockDoc;
    },
  };
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
  return {
    default: function JSZip() {
      return mockZip;
    },
  };
});

import {
  validateExportData,
  getExportQueue,
  clearCompletedJobs,
  cancelExport,
  getExportStatus,
  downloadExport,
  quickExport,
  queueExport,
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

    it('should use default filename from job name and format', () => {
      let downloadName = '';
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        set href(_v: string) {
          /* no-op */
        },
        set download(v: string) {
          downloadName = v;
        },
        click: vi.fn(),
      } as unknown as HTMLAnchorElement);

      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      global.URL.revokeObjectURL = vi.fn();

      const job: ExportJob = {
        id: 'test-job',
        name: 'MyExport',
        format: 'csv',
        data: {},
        status: 'completed',
        progress: 100,
        result: new Blob(['test']),
        createdAt: Date.now(),
      };

      downloadExport(job);
      expect(downloadName).toBe('MyExport.csv');

      mockCreateElement.mockRestore();
    });
  });

  describe('quickExport', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let mockCreateElement: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockClick = vi.fn();
      mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        set href(_v: string) {
          /* no-op */
        },
        set download(_v: string) {
          /* no-op */
        },
        click: mockClick,
      } as unknown as HTMLAnchorElement);
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      mockCreateElement.mockRestore();
    });

    it('should export JSON format', async () => {
      await quickExport({ key: 'value' }, 'json', 'test.json');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export TXT format with string data', async () => {
      await quickExport('plain text content', 'txt', 'test.txt');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export TXT format with prompt object', async () => {
      await quickExport({ prompt: 'A cinematic shot' }, 'txt', 'prompt.txt');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export TXT format with generic object (fallback to JSON)', async () => {
      await quickExport({ foo: 'bar' }, 'txt', 'obj.txt');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export CSV format with array of objects', async () => {
      const data = [
        { name: 'Shot 1', camera: 'wide' },
        { name: 'Shot 2', camera: 'close' },
      ];
      await quickExport(data, 'csv', 'shots.csv');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export CSV format with values needing escaping', async () => {
      const data = [{ name: 'Shot "A"', desc: 'a,b,c' }];
      await quickExport(data, 'csv', 'escaped.csv');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export CSV format with single object', async () => {
      await quickExport({ key1: 'val1', key2: 'val2' }, 'csv', 'single.csv');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export CSV format with empty array', async () => {
      await quickExport([], 'csv', 'empty.csv');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export Markdown format with all fields', async () => {
      const data = {
        title: 'My Project',
        prompt: 'A dramatic scene',
        params: { style: 'cinematic', duration: '5s' },
        storyboard: {
          shots: [
            { action: 'Pan left', camera: 'wide', duration: 3 },
            { action: 'Zoom in', camera: 'close' },
          ],
        },
      };
      await quickExport(data, 'markdown', 'project.md');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export Markdown format without optional fields', async () => {
      await quickExport({ title: 'Minimal' }, 'markdown', 'minimal.md');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export PDF format with prompt and params', async () => {
      const data = {
        title: 'PDF Export',
        prompt: 'A beautiful sunset',
        params: { style: 'warm', aspect: '16:9' },
      };
      await quickExport(data, 'pdf', 'export.pdf');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export PDF format without title (uses default)', async () => {
      await quickExport({}, 'pdf', 'notitle.pdf');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export XML format with nested objects', async () => {
      const data = {
        project: { name: 'Test', settings: { quality: 'high' } },
        tags: ['cinematic', 'dramatic'],
        count: 42,
        empty: null,
      };
      await quickExport(data, 'xml', 'export.xml');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export XML format with array of primitives', async () => {
      const data = { items: [1, 2, 3] };
      await quickExport(data, 'xml', 'array.xml');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should export ZIP format', async () => {
      const data = { prompt: 'A scene', title: 'Test' };
      await quickExport(data, 'zip', 'archive.zip');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should throw for unsupported format', async () => {
      await expect(quickExport({}, 'unsupported' as ExportFormat, 'bad.ext')).rejects.toThrow(
        'Unsupported export format',
      );
    });
  });

  describe('queueExport', () => {
    it('should return a job ID', async () => {
      const id = await queueExport('TestJob', { test: true }, { format: 'json' });
      expect(id).toMatch(/^export-/);
    });

    it('should process queued JSON export', async () => {
      const id = await queueExport('JSONJob', { data: 1 }, { format: 'json' });
      expect(typeof id).toBe('string');
      // Allow queue to process
      await new Promise((r) => setTimeout(r, 50));
    });
  });
});
