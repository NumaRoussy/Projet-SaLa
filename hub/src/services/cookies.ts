/**
 * services/cookies.ts
 * Gestion du cookie scout_players (section 7.2).
 *
 * En production (*.scoutgame.ch), on ajoute Domain=.scoutgame.ch pour que
 * tous les sous-domaines puissent lire la liste.
 * En développement (localhost), on omet l'attribut Domain (sinon le browser
 * l'ignore et le cookie n'est pas posé).
 */
import type { Player } from '../types'

const COOKIE_NAME = 'scout_players'

function domainAttr(): string {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('scoutgame.ch')) {
    return '; Domain=.scoutgame.ch'
  }
  return ''
}

export function savePlayers(players: Player[]): void {
  const encoded = encodeURIComponent(JSON.stringify(players))
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  document.cookie = [
    `${COOKIE_NAME}=${encoded}`,
    `Path=/`,
    `Max-Age=86400`,
    `SameSite=Lax`,
    isHttps ? 'Secure' : '',
    domainAttr(),
  ]
    .filter(Boolean)
    .join('; ')
}

export function loadPlayers(): Player[] {
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`))
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2])) as Player[]
    } catch {
      return []
    }
  }
  return []
}

export function clearPlayers(): void {
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0${domainAttr()}`
}
