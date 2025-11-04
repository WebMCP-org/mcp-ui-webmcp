/**
 * GameHeader component
 *
 * Displays the game title and live statistics
 * (wins, losses, draws, and active games)
 */

import type { GameStats } from '../lib/tictactoe/types';

export interface GameHeaderProps {
  /** Game statistics to display (null if not loaded) */
  stats: GameStats | null;
}

/**
 * Game header with title and statistics
 *
 * Displays:
 * - Game title
 * - Win/loss/draw counts
 * - Total and active game counts
 *
 * @example
 * ```tsx
 * <GameHeader stats={stats} />
 * ```
 */
export function GameHeader({ stats }: GameHeaderProps) {
  return (
    <div className="text-center">
      <h1 className="text-sm font-bold text-black dark:text-white mb-0.5">
        Beat The Clankers 🤖
      </h1>

      {stats && (
        <div className="flex items-center justify-center gap-3 text-xs text-black dark:text-white mb-0.5">
          <span className="font-semibold">👤 {stats.carbonUnitsWins} Humans</span>
          <span className="text-black dark:text-gray-400">•</span>
          <span className="font-semibold">🤖 {stats.clankersWins} Clankers</span>
          <span className="text-black dark:text-gray-400">•</span>
          <span className="font-semibold">🤝 {stats.draws} Draws</span>
        </div>
      )}

      {stats && (
        <div className="flex items-center justify-center gap-2 text-[0.625rem] text-black dark:text-gray-400">
          <span title="Total games played">📊 {stats.totalGames} total</span>
          <span className="text-black dark:text-gray-400">•</span>
          <span title="Active games">🎮 {stats.liveGames} active</span>
        </div>
      )}
    </div>
  );
}
