export interface GameMeta {
  id: string;
  label: string;
  shortLabel: string;
  accent: string;
  modes: string[];
  categories: string[];
  extraLabel: string;
  extraPlaceholder: string;
  defaultMode: string;
  defaultCategory: string;
}

export const GAMES_META: Record<string, GameMeta> = {
  vachao: {
    id: 'vachao',
    label: 'Vachao',
    shortLabel: 'Vachao',
    accent: '#2d6394',
    modes: ['passif', 'actif'],
    categories: ['carte', 'regle', 'minijeu'],
    extraLabel: 'Sous-texte / Règle ou durée',
    extraPlaceholder: 'Ex: Le désigné boit {sips} gorgées / durée:3 tours',
    defaultMode: 'passif',
    defaultCategory: 'carte',
  },
  crise: {
    id: 'crise',
    label: 'Cellule de crise',
    shortLabel: 'Crise',
    accent: '#9b2c37',
    modes: ['crise'],
    categories: ['attaque', 'dilemme', 'regle'],
    extraLabel: 'Badge / Effet',
    extraPlaceholder: 'Ex: Cible désignée / Vote éliminatoire / Malus permanent',
    defaultMode: 'crise',
    defaultCategory: 'attaque',
  },
  debrief: {
    id: 'debrief',
    label: 'Débrief',
    shortLabel: 'Débrief',
    accent: '#b5892e',
    modes: ['debrief'],
    categories: ['dossiers', 'jamais', 'prefere'],
    extraLabel: 'Choix A | Choix B ou sanction',
    extraPlaceholder: 'Ex: A: Choix 1 | B: Choix 2  ou  Tu bois {sips} gorgées.',
    defaultMode: 'debrief',
    defaultCategory: 'dossiers',
  },
  infiltre: {
    id: 'infiltre',
    label: "L'Infiltré",
    shortLabel: 'Infiltré',
    accent: '#2e6f56',
    modes: ['scout', 'moldu'],
    categories: [
      'Campement',
      'Matériel',
      'Tradition',
      'Hiver',
      'Cuisine',
      'Objets',
      'Nature',
      'Animaux',
    ],
    extraLabel: "Mot de l'Infiltré",
    extraPlaceholder: 'Un mot court proche du mot Éclaireurs (ex: Spatz)',
    defaultMode: 'scout',
    defaultCategory: 'Campement',
  },
  chrono: {
    id: 'chrono',
    label: 'Chrono',
    shortLabel: 'Chrono',
    accent: '#9c6631',
    modes: ['scout', 'moldu'],
    categories: [
      'campement',
      'materiel',
      'tradition',
      'hiver',
      'animal',
      'objet',
      'loisirs',
      'nature',
    ],
    extraLabel: 'Précision / Indice optionnel',
    extraPlaceholder: 'Laisser vide ou ajouter une brève note',
    defaultMode: 'scout',
    defaultCategory: 'campement',
  },
  couvrefeu: {
    id: 'couvrefeu',
    label: 'Couvre-feu',
    shortLabel: 'Couvre-feu',
    accent: '#3b5998',
    modes: ['classique', 'rapide', 'scenario'],
    categories: ['role', 'evenement', 'suggestion'],
    extraLabel: 'Pouvoir / Effet de nuit',
    extraPlaceholder: 'Détail du rôle ou condition spéciale',
    defaultMode: 'classique',
    defaultCategory: 'role',
  },
  rondedenuit: {
    id: 'rondedenuit',
    label: 'Ronde de nuit',
    shortLabel: 'Ronde',
    accent: '#4b5563',
    modes: [''],
    categories: ['defi'],
    extraLabel: 'Sous-texte',
    extraPlaceholder: 'Défi discrétion',
    defaultMode: '',
    defaultCategory: 'defi',
  },
};

export const FILTER_GAMES: { id: string; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'vachao', label: 'Vachao' },
  { id: 'crise', label: 'Cellule de crise' },
  { id: 'debrief', label: 'Débrief' },
  { id: 'infiltre', label: "L'Infiltré" },
  { id: 'chrono', label: 'Chrono' },
  { id: 'couvrefeu', label: 'Couvre-feu' },
];

export const EDITOR_GAME_IDS = [
  'vachao',
  'crise',
  'debrief',
  'infiltre',
  'chrono',
  'couvrefeu',
] as const;

export const SAMPLE_PLAYER_SETS: string[][] = [
  ['Léo', 'Camille', 'Théo', 'Chloé'],
  ['Lucas', 'Emma', 'Noah', 'Léa'],
  ['Mathis', 'Manon', 'Hugo', 'Inès'],
  ['Arthur', 'Zoé', 'Jules', 'Clara'],
];

export function getGameMeta(gameId: string): GameMeta {
  return (
    GAMES_META[gameId] || {
      id: gameId,
      label: gameId,
      shortLabel: gameId,
      accent: '#4b5563',
      modes: [],
      categories: ['carte'],
      extraLabel: 'Extra',
      extraPlaceholder: '',
      defaultMode: '',
      defaultCategory: 'carte',
    }
  );
}
