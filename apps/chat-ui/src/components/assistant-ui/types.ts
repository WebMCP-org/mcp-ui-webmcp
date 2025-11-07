/**
 * Shared type definitions for assistant-ui components
 * Single source of truth for types used across multiple components
 */

/**
 * Tool call status from @assistant-ui/react
 * Represents the execution state of a tool call in the message content
 */
export type ToolCallStatus =
  | { type: 'running' }
  | { type: 'complete' }
  | {
      type: 'incomplete';
      reason: 'cancelled' | 'length' | 'content-filter' | 'other' | 'error';
      error?: unknown;
    }
  | { type: 'requires-action'; reason: 'interrupt' };
