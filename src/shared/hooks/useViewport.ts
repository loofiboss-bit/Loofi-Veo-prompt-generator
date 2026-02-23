import { useState, useEffect, useCallback, useMemo } from 'react';

interface ViewportState {
  width: number;
  height: number;
  scaleFactor: number;
  /** CSS pixels available after OS display scaling */
  effectiveWidth: number;
  effectiveHeight: number;
}

interface ViewportFlags {
  /** < 640px effective width */
  isMobile: boolean;
  /** 640-1023px effective width */
  isTablet: boolean;
  /** >= 1024px effective width */
  isDesktop: boolean;
  /** < 1200px effective width — triggers compact UI (e.g. 1920x1080 at 150%) */
  isCompact: boolean;
  /** >= 1536px effective width */
  isWide: boolean;
}

export type ViewportInfo = ViewportState & ViewportFlags;

const COMPACT_THRESHOLD = 1200;
const MOBILE_THRESHOLD = 640;
const TABLET_MAX = 1023;
const DESKTOP_THRESHOLD = 1024;
const WIDE_THRESHOLD = 1536;

const getViewportState = (): ViewportState => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scaleFactor = window.devicePixelRatio || 1;

  return {
    width,
    height,
    scaleFactor,
    effectiveWidth: width,
    effectiveHeight: height,
  };
};

const deriveFlags = (state: ViewportState): ViewportFlags => ({
  isMobile: state.effectiveWidth < MOBILE_THRESHOLD,
  isTablet: state.effectiveWidth >= MOBILE_THRESHOLD && state.effectiveWidth <= TABLET_MAX,
  isDesktop: state.effectiveWidth >= DESKTOP_THRESHOLD,
  isCompact: state.effectiveWidth < COMPACT_THRESHOLD,
  isWide: state.effectiveWidth >= WIDE_THRESHOLD,
});

/**
 * Reactive viewport hook that tracks window dimensions, display scale factor,
 * and derived responsive breakpoint flags.
 *
 * Debounces resize events to avoid excessive re-renders.
 */
export const useViewport = (debounceMs = 150): ViewportInfo => {
  const [state, setState] = useState<ViewportState>(getViewportState);

  const handleResize = useCallback(() => {
    setState(getViewportState());
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, debounceMs);
    };

    window.addEventListener('resize', debouncedResize);

    const mediaQuery = window.matchMedia?.('(resolution: 1dppx)');
    const handleDpiChange = () => handleResize();
    mediaQuery?.addEventListener?.('change', handleDpiChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      mediaQuery?.removeEventListener?.('change', handleDpiChange);
    };
  }, [handleResize, debounceMs]);

  const flags = useMemo(() => deriveFlags(state), [state]);

  return useMemo(() => ({ ...state, ...flags }), [state, flags]);
};
