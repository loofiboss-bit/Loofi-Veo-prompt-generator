
import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { useAppStore } from '../store/useAppStore';
import { Asset } from '../types';

const AssetLibrary: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { assets, addAsset, removeAsset } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target?.result as string;
                if (url) {
                    const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
                    const data = url.substring(url.indexOf(',') + 1);
                    const type = mimeType.startsWith('image') ? 'image' : 'audio';
                    
                    const newAsset: Asset = {
                        id: Date.now().toString() + Math.random().toString(),
                        type,
                        name: file.name,
                        url, // Base64 serves as URL for display here as well
                        data,
                        mimeType
                    };
                    addAsset(newAsset);
                }
            };
            reader.readAsDataURL(file);
        });
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragStart = (e: React.DragEvent, asset: Asset) => {
        e.dataTransfer.setData('application/veo-asset', JSON.stringify(asset));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-[45] flex items-center justify-center w-10 h-14 bg-slate-900 border-l border-t border-b border-slate-700 rounded-l-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all shadow-lg ${isOpen ? 'translate-x-0' : ''}`}
                title="Asset Library"
            >
                <Icon name={isOpen ? 'chevron-down' : 'folder'} className={`w-5 h-5 ${isOpen ? '-rotate-90' : ''}`} />
            </button>

            {/* Sidebar Panel */}
            <div 
                className={`fixed top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="folder" className="w-4 h-4 text-cyan-400" />
                        Asset Library
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-5 h-5" />
                    </button>
                </div>

                {/* Upload Area */}
                <div className="p-4 border-b border-slate-800">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-500/50 rounded-lg p-4 text-center cursor-pointer transition-colors group"
                    >
                        <Icon name="upload" className="w-6 h-6 text-slate-500 mx-auto mb-2 group-hover:text-cyan-400 transition-colors" />
                        <p className="text-xs text-slate-400">Click to upload assets</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            multiple 
                            accept="image/*,audio/*"
                        />
                    </div>
                </div>

                {/* Asset List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {assets.length === 0 ? (
                        <div className="text-center text-slate-600 mt-10">
                            <p className="text-xs">Library is empty.</p>
                            <p className="text-[10px] mt-1">Upload images or audio to reuse them across shots.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {assets.map(asset => (
                                <div 
                                    key={asset.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, asset)}
                                    className="relative group bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-cyan-500/50 transition-colors cursor-grab active:cursor-grabbing"
                                >
                                    {asset.type === 'image' ? (
                                        <div className="aspect-square w-full">
                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="aspect-square w-full flex flex-col items-center justify-center bg-slate-800 p-2">
                                            <Icon name="audio" className="w-8 h-8 text-cyan-600 mb-2" />
                                        </div>
                                    )}
                                    
                                    <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 backdrop-blur-sm">
                                        <p className="text-[10px] text-slate-300 truncate font-mono">{asset.name}</p>
                                    </div>

                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                        className="absolute top-1 right-1 p-1 bg-black/60 text-slate-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Icon name="trash" className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-3 border-t border-slate-800 bg-slate-900 text-[10px] text-slate-500 text-center">
                    Drag items to input fields
                </div>
            </div>
        </>
    );
};

export default AssetLibrary;
