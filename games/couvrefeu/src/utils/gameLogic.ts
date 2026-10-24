import type {
  Player,
  AssignedPlayer,
  RoleType,
  NightStep,
  VictoryResult,
  CascadeEvent,
  NightReport,
} from '../types'
import { ROLES_DATA, getRoleComposition } from '../data/roles'

/**
 * Mélange aléatoire (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Distribue les rôles selon la grille d'équilibrage
 */
export function assignRoles(players: Player[]): AssignedPlayer[] {
  const comp = getRoleComposition(players.length)
  const rolePool: RoleType[] = []

  for (const [role, count] of Object.entries(comp) as [RoleType, number][]) {
    for (let i = 0; i < count; i++) {
      rolePool.push(role)
    }
  }

  // Si pour une raison quelconque la taille diffère, compléter avec des éclaireurs
  while (rolePool.length < players.length) {
    rolePool.push('eclaireur')
  }

  const shuffledRoles = shuffle(rolePool)

  return players.map((p, idx) => ({
    id: p.id,
    name: p.name,
    role: shuffledRoles[idx],
    isAlive: true,
    isCampChief: false,
    isInseparable: false,
    inseparablePartnerId: undefined,
  }))
}

/**
 * Détermine la liste ordonnée des étapes de la nuit
 */
export function getNightSteps(
  nightNumber: number,
  players: AssignedPlayer[],
  pharmacieState: { usedSave: boolean; usedKill: boolean }
): NightStep[] {
  const steps: NightStep[] = []

  // 1. Nuit 1 uniquement - Le Ragoteur
  if (nightNumber === 1) {
    const ragoteurAlive = players.some(p => p.isAlive && p.role === 'ragoteur')
    if (ragoteurAlive) {
      steps.push('ragoteur')
    }
  }

  // 2. Le Cuisto (chaque nuit si vivant)
  const cuistoAlive = players.some(p => p.isAlive && p.role === 'cuisto')
  if (cuistoAlive) {
    steps.push('cuisto')
  }

  // 3. Le Pisseur (chaque nuit si vivant)
  const pisseurAlive = players.some(p => p.isAlive && p.role === 'pisseur')
  if (pisseurAlive) {
    steps.push('pisseur')
  }

  // 4. La Maîtrise (Responsables + Pico)
  const maitriseAlive = players.some(
    p => p.isAlive && (p.role === 'responsable' || p.role === 'pico')
  )
  if (maitriseAlive) {
    steps.push('maitrise')
  }

  // 5. Le Pico (dès la nuit 2, une nuit sur deux : 2, 4, 6...)
  const picoAlive = players.some(p => p.isAlive && p.role === 'pico')
  if (picoAlive && nightNumber >= 2 && nightNumber % 2 === 0) {
    steps.push('pico')
  }

  // 6. Resp. Pharmacie (si en vie et possède au moins 1 potion)
  const pharmacieAlive = players.some(p => p.isAlive && p.role === 'pharmacie')
  const hasPotions = !pharmacieState.usedSave || !pharmacieState.usedKill
  if (pharmacieAlive && hasPotions) {
    steps.push('pharmacie')
  }

  return steps
}

/**
 * Résolution des attaques et protections de la nuit
 */
export function resolveNight(
  nightNumber: number,
  players: AssignedPlayer[],
  actions: {
    cuistoProtectedId: string | null
    maitriseTargetId: string | null
    picoTargetId: string | null
    pharmacieSavedTarget: boolean
    pharmacieKillTargetId: string | null
  }
): NightReport {
  const details: string[] = []
  const killedPlayerIds = new Set<string>()
  let cuistoSaved = false
  let pharmacieSaved = false

  // 1. Attaque de la Maîtrise
  if (actions.maitriseTargetId) {
    const target = players.find(p => p.id === actions.maitriseTargetId)
    if (target) {
      if (actions.cuistoProtectedId === target.id) {
        cuistoSaved = true
        details.push(
          `La collation du Cuisto a protégé ${target.name} de la ronde de la Maîtrise.`
        )
      } else if (actions.pharmacieSavedTarget) {
        pharmacieSaved = true
        details.push(
          `Le Resp. Pharmacie a soigné ${target.name} à l'Arnica in extremis.`
        )
      } else {
        killedPlayerIds.add(target.id)
        details.push(`${target.name} a été coincé hors de son lit par la Maîtrise.`)
      }
    }
  }

  // 2. Attaque furtive du Pico (contre un Responsable)
  if (actions.picoTargetId) {
    const picoVictim = players.find(p => p.id === actions.picoTargetId)
    if (picoVictim) {
      killedPlayerIds.add(picoVictim.id)
      details.push(
        `${picoVictim.name} a été éliminé dans son sommeil par une ombre solitaire.`
      )
    }
  }

  // 3. Poison du Resp. Pharmacie (Huile de foie de morue)
  if (actions.pharmacieKillTargetId) {
    const killVictim = players.find(p => p.id === actions.pharmacieKillTargetId)
    if (killVictim) {
      killedPlayerIds.add(killVictim.id)
      details.push(
        `${killVictim.name} a succombé à une surdose d'huile de foie de morue.`
      )
    }
  }

  const eliminatedPlayers = players.filter(p => killedPlayerIds.has(p.id))

  return {
    nightNumber,
    eliminatedPlayers,
    cuistoSaved,
    pharmacieSaved,
    details,
  }
}

