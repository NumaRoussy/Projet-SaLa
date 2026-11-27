import type { Player, Card, AssignedPlayer, Role } from '../types'

const PREV_ROLES_KEY = 'scoutgame_prev_roles_infiltre'

/**
 * Algorithme de mélange robuste Fisher-Yates sans aucun biais statistique
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

function getCanonicalPairKey(card: Card): string {
  const a = (card.content || '').trim().toLowerCase()
  const b = (card.extra || '').trim().toLowerCase()
  return [a, b].sort().join('|')
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Safari private browsing or quota exceeded
  }
}

/**
 * Pioche une paire de mots sans remise via localStorage + Fisher-Yates,
 * et inverse aléatoirement (50/50) le mot des joueurs ordinaires et celui de l'infiltré.
 */
export function drawNonRepeatingWordPair(cards: readonly Card[], storageKey: string): Card | null {
  if (!cards || cards.length === 0) return null

  // Déduplication par paire canonique pour éviter les doublons API/fallback
  const seenInPool = new Set<string>()
  const uniqueCards: Card[] = []
  for (const c of cards) {
    const k = getCanonicalPairKey(c)
    if (!seenInPool.has(k)) {
      seenInPool.add(k)
      uniqueCards.push(c)
    }
  }

  const history = readJsonStorage<string[]>(storageKey, [])
  const historySet = new Set(history)
  let unseen = uniqueCards.filter(c => !historySet.has(getCanonicalPairKey(c)))

  let nextHistory = [...history]
  if (unseen.length === 0) {
    const lastKey = history.length > 0 ? history[history.length - 1] : null
    nextHistory = lastKey && uniqueCards.length > 1 ? [lastKey] : []
    const resetSet = new Set(nextHistory)
    unseen = uniqueCards.filter(c => !resetSet.has(getCanonicalPairKey(c)))
    if (unseen.length === 0) unseen = uniqueCards
  }

  const picked = shuffle(unseen)[0]
  if (!picked) return null

  const pickedKey = getCanonicalPairKey(picked)
  writeJsonStorage(storageKey, [...nextHistory.filter(k => k !== pickedKey), pickedKey])

  if (picked.extra && Math.random() < 0.5) {
    return {
      ...picked,
      content: picked.extra,
      extra: picked.content,
    }
  }

  return picked
}

/**
 * Attribution aléatoire des rôles aux joueurs via Fisher-Yates,
 * en évitant qu'un même joueur reçoive le même rôle spécial deux parties de suite.
 */
export function assignRoles(
  players: readonly Player[],
  infiltratorCount: number,
  misterWhiteCount: number,
  card: Card
): AssignedPlayer[] {
  const total = players.length
  const civilCount = Math.max(1, total - infiltratorCount - misterWhiteCount)

  const roles: Role[] = [
    ...Array(infiltratorCount).fill('infiltre'),
    ...Array(misterWhiteCount).fill('white'),
    ...Array(civilCount).fill('civil'),
  ]

  const prevRoles = readJsonStorage<Record<string, Role>>(PREV_ROLES_KEY, {})

  let bestRoles = shuffle(roles)
  let bestRepeats = Infinity

  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = attempt === 0 ? bestRoles : shuffle(roles)
    let repeats = 0
    for (let i = 0; i < players.length; i++) {
      const role = candidate[i]
      const playerKey = players[i].name.trim().toLowerCase()
      if (role !== 'civil' && prevRoles[playerKey] === role) {
        repeats++
      }
    }
    if (repeats < bestRepeats) {
      bestRepeats = repeats
      bestRoles = candidate
      if (repeats === 0) break
    }
  }

  const nextPrevRoles: Record<string, Role> = {}
  players.forEach((p, idx) => {
    nextPrevRoles[p.name.trim().toLowerCase()] = bestRoles[idx]
  })
  writeJsonStorage(PREV_ROLES_KEY, nextPrevRoles)

  return players.map((player, idx) => {
    const role = bestRoles[idx]
    let secretWord = ''
    if (role === 'civil') {
      secretWord = card.content
    } else if (role === 'infiltre') {
      secretWord = card.extra || card.content
    } else {
      secretWord = ''
    }

    return {
      player,
      role,
      secretWord,
      eliminated: false,
    }
  })
}

/**
 * Génère l'ordre de parole pour un tour.
 * - Tour 1 : Contrainte stricte : Mister White ne doit JAMAIS commencer.
 * - Tours suivants : Tirage au sort complet parmi les survivants (Mister White peut commencer).
 */
export function generateSpeakingOrder(
  assigned: readonly AssignedPlayer[],
  round: number
): AssignedPlayer[] {
  const alive = assigned.filter(p => !p.eliminated)
  if (alive.length === 0) return []

  if (round === 1) {
    const nonWhites = alive.filter(p => p.role !== 'white')
    if (nonWhites.length === 0) {
      return shuffle(alive)
    }

    const firstIndex = Math.floor(Math.random() * nonWhites.length)
    const firstSpeaker = nonWhites[firstIndex]

    const remainingSpeakers = alive.filter(p => p.player.id !== firstSpeaker.player.id)
    return [firstSpeaker, ...shuffle(remainingSpeakers)]
  }

  return shuffle(alive)
}

/**
 * Évalue les conditions de victoire :
 * - Victoire des Civils : Tous les Infiltrés ET Mister White ont été éliminés.
 * - Victoire des Ennemis : Il ne reste plus qu'un seul Joueur ordinaire en jeu.
 * - Partie continue : Si aucune condition n'est remplie (retourne null).
 */
export function checkVictoryCondition(
  assigned: readonly AssignedPlayer[]
): 'civils' | 'enemies' | null {
  const alive = assigned.filter(p => !p.eliminated)
  const remainingInfiltres = alive.filter(p => p.role === 'infiltre').length
  const remainingWhites = alive.filter(p => p.role === 'white').length
  const remainingCivils = alive.filter(p => p.role === 'civil').length
  const remainingEnemies = remainingInfiltres + remainingWhites

  if (remainingEnemies === 0) {
    return 'civils'
  }

  if (remainingCivils <= 1 && remainingEnemies > 0) {
    return 'enemies'
  }

  return null
}
