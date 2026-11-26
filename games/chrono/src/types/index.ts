export interface Player {
  id: string
  name: string
}

export type ChronoTheme = 'scout' | 'moldu'

export interface Card {
  id: number
  game: string
  mode?: string // 'scout' | 'moldu'
  category: string
  title: string | null
  content: string
  extra?: string | null
  sips?: number
  loss_percent?: number
  min_players?: number
}

export type RoundNumber = 1 | 2 | 3

export interface Team {
  id: 'teamA' | 'teamB'
  name: string
  color: string
  score: number
  players: Player[]
}

export type GamePhase =
  | 'setup'
  | 'round_intro'
  | 'play'
  | 'turn_transition'
  | 'round_recap'
  | 'gameover'

export interface FeedbackPayload {
  type: 'PROPOSITION'
  target_game: 'chrono'
  mode: ChronoTheme
  category: string
  title: string
  content: string
  min_players: number
  author_alias: null
}
