/**
 * services/navigation.ts
 * Gère la résolution dynamique des URLs de jeux et du Hub :
 * - Sur un hôte de développement (hors *.scoutgame.ch, ex: localhost, 192.168.x.x) :
 *   pointe vers http://${window.location.hostname}:3001..3006 pour les jeux,
 *   et http://${window.location.hostname}:5173 pour le Hub.
 * - En production (*.scoutgame.ch) : pointe vers https://<jeu>.scoutgame.ch et https://scoutgame.ch.
 */

const GAME_PORTS: Record<string, number> = {
  infiltre: 3001,
  rondedenuit: 3002,
  chrono: 3003,
  carnotzet: 3004,
  debout: 3005,
  debrief: 3006,
}

export function getGameUrl(gameId: string, fallbackUrl?: string): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (!host.endsWith('scoutgame.ch')) {
      const port = GAME_PORTS[gameId]
      if (port) {
        return `http://${host}:${port}`
      }
    }
  }
  return fallbackUrl || `https://${gameId}.scoutgame.ch`
}

export function getHubUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (!host.endsWith('scoutgame.ch')) {
      return `http://${host}:5173`
    }
  }
  return 'https://scoutgame.ch'
}
