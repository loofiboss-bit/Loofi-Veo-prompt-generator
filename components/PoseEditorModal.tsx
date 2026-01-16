
import React, { useRef, useState, useEffect } from 'react';
import Icon from './Icon';

interface PoseEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Pose: string) => void;
    initialPose?: string; // Optional: load existing pose image to trace (future feature), currently unused
}

interface Point {
    x: number;
    y: number;
    id: string;
    label?: string;
}

// Standard simple humanoid rig
const INITIAL_JOINTS: Point[] = [
    { id: 'head', x: 0.5, y: 0.15 },
    { id: 'neck', x: 0.5, y: 0.25 },
    { id: 'r_shoulder', x: 0.4, y: 0.25 },
    { id: 'r_elbow', x: 0.35, y: 0.35 },
    { id: 'r_hand', x: 0.3, y: 0.45 },
    { id: 'l_shoulder', x: 0.6, y: 0.25 },
    { id: 'l_elbow', x: 0.65, y: 0.35 },
    { id: 'l_hand', x: 0.7, y: 0.45 },
    { id: 'hips', x: 0.5, y: 0.5 },
    { id: 'r_hip', x: 0.45, y: 0.5 },
    { id: 'r_knee', x: 0.45, y: 0.65 },
    { id: 'r_foot', x: 0.45, y: 0.8 },
    { id: 'l_hip', x: 0.55, y: 0.5 },
    { id: 'l_knee', x: 0.55, y: 0.65 },
    { id: 'l_foot', x: 0.55, y: 0.8 },
];

const CONNECTIONS = [
    ['head', 'neck'],
    ['neck', 'r_shoulder'], ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_hand'],
    ['neck', 'l_shoulder'], ['l_shoulder', 'l_elbow'], ['l_elbow', 'l_hand'],
    ['neck', 'hips'],
    ['hips', 'r_hip'], ['r_hip', 'r_knee'], ['r_knee', 'r_foot'],
    ['hips', 'l_hip'], ['l_hip', 'l_knee'], ['l_knee', 'l_foot'],
];

const POSE_TEMPLATES: Record<string, Partial<Record<string, {x: number, y: number}>>> = {
    'standing': { /* Default state matches standing */ },
    'sitting': {
        'hips': {x: 0.5, y: 0.6},
        'r_hip': {x: 0.45, y: 0.6}, 'l_hip': {x: 0.55, y: 0.6},
        'r_knee': {x: 0.35, y: 0.6}, 'l_knee': {x: 0.65, y: 0.6},
        'r_foot': {x: 0.35, y: 0.8}, 'l_foot': {x: 0.65, y: 0.8},
        'head': {x: 0.5, y: 0.25}, 'neck': {x: 0.5, y: 0.35},
        'r_shoulder': {x: 0.4, y: 0.35}, 'l_shoulder': {x: 0.6, y: 0.35},
        'r_elbow': {x: 0.4, y: 0.5}, 'l_elbow': {x: 0.6, y: 0.5},
        'r_hand': {x: 0.45, y: 0.55}, 'l_hand': {x: 0.55, y: 0.55}
    },
    'running': {
        'head': {x: 0.55, y: 0.15},
        'neck': {x: 0.53, y: 0.25},
        'r_shoulder': {x: 0.45, y: 0.25}, 'l_shoulder': {x: 0.6, y: 0.25},
        'r_elbow': {x: 0.3, y: 0.3}, 'r_hand': {x: 0.4, y: 0.2}, // Arm forward
        'l_elbow': {x: 0.7, y: 0.35}, 'l_hand': {x: 0.65, y: 0.45}, // Arm back
        'hips': {x: 0.55, y: 0.5},
        'r_hip': {x: 0.5, y: 0.5}, 'r_knee': {x: 0.65, y: 0.5}, 'r_foot': {x: 0.6, y: 0.7}, // Leg up
        'l_hip': {x: 0.6, y: 0.5}, 'l_knee': {x: 0.45, y: 0.6}, 'l_foot': {x: 0.35, y: 0.8} // Leg push
    }
};

