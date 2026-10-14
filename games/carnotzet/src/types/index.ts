export interface Player {
  id: string
  name: string
}

export interface Card {
  id: number
  game: string
  category: 'duel' | 'vote' | 'pub' | 'regle'
  title: string | null
  content: string
  extra: string | null
  sips?: number
  min_players?: number
}

export interface ActiveRule {
  id: string
  title: string
  content: string
  remainingTurns: number
}
