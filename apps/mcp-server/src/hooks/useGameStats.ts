/**
 * Game statistics hook with WebSocket real-time updates
 *
 * This hook:
 * - Establishes WebSocket connection for real-time stats
 * - Auto-reconnects with exponential backoff on disconnection
 * - Provides method to notify server of game completion
 */

import { useCallback, useEffect, useState } from 'react';
import type { GameStats, Player } from '../lib/tictactoe/types';

/**
 * Return type for the useGameStats hook
 */
export interface UseGameStatsReturn {
  /** Current game statistics (null if not yet loaded) */
  stats: GameStats | null;
  /**
   * Notify server of game completion
   * @param winner - Winner of the game ('X', 'O', or 'Draw')
   * @param aiPlayer - Which player is the AI
   */
  notifyGameComplete: (winner: Player | 'Draw' | null, aiPlayer: Player) => Promise<void>;
}

/**
 * Hook for managing game statistics with real-time WebSocket updates
 *
 * @returns Game statistics state and completion notification method
 *
 * @example
 * ```tsx
 * function App() {
 *   const { stats, notifyGameComplete } = useGameStats();
 *
 *   useEffect(() => {
 *     if (winner) {
 *       notifyGameComplete(winner, aiPlayer);
 *     }
 *   }, [winner]);
 *
 *   return <div>Games: {stats?.totalGames}</div>;
 * }
 * ```
 */
export function useGameStats(): UseGameStatsReturn {
  const [stats, setStats] = useState<GameStats | null>(null);

  /**
   * WebSocket Connection with Auto-Reconnect
   *
   * Establishes WebSocket for real-time stats updates.
   * Automatically reconnects with exponential backoff on disconnection.
   */
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/stats/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000;
    const MAX_RECONNECT_DELAY = 30000;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data: GameStats = JSON.parse(event.data);
            setStats(data);
          } catch (error) {
            console.error('Failed to parse stats message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('Stats WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log(`Stats WebSocket closed: code=${event.code}, reason=${event.reason}`);

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(
              BASE_RECONNECT_DELAY * 2 ** reconnectAttempts,
              MAX_RECONNECT_DELAY
            );

            console.log(
              `Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`
            );

            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              connect();
            }, delay);
          } else {
            console.warn(
              'Max WebSocket reconnection attempts reached. Stats will not update automatically.'
            );
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
        ws.close(1000, 'Component unmounting');
      }
    };
  }, []);

  /**
   * Notify server when game completes
   * Maps winner to appropriate stat category (clankers/carbonUnits/draw)
   */
  const notifyGameComplete = useCallback(
    async (winner: Player | 'Draw' | null, aiPlayer: Player) => {
      if (!winner) return;

      try {
        let result: 'clankers' | 'carbonUnits' | 'draw';
        if (winner === 'Draw') {
          result = 'draw';
        } else if (winner === aiPlayer) {
          result = 'clankers';
        } else {
          result = 'carbonUnits';
        }

        const response = await fetch('/api/stats/game-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result }),
        });

        if (response.ok) {
          const data: GameStats = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to notify game completion:', error);
      }
    },
    []
  );

  return {
    stats,
    notifyGameComplete,
  };
}
