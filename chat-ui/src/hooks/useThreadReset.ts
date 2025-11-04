import { useAssistantRuntime } from '@assistant-ui/react';
import { useCallback } from 'react';
import { useUIResources } from '@/contexts/UIResourceContext';

/**
 * Handle conversation reset and cleanup
 *
 * Provides a function to clear the current conversation, close all UI resources
 * (iframes), and start a fresh thread.
 *
 * @returns Object containing the handleResetThread function
 *
 * @example
 * ```ts
 * const { handleResetThread } = useThreadReset();
 *
 * // Reset the conversation when user clicks reset button
 * <button onClick={handleResetThread}>Reset Thread</button>
 * ```
 */
export function useThreadReset() {
  const assistantRuntime = useAssistantRuntime();
  const { resources, removeResource } = useUIResources();

  const handleResetThread = useCallback(async () => {
    const currentState = assistantRuntime.thread.getState();
    if (currentState.isRunning) {
      assistantRuntime.thread.cancelRun();
    }

    for (const resource of resources) {
      await removeResource(resource.id);
    }

    assistantRuntime.thread.import({
      messages: [],
    });
  }, [assistantRuntime, resources, removeResource]);

  return { handleResetThread };
}
