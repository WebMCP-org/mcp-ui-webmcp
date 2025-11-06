import { useEffect, type RefObject } from 'react';

/**
 * Handle iframe resize messages and scaling
 *
 * Listens for ui-size-change messages from iframes and updates their dimensions.
 * Automatically scales down iframes that are too wide for their container while
 * maintaining their aspect ratio.
 *
 * @param iframeRef - Reference to the iframe element
 *
 * @example
 * ```ts
 * const iframeRef = useRef<HTMLIFrameElement>(null);
 * useIframeResize(iframeRef);
 * ```
 */
export function useIframeResize(iframeRef: RefObject<HTMLIFrameElement | null> | undefined) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ui-size-change') {
        const payload = event.data.payload as { height?: number; width?: number };

        if (iframeRef?.current) {
          const iframe = iframeRef.current;
          const container = iframe.parentElement;

          if (payload.width !== undefined && payload.height !== undefined && container) {
            const containerWidth = container.clientWidth;

            const targetWidth = containerWidth * 0.95;
            const scale = Math.min(targetWidth / payload.width, 1); // Don't scale up, only down

            iframe.style.width = `${payload.width}px`;
            iframe.style.height = `${payload.height}px`;

            if (scale < 1) {
              iframe.style.transform = `scale(${scale})`;
              iframe.style.transformOrigin = 'top center';
              iframe.style.marginBottom = `${payload.height * (scale - 1)}px`;
            } else {
              iframe.style.transform = 'none';
              iframe.style.marginBottom = '0';
            }

            console.log(
              `📏 Iframe resized: ${payload.width}x${payload.height} (scale: ${scale.toFixed(2)})`
            );
          } else if (payload.width !== undefined) {
            iframe.style.width = `${payload.width}px`;
            iframe.style.maxWidth = '100%';
          } else if (payload.height !== undefined) {
            iframe.style.height = `${payload.height}px`;
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef]);
}
