import { useMemo } from 'react'
import type { Card, Player } from '../types'

interface Props {
  card: Card
  player1: Player | null
  player2: Player | null
  roundNumber: number
  totalCards: number
  onLaunchMiniGame?: () => void
  onValidate: (success: boolean) => void
  onNext: () => void
}

export function CardView({
  card,
  player1,
  player2,
  roundNumber,
  onLaunchMiniGame,
  onValidate,
  onNext,
}: Props) {
  const formattedContent = useMemo(() => {
    const p1Name = player1?.name || 'Un chef'
    const p2Name = player2?.name || player1?.name || 'Son binôme'

    return card.content
      .replace(/{p1}/g, p1Name)
      .replace(/{p2}/g, p2Name)
      .replace(/{sips}/g, String(card.sips || 2))
  }, [card, player1, player2])

  const formattedExtra = useMemo(() => {
    if (!card.extra) return null
    const p1Name = player1?.name || 'Un chef'
    const p2Name = player2?.name || player1?.name || 'Son binôme'
    return card.extra
      .replace(/{p1}/g, p1Name)
      .replace(/{p2}/g, p2Name)
      .replace(/{sips}/g, String(card.sips || 2))
  }, [card, player1, player2])

  const isMiniGame = card.category === 'minijeu'
  const isRule = card.category === 'regle'
  const isDuelOrChallenge = card.category === 'carte' && (card.mode === 'actif' || (player1 && player2))

  return (
    <div className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full">
      {/* Category / Mode Badge */}
      <div className="flex items-center justify-between text-xs pt-2">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider text-[11px] bg-[#152233] text-sky-300 border border-[#28527a] uppercase">
            {isMiniGame ? '⚡ Mini-Jeu Tactile' : isRule ? '📜 Règle d\'Intendance' : '🃏 Carte de Veillée'}
          </span>
          {card.mode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#152233] border border-[#28527a] text-slate-300 font-mono">
              Mode {card.mode}
            </span>
          )}
        </div>
        <span className="font-mono text-slate-400 text-xs">Tour #{roundNumber}</span>
      </div>

      {/* Main Card Canvas */}
      <div className="my-auto py-8">
        <div className="relative bg-[#152233] border border-[#28527a] rounded-2xl p-6 sm:p-8 text-center space-y-6">
          {/* Card Title */}
          {card.title && (
            <h2 className="font-display font-black text-xl sm:text-2xl text-[#f3f4f6] tracking-wide">
              {card.title}
            </h2>
          )}

          {/* Duellistes désignés si présents */}
          {player1 && (
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0e1722] border border-[#28527a] rounded-full text-xs font-bold text-sky-200">
                <span>{player1.avatar || '⛺'}</span>
                <span>{player1.name}</span>
              </div>
              {player2 && (
                <>
                  <span className="text-xs font-black text-amber-300">VS</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#261d12] border border-[#785127] rounded-full text-xs font-bold text-amber-200">
                    <span>{player2.avatar || '🪵'}</span>
                    <span>{player2.name}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Card Body */}
          <p className="font-display text-lg sm:text-xl text-[#f3f4f6] font-medium leading-relaxed">
            {formattedContent}
          </p>

          {/* Extra information & sips badge */}
          <div className="flex flex-col items-center gap-2 pt-2">
            {formattedExtra && (
              <span className="text-xs text-sky-300 font-semibold bg-[#0e1722] px-3 py-1 rounded-full border border-[#28527a]">
                💡 {formattedExtra}
              </span>
            )}
            {card.sips > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-[#261d12] border border-[#785127] px-3 py-1 rounded-full">
                <span className="text-sm">🍺</span>
                <span className="font-mono text-xs font-bold text-amber-200">
                  {card.sips} gorgée{card.sips > 1 ? 's' : ''} en jeu
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="pb-4 space-y-2">
        {isMiniGame && onLaunchMiniGame ? (
          <button
            onClick={onLaunchMiniGame}
            className="w-full py-4 bg-[#32689c] hover:bg-[#3c7ab5] border border-[#28527a] text-[#f3f4f6] font-black text-base rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl">⚡</span>
            <span>LANCER LE DUEL TACTILE SUR ÉCRAN</span>
          </button>
        ) : isDuelOrChallenge ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onValidate(true)}
              className="py-3.5 bg-[#122620] hover:bg-[#19362d] border border-[#2d6a4f] text-emerald-200 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>✅</span>
              <span>Réussi</span>
            </button>
            <button
              onClick={() => onValidate(false)}
              className="py-3.5 bg-[#2b171b] hover:bg-[#3a1f24] border border-[#7f2d38] text-red-200 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>❌</span>
              <span>Échoué</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onNext}
            className="w-full py-3.5 bg-[#32689c] hover:bg-[#3c7ab5] border border-[#28527a] text-[#f3f4f6] font-bold text-sm rounded-xl transition-colors"
          >
            Carte Suivante →
          </button>
        )}
      </div>
    </div>
  )
}
