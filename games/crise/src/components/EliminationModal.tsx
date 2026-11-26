import type { CrisisPlayer } from '../types'

interface Props {
  player: CrisisPlayer
  onDismiss: () => void
}

export function EliminationModal({ player, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="relative bg-[#161922] border-2 border-red-600 rounded-2xl max-w-sm w-full p-6 text-center space-y-5">
        <div className="text-5xl">🚨</div>

        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase bg-red-950/60 border border-red-700/50 px-2.5 py-1 rounded-full">
            Évaluation Swiss Olympic — Exclusion officielle
          </span>
          <h2 className="font-display font-black text-2xl text-white mt-2">
            {player.avatar || '👮'} {player.name}
          </h2>
          <div className="text-red-400 font-mono text-sm font-bold mt-0.5">
            Perte atteinte : {player.lossPercent.toFixed(1)}% (Seuil 10.0%)
          </div>
        </div>

        <div className="bg-black/40 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 leading-relaxed text-center">
          <div className="font-bold text-sm text-red-100">
            {player.eliminationReason || 'Retrait immédiat de la licence J+S'}
          </div>
        </div>

        <div className="relative py-2 flex items-center justify-center">
          <div className="border-4 border-red-600 rounded-lg px-4 py-2 transform -rotate-12 bg-red-950/30">
            <span className="font-mono font-black text-lg sm:text-xl text-red-500 tracking-wider">
              SOUS SCELLÉS
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          Prends ton sac de couchage, ta chaise de camping et ta gamelle, et rentre chez toi !
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 bg-red-700 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-colors"
        >
          Valider l'expulsion administrative →
        </button>
      </div>
    </div>
  )
}
