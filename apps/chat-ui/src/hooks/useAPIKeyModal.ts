import { useEffect, useState } from 'react';

type MCPState = 'disconnected' | 'connecting' | 'loading' | 'ready' | 'failed';

/**
 * Manage API key modal visibility logic
 *
 * Automatically shows the API key modal when:
 * - MCP connection fails
 * - MCP is disconnected
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

  useEffect(() => {
    if (mcpState === 'failed' || mcpState === 'disconnected') {
      setShowApiKeyDialog(true);
    }
  }, [mcpState]);

  return {
    showApiKeyDialog,
    setShowApiKeyDialog,
  };
}
