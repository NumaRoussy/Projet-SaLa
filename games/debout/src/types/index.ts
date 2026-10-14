export interface Player {
  id: string
  name: string
  isStanding: boolean
}

export interface Card {
  id: number
  game: string
  category: 'reflexe' | 'chrono' | 'duel'
  title: string | null
  content: string
  extra: string | null
  sips?: number
  min_players?: number
}

export type MiniGameType = 'none' | 'reflexe' | 'chrono' | 'duel'
