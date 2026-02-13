
import React, { useState } from 'react';
import { TimelineClip, TransformProps, VideoEffect, ColorGradeEffect, CameraShakeEffect, ChromaKeyEffect } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import SpatialPanner from './SpatialPanner';
import { TakeSelector } from './TakeSelector';

interface InspectorPanelProps {
    selectedClip: TimelineClip | null;
    onUpdate: (id: string, changes: Partial<TimelineClip>) => void;
    currentTime: number; // Global timeline time
}

const DEFAULT_TRANSFORM: TransformProps = {
    scale: 100,
    position: { x: 0, y: 0 },
    rotation: 0,
    opacity: 100
};

const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedClip, onUpdate, currentTime }) => {
    const [activeSection, setActiveSection] = useState<'transform' | 'audio' | 'effects'>('transform');

    if (!selectedClip) {
        return (
            <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col items-center justify-center text-center p-6 select-none">
                <Icon name="sliders" className="w-12 h-12 text-slate-700 mb-4" />
                <h3 className="text-slate-400 font-semibold mb-2">No Clip Selected</h3>
                <p className="text-xs text-slate-500">Select a clip in the timeline to edit its properties.</p>
            </div>
        );
    }

    const transform = selectedClip.transform || DEFAULT_TRANSFORM;
    const clipTime = currentTime - selectedClip.startTime;
    const isWithinClip = clipTime >= 0 && clipTime <= selectedClip.duration;
    
    // Audio Panning
    const panning = selectedClip.panning || { x: 0, z: 0 };
    
    // Modular Effects
    const effects = selectedClip.effects || [];

    const handleTransformChange = (key: keyof TransformProps, value: number | {x: number, y: number}) => {
        const newTransform = { ...transform, [key]: value };
        onUpdate(selectedClip.id, { transform: newTransform });
    };

    const handlePropertyChange = (key: string, value: any) => {
        onUpdate(selectedClip.id, { [key]: value });
    };
    
    const handlePanningChange = (x: number, z: number) => {
        onUpdate(selectedClip.id, { panning: { x, z } });
    };
    
    // --- Effects Management ---
    
    const addEffect = (type: 'color' | 'chroma' | 'shake') => {
        const id = Date.now().toString();
        let newEffect: VideoEffect;
        
        if (type === 'color') {
            newEffect = {
                id, type: 'color', isEnabled: true, name: 'Color Grade',
                brightness: 1, contrast: 1, saturation: 1, sepia: 0, hueRotate: 0
            };
        } else if (type === 'chroma') {
            newEffect = {
                id, type: 'chroma', isEnabled: true, name: 'Green Screen',
                color: '#00FF00', similarity: 0.4, smoothness: 0.1, spill: 0.1
            };
        } else {
            newEffect = {
                id, type: 'shake', isEnabled: true, name: 'Camera Shake',
                intensity: 0.2, speed: 1.0, scale: 1.1
            };
        }
        
        onUpdate(selectedClip.id, { effects: [...effects, newEffect] });
    };

    const updateEffect = (effectId: string, changes: Partial<VideoEffect>) => {
        const newEffects = effects.map(e => e.id === effectId ? { ...e, ...changes } : e);
        onUpdate(selectedClip.id, { effects: newEffects as VideoEffect[] });
    };

    const removeEffect = (effectId: string) => {
        const newEffects = effects.filter(e => e.id !== effectId);
        onUpdate(selectedClip.id, { effects: newEffects });
    };

    const toggleKeyframe = (property: string) => {
        // Simple stub for visual feedback
        console.log(`Keyframe toggled: ${property}`);
    };

    const isKeyframed = (_property: string) => false;

    const PropertyRow: React.FC<{ 
        label: string; 
        value: number; 
        onChange: (v: number) => void; 
        min: number; 
        max: number; 
        step?: number;
        propertyKey: string;
    }> = ({ label, value, onChange, min, max, step = 1, propertyKey }) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-slate-400 font-medium">{label}</label>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400">{Math.round(value * 100) / 100}</span>
                    <button 
                        onClick={() => toggleKeyframe(propertyKey)}
                        disabled={!isWithinClip}
                        className={`p-1 rounded hover:bg-slate-700 transition-colors ${isKeyframed(propertyKey) ? 'text-cyan-400' : 'text-slate-600'} ${!isWithinClip ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Toggle Keyframe"
                    >
                        <Icon name={isKeyframed(propertyKey) ? 'keyframe-filled' : 'keyframe'} className="w-3 h-3" />
                    </button>
                </div>
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
            />
        </div>
    );

    return (
        <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${selectedClip.type === 'video' ? 'bg-cyan-500' : selectedClip.type === 'audio' ? 'bg-fuchsia-500' : 'bg-yellow-500'}`}></div>
                    <h3 className="text-sm font-bold text-slate-200 truncate">{selectedClip.label}</h3>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                    ID: {selectedClip.id.slice(-6)} • {(selectedClip.duration).toFixed(2)}s
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button 
                    onClick={() => setActiveSection('transform')}
                    className={`flex-1 py-3 text-[10px] font-semibold uppercase transition-colors ${activeSection === 'transform' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Transform
                </button>
                {selectedClip.type === 'video' && (
                    <button 
                        onClick={() => setActiveSection('effects')}
                        className={`flex-1 py-3 text-[10px] font-semibold uppercase transition-colors ${activeSection === 'effects' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Effects
                    </button>
                )}
                {selectedClip.type === 'audio' && (
                    <button 
                        onClick={() => setActiveSection('audio')}
                        className={`flex-1 py-3 text-[10px] font-semibold uppercase transition-colors ${activeSection === 'audio' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Audio
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                
                {activeSection === 'transform' && (
                    <div className="space-y-6">
                        
                        {/* Takes Selector for Video/Images */}
                        {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
                            <TakeSelector clipId={selectedClip.id} />
                        )}

                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <PropertyRow 
                                label="Scale (%)" 
                                value={transform.scale} 
                                onChange={(v) => handleTransformChange('scale', v)} 
                                min={0} max={200} 
                                propertyKey="transform.scale"
                            />
                            
                            <PropertyRow 
                                label="Rotation (deg)" 
                                value={transform.rotation} 
                                onChange={(v) => handleTransformChange('rotation', v)} 
                                min={-180} max={180} 
                                propertyKey="transform.rotation"
                            />
                            
                            <PropertyRow 
                                label="Opacity (%)" 
                                value={transform.opacity} 
                                onChange={(v) => handleTransformChange('opacity', v)} 
                                min={0} max={100} 
                                propertyKey="transform.opacity"
                            />
                        </div>

                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3">Position</h4>
                            <PropertyRow 
                                label="X Position" 
                                value={transform.position.x} 
                                onChange={(v) => handleTransformChange('position', { ...transform.position, x: v })} 
                                min={-100} max={100} 
                                propertyKey="transform.position.x"
                            />
                            <PropertyRow 
                                label="Y Position" 
                                value={transform.position.y} 
                                onChange={(v) => handleTransformChange('position', { ...transform.position, y: v })} 
                                min={-100} max={100} 
                                propertyKey="transform.position.y"
                            />
                        </div>
                    </div>
                )}
                
                {activeSection === 'effects' && (
                    <div className="space-y-4">
                        {/* Add Effect Dropdown */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Add Effect</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => addEffect('color')} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 flex flex-col items-center gap-1">
                                    <Icon name="sliders" className="w-4 h-4 text-cyan-400" /> Color
                                </button>
                                <button onClick={() => addEffect('chroma')} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 flex flex-col items-center gap-1">
                                    <Icon name="layers" className="w-4 h-4 text-green-400" /> Key
                                </button>
                                <button onClick={() => addEffect('shake')} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 flex flex-col items-center gap-1">
                                    <Icon name="video" className="w-4 h-4 text-fuchsia-400" /> Shake
                                </button>
                            </div>
                        </div>

                        {/* Effects List */}
                        {effects.length === 0 && (
                            <div className="text-center py-8 text-slate-600 text-xs italic border-2 border-dashed border-slate-800 rounded-lg">
                                No effects applied.
                            </div>
                        )}

                        {effects.map((effect) => (
                            <div key={effect.id} className="bg-slate-800/60 rounded-lg border border-slate-700 overflow-hidden">
                                <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={effect.isEnabled} 
                                            onChange={(e) => updateEffect(effect.id, { isEnabled: e.target.checked })}
                                            className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <span className="text-xs font-bold text-slate-200">{effect.name}</span>
                                    </div>
                                    <button onClick={() => removeEffect(effect.id)} className="text-slate-500 hover:text-red-400">
                                        <Icon name="trash" className="w-3 h-3" />
                                    </button>
                                </div>
                                
                                <div className="p-3 space-y-3">
                                    {/* Color Grade Controls */}
                                    {effect.type === 'color' && (
                                        <>
                                            <PropertyRow label="Brightness" value={(effect as ColorGradeEffect).brightness} onChange={(v) => updateEffect(effect.id, { brightness: v })} min={0} max={2} step={0.1} propertyKey="color.brightness" />
                                            <PropertyRow label="Contrast" value={(effect as ColorGradeEffect).contrast} onChange={(v) => updateEffect(effect.id, { contrast: v })} min={0} max={2} step={0.1} propertyKey="color.contrast" />
                                            <PropertyRow label="Saturation" value={(effect as ColorGradeEffect).saturation} onChange={(v) => updateEffect(effect.id, { saturation: v })} min={0} max={2} step={0.1} propertyKey="color.saturation" />
                                        </>
                                    )}

                                    {/* Chroma Key Controls */}
                                    {effect.type === 'chroma' && (
                                        <>
                                            <div className="mb-3">
                                                <label className="text-xs text-slate-400 block mb-1">Color</label>
                                                <input type="color" value={(effect as ChromaKeyEffect).color} onChange={(e) => updateEffect(effect.id, { color: e.target.value })} className="w-full h-6 rounded cursor-pointer bg-slate-700 border-0" />
                                            </div>
                                            <PropertyRow label="Similarity" value={(effect as ChromaKeyEffect).similarity} onChange={(v) => updateEffect(effect.id, { similarity: v })} min={0} max={1} step={0.01} propertyKey="chroma.similarity" />
                                            <PropertyRow label="Smoothness" value={(effect as ChromaKeyEffect).smoothness} onChange={(v) => updateEffect(effect.id, { smoothness: v })} min={0} max={1} step={0.01} propertyKey="chroma.smoothness" />
                                        </>
                                    )}

                                    {/* Camera Shake Controls */}
                                    {effect.type === 'shake' && (
                                        <>
                                            <PropertyRow label="Intensity" value={(effect as CameraShakeEffect).intensity} onChange={(v) => updateEffect(effect.id, { intensity: v })} min={0} max={1} step={0.05} propertyKey="shake.intensity" />
                                            <PropertyRow label="Speed" value={(effect as CameraShakeEffect).speed} onChange={(v) => updateEffect(effect.id, { speed: v })} min={0.1} max={5} step={0.1} propertyKey="shake.speed" />
                                            <PropertyRow label="Overscan" value={(effect as CameraShakeEffect).scale} onChange={(v) => updateEffect(effect.id, { scale: v })} min={1} max={1.5} step={0.01} propertyKey="shake.scale" />
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeSection === 'audio' && (
                    <div className="space-y-6">
                         <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <PropertyRow 
                                label="Volume (%)" 
                                value={(selectedClip.volume ?? 1) * 100} 
                                onChange={(v) => handlePropertyChange('volume', v / 100)} 
                                min={0} max={200} 
                                propertyKey="volume"
                            />
                        </div>
                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <SpatialPanner 
                                x={panning.x} 
                                z={panning.z} 
                                onChange={handlePanningChange} 
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default InspectorPanel;
