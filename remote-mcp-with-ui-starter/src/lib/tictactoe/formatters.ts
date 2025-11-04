/**
 * Markdown formatters for WebMCP tool responses
 *
 * These functions format game state into human-readable markdown
 * for display in the AI assistant's chat interface.
 */

import type {
  Board,
  GameStatus,
  MoveNotificationParams,
  NewGameNotificationParams,
  Player,
  Winner,
} from './types';
import { getAvailableMoves } from './gameLogic';

/**
 * Formats the board as ASCII art in a markdown code block
 *
 * @param board - Current game board
 * @returns Markdown string with board visualization and position reference
 *
 * @example
 * ```ts
 * formatBoardMarkdown(board)
 * // Returns:
 * // ## Current Board State
 * //
 * // ```
 * //  X | O | X
 * // -----------
 * //  _ | _ | O
 * // -----------
 * //  _ | _ | _
 * // ```
 * ```
 */
export function formatBoardMarkdown(board: Board): string {
  const cells = board.map((cell) => cell ?? '_');

  return [
    '## Current Board State',
    '',
    '```',
    ` ${cells[0]} | ${cells[1]} | ${cells[2]}`,
    '-----------',
    ` ${cells[3]} | ${cells[4]} | ${cells[5]}`,
    '-----------',
    ` ${cells[6]} | ${cells[7]} | ${cells[8]}`,
    '```',
    '',
    '**Position Reference:**',
    '```',
    ' 0 | 1 | 2',
    '-----------',
    ' 3 | 4 | 5',
    '-----------',
    ' 6 | 7 | 8',
    '```',
  ].join('\n');
}

/**
 * Formats complete game state for the `tictactoe_get_state` tool
 *
 * @param board - Current game board
 * @param currentPlayer - Whose turn it is
 * @param winner - Winner of the game (null if in progress)
 * @param humanPlayer - Which player is the human
 * @param agentPlayer - Which player is the AI
 * @returns Formatted markdown with game state
 */