const PoseEditorModal: React.FC<PoseEditorModalProps> = ({ isOpen, onClose, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [joints, setJoints] = useState<Point[]>(JSON.parse(JSON.stringify(INITIAL_JOINTS)));
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [hoverId, setHoverId] = useState<string | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Apply Template
    const applyTemplate = (templateName: string) => {
        const template = POSE_TEMPLATES[templateName];
        if (!template) return;

        setJoints(prev => prev.map(j => {
            if (template[j.id]) {
                return { ...j, ...template[j.id] };
            }
            // If template doesn't specify, reset to default or keep? 
            // Resetting to default logic if using 'standing' as base
            if (templateName === 'standing') {
                const def = INITIAL_JOINTS.find(ij => ij.id === j.id);
                return def ? { ...def } : j;
            }
            return j;
        }));
    };

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRef.current) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize logic (Maintain aspect ratio or fit container)
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Clear - Black background for high contrast
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Bones
        ctx.lineWidth = 8;
        CONNECTIONS.forEach(([startId, endId]) => {
            const start = joints.find(j => j.id === startId);
            const end = joints.find(j => j.id === endId);
            
            if (start && end) {
                // Color mapping for "OpenPose" style (rough approximation)
                // Body: Blue/Teal, Arms: Yellow/Green, Legs: Red/Orange?
                // Or just White for simple structure guidance. White is safer for generic img2img.
                // Let's use specific colors to help AI distinguish left/right if possible, but White is safest for "Structure" controlnet.
                // We'll stick to a vibrant scheme.
                
                const grad = ctx.createLinearGradient(start.x * canvas.width, start.y * canvas.height, end.x * canvas.width, end.y * canvas.height);
                grad.addColorStop(0, '#38bdf8'); // Sky blue
                grad.addColorStop(1, '#a855f7'); // Purple
                ctx.strokeStyle = grad;
                
                ctx.beginPath();
                ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
                ctx.stroke();
            }
        });

        // Draw Joints
        joints.forEach(j => {
            const x = j.x * canvas.width;
            const y = j.y * canvas.height;
            const isHover = j.id === hoverId || j.id === draggingId;

            ctx.beginPath();
            ctx.arc(x, y, isHover ? 12 : 8, 0, 2 * Math.PI);
            ctx.fillStyle = isHover ? '#ffffff' : '#f472b6'; // White if active, pink otherwise
            ctx.fill();
            
            // Optional: Draw joint label for debug/clarity on hover
            if (isHover) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px monospace';
                ctx.fillText(j.id, x + 15, y);
            }
        });

    }, [joints, draggingId, hoverId]);

    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height
        };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getMousePos(e);
        // Find nearest joint
        const threshold = 0.05; // 5% of screen
        let nearest: string | null = null;
        let minDesc = Infinity;

        joints.forEach(j => {
            const dist = Math.sqrt(Math.pow(j.x - pos.x, 2) + Math.pow(j.y - pos.y, 2));
            if (dist < threshold && dist < minDesc) {
                minDesc = dist;
                nearest = j.id;
            }
        });

        if (nearest) {
            setDraggingId(nearest);
        }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getMousePos(e);

        if (draggingId) {
            setJoints(prev => prev.map(j => 
                j.id === draggingId ? { ...j, x: pos.x, y: pos.y } : j
            ));
        } else {
            // Hover logic
            const threshold = 0.05;
            let nearest: string | null = null;
            let minDesc = Infinity;

            joints.forEach(j => {
                const dist = Math.sqrt(Math.pow(j.x - pos.x, 2) + Math.pow(j.y - pos.y, 2));
                if (dist < threshold && dist < minDesc) {
                    minDesc = dist;
                    nearest = j.id;
                }
            });
            setHoverId(nearest);
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        onSave(base64);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[150] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="accessibility" className="w-5 h-5 text-fuchsia-400" />
                        Pose Director
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-20 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 space-y-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Templates</span>
                        
                        <button onClick={() => applyTemplate('standing')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors" title="Stand">
                            <Icon name="user" className="w-6 h-6" />
                        </button>
                        <button onClick={() => applyTemplate('running')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors" title="Run">
                            <Icon name="activity" className="w-6 h-6" />
                        </button>
                        <button onClick={() => applyTemplate('sitting')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors" title="Sit">
                            <Icon name="chevron-down" className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Canvas */}
                    <div 
                        ref={containerRef}
                        className="flex-grow bg-slate-950 relative cursor-move touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                    >
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                        
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-slate-300 text-xs px-3 py-1 rounded-full pointer-events-none">
                            Drag joints to pose character
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-800/30 flex justify-end gap-3 border-t border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"
                    >
                        <Icon name="check" className="w-4 h-4" />
                        Use Pose
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PoseEditorModal;
