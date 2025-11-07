import { useAssistantRuntime } from '@assistant-ui/react';
import { motion } from 'motion/react';
import { Wrench } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { type ToolStatus } from './tool-status-badge';
import { type ToolCallStatus } from './types';

/**
 * Smart text truncation that tries to preserve sentence boundaries
 *
 * Attempts to show the last N characters of text while preserving complete
 * sentences when possible, falling back to word boundaries if needed.
 *
 * @param text - The full text to truncate
 * @param maxChars - Maximum characters to display (default: 100)
 * @returns Object with truncated text and truncation flag
 */
function getDisplayText(text: string, maxChars = 100): { text: string; isTruncated: boolean } {
  if (text.length <= maxChars) return { text, isTruncated: false };

  const truncated = text.slice(-maxChars);
  const sentenceStart = truncated.search(/[.!?]\s+/);

  if (sentenceStart > 0) {
    return { text: truncated.slice(sentenceStart + 2), isTruncated: true };
  }

  const wordStart = truncated.indexOf(' ');
  const finalText = wordStart > 0 ? '...' + truncated.slice(wordStart) : truncated;
  return { text: finalText, isTruncated: true };
}

/**
 * Get border color Tailwind class based on tool execution status
 *
 * @param status - Current tool execution status
 * @returns Tailwind border color class
 */
function getBorderColorForStatus(status: ToolStatus): string {
  switch (status) {
    case 'running':
      return 'border-blue-500';
    case 'completed':
      return 'border-green-500';
    case 'error':
      return 'border-destructive';
    case 'cancelled':
      return 'border-gray-500';
    case 'waiting':
      return 'border-yellow-500';
    default:
      return 'border-border/60';
  }
}

/**
 * Calculate reading time in milliseconds based on word count
 *
 * Assumes ~300 WPM reading speed (~200ms per word).
 * Clamps result between 2-5 seconds for reasonable auto-hide timing.
 *
 * @param text - Text to calculate reading time for
 * @returns Reading time in milliseconds (between 2000-5000ms)
 */
function getReadingTime(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const readingTime = wordCount * 200;
  const minReadingTime = 2000;
  const maxReadingTime = 5000;
  return Math.min(Math.max(readingTime, minReadingTime), maxReadingTime);
}

/**
 * Status indicator dot with pulsing animation for running state
 *
 * Displays a colored dot that indicates tool execution status:
 * - Blue (pulsing): Tool is running
 * - Green (solid): Tool completed successfully
 * - Red (solid): Tool encountered an error
 * - Yellow (solid): Waiting for action
 * - Gray (solid): Cancelled or idle
 *
 * @param props - Component props
 * @param props.status - Current tool status from tool-status-badge
 * @see {@link tool-status-badge.tsx} for ToolStatus type definition
 */
