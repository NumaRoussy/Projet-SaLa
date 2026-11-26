export type DebriefMode = 'dossiers' | 'jamais' | 'prefere'

export interface Card {
  id?: number
  game?: string
  game_id?: string
  mode?: string
  category: string // 'dossiers' | 'jamais' | 'prefere' | 'verite' | 'dilemme' | 'carte'
  title: string
  content: string
  extra?: string | null
  extra_data?: string | null
  sips?: number
  loss_percent?: number
  min_players?: number
}

export interface Player {
  id: string
  name: string
  avatar?: string
  sipsCount?: number
}

export interface VerifyResult {
  valid: boolean
  blackout?: boolean
  reason?: string
}

export interface FeedbackPayload {
  type: 'PROPOSITION'
  target_game: 'debrief'
  mode: 'debrief'
  category: DebriefMode
  title?: string
  content: string
  extra?: string
  extra_data?: string
  sips: number
  min_players: number
  author_alias: null
}
