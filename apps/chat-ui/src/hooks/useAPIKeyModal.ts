import { useEffect, useRef, useState } from 'react';

type MCPState = 'disconnected' | 'connecting' | 'loading' | 'ready' | 'failed';

/**
 * Manage API key modal visibility logic
 *
 * Automatically shows the API key modal once when:
 * - MCP connection fails for the first time
 * - MCP is disconnected for the first time
 *
 * After the initial auto-open, manual control via setShowApiKeyDialog is respected.
 *
 * @param mcpState - Current MCP connection state
 * @returns Modal visibility state and setter
 *
 * @example
 * ```ts
 * const { showApiKeyDialog, setShowApiKeyDialog } = useAPIKeyModal(mcpState);
 *
 * // Manually show the modal
 * setShowApiKeyDialog(true);
 * ```
 */
export function useAPIKeyModal(mcpState: MCPState) {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(mcpState !== 'ready');
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (!hasAutoOpened.current && (mcpState === 'failed' || mcpState === 'disconnected')) {
      setShowApiKeyDialog(true);
      hasAutoOpened.current = true;
    }
  }, [mcpState]);

  return {
    showApiKeyDialog,
    setShowApiKeyDialog,
  };
}
