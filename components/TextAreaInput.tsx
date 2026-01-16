
import React, { forwardRef, useState, useRef, useEffect } from 'react';
import Tooltip from './Tooltip';
import Icon from './Icon';
import { useAppStore } from '../store/useAppStore';
import { useLocationStore } from '../store/useLocationStore';
import AutocompleteMenu, { AutocompleteItem } from './AutocompleteMenu';

interface TextAreaInputProps {
  label: string | React.ReactNode;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  error?: string;
  info?: string;
  actionButton?: React.ReactNode;
  actionButtonPaddingClass?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onEnhance?: () => void;
  isEnhancing?: boolean;
}

// Helper to calculate caret coordinates
const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);
    
    // Copy all font/layout styles
    for (const prop of Array.from(style)) {
        div.style.setProperty(prop, style.getPropertyValue(prop));
    }

    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.visibility = 'hidden';
    div.style.height = 'auto';
    div.style.overflow = 'hidden';
    div.style.whiteSpace = 'pre-wrap';

    const textContent = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = textContent;
    div.appendChild(span);
    
    const cursor = document.createElement('span');
    cursor.textContent = '|';
    div.appendChild(cursor);

    document.body.appendChild(div);
    
    const coordinates = {
        top: cursor.offsetTop + element.offsetTop - element.scrollTop,
        left: cursor.offsetLeft + element.offsetLeft - element.scrollLeft
    };

    document.body.removeChild(div);
    
    // Adjust for scroll and bounding rect
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + cursor.offsetTop - element.scrollTop,
        left: rect.left + cursor.offsetLeft - element.scrollLeft
    };
};

