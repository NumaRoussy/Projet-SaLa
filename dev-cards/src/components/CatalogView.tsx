import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Pencil,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { CardStatus, DevCard, DevCardDraft, DevStats } from '../types';
import { getGameMeta } from '../config/games';
import { listCards, performCardAction, updateCard } from '../services/api';
import { validateCardDraft } from '../utils/cardValidator';
import { CardPreview } from './CardPreview';
import { ValidationBanner } from './ValidationBanner';
import { CardEditorForm } from './CardEditorForm';

interface CatalogViewProps {
  devKey: string;
  sessionId: string;
  devLabel: string;
  gameFilter: string;
  modeFilter: string;
  stats: DevStats;
  wsTick: number;
  onStatsUpdate: (stats: DevStats, activeDevs?: number) => void;
}

const STATUS_TABS: { id: CardStatus; label: string; countKey: keyof DevStats }[] = [
  { id: 'REVIEW_LATER', label: 'À revoir', countKey: 'review_later' },
  { id: 'VALIDATED', label: 'Validées', countKey: 'validated' },
  { id: 'PENDING', label: 'À traiter', countKey: 'pending' },
  { id: 'REJECTED', label: 'Rejetées', countKey: 'rejected' },
];

export const CatalogView: React.FC<CatalogViewProps> = ({
  devKey,
  sessionId,
  devLabel,
  gameFilter,
  modeFilter,
  stats,
  wsTick,
  onStatsUpdate,
}) => {
  const [statusTab, setStatusTab] = useState<CardStatus>('VALIDATED');
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<DevCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DevCard | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await listCards(devKey, {
        game: gameFilter,
        mode: modeFilter,
        status: statusTab,
        search,
      });
      setCards(res.cards);
      onStatsUpdate(res.stats, res.active_devs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab, gameFilter, modeFilter, search, wsTick]);

  const handleQuickAction = async (
    card: DevCard,
    action: 'validate' | 'reject' | 'restore'
  ) => {
    setBusy(true);
    try {
      const res = await performCardAction(devKey, card.id, {
        session_id: sessionId,
        action,
        actor: devLabel,
      });
      onStatsUpdate(res.stats);
      setSelectedCard(null);
      setEditing(false);
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (draft: DevCardDraft, validateAfter: boolean) => {
    if (!selectedCard) return;
    setBusy(true);
    try {
      const res = await updateCard(devKey, selectedCard.id, {
        ...draft,
        validate: validateAfter,
        session_id: sessionId,
        actor: devLabel,
      });
      onStatsUpdate(res.stats);
      setSelectedCard(res.card);
      setEditing(false);
      await loadList();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Sous-onglets statut */}
      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setStatusTab(t.id)}
            className={`rounded-lg px-2 py-2 text-center border transition-colors ${
              statusTab === t.id
                ? 'bg-[#252830] border-white/25 text-white'
                : 'bg-[#18191d] border-white/10 text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="text-[11px] font-medium truncate">{t.label}</div>
            <div className="text-xs font-bold mt-0.5">{stats[t.countKey]}</div>
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher titre, texte, catégorie..."
          className="w-full rounded-lg bg-[#18191d] border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/25"
        />
      </div>

      {/* Liste */}
      {loading && cards.length === 0 ? (
        <div className="rounded-xl card-surface p-6 text-center text-sm text-gray-400">
          Chargement du catalogue...
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl card-surface p-6 text-center text-sm text-gray-400">
          Aucune carte trouvée dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => {
            const meta = getGameMeta(c.game);
            const issues = validateCardDraft({
              game: c.game,
              mode: c.mode,
              category: c.category,
              title: c.title,
              content: c.content,
              extra: c.extra,
              sips: c.sips,
              loss_percent: c.loss_percent,
              min_players: c.min_players,
            });
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCard(c);
                  setEditing(false);
                }}
                className="w-full text-left rounded-xl card-surface p-3.5 hover:border-white/25 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.accent }}
                    />
                    <span className="text-xs font-semibold text-gray-200 truncate">
                      {meta.shortLabel}
                    </span>
                    <span className="text-[11px] text-gray-400 truncate">
                      {c.mode ? `${c.mode} · ` : ''}
                      {c.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {issues.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#b5892e]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#f3c669]">
                        <AlertTriangle className="h-3 w-3" />
                        {issues.length}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500">#{c.id}</span>
                  </div>
                </div>

                {c.title && (
                  <div className="text-sm font-semibold text-white truncate">
                    {c.title}
                  </div>
                )}
                <p className="text-xs text-gray-300 line-clamp-2">{c.content}</p>
                {c.flag_note && (
                  <div className="text-[11px] text-[#f3c669] truncate">
                    Note : {c.flag_note}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modale d'inspection / édition */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#18191d] border border-white/15 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="text-sm font-semibold text-white">
                {editing ? `Modifier #${selectedCard.id}` : `Carte #${selectedCard.id} (${selectedCard.status})`}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCard(null);
                  setEditing(false);
                }}
                className="rounded-lg bg-[#121316] border border-white/10 p-2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editing ? (
              <CardEditorForm
                initialDraft={{
                  game: selectedCard.game,
                  mode: selectedCard.mode,
                  category: selectedCard.category,
                  title: selectedCard.title,
                  content: selectedCard.content,
                  extra: selectedCard.extra,
                  sips: selectedCard.sips,
                  loss_percent: selectedCard.loss_percent,
                  min_players: selectedCard.min_players,
                }}
                saving={busy}
                onSave={handleSaveEdit}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <ValidationBanner
                  issues={validateCardDraft({
                    game: selectedCard.game,
                    mode: selectedCard.mode,
                    category: selectedCard.category,
                    title: selectedCard.title,
                    content: selectedCard.content,
                    extra: selectedCard.extra,
                    sips: selectedCard.sips,
                    loss_percent: selectedCard.loss_percent,
                    min_players: selectedCard.min_players,
                  })}
                />
                <CardPreview
                  card={selectedCard}
                  viewMode={viewMode}
                  onToggleViewMode={setViewMode}
                />

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {selectedCard.status !== 'PENDING' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleQuickAction(selectedCard, 'restore')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#252830] border border-white/15 py-2.5 text-xs font-medium text-gray-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      À traiter
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleQuickAction(selectedCard, 'reject')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#9b2c37]/25 border border-[#9b2c37] py-2.5 text-xs font-semibold text-red-100"
                    >
                      <X className="h-3.5 w-3.5" />
                      Rejeter
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#252830] border border-white/20 py-2.5 text-xs font-semibold text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>

                  <button
                    type="button"
                    disabled={busy || selectedCard.status === 'VALIDATED'}
                    onClick={() => void handleQuickAction(selectedCard, 'validate')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2e6f56] py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Valider
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
