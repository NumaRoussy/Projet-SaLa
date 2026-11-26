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
  let raw: unknown[] = []
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(^| )${PLAYERS_COOKIE}=([^;]+)`))
    if (match) {
      try {
        raw = JSON.parse(decodeURIComponent(match[2])) as unknown[]
      } catch {
        raw = []
      }
    }
  }
  if (raw.length === 0 && typeof localStorage !== 'undefined') {
    const fromStorage = localStorage.getItem(PLAYERS_COOKIE)
    if (fromStorage) {
      try {
        raw = JSON.parse(fromStorage) as unknown[]
      } catch {
        raw = []
      }
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((p, idx) => {
      if (typeof p === 'string') {
        return { id: `p_${idx + 1}`, name: p }
      }
      if (p && typeof p === 'object' && 'name' in p) {
        const obj = p as { id?: string; name?: string }
        return {
          id: obj.id || `p_${idx + 1}`,
          name: String(obj.name || '').trim(),
        }
      }
      return null
    })
    .filter((p): p is Player => Boolean(p && p.name))
}

export function savePlayers(players: Player[]): void {
  const jsonStr = JSON.stringify(players)
  const encoded = encodeURIComponent(jsonStr)
  if (typeof document !== 'undefined') {
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
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PLAYERS_COOKIE, jsonStr)
    } catch {
      // ignore storage quota errors
    }
  }
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
