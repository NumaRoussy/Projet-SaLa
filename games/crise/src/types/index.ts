export interface CrisisPlayer {
  id: string
  name: string
  avatar?: string
  lossPercent: number // 0.0 to 10.0+
  isEliminated: boolean
  eliminationReason?: string
  eliminationRound?: number
  activeDebuffs: string[]
  sipsDrunk: number
}

export interface Card {
  id: number
  game: string
  mode?: string
  category: string // 'attaque' | 'dilemme' | 'regle'
  title: string
  content: string
  extra: string | null
  sips: number
  loss_percent: number
  min_players: number
}

export type CrisisPhase = 'setup' | 'playing' | 'elimination' | 'victory'

export interface VerifyResult {
  valid: boolean
  device_id?: string
  blackout?: boolean
  reason?: string
}

export type CrisisCategory = 'attaque' | 'dilemme' | 'regle'

export interface FeedbackPayload {
  type: 'PROPOSITION'
  target_game: 'crise'
  mode: 'crise'
  category: CrisisCategory
  title: string
  content: string
  loss_percent: number
  sips: number
  min_players: number
  author_alias: null
}
