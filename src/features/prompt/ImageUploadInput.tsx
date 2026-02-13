/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useRef, useCallback, useState } from 'react';
import { Icon } from '@shared/components/ui';
import Tooltip from '@shared/components/ui/Tooltip';
import { Asset } from '@core/types';

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

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (file) {
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
          console.error('Error reading file');
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageSelect],
  );

  const handleUploadClick = () => {
    if (uploadedImageUrl) return;
    fileInputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClear();
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
        console.error('Failed to parse dropped asset', err);
      }
    }

    // 2. Check for File Drop
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fakeEvent = {
        currentTarget: { files: e.dataTransfer.files },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="flex items-center space-x-2 text-sm font-medium text-slate-200">
          <span>{label}</span>
          {info && <Tooltip text={info} />}
        </label>
      </div>
      <div
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-2 flex justify-center items-center rounded-lg border border-dashed p-6 transition-all cursor-pointer relative aspect-[16/9] ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]'
            : 'border-slate-700 bg-slate-800/40 hover:border-cyan-500/50'
        }`}
      >
        <input
          ref={fileInputRef}
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
        />
        {uploadedImageUrl ? (
          <>
            <img
              src={uploadedImageUrl}
              alt="Uploaded preview"
              className="max-w-full max-h-full object-contain rounded-md"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full text-slate-300 hover:text-white hover:bg-black/70 transition-colors"
              aria-label="Clear image"
            >
              <Icon name="cancel" className="w-5 h-5" />
            </button>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default ImageUploadInput;
