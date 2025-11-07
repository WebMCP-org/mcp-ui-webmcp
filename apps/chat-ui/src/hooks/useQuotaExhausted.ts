import { useState } from 'react';

/**
 * Quota information for a device when quota is exhausted
 */
export interface QuotaExhaustedInfo {
  /** Total amount spent in USD */
  totalSpent: number;
  /** Maximum quota limit in USD */
  quotaLimit: number;
}

/**
 * Hook to manage quota exhausted modal state
 *
 * Provides state management for displaying a modal when users
 * exhaust their free API quota. Tracks quota information and
 * controls modal visibility.
 *
 * @returns Object with modal state and control functions
 *
 * @example
 * ```tsx
 * function App() {
 *   const quotaExhausted = useQuotaExhausted();
 *
 *   // Trigger modal when quota exceeded (e.g., from API error)
 *   quotaExhausted.triggerQuotaExhausted({
 *     totalSpent: 1.0234,
 *     quotaLimit: 1.0
 *   });
 *
 *   return (
 *     <QuotaExhaustedModal
 *       open={quotaExhausted.showQuotaModal}
 *       {...quotaExhausted.quotaInfo}
 *       onAddApiKey={() => quotaExhausted.closeQuotaModal()}
 *     />
 *   );
 * }
 * ```
 *
 * @see QuotaExhaustedModal for the UI component
 * @see worker/usageQuota.ts for quota tracking implementation
 */
export function useQuotaExhausted() {
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<QuotaExhaustedInfo | null>(null);

  const triggerQuotaExhausted = (info: QuotaExhaustedInfo) => {
    console.log('[Quota Hook] Triggering quota exhausted modal with info:', info);
    setQuotaInfo(info);
    setShowQuotaModal(true);
    console.log('[Quota Hook] Modal state updated - showQuotaModal: true');
  };

  const closeQuotaModal = () => {
    setShowQuotaModal(false);
  };

  return {
    showQuotaModal,
    quotaInfo,
    triggerQuotaExhausted,
    closeQuotaModal,
    setShowQuotaModal,
  };
}
