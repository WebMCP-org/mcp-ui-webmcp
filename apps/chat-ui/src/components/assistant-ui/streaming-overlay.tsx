import { useAssistantRuntime } from '@assistant-ui/react';
import { motion } from 'motion/react';
import { Wrench } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

type ToolStatus = 'idle' | 'running' | 'complete' | 'error';

/**
 * Smart text truncation that tries to preserve sentence boundaries
 */
function getDisplayText(text: string, maxChars = 100): { text: string; isTruncated: boolean } {
  if (text.length <= maxChars) return { text, isTruncated: false };

  // Try to find last sentence boundary
  const truncated = text.slice(-maxChars);
  const sentenceStart = truncated.search(/[.!?]\s+/);

  if (sentenceStart > 0) {
    return { text: truncated.slice(sentenceStart + 2), isTruncated: true };
  }

  // Fall back to word boundary
  const wordStart = truncated.indexOf(' ');
  const finalText = wordStart > 0 ? '...' + truncated.slice(wordStart) : truncated;
  return { text: finalText, isTruncated: true };
}

/**
 * Get border color based on tool status
 */
function getBorderColorForStatus(status: ToolStatus): string {
  switch (status) {
    case 'running':
      return 'border-blue-500';
    case 'complete':
      return 'border-green-500';
    case 'error':
      return 'border-destructive';
    default:
      return 'border-border/60';
  }
}

/**
 * Calculate reading time in milliseconds based on word count
 * Assumes ~300 WPM reading speed
 */
function getReadingTime(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const readingTime = wordCount * 200; // ~200ms per word
  // Min 2s, max 5s
  return Math.min(Math.max(readingTime, 2000), 5000);
}

/**
 * Status indicator dot with pulsing animation for running state
 */
function StatusDot({ status }: { status: ToolStatus }) {
  const colors = {
    idle: 'bg-gray-400',
    running: 'bg-blue-500',
    complete: 'bg-green-500',
    error: 'bg-destructive',
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
 * Typing indicator with animated dots
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

export function StreamingOverlay() {
  const runtime = useAssistantRuntime();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [toolNames, setToolNames] = useState<string | null>(null);
  const [toolStatus, setToolStatus] = useState<ToolStatus>('idle');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDismissable, setIsDismissable] = useState(false);

  // Subscribe to thread updates
  useEffect(() => {
    const unsubscribe = runtime.thread.subscribe(() => {
      const threadState = runtime.thread.getState();
      const messages = threadState.messages;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.role === 'assistant') {
        const textParts = lastMessage.content.filter((part) => part.type === 'text');
        const textContent = textParts.map((part) => part.text).join(' ');

        const toolCalls = lastMessage.content.filter((part) => part.type === 'tool-call');

        // Update tool status
        if (toolCalls.length > 0) {
          const names = toolCalls.map((tc) => tc.toolName || 'tool').join(', ');
          setToolNames(names);

          // Determine status based on message state
          const hasRunning = toolCalls.some((tc) => {
            const status = (tc as any).status;
            return status?.type === 'running';
          });
          const hasError = toolCalls.some((tc) => {
            const status = (tc as any).status;
            return status?.type === 'incomplete' || (tc as any).isError;
          });

          if (hasRunning) {
            setToolStatus('running');
          } else if (hasError) {
            setToolStatus('error');
          } else if (lastMessage.status === 'done') {
            setToolStatus('complete');
          } else {
            setToolStatus('running');
          }
        } else {
          setToolNames(null);
          setToolStatus('idle');
        }

        // Update streaming state
        const isCurrentlyStreaming = lastMessage.status !== 'done' && textContent.trim().length > 0;
        setIsStreaming(isCurrentlyStreaming);

        // Update display text and visibility
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

  // Smart auto-hide logic
  useEffect(() => {
    if (!visible) return;

    // Don't hide while tool is actively running
    if (toolStatus === 'running') return;

    // Don't hide while actively streaming
    if (isStreaming) return;

    // Calculate adaptive hide delay based on content
    const hideDelay = getReadingTime(displayText);

    const timer = setTimeout(() => {
      setVisible(false);
    }, hideDelay);

    return () => clearTimeout(timer);
  }, [visible, displayText, toolStatus, isStreaming]);

  // Make dismissable after initial display
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

  // Memoize border color
  const borderColor = useMemo(() => getBorderColorForStatus(toolStatus), [toolStatus]);

  // Handle click to dismiss
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
        {/* Tool name display with status */}
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

        {/* Text content with streaming indicator */}
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

        {/* Subtle tap hint when dismissable */}
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
