import { useAssistantRuntime } from '@assistant-ui/react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function StreamingOverlay() {
  const runtime = useAssistantRuntime();
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [toolNames, setToolNames] = useState<string | null>(null);

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
          const names = toolCalls.map((tc) => tc.toolName || 'tool').join(', ');
          setToolNames(names);
        } else {
          setToolNames(null);
        }

        if (textContent.trim()) {
          const last40 = textContent.slice(-40);
          setDisplayText(last40);
          setVisible(true);
        } else if (toolCalls.length > 0) {
          setDisplayText('');
          setVisible(true);
        }
      } else {
        setVisible(false);
      }
    });

    return () => unsubscribe();
  }, [runtime.thread]);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'fixed top-12 left-4 right-4 z-50',
        'px-4 py-3 rounded-lg',
        'bg-background/95 border border-border/60',
        'shadow-lg backdrop-blur-sm',
        'pointer-events-none',
        'max-h-32 overflow-hidden'
      )}
    >
      <div className="text-sm leading-7 text-foreground">
        {toolNames && (
          <div className="mb-2 text-xs text-muted-foreground italic">Using: {toolNames}</div>
        )}
        {displayText && <div className="line-clamp-3 break-words">{displayText}</div>}
      </div>
    </motion.div>
  );
}
