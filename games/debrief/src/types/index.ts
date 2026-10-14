export interface Card {
  id?: number
  game_id: string
  category: 'verite' | 'jamais'
  title: string
  content: string
  extra_data?: string
  sips?: number
  display_order?: number
}

export interface Player {
  id: string
  name: string
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
