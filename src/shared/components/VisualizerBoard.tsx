import React, { useMemo, useState } from 'react';
import { PromptState } from '@core/types';
import Icon from '@shared/components/ui/Icon';

interface VisualizerBoardProps {
  promptState: PromptState;
  label: string;
}

// Map color palette names to Hex codes
const PALETTE_MAP: Record<string, string[]> = {
  'Vibrant and saturated': ['#FF3B30', '#FF9500', '#5856D6', '#007AFF'],
  'Muted and desaturated': ['#8E8E93', '#AEAEB2', '#D1D1D6', '#636366'],
  'Monochrome (black and white)': ['#000000', '#333333', '#AAAAAA', '#FFFFFF'],
  'Pastel colors': ['#FFD1DC', '#C1E1C1', '#A7C7E7', '#FDFD96'],
  'Earthy Tones': ['#8B4513', '#A0522D', '#556B2F', '#D2B48C'],
  'Synthwave neon': ['#FF00FF', '#00FFFF', '#7B00FF', '#120024'],
  'Sepia tone': ['#704214', '#C2B280', '#E2C499', '#4E3629'],
  'Cool, blue tones': ['#001F3F', '#0074D9', '#7FDBFF', '#DDDDDD'],
  'Warm, golden hour tones': ['#FFD700', '#FFA500', '#FF8C00', '#8B4500'],
  'High contrast': ['#000000', '#FFFFFF', '#FF0000', '#FFFF00'],
  Technicolor: ['#E50914', '#008000', '#0000FF', '#FFFF00'],
  'Complementary color scheme': ['#FF5733', '#33FF57', '#3357FF', '#F3FF33'], // Generic rep
  'Triadic color scheme': ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'],
  'Analogous color scheme': ['#FF0000', '#FF7F00', '#FFFF00', '#808000'],
};

// Map time of day/lighting to CSS gradients
const ATMOSPHERE_MAP: Record<string, string> = {
  Morning: 'linear-gradient(to bottom right, #a1c4fd 0%, #c2e9fb 100%)',
  Midday: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
  'Golden Hour': 'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
  Dusk: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
  Night: 'linear-gradient(to top, #09203f 0%, #537895 100%)',
  Twilight: 'linear-gradient(to top, #1e3c72 0%, #2a5298 100%)',
  Any: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
};

const VisualizerBoard: React.FC<VisualizerBoardProps> = ({ promptState, label }) => {
  const [isFlashing, setIsFlashing] = useState(false);

  const colors = useMemo(() => {
    const key = promptState.colorPalette;
    // Fallback logic for custom text in palette (though currently it's a select)
    return PALETTE_MAP[key] || PALETTE_MAP['Vibrant and saturated'];
  }, [promptState.colorPalette]);

  const backgroundStyle = useMemo(() => {
    const timeKey = promptState.timeOfDay;
    // Basic gradient based on time
    let gradient = ATMOSPHERE_MAP[timeKey] || ATMOSPHERE_MAP['Any'];

    // Adjust based on Lighting Style (simulated with overlay blend modes in CSS usually, but here we adjust opacity/color hints)
    if (promptState.lightingStyle.includes('Low-key') || promptState.artStyle === 'Noir') {
      gradient = 'linear-gradient(to bottom, #000000 0%, #434343 74%)';
    } else if (
      promptState.lightingStyle.includes('Neon') ||
      promptState.visualEffect.includes('Neon')
    ) {
      gradient = 'linear-gradient(to right, #0f0c29, #302b63, #24243e)';
    }

    return { background: gradient };
  }, [
    promptState.timeOfDay,
    promptState.lightingStyle,
    promptState.artStyle,
    promptState.visualEffect,
  ]);

  const handleFlash = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center gap-2">
        <Icon name="palette" className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div
        onClick={handleFlash}
        className={`relative w-full h-32 rounded-xl overflow-hidden shadow-lg border transition-all duration-200 cursor-pointer group ${isFlashing ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.01]' : 'border-slate-700/50 hover:border-slate-600'}`}
      >
        {/* Background Atmosphere */}
        <div className="absolute inset-0 transition-all duration-700" style={backgroundStyle}></div>

        {/* Grain/Texture Overlay */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>

        {/* Info Overlay */}
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[10px] font-bold text-white/80 bg-black/20 px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider">
            {promptState.timeOfDay !== 'Any' ? promptState.timeOfDay : 'Atmosphere'}
          </span>
        </div>

        {/* Color Palette Swatches */}
        <div className="absolute bottom-3 right-3 flex gap-[-8px] z-10">
          {colors.map((color, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md transform -ml-3 first:ml-0 transition-transform hover:scale-110 hover:z-20"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Art Style Badge */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/60 uppercase">Style</span>
            <span className="text-sm font-bold text-white shadow-black drop-shadow-md">
              {promptState.artStyle === 'Custom' ? 'Custom' : promptState.artStyle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizerBoard;
