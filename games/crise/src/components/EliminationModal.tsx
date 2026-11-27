import type { CrisisPlayer } from '../types'

interface Props {
  player: CrisisPlayer
  onDismiss: () => void
}

export function EliminationModal({ player, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="relative bg-[#1f2229] border-2 border-[#9b2c37] rounded-2xl max-w-sm w-full p-6 text-center space-y-5">
        <div>
          <span className="inline-block text-[10px] font-mono font-bold tracking-widest text-[#e88c95] uppercase bg-[#16181d] border border-[#9b2c37] px-2.5 py-1 rounded-full">
            Évaluation Swiss Olympic : Exclusion officielle
          </span>
          <h2 className="font-display font-black text-2xl text-[#f3f4f6] mt-3">
            {player.name}
          </h2>
          <div className="text-[#e88c95] font-mono text-sm font-bold mt-1">
            Perte atteinte : {player.lossPercent.toFixed(1)}% (Seuil 10.0%)
          </div>
        </div>

        <div className="bg-[#16181d] border border-[#9b2c37] rounded-xl p-3 text-xs text-slate-200 leading-relaxed text-center">
          <div className="font-bold text-sm text-[#f3f4f6]">
            {player.eliminationReason || 'Retrait immédiat de la licence J+S'}
          </div>
        </div>

        <div className="relative py-2 flex items-center justify-center">
          <div className="border-4 border-[#9b2c37] rounded-lg px-4 py-2 transform -rotate-12 bg-[#16181d]">
            <span className="font-mono font-black text-lg sm:text-xl text-[#e88c95] tracking-wider">
              SOUS SCELLÉS
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Prends ton sac de couchage, ta chaise de camping et ta gamelle, et rentre chez toi !
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="btn-primary w-full"
        >
          Valider l'expulsion administrative →
        </button>
      </div>
    </div>
  )
}
