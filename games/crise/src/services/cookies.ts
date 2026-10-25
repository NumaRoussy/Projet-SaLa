import type { CrisisPlayer } from '../types'

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

export function loadPlayers(): CrisisPlayer[] {
  const val = getCookie(PLAYERS_COOKIE)
  let rawList: any[] = []
  if (val) {
    try {
      rawList = JSON.parse(val)
    } catch {
      rawList = []
    }
  }
  if (rawList.length === 0 && typeof localStorage !== 'undefined') {
    const fromStorage = localStorage.getItem(PLAYERS_COOKIE)
    if (fromStorage) {
      try {
        rawList = JSON.parse(fromStorage)
      } catch {
        rawList = []
      }
    }
  }

  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((p, idx) => ({
      id: p.id || `p_${idx + 1}`,
      name: typeof p === 'string' ? p : p.name || `Chef ${idx + 1}`,
      avatar: p.avatar || ['👮', '🦺', '📋', '🚨', '🎒', '🔦', '📻', '🛠️'][idx % 8],
      lossPercent: 0.0,
      isEliminated: false,
      activeDebuffs: [],
      sipsDrunk: 0,
    }))
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
    } catch {}
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
