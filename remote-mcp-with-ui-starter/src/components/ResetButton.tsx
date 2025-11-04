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
    <button
      onClick={onReset}
      disabled={disabled}
      className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-md shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
      type="button"
      aria-label="Start new game"
    >
      New Game
    </button>
  );
}
