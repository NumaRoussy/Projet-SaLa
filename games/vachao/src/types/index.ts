export interface Player {
  id: string
  name: string
  avatar?: string
  sipsDrunk: number
  sipsGiven: number
  challengesWon: number
  challengesLost: number
}

export interface Card {
  id: number
  game: string
  mode?: string
  category: string
  title: string
  content: string
  extra: string | null
  sips: number
  loss_percent: number
  min_players: number
}

export type GameMode = 'pepere' | 'commando' | 'mixte'
export type GamePhase = 'setup' | 'playing' | 'stats'
export type ActiveMiniGame = 'none' | 'flamme_bleue' | 'sens_du_temps' | 'tir_corde' | 'sauvetage_tente'

export interface MiniGameResult {
  winnerId: string | null
  loserId: string | null
  winnerName: string
  loserName: string
  sips: number
  details: string
}

export interface VerifyResult {
  valid: boolean
  device_id?: string
  blackout?: boolean
  reason?: string
}

export interface FeedbackPayload {
  type: 'PROPOSITION'
  target_game: 'vachao'
  mode: 'passif' | 'actif'
  category: 'carte'
  content: string
  sips: number
  min_players: number
  author_alias: null
}
