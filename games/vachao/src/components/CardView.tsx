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
  // Remplacement dynamique des placeholders
  const formattedContent = useMemo(() => {
    const p1Name = player1?.name || 'Un chef'
    const p2Name = player2?.name || player1?.name || 'Son binôme'

    let displayText = card.content
      .replace(/{p1}/g, p1Name)
      .replace(/{p2}/g, p2Name)
      .replace(/{sips}/g, String(card.sips || 2))
    return displayText
  }, [card, player1, player2])

  const formattedExtra = useMemo(() => {
    if (!card.extra) return null
    const p1Name = player1?.name || 'Un chef'
    const p2Name = player2?.name || player1?.name || 'Son binôme'
    let extra = card.extra
      .replace(/{p1}/g, p1Name)
      .replace(/{p2}/g, p2Name)
      .replace(/{sips}/g, String(card.sips || 2))
    return extra
  }, [card, player1, player2])

  const isMiniGame = card.category === 'minijeu'
  const isRule = card.category === 'regle'
  const isDuelOrChallenge = card.category === 'carte' && (card.mode === 'actif' || (player1 && player2))

  return (
    <div className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full">
      {/* Category / Mode Badge */}
      <div className="flex items-center justify-between text-xs pt-2">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider text-[11px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 uppercase">
            {isMiniGame ? '⚡ Mini-Jeu Tactile' : isRule ? '📜 Règle d\'Intendance' : '🃏 Carte de Veillée'}
          </span>
          {card.mode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-mono">
              Mode {card.mode}
            </span>
          )}
        </div>
        <span className="font-mono text-gray-500 text-xs">Tour #{roundNumber}</span>
      </div>

      {/* Main Card Canvas */}
      <div className="my-auto py-8">
        <div className="relative bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 text-center space-y-6">
          {/* Card Title */}
          {card.title && (
            <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide">
              {card.title}
            </h2>
          )}

          {/* Duellistes désignés si présents */}
          {player1 && (
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-900/30 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-200">
                <span>{player1.avatar || '⛺'}</span>
                <span>{player1.name}</span>
              </div>
              {player2 && (
                <>
                  <span className="text-xs font-black text-amber-400">VS</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-900/30 border border-amber-500/30 rounded-full text-xs font-bold text-amber-200">
                    <span>{player2.avatar || '🪵'}</span>
                    <span>{player2.name}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Card Body */}
          <p className="font-display text-lg sm:text-xl text-gray-100 font-medium leading-relaxed">
            {formattedContent}
          </p>

          {/* Extra information & sips badge */}
          <div className="flex flex-col items-center gap-2 pt-2">
            {formattedExtra && (
              <span className="text-xs text-cyan-400 font-semibold bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-900/50">
                💡 {formattedExtra}
              </span>
            )}
            {card.sips > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                <span className="text-sm">🍺</span>
                <span className="font-mono text-xs font-bold text-amber-300">
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
            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-base rounded-2xl shadow-xl shadow-cyan-500/25 hover:brightness-110 active:scale-98 flex items-center justify-center gap-2"
          >
            <span className="text-xl">⚡</span>
            <span>LANCER LE DUEL TACTILE SUR ÉCRAN</span>
          </button>
        ) : isDuelOrChallenge ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onValidate(true)}
              className="py-3.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 active:scale-98 flex items-center justify-center gap-2"
            >
              <span>✅</span>
              <span>Réussi</span>
            </button>
            <button
              onClick={() => onValidate(false)}
              className="py-3.5 bg-red-600/90 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/50 active:scale-98 flex items-center justify-center gap-2"
            >
              <span>❌</span>
              <span>Échoué</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onNext}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-98"
          >
            Carte Suivante →
          </button>
        )}
      </div>
    </div>
  )
}
