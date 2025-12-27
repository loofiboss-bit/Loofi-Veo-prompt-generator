
import React, { useState, useRef, useEffect } from 'react';
import { ExamplePrompt } from '../types';
import Icon from './Icon';

interface ExamplesCarouselProps {
  examples: ExamplePrompt[];
  onUseExample: (example: ExamplePrompt) => void;
  useExampleText: string;
  onClose: () => void;
  title: string;
}

const ExamplesCarousel: React.FC<ExamplesCarouselProps> = ({ examples, onUseExample, useExampleText, onClose, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [liveRegionText, setLiveRegionText] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  
  // Touch state for swipe detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    if (carouselRef.current) {
        carouselRef.current.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
    if (examples.length > 0) {
        const currentExample = examples[currentIndex];
        setLiveRegionText(`Showing example ${currentIndex + 1} of ${examples.length}: ${currentExample.title}`);
    }
  }, [currentIndex, examples]);
  
  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? examples.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === examples.length - 1 ? 0 : prevIndex + 1));
  };
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };
  
  const handleUse = () => {
      setIsApplying(true);
      setTimeout(() => {
          onUseExample(examples[currentIndex]);
          setIsApplying(false);
      }, 500);
  };

  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-lg p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-800 relative">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveRegionText}
      </div>
      <button 
        onClick={onClose} 
        className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors z-10"
        aria-label="Close examples"
      >
        <Icon name="cancel" className="w-6 h-6" />
      </button>

      <h3 className="text-xl font-semibold text-slate-100 mb-4 text-center">{title}</h3>

      <div 
        className="overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          ref={carouselRef}
          className="flex transition-transform duration-500 ease-in-out"
        >
          {examples.map((example, index) => (
            <div key={index} className="w-full flex-shrink-0 px-2">
              <h4 className="text-lg font-bold text-cyan-400">{example.title}</h4>
              <p className="text-sm text-slate-300 mt-1 mb-3 italic">Idea: "{example.idea}"</p>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
                <p className="text-slate-300 text-sm leading-relaxed">{example.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <button onClick={handlePrev} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-300 transition-colors" aria-label="Previous example">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </button>
          <span className="text-sm text-slate-300 select-none">{currentIndex + 1} / {examples.length}</span>
          <button onClick={handleNext} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-300 transition-colors" aria-label="Next example">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <button
            onClick={handleUse}
            disabled={isApplying}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300 flex items-center gap-2 ${
                isApplying 
                ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                : 'bg-cyan-600 text-white hover:bg-cyan-500'
            }`}
        >
            {isApplying ? (
                <>
                    <Icon name="check" className="w-4 h-4 animate-bounce" />
                    <span>Applied!</span>
                </>
            ) : useExampleText}
        </button>
      </div>
    </div>
  );
};

export default ExamplesCarousel;
