/**
 * Constants for Tic-Tac-Toe game logic
 */

/**
 * All possible winning combinations in Tic-Tac-Toe
 *
 * Each combination is an array of 3 board indices (0-8) that form a line:
 * - Rows: [0,1,2], [3,4,5], [6,7,8]
 * - Columns: [0,3,6], [1,4,7], [2,5,8]
 * - Diagonals: [0,4,8], [2,4,6]
 */
export const WINNING_COMBINATIONS: readonly (readonly number[])[] = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6], // Diagonal top-right to bottom-left
] as const;
