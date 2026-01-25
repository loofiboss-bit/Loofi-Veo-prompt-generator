
import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { useAppStore } from '../store/useAppStore';
import { Asset, StockAsset, Shot } from '../types';
import * as stockMediaService from '../services/stockMediaService';
import { generateProxy } from '../services/proxyService';

const AssetLibrary: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { assets, addAsset, updateAsset, removeAsset, sbShots, setSbShots } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stock Search State
    const [activeTab, setActiveTab] = useState<'uploads' | 'stock'>('uploads');
    const [stockQuery, setStockQuery] = useState('');
    const [stockResults, setStockResults] = useState<StockAsset[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [stockType, setStockType] = useState<'video' | 'audio'>('video');
    const [processingQueue, setProcessingQueue] = useState<string[]>([]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const url = e.target?.result as string;
                if (url) {
                    const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
                    const data = url.substring(url.indexOf(',') + 1);
                    const type = mimeType.startsWith('image') ? 'image' : 'audio';
                    const isVideo = file.type.startsWith('video');
                    
                    const assetId = Date.now().toString() + Math.random().toString();
                    
                    // 1. Add Original Immediately (Optimistic)
                    const newAsset: Asset = {
                        id: assetId,
                        type: isVideo ? 'video' : type as any,
                        name: file.name,
                        url, // Original
                        data,
                        mimeType: file.type,
                        isProxyReady: false
                    };
                    addAsset(newAsset);

                    // 2. Trigger Smart Proxy (Background)
                    if (isVideo) {
                        setProcessingQueue(prev => [...prev, assetId]);
                        try {
                            // Offload to service
                            const proxyUrl = await generateProxy(file);
                            
                            // 3. Update Store with Proxy
                            updateAsset(assetId, { 
                                proxyUrl, 
                                isProxyReady: true 
                            });
                        } catch (err) {
                            console.warn("Failed to generate proxy for upload", err);
                        } finally {
                            setProcessingQueue(prev => prev.filter(id => id !== assetId));
                        }
                    }
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

    const handleStockSearch = async () => {
        setIsSearching(true);
        setStockResults([]);
        try {
            let results: StockAsset[] = [];
            if (stockType === 'video') {
                results = await stockMediaService.searchStockVideo(stockQuery);
            } else {
                results = await stockMediaService.searchStockAudio(stockQuery);
            }
            setStockResults(results);
        } catch (error) {
            console.error("Stock search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddStockToStoryboard = (item: StockAsset) => {
        if (item.type === 'video') {
            const newId = sbShots.length > 0 ? Math.max(...sbShots.map(s => s.id)) + 1 : 1;
            const newShot: Shot = {
                id: newId,
                type: 'video',
                sourceType: 'stock',
                stockSourceId: item.id,
                action: item.title, // Use title as action description
                camera: 'Stock Footage',
                generatedVideoUrl: item.url, // Pre-fill result
                takes: [item.url],
                selectedTakeIndex: 0,
                visualLink: false,
                duration: item.duration || 5,
                characterId: ''
            };
            setSbShots([...sbShots, newShot]);
        }
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
                <div className="p-4 border-b border-slate-700 bg-slate-900">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            <Icon name="folder" className="w-4 h-4 text-cyan-400" />
                            Asset Library
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                            <Icon name="cancel" className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button 
                            onClick={() => setActiveTab('uploads')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'uploads' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Uploads
                        </button>
                        <button 
                            onClick={() => setActiveTab('stock')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'stock' ? 'bg-cyan-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Stock Media
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-900/50">
                    
                    {/* Tab: Uploads */}
                    {activeTab === 'uploads' && (
                        <div className="p-4 space-y-3">
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
                                    accept="image/*,audio/*,video/*"
                                />
                            </div>

                            {processingQueue.length > 0 && (
                                <div className="text-center p-2 bg-yellow-900/20 rounded border border-yellow-500/20">
                                    <span className="text-[10px] text-yellow-400 animate-pulse flex items-center justify-center gap-1">
                                        <Icon name="spinner" className="w-3 h-3 animate-spin" />
                                        Creating Smart Proxies ({processingQueue.length})
                                    </span>
                                </div>
                            )}

                            {assets.length === 0 ? (
                                <div className="text-center text-slate-600 mt-10">
                                    <p className="text-xs">Library is empty.</p>
                                    <p className="text-[10px] mt-1">Upload images or audio to reuse them.</p>
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
                                            ) : (asset.type === 'video' || (asset.mimeType && asset.mimeType.startsWith('video'))) ? (
                                                <div className="aspect-square w-full bg-black flex items-center justify-center">
                                                    {/* Show original or proxy in thumbnail? Original is sharper for thumb, proxy faster. */}
                                                    {/* For thumbnail, we use original URL usually as it's cached by browser anyway for single frame */}
                                                    <video src={asset.proxyUrl || asset.url} className="w-full h-full object-cover pointer-events-none" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Icon name="video" className="w-6 h-6 text-white opacity-50" />
                                                    </div>
                                                    
                                                    {/* Status Badges */}
                                                    {processingQueue.includes(asset.id) && (
                                                        <div className="absolute top-1 left-1 bg-black/50 p-1 rounded backdrop-blur-sm">
                                                            <Icon name="spinner" className="w-3 h-3 text-yellow-400 animate-spin" />
                                                        </div>
                                                    )}
                                                    {asset.isProxyReady && (
                                                        <div className="absolute top-1 left-1 text-[8px] bg-yellow-500/90 text-black px-1 rounded font-bold border border-yellow-600 shadow-sm">
                                                            SD
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="aspect-square w-full flex flex-col items-center justify-center bg-slate-800 p-2">
                                                    <Icon name="audio" className="w-8 h-8 text-cyan-600 mb-2" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 backdrop-blur-sm">
                                                <p className="text-[10px] text-slate-300 truncate font-mono">{asset.name}</p>
                                            </div>

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
                    )}

                    {/* Tab: Stock Search */}
                    {activeTab === 'stock' && (
                        <div className="p-4 flex flex-col h-full">
                            <div className="space-y-2 mb-4">
                                <div className="flex gap-2">
                                    <select 
                                        value={stockType}
                                        onChange={(e) => setStockType(e.target.value as 'video' | 'audio')}
                                        className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 px-2 focus:ring-cyan-500 focus:border-cyan-500"
                                    >
                                        <option value="video">Video</option>
                                        <option value="audio">Audio</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        value={stockQuery}
                                        onChange={(e) => setStockQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleStockSearch()}
                                        placeholder={`Search ${stockType}...`}
                                        className="flex-grow bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:ring-cyan-500 focus:border-cyan-500"
                                    />
                                    <button 
                                        onClick={handleStockSearch}
                                        disabled={isSearching}
                                        className="p-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded transition-colors disabled:opacity-50"
                                    >
                                        {isSearching ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="search" className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {stockResults.length === 0 && !isSearching ? (
                                    <div className="text-center text-slate-600 mt-10">
                                        <Icon name="globe" className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">Search for free stock footage.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {stockResults.map(item => (
                                            <div key={item.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden group hover:border-cyan-500/50 transition-all">
                                                {item.type === 'video' ? (
                                                    <div className="relative aspect-video">
                                                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                                                        <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                                                            {item.duration}s
                                                        </div>
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button 
                                                                onClick={() => handleAddStockToStoryboard(item)}
                                                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-lg flex items-center gap-1"
                                                            >
                                                                <Icon name="plus" className="w-3 h-3" /> Use
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 flex items-center gap-3">
                                                        <div className="p-2 bg-slate-700 rounded-full text-cyan-400">
                                                            <Icon name="music" className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                                                            <p className="text-[10px] text-slate-500">{item.author} • {item.duration}s</p>
                                                        </div>
                                                        <button 
                                                            className="p-1.5 bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white rounded transition-colors"
                                                            title="Download (Coming Soon)"
                                                        >
                                                            <Icon name="cloud-download" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                {item.type === 'video' && (
                                                    <div className="p-2 bg-slate-800 border-t border-slate-700/50">
                                                        <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                                                        <p className="text-[10px] text-slate-500">By {item.author}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-3 border-t border-slate-800 bg-slate-900 text-[10px] text-slate-500 text-center">
                    {activeTab === 'uploads' ? 'Drag items to input fields' : 'Click "Use" to add to Storyboard'}
                </div>
            </div>
        </>
    );
};

export default AssetLibrary;
