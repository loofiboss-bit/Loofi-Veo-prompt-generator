/**
 * Enhanced Export Service
 * Handles export operations with retry logic, queue, and progress tracking
 */

import { logger } from './loggerService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

export type ExportFormat = 'json' | 'txt' | 'pdf' | 'csv' | 'markdown' | 'xml' | 'zip';

export interface ExportJob {
  id: string;
  name: string;
  format: ExportFormat;
  data: any;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  result?: Blob;
  createdAt: number;
  completedAt?: number;
}

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  compress?: boolean;
  retryAttempts?: number;
  onProgress?: (progress: number) => void;
}

const exportQueue: ExportJob[] = [];
let isProcessing = false;

/**
 * Add export job to queue
 */
export async function queueExport(
  name: string,
  data: any,
  options: ExportOptions,
): Promise<string> {
  const job: ExportJob = {
    id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    format: options.format,
    data,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  };

  exportQueue.push(job);
  logger.info(`Export job queued: ${name} (${options.format})`);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }

  return job.id;
}

/**
 * Process export queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (exportQueue.length > 0) {
    const job = exportQueue[0];

    try {
      job.status = 'processing';
      logger.debug(`Processing export job: ${job.name}`);

      const result = await performExport(job);

      job.result = result;
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = Date.now();

      logger.info(`Export completed: ${job.name}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Export failed: ${job.name}`, error);
    }

    // Remove from queue
    exportQueue.shift();
  }

  isProcessing = false;
}

/**
 * Perform export with retry logic
 */
async function performExport(job: ExportJob, retryAttempts = 3): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      job.progress = (attempt - 1) * (100 / retryAttempts);

      const blob = await exportByFormat(job.data, job.format);

      return blob;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.warn(`Export attempt ${attempt}/${retryAttempts} failed`, error);

      if (attempt < retryAttempts) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Export failed after all retries');
}

/**
 * Export data by format
 */
