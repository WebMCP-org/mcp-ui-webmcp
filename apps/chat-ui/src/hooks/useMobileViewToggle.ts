import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from './useMediaQuery';

type MobileView = 'chat' | 'ui';

/**
 * Manage mobile view state, swipe gestures, and scroll preservation
 *
 * Handles switching between chat and UI views on mobile, preserves scroll
 * position when switching, and provides swipe gesture handlers for navigation.
 *
 * @param hasToolSurface - Whether any tool UI surfaces are currently displayed
 * @returns Mobile view state, handlers, and refs
 *
 * @example
 * ```ts
 * const {
 *   mobileView,
 *   setMobileView,
 *   viewportRef,
 *   handlePanEnd,
 *   isMobile,
 * } = useMobileViewToggle(hasToolSurface);
 *
 * // Auto-switches to UI view when tool surface appears on mobile
 * ```
 */
export function useMobileViewToggle(hasToolSurface: boolean) {
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  const isMobile = useIsMobile();
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile && hasToolSurface) {
      setMobileView('ui');
    }
  }, [isMobile, hasToolSurface]);

  useEffect(() => {
    if (!isMobile || !hasToolSurface) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    if (mobileView === 'ui') {
      setSavedScrollPosition(viewport.scrollTop);
    } else if (mobileView === 'chat') {
      viewport.scrollTop = savedScrollPosition;
    }
  }, [mobileView, isMobile, hasToolSurface, savedScrollPosition]);

  const handlePanEnd = useCallback(
    (
      _event: PointerEvent | MouseEvent | TouchEvent,
      info: { offset: { x: number; y: number } }
    ) => {
      if (!isMobile || !hasToolSurface) return;

      const swipeThreshold = 50; // Minimum distance for swipe detection
      const { x } = info.offset;

      if (x < -swipeThreshold && mobileView === 'chat') {
        setMobileView('ui');
      }
      else if (x > swipeThreshold && mobileView === 'ui') {
        setMobileView('chat');
      }
    },
    [isMobile, hasToolSurface, mobileView]
  );

  return {
    mobileView,
    setMobileView,
    viewportRef,
    handlePanEnd,
    isMobile,
  };
}
