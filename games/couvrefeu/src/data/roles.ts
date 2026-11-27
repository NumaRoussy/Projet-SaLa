import type { RoleType, RoleDefinition } from '../types'

export const ROLES_DATA: Record<RoleType, RoleDefinition> = {
  responsable: {
    type: 'responsable',
    name: 'Responsable',
    camp: 'maitrise',
    campLabel: 'Camp de la Maîtrise',
    icon: '🔦',
    shortDesc: 'Chef qui traque les scouts hors du lit la nuit.',
    fullDesc:
      'Tu fais partie de la Maîtrise du camp ! Chaque nuit, tu te réveilles en silence avec tes collègues Responsables (et le Pico) pour désigner un scout à coincer et éliminer. En journée, tu participes aux débats en dissimulant ton rôle et en détournant les soupçons sur d\'autres éclaireurs.',
    actionDesc:
      'La nuit : réveille-toi uniquement quand le meneur appelle la Maîtrise. Désigne discrètement une cible avec tes collègues. Le jour : vote pour éliminer les Éclaireurs.',
    wakeOrder: 4,
  },
  pico: {
    type: 'pico',
    name: 'Le Pico',
    camp: 'maitrise',
    campLabel: 'Maîtrise / Cavalier Seul',
    icon: '🗡️',
    shortDesc: 'Pionnier rebelle qui feint d\'aider les chefs pour gagner seul.',
    fullDesc:
      'Le Pionnier / Cordée (Pico) joue double jeu ! Il se réveille chaque nuit avec la Maîtrise et vote avec elle pour se fondre dans le groupe. Mais son but ultime est d\'être l\'unique survivant du camp. Dès la Nuit 2 (une nuit sur deux), le Pico se réveille seul et a le pouvoir d\'éliminer un Responsable en douce !',
    actionDesc:
      'Avec la Maîtrise : désigne une cible avec les chefs. Seul (nuits 2, 4, 6...) : tu peux poignarder un Responsable dans son sommeil. Pour gagner : sois le seul survivant.',
    wakeOrder: 5,
  },
  eclaireur: {
    type: 'eclaireur',
    name: 'Éclaireur',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '⛺',
    shortDesc: 'Scout loyal dormant sous la tente sans pouvoir nocturne.',
    fullDesc:
      'Tu es un scout loyal qui dort paisiblement sous sa tente Berlingot. Tu n\'as aucun pouvoir nocturne : la nuit, garde les yeux fermés. Ton rôle est capital en journée : observe les comportements, recoupe les déclarations et vote au rassemblement pour démasquer les membres de la Maîtrise.',
    actionDesc:
      'La nuit : dors profondément. Le jour : débat avec tes camarades de patrouille et vote pour condamner les Responsables suspects.',
    wakeOrder: -1,
  },
  cp: {
    type: 'cp',
    name: 'Chef de Patrouille (CP)',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '🎖️',
    shortDesc: 'Guide respecté : tire une dernière fusée à sa mort (Chasseur).',
    fullDesc:
      'Tu es le Chef de Patrouille (CP), respecté de tous. Ta détermination est sans faille. Si jamais tu es éliminé (que ce soit au vote du rassemblement ou par une attaque nocturne), dans ton dernier souffle, tu tires une fusée de détresse et élimines sur-le-champ le joueur de ton choix !',
    actionDesc:
      'Si tu viens à mourir (jour ou nuit) : désigne immédiatement un joueur sur l\'écran du meneur pour qu\'il meure avec toi sur-le-champ.',
    wakeOrder: -1,
  },
  pharmacie: {
    type: 'pharmacie',
    name: 'Resp. Pharmacie',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '🩹',
    shortDesc: 'Gardien de la trousse de secours avec 2 soins uniques (Sorcière).',
    fullDesc:
      'Tu es le Responsable Pharmacie du camp. Tu disposes de deux remèdes à usage unique dans toute la partie : l\'Arnica (qui sauve la victime ciblée par la Maîtrise cette nuit) et l\'Huile de foie de morue (qui élimine instantanément le joueur de ton choix la nuit).',
    actionDesc:
      'La nuit : le meneur t\'annonce qui est en danger. Tu peux utiliser l\'Arnica pour le sauver, ou le Foie de morue pour abattre un suspect (1 seule utilisation par potion pour toute la partie).',
    wakeOrder: 6,
  },
  pisseur: {
    type: 'pisseur',
    name: 'Le Pisseur',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '🚰',
    shortDesc: 'En route pour les feuillées, ausculte une tente (Voyante).',
    fullDesc:
      'Tu as constamment envie de faire pipi au milieu de la nuit ! En te faufilant vers les feuillées à pas feutrés, tu jettes un coup d\'œil indiscret sous la toile d\'une tente : chaque nuit, le meneur te révèle secrètement le rôle exact d\'un joueur de ton choix.',
    actionDesc:
      'Chaque nuit : réveille-toi à l\'appel du meneur et pointe discrètement un joueur du doigt. Le meneur te montrera discrètement son identité.',
    wakeOrder: 3,
  },
  cuisto: {
    type: 'cuisto',
    name: 'Le Cuisto',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '🍲',
    shortDesc: 'Prépare un casse-croûte protecteur chaque nuit (Salvateur).',
    fullDesc:
      'Maître des fourneaux et des collations réconfortantes ! Chaque nuit, tu choisis un joueur à protéger contre les attaques de la Maîtrise. Règle absolue : tu ne peux JAMAIS protéger le même joueur deux nuits consécutives. Tu peux te protéger toi-même si tu ne l\'étais pas la veille.',
    actionDesc:
      'Chaque nuit : choisis un joueur à protéger. Si la Maîtrise l\'attaque cette même nuit, son assaut échouera totalement.',
    wakeOrder: 2,
  },
  ragoteur: {
    type: 'ragoteur',
    name: 'Le Ragoteur',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '💘',
    shortDesc: 'Nuit 1 uniquement : lie deux Inséparables pour la vie (Cupidon).',
    fullDesc:
      'Le colporteur des histoires de cœur du camp ! La première nuit UNIQUEMENT, tu désignes deux Inséparables. Leurs destins seront intimement liés : si l\'un vient à mourir, l\'autre mourra instantanément de chagrin dans la seconde ! Si les amoureux sont de camps opposés, leur but devient de survivre ensemble en éliminant tous les autres.',
    actionDesc:
      'Nuit 1 seulement : réveille-toi et désigne deux Inséparables. Le meneur les touchera sur l\'épaule pour qu\'ils se reconnaissent.',
    wakeOrder: 1,
  },
  insomniaque: {
    type: 'insomniaque',
    name: 'L\'Insomniaque',
    camp: 'tentes',
    campLabel: 'Camp des éclaireurs',
    icon: '🦉',
    shortDesc: 'Sommeil agité : écoute les pas nocturnes autour du camp.',
    fullDesc:
      'Tu as le sommeil fragile et passes tes nuits à te retourner dans ton sac de couchage. À l\'affût du moindre craquement de branche et du grincement des piquets de tente, tu aides les Éclaireurs à orienter les débats lors du rassemblement matinal.',
    actionDesc:
      'Camp des éclaireurs : partage tes intuitions et déductions le jour pour démasquer les Responsables.',
    wakeOrder: -1,
  },
}

