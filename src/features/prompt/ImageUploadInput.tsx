/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useRef, useCallback, useState, useId } from 'react';
import { Icon } from '@shared/components/ui';
import Tooltip from '@shared/components/ui/Tooltip';
import { Asset } from '@core/types';
import { logger } from '@core/services/loggerService';

interface ImageUploadInputProps {
  onImageSelect: (image: { data: string; mimeType: string; url: string }) => void;
  onImageClear: () => void;
  uploadedImageUrl: string | null;
  label: string | React.ReactNode;
  placeholder: string;
  info?: string;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  onImageSelect,
  onImageClear,
  uploadedImageUrl,
  label,
  placeholder,
  info,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputId = useId();
  const messageId = `${inputId}-message`;

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported file type. Use PNG, JPG, or WEBP.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Image file is too large. Maximum size is 10MB.';
    }
    return null;
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (file) {
        const validationError = validateImageFile(file);
        if (validationError) {
          setValidationMessage(validationError);
          return;
        }

        setValidationMessage(null);
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          if (url) {
            const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
            const data = url.substring(url.indexOf(',') + 1);
            onImageSelect({ data, mimeType, url });
          }
        };
        reader.onerror = () => {
          logger.error('Error reading file');
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageSelect, validateImageFile],
  );

  const handleUploadClick = () => {
    if (uploadedImageUrl) return;
    fileInputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClear();
    setValidationMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Check for Internal Asset Drop
    const assetJson = e.dataTransfer.getData('application/veo-asset');
    if (assetJson) {
      try {
        const asset: Asset = JSON.parse(assetJson);
        if (asset.type === 'image') {
          onImageSelect({
            data: asset.data,
            mimeType: asset.mimeType,
            url: asset.url,
          });
          return;
        }
      } catch (err) {
        logger.error('Failed to parse dropped asset', err);
      }
    }

    // 2. Check for File Drop
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validationError = validateImageFile(droppedFile);
      if (validationError) {
        setValidationMessage(validationError);
        return;
      }
      const fakeEvent = {
        currentTarget: { files: e.dataTransfer.files },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label
          htmlFor={inputId}
          className="flex items-center space-x-2 text-sm font-medium text-slate-200"
        >
          <span>{label}</span>
          {info && <Tooltip text={info} />}
        </label>
      </div>
      <input
        ref={fileInputRef}
        id={inputId}
        name={inputId}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        aria-label={typeof label === 'string' ? label : 'Image upload input'}
      />
      {uploadedImageUrl ? (
        <div
          className={`mt-2 flex justify-center items-center rounded-lg border border-dashed p-6 transition-all relative aspect-[16/9] ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-slate-700 bg-slate-800/40'
          }`}
          aria-label="Uploaded image preview"
          aria-describedby={messageId}
        >
          <>
            <img
              src={uploadedImageUrl}
              alt="Uploaded preview"
              className="max-w-full max-h-full object-contain rounded-md"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full text-slate-300 hover:text-white hover:bg-black/70 transition-colors"
              aria-label="Clear image"
            >
              <Icon name="cancel" className="w-5 h-5" />
            </button>
          </>
        </div>
      ) : (
        <div
          onClick={handleUploadClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUploadClick();
            }
          }}
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Upload image"
          aria-describedby={messageId}
          className={`mt-2 flex justify-center items-center rounded-lg border border-dashed p-6 transition-all cursor-pointer relative aspect-[16/9] ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-slate-700 bg-slate-800/40 hover:border-cyan-500/50'
          }`}
        >
          <div className="text-center pointer-events-none">
            <Icon
              name="image"
              className={`mx-auto h-12 w-12 mb-2 transition-colors ${isDragOver ? 'text-cyan-400' : 'text-slate-500'}`}
            />
            <p className={`text-sm ${isDragOver ? 'text-cyan-200' : 'text-slate-300'}`}>
              {isDragOver ? 'Drop Image Here' : placeholder}
            </p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP</p>
          </div>
        </div>
      )}
      <p id={messageId} className="mt-1.5 text-xs text-slate-500" aria-live="polite" role="status">
        {validationMessage ?? 'PNG, JPG, WEBP (Max 10MB)'}
      </p>
    </div>
  );
};

export default ImageUploadInput;
