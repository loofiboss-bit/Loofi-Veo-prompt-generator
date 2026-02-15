/**
 * API Export Modal Component
 * Export prompts in various API formats
 * v1.3.0 - Workflow Integration
 */

import React, { useState } from 'react';
import {
  apiExportService,
  type ExportFormat,
  type CodeSnippet,
} from '@core/services/apiExportService';
import type { HistoryEntry } from '@core/services/historyService';
import Icon from '@shared/components/ui/Icon';

interface ApiExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: HistoryEntry;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ApiExportModal: React.FC<ApiExportModalProps> = ({ isOpen, onClose, entry, addToast }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json-api');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeLinks, setIncludeLinks] = useState(true);
  const [activeTab, setActiveTab] = useState<'export' | 'snippets' | 'postman' | 'openapi'>(
    'export',
  );

  const formats: Array<{ value: ExportFormat; label: string; description: string }> = [
    { value: 'json-api', label: 'JSON:API', description: 'RESTful API specification' },
    { value: 'hal', label: 'HAL', description: 'Hypertext Application Language' },
    { value: 'rest', label: 'REST', description: 'Standard REST API format' },
    { value: 'webhook', label: 'Webhook', description: 'Webhook payload format' },
  ];

  const [exportedData, setExportedData] = useState<string>('');
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>([]);
  const [postmanCollection, setPostmanCollection] = useState<string>('');
  const [openApiSchema, setOpenApiSchema] = useState<string>('');

  // Load data when dependencies change
  React.useEffect(() => {
    const loadExportData = async () => {
      try {
        const data = await apiExportService.exportPrompt(entry, {
          format: selectedFormat,
          includeMetadata,
          includeLinks,
          baseUrl,
        });
        setExportedData(data);
      } catch (_error) {
        setExportedData('// Error generating export');
      }
    };

    const loadSnippets = async () => {
      const snippets = await apiExportService.generateCodeSnippets(entry, baseUrl);
      setCodeSnippets(snippets);
    };

    const loadPostman = async () => {
      const collection = await apiExportService.generatePostmanCollection();
      setPostmanCollection(collection);
    };

    const loadOpenApi = async () => {
      const schema = await apiExportService.generateOpenAPISchema();
      setOpenApiSchema(schema);
    };

    loadExportData();
    loadSnippets();
    loadPostman();
    loadOpenApi();
  }, [entry, selectedFormat, includeMetadata, includeLinks, baseUrl]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied to clipboard!', 'success');
    } catch (_error) {
      addToast('Failed to copy', 'error');
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Downloaded successfully!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={0}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Stops propagation to prevent backdrop dismiss; presentation-only interaction */}
      <div
        className="bg-slate-900/90 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="code" className="w-6 h-6 text-cyan-400" />
            API Export
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
          {[
            { id: 'export', label: 'Export', icon: 'download' },
            { id: 'snippets', label: 'Code Snippets', icon: 'code' },
            { id: 'postman', label: 'Postman', icon: 'api' },
            { id: 'openapi', label: 'OpenAPI', icon: 'document' },
          ].map((tab) => (
            <button
              key={tab.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Icon name={tab.icon as any} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <span className="block text-sm font-semibold text-slate-300 mb-2">
                  Export Format
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {formats.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedFormat === format.value
                          ? 'bg-cyan-600/20 border-cyan-500 shadow-lg'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-200">{format.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{format.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="flex gap-4">
                <label
                  htmlFor="include-metadata"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    id="include-metadata"
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Include Metadata</span>
                </label>
                <label htmlFor="include-links" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="include-links"
                    type="checkbox"
                    checked={includeLinks}
                    onChange={(e) => setIncludeLinks(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Include Links</span>
                </label>
              </div>

              {/* Base URL */}
              <div>
                <label
                  htmlFor="base-url"
                  className="block text-sm font-semibold text-slate-300 mb-2"
                >
                  Base URL
                </label>
                <input
                  id="base-url"
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="https://api.example.com"
                />
              </div>

              {/* Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-300">Preview</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(exportedData)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Icon name="copy" className="w-3 h-3" />
                      Copy
                    </button>
                    <button
                      onClick={() => handleDownload(exportedData, `export-${selectedFormat}.json`)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Icon name="download" className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>
                <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-96">
                  {exportedData}
                </pre>
              </div>
            </div>
          )}

          {/* Code Snippets Tab */}
          {activeTab === 'snippets' && (
            <div className="space-y-4">
              {codeSnippets.map((snippet, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-300">
                      {snippet.description}
                    </label>
                    <button
                      onClick={() => handleCopy(snippet.code)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Icon name="copy" className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto">
                    {snippet.code}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Postman Tab */}
          {activeTab === 'postman' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">
                  Import this collection into Postman to test the API endpoints.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(postmanCollection)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="copy" className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() =>
                      handleDownload(postmanCollection, 'veo-studio-api.postman_collection.json')
                    }
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="download" className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-96">
                {postmanCollection}
              </pre>
            </div>
          )}

          {/* OpenAPI Tab */}
          {activeTab === 'openapi' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">
                  OpenAPI 3.0 schema for API documentation and code generation.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(openApiSchema)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="copy" className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleDownload(openApiSchema, 'veo-studio-api.openapi.json')}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Icon name="download" className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-96">
                {openApiSchema}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiExportModal;
