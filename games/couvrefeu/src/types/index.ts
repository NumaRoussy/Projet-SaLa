export interface Player {
  id: string
  name: string
}

export type CampType = 'maitrise' | 'tentes'

export type RoleType =
  | 'responsable'
  | 'pico'
  | 'eclaireur'
  | 'cp'
  | 'pharmacie'
  | 'pisseur'
  | 'cuisto'
  | 'ragoteur'
  | 'insomniaque'

export interface RoleDefinition {
  type: RoleType
  name: string
  camp: CampType
  campLabel: string
  icon: string
  shortDesc: string
  fullDesc: string
  actionDesc: string
  wakeOrder: number // ordre de réveil la nuit (-1 si ne se réveille pas)
}

export interface AssignedPlayer {
  id: string
  name: string
  role: RoleType
  isAlive: boolean
  isCampChief: boolean
  isInseparable: boolean
  inseparablePartnerId?: string
}

export type GamePhase =
  | 'setup'
  | 'distribution'
  | 'night'
  | 'morning'
  | 'day_election'
  | 'day_vote'
  | 'gameover'

export type NightStep =
  | 'ragoteur'
  | 'cuisto'
  | 'pisseur'
  | 'maitrise'
  | 'pico'
  | 'pharmacie'

export interface NightState {
  currentStepIndex: number
  inseparables: [string, string] | null
  cuistoProtectedId: string | null
  lastCuistoProtectedId: string | null
  pisseurTargetId: string | null
  pisseurRevealedRole: RoleDefinition | null
  maitriseTargetId: string | null
  picoTargetId: string | null
  pharmacieUsedSave: boolean
  pharmacieUsedKill: boolean
  pharmacieSavedTarget: boolean
  pharmacieKillTargetId: string | null
}

export interface NightReport {
  nightNumber: number
  eliminatedPlayers: AssignedPlayer[]
  cuistoSaved: boolean
  pharmacieSaved: boolean
  details: string[]
}

export type CascadeType = 'cp_shot' | 'chief_succession' | 'inseparable_death'

export interface CascadeEvent {
  type: CascadeType
  sourcePlayerId: string
  sourcePlayerName: string
  targetPlayerId?: string
}

export type VictoryType = 'tentes' | 'maitrise' | 'pico' | 'inseparables'

export interface VictoryResult {
  winner: VictoryType
  title: string
  description: string
}

export interface FeedbackPayload {
  type: 'SUGGESTION'
  target_game: 'couvrefeu'
  content: string
  author_alias: null
}
