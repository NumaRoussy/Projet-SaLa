export type DebriefMode = 'jamais' | 'prefere' | 'mixte'

export interface Card {
  id?: number
  game?: string
  game_id?: string
  mode?: string
  category: string // 'jamais' | 'prefere' | 'verite' | 'dilemme' | 'carte'
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
  type: 'PROPOSITION' | 'CONTACT_LEGAL'
  target_game?: string
  category?: string
  title?: string
  content: string
  extra_data?: string
  author_alias?: string
  contact_email?: string
}
