import { createRef, useCallback, useEffect, useMemo, useState } from 'react';
import { UIResourceContext, type UIResourceItem } from './UIResourceContext';

/**
 * Props for UIResourceProvider component
 */
export interface UIResourceProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for UI resources context
 * Manages the lifecycle and state of UI resources throughout the application
 */
export const UIResourceProvider: React.FC<UIResourceProviderProps> = ({ children }) => {
  const [resources, setResources] = useState<UIResourceItem[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const addResource = useCallback(
    (item: Omit<UIResourceItem, 'id' | 'timestamp' | 'iframeRef'>) => {
      setResources((prev) => {
        const existingResource = prev.find((r) => r.resource.uri === item.resource.uri);

        if (existingResource) {
          setSelectedResourceId(existingResource.id);
          return prev; // No state change needed
        }

        const newResource: UIResourceItem = {
          ...item,
          id: `${item.toolName}-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          iframeRef: createRef<HTMLIFrameElement>(),
        };
        setSelectedResourceId(newResource.id);
        return [...prev, newResource];
      });
    },
    []
  );

  const removeResource = useCallback(
    async (id: string) => {
      let resourceToCleanup: UIResourceItem | undefined;
      setResources((prev) => {
        resourceToCleanup = prev.find((r) => r.id === id);
        return prev; // Don't modify yet, just capture the resource
      });

      if (resourceToCleanup?.cleanup) {
        try {
          await resourceToCleanup.cleanup();
        } catch (error) {
          console.error(`Failed to cleanup resource ${id}:`, error);
        }
      }

      setResources((prev) => {
        const filtered = prev.filter((r) => r.id !== id);
        if (selectedResourceId === id) {
          setSelectedResourceId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
        }
        return filtered;
      });
    },
    [selectedResourceId]
  );

  const selectResource = useCallback((id: string | null) => {
    setSelectedResourceId(id);
  }, []);

  const setResourceCleanup = useCallback((id: string, cleanup: () => Promise<void>) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, cleanup } : r)));
  }, []);

  const clearAll = useCallback(async () => {
    let resourcesToCleanup: UIResourceItem[] = [];
    setResources((prev) => {
      resourcesToCleanup = prev;
      return prev; // Don't modify yet, just capture the resources
    });

    await Promise.all(
      resourcesToCleanup.map(async (resource) => {
        if (resource.cleanup) {
          try {
            await resource.cleanup();
          } catch (error) {
            console.error(`Failed to cleanup resource ${resource.id}:`, error);
          }
        }
      })
    );

    setResources([]);
    setSelectedResourceId(null);
  }, []);

  const value = useMemo(
    () => ({
      resources,
      selectedResourceId,
      addResource,
      removeResource,
      selectResource,
      clearAll,
      setResourceCleanup,
    }),
    [
      resources,
      selectedResourceId,
      addResource,
      removeResource,
      selectResource,
      clearAll,
      setResourceCleanup,
    ]
  );

  useEffect(() => {
    return () => {
      let resourcesToCleanup: UIResourceItem[] = [];
      setResources((prev) => {
        resourcesToCleanup = prev;
        return prev;
      });

      Promise.all(
        resourcesToCleanup.map(async (resource) => {
          if (resource.cleanup) {
            try {
              await resource.cleanup();
            } catch (error) {
              console.error(`Failed to cleanup resource ${resource.id} on unmount:`, error);
            }
          }
        })
      ).catch(console.error);
    };
  }, []);

  return <UIResourceContext.Provider value={value}>{children}</UIResourceContext.Provider>;
};
