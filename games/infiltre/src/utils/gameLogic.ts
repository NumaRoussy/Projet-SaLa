import type { Player, Card, AssignedPlayer, Role } from '../types'

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

/**
 * Attribution aléatoire des rôles aux joueurs via Fisher-Yates
 * afin d'éliminer tout biais d'ordre de saisie.
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

  const shuffledRoles = shuffle(roles)

  return players.map((player, idx) => {
    const role = shuffledRoles[idx]
    let secretWord = ''
    if (role === 'civil') {
      secretWord = card.content // Mot majoritaire
    } else if (role === 'infiltre') {
      secretWord = card.extra || card.content // Mot alternatif
    } else {
      secretWord = '' // Mister White ne reçoit AUCUN mot
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

    // Sélection aléatoire uniforme du 1er joueur parmi ceux qui ne sont PAS Mister White
    const firstIndex = Math.floor(Math.random() * nonWhites.length)
    const firstSpeaker = nonWhites[firstIndex]

    // Le reste des joueurs en vie (y compris Mister White) est mélangé par Fisher-Yates
    const remainingSpeakers = alive.filter(p => p.player.id !== firstSpeaker.player.id)
    return [firstSpeaker, ...shuffle(remainingSpeakers)]
  }

  // Tours suivants : tirage au sort parmi tous les survivants
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

  // 1. Victoire des Civils : Tous les ennemis éliminés
  if (remainingEnemies === 0) {
    return 'civils'
  }

  // 2. Victoire des Ennemis : Il ne reste plus qu'un seul (ou 0) Joueur ordinaire face aux ennemis
  if (remainingCivils <= 1 && remainingEnemies > 0) {
    return 'enemies'
  }

  // 3. Partie continue
  return null
}