async function exportByFormat(data: any, format: ExportFormat): Promise<Blob> {
  switch (format) {
    case 'json':
      return exportAsJSON(data);
    case 'txt':
      return exportAsText(data);
    case 'pdf':
      return exportAsPDF(data);
    case 'csv':
      return exportAsCSV(data);
    case 'markdown':
      return exportAsMarkdown(data);
    case 'xml':
      return exportAsXML(data);
    case 'zip':
      return exportAsZip(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export as JSON
 */
function exportAsJSON(data: any): Blob {
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Export as plain text
 */
function exportAsText(data: any): Blob {
  let text = '';

  if (typeof data === 'string') {
    text = data;
  } else if (data.prompt) {
    text = data.prompt;
  } else {
    text = JSON.stringify(data, null, 2);
  }

  return new Blob([text], { type: 'text/plain' });
}

/**
 * Export as PDF
 */
function exportAsPDF(data: any): Blob {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.text(data.title || 'Veo Studio Export', 20, 20);

  // Add metadata
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

  // Add content
  doc.setFontSize(12);
  let yPos = 45;

  if (data.prompt) {
    doc.text('Prompt:', 20, yPos);
    yPos += 10;

    const splitText = doc.splitTextToSize(data.prompt, 170);
    doc.setFontSize(10);
    doc.text(splitText, 20, yPos);
    yPos += splitText.length * 5 + 10;
  }

  // Add parameters table if available
  if (data.params) {
    autoTable(doc, {
      startY: yPos,
      head: [['Parameter', 'Value']],
      body: Object.entries(data.params).map(([key, value]) => [key, String(value)]),
    });
  }

  return doc.output('blob');
}

/**
 * Export as CSV
 */
function exportAsCSV(data: any): Blob {
  let csv = '';

  if (Array.isArray(data)) {
    // Array of objects
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      csv = headers.join(',') + '\n';

      for (const row of data) {
        const values = headers.map((h) => {
          const value = row[h];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csv += values.join(',') + '\n';
      }
    }
  } else if (typeof data === 'object') {
    // Single object
    csv = 'Key,Value\n';
    for (const [key, value] of Object.entries(data)) {
      csv += `${key},${value}\n`;
    }
  }

  return new Blob([csv], { type: 'text/csv' });
}

/**
 * Export as Markdown
 */
function exportAsMarkdown(data: any): Blob {
  let markdown = '';

  // Title
  markdown += `# ${data.title || 'Veo Studio Export'}\n\n`;

  // Metadata
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

  // Prompt
  if (data.prompt) {
    markdown += `## Prompt\n\n${data.prompt}\n\n`;
  }

  // Parameters
  if (data.params) {
    markdown += `## Parameters\n\n`;
    for (const [key, value] of Object.entries(data.params)) {
      markdown += `- **${key}:** ${value}\n`;
    }
    markdown += '\n';
  }

  // Storyboard
  if (data.storyboard && Array.isArray(data.storyboard.shots)) {
    markdown += `## Storyboard\n\n`;
    for (let i = 0; i < data.storyboard.shots.length; i++) {
      const shot = data.storyboard.shots[i];
      markdown += `### Shot ${i + 1}\n\n`;
      markdown += `- **Action:** ${shot.action}\n`;
      markdown += `- **Camera:** ${shot.camera}\n`;
      if (shot.duration) markdown += `- **Duration:** ${shot.duration}s\n`;
      markdown += '\n';
    }
  }

  return new Blob([markdown], { type: 'text/markdown' });
}

/**
 * Export as XML
 */
function exportAsXML(data: any): Blob {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<export>\n';

  function objectToXML(obj: any, indent = 1): string {
    let result = '';
    const indentStr = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        result += `${indentStr}<${key}>\n`;
        result += objectToXML(value, indent + 1);
        result += `${indentStr}</${key}>\n`;
      } else if (Array.isArray(value)) {
        result += `${indentStr}<${key}>\n`;
        for (const item of value) {
          result += `${indentStr}  <item>\n`;
          if (typeof item === 'object') {
            result += objectToXML(item, indent + 2);
          } else {
            result += `${indentStr}    ${item}\n`;
          }
          result += `${indentStr}  </item>\n`;
        }
        result += `${indentStr}</${key}>\n`;
      } else {
        result += `${indentStr}<${key}>${value}</${key}>\n`;
      }
    }

    return result;
  }

  xml += objectToXML(data);
  xml += '</export>';

  return new Blob([xml], { type: 'application/xml' });
}

/**
 * Export as ZIP archive
 */
async function exportAsZip(data: any): Promise<Blob> {
  const zip = new JSZip();

  // Add JSON file
  zip.file('data.json', JSON.stringify(data, null, 2));

  // Add text file
  if (data.prompt) {
    zip.file('prompt.txt', data.prompt);
  }

  // Add markdown file
  const markdown = await exportAsMarkdown(data);
  zip.file('README.md', markdown);

  // Generate ZIP
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Get export job status
 */
export function getExportStatus(jobId: string): ExportJob | null {
  return exportQueue.find((j) => j.id === jobId) || null;
}

/**
 * Download export result
 */
export function downloadExport(job: ExportJob, filename?: string): void {
  if (!job.result) {
    throw new Error('Export job has no result');
  }

  const name = filename || `${job.name}.${job.format}`;
  const url = URL.createObjectURL(job.result);

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();

  URL.revokeObjectURL(url);
  logger.info(`Downloaded export: ${name}`);
}

/**
 * Quick export (synchronous, no queue)
 */
export async function quickExport(
  data: any,
  format: ExportFormat,
  filename: string,
): Promise<void> {
  try {
    const blob = await exportByFormat(data, format);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
    logger.info(`Quick export completed: ${filename}`);
  } catch (error) {
    logger.error('Quick export failed', error);
    throw error;
  }
}

/**
 * Validate export data
 */
export function validateExportData(
  data: any,
  format: ExportFormat,
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data) {
    errors.push('No data provided');
    return { isValid: false, errors };
  }

  switch (format) {
    case 'csv':
      if (!Array.isArray(data) && typeof data !== 'object') {
        errors.push('CSV export requires array or object data');
      }
      break;

    case 'pdf':
      if (typeof data !== 'object') {
        errors.push('PDF export requires object data');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get export queue
 */
export function getExportQueue(): ExportJob[] {
  return [...exportQueue];
}

/**
 * Clear completed jobs from queue
 */
export function clearCompletedJobs(): void {
  const completed = exportQueue.filter((j) => j.status === 'completed');
  for (const job of completed) {
    const index = exportQueue.indexOf(job);
    if (index > -1) {
      exportQueue.splice(index, 1);
    }
  }
  logger.debug(`Cleared ${completed.length} completed jobs`);
}

/**
 * Cancel export job
 */
export function cancelExport(jobId: string): boolean {
  const index = exportQueue.findIndex((j) => j.id === jobId);
  if (index > -1 && exportQueue[index].status === 'queued') {
    exportQueue.splice(index, 1);
    logger.info(`Cancelled export job: ${jobId}`);
    return true;
  }
  return false;
}
