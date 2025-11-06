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
              transform: scale(0);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes winningPulse {
            from {
              transform: scale(1);
            }
            to {
              transform: scale(1.05);
            }
          }

          .cell-appear {
            animation: cellAppear 0.3s ease;
          }

          .winning-pulse {
            animation: winningPulse 0.5s ease infinite alternate;
          }
        `}</style>
      )}

      <div
        className="inline-grid grid-cols-3 gap-2.5 bg-[#f0f0f0] dark:bg-[#2a2a2a] p-5 rounded-2xl shadow-md dark:shadow-[0_4px_6px_rgba(0,0,0,0.3)] max-[768px]:gap-2 max-[768px]:p-4 max-[480px]:gap-1.5 max-[480px]:p-3"
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
                'w-[140px] h-[140px] text-[3.5rem] font-bold',
                'max-[768px]:w-[90px] max-[768px]:h-[90px] max-[768px]:text-[2.25rem]',
                'max-[480px]:w-[75px] max-[480px]:h-[75px] max-[480px]:text-[2rem]',
                'bg-white dark:bg-[#1a1a1a]',
                'border-[3px] border-[#ddd] dark:border-[#444]',
                'rounded-lg',
                'transition-all duration-200',
                'flex items-center justify-center',
                'disabled:cursor-not-allowed',
                !disabled && isEmpty && 'hover:bg-[#f8f8f8] dark:hover:bg-[#252525] hover:border-[#999] dark:hover:border-[#666] hover:scale-105 cursor-pointer',
                cell && !isEmpty && 'cursor-default',
                isWinning && 'bg-[#4CAF50]! border-[#45a049]! text-white! winning-pulse',
                cell && animated && 'cell-appear',
                cell === 'X' && !isWinning && 'text-[#2196F3]',
                cell === 'O' && !isWinning && 'text-[#f44336]'
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
