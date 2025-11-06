/**
 * Type definitions for Tic-Tac-Toe game
 *
 * These types are shared across the entire game implementation,
 * including UI components, hooks, and WebMCP tool handlers.
 */

/**
 * Represents a single cell in the game board
 * Can be 'X', 'O', or null (empty)
 */
export type Cell = 'X' | 'O' | null;

/**
 * Represents a player in the game
 */
export type Player = 'X' | 'O';

/**
 * Represents the winner of the game
 * - 'X' or 'O' if a player won
 * - 'Draw' if the game ended in a draw
 * - null if the game is still in progress
 */
export type Winner = Player | 'Draw' | null;

/**
 * Represents the game board as a tuple of 9 cells
 * Cells are indexed 0-8 in row-major order:
 * ```
 * 0 | 1 | 2
 * ---------
 * 3 | 4 | 5
 * ---------
 * 6 | 7 | 8
 * ```
 */
export type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

/**
 * Game status including winner and winning line
 */
export interface GameStatus {
  /** The winner of the game, or null if still in progress */
  winner: Winner;
  /** Indices of the winning combination, or null if no winner yet */
  winningLine: number[] | null;
}

/**
 * Result of a move attempt
 */
export type MoveResult =
  | {
      success: true;
      board: Board;
      status: GameStatus;
      nextPlayer: Player | null;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Game statistics from the server
 */
export interface GameStats {
  /** Total completed games */
  totalGames: number;
  /** Number of currently active games */
  liveGames: number;
  /** Number of wins by AI/Clankers */
  clankersWins: number;
  /** Number of wins by humans/Carbon Units */
  carbonUnitsWins: number;
  /** Number of draw games */
  draws: number;
  /** ISO timestamp of last update */
  lastUpdated: string;
}

/**
 * Parameters for formatting move notifications
 */
export interface MoveNotificationParams {
  index: number;
  actor: Player;
  board: Board;
  status: GameStatus;
  nextPlayer: Player | null;
  humanPlayer: Player;
  agentPlayer: Player;
}

/**
 * Parameters for formatting new game notifications
 */
export interface NewGameNotificationParams {
  board: Board;
  currentPlayer: Player;
  humanPlayer: Player;
  agentPlayer: Player;
}
