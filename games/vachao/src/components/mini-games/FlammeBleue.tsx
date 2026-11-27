import { useState, useEffect, useRef } from 'react'
import type { Player, MiniGameResult } from '../../types'
import { playPing, playBuzzer, playVictory } from '../../services/audio'

interface Props {
  player1: Player
  player2: Player
  sips?: number
  onFinish: (result: MiniGameResult) => void
}

type Phase = 'waiting' | 'blue' | 'false_start' | 'result'

export function FlammeBleue({ player1, player2, sips = 2, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const [faultPlayer, setFaultPlayer] = useState<Player | null>(null)
  const [winner, setWinner] = useState<Player | null>(null)
  const [loser, setLoser] = useState<Player | null>(null)

  const blueStartedAtRef = useRef<number>(0)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    if (phase !== 'waiting') return

    const delay = 2000 + Math.floor(Math.random() * 3500)
    const timer = setTimeout(() => {
      blueStartedAtRef.current = performance.now()
      playPing(1200, 0.25)
      setPhase('blue')
    }, delay)

    return () => clearTimeout(timer)
  }, [phase])

  const handleTap = (player: Player) => {
    if (phase === 'false_start' || phase === 'result') return

    if (phase === 'waiting') {
      const otherPlayer = player.id === player1.id ? player2 : player1
      setFaultPlayer(player)
      setWinner(otherPlayer)
      setLoser(player)
      setPhase('false_start')
      playBuzzer()
      return
    }

    if (phase === 'blue') {
      const elapsed = Math.max(1, Math.round(performance.now() - blueStartedAtRef.current))
      const otherPlayer = player.id === player1.id ? player2 : player1
      setReactionMs(elapsed)
      setWinner(player)
      setLoser(otherPlayer)
      setPhase('result')
      playVictory()
    }
  }

  const handleConfirm = () => {
    if (!winner || !loser) return
    const details =
      phase === 'false_start' && faultPlayer
        ? `Faux départ de ${faultPlayer.name} !`
        : `${winner.name} l'emporte en ${reactionMs ?? 0} ms !`

    onFinishRef.current({
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      sips,
      details,
    })
  }

  const isBlue = phase === 'blue'

  return (
    <div
      className={`fixed inset-0 z-50 select-none flex flex-col touch-none overflow-hidden transition-colors duration-100 ${
        isBlue ? 'bg-[#2563eb]' : 'bg-[#16181d]'
      }`}
    >
      {/* Moitié Joueur 1 (Haut - orienté face à face) */}
      <div
        onPointerDown={() => handleTap(player1)}
        className={`flex-1 flex flex-col items-center justify-center p-6 border-b border-[#2e323c] cursor-pointer transition-colors ${
          isBlue
            ? 'bg-[#2563eb] active:bg-[#3b82f6]'
            : 'bg-[#16181d] active:bg-[#1f2229]'
        }`}
      >
        <div className="rotate-180 flex flex-col items-center gap-2 text-center">
          <span className="font-display font-black text-xl tracking-wide text-[#f3f4f6]">
            {player1.name}
          </span>

          {phase === 'result' && winner?.id === player1.id && reactionMs !== null && (
            <span className="px-3 py-1 rounded-full bg-[#1f2229] border border-[#2d6394] text-[#8ec2eb] font-mono text-sm font-bold">
              {reactionMs} ms
            </span>
          )}

          {phase === 'false_start' && faultPlayer?.id === player1.id && (
            <span className="px-3 py-1 rounded-full bg-[#1f2229] border border-[#9b2c37] text-[#e88c95] font-bold text-xs">
              FAUX DÉPART !
            </span>
          )}

          <span className={`text-xs ${isBlue ? 'text-blue-100 font-semibold' : 'text-slate-400'}`}>
            {isBlue ? 'TOUCHEZ MAINTENANT !' : 'Touchez ici dès que la flamme devient bleue'}
          </span>
        </div>
      </div>

      {/* Centre : Statut */}
      <div
        className={`px-4 py-5 flex items-center justify-center border-y ${
          isBlue
            ? 'bg-[#3b82f6] border-blue-300'
            : 'bg-[#1f2229] border-[#2e323c]'
        }`}
      >
        {phase === 'waiting' && (
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-sm font-bold text-[#e0aa75] uppercase tracking-wider">
              Flamme rouge / orange
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Attendez le bleu... Ne touchez pas !
            </span>
          </div>
        )}

        {phase === 'blue' && (
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-lg font-black text-white tracking-wider uppercase">
              MAINTENANT !
            </span>
          </div>
        )}

        {phase === 'false_start' && (
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-sm font-bold text-[#e88c95]">
              Faux départ de {faultPlayer?.name} ! {loser?.name} prend {sips} gorgée{sips > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs"
            >
              Continuer →
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-sm font-bold text-[#8ec2eb]">
              {winner?.name} gagne ({reactionMs} ms) ! {loser?.name} boit {sips} gorgée{sips > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary text-xs"
            >
              Continuer →
            </button>
          </div>
        )}
      </div>

      {/* Moitié Joueur 2 (Bas) */}
      <div
        onPointerDown={() => handleTap(player2)}
        className={`flex-1 flex flex-col items-center justify-center p-6 border-t border-[#2e323c] cursor-pointer transition-colors ${
          isBlue
            ? 'bg-[#2563eb] active:bg-[#3b82f6]'
            : 'bg-[#16181d] active:bg-[#1f2229]'
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className={`text-xs ${isBlue ? 'text-blue-100 font-semibold' : 'text-slate-400'}`}>
            {isBlue ? 'TOUCHEZ MAINTENANT !' : 'Touchez ici dès que la flamme devient bleue'}
          </span>

          {phase === 'false_start' && faultPlayer?.id === player2.id && (
            <span className="px-3 py-1 rounded-full bg-[#1f2229] border border-[#9b2c37] text-[#e88c95] font-bold text-xs">
              FAUX DÉPART !
            </span>
          )}

          {phase === 'result' && winner?.id === player2.id && reactionMs !== null && (
            <span className="px-3 py-1 rounded-full bg-[#1f2229] border border-[#2d6394] text-[#8ec2eb] font-mono text-sm font-bold">
              {reactionMs} ms
            </span>
          )}

          <span className="font-display font-black text-xl tracking-wide text-[#f3f4f6]">
            {player2.name}
          </span>
        </div>
      </div>
    </div>
  )
}
