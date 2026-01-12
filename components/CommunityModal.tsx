
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { SharedVisualDNA } from '../types';
import * as communityService from '../services/communityService';

interface CommunityModalProps {
    onImport: (dna: SharedVisualDNA) => void;
}

const CommunityGallery: React.FC<CommunityModalProps> = ({ onImport }) => {
    const [dnas, setDnas] = useState<SharedVisualDNA[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadCommunity();
    }, []);

    const loadCommunity = async () => {
        setIsLoading(true);
        try {
            const items = await communityService.fetchCommunityDNAs();
            setDnas(items);
        } catch (error) {
            console.error("Failed to load community styles", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (likedIds.has(id)) return;

        // Optimistic update
        setDnas(prev => prev.map(d => d.id === id ? { ...d, likes: d.likes + 1 } : d));
        setLikedIds(prev => new Set(prev).add(id));

        try {
            await communityService.likeDNA(id);
        } catch (error) {
            // Revert on error
            setDnas(prev => prev.map(d => d.id === id ? { ...d, likes: d.likes - 1 } : d));
            setLikedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const filteredDnas = dnas.filter(dna => 
        dna.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        dna.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dna.styleParams.artStyle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-900/30 animate-fade-in-up">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-700/50 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                <div className="relative max-w-md mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="search" className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search styles, authors..."
                        className="w-full bg-slate-800 border border-slate-600 rounded-full py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-grow overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Icon name="spinner" className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
                        <p>Loading community styles...</p>
                    </div>
                ) : filteredDnas.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <Icon name="globe" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No styles found matching your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDnas.map(dna => (
                            <div key={dna.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/30 transition-all group flex flex-col relative overflow-hidden">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-lg truncate pr-2">{dna.name}</h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Icon name="user" className="w-3 h-3" />
                                            <span>{dna.author}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleLike(dna.id, e)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                            likedIds.has(dna.id) ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-700/50 text-slate-400 hover:text-pink-400 hover:bg-pink-500/10'
                                        }`}
                                    >
                                        <Icon name="heart" className="w-3 h-3" />
                                        <span>{dna.likes}</span>
                                    </button>
                                </div>

                                {/* Tags Preview */}
                                <div className="flex flex-wrap gap-1 mb-4 flex-grow content-start">
                                    {dna.styleParams.artStyle && (
                                        <span className="px-2 py-0.5 bg-cyan-900/30 text-cyan-300 border border-cyan-500/20 rounded text-[10px] truncate max-w-full">
                                            {dna.styleParams.artStyle === 'Custom' ? dna.styleParams.customArtStyle : dna.styleParams.artStyle}
                                        </span>
                                    )}
                                    {dna.styleParams.lightingStyle && dna.styleParams.lightingStyle !== 'Any' && (
                                        <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-[10px] truncate max-w-full">
                                            {dna.styleParams.lightingStyle}
                                        </span>
                                    )}
                                </div>

                                {/* Action */}
                                <button 
                                    onClick={() => onImport(dna)}
                                    className="w-full py-2 bg-slate-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-auto shadow-sm"
                                >
                                    <Icon name="download" className="w-4 h-4" />
                                    Import Style
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityGallery;
