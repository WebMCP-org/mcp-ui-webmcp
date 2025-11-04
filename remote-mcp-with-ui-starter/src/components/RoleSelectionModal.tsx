/**
 * RoleSelectionModal component
 *
 * Modal overlay for selecting player role (X or O) before game starts.
 * Positioned absolutely over the game board.
 */

import type { Player } from '../lib/tictactoe/types';

export interface RoleSelectionModalProps {
  /**
   * Callback when user selects a role
   * @param role - Selected player role ('X' or 'O')
   */
  onSelect: (role: Player) => void;
  /** Whether the modal is disabled (e.g., waiting for parent ready) */
  disabled: boolean;
}

/**
 * Modal for selecting player role at game start
 *
 * Features:
 * - Centered overlay with backdrop
 * - Two buttons for X and O selection
 * - Explains that Carbon Units (human) vs Clankers (AI)
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <RoleSelectionModal
 *   onSelect={(role) => startGame(role)}
 *   disabled={!isParentReady}
 * />
 * ```
 */
export function RoleSelectionModal({ onSelect, disabled }: RoleSelectionModalProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
      role="dialog"
      aria-labelledby="role-selection-title"
      aria-modal="true"
    >
      <fieldset className="flex flex-col gap-3 pointer-events-auto border-none p-0 m-0 min-w-0">
        <legend
          id="role-selection-title"
          className="text-sm font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] mb-2"
        >
          Pick your side:
        </legend>

        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-xs font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
            👤 Carbon Units
          </span>
          <span className="text-[0.625rem] font-bold text-white/70 uppercase">vs</span>
          <span className="text-xs font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
            🤖 Clankers
          </span>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => !disabled && onSelect('X')}
            disabled={disabled}
            className="py-2.5 px-5 border-2 border-white rounded-md text-xl font-bold cursor-pointer transition-all duration-150 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] min-w-14 hover:scale-105 hover:border-[3px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Play as X (Carbon Units go first)"
            aria-label="Play as X"
          >
            X
          </button>
          <button
            type="button"
            onClick={() => !disabled && onSelect('O')}
            disabled={disabled}
            className="py-2.5 px-5 border-2 border-white rounded-md text-xl font-bold cursor-pointer transition-all duration-150 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] min-w-14 hover:scale-105 hover:border-[3px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Play as O (Clankers go first)"
            aria-label="Play as O"
          >
            O
          </button>
        </div>
      </fieldset>
    </div>
  );
}
