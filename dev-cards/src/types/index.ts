export type GameId =
  | 'vachao'
  | 'crise'
  | 'debrief'
  | 'infiltre'
  | 'chrono'
  | 'couvrefeu'
  | 'rondedenuit';

export type CardStatus = 'PENDING' | 'VALIDATED' | 'REVIEW_LATER' | 'REJECTED';

export interface DevCard {
  id: number;
  game: string;
  mode: string;
  category: string;
  title: string;
  content: string;
  extra: string;
  sips: number;
  loss_percent: number;
  min_players: number;
  status: CardStatus;
  flagged_by: string | null;
  flag_note: string;
  locked_by: string | null;
  locked_at: number | null;
  updated_at: number;
}

export interface DevCardDraft {
  game: string;
  mode: string;
  category: string;
  title: string;
  content: string;
  extra: string;
  sips: number;
  loss_percent: number;
  min_players: number;
}

export interface DevStats {
  pending: number;
  review_later: number;
  validated: number;
  rejected: number;
  total: number;
}

export type ActiveTab = 'review' | 'catalog' | 'create' | 'sync';

export interface ValidationIssue {
  code: string;
  message: string;
}
