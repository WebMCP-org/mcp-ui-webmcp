import { Wrench, X as XIcon } from 'lucide-react';
import type { FC } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUIResources } from '@/contexts/UIResourceContext';
import { useMCP } from '@/hooks/useMCP';
import { cn } from '@/lib/utils';

/**
 * Tab selector for switching between multiple UI resources
 *
 * Displays tabs for each active UI resource (iframe), shows tool counts,
 * and provides close buttons. Allows users to switch between different
 * embedded UIs.
 *
 * @param openToolsPanelId - ID of the resource whose tools panel is currently open
 * @param setOpenToolsPanelId - Function to toggle tools panel visibility
 *
 * @example
 * ```tsx
 * <TabSelector
 *   openToolsPanelId={openToolsPanelId}
 *   setOpenToolsPanelId={setOpenToolsPanelId}
 * />
 * ```
 */
export const TabSelector: FC<{
  openToolsPanelId: string | null;
  setOpenToolsPanelId: (id: string | null) => void;
}> = ({ openToolsPanelId, setOpenToolsPanelId }) => {
  const { resources, selectedResourceId, selectResource, removeResource } = useUIResources();
  const { tools } = useMCP();

  if (resources.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 bg-muted/10 overflow-x-auto sm:px-3 sm:py-2">
      {resources.map((resource) => {
        const isSelected = resource.id === selectedResourceId;
        // Filter tools for this specific iframe
        const iframeTools = tools.filter((tool) => {
          const toolWithSource = tool as { _sourceId?: string };
          return toolWithSource._sourceId === resource.id;
        });
        const toolCount = iframeTools.length;
        const isToolsPanelOpen = openToolsPanelId === resource.id;

        return (
          <div
            key={resource.id}
            className={cn(
              'group flex items-center gap-1 px-2 py-1 rounded-t-lg border-t border-x transition-colors whitespace-nowrap text-xs sm:gap-1.5 sm:px-3 sm:py-1.5',
              isSelected
                ? 'bg-background border-border text-foreground'
                : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <button
              onClick={() => selectResource(resource.id)}
              className="font-medium hover:opacity-80 transition-opacity"
            >
              {resource.toolName}
            </button>

            {/* Tools button */}
            {toolCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenToolsPanelId(isToolsPanelOpen ? null : resource.id);
                    }}
                    className={cn(
                      'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
                      isToolsPanelOpen
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
                    )}
                    aria-label={`View ${toolCount} tools from ${resource.toolName}`}
                  >
                    <Wrench className="h-2.5 w-2.5" />
                    <span>{toolCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    This iframe exposes {toolCount} tool{toolCount !== 1 ? 's' : ''} that can be
                    executed by the model
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            <button
              onClick={async (e) => {
                e.stopPropagation();
                await removeResource(resource.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive p-2 -m-2"
              aria-label={`Close ${resource.toolName}`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
