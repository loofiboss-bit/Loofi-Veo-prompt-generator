import React, { useEffect, useRef, useState } from 'react';
import Icon from '@shared/components/ui/Icon';

export interface AutocompleteItem {
  id: string;
  label: string;
  description: string;
  type: 'character' | 'location' | 'variable';
}

interface AutocompleteMenuProps {
  items: AutocompleteItem[];
  position: { top: number; left: number };
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
}

const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({
  items,
  position,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (items[selectedIndex]) {
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    // Scroll selected item into view
    const activeItem = menuRef.current?.children[selectedIndex] as HTMLElement;
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[250px] max-w-sm max-h-64 overflow-y-auto animate-fade-in-up"
      style={{
        top: position.top + 24, // Offset below cursor
        left: position.left,
      }}
    >
      <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-500 bg-slate-950/50 border-b border-slate-800">
        Suggested Context
      </div>
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors ${
            index === selectedIndex
              ? 'bg-cyan-900/30 text-cyan-100'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div
            className={`mt-0.5 p-1.5 rounded-full ${item.type === 'character' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-emerald-500/20 text-emerald-400'}`}
          >
            <Icon name={item.type === 'character' ? 'user' : 'map-pin'} className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{item.label}</div>
            <div className="text-xs text-slate-500 truncate">{item.description}</div>
          </div>
          {index === selectedIndex && (
            <div className="text-[10px] text-slate-500 border border-slate-600 rounded px-1.5 py-0.5">
              Enter
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default AutocompleteMenu;
