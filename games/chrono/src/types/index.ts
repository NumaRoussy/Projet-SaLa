export interface Player {
  id: string
  name: string
}

export interface Card {
  id: number
  game: string
  category: string // scout, nature, camp
  title: string | null
  content: string // Mot ou expression à deviner
  extra: string | null // Mots interdits
  sips?: number
  min_players?: number
}

export type RoundNumber = 1 | 2 | 3

export interface Team {
  id: 'teamA' | 'teamB'
  name: string
  color: string
  score: number
}

export type GamePhase = 'setup' | 'round_intro' | 'play' | 'round_recap' | 'gameover'
