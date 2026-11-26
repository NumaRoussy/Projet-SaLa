import type { Player } from '../types'

const PLAYERS_COOKIE = 'scout_players'

function isScoutDomain(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('scoutgame.ch')
}

function domainAttr(): string {
  return isScoutDomain() ? '; Domain=.scoutgame.ch' : ''
}

function secureAttr(): string {
  return isScoutDomain() && typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? 'Secure'
    : ''
}

export function loadPlayers(): Player[] {
  let raw: unknown[] | null = null
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(^| )${PLAYERS_COOKIE}=([^;]+)`))
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[2]))
        if (Array.isArray(parsed)) raw = parsed
      } catch {
        raw = []
      }
    }
  }
  if (raw === null && typeof localStorage !== 'undefined') {
    const fromStorage = localStorage.getItem(PLAYERS_COOKIE)
    if (fromStorage) {
      try {
        const parsed = JSON.parse(fromStorage)
        if (Array.isArray(parsed)) raw = parsed
      } catch {
        raw = []
      }
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((p, idx) => {
      if (typeof p === 'string') return { id: `p_${idx + 1}`, name: p.trim() }
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
  try {
    const encoded = encodeURIComponent(jsonStr)
    if (typeof document !== 'undefined') {
      document.cookie = [
        `${PLAYERS_COOKIE}=${encoded}`,
        'Path=/',
        'Max-Age=86400',
        'SameSite=Lax',
        secureAttr(),
        domainAttr(),
      ]
        .filter(Boolean)
        .join('; ')
    }
  } catch {
    // Ignore cookie errors
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PLAYERS_COOKIE, jsonStr)
    } catch {
      // Ignore storage quota errors
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
