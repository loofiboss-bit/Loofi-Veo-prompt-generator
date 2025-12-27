
import React, { useRef, useCallback } from 'react';
import Icon from './Icon';
import Tooltip from './Tooltip';

interface ImageUploadInputProps {
  onImageSelect: (image: { data: string; mimeType: string; url: string; }) => void;
  onImageClear: () => void;
  uploadedImageUrl: string | null;
  label: string;
  placeholder: string;
  info?: string;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ onImageSelect, onImageClear, uploadedImageUrl, label, placeholder, info }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
        console.error("Error reading file");
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

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
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const fakeEvent = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
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
            onDrop={handleDrop}
            className="mt-2 flex justify-center items-center rounded-lg border border-dashed border-slate-700 p-6 bg-slate-800/40 hover:border-cyan-500/50 transition-colors cursor-pointer relative aspect-[16/9]"
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
                    <img src={uploadedImageUrl} alt="Uploaded preview" className="max-w-full max-h-full object-contain rounded-md" />
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
                <Icon name="upload" className="mx-auto h-12 w-12 text-slate-500" />
                <p className="mt-2 text-sm text-slate-300">{placeholder}</p>
                <p className="text-xs text-slate-500">PNG, JPG, WEBP</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageUploadInput;
