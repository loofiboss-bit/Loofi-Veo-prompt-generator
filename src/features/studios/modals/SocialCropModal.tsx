import React, { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import { CropConfig } from '@core/types';

interface SocialCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  onConfirm: (config: CropConfig) => void;
}

const SocialCropModal: React.FC<SocialCropModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [minX, setMinX] = useState(0); // Max scroll left (negative value)

  // Calculate dimensions on load/resize
  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current && containerRef.current) {
        const containerW = containerRef.current.offsetWidth;
        const videoW = videoRef.current.offsetWidth;
        // MinX is the difference between container width and video width
        // Since video is wider, minX will be negative
        setMinX(containerW - videoW);

        // Center initially
        setCurrentX((containerW - videoW) / 2);
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateDimensions);
      window.addEventListener('resize', updateDimensions);
      // Also trigger after a short timeout to ensure layout is stable
      setTimeout(updateDimensions, 100);
    }

    return () => {
      if (video) video.removeEventListener('loadedmetadata', updateDimensions);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isOpen, videoUrl]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX - currentX);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    let newX = clientX - startX;

    // Constraint logic
    if (newX > 0) newX = 0;
    if (newX < minX) newX = minX;

    setCurrentX(newX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    // Calculate percentage: 0 = Left edge visible, 1 = Right edge visible
    // currentX goes from 0 (Left aligned) to minX (Right aligned)
    // Range is |minX|
    // Percentage = Math.abs(currentX) / Math.abs(minX)
    let percentage = 0;
    if (minX !== 0) {
      percentage = Math.abs(currentX) / Math.abs(minX);
    }
    // Clamp
    percentage = Math.max(0, Math.min(1, percentage));

    onConfirm({ xPercentage: percentage });
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="base"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden h-[85vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="smartphone" className="w-5 h-5 text-fuchsia-400" />
            Social Cut (9:16)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow flex items-center justify-center bg-black relative overflow-hidden select-none">
          {/* Phone Frame / Mask */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Draggable crop area; has role="application" and keyboard/touch handlers */}
          <div
            ref={containerRef}
            className="relative w-full max-w-[320px] aspect-[9/16] bg-slate-900 border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            role="application"
            tabIndex={0}
            onTouchStart={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleMouseUp}
          >
            {/* Video Layer */}
            <div
              className="absolute top-0 h-full flex items-center"
              style={{
                left: `${currentX}px`,
                width:
                  '177.77%' /* 16/9 ratio relative to 9/16 height container implies height is 100%, width is much larger. */,
                /* Actually, if container is 9:16, height=100%.
                                                    Video is 16:9.
                                                    Ratio of VideoWidth / VideoHeight = 1.77
                                                    Ratio of ContainerWidth / ContainerHeight = 0.5625
                                                    VideoWidth = ContainerHeight * 1.77
                                                    ContainerWidth = ContainerHeight * 0.56
                                                    VideoWidth / ContainerWidth = 1.77 / 0.56 = 3.16
                                                    So width should be roughly 316% of container width?
                                                    Let's rely on img/video sizing "h-full w-auto" and standard flex behavior. */
              }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="h-full w-auto max-w-none pointer-events-none"
                muted
                loop
                autoPlay
                playsInline
              />
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30 grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/50" />
              <div className="border-r border-b border-white/50" />
              <div className="border-b border-white/50" />
              <div className="border-r border-b border-white/50" />
              <div className="border-r border-b border-white/50" />
              <div className="border-b border-white/50" />
              <div className="border-r border-white/50" />
              <div className="border-r border-white/50" />
              <div />
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
              <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                Drag to Center
              </span>
            </div>
          </div>

          {/* Background Blur for aesthetics */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <video
              src={videoUrl}
              className="w-full h-full object-cover blur-xl"
              muted
              loop
              autoPlay
            />
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 flex justify-between items-center flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"
          >
            <Icon name="download" className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </AppDialog>
  );
};

export default SocialCropModal;
