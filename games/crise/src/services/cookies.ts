import type { CrisisPlayer } from '../types'

const PLAYERS_COOKIE = 'scout_players'
const DEVICE_PASS_COOKIE = 'scout_device_pass'

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

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  try {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match ? decodeURIComponent(match[2]) : null
  } catch {
    return null
  }
}

export function loadPlayers(): CrisisPlayer[] {
  const val = getCookie(PLAYERS_COOKIE)
  let rawList: unknown[] | null = null
  if (val !== null) {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) rawList = parsed
    } catch {
      rawList = []
    }
  }
  if (rawList === null && typeof localStorage !== 'undefined') {
    const fromStorage = localStorage.getItem(PLAYERS_COOKIE)
    if (fromStorage) {
      try {
        const parsed = JSON.parse(fromStorage)
        if (Array.isArray(parsed)) rawList = parsed
      } catch {
        rawList = []
      }
    }
  }

  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList
      .map((p, idx): CrisisPlayer | null => {
        if (typeof p === 'string') {
          return {
            id: `p_${idx + 1}`,
            name: p.trim(),
            avatar: ['👮', '🦺', '📋', '🚨', '🎒', '🔦', '📻', '🛠️'][idx % 8],
            lossPercent: 0.0,
            isEliminated: false,
            activeDebuffs: [],
            sipsDrunk: 0,
          }
        }
        if (p && typeof p === 'object' && 'name' in p) {
          const obj = p as Partial<CrisisPlayer>
          return {
            id: obj.id || `p_${idx + 1}`,
            name: String(obj.name || '').trim(),
            avatar: obj.avatar || ['👮', '🦺', '📋', '🚨', '🎒', '🔦', '📻', '🛠️'][idx % 8],
            lossPercent: 0.0,
            isEliminated: false,
            activeDebuffs: [],
            sipsDrunk: 0,
          }
        }
        return null
      })
      .filter((p): p is CrisisPlayer => Boolean(p && p.name))
  }

  return []
}

export function savePlayers(players: CrisisPlayer[]): void {
  const minimal = players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
  }))
  const jsonStr = JSON.stringify(minimal)
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
      // Ignore storage errors
    }
  }
}

export function loadDevicePass(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('scout_device_pass')
    }
  } catch {}
  return getCookie(DEVICE_PASS_COOKIE)
}

export const getDevicePass = loadDevicePass

export function getHubUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (!host.endsWith('scoutgame.ch')) {
      return `http://${host}:5173`
    }
  }
  return import.meta.env.VITE_HUB_URL || 'https://scoutgame.ch'
}