/**
 * Grille d'équilibrage officielle (8 à 20 joueurs) :
 * 8: 2 Resp, 1 Pisseur, 1 Pharmacie, 1 CP, 3 Éclaireurs
 * 9: + 1 Ragoteur (3 Éclaireurs)
 * 10: + 1 Cuisto (3 Éclaireurs)
 * 11: + 1 Insomniaque (3 Éclaireurs)
 * 12: 3 Resp, 1 Pisseur, 1 Pharmacie, 1 CP, 1 Cuisto, 1 Ragoteur, 1 Insomniaque, 3 Éclaireurs
 * 13 à 14: Identique à 12, avec 4 à 5 Éclaireurs
 * 15 à 17: 3 Resp, 1 Pico, 1 Pisseur, 1 Pharmacie, 1 CP, 1 Cuisto, 1 Ragoteur, 1 Insomniaque, 5 à 7 Éclaireurs
 * 18 à 20: 4 Resp, 1 Pico, 1 Pisseur, 1 Pharmacie, 1 CP, 1 Cuisto, 1 Ragoteur, 1 Insomniaque, 7 à 9 Éclaireurs
 */
export function getRoleComposition(playerCount: number): Record<RoleType, number> {
  if (playerCount <= 8) {
    return {
      responsable: 2,
      pisseur: 1,
      pharmacie: 1,
      cp: 1,
      ragoteur: 0,
      cuisto: 0,
      insomniaque: 0,
      pico: 0,
      eclaireur: Math.max(0, playerCount - 5),
    }
  }

  if (playerCount === 9) {
    return {
      responsable: 2,
      pisseur: 1,
      pharmacie: 1,
      cp: 1,
      ragoteur: 1,
      cuisto: 0,
      insomniaque: 0,
      pico: 0,
      eclaireur: 3,
    }
  }

  if (playerCount === 10) {
    return {
      responsable: 2,
      pisseur: 1,
      pharmacie: 1,
      cp: 1,
      ragoteur: 1,
      cuisto: 1,
      insomniaque: 0,
      pico: 0,
      eclaireur: 3,
    }
  }

  if (playerCount === 11) {
    return {
      responsable: 2,
      pisseur: 1,
      pharmacie: 1,
      cp: 1,
      ragoteur: 1,
      cuisto: 1,
      insomniaque: 1,
      pico: 0,
      eclaireur: 3,
    }
  }

  if (playerCount >= 12 && playerCount <= 14) {
    return {
      responsable: 3,
      pisseur: 1,
      pharmacie: 1,
      cp: 1,
      cuisto: 1,
      ragoteur: 1,
      insomniaque: 1,
      pico: 0,
      eclaireur: playerCount - 9, // 12 -> 3, 13 -> 4, 14 -> 5
    }
  }

  if (playerCount >= 15 && playerCount <= 17) {
    return {
      responsable: 3,
      pico: 1,
      pisseur: 1,
      pharmacie: 1,
      cp: 1,
      cuisto: 1,
      ragoteur: 1,
      insomniaque: 1,
      eclaireur: playerCount - 10, // 15 -> 5, 16 -> 6, 17 -> 7
    }
  }

  // 18 à 20 (et +)
  return {
    responsable: 4,
    pico: 1,
    pisseur: 1,
    pharmacie: 1,
    cp: 1,
    cuisto: 1,
    ragoteur: 1,
    insomniaque: 1,
    eclaireur: Math.max(0, playerCount - 11), // 18 -> 7, 19 -> 8, 20 -> 9
  }
}

/**
 * Formate la composition en chaîne lisible pour le meneur
 * ex : "3 Responsables, 1 Pisseur, 1 Resp. Pharmacie, 1 CP, 1 Cuisto, 1 Ragoteur, 1 Insomniaque, 3 Éclaireurs"
 */
export function formatCompositionSummary(comp: Record<RoleType, number>): string[] {
  const parts: string[] = []
  const order: RoleType[] = [
    'responsable',
    'pico',
    'cp',
    'pharmacie',
    'pisseur',
    'cuisto',
    'ragoteur',
    'insomniaque',
    'eclaireur',
  ]

  for (const role of order) {
    const count = comp[role]
    if (count > 0) {
      const def = ROLES_DATA[role]
      const label = count > 1 ? `${def.name}s` : def.name
      parts.push(`${count} ${label}`)
    }
  }

  return parts
}
