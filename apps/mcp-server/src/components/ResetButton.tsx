/**
 * ResetButton component
 *
 * Displays a "New Game" button overlay when the game ends.
 * Positioned absolutely at the bottom of the game board.
 */

export interface ResetButtonProps {
  /**
   * Callback when button is clicked
   */
  onReset: () => void;
  /** Whether the button is disabled */
  disabled: boolean;
}

/**
 * New Game button displayed after game completion
 *
 * Features:
 * - Semi-transparent backdrop
 * - Centered at bottom of board
 * - Accessible button element
 *
 * @example
 * ```tsx
 * <ResetButton
 *   onReset={() => startNewGame()}
 *   disabled={!isParentReady}
 * />
 * ```
 */
export function ResetButton({ onReset, disabled }: ResetButtonProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <button
        onClick={onReset}
        disabled={disabled}
        className="py-3 px-6 border-2 border-white rounded-md text-base font-semibold cursor-pointer transition-all duration-150 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] pointer-events-auto hover:scale-105 hover:border-[3px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
        aria-label="Start new game"
      >
        New Game
      </button>
    </div>
  );
}
