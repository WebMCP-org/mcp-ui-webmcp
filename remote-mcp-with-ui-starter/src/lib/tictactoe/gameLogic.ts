/**
 * Pure game logic functions for Tic-Tac-Toe
 *
 * These functions have no side effects and can be used in any context
 * (UI components, WebMCP tool handlers, tests, etc.)
 */

import type { Board, GameStatus, Player } from './types';
import { WINNING_COMBINATIONS } from './constants';

/**
 * Creates an empty game board
 *
 * @returns A new board with all cells set to null
 *
 * @example
 * ```ts
 * const board = createEmptyBoard();
 * // => [null, null, null, null, null, null, null, null, null]
 * ```
 */
export function createEmptyBoard(): Board {
  return Array(9).fill(null) as Board;
}

/**
 * Evaluates the current board state to determine winner and winning line
 *
 * @param board - The current game board
 * @returns Game status with winner and winning line (if any)
 *
 * @example
 * ```ts
 * const board = ['X', 'X', 'X', null, 'O', null, null, 'O', null];
 * const status = evaluateBoard(board);
 * // => { winner: 'X', winningLine: [0, 1, 2] }
 * ```
 */
export function evaluateBoard(board: Board): GameStatus {
  // Check all winning combinations
  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a],
        winningLine: [...combination],
      };
    }
  }

  // Check for draw (all cells filled, no winner)
  if (board.every((cell) => cell !== null)) {
    return { winner: 'Draw', winningLine: null };
  }

  // Game still in progress
  return { winner: null, winningLine: null };
}

/**
 * Gets all available (empty) cells on the board
 *
 * @param board - The current game board
 * @returns Array of indices (0-8) where moves can be made
 *
 * @example
 * ```ts
 * const board = ['X', null, 'O', null, null, null, null, null, null];
 * const moves = getAvailableMoves(board);
 * // => [1, 3, 4, 5, 6, 7, 8]
 * ```
 */
export function getAvailableMoves(board: Board): number[] {
  return board
    .map((cell, index) => (cell === null ? index : null))
    .filter((value): value is number => value !== null);
}

/**
 * Toggles between players
 *
 * @param player - Current player
 * @returns The opposite player
 *
 * @example
 * ```ts
 * togglePlayer('X') // => 'O'
 * togglePlayer('O') // => 'X'
 * ```
 */
export function togglePlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

/**
 * Validates if a move is legal
 *
 * @param board - Current game board
 * @param index - Position to move (0-8)
 * @param player - Player making the move
 * @param currentPlayer - Whose turn it is
 * @param winner - Current winner (null if game in progress)
 * @returns Error message if invalid, null if valid
 *
 * @example
 * ```ts
 * validateMove(board, 0, 'X', 'X', null)
 * // => null (valid move)
 *
 * validateMove(board, 0, 'X', 'O', null)
 * // => "It's Player O's turn."
 * ```
 */
export function validateMove(
  board: Board,
  index: number,
  player: Player,
  currentPlayer: Player,
  winner: GameStatus['winner']
): string | null {
  // Validate index range
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return 'Position must be an integer between 0 and 8.';
  }

  // Check if game is already over
  if (winner) {
    if (winner === 'Draw') {
      return 'The game already ended in a draw. Call `tictactoe_reset` to start over.';
    }
    return `Player ${winner} already won. Call \`tictactoe_reset\` to start a new game.`;
  }

  // Check if it's the player's turn
  if (player !== currentPlayer) {
    return `It's Player ${currentPlayer}'s turn.`;
  }

  // Check if cell is occupied
  if (board[index]) {
    return `Cell ${index} is already occupied by Player ${board[index]}. Choose an empty cell.`;
  }

  return null;
}
