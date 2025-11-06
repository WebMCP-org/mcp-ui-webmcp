/**
 * GameStatus component
 *
 * Displays current game status messages:
 * - "Connecting..." when waiting for parent
 * - "AI thinking..." when waiting for AI move
 * - Current player's turn
 * - Winner announcement
 */

import type { Player, Winner } from '../lib/tictactoe/types';

export interface GameStatusProps {
  /** Whether currently connecting to parent window */
  isConnecting: boolean;
  /** Whether waiting for AI to make a move */
  isAIThinking: boolean;
  /** Current player whose turn it is */
  currentPlayer: Player;
  /** Winner of the game (null if in progress) */
  winner: Winner;
  /** Whether to show the status message */
  show: boolean;
}

/**
 * Game status overlay message
 *
 * Displays contextual status messages based on game state.
 * Positioned absolutely over the game board.
 *
 * @example
 * ```tsx
 * <GameStatus
 *   isConnecting={!isParentReady}
 *   isAIThinking={isWaitingForAI}
 *   currentPlayer="X"
 *   winner={null}
 *   show={true}
 * />
 * ```
 */
export function GameStatus({
  isConnecting,
  isAIThinking,
  currentPlayer,
  winner,
  show,
}: GameStatusProps) {
  if (!show) return null;

  let statusText = '';

  if (isConnecting) {
    statusText = 'Connecting...';
  } else if (isAIThinking) {
    statusText = 'AI thinking...';
  } else if (!winner) {
    statusText = `${currentPlayer}'s turn`;
  }

  if (!statusText) return null;

  return (
    <div
      className="absolute top-0 left-0 right-0 text-sm text-center p-2 text-[#1a1a1a] dark:text-[#f5f5f5] font-medium z-10 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {statusText}
    </div>
  );
}
