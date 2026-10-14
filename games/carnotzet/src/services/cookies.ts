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
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

export function loadPlayers(): Player[] {
  const val = getCookie(PLAYERS_COOKIE)
  if (val) {
    try {
      return JSON.parse(val) as Player[]
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

export function loadDevicePass(): string | null {
  if (typeof localStorage !== 'undefined') {
    const fromStorage = localStorage.getItem('scout_device_pass')
    if (fromStorage) return fromStorage
  }
  return getCookie(DEVICE_PASS_COOKIE)
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
