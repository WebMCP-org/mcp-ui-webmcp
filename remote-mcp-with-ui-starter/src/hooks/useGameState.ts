/**
 * Game state management hook for Tic-Tac-Toe
 *
 * This hook manages the core game state and provides methods to:
 * - Make moves (with validation)
 * - Reset the game
 * - Track current player, winner, and board state
 *
 * Both UI components and WebMCP tool handlers use this hook,
 * ensuring a single source of truth for game logic.
 */

import { useCallback, useState } from 'react';
import type { Board, GameStatus, MoveResult, Player } from '../lib/tictactoe/types';
import {
  createEmptyBoard,
  evaluateBoard,
  togglePlayer,
  validateMove,
} from '../lib/tictactoe/gameLogic';

/**
 * Return type for the useGameState hook
 */
export interface UseGameStateReturn {
  /** Current game board state */
  board: Board;
  /** Current player whose turn it is */
  currentPlayer: Player;
  /** Winner of the game (null if in progress) */
  winner: GameStatus['winner'];
  /** Indices of winning line (null if no winner yet) */
  winningLine: number[] | null;
  /** Which player is controlled by the human */
  humanPlayer: Player;
  /** Which player is controlled by the AI (opposite of human) */
  aiPlayer: Player;
  /**
   * Attempt to make a move on the board
   * @param index - Position to move (0-8)
   * @param player - Player making the move
   * @returns Result indicating success or failure with error message
   */
  makeMove: (index: number, player: Player) => MoveResult;
  /**
   * Reset the game to initial state
   * @param newHumanPlayer - Optional: assign new role to human player
   */
  reset: (newHumanPlayer?: Player) => void;
}

/**
 * Hook for managing Tic-Tac-Toe game state
 *
 * @returns Game state and methods to interact with it
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const game = useGameState();
 *
 *   const handleCellClick = (index: number) => {
 *     const result = game.makeMove(index, game.humanPlayer);
 *     if (!result.success) {
 *       console.error(result.error);
 *     }
 *   };
 *
 *   return <Board board={game.board} onCellClick={handleCellClick} />;
 * }
 * ```
 */
export function useGameState(): UseGameStateReturn {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<GameStatus['winner']>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [humanPlayer, setHumanPlayer] = useState<Player>('X');

  const aiPlayer: Player = humanPlayer === 'X' ? 'O' : 'X';

  /**
   * Make a move on the board
   * Validates the move and updates state if valid
   */
  const makeMove = useCallback(
    (index: number, player: Player): MoveResult => {
      const error = validateMove(board, index, player, currentPlayer, winner);
      if (error) {
        return { success: false, error };
      }

      const newBoard = [...board] as Board;
      newBoard[index] = player;

      const status = evaluateBoard(newBoard);

      setBoard(newBoard);
      setWinner(status.winner);
      setWinningLine(status.winningLine);
      setCurrentPlayer(togglePlayer(player));

      return {
        success: true,
        board: newBoard,
        status,
        nextPlayer: status.winner ? null : togglePlayer(player),
      };
    },
    [board, currentPlayer, winner]
  );

  /**
   * Reset the game to initial state
   * Optionally reassign human player role
   */
  const reset = useCallback(
    (newHumanPlayer?: Player) => {
      setBoard(createEmptyBoard());
      setWinner(null);
      setWinningLine(null);
      setCurrentPlayer('X');
      if (newHumanPlayer) {
        setHumanPlayer(newHumanPlayer);
      }
    },
    []
  );

  return {
    board,
    currentPlayer,
    winner,
    winningLine,
    humanPlayer,
    aiPlayer,
    makeMove,
    reset,
  };
}
