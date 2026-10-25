/**
 * services/cookies.ts
 * Gestion des cookies multi-domaines et multi-ports :
 * 1. scout_players (section 7.2) - synchronisation des joueurs inter-jeux
 * 2. scout_device_pass (section 7.4 / Face B) - partage du laissez-passer maîtrise
 *
 * Règles strictes :
 * - En production (*.scoutgame.ch) : Domain=.scoutgame.ch et Secure (si HTTPS)
 * - Hors scoutgame.ch (localhost ou IP Wi-Fi locale type 192.168.x.x) :
 *   SANS attribut Domain et SANS attribut Secure (Path=/; SameSite=Lax),
 *   afin d'être partagés entre les ports 5173 et 3001..3006 sur les smartphones.
 */
import type { Player } from '../types'

const PLAYERS_COOKIE = 'scout_players'
const DEVICE_PASS_COOKIE = 'scout_device_pass'

function isScoutDomain(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('scoutgame.ch')
}

function domainAttr(): string {
  if (isScoutDomain()) {
    return '; Domain=.scoutgame.ch'
  }
  return ''
}

function secureAttr(): string {
  if (isScoutDomain() && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'Secure'
  }
  return ''
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match ? decodeURIComponent(match[2]) : null
  } catch {
    return null
  }
}

// ── scout_players ────────────────────────────────────────────────────────────

export function savePlayers(players: Player[]): void {
  try {
    const encoded = encodeURIComponent(JSON.stringify(players))
    document.cookie = [
      `${PLAYERS_COOKIE}=${encoded}`,
      `Path=/`,
      `Max-Age=86400`,
      `SameSite=Lax`,
      secureAttr(),
      domainAttr(),
    ]
      .filter(Boolean)
      .join('; ')
  } catch {
    // Cookie write failed — silently ignore
  }
}

export function loadPlayers(): Player[] {
  const match = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )scout_players=([^;]+)')) : null
  if (match) {
    try {
      const decoded = decodeURIComponent(match[2])
      return JSON.parse(decoded) as Player[]
    } catch (e) {
      console.warn('[cookies] Erreur de décodage des joueurs du cookie, réinitialisation gracieuse :', e)
      return []
    }
  }
  return []
}

export const loadActivePlayers = loadPlayers

export function clearPlayers(): void {
  try {
    document.cookie = `${PLAYERS_COOKIE}=; Path=/; Max-Age=0${domainAttr()}`
  } catch {
    // ignore
  }
}

// ── scout_device_pass ────────────────────────────────────────────────────────

export function saveDevicePassCookie(pass: string): void {
  try {
    const encoded = encodeURIComponent(pass)
    document.cookie = [
      `${DEVICE_PASS_COOKIE}=${encoded}`,
      `Path=/`,
      `Max-Age=31536000`, // 1 an
      `SameSite=Lax`,
      secureAttr(),
      domainAttr(),
    ]
      .filter(Boolean)
      .join('; ')
  } catch {
    // Cookie write failed — silently ignore
  }
}

export function loadDevicePassCookie(): string | null {
  return getCookie(DEVICE_PASS_COOKIE)
}

export function clearDevicePassCookie(): void {
  try {
    document.cookie = `${DEVICE_PASS_COOKIE}=; Path=/; Max-Age=0${domainAttr()}`
  } catch {
    // ignore
  }
}
