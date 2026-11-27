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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="relative bg-[#1f2229] border-2 border-[#9b2c37] rounded-2xl max-w-sm w-full p-6 text-center space-y-5">
        <div>
          <span className="inline-block text-[10px] font-mono font-bold tracking-widest text-emerald-300 uppercase bg-[#16181d] border border-[#2e6f56] px-2.5 py-1 rounded-full">
            Évaluation Swiss Olympic terminée : Seul survivant
          </span>
          <h2 className="font-display font-black text-2xl text-[#f3f4f6] mt-3">
            Top 1 : Coach J+S
          </h2>
          <div className="text-xl font-bold text-emerald-300 mt-1">
            {winner.name}
          </div>
        </div>

        <div className="bg-[#16181d] border border-[#2e323c] rounded-xl p-3 text-xs text-slate-200 leading-relaxed text-center">
          Tous les autres responsables ont été démis de leurs fonctions.
          <br />
          <strong className="text-emerald-300">
            {winner.name} est sacré Coach J+S avec seulement {winner.lossPercent.toFixed(1)}% de perte !
          </strong>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Partie achevée après {totalRounds} tours d'attaques et de crasses d'intendance.
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onRestart}
            className="btn-primary w-full"
          >
            Rappeler la Cellule de Crise
          </button>
          <a
            href={hubUrl}
            className="block w-full py-2.5 text-center text-xs font-semibold text-slate-400 hover:text-[#f3f4f6]"
          >
            ← Menu
          </a>
        </div>
      </div>
    </div>
  )
}
