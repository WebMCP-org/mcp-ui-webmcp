import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { ChevronDown, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMCP } from '@/hooks/useMCP';
import { formatMcpResult } from '@/lib/mcp-utils';
import { cn } from '@/lib/utils';
import { ToolSourceBadge } from './tool-source-badge';
import { type ToolStatus, ToolStatusBadge } from './tool-status-badge';
import { type ToolCallStatus } from './types';
import { ElicitationInlineForm, type ElicitationRequest } from '../ElicitationInlineForm';

/**
 * Map assistant-ui status to simplified ToolStatus type
 *
 * @param status - Tool call status from @assistant-ui/react
 * @param isError - Optional error flag to override status
 * @returns Simplified status for UI display
 * @see {@link types.ts} for ToolCallStatus definition
 * @see {@link tool-status-badge.tsx} for ToolStatus definition
 */
function mapToToolStatus(status: ToolCallStatus, isError?: boolean): ToolStatus {
  if (status.type === 'running') return 'running';
  if (status.type === 'requires-action') return 'waiting';
  if (status.type === 'incomplete') {
    return status.reason === 'cancelled' ? 'cancelled' : 'error';
  }
  return isError ? 'error' : 'completed';
}

/**
 * Determine if the tool call should auto-expand based on status
 *
 * @param status - Tool call status from @assistant-ui/react
 * @returns True if tool details should be expanded by default
 */
function shouldAutoExpandStatus(status: ToolCallStatus): boolean {
  if (status.type === 'running') return false;
  if (status.type === 'requires-action') return true;
  if (status.type === 'incomplete') return true;
  return false;
}

/**
 * Get border color Tailwind class based on status and error state
 *
 * @param status - Tool call status from @assistant-ui/react
 * @param isError - Optional error flag to override border color
 * @returns Tailwind border color class
 */
