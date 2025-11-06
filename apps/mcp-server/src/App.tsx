/**
 * Tic-Tac-Toe App with WebMCP Integration
 *
 * This is the main application component that demonstrates clean WebMCP integration.
 * WebMCP is treated as a first-class feature, not "bolted on" - the tools use the
 * same hooks and logic as the UI.
 *
 * Architecture:
 * - Custom hooks manage business logic (game state, communication, stats)
 * - Presentational components handle UI rendering
 * - WebMCP tools registered inline, calling the same hook methods as UI handlers
 * - Single source of truth for all game logic
 */

import { useWebMCP } from '@mcp-b/react-webmcp';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  GameBoard,
  GameHeader,
  GameStatus,
  ResetButton,
  RoleSelectionModal,
} from './components';
import { useGameState, useGameStats, useParentCommunication } from './hooks';
import {
  formatGameStateMarkdown,
  formatMoveMarkdown,
  formatMoveNotification,
  formatNewGameNotification,
  formatResetMarkdown,
} from './lib/tictactoe/formatters';
import type { Player } from './lib/tictactoe/types';

export interface AppProps {
  /**
   * Whether to show animations on moves and wins
   * @default true
   */
  animated?: boolean;
}

/**
 * Main Tic-Tac-Toe application component
 *
 * Features:
 * - Real-time game statistics via WebSocket
 * - Human vs AI gameplay
 * - Three WebMCP tools for AI interaction:
 *   1. `tictactoe_get_state` - Read current game state
 *   2. `tictactoe_ai_move` - Make a move as AI
 *   3. `tictactoe_reset` - Reset the game
 * - Parent window communication for iframe embedding
 * - Accessible UI with proper ARIA attributes
 *
 * @example
 * ```tsx
 * import { App } from './App';
 * import { createRoot } from 'react-dom/client';
 *
 * createRoot(document.getElementById('root')!).render(<App />);
 * ```
 */