const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  rows = 4,
  error,
  info,
  actionButton,
  actionButtonPaddingClass = 'pr-12',
  disabled,
  autoFocus,
  onEnhance,
  isEnhancing
}, ref) => {
  const id = `textarea-${name}`;
  const hasError = !!error;
  const characterCount = value?.length || 0;
  
  // Autocomplete State
  const [showMenu, setShowMenu] = useState(false);
  const [menuItems, setMenuItems] = useState<AutocompleteItem[]>([]);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [triggerMatch, setTriggerMatch] = useState<{ index: number, length: number } | null>(null);
  
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null); // For Variable Highlighting
  const { characterBank, variables } = useAppStore();
  const { locations } = useLocationStore();

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);
      checkTrigger(e.target);
  };

  const handleScroll = () => {
      if (innerRef.current && backdropRef.current) {
          backdropRef.current.scrollTop = innerRef.current.scrollTop;
          backdropRef.current.scrollLeft = innerRef.current.scrollLeft;
      }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
          setShowMenu(false);
      } else {
          checkTrigger(e.currentTarget);
      }
  };

  const checkTrigger = (element: HTMLTextAreaElement) => {
      const caret = element.selectionStart;
      const text = element.value;
      const textBefore = text.substring(0, caret);
      
      // Match the last word being typed (starting with @, #, or {{)
      // Regex: look for (@ or # or {{) followed by chars, at the end of the string
      const match = textBefore.match(/([@#]|\{\{)([\w\s]*)$/);
      
      if (match) {
          const triggerChar = match[1];
          const query = match[2].toLowerCase();
          const matchIndex = match.index!;
          
          let results: AutocompleteItem[] = [];

          if (triggerChar === '@') {
              results = characterBank
                  .filter(c => c.name.toLowerCase().includes(query))
                  .map(c => ({
                      id: c.id,
                      label: c.name,
                      description: `${c.attributes.age} ${c.attributes.gender}, ${c.wardrobe || ''}`.substring(0, 50) + '...',
                      type: 'character'
                  }));
          } else if (triggerChar === '#') {
              results = locations
                  .filter(l => l.name.toLowerCase().includes(query))
                  .map(l => ({
                      id: l.id,
                      label: l.name,
                      description: l.description.substring(0, 50) + '...',
                      type: 'location'
                  }));
          } else if (triggerChar === '{{') {
              results = Object.keys(variables)
                  .filter(k => k.toLowerCase().includes(query))
                  .map(k => ({
                      id: k,
                      label: k,
                      description: variables[k].substring(0, 50) + '...',
                      type: 'variable' as any // Casting for loose type compliance or extend AutocompleteItem type
                  }));
          }

          if (results.length > 0) {
              const coords = getCaretCoordinates(element, matchIndex + triggerChar.length);
              setMenuPos(coords);
              setMenuItems(results);
              setTriggerMatch({ index: matchIndex, length: match[0].length });
              setShowMenu(true);
              return;
          }
      }
      
      setShowMenu(false);
  };

  const handleSelect = (item: AutocompleteItem) => {
      if (!triggerMatch || !innerRef.current) return;
      
      const element = innerRef.current;
      const text = element.value;
      const before = text.substring(0, triggerMatch.index);
      const after = text.substring(triggerMatch.index + triggerMatch.length);
      
      // Construct rich insertion
      let expandedText = '';
      if ((item as any).type === 'variable') {
          expandedText = `{{${item.label}}}`;
      } else {
          expandedText = `${item.label} (${item.description})`;
      }
      
      const newValue = before + expandedText + after;
      
      // Propagate change
      const event = {
          target: { name, value: newValue },
          currentTarget: { name, value: newValue }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
      
      setShowMenu(false);
      
      // Restore focus and move cursor
      setTimeout(() => {
          element.focus();
          const newCursorPos = before.length + expandedText.length;
          element.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
  };

  // Combine refs
  const setRefs = (element: HTMLTextAreaElement | null) => {
      innerRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as any).current = element;
  };

  // Styles
  const baseClasses = `w-full bg-slate-900/60 backdrop-blur-sm border rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 ease-out p-4 resize-y disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed shadow-sm hover:shadow-md hover:border-slate-500/50 ${onEnhance ? 'pb-10' : ''}`;
  const errorClasses = "border-red-500/50 focus:border-red-500 focus:ring-red-500/20";
  const normalClasses = "border-slate-700/60";
  const actionButtonPadding = actionButton ? actionButtonPaddingClass : "";

  // Highlight rendering for backdrop
  const renderHighlights = (text: string) => {
      if (!text) return null;
      // Regex to find {{VAR}}
      const parts = text.split(/(\{\{[A-Z0-9_]+\}\})/g);
      return parts.map((part, i) => {
          if (part.match(/^\{\{[A-Z0-9_]+\}\}$/)) {
              const key = part.slice(2, -2);
              const exists = variables.hasOwnProperty(key);
              return (
                  <span key={i} className={`inline-block rounded px-0.5 mx-0.5 ${exists ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-500/30' : 'bg-red-900/50 text-red-300 border border-red-500/30'}`}>
                      {part}
                  </span>
              );
          }
          return part;
      });
  };

  const handleEnhance = (e: React.MouseEvent) => {
      e.preventDefault();
      if(onEnhance) onEnhance();
  };

  return (
    <div className="group relative">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="flex-grow flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wide group-focus-within:text-cyan-400 transition-colors">
            <span className="flex-grow">{label}</span>
            {info && <Tooltip text={info} />}
        </label>
        {maxLength && (
          <span className={`text-[10px] font-medium transition-colors ${characterCount > maxLength ? 'text-red-400' : 'text-slate-600 group-focus-within:text-slate-500'}`}>
            {characterCount} / {maxLength}
          </span>
        )}
      </div>
      
      <div className="relative">
        {/* Backdrop for Highlighting */}
        <div 
            ref={backdropRef}
            aria-hidden="true"
            className={`${baseClasses} border-transparent absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-transparent bg-transparent z-0`}
            style={{ 
                fontFamily: 'inherit', 
                fontSize: 'inherit', 
                lineHeight: 'inherit', 
                letterSpacing: 'inherit'
            }}
        >
            {renderHighlights(value)}
            {/* Add extra character to prevent jumpiness on trailing newline */}
            <span className="invisible">.</span> 
        </div>

        <textarea
          ref={setRefs}
          id={id}
          name={name}
          value={value}
          onChange={handleInput}
          onScroll={handleScroll}
          onKeyUp={handleKeyUp}
          onClick={(e) => checkTrigger(e.currentTarget)}
          onBlur={(e) => {
              setTimeout(() => setShowMenu(false), 200);
              if (onBlur) onBlur(e);
          }}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`${baseClasses} ${hasError ? errorClasses : normalClasses} ${actionButtonPadding} relative z-10 bg-transparent`} // Important: Transparent bg to see backdrop
          style={{ 
              background: 'transparent' // Explicit overwrite
          }}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        
        {actionButton && (
          <div className="absolute top-3 right-3 z-20">
            {actionButton}
          </div>
        )}
        {onEnhance && (
            <button
                onClick={handleEnhance}
                disabled={isEnhancing || disabled || !value}
                className="absolute bottom-3 right-3 z-20 p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 transition-all shadow-sm backdrop-blur-md group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Magic Enhance (AI)"
            >
                {isEnhancing ? (
                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Icon name="sparkles" className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Magic</span>
                    </div>
                )}
            </button>
        )}
      </div>
      
      {hasError && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-400 font-medium animate-text-fade-in" role="alert">
          {error}
        </p>
      )}
      
      {showMenu && (
          <AutocompleteMenu 
              items={menuItems} 
              position={menuPos} 
              onSelect={handleSelect} 
              onClose={() => setShowMenu(false)}
          />
      )}
    </div>
  );
});

export default TextAreaInput;
