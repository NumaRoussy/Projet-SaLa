export interface Player {
  id: string
  name: string
}

export interface Card {
  id: number
  game: string
  category: string // incident, meteo, alarme, recompense, piege
  title: string | null
  content: string // Description de l'événement
  extra: string | null // Effet ou règle spéciale
  sips?: number
  min_players?: number
}

export type RoleType = 'guide' | 'veilleur' | 'intendant' | 'saboteur'

export interface RoleInfo {
  type: RoleType
  name: string
  team: 'scouts' | 'saboteurs'
  icon: string
  description: string
}

export interface AssignedPlayer {
  player: Player
  role: RoleType
  eliminated: boolean
}

export type GamePhase = 'setup' | 'assign' | 'night' | 'day' | 'gameover'
