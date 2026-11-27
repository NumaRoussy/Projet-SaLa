import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Plus, Save } from 'lucide-react';
import type { DevCardDraft } from '../types';
import { EDITOR_GAME_IDS, getGameMeta } from '../config/games';
import { validateCardDraft } from '../utils/cardValidator';
import { ValidationBanner } from './ValidationBanner';

interface CardEditorFormProps {
  initialDraft: DevCardDraft;
  saving?: boolean;
  onSave: (draft: DevCardDraft, validateAfter: boolean) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

function AutoGrowTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  }, [props.value]);

  return <textarea ref={ref} rows={1} {...props} />;
}

export const CardEditorForm: React.FC<CardEditorFormProps> = ({
  initialDraft,
  saving = false,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState<DevCardDraft>(initialDraft);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(initialDraft);
    setError('');
  }, [initialDraft]);

  const meta = getGameMeta(draft.game);
  const issues = useMemo(() => validateCardDraft(draft), [draft]);

  const availableModes = useMemo(() => {
    const base = [...meta.modes];
    if (draft.mode && !base.includes(draft.mode)) {
      base.push(draft.mode);
    }
    return base;
  }, [meta.modes, draft.mode]);

  const availableCategories = useMemo(() => {
    const base = [...meta.categories];
    if (draft.category && !base.includes(draft.category)) {
      base.push(draft.category);
    }
    return base;
  }, [meta.categories, draft.category]);

  const handleGameChange = (newGame: string) => {
    const nextMeta = getGameMeta(newGame);
    setDraft((prev) => ({
      ...prev,
      game: newGame,
      mode: nextMeta.defaultMode,
      category: nextMeta.defaultCategory,
    }));
  };

  const adjustSips = (delta: number) => {
    setDraft((prev) => ({
      ...prev,
      sips: Math.min(10, Math.max(0, prev.sips + delta)),
    }));
  };

  const adjustLoss = (delta: number) => {
    setDraft((prev) => ({
      ...prev,
      loss_percent: Number(
        Math.min(10, Math.max(0, Math.round((prev.loss_percent + delta) * 10) / 10)).toFixed(1)
      ),
    }));
  };

  const adjustMinPlayers = (delta: number) => {
    setDraft((prev) => ({
      ...prev,
      min_players: Math.min(20, Math.max(1, prev.min_players + delta)),
    }));
  };

  const appendPlaceholder = (field: 'content' | 'extra', token: string) => {
    setDraft((prev) => {
      const current = prev[field] || '';
      const sep = current.length > 0 && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
      return { ...prev, [field]: `${current}${sep}${token}` };
    });
  };

  const handleSubmit = async (validateAfter: boolean) => {
    if (!draft.content.trim()) {
      setError('Le champ Contenu est obligatoire.');
      return;
    }
    if (!draft.category.trim()) {
      setError('La catégorie est obligatoire.');
      return;
    }
    setError('');
    try {
      await onSave(draft, validateAfter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    }
  };

  return (
    <div className="space-y-4">
      <ValidationBanner issues={issues} />

      {/* Sélecteurs Jeu / Mode / Catégorie */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Jeu
          </span>
          <select
            value={draft.game}
            onChange={(e) => handleGameChange(e.target.value)}
            className="w-full rounded-lg bg-[#121316] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
          >
            {EDITOR_GAME_IDS.map((gid) => (
              <option key={gid} value={gid}>
                {getGameMeta(gid).label}
              </option>
            ))}
            {!EDITOR_GAME_IDS.includes(draft.game as (typeof EDITOR_GAME_IDS)[number]) && (
              <option value={draft.game}>{draft.game}</option>
            )}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Mode
          </span>
          <select
            value={draft.mode}
            onChange={(e) => setDraft((p) => ({ ...p, mode: e.target.value }))}
            className="w-full rounded-lg bg-[#121316] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
          >
            {availableModes.length === 0 ? (
              <option value="">(aucun)</option>
            ) : (
              availableModes.map((m) => (
                <option key={m || '__empty'} value={m}>
                  {m || '(standard)'}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Catégorie
          </span>
          <select
            value={draft.category}
            onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
            className="w-full rounded-lg bg-[#121316] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
          >
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Champs texte auto-extensibles */}
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Titre
          </span>
          <AutoGrowTextarea
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="Titre court (optionnel pour Chrono)"
            className="w-full resize-none rounded-lg bg-[#121316] border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
        </label>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {draft.game === 'infiltre' ? 'Contenu (Mot Éclaireurs)' : 'Contenu'}
            </span>
            <div className="flex flex-wrap gap-1">
              {['{p1}', '{p2}', '{p3}', '{sips}'].map((tok) => (
                <button
                  key={tok}
                  type="button"
                  onClick={() => appendPlaceholder('content', tok)}
                  className="rounded bg-[#1f2229] border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-gray-300 hover:border-white/30"
                >
                  {tok}
                </button>
              ))}
            </div>
          </div>
          <AutoGrowTextarea
            value={draft.content}
            onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
            placeholder="Texte de la carte..."
            className="w-full resize-none rounded-lg bg-[#121316] border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Extra — {meta.extraLabel}
            </span>
            <button
              type="button"
              onClick={() => appendPlaceholder('extra', '{sips}')}
              className="rounded bg-[#1f2229] border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-gray-300 hover:border-white/30"
            >
              {'{sips}'}
            </button>
          </div>
          <AutoGrowTextarea
            value={draft.extra}
            onChange={(e) => setDraft((p) => ({ ...p, extra: e.target.value }))}
            placeholder={meta.extraPlaceholder}
            className="w-full resize-none rounded-lg bg-[#121316] border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Steppers tactiles - / + */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="rounded-lg bg-[#121316] border border-white/10 p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400">Gorgées</div>
            <div className="text-base font-bold text-white">{draft.sips}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustSips(-1)}
              aria-label="Diminuer les gorgées"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2229] border border-white/10 text-white active:bg-[#2a2e37]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustSips(1)}
              aria-label="Augmenter les gorgées"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2229] border border-white/10 text-white active:bg-[#2a2e37]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={`rounded-lg bg-[#121316] border p-2.5 flex items-center justify-between ${
            draft.game === 'crise' ? 'border-[#9b2c37]/70' : 'border-white/10 opacity-75'
          }`}
        >
          <div>
            <div className="text-[11px] text-gray-400">
              Perte J+S {draft.game === 'crise' ? '(Crise)' : ''}
            </div>
            <div className="text-base font-bold text-white">
              {draft.loss_percent.toFixed(1)}%
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustLoss(-0.5)}
              aria-label="Diminuer la perte J+S"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2229] border border-white/10 text-white active:bg-[#2a2e37]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustLoss(0.5)}
              aria-label="Augmenter la perte J+S"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2229] border border-white/10 text-white active:bg-[#2a2e37]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-[#121316] border border-white/10 p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400">Joueurs min</div>
            <div className="text-base font-bold text-white">{draft.min_players}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustMinPlayers(-1)}
              aria-label="Diminuer les joueurs min"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2229] border border-white/10 text-white active:bg-[#2a2e37]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustMinPlayers(1)}
              aria-label="Augmenter les joueurs min"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2229] border border-white/10 text-white active:bg-[#2a2e37]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[#9b2c37]/20 border border-[#9b2c37]/60 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Actions formulaire */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg bg-[#121316] border border-white/10 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#252830] border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-[#2d313b] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2e6f56] px-4 py-3 text-sm font-semibold text-white hover:bg-[#357f63] disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Enregistrer &amp; Valider
        </button>
      </div>
    </div>
  );
};
