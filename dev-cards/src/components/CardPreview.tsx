import React, { useState } from 'react';
import { Code2, Eye, Shuffle, Users, Droplets, TrendingUp } from 'lucide-react';
import type { DevCard } from '../types';
import { getGameMeta, SAMPLE_PLAYER_SETS } from '../config/games';
import { renderPreviewText } from '../utils/cardValidator';

interface CardPreviewProps {
  card: DevCard;
  viewMode: 'preview' | 'raw';
  onToggleViewMode: (mode: 'preview' | 'raw') => void;
}

function parseAbChoices(extra: string): { choiceA: string; choiceB: string } | null {
  if (!extra || !extra.includes('|')) return null;
  const parts = extra.split('|').map((p) => p.trim());
  if (parts.length < 2) return null;
  return {
    choiceA: parts[0].replace(/^A\s*:\s*/i, ''),
    choiceB: parts[1].replace(/^B\s*:\s*/i, ''),
  };
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  card,
  viewMode,
  onToggleViewMode,
}) => {
  const [sampleSetIndex, setSampleSetIndex] = useState(0);
  const meta = getGameMeta(card.game);
  const sampleNames = SAMPLE_PLAYER_SETS[sampleSetIndex % SAMPLE_PLAYER_SETS.length];

  const renderedTitle = renderPreviewText(card.title, sampleNames, card.sips);
  const renderedContent = renderPreviewText(card.content, sampleNames, card.sips);
  const renderedExtra = renderPreviewText(card.extra, sampleNames, card.sips);
  const abChoices = parseAbChoices(renderedExtra);

  const cycleSampleNames = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSampleSetIndex((prev) => (prev + 1) % SAMPLE_PLAYER_SETS.length);
  };

  return (
    <div className="rounded-xl card-surface overflow-hidden">
      {/* En-tête de la carte avec accent jeu & bascule Aperçu/Brut */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10"
        style={{ borderTop: `3px solid ${meta.accent}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: meta.accent }}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-200 truncate">
            {meta.label}
          </span>
          <span className="text-[11px] text-gray-500">#{card.id}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {viewMode === 'preview' && (
            <button
              type="button"
              onClick={cycleSampleNames}
              title="Tirer d'autres prénoms exemples"
              className="flex items-center gap-1 rounded-md bg-[#121316] border border-white/10 px-2 py-1 text-[11px] text-gray-300 hover:border-white/25"
            >
              <Shuffle className="h-3 w-3" />
              <span className="hidden sm:inline">Prénoms</span>
            </button>
          )}
          <div className="inline-flex rounded-md bg-[#121316] border border-white/10 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onToggleViewMode('preview')}
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[#262932] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Eye className="h-3 w-3" />
              Aperçu
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('raw')}
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                viewMode === 'raw'
                  ? 'bg-[#262932] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Code2 className="h-3 w-3" />
              Brut
            </button>
          </div>
        </div>
      </div>

      {/* Corps : Aperçu fidèle au jeu OU données brutes */}
      {viewMode === 'preview' ? (
        <div className="p-4 sm:p-5 space-y-4">
          {card.game === 'infiltre' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="uppercase tracking-wide font-medium">
                  Paire de mots — {card.mode || 'scout'}
                </span>
                <span className="rounded bg-[#121316] border border-white/10 px-2 py-0.5 text-gray-300">
                  {card.category}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-lg bg-[#121316] p-3.5 text-center border"
                  style={{ borderColor: '#2e6f56' }}
                >
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
                    Mot Éclaireurs
                  </div>
                  <div className="text-lg font-bold text-white break-words">
                    {renderedContent || '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-[#121316] p-3.5 text-center border border-[#9b2c37]/70">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">
                    Mot Infiltré
                  </div>
                  <div className="text-lg font-bold text-white break-words">
                    {renderedExtra || '—'}
                  </div>
                </div>
              </div>
            </div>
          ) : card.game === 'chrono' ? (
            <div className="py-5 px-3 rounded-lg bg-[#121316] border border-white/10 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-gray-300 bg-[#18191d] border border-white/10">
                {card.mode || 'scout'} · {card.category}
              </div>
              <div className="text-2xl font-bold tracking-tight text-white break-words pt-1">
                {renderedContent}
              </div>
              {renderedExtra && (
                <div className="text-xs text-gray-400">{renderedExtra}</div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Badge haut de carte selon le jeu */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: meta.accent }}
                >
                  {card.category}
                </span>

                {card.game === 'crise' && card.loss_percent > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#9b2c37]/20 border border-[#9b2c37]/60 px-2 py-0.5 text-xs font-semibold text-red-200">
                    <TrendingUp className="h-3 w-3" />+{card.loss_percent}% J+S
                  </span>
                )}

                {card.game !== 'crise' && card.sips > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#121316] border border-white/10 px-2 py-0.5 text-xs font-medium text-gray-200">
                    <Droplets className="h-3 w-3 text-[#74c69d]" />
                    {card.sips} {card.sips === 1 ? 'gorgée' : 'gorgées'}
                  </span>
                )}
              </div>

              {renderedTitle && (
                <h2 className="text-lg font-semibold leading-snug text-white">
                  {renderedTitle}
                </h2>
              )}

              <p className="text-[15px] leading-relaxed text-gray-100 whitespace-pre-wrap">
                {renderedContent}
              </p>

              {abChoices ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div
                    className="rounded-lg bg-[#121316] border px-3 py-2.5 text-sm text-gray-100"
                    style={{ borderColor: meta.accent }}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                      Option A
                    </span>
                    {abChoices.choiceA}
                  </div>
                  <div
                    className="rounded-lg bg-[#121316] border px-3 py-2.5 text-sm text-gray-100"
                    style={{ borderColor: meta.accent }}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                      Option B
                    </span>
                    {abChoices.choiceB}
                  </div>
                </div>
              ) : (
                renderedExtra && (
                  <div className="rounded-lg bg-[#121316] border border-white/10 px-3 py-2 text-xs text-gray-300">
                    {renderedExtra}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        /* Mode Brut */
        <div className="p-4 space-y-2.5 text-xs font-mono">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-[#121316] border border-white/10 p-2">
              <div className="text-[10px] text-gray-500 uppercase">game / mode</div>
              <div className="text-gray-200 mt-0.5">
                {card.game} / {card.mode || '""'}
              </div>
            </div>
            <div className="rounded bg-[#121316] border border-white/10 p-2">
              <div className="text-[10px] text-gray-500 uppercase">category</div>
              <div className="text-gray-200 mt-0.5">{card.category}</div>
            </div>
          </div>
          <div className="rounded bg-[#121316] border border-white/10 p-2.5">
            <div className="text-[10px] text-gray-500 uppercase">title</div>
            <div className="text-gray-100 mt-0.5 whitespace-pre-wrap">
              {card.title || <span className="text-gray-600">(vide)</span>}
            </div>
          </div>
          <div className="rounded bg-[#121316] border border-white/10 p-2.5">
            <div className="text-[10px] text-gray-500 uppercase">content</div>
            <div className="text-white mt-0.5 whitespace-pre-wrap">{card.content}</div>
          </div>
          <div className="rounded bg-[#121316] border border-white/10 p-2.5">
            <div className="text-[10px] text-gray-500 uppercase">extra</div>
            <div className="text-gray-200 mt-0.5 whitespace-pre-wrap">
              {card.extra || <span className="text-gray-600">(vide)</span>}
            </div>
          </div>
        </div>
      )}

      {/* Pied de carte : pilules compactes */}
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2.5 bg-[#141519] border-t border-white/10 text-[11px] text-gray-300">
        <span className="rounded bg-[#1f2229] border border-white/10 px-2 py-0.5">
          Jeu : <strong className="text-white">{card.game}</strong>
        </span>
        {card.mode && (
          <span className="rounded bg-[#1f2229] border border-white/10 px-2 py-0.5">
            Mode : <strong className="text-white">{card.mode}</strong>
          </span>
        )}
        <span className="rounded bg-[#1f2229] border border-white/10 px-2 py-0.5">
          Catégorie : <strong className="text-white">{card.category}</strong>
        </span>
        <span className="rounded bg-[#1f2229] border border-white/10 px-2 py-0.5">
          Gorgées : <strong className="text-white">{card.sips}</strong>
        </span>
        <span className="rounded bg-[#1f2229] border border-white/10 px-2 py-0.5">
          Perte : <strong className="text-white">{card.loss_percent}%</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-[#1f2229] border border-white/10 px-2 py-0.5">
          <Users className="h-3 w-3 text-gray-400" />
          Min : <strong className="text-white">{card.min_players} joueurs</strong>
        </span>
      </div>
    </div>
  );
};
