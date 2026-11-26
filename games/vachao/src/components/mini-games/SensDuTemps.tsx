import { useState } from 'react'
import type { Player, MiniGameResult } from '../../types'
import { playPing, playVictory, playBuzzer } from '../../services/audio'

interface Props {
  player1: Player
  player2: Player
  sips?: number
  onFinish: (result: MiniGameResult) => void
}

type Phase = 'ready' | 'running' | 'revealed'

export function SensDuTemps({ player1, player2, sips = 2, onFinish }: Props) {
  // Target duration between 7.0s and 10.5s in increments of 0.5s
  const [targetSeconds] = useState(() => {
    const targets = [6.5, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0]
    return targets[Math.floor(Math.random() * targets.length)]
  })

  const [phase, setPhase] = useState<Phase>('ready')
  const [startTime, setStartTime] = useState<number>(0)
  const [p1Time, setP1Time] = useState<number | null>(null)
  const [p2Time, setP2Time] = useState<number | null>(null)


  const startChrono = () => {
    playPing(600, 0.2)
    setPhase('running')
    setStartTime(performance.now())
  }

  const handleP1Tap = () => {
    if (phase !== 'running' || p1Time !== null) return
    const elapsed = (performance.now() - startTime) / 1000
    setP1Time(elapsed)
    playPing(800, 0.1)
    if (p2Time !== null) {
      endRound(elapsed, p2Time)
    }
  }

  const handleP2Tap = () => {
    if (phase !== 'running' || p2Time !== null) return
    const elapsed = (performance.now() - startTime) / 1000
    setP2Time(elapsed)
    playPing(800, 0.1)
    if (p1Time !== null) {
      endRound(p1Time, elapsed)
    }
  }

  const endRound = (t1: number, t2: number) => {
    setPhase('revealed')
    const delta1 = Math.abs(t1 - targetSeconds)
    const delta2 = Math.abs(t2 - targetSeconds)

    if (delta1 < delta2) {
      playVictory()
    } else {
      playBuzzer()
    }
  }

  const delta1 = p1Time !== null ? p1Time - targetSeconds : null
  const delta2 = p2Time !== null ? p2Time - targetSeconds : null

  const winner = p1Time !== null && p2Time !== null
    ? Math.abs(p1Time - targetSeconds) <= Math.abs(p2Time - targetSeconds) ? player1 : player2
    : null
  const loser = winner === player1 ? player2 : player1

  const handleConfirm = () => {
    if (!winner || !loser) return
    const d1Str = p1Time ? `${p1Time.toFixed(2)}s` : ''
    const d2Str = p2Time ? `${p2Time.toFixed(2)}s` : ''
    onFinish({
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      sips,
      details: `Cible ${targetSeconds}s : ${player1.name} (${d1Str}) vs ${player2.name} (${d2Str})`,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0e1722] select-none flex flex-col touch-none p-4">
      {/* Header */}
      <div className="text-center py-2 border-b border-[#28527a]">
        <span className="text-xs font-mono tracking-wider text-amber-300 uppercase">
          Chrono à l'aveugle — Sens du Temps
        </span>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="text-3xl font-display font-black text-[#f3f4f6]">{targetSeconds.toFixed(1)}s</span>
          <span className="text-xs bg-[#261d12] text-amber-200 border border-[#785127] px-2 py-0.5 rounded-full font-bold">
            Temps Cible
          </span>
        </div>
      </div>

      {/* Main Duel Interface */}
      <div className="flex-1 flex flex-col justify-between py-4 gap-4">
        {/* Zone Joueur 1 (Haut) */}
        <div
          onPointerDown={handleP1Tap}
          className={`flex-1 rounded-2xl border-2 flex flex-col items-center justify-center p-4 transition-colors ${
            p1Time !== null
              ? 'bg-[#1c3552] border-[#32689c]'
              : phase === 'running'
              ? 'bg-[#152233] border-[#28527a] active:bg-[#1c2e45]'
              : 'bg-[#152233] border-[#28527a]'
          }`}
        >
          <div className="rotate-180 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">{player1.avatar || '⛺'}</span>
            <span className="font-display font-bold text-lg text-[#f3f4f6]">{player1.name}</span>
            {phase === 'ready' && <span className="text-xs text-slate-400">En attente du départ...</span>}
            {phase === 'running' && (
              <span className="text-sm font-bold text-sky-300">
                {p1Time === null ? '⏱️ Touchez quand c\'est écoulé !' : '✅ Enregistré !'}
              </span>
            )}
            {phase === 'revealed' && p1Time !== null && (
              <div className="mt-1">
                <div className="font-mono text-2xl font-black text-sky-300">{p1Time.toFixed(2)}s</div>
                <div className={`text-xs font-bold ${Math.abs(delta1!) < 0.4 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  Écart : {delta1! > 0 ? `+${delta1!.toFixed(2)}s` : `${delta1!.toFixed(2)}s`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Centre : Contrôle */}
        <div className="flex flex-col items-center justify-center py-2">
          {phase === 'ready' && (
            <button
              onClick={startChrono}
              className="px-8 py-3 bg-[#966530] hover:bg-[#aa7438] border border-[#785127] text-[#f3f4f6] font-black text-base rounded-full transition-colors"
            >
              Lancer le Chrono (Fermez les yeux !)
            </button>
          )}

          {phase === 'running' && (
            <div className="text-center space-y-1">
              <span className="text-4xl inline-block">🙈</span>
              <p className="text-xs font-bold text-slate-300">Yeux fermés ! Les deux chefs estiment le temps.</p>
            </div>
          )}

          {phase === 'revealed' && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-black text-amber-300 text-center">
                🏆 {winner?.name} est le plus proche ! {loser?.name} prend {sips} gorgées
              </span>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-[#32689c] hover:bg-[#3c7ab5] border border-[#28527a] text-[#f3f4f6] font-bold text-xs rounded-full transition-colors"
              >
                Continuer la veillée →
              </button>
            </div>
          )}
        </div>

        {/* Zone Joueur 2 (Bas) */}
        <div
          onPointerDown={handleP2Tap}
          className={`flex-1 rounded-2xl border-2 flex flex-col items-center justify-center p-4 transition-colors ${
            p2Time !== null
              ? 'bg-[#1c3552] border-[#32689c]'
              : phase === 'running'
              ? 'bg-[#152233] border-[#28527a] active:bg-[#1c2e45]'
              : 'bg-[#152233] border-[#28527a]'
          }`}
        >
          <div className="flex flex-col items-center gap-1 text-center">
            {phase === 'revealed' && p2Time !== null && (
              <div className="mb-1">
                <div className="font-mono text-2xl font-black text-sky-300">{p2Time.toFixed(2)}s</div>
                <div className={`text-xs font-bold ${Math.abs(delta2!) < 0.4 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  Écart : {delta2! > 0 ? `+${delta2!.toFixed(2)}s` : `${delta2!.toFixed(2)}s`}
                </div>
              </div>
            )}
            {phase === 'running' && (
              <span className="text-sm font-bold text-sky-300">
                {p2Time === null ? '⏱️ Touchez quand c\'est écoulé !' : '✅ Enregistré !'}
              </span>
            )}
            {phase === 'ready' && <span className="text-xs text-slate-400">En attente du départ...</span>}
            <span className="font-display font-bold text-lg text-[#f3f4f6]">{player2.name}</span>
            <span className="text-2xl">{player2.avatar || '🪵'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
