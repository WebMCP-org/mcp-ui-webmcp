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
    <div className="text-center mb-2">
      <h1 className="text-xl font-black text-black mb-2 tracking-tight">
        Beat The Clankers 🤖
      </h1>

      {stats && (
        <div className="flex items-center justify-center gap-4 text-sm text-black mb-1.5 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="text-base">👤</span>
            <span>{stats.carbonUnitsWins}</span>
            <span className="font-normal text-xs text-black">Humans</span>
          </span>
          <span className="text-black">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-base">🤖</span>
            <span>{stats.clankersWins}</span>
            <span className="font-normal text-xs text-black">Clankers</span>
          </span>
          <span className="text-black">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-base">🤝</span>
            <span>{stats.draws}</span>
            <span className="font-normal text-xs text-black">Draws</span>
          </span>
        </div>
      )}

      {stats && (
        <div className="flex items-center justify-center gap-3 text-xs text-black">
          <span title="Total games played" className="flex items-center gap-1">
            <span>📊</span>
            <span className="font-medium">{stats.totalGames}</span>
            <span>total</span>
          </span>
          <span className="text-black">•</span>
          <span title="Active games" className="flex items-center gap-1">
            <span>🎮</span>
            <span className="font-medium">{stats.liveGames}</span>
            <span>active</span>
          </span>
        </div>
      )}
    </div>
  );
}
