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
  
  const handleUse = () => {
      onUseExample(examples[currentIndex]);
  };

  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-700 relative">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveRegionText}
      </div>
      <button 
        onClick={onClose} 
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10"
        aria-label="Close examples"
      >
        <Icon name="cancel" className="w-6 h-6" />
      </button>

      <h3 className="text-xl font-semibold text-gray-100 mb-4 text-center">{title}</h3>

      <div className="overflow-hidden">
        <div 
          ref={carouselRef}
          className="flex transition-transform duration-500 ease-in-out"
        >
          {examples.map((example, index) => (
            <div key={index} className="w-full flex-shrink-0 px-2">
              <h4 className="text-lg font-bold text-purple-400">{example.title}</h4>
              <p className="text-sm text-gray-300 mt-1 mb-3 italic">Idea: "{example.idea}"</p>
              <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-600 max-h-48 overflow-y-auto">
                <p className="text-gray-300 text-sm leading-relaxed">{example.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <button onClick={handlePrev} className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-full text-gray-300 transition-colors" aria-label="Previous example">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </button>
          <span className="text-sm text-gray-300 select-none">{currentIndex + 1} / {examples.length}</span>
          <button onClick={handleNext} className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-full text-gray-300 transition-colors" aria-label="Next example">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <button
            onClick={handleUse}
            className="px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-purple-600 text-white hover:bg-purple-700"
        >
            {useExampleText}
        </button>
      </div>
    </div>
  );
};

export default ExamplesCarousel;