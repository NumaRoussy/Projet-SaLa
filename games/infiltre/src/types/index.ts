export interface Player {
  id: string
  name: string
}

export type Role = 'civil' | 'infiltre' | 'white'

export interface Card {
  id: number | string
  game: string
  category: string
  title: string | null
  content: string // Mot pour les joueurs ordinaires
  extra: string | null // Mot pour l'infiltré
  sips?: number
  min_players?: number
}

export interface AssignedPlayer {
  player: Player
  role: Role
  secretWord: string
  eliminated: boolean
  eliminatedInRound?: number
}

export type GamePhase = 'setup' | 'reveal' | 'debate' | 'vote' | 'elimination' | 'gameover'
export type GameTheme = 'scout' | 'moldus'
