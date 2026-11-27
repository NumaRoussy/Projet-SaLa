import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  Download,
  MessageSquareShare,
  Pencil,
  RefreshCw,
  SkipForward,
  X,
} from 'lucide-react';
import type { DevCard, DevCardDraft, DevStats } from '../types';
import { validateCardDraft } from '../utils/cardValidator';
import {
  claimNextCard,
  performCardAction,
  sendCardHeartbeat,
  updateCard,
} from '../services/api';
import { CardPreview } from './CardPreview';
import { ValidationBanner } from './ValidationBanner';
import { CardEditorForm } from './CardEditorForm';

interface ReviewViewProps {
  devKey: string;
  sessionId: string;
  devLabel: string;
  gameFilter: string;
  modeFilter: string;
  stats: DevStats;
  wsTick: number;
  onStatsUpdate: (stats: DevStats, activeDevs?: number) => void;
  onGoToSync: () => void;
  onQuickSyncFromProd: () => Promise<void>;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  devKey,
  sessionId,
  devLabel,
  gameFilter,
  modeFilter,
  stats,
  wsTick,
  onStatsUpdate,
  onGoToSync,
  onQuickSyncFromProd,
}) => {
  const [queue, setQueue] = useState<'pending' | 'review_later'>('pending');
  const [card, setCard] = useState<DevCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [editing, setEditing] = useState(false);
  const [reviewLaterPrompt, setReviewLaterPrompt] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const [dragX, setDragX] = useState(0);

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardIdRef = useRef<number | null>(null);
  cardIdRef.current = card?.id ?? null;

  const loadNext = async (skipId?: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await claimNextCard(devKey, {
        session_id: sessionId,
        game: gameFilter,
        mode: modeFilter,
        queue,
        skip_id: skipId,
      });
      setCard(res.card);
      onStatsUpdate(res.stats, res.active_devs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEditing(false);
    setReviewLaterPrompt(false);
    setReviewNote('');
    void loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFilter, modeFilter, queue]);

  // Si la file était vide et qu'un signal WebSocket arrive (autre dev a transféré ou importé), tenter de réclamer
  useEffect(() => {
    if (wsTick > 0 && !cardIdRef.current && !loading) {
      void loadNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsTick]);

  // Heartbeat toutes les 45s pour prolonger le verrou de 180s
  useEffect(() => {
    if (!card) return;
    const timer = window.setInterval(() => {
      void sendCardHeartbeat(devKey, card.id, sessionId).catch(() => {
        // Silencieux : la prochaine action ou claim re-synchronisera
      });
    }, 45000);
    return () => window.clearInterval(timer);
  }, [card, devKey, sessionId]);

  const issues = useMemo(() => {
    if (!card) return [];
    return validateCardDraft({
      game: card.game,
      mode: card.mode,
      category: card.category,
      title: card.title,
      content: card.content,
      extra: card.extra,
      sips: card.sips,
      loss_percent: card.loss_percent,
      min_players: card.min_players,
    });
  }, [card]);

  const handleAction = async (
    action: 'validate' | 'review_later' | 'reject',
    note?: string
  ) => {
    if (!card || acting) return;
    setActing(true);
    setError('');
    try {
      const res = await performCardAction(devKey, card.id, {
        session_id: sessionId,
        action,
        note: note ?? '',
        actor: devLabel,
      });
      onStatsUpdate(res.stats);
      setReviewLaterPrompt(false);
      setReviewNote('');
      setDragX(0);
      await loadNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'action");
    } finally {
      setActing(false);
    }
  };

  const handleSaveEdit = async (draft: DevCardDraft, validateAfter: boolean) => {
    if (!card) return;
    setActing(true);
    try {
      const res = await updateCard(devKey, card.id, {
        ...draft,
        validate: validateAfter,
        session_id: sessionId,
        actor: devLabel,
      });
      onStatsUpdate(res.stats);
      setEditing(false);
      if (validateAfter) {
        await loadNext();
      } else {
        setCard(res.card);
      }
    } finally {
      setActing(false);
    }
  };

  // Swipe horizontal doux façon Tinder (seuil élevé pour ne pas gêner le scroll vertical)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing || reviewLaterPrompt || acting) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 25) {
      return;
    }
    if (Math.abs(dx) > 15) {
      setDragX(Math.max(-130, Math.min(130, dx)));
    }
  };

  const onPointerUp = () => {
    if (!pointerStartRef.current) return;
    pointerStartRef.current = null;
    if (dragX > 95) {
      void handleAction('validate');
    } else if (dragX < -95) {
      void handleAction('reject');
    } else {
      setDragX(0);
    }
  };

  const isFlaggedByPeer =
    card && card.flagged_by && card.flagged_by !== sessionId;

  return (
    <div className="space-y-3 pb-4">
      {/* Sous-barre de file d'attente */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-[#18191d] border border-white/10 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setQueue('pending')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              queue === 'pending'
                ? 'bg-[#252830] text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            À traiter ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setQueue('review_later')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              queue === 'review_later'
                ? 'bg-[#b5892e]/25 text-[#f3c669]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            À revoir ({stats.review_later})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {card && (
            <button
              type="button"
              onClick={() => void loadNext(card.id)}
              disabled={loading || acting}
              title="Passer à une autre carte"
              className="inline-flex items-center gap-1 rounded-lg bg-[#18191d] border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white disabled:opacity-50"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Passer
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadNext()}
            disabled={loading || acting}
            title="Recharger"
            className="inline-flex items-center justify-center rounded-lg bg-[#18191d] border border-white/10 p-1.5 text-gray-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[#9b2c37]/20 border border-[#9b2c37]/60 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading && !card ? (
        <div className="rounded-xl card-surface p-8 text-center text-sm text-gray-400">
          Recherche de la prochaine carte disponible...
        </div>
      ) : !card ? (
        <div className="rounded-xl card-surface p-6 text-center space-y-4">
          {stats.total === 0 ? (
            <>
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">
                  La file de développement est vide
                </p>
                <p className="text-xs text-gray-400">
                  Importez le catalogue actuel de production ou un lot CSV pour commencer la revue à deux.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => void onQuickSyncFromProd()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2e6f56] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Download className="h-4 w-4" />
                  Importer depuis la prod
                </button>
                <button
                  type="button"
                  onClick={onGoToSync}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#252830] border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-200"
                >
                  Ouvrir Sync &amp; CSV
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-base font-semibold text-white">
                {queue === 'review_later'
                  ? 'Aucune carte « À revoir » disponible pour ce filtre'
                  : 'Plus aucune carte à traiter pour ce filtre'}
              </p>
              <p className="text-xs text-gray-400">
                Changez de jeu dans la barre supérieure, consultez le Catalogue ou publiez les {stats.validated} cartes validées.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bandeau transfert depuis l'autre téléphone */}
          {card.flagged_by && (
            <div className="rounded-lg bg-[#b5892e]/20 border border-[#b5892e]/60 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#f3c669]">
                <MessageSquareShare className="h-4 w-4 shrink-0" />
                <span>
                  {isFlaggedByPeer
                    ? "Avis demandé par l'autre dev"
                    : 'Marquée à revoir par votre session'}
                </span>
              </div>
              {card.flag_note && (
                <p className="mt-1 text-gray-200">« {card.flag_note} »</p>
              )}
            </div>
          )}

          {/* Bandeau d'alerte non-bloquant */}
          <ValidationBanner issues={issues} />

          {/* Carte plein écran + indicateur de swipe */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointerStartRef.current = null;
              setDragX(0);
            }}
            style={{
              transform: dragX !== 0 ? `translateX(${dragX}px) rotate(${dragX * 0.03}deg)` : undefined,
              transition: pointerStartRef.current ? 'none' : 'transform 160ms ease',
            }}
            className="relative touch-pan-y select-none"
          >
            {Math.abs(dragX) > 35 && (
              <div
                className={`mb-2 rounded-lg px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider ${
                  dragX > 0
                    ? 'bg-[#2e6f56]/30 border border-[#2e6f56] text-[#8ee3be]'
                    : 'bg-[#9b2c37]/30 border border-[#9b2c37] text-red-200'
                }`}
              >
                {dragX > 0 ? 'Relâcher pour Valider' : 'Relâcher pour Rejeter'}
              </div>
            )}
            <CardPreview
              card={card}
              viewMode={viewMode}
              onToggleViewMode={setViewMode}
            />
          </div>

          {/* Tiroir rapide "À revoir" avec motif optionnel */}
          {reviewLaterPrompt && (
            <div className="rounded-xl card-surface p-3.5 space-y-2.5 border-[#b5892e]/60">
              <div className="text-xs font-semibold text-[#f3c669]">
                Transférer à l&apos;autre téléphone (À revoir)
              </div>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Motif optionnel (ex: vérifier formulation / min joueurs)"
                maxLength={200}
                autoFocus
                className="w-full rounded-lg bg-[#121316] border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#b5892e]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewLaterPrompt(false)}
                  className="flex-1 rounded-lg bg-[#121316] border border-white/10 py-2.5 text-xs font-medium text-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void handleAction('review_later', reviewNote)}
                  className="flex-1 rounded-lg bg-[#b5892e] py-2.5 text-xs font-semibold text-[#121316]"
                >
                  Transférer maintenant
                </button>
              </div>
            </div>
          )}

          {/* 4 gros boutons accessibles au pouce */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleAction('reject')}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#9b2c37]/25 border border-[#9b2c37] py-3 px-1 text-red-100 active:scale-[0.98] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
              <span className="text-[11px] font-semibold">Rejeter</span>
            </button>

            <button
              type="button"
              disabled={acting}
              onClick={() => setReviewLaterPrompt((prev) => !prev)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#b5892e]/20 border border-[#b5892e]/80 py-3 px-1 text-[#f6d58e] active:scale-[0.98] disabled:opacity-50"
            >
              <ArrowRightLeft className="h-5 w-5" />
              <span className="text-[11px] font-semibold">À revoir</span>
            </button>

            <button
              type="button"
              disabled={acting}
              onClick={() => setEditing(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#22252d] border border-white/20 py-3 px-1 text-gray-100 active:scale-[0.98] disabled:opacity-50"
            >
              <Pencil className="h-5 w-5" />
              <span className="text-[11px] font-semibold">Modifier</span>
            </button>

            <button
              type="button"
              disabled={acting}
              onClick={() => void handleAction('validate')}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#2e6f56] border border-[#3c8d6e] py-3 px-1 text-white active:scale-[0.98] disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              <span className="text-[11px] font-semibold">Valider</span>
            </button>
          </div>
        </div>
      )}

      {/* Tiroir d'édition */}
      {editing && card && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
          <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#18191d] border border-white/15 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Modifier la carte #{card.id}
                </h3>
                <p className="text-xs text-gray-400">
                  Verrou maintenu automatiquement pendant votre édition
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg bg-[#121316] border border-white/10 p-2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <CardEditorForm
              initialDraft={{
                game: card.game,
                mode: card.mode,
                category: card.category,
                title: card.title,
                content: card.content,
                extra: card.extra,
                sips: card.sips,
                loss_percent: card.loss_percent,
                min_players: card.min_players,
              }}
              saving={acting}
              onSave={handleSaveEdit}
              onCancel={() => setEditing(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
