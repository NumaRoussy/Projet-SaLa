import { useMemo } from 'react'
import type { Card, Player } from '../types'

export type VachaoCardKind = 'minijeu' | 'regle' | 'vote' | 'duel' | 'challenge' | 'collective'

export function classifyVachaoCard(card: Card): VachaoCardKind {
  if (card.category === 'minijeu') return 'minijeu'
  if (card.category === 'regle') return 'regle'

  const titleLower = (card.title || '').trim().toLowerCase()
  const contentLower = (card.content || '').trim().toLowerCase()
  const extraLower = (card.extra || '').trim().toLowerCase()

  if (
    titleLower.startsWith('distribution') ||
    contentLower.startsWith('votez') ||
    contentLower.startsWith('distribution') ||
    extraLower.startsWith('distribution') ||
    extraLower.includes('le désigné')
  ) {
    return 'vote'
  }

  const hasP1 = card.content.includes('{p1}')
  const hasP2 = card.content.includes('{p2}')

  if (hasP1 && hasP2) return 'duel'
  if (hasP1) return 'challenge'

  return 'collective'
}

interface Props {
  card: Card
  players: Player[]
  player1: Player | null
  player2: Player | null
  roundNumber: number
  totalCards: number
  onLaunchMiniGame?: () => void
  onDesignatePlayer: (playerId: string) => void
  onIndividualChallenge: (success: boolean) => void
  onDuelResult: (loserId: string) => void
  onNext: () => void
}

