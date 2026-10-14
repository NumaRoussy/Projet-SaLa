import type { Player } from '../types'

const PLAYERS_COOKIE = 'scout_players'

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

export function loadPlayers(): Player[] {
  if (typeof document === 'undefined') return []
  const match = document.cookie.match(new RegExp(`(^| )${PLAYERS_COOKIE}=([^;]+)`))
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2])) as Player[]
    } catch {
      return []
    }
  }
  return []
}

export function savePlayers(players: Player[]): void {
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
}

export function getHubUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (!host.endsWith('scoutgame.ch')) {
      return `http://${host}:5173`
    }
  }
  return import.meta.env.VITE_HUB_URL || 'https://scoutgame.ch'
}
