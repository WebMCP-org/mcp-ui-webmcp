/**
 * WebMCP Template App
 *
 * This is a minimal example showing how to create an embedded app
 * with WebMCP tool registration.
 *
 * Replace this with your own app logic!
 */

import { useWebMCP } from '@mcp-b/react-webmcp';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

/**
 * Main application component for WebMCP template.
 * Demonstrates WebMCP tool registration, parent window communication, and state management.
 *
 * This component registers three WebMCP tools:
 * - template_get_message: Read-only tool to get current message
 * - template_update_message: Updates the displayed message
 * - template_reset: Resets message to default value
 *
 * @returns React component that renders a simple message display with WebMCP tools
 * @example
 * ```typescript
 * // In a WebMCP-enabled iframe environment:
 * import App from './App';
 * // Component automatically:
 * // 1. Establishes parent-child communication
 * // 2. Registers WebMCP tools with the parent window
 * // 3. Provides UI for manual message manipulation
 * ```
 */
export default function App() {
  // Track connection to parent window
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState('Hello from WebMCP Template!');

  // Listen for parent ready event
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'parent_ready') {
        setIsReady(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent we're ready
    window.parent.postMessage({ type: 'iframe_ready' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Example WebMCP Tool 1: Get Current Message
   *
   * A simple read-only tool that returns the current message state.
   */
  useWebMCP({
    name: 'template_get_message',
    description: 'Get the current message displayed in the app',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
    handler: async () => {
      return `Current message: ${message}`;
    },
  });

  /**
   * Example WebMCP Tool 2: Update Message
   *
   * A tool that updates the displayed message.
   * Shows how to handle input parameters and update state.
   */
  useWebMCP({
    name: 'template_update_message',
    description: 'Update the message displayed in the app',
    inputSchema: {
      newMessage: z.string().describe('The new message to display'),
    },
    annotations: {
      idempotentHint: false,
    },
    handler: async ({ newMessage }) => {
      setMessage(newMessage);
      return `Message updated to: ${newMessage}`;
    },
  });

  /**
   * Example WebMCP Tool 3: Reset Message
   *
   * Resets the message to its default value.
   */
  useWebMCP({
    name: 'template_reset',
    description: 'Reset the message to its default value',
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
    },
    handler: async () => {
      const defaultMessage = 'Hello from WebMCP Template!';
      setMessage(defaultMessage);
      return `Message reset to: ${defaultMessage}`;
    },
  });

  // Handle UI button click
  const handleUpdateClick = useCallback(() => {
    const newMessage = prompt('Enter new message:');
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  const handleResetClick = useCallback(() => {
    setMessage('Hello from WebMCP Template!');
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 font-sans">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">WebMCP Template</h1>

        {/* Connection status */}
        <div className="mb-6">
          {isReady ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm text-green-800">
              <span className="h-2 w-2 rounded-full bg-green-600"></span>
              Connected to parent
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
              <span className="h-2 w-2 rounded-full bg-yellow-600"></span>
              Connecting...
            </div>
          )}
        </div>

        {/* Current message display */}
        <div className="rounded-lg bg-blue-50 p-6 mb-6">
          <p className="text-xl text-gray-700">{message}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleUpdateClick}
            disabled={!isReady}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Update Message
          </button>
          <button
            onClick={handleResetClick}
            disabled={!isReady}
            className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Info about registered tools */}
        <div className="mt-8 rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-600">
          <h2 className="font-semibold mb-2">Registered WebMCP Tools:</h2>
          <ul className="space-y-1">
            <li>• <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">template_get_message</code> - Get current message</li>
            <li>• <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">template_update_message</code> - Update message</li>
            <li>• <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">template_reset</code> - Reset to default</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
