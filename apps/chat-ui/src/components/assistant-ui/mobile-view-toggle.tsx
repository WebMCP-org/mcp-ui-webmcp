import { MessageSquare, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import type { FC } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type MobileView = 'chat' | 'ui';

/**
 * Mobile view toggle bar UI component
 *
 * Provides a fixed bottom bar with buttons to switch between chat and UI views
 * on mobile devices. Includes smooth animations and safe area insets for mobile browsers.
 *
 * @param mobileView - Current active view ('chat' or 'ui')
 * @param setMobileView - Function to change the active view
 *
 * @example
 * ```tsx
 * <MobileViewToggle
 *   mobileView={mobileView}
 *   setMobileView={setMobileView}
 * />
 * ```
 */
export const MobileViewToggle: FC<{
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
}> = ({ mobileView, setMobileView }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.42, 0, 0.58, 1] }}
      className="pointer-events-auto absolute bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm shadow-lg"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex items-center justify-around p-1 gap-1 max-[500px]:p-0.5 max-[500px]:gap-0.5">
        <button
          onClick={() => setMobileView('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all max-[500px]:py-1.5 max-[500px]:px-2',
            mobileView === 'chat'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <MessageSquare className="h-4 w-4 max-[500px]:h-3.5 max-[500px]:w-3.5" />
          <span className="text-sm font-medium max-[500px]:text-xs">Chat</span>
        </button>
        <button
          onClick={() => setMobileView('ui')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all max-[500px]:py-1.5 max-[500px]:px-2',
            mobileView === 'ui'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Wrench className="h-4 w-4 max-[500px]:h-3.5 max-[500px]:w-3.5" />
          <span className="text-sm font-medium max-[500px]:text-xs">Embedded UI</span>
        </button>
      </div>
    </motion.div>
  );
};