export default function App({ animated = true }: AppProps) {
  const game = useGameState();
  const { isParentReady, postNotifyMarkdown, notifyParentOfCurrentDocumentSize } =
    useParentCommunication();
  const { stats, notifyGameComplete } = useGameStats();

  const [showRoleModal, setShowRoleModal] = useState(true);
  const [isAIThinking, setIsAIThinking] = useState(false);

  /**
   * Handle cell click from UI
   * Validates move, updates state, and notifies parent
   */
  const handleCellClick = useCallback(
    (index: number, player: Player) => {
      if (!isParentReady || showRoleModal || isAIThinking) {
        return;
      }

      const result = game.makeMove(index, player);
      if (!result.success) {
        console.warn(`[TicTacToe] ${result.error}`);
        return;
      }

      if (result.nextPlayer === game.aiPlayer) {
        setIsAIThinking(true);
      }

      postNotifyMarkdown(
        formatMoveNotification({
          index,
          actor: player,
          board: result.board,
          status: result.status,
          nextPlayer: result.nextPlayer,
          humanPlayer: game.humanPlayer,
          agentPlayer: game.aiPlayer,
        }),
        'move-update'
      );
    },
    [game, isParentReady, showRoleModal, isAIThinking, postNotifyMarkdown]
  );

  /**
   * Handle new game request from UI
   * Opens role selection modal
   */
  const handleNewGame = useCallback(() => {
    if (!isParentReady) {
      console.warn('[TicTacToe] Cannot start new game until parent is ready.');
      return;
    }

    game.reset();
    setIsAIThinking(false);
    setShowRoleModal(true);
  }, [game, isParentReady]);

  /**
   * Handle role selection (X or O)
   * Starts a new game with selected role
   */
  const handleRoleSelect = useCallback(
    (role: Player) => {
      if (!isParentReady) {
        console.warn('[TicTacToe] Waiting for parent readiness before starting game.');
        return;
      }

      game.reset(role);
      setIsAIThinking(false);
      setShowRoleModal(false);

      postNotifyMarkdown(
        formatNewGameNotification({
          board: game.board,
          currentPlayer: 'X',
          humanPlayer: role,
          agentPlayer: role === 'X' ? 'O' : 'X',
        }),
        'new-game'
      );
    },
    [game, isParentReady, postNotifyMarkdown]
  );

  /**
   * WebMCP Tool 1: Get Game State
   *
   * Read-only tool that returns current board state, roles, and status.
   * AI uses this to check the board before making decisions.
   */
  useWebMCP({
    name: 'tictactoe_get_state',
    description:
      'Get the current Tic-Tac-Toe state including board layout, roles, and game status.',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
    handler: async () =>
      formatGameStateMarkdown(
        game.board,
        game.currentPlayer,
        game.winner,
        game.humanPlayer,
        game.aiPlayer
      ),
  });

  /**
   * WebMCP Tool 2: Make AI Move
   *
   * Allows AI (Clankers) to make a move.
   * Uses the same game.makeMove() logic as UI click handler!
   */
  useWebMCP({
    name: 'tictactoe_ai_move',
    description: `Play as Player ${game.aiPlayer} (Clankers 🤖). Provide a board position (0-8) to place your ${game.aiPlayer}.`,
    inputSchema: {
      position: z
        .number()
        .int()
        .min(0)
        .max(8)
        .describe('Cell position (0-8) in row-major order where Clankers 🤖 should move.'),
    },
    annotations: {
      idempotentHint: false,
    },
    handler: async ({ position }) => {
      if (showRoleModal) {
        throw new Error('Cannot move yet: waiting for the human to start a new game.');
      }

      const result = game.makeMove(position, game.aiPlayer);
      if (!result.success) {
        throw new Error(result.error);
      }

      setIsAIThinking(false);

      return formatMoveMarkdown(
        game.aiPlayer,
        position,
        result.board,
        result.status,
        result.nextPlayer,
        game.humanPlayer,
        game.aiPlayer
      );
    },
  });

  /**
   * WebMCP Tool 3: Reset Game
   *
   * Resets the board and reopens role selection modal.
   * Uses the same game.reset() logic as UI!
   */
  useWebMCP({
    name: 'tictactoe_reset',
    description: 'Reset the board and keep the current human/AI role assignments.',
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
    },
    handler: async () => {
      game.reset();
      setIsAIThinking(false);
      setShowRoleModal(true);

      return formatResetMarkdown(game.board, game.humanPlayer, game.aiPlayer);
    },
  });

  /**
   * Side Effect: Notify parent of document size changes
   * Allows parent iframe to resize appropriately
   */
  useEffect(() => {
    if (isParentReady) {
      requestAnimationFrame(() => {
        notifyParentOfCurrentDocumentSize();
      });
    }
  }, [isParentReady, notifyParentOfCurrentDocumentSize]);

  /**
   * Side Effect: Track game completion
   * Sends completion notification to stats server
   */
  useEffect(() => {
    if (game.winner) {
      notifyGameComplete(game.winner, game.aiPlayer);
    }
  }, [game.winner, game.aiPlayer, notifyGameComplete]);

  const showStatus = !isParentReady || isAIThinking || !showRoleModal;

  const getGameOverMessage = (): string | null => {
    if (!game.winner) return null;
    if (game.winner === 'Draw') return "It's a draw!";

    const winnerLabel = game.winner === game.humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    return `Player ${game.winner} (${winnerLabel}) wins!`;
  };

  return (
    <div className="flex flex-col gap-2 font-sans p-4">
      <GameHeader stats={stats} />

      <div className="relative flex items-center justify-center">
        <GameStatus
          isConnecting={!isParentReady}
          isAIThinking={isAIThinking}
          currentPlayer={game.currentPlayer}
          winner={game.winner}
          show={showStatus}
        />

        <GameBoard
          board={game.board}
          winningLine={game.winningLine}
          onCellClick={handleCellClick}
          currentPlayer={game.currentPlayer}
          disabled={!isParentReady || showRoleModal || isAIThinking || game.winner !== null}
          animated={animated}
        />

        {showRoleModal && isParentReady && (
          <RoleSelectionModal onSelect={handleRoleSelect} disabled={!isParentReady} />
        )}

        {game.winner && !showRoleModal && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-2xl max-[480px]:text-lg font-bold text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] mb-16">
                {getGameOverMessage()}
              </div>
            </div>
            <ResetButton onReset={handleNewGame} disabled={!isParentReady} />
          </>
        )}
      </div>
    </div>
  );
}
