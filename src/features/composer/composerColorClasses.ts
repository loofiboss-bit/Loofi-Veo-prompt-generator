interface ComposerColorClasses {
  text: string;
  bg: string;
  bg15: string;
  bg20: string;
  bg40: string;
  border60: string;
}

const DEFAULT_COLOR_CLASSES: ComposerColorClasses = {
  text: 'text-slate-400',
  bg: 'bg-slate-400',
  bg15: 'bg-slate-400/15',
  bg20: 'bg-slate-400/20',
  bg40: 'bg-slate-400/40',
  border60: 'border-slate-400/60',
};

const COLOR_CLASS_MAP: Record<string, ComposerColorClasses> = {
  '#22d3ee': {
    text: 'text-cyan-400',
    bg: 'bg-cyan-400',
    bg15: 'bg-cyan-400/15',
    bg20: 'bg-cyan-400/20',
    bg40: 'bg-cyan-400/40',
    border60: 'border-cyan-400/60',
  },
  '#a78bfa': {
    text: 'text-violet-400',
    bg: 'bg-violet-400',
    bg15: 'bg-violet-400/15',
    bg20: 'bg-violet-400/20',
    bg40: 'bg-violet-400/40',
    border60: 'border-violet-400/60',
  },
  '#60a5fa': {
    text: 'text-blue-400',
    bg: 'bg-blue-400',
    bg15: 'bg-blue-400/15',
    bg20: 'bg-blue-400/20',
    bg40: 'bg-blue-400/40',
    border60: 'border-blue-400/60',
  },
  '#f472b6': {
    text: 'text-pink-400',
    bg: 'bg-pink-400',
    bg15: 'bg-pink-400/15',
    bg20: 'bg-pink-400/20',
    bg40: 'bg-pink-400/40',
    border60: 'border-pink-400/60',
  },
  '#34d399': {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400',
    bg15: 'bg-emerald-400/15',
    bg20: 'bg-emerald-400/20',
    bg40: 'bg-emerald-400/40',
    border60: 'border-emerald-400/60',
  },
  '#fbbf24': {
    text: 'text-amber-400',
    bg: 'bg-amber-400',
    bg15: 'bg-amber-400/15',
    bg20: 'bg-amber-400/20',
    bg40: 'bg-amber-400/40',
    border60: 'border-amber-400/60',
  },
  '#94a3b8': {
    text: 'text-slate-400',
    bg: 'bg-slate-400',
    bg15: 'bg-slate-400/15',
    bg20: 'bg-slate-400/20',
    bg40: 'bg-slate-400/40',
    border60: 'border-slate-400/60',
  },
};

export const getComposerColorClasses = (color?: string): ComposerColorClasses => {
  if (!color) return DEFAULT_COLOR_CLASSES;

  return COLOR_CLASS_MAP[color.toLowerCase()] || DEFAULT_COLOR_CLASSES;
};
