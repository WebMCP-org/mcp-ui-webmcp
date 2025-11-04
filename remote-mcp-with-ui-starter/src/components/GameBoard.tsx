/**
 * GameBoard component
 *
 * Displays the 3x3 Tic-Tac-Toe board with cells.
 * Handles cell clicks and visual feedback for winning lines.
 */

import { cn } from '../lib/utils';
import type { Board, Player } from '../lib/tictactoe/types';

export interface GameBoardProps {
  /** Current board state */
  board: Board;
  /** Indices of winning line (null if no winner yet) */
  winningLine: number[] | null;
  /**
   * Callback when a cell is clicked
   * @param index - Cell index (0-8)
   * @param player - Player making the move
   */
  onCellClick: (index: number, player: Player) => void;
  /** Current player whose turn it is */
  currentPlayer: Player;
  /** Whether the board is disabled (waiting for AI, game over, etc.) */
  disabled: boolean;
  /** Whether to animate cell appearances and wins */
  animated?: boolean;
}

/**
 * Tic-Tac-Toe game board with 9 clickable cells
 *
 * Features:
 * - Responsive grid layout
 * - Dark mode support
 * - Winning line highlighting
 * - Optional animations
 * - Accessible button elements
 *
 * @example
 * ```tsx
 * <GameBoard
 *   board={board}
 *   winningLine={winningLine}
 *   onCellClick={handleCellClick}
 *   currentPlayer="X"
 *   disabled={false}
 * />
 * ```
 */
export function GameBoard({
  board,
  winningLine,
  onCellClick,
  currentPlayer,
  disabled,
  animated = true,
}: GameBoardProps) {
  return (
    <>
      {animated && (
        <style>{`
          @keyframes cellAppear {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes winningPulse {
            0%, 100% {
              background-color: rgba(34, 197, 94, 0.3);
            }
            50% {
              background-color: rgba(34, 197, 94, 0.6);
            }
          }

          .cell-appear {
            animation: cellAppear 0.3s ease-out;
          }

          .winning-pulse {
            animation: winningPulse 1.5s ease-in-out infinite;
          }
        `}</style>
      )}

      <div
        className="grid grid-cols-3 gap-0.5 bg-gray-300 dark:bg-gray-700 p-0.5 rounded-md max-w-[min(90vw,400px)] mx-auto"
        role="grid"
        aria-label="Tic-Tac-Toe board"
      >
        {board.map((cell, index) => {
          const isWinning = winningLine?.includes(index);
          const isEmpty = cell === null;

          return (
            <button
              key={index}
              onClick={() => !disabled && isEmpty && onCellClick(index, currentPlayer)}
              disabled={disabled || !isEmpty}
              className={cn(
                'aspect-square flex items-center justify-center text-4xl font-bold',
                'bg-white dark:bg-gray-800',
                'transition-colors duration-200',
                'disabled:cursor-not-allowed',
                !disabled && isEmpty && 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer',
                isWinning && 'winning-pulse',
                cell && animated && 'cell-appear',
                cell === 'X' && 'text-blue-600 dark:text-blue-400',
                cell === 'O' && 'text-red-600 dark:text-red-400'
              )}
              role="gridcell"
              aria-label={cell ? `Cell ${index}, ${cell}` : `Cell ${index}, empty`}
            >
              {cell}
            </button>
          );
        })}
      </div>
    </>
  );
}