function getBorderColor(status: ToolCallStatus, isError?: boolean): string {
  if (status.type === 'running') return 'border-blue-500';
  if (status.type === 'requires-action') return 'border-yellow-500';
  if (status.type === 'incomplete') {
    return status.reason === 'cancelled' ? 'border-gray-500' : 'border-destructive';
  }
  return isError ? 'border-destructive' : 'border-green-500';
}

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolCallId,
  toolName,
  argsText,
  result,
  status,
  isError,
  addResult: _addResult,
  interrupt,
  resume,
}) => {
  const { tools, pendingElicitations, submitElicitation, registerToolCall, unregisterToolCall } = useMCP();
  const tool = tools.find((t) => t.name === toolName);
  const sourceId = tool ? (tool as typeof tool & { _sourceId?: string })._sourceId : undefined;

  // Register this tool call with the tracking system
  // Keep it registered even after completion to handle late-arriving elicitations
  // Only unregister when component unmounts
  useEffect(() => {
    console.log('[ToolFallback] Registering tool call:', { toolCallId, toolName, status: status.type });
    registerToolCall(toolCallId, toolName);

    return () => {
      console.log('[ToolFallback] Unregistering tool call on unmount:', { toolCallId, toolName });
      unregisterToolCall(toolCallId);
    };
  }, [toolCallId, toolName, registerToolCall, unregisterToolCall]);

  const formattedResult = result !== undefined ? formatMcpResult(result) : null;
  const resultIsError = formattedResult?.isError || isError;

  const shouldExpand = shouldAutoExpandStatus(status) || resultIsError;
  const [isCollapsed, setIsCollapsed] = useState(!shouldExpand);

  const isRunning = status.type === 'running';
  const toolStatus = mapToToolStatus(status, resultIsError);
  const borderColor = getBorderColor(status, resultIsError);

  // Find the elicitation assigned to this tool call
  // NOTE: Elicitations are now auto-assigned in useMCPConnection when they arrive
  // NOTE: Don't check isRunning - elicitation should persist even after tool finishes
  const toolElicitation = useMemo(() => {
    console.log('[ToolFallback] Looking for elicitation:', {
      toolCallId,
      toolName,
      pendingElicitationsSize: pendingElicitations.size,
      pendingElicitations: Array.from(pendingElicitations.entries()).map(([id, e]) => ({
        requestId: id,
        assignedToolCallId: e.assignedToolCallId,
      })),
    });

    if (pendingElicitations.size === 0) return null;

    for (const elicitation of pendingElicitations.values()) {
      if (elicitation.assignedToolCallId === toolCallId) {
        console.log('[ToolFallback] Found matching elicitation!', {
          requestId: elicitation.requestId,
          toolCallId,
        });
        return elicitation;
      }
    }

    console.log('[ToolFallback] No matching elicitation found for toolCallId:', toolCallId);
    return null;
  }, [pendingElicitations, toolCallId, toolName]);

  if (status.type === 'requires-action' && interrupt) {
    return (
      <div
        className={cn(
          'aui-tool-fallback-root mb-4 flex w-full max-w-full flex-col gap-3 rounded-lg border py-3 transition-colors',
          borderColor
        )}
      >
        <div className="aui-tool-fallback-header flex items-center gap-2 px-3 sm:px-4">
          <p className="aui-tool-fallback-title grow flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm min-w-0">
            <span className="text-muted-foreground shrink-0">Used tool:</span>{' '}
            <b className="font-semibold truncate">{toolName}</b>
            <ToolSourceBadge sourceId={sourceId} iconOnly />
          </p>
          <ToolStatusBadge status="waiting" isError={false} className="shrink-0" />
        </div>
        <div className="px-3 sm:px-4">
          <ElicitationInlineForm
            request={{ params: interrupt.payload as ElicitationRequest['params'] }}
            onSubmit={(res: { action: 'accept' | 'decline' | 'cancel'; data?: unknown }) => {
              if (res.action === 'accept') {
                resume(res.data);
              } else {
                // TODO: Handle cancellation properly if needed, for now we just don't submit
                // Ideally we should probably cancel the tool call
              }
            }}
            onCancel={() => {
              // TODO: Handle cancellation
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'aui-tool-fallback-root mb-4 flex w-full max-w-full flex-col gap-3 rounded-lg border py-3 transition-colors',
        borderColor
      )}
    >
      <div className="aui-tool-fallback-header flex items-center gap-2 px-3 sm:px-4">
        <p className="aui-tool-fallback-title grow flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm min-w-0">

          <span className="text-muted-foreground shrink-0">Used tool:</span>{' '}
          <b className="font-semibold truncate">{toolName}</b>
          <ToolSourceBadge sourceId={sourceId} iconOnly />
        </p>
        <ToolStatusBadge status={toolStatus} isError={resultIsError} className="shrink-0" />
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
          disabled={isRunning}
          aria-label={isCollapsed ? 'Expand tool details' : 'Collapse tool details'}
        >
          {isCollapsed ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronUpIcon className="size-4" />
          )}
        </Button>
      </div>

      {/* Show elicitation for this specific tool call */}
      {toolElicitation && (
        <div className="px-3 sm:px-4">
          <ElicitationInlineForm
            request={toolElicitation}
            onSubmit={(res: { action: 'accept' | 'decline' | 'cancel'; data?: unknown }) => {
              submitElicitation(toolElicitation.requestId, {
                action: res.action,
                data: res.data as any,
              });
            }}
            onCancel={() => {
              submitElicitation(toolElicitation.requestId, { action: 'cancel' });
            }}
          />
        </div>
      )}

      {!isCollapsed && (
        <div className="aui-tool-fallback-content flex flex-col gap-3 border-t pt-3 min-w-0">
          <div className="aui-tool-fallback-args-root px-3 sm:px-4 min-w-0">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Parameters:</p>
            <pre className="aui-tool-fallback-args-value rounded-md bg-muted p-2 text-xs sm:p-3 overflow-x-auto max-w-full">
              {argsText}
            </pre>
          </div>

          {result !== undefined && formattedResult && (
            <div className="aui-tool-fallback-result-root border-t px-3 sm:px-4 pt-3 space-y-2 min-w-0">
              <p
                className={cn(
                  'text-xs font-semibold',
                  resultIsError ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {resultIsError ? 'Error:' : 'Result:'}
              </p>

              {/* Display formatted text prominently */}
              <div
                className={cn(
                  'aui-tool-fallback-result-content rounded-md p-2 text-xs sm:p-3 whitespace-pre-wrap wrap-break-word max-w-full',
                  resultIsError
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-muted'
                )}
              >
                {formattedResult.displayText}
              </div>

              {/* Collapsible full response */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="h-3 w-3 transition-transform duration-200 data-[state=open]:rotate-180" />
                  <span>View Full Response</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 text-xs bg-muted/30 p-2 rounded border border-border/30 overflow-x-auto max-w-full">
                    {JSON.stringify(formattedResult.rawResult, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Show error details for incomplete status */}
          {status.type === 'incomplete' && status.error !== undefined && (
            <div className="aui-tool-fallback-error-root border-t border-destructive/20 px-3 sm:px-4 pt-3 min-w-0">
              <p className="mb-2 text-xs font-semibold text-destructive">Error Details:</p>
              <pre className="rounded-md bg-destructive/10 p-2 text-xs sm:p-3 text-destructive overflow-x-auto border border-destructive/20 max-w-full">
                {status.error instanceof Error
                  ? status.error.message
                  : typeof status.error === 'string'
                    ? status.error
                    : JSON.stringify(status.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
