
import React, { useState } from 'react';
import { TimelineClip, TransformProps, Keyframe, CameraEffect } from '../types';
import Icon from './Icon';
import RangeInput from './RangeInput';
import SpatialPanner from './SpatialPanner';
import SelectInput from './SelectInput';
import { useAppStore } from '../store/useAppStore';
import { extractFrameImageData } from '../utils/videoUtils';
import { calculateColorMatch } from '../services/colorGradeService';

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

const DEFAULT_CAMERA: CameraEffect = {
    type: 'static',
    intensity: 0.5,
    scale: 1.1
};

const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedClip, onUpdate, currentTime }) => {
    const [activeSection, setActiveSection] = useState<'transform' | 'audio' | 'camera' | 'effects'>('transform');
    const { sbTimeline, assets } = useAppStore();
    const [isMatching, setIsMatching] = useState(false);

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
    
    // Camera Effect
    const cameraEffect = selectedClip.cameraEffect || DEFAULT_CAMERA;
    
    // Color Grade
    const colorGrade = selectedClip.colorGrade || {
        brightness: 1, contrast: 1, saturation: 1, sepia: 0, hueRotate: 0
    };

    const handleTransformChange = (key: keyof TransformProps, value: number | {x: number, y: number}) => {
        const newTransform = { ...transform, [key]: value };
        onUpdate(selectedClip.id, { transform: newTransform });
    };

    const handlePropertyChange = (key: string, value: any) => {
        onUpdate(selectedClip.id, { [key]: value });
    };
    
    const handleCameraChange = (key: keyof CameraEffect, value: any) => {
        onUpdate(selectedClip.id, { cameraEffect: { ...cameraEffect, [key]: value } });
    };
    
    const handlePanningChange = (x: number, z: number) => {
        onUpdate(selectedClip.id, { panning: { x, z } });
    };
    
    const handleColorChange = (key: string, value: number) => {
        onUpdate(selectedClip.id, { colorGrade: { ...colorGrade, [key]: value } });
    };

    const handleMatchPrevious = async () => {
        if (!selectedClip || selectedClip.type !== 'video') return;
        setIsMatching(true);

        try {
            // 1. Find previous video clip on same track
            const trackClips = sbTimeline.clips
                .filter(c => c.trackId === selectedClip.trackId && c.type === 'video')
                .sort((a, b) => a.startTime - b.startTime);
                
            const currentIndex = trackClips.findIndex(c => c.id === selectedClip.id);
            if (currentIndex <= 0) {
                alert("No previous clip found to match.");
                setIsMatching(false);
                return;
            }
            
            const prevClip = trackClips[currentIndex - 1];
            
            // 2. Get Assets
            const prevAsset = assets.find(a => a.id === String(prevClip.resourceId));
            const currAsset = assets.find(a => a.id === String(selectedClip.resourceId));
            
            if (!prevAsset?.url || !currAsset?.url) {
                alert("Missing video sources.");
                setIsMatching(false);
                return;
            }
            
            // 3. Extract Frames
            // We use middle of clip for better representation
            const [prevData, currData] = await Promise.all([
                extractFrameImageData(prevAsset.url, prevClip.duration / 2),
                extractFrameImageData(currAsset.url, selectedClip.duration / 2)
            ]);
            
            // 4. Calculate Match
            const newGrade = calculateColorMatch(prevData, currData);
            
            // 5. Update
            onUpdate(selectedClip.id, { colorGrade: { ...colorGrade, ...newGrade } });

        } catch (e) {
            console.error("Color match failed", e);
            alert("Color match failed.");
        } finally {
            setIsMatching(false);
        }
    };

    const toggleKeyframe = (property: string) => {
        // Logic to add/remove keyframe at current time
        // This is a visual stub for now as keyframe interpolation logic is complex
        console.log(`Toggle keyframe for ${property} at ${clipTime.toFixed(2)}s`);
        
        const currentKeyframes = selectedClip.keyframes || [];
        // Check if keyframe exists near current time (tolerance 0.1s)
        const existingIndex = currentKeyframes.findIndex(k => k.property === property && Math.abs(k.time - clipTime) < 0.1);
        
        let newKeyframes;
        if (existingIndex >= 0) {
            // Remove
            newKeyframes = currentKeyframes.filter((_, i) => i !== existingIndex);
        } else {
            // Add
            let val = 0;
            if (property === 'transform.scale') val = transform.scale;
            else if (property === 'transform.rotation') val = transform.rotation;
            else if (property === 'transform.opacity') val = transform.opacity;
            else if (property === 'volume') val = (selectedClip.volume ?? 1) * 100;

            const newKeyframe: Keyframe = {
                id: Date.now().toString(),
                property,
                time: clipTime,
                value: val,
                ease: 'linear'
            };
            newKeyframes = [...currentKeyframes, newKeyframe].sort((a, b) => a.time - b.time);
        }
        
        onUpdate(selectedClip.id, { keyframes: newKeyframes });
    };

    const isKeyframed = (property: string) => {
        return (selectedClip.keyframes || []).some(k => k.property === property && Math.abs(k.time - clipTime) < 0.1);
    };

    const PropertyRow: React.FC<{ 
        label: string; 
        value: number; 
        onChange: (v: number) => void; 
        min: number; 
        max: number; 
        step?: number;
        propertyKey: string; // for keyframing
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
                    Trans
                </button>
                {selectedClip.type === 'video' && (
                    <button 
                        onClick={() => setActiveSection('camera')}
                        className={`flex-1 py-3 text-[10px] font-semibold uppercase transition-colors ${activeSection === 'camera' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Cam
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
                {selectedClip.type === 'video' && (
                    <button 
                        onClick={() => setActiveSection('effects')}
                        className={`flex-1 py-3 text-[10px] font-semibold uppercase transition-colors ${activeSection === 'effects' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Color
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                
                {activeSection === 'transform' && (
                    <div className="space-y-6">
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
                
                {activeSection === 'camera' && (
                    <div className="space-y-6">
                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <h4 className="text-[10px] font-bold text-fuchsia-400 uppercase mb-3 flex items-center gap-2">
                                <Icon name="video" className="w-3 h-3" /> Virtual Handheld
                            </h4>
                            
                            <div className="mb-4">
                                <SelectInput 
                                    label="Movement Type" 
                                    name="camType" 
                                    options={[
                                        { value: 'static', label: 'Static (Tripod)' },
                                        { value: 'handheld', label: 'Handheld (Shake)' },
                                        { value: 'drift', label: 'Drift (Float)' },
                                        { value: 'zoom_in', label: 'Slow Zoom In' },
                                        { value: 'zoom_out', label: 'Slow Zoom Out' }
                                    ]}
                                    value={cameraEffect.type}
                                    onChange={(e) => handleCameraChange('type', e.target.value)}
                                />
                            </div>

                            {cameraEffect.type !== 'static' && (
                                <>
                                    <div className="mb-4">
                                        <label className="text-xs text-slate-400 font-medium block mb-1">Intensity</label>
                                        <RangeInput 
                                            label=""
                                            name="camIntensity"
                                            value={Math.round(cameraEffect.intensity * 100)}
                                            onChange={(e) => handleCameraChange('intensity', parseInt(e.target.value) / 100)}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                    
                                    <div className="mb-2">
                                        <label className="text-xs text-slate-400 font-medium block mb-1">Overscan (Zoom to Fit)</label>
                                        <RangeInput 
                                            label=""
                                            name="camScale"
                                            value={Math.round(cameraEffect.scale * 100)}
                                            onChange={(e) => handleCameraChange('scale', parseInt(e.target.value) / 100)}
                                            min={100}
                                            max={150}
                                            info="Zoom in slightly to prevent black edges during movement."
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">
                                        Generates physics-based movement on top of your video.
                                    </p>
                                </>
                            )}
                        </div>
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

                {activeSection === 'effects' && (
                    <div className="space-y-6">
                        <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20 mb-4">
                             <button 
                                onClick={handleMatchPrevious}
                                disabled={isMatching}
                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50"
                             >
                                 {isMatching ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="magic" className="w-3 h-3" />}
                                 Match Previous Clip
                             </button>
                             <p className="text-[9px] text-cyan-400 mt-2 text-center">
                                 Automatically adjust brightness & contrast to match the previous shot.
                             </p>
                        </div>

                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3">Color Grading</h4>
                            
                            <PropertyRow 
                                label="Brightness" 
                                value={colorGrade.brightness} 
                                onChange={(v) => handleColorChange('brightness', v)} 
                                min={0} max={2} step={0.05}
                                propertyKey="colorGrade.brightness"
                            />
                            <PropertyRow 
                                label="Contrast" 
                                value={colorGrade.contrast} 
                                onChange={(v) => handleColorChange('contrast', v)} 
                                min={0} max={2} step={0.05}
                                propertyKey="colorGrade.contrast"
                            />
                            <PropertyRow 
                                label="Saturation" 
                                value={colorGrade.saturation} 
                                onChange={(v) => handleColorChange('saturation', v)} 
                                min={0} max={2} step={0.05}
                                propertyKey="colorGrade.saturation"
                            />
                             <PropertyRow 
                                label="Sepia" 
                                value={colorGrade.sepia || 0} 
                                onChange={(v) => handleColorChange('sepia', v)} 
                                min={0} max={1} step={0.05}
                                propertyKey="colorGrade.sepia"
                            />
                            <PropertyRow 
                                label="Hue Rotate (deg)" 
                                value={colorGrade.hueRotate || 0} 
                                onChange={(v) => handleColorChange('hueRotate', v)} 
                                min={-180} max={180} step={10}
                                propertyKey="colorGrade.hueRotate"
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default InspectorPanel;
