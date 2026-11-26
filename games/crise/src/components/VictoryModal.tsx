import type { CrisisPlayer } from '../types'
import { getHubUrl } from '../services/cookies'

interface Props {
  winner: CrisisPlayer
  totalRounds: number
  onRestart: () => void
}

export function VictoryModal({ winner, totalRounds, onRestart }: Props) {
  const hubUrl = getHubUrl()

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-[#111624] border-2 border-emerald-500 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl shadow-emerald-950/80 space-y-5">
        <div className="text-6xl animate-bounce">🏆</div>

        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-1 rounded-full">
            Évaluation Swiss Olympic terminée — Seul survivant
          </span>
          <h2 className="font-display font-black text-2xl text-white mt-3">
            Top 1 – Coach J+S
          </h2>
          <div className="text-xl font-bold text-emerald-300 mt-1">
            {winner.avatar || '👮'} {winner.name}
          </div>
        </div>

        <div className="bg-black/50 border border-emerald-500/30 rounded-xl p-3 text-xs text-gray-200 leading-relaxed font-sans text-center">
          Tous les autres responsables ont été démis de leurs fonctions.
          <br />
          <strong className="text-emerald-300">
            {winner.name} est sacré Coach J+S avec seulement {winner.lossPercent.toFixed(1)}% de perte !
          </strong>
        </div>

        <div className="text-[11px] text-gray-400 font-mono">
          Partie achevée après {totalRounds} tours d'attaques et de crasses d'intendance.
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onRestart}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950 active:scale-95 transition-transform"
          >
            🔄 Rappeler la Cellule de Crise
          </button>
          <a
            href={hubUrl}
            className="block w-full py-2.5 text-center text-xs font-semibold text-gray-400 hover:text-white"
          >
            ← Retourner au Hub Maîtrise
          </a>
        </div>
      </div>
    </div>
  )
}