export function formatGameStateMarkdown(
  board: Board,
  currentPlayer: Player,
  winner: Winner,
  humanPlayer: Player,
  agentPlayer: Player
): string {
  const availableMoves = getAvailableMoves(board);

  const lines: string[] = [
    '# Tic-Tac-Toe Game State',
    '',
    '**Player Roles:**',
    `- Player ${humanPlayer} = Carbon Units 👤`,
    `- Player ${agentPlayer} = Clankers 🤖`,
    '',
    formatBoardMarkdown(board),
    '',
  ];

  if (winner === 'Draw') {
    lines.push("**Status:** Game Over - It's a draw!");
  } else if (winner) {
    const winnerLabel = winner === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    lines.push(`**Status:** Game Over - Player ${winner} (${winnerLabel}) wins!`);
  } else {
    const currentRole = currentPlayer === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    lines.push('**Status:** Game in progress');
    lines.push(`**Current Turn:** Player ${currentPlayer} (${currentRole})`);
    if (currentPlayer === humanPlayer) {
      lines.push('**Action:** Waiting for Carbon Units to move via the UI.');
    } else {
      lines.push('**Action:** Awaiting Clankers move.');
    }
    if (availableMoves.length > 0) {
      lines.push(`**Available Moves:** ${availableMoves.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats move result for the `tictactoe_ai_move` tool response
 *
 * @param player - Player who made the move
 * @param index - Position where move was made (0-8)
 * @param board - Board state after the move
 * @param status - Game status after the move
 * @param nextPlayer - Next player to move (null if game over)
 * @param humanPlayer - Which player is the human
 * @param agentPlayer - Which player is the AI
 * @returns Formatted markdown with move result
 */
export function formatMoveMarkdown(
  player: Player,
  index: number,
  board: Board,
  status: GameStatus,
  nextPlayer: Player | null,
  humanPlayer: Player,
  agentPlayer: Player
): string {
  const lines: string[] = [
    '# Move Successful',
    '',
    `Player ${player} (${player === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖'}) placed at position ${index}.`,
    '',
    formatBoardMarkdown(board),
    '',
  ];

  if (status.winner === 'Draw') {
    lines.push("**Game Over:** It's a draw!");
  } else if (status.winner) {
    const winnerLabel = status.winner === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    lines.push(`**Game Over:** Player ${status.winner} (${winnerLabel}) wins!`);
  } else if (nextPlayer) {
    const nextLabel = nextPlayer === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    lines.push(`**Next Turn:** Player ${nextPlayer} (${nextLabel})`);
    if (nextPlayer === agentPlayer) {
      lines.push('**Reminder:** You are Clankers 🤖—make your move using this tool.');
    }

    const remainingMoves = getAvailableMoves(board);
    if (remainingMoves.length > 0) {
      lines.push(`**Available Moves:** ${remainingMoves.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats reset confirmation for the `tictactoe_reset` tool response
 *
 * @param board - New empty board
 * @param humanPlayer - Which player is the human
 * @param agentPlayer - Which player is the AI
 * @returns Formatted markdown confirming reset
 */
export function formatResetMarkdown(board: Board, humanPlayer: Player, agentPlayer: Player): string {
  const availableMoves = getAvailableMoves(board);

  const lines: string[] = [
    '# Game Reset',
    '',
    `Carbon Units 👤 plays as Player ${humanPlayer}.`,
    `Clankers 🤖 plays as Player ${agentPlayer}.`,
    '',
    formatBoardMarkdown(board),
    '',
    '**Status:** New game started. Player X goes first.',
  ];

  if (agentPlayer === 'X') {
    lines.push('**Action:** Clankers 🤖 opens the game.');
  } else {
    lines.push('**Action:** Carbon Units 👤 opens the game via the UI.');
  }

  if (availableMoves.length > 0) {
    lines.push(`**Available Moves:** ${availableMoves.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Formats move notification sent to parent window after any move
 *
 * @param params - Move notification parameters
 * @returns Formatted markdown for notification
 */
export function formatMoveNotification(params: MoveNotificationParams): string {
  const { index, actor, board, status, nextPlayer, humanPlayer, agentPlayer } = params;

  const lines: string[] = [
    '# Tic-Tac-Toe Update',
    '',
    `- Move: Player ${actor} (${actor === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖'}) placed at position ${index}.`,
    `- Carbon Units 👤 plays as Player ${humanPlayer}`,
    `- Clankers 🤖 plays as Player ${agentPlayer}`,
    '',
  ];

  if (status.winner === 'Draw') {
    lines.push("**Status:** Game over – it's a draw.");
  } else if (status.winner) {
    const winnerLabel = status.winner === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    lines.push(`**Status:** Game over – Player ${status.winner} (${winnerLabel}) wins!`);
  } else if (nextPlayer) {
    const nextLabel = nextPlayer === humanPlayer ? 'Carbon Units 👤' : 'Clankers 🤖';
    lines.push(`**Next Turn:** Player ${nextPlayer} (${nextLabel})`);
    if (nextPlayer === agentPlayer) {
      lines.push('**Action:** Awaiting Clankers 🤖 move.');
    }
  }

  const availableMoves = getAvailableMoves(board);
  if (!status.winner && availableMoves.length > 0) {
    lines.push(`**Available Moves:** ${availableMoves.join(', ')}`);
  }

  lines.push('', formatBoardMarkdown(board));

  return lines.join('\n');
}

/**
 * Formats new game notification sent to parent window when game starts
 *
 * @param params - New game notification parameters
 * @returns Formatted markdown for notification
 */
export function formatNewGameNotification(params: NewGameNotificationParams): string {
  const { board, currentPlayer, humanPlayer, agentPlayer } = params;
  const availableMoves = getAvailableMoves(board);

  const lines: string[] = [
    '# Tic-Tac-Toe New Game',
    '',
    `- Carbon Units 👤 plays as Player ${humanPlayer}`,
    `- Clankers 🤖 plays as Player ${agentPlayer}`,
    '',
  ];

  if (currentPlayer === agentPlayer) {
    lines.push('**Next Turn:** Clankers 🤖 opens the game.');
    lines.push('**Action:** Awaiting Clankers 🤖 move.');
  } else {
    lines.push('**Next Turn:** Carbon Units 👤 opens the game via the UI.');
  }

  if (availableMoves.length > 0) {
    lines.push(`**Available Moves:** ${availableMoves.join(', ')}`);
  }

  lines.push('', formatBoardMarkdown(board));

  return lines.join('\n');
}
