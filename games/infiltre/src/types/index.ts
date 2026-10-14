export interface Player {
  id: string
  name: string
}

export interface Card {
  id: number
  game: string
  category: string
  title: string | null
  content: string // Mot pour les scouts
  extra: string | null // Mot pour l'infiltré
  sips?: number
  min_players?: number
}

export interface AssignedPlayer {
  player: Player
  role: 'scout' | 'infiltre'
  secretWord: string
  eliminated: boolean
}

export type GamePhase = 'setup' | 'reveal' | 'debate' | 'vote' | 'gameover'