/**
 * Vérification des conditions de victoire
 */
export function checkVictoryCondition(players: AssignedPlayer[]): VictoryResult | null {
  const alivePlayers = players.filter(p => p.isAlive)
  const totalAlive = alivePlayers.length

  if (totalAlive === 0) {
    return {
      winner: 'tentes',
      title: 'Égalité tragique',
      description: 'Aucun scout n\'a survécu au campement.',
    }
  }

  // 1. Victoire du Pico (unique survivant)
  if (totalAlive === 1 && alivePlayers[0].role === 'pico') {
    return {
      winner: 'pico',
      title: 'Victoire Solitaire du Pico !',
      description: `${alivePlayers[0].name} a éliminé la Maîtrise et les Éclaireurs. Il règne en maître absolu sur le campement !`,
    }
  }

  // 2. Victoire des Inséparables mixtes (s'ils sont les deux derniers survivants)
  if (totalAlive === 2) {
    const [p1, p2] = alivePlayers
    if (p1.isInseparable && p2.isInseparable && p1.inseparablePartnerId === p2.id) {
      const camp1 = ROLES_DATA[p1.role].camp
      const camp2 = ROLES_DATA[p2.role].camp
      if (camp1 !== camp2) {
        return {
          winner: 'inseparables',
          title: 'Victoire des Inséparables !',
          description: `L'amour interdit entre ${p1.name} (${ROLES_DATA[p1.role].name}) et ${p2.name} (${ROLES_DATA[p2.role].name}) a triomphé contre vents et marées !`,
        }
      }
    }
  }

  const aliveResponsables = alivePlayers.filter(p => p.role === 'responsable')
  const alivePico = alivePlayers.filter(p => p.role === 'pico')
  const totalMaitrise = aliveResponsables.length + alivePico.length
  const totalTentes = totalAlive - totalMaitrise

  // 3. Victoire des Éclaireurs (Tentes) : Tous les Responsables et le Pico sont éliminés
  if (totalMaitrise === 0) {
    return {
      winner: 'tentes',
      title: 'Victoire des Éclaireurs (Tentes) !',
      description:
        'Toute la Maîtrise et les saboteurs ont été démasqués et chassés du campement ! Les patrouilles peuvent enfin dormir sur leurs deux oreilles.',
    }
  }

  // 4. Victoire de la Maîtrise :
  // Les Responsables atteignent la parité numérique avec les survivants (sans opposition de Pico ou d'Inséparables mixtes)
  if (aliveResponsables.length > 0 && alivePico.length === 0) {
    // Vérifier si un couple mixte bloque la parité
    const hasActiveMixedCouple = alivePlayers.some(p => {
      if (!p.isInseparable || !p.inseparablePartnerId) return false
      const partner = alivePlayers.find(o => o.id === p.inseparablePartnerId)
      if (!partner) return false
      return ROLES_DATA[p.role].camp !== ROLES_DATA[partner.role].camp
    })

    // Parité : Responsables >= autres survivants (soit >= totalAlive / 2)
    if (!hasActiveMixedCouple && aliveResponsables.length >= totalTentes) {
      return {
        winner: 'maitrise',
        title: 'Victoire de la Maîtrise !',
        description:
          'Les Responsables ont pris le contrôle total du rassemblement. Le couvre-feu est imposé de force à tous les carrés Berlingot !',
      }
    }
  }

  return null
}

/**
 * Détecte les effets en cascade suite à une ou plusieurs éliminations
 */
export function detectCascadeEvents(
  eliminatedPlayers: AssignedPlayer[],
  allPlayers: AssignedPlayer[],
  options?: { includeChiefSuccession?: boolean }
): CascadeEvent[] {
  const cascades: CascadeEvent[] = []
  const includeChief = options?.includeChiefSuccession ?? true

  for (const victim of eliminatedPlayers) {
    // 1. Mort d'un Inséparable : le partenaire meurt automatiquement de chagrin
    if (victim.isInseparable && victim.inseparablePartnerId) {
      const partner = allPlayers.find(
        p => p.id === victim.inseparablePartnerId && p.isAlive
      )
      if (partner) {
        cascades.push({
          type: 'inseparable_death',
          sourcePlayerId: victim.id,
          sourcePlayerName: victim.name,
          targetPlayerId: partner.id,
        })
      }
    }

    // 2. Mort du Chef de Patrouille : tir collatéral de fusée
    if (victim.role === 'cp') {
      cascades.push({
        type: 'cp_shot',
        sourcePlayerId: victim.id,
        sourcePlayerName: victim.name,
      })
    }

    // 3. Mort du Chef de Camp : transmission du titre
    if (victim.isCampChief && includeChief) {
      cascades.push({
        type: 'chief_succession',
        sourcePlayerId: victim.id,
        sourcePlayerName: victim.name,
      })
    }
  }

  return cascades
}