function StatusDot({ status }: { status: ToolStatus }) {
  const colors = {
    idle: 'bg-gray-400',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    error: 'bg-destructive',
    cancelled: 'bg-gray-500',
    waiting: 'bg-yellow-500',
  };

  return (
    <motion.div
      layout
      className={cn('size-2 rounded-full', colors[status])}
      animate={status === 'running' ? { opacity: [0.5, 1, 0.5] } : {}}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/**
 * Typing indicator with animated bouncing dots
 *
 * Shows three dots that animate vertically in sequence to indicate
 * active text streaming. Each dot has a 150ms delay to create a wave effect.
 */
function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center ml-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="size-1 rounded-full bg-muted-foreground/60"
          animate={{ y: [-2, 0, -2] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Mobile streaming overlay that displays assistant activity at the top of the screen
 *
 * Shows real-time updates during assistant responses including:
 * - Streaming text with smart truncation (preserves sentence boundaries)
 * - Tool execution status with visual indicators
 * - Animated typing indicator during active streaming
 * - Status-based border colors (blue=running, green=complete, red=error)
 *
 * Features:
 * - Smooth slide-down entrance animation
 * - Adaptive auto-hide based on reading speed (2-5 seconds)
 * - Tap to dismiss after 1 second (when not actively streaming)
 * - Respects prefers-reduced-motion settings
 * - Won't hide while tools are running or text is streaming
 *
 * @example
 * ```tsx
 * // Used in thread.tsx for mobile UI panel view
 * {isMobile && mobileView !== 'chat' && hasToolSurface && <StreamingOverlay />}
 * ```
 *
 * @see {@link thread.tsx} for integration point
 */
export function StreamingOverlay() {
  const runtime = useAssistantRuntime();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [toolNames, setToolNames] = useState<string | null>(null);
  const [toolStatus, setToolStatus] = useState<ToolStatus>('idle');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDismissable, setIsDismissable] = useState(false);

  useEffect(() => {
    const unsubscribe = runtime.thread.subscribe(() => {
      const threadState = runtime.thread.getState();
      const messages = threadState.messages;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.role === 'assistant') {
        const textParts = lastMessage.content.filter((part) => part.type === 'text');
        const textContent = textParts.map((part) => part.text).join(' ');

        const toolCalls = lastMessage.content.filter((part) => part.type === 'tool-call');

        if (toolCalls.length > 0) {
          const names = toolCalls
            .map((tc) => ('toolName' in tc ? tc.toolName : null))
            .filter((name): name is string => Boolean(name))
            .join(', ');
          setToolNames(names || 'tool');

          const hasRunning = toolCalls.some((tc) => {
            if ('status' in tc) {
              const status = tc.status as ToolCallStatus | undefined;
              return status?.type === 'running';
            }
            return false;
          });
          const hasError = toolCalls.some((tc) => {
            if ('status' in tc) {
              const status = tc.status as ToolCallStatus | undefined;
              return status?.type === 'incomplete';
            }
            if ('isError' in tc) {
              return tc.isError === true;
            }
            return false;
          });

          if (hasRunning) {
            setToolStatus('running');
          } else if (hasError) {
            setToolStatus('error');
          } else if (lastMessage.status?.type === 'complete') {
            setToolStatus('completed');
          } else {
            setToolStatus('running');
          }
        } else {
          setToolNames(null);
          setToolStatus('idle');
        }

        const isCurrentlyStreaming = lastMessage.status?.type !== 'complete' && textContent.trim().length > 0;
        setIsStreaming(isCurrentlyStreaming);

        if (textContent.trim()) {
          const { text } = getDisplayText(textContent);
          setDisplayText(text);
          setVisible(true);
        } else if (toolCalls.length > 0) {
          setDisplayText('');
          setVisible(true);
        }
      } else {
        setVisible(false);
        setIsStreaming(false);
      }
    });

    return () => unsubscribe();
  }, [runtime.thread]);

  useEffect(() => {
    if (!visible) return;

    if (toolStatus === 'running') return;

    if (isStreaming) return;

    const hideDelay = getReadingTime(displayText);

    const timer = setTimeout(() => {
      setVisible(false);
    }, hideDelay);

    return () => clearTimeout(timer);
  }, [visible, displayText, toolStatus, isStreaming]);

  useEffect(() => {
    if (!visible) {
      setIsDismissable(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsDismissable(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [visible]);

  const borderColor = useMemo(() => getBorderColorForStatus(toolStatus), [toolStatus]);

  const handleClick = () => {
    if (isDismissable && !isStreaming && toolStatus !== 'running') {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: [0.42, 0, 0.58, 1],
      }}
      style={{
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        contain: 'layout style paint',
      }}
      className={cn(
        'fixed top-12 left-4 right-4 z-50',
        'px-4 py-3 rounded-lg',
        'bg-background/98 border-2',
        borderColor,
        'shadow-xl backdrop-blur-md',
        'max-h-36 overflow-hidden',
        'transition-colors duration-300',
        isDismissable && !isStreaming && toolStatus !== 'running'
          ? 'pointer-events-auto cursor-pointer active:scale-[0.98]'
          : 'pointer-events-none'
      )}
      onClick={handleClick}
    >
      <div className="space-y-2">
        {toolNames && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Using:</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
              <Wrench className="size-3 text-blue-500 shrink-0" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                {toolNames}
              </span>
            </div>
            <StatusDot status={toolStatus} />
          </div>
        )}

        {displayText && (
          <div className="flex items-start gap-1">
            <div
              className={cn(
                'text-base leading-relaxed text-foreground break-words flex-1',
                toolNames ? 'line-clamp-2' : 'line-clamp-3'
              )}
            >
              <motion.span
                key={displayText}
                initial={{ backgroundColor: 'hsl(var(--primary) / 0.05)' }}
                animate={{ backgroundColor: 'hsl(var(--primary) / 0)' }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
                className="inline-block rounded px-1 -mx-1"
              >
                {displayText}
              </motion.span>
            </div>
            {isStreaming && <TypingIndicator />}
          </div>
        )}

        {isDismissable && !isStreaming && toolStatus !== 'running' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] text-muted-foreground/60 text-center pt-1"
          >
            Tap to dismiss
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
