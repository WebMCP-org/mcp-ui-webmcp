/**
 * Color Picker App with Rich Elicitation Protocol
 *
 * Demonstrates the UI Delegation pattern for elicitation:
 * 1. Server sends elicitation/create with ui.uri parameter
 * 2. Host spawns this UI in iframe
 * 3. Host sends ui/notifications/elicitation-context
 * 4. User interacts with UI
 * 5. UI sends ui/submit-elicitation back to Host
 * 6. Host validates against schema and forwards to server
 */

import { useCallback, useEffect, useState } from 'react';

interface ElicitationContext {
  message?: string;
  schema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  context?: {
    error?: string;
    defaultColor?: string;
    theme?: 'light' | 'dark';
  };
}

export default function ColorPickerApp() {
  const [isParentReady, setIsParentReady] = useState(false);
  const [elicitationContext, setElicitationContext] = useState<ElicitationContext | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3b82f6'); // blue-500
  const [colorName, setColorName] = useState('');

  /**
   * Parent Readiness & Elicitation Context Protocol
   *
   * Listens for:
   * - parent-ready: Parent is ready to receive messages
   * - ui/notifications/elicitation-context: Elicitation parameters from server
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const embedded = window.parent !== window;

    if (!embedded) {
      setIsParentReady(true);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      // Handle JSON-RPC 2.0 notifications
      if (data.jsonrpc === '2.0' && data.method === 'ui/notifications/elicitation-context') {
        console.log('[ColorPicker] Received elicitation context:', data.params);
        setElicitationContext(data.params);
        setIsParentReady(true);

        // Apply default color if provided
        if (data.params?.context?.defaultColor) {
          setSelectedColor(data.params.context.defaultColor);
        }
        return;
      }

      // Handle legacy parent-ready messages
      const { type } = data as { type?: string };
      if (type === 'parent-ready' || type === 'ui-lifecycle-iframe-render-data') {
        setIsParentReady(true);
        return;
      }
    };

    window.addEventListener('message', handleMessage);

    // Signal ready to parent
    window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Notify parent of document size changes
   */
  useEffect(() => {
    if (!isParentReady || typeof window === 'undefined' || window.parent === window) {
      return;
    }

    const notifySize = () => {
      const height = document.documentElement.scrollHeight;
      const width = document.documentElement.scrollWidth;

      window.parent.postMessage(
        {
          type: 'ui-size-change',
          payload: { height, width },
        },
        '*'
      );
    };

    // Initial size notification
    requestAnimationFrame(notifySize);

    // Watch for size changes
    const resizeObserver = new ResizeObserver(notifySize);
    resizeObserver.observe(document.documentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isParentReady]);

  /**
   * Submit color selection to parent (Host)
   */
  const handleSubmit = useCallback(() => {
    if (!isParentReady || typeof window === 'undefined' || window.parent === window) {
      return;
    }

    // Send JSON-RPC 2.0 request to parent
    window.parent.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/submit-elicitation',
        params: {
          action: 'accept',
          content: {
            color: selectedColor,
            name: colorName || undefined,
          },
        },
      },
      '*'
    );
  }, [isParentReady, selectedColor, colorName]);

  /**
   * Cancel elicitation
   */
  const handleCancel = useCallback(() => {
    if (!isParentReady || typeof window === 'undefined' || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/submit-elicitation',
        params: {
          action: 'cancel',
          content: null,
        },
      },
      '*'
    );
  }, [isParentReady]);

  /**
   * Decline elicitation
   */
  const handleDecline = useCallback(() => {
    if (!isParentReady || typeof window === 'undefined' || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/submit-elicitation',
        params: {
          action: 'decline',
          content: null,
        },
      },
      '*'
    );
  }, [isParentReady]);

  const errorMessage = elicitationContext?.context?.error;
  const message = elicitationContext?.message || 'Choose a color';
  const theme = elicitationContext?.context?.theme || 'light';

  return (
    <div
      className={`flex flex-col gap-4 font-sans p-6 min-h-[400px] ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{message}</h2>
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        {!isParentReady && (
          <div className="text-sm text-gray-500">Connecting to parent...</div>
        )}
      </div>

      {/* Color Preview */}
      <div className="flex flex-col gap-3">
        <div
          className="w-full h-32 rounded-lg border-2 border-gray-300 shadow-lg transition-all"
          style={{ backgroundColor: selectedColor }}
        />
        <div className="text-center font-mono text-lg font-semibold">{selectedColor}</div>
      </div>

      {/* Color Input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="color-input" className="font-medium">
          Select Color:
        </label>
        <input
          id="color-input"
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-full h-12 rounded cursor-pointer"
          disabled={!isParentReady}
        />
      </div>

      {/* Color Name (Optional) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="name-input" className="font-medium">
          Color Name (Optional):
        </label>
        <input
          id="name-input"
          type="text"
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
          placeholder="e.g., Ocean Blue"
          className={`px-3 py-2 border rounded ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          disabled={!isParentReady}
        />
      </div>

      {/* Preset Colors */}
      <div className="flex flex-col gap-2">
        <label className="font-medium">Presets:</label>
        <div className="grid grid-cols-6 gap-2">
          {[
            { color: '#ef4444', name: 'Red' },
            { color: '#f97316', name: 'Orange' },
            { color: '#eab308', name: 'Yellow' },
            { color: '#22c55e', name: 'Green' },
            { color: '#3b82f6', name: 'Blue' },
            { color: '#a855f7', name: 'Purple' },
            { color: '#ec4899', name: 'Pink' },
            { color: '#64748b', name: 'Slate' },
            { color: '#000000', name: 'Black' },
            { color: '#ffffff', name: 'White' },
            { color: '#6b7280', name: 'Gray' },
            { color: '#0891b2', name: 'Cyan' },
          ].map(({ color, name }) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className="w-full h-10 rounded border-2 hover:scale-110 transition-transform"
              style={{
                backgroundColor: color,
                borderColor: selectedColor === color ? '#000' : 'transparent',
              }}
              title={name}
              disabled={!isParentReady}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handleSubmit}
          disabled={!isParentReady}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Select Color
        </button>
        <button
          onClick={handleCancel}
          disabled={!isParentReady}
          className={`flex-1 font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            theme === 'dark'
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleDecline}
          disabled={!isParentReady}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Decline
        </button>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-500 mt-4">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(
              {
                isParentReady,
                elicitationContext,
                selectedColor,
                colorName,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
