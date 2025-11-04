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

  // Auto-switch to UI view on mobile when tool surface first appears
  useEffect(() => {
    if (isMobile && hasToolSurface) {
      setMobileView('ui');
    }
  }, [isMobile, hasToolSurface]);

  // Save scroll position when leaving chat view, restore when returning
  useEffect(() => {
    if (!isMobile || !hasToolSurface) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    if (mobileView === 'ui') {
      // Switching away from chat - save scroll position
      setSavedScrollPosition(viewport.scrollTop);
    } else if (mobileView === 'chat') {
      // Switching back to chat - restore scroll position
      viewport.scrollTop = savedScrollPosition;
    }
  }, [mobileView, isMobile, hasToolSurface, savedScrollPosition]);

  // Pan gesture handler for swipe navigation
  const handlePanEnd = useCallback(
    (
      _event: PointerEvent | MouseEvent | TouchEvent,
      info: { offset: { x: number; y: number } }
    ) => {
      // Only handle swipe on mobile when tool surface is visible
      if (!isMobile || !hasToolSurface) return;

      const swipeThreshold = 50; // Minimum distance for swipe detection
      const { x } = info.offset;

      // Swipe left (negative x): Chat → UI
      if (x < -swipeThreshold && mobileView === 'chat') {
        setMobileView('ui');
      }
      // Swipe right (positive x): UI → Chat
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