export function CardView({
  card,
  players,
  player1,
  player2,
  roundNumber,
  onLaunchMiniGame,
  onDesignatePlayer,
  onIndividualChallenge,
  onDuelResult,
  onNext,
}: Props) {
  const sipsValue = card.sips || 2
  const cardKind = useMemo(() => classifyVachaoCard(card), [card])

  const formattedContent = useMemo(() => {
    const p1Name = player1?.name || 'Un chef'
    const p2Name = player2?.name || player1?.name || 'Son binôme'

    return card.content
      .replace(/{p1}/g, p1Name)
      .replace(/{p2}/g, p2Name)
      .replace(/{sips}/g, String(sipsValue))
  }, [card, player1, player2, sipsValue])

  const formattedExtra = useMemo(() => {
    if (!card.extra) return null
    const p1Name = player1?.name || 'Un chef'
    const p2Name = player2?.name || player1?.name || 'Son binôme'
    return card.extra
      .replace(/{p1}/g, p1Name)
      .replace(/{p2}/g, p2Name)
      .replace(/{sips}/g, String(sipsValue))
  }, [card, player1, player2, sipsValue])

  const showBothPlayers = cardKind === 'minijeu' || cardKind === 'duel'
  const showSinglePlayer =
    cardKind === 'challenge' || (cardKind === 'vote' && card.content.includes('{p1}'))

  return (
    <div className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full">
      {/* Category / Mode Badge */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider text-[11px] bg-[#1f2229] text-[#8ec2eb] border border-[#2d6394] uppercase">
            {cardKind === 'minijeu'
              ? 'Mini-Jeu Tactile'
              : cardKind === 'regle'
              ? "Règle d'Intendance"
              : cardKind === 'duel'
              ? 'Duel'
              : cardKind === 'challenge'
              ? 'Défi Individuel'
              : cardKind === 'vote'
              ? 'Vote / Désignation'
              : 'Carte de Veillée'}
          </span>
          {card.mode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f2229] border border-[#2e323c] text-slate-300 font-mono">
              Mode {card.mode}
            </span>
          )}
        </div>
        <span className="font-mono text-slate-400 text-xs">Tour #{roundNumber}</span>
      </div>

      {/* Main Card Canvas */}
      <div className="my-auto py-5">
        <div className="relative bg-[#1f2229] border border-[#2d6394] rounded-2xl p-5 sm:p-7 text-center space-y-5">
          {card.title && (
            <h2 className="font-display font-black text-xl sm:text-2xl text-[#f3f4f6] tracking-wide">
              {card.title}
            </h2>
          )}

          {showBothPlayers && player1 && (
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="px-3 py-1 bg-[#16181d] border border-[#2d6394] rounded-full text-xs font-bold text-[#8ec2eb]">
                {player1.name}
              </div>
              {player2 && (
                <>
                  <span className="text-xs font-black text-slate-400">VS</span>
                  <div className="px-3 py-1 bg-[#16181d] border border-[#2e323c] rounded-full text-xs font-bold text-[#f3f4f6]">
                    {player2.name}
                  </div>
                </>
              )}
            </div>
          )}

          {showSinglePlayer && player1 && (
            <div className="flex items-center justify-center py-1">
              <div className="px-3.5 py-1 bg-[#16181d] border border-[#2d6394] rounded-full text-xs font-bold text-[#8ec2eb]">
                {player1.name}
              </div>
            </div>
          )}

          <p className="font-display text-lg sm:text-xl text-[#f3f4f6] font-medium leading-relaxed">
            {formattedContent}
          </p>

          <div className="flex flex-col items-center gap-2 pt-1">
            {formattedExtra && (
              <span className="text-xs text-[#8ec2eb] font-semibold bg-[#16181d] px-3 py-1 rounded-full border border-[#2e323c]">
                {formattedExtra}
              </span>
            )}
            {card.sips > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-[#16181d] border border-[#b5892e] px-3 py-1 rounded-full">
                <span className="text-sm">🍺</span>
                <span className="font-mono text-xs font-bold text-[#e5be6d]">
                  {card.sips} gorgée{card.sips > 1 ? 's' : ''} en jeu
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="pb-3 space-y-2">
        {cardKind === 'minijeu' && onLaunchMiniGame ? (
          <button
            type="button"
            onClick={onLaunchMiniGame}
            className="btn-primary w-full font-bold"
          >
            Lancer le duel tactile sur écran
          </button>
        ) : cardKind === 'vote' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {players.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onDesignatePlayer(p.id)}
                  className="py-2.5 px-3 bg-[#1f2229] hover:bg-[#262a33] border border-[#2d6394] text-[#f3f4f6] font-semibold text-xs rounded-xl transition-colors flex items-center justify-between gap-1.5"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-mono text-[#e5be6d]">+{sipsValue} 🍺</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="btn-ghost w-full text-xs text-slate-400 hover:text-[#f3f4f6]"
            >
              Passer
            </button>
          </div>
        ) : cardKind === 'challenge' ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onIndividualChallenge(true)}
              className="py-3 px-4 bg-[#2e6f56] hover:bg-[#378265] border border-[#2e6f56] text-[#f3f4f6] font-semibold text-sm rounded-lg transition-colors"
            >
              Réussi
            </button>
            <button
              type="button"
              onClick={() => onIndividualChallenge(false)}
              className="py-3 px-4 bg-[#9b2c37] hover:bg-[#b03440] border border-[#9b2c37] text-[#f3f4f6] font-semibold text-xs sm:text-sm rounded-lg transition-colors"
            >
              Raté ({player1?.name || 'Chef'} boit {sipsValue} 🍺)
            </button>
          </div>
        ) : cardKind === 'duel' && player1 && player2 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onDuelResult(player1.id)}
                className="py-3 px-3 bg-[#9b2c37] hover:bg-[#b03440] border border-[#9b2c37] text-[#f3f4f6] font-semibold text-xs sm:text-sm rounded-lg transition-colors truncate"
              >
                {player1.name} perd ({sipsValue} 🍺)
              </button>
              <button
                type="button"
                onClick={() => onDuelResult(player2.id)}
                className="py-3 px-3 bg-[#9b2c37] hover:bg-[#b03440] border border-[#9b2c37] text-[#f3f4f6] font-semibold text-xs sm:text-sm rounded-lg transition-colors truncate"
              >
                {player2.name} perd ({sipsValue} 🍺)
              </button>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="btn-ghost w-full text-xs text-slate-400 hover:text-[#f3f4f6]"
            >
              Passer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="btn-primary w-full"
          >
            Carte suivante
          </button>
        )}
      </div>
    </div>
  )
}
