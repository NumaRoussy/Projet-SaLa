import { useState } from 'react'
import type { AssignedPlayer } from '../types'
import { ROLES_DATA } from '../data/roles'

interface DistributionPhaseProps {
  assignedPlayers: AssignedPlayer[]
  onCompleteDistribution: () => void
}

export function DistributionPhase({
  assignedPlayers,
  onCompleteDistribution,
}: DistributionPhaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  const total = assignedPlayers.length
  const isFinished = currentIndex >= total

  if (isFinished) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-[#172036] border border-[#34497a] flex items-center justify-center text-4xl">
          📱
        </div>

        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#122620] text-emerald-200 border border-[#2d6a4f]">
            Toutes les cartes ont été distribuées
          </span>
          <h2 className="text-2xl font-extrabold text-[#f3f4f6] font-display">
            Rendre le smartphone au meneur de jeu
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Chaque scout connaît désormais son rôle secret sous la tente. Place au silence et à l'extinction des feux !
          </p>
        </div>

        <div className="w-full pt-2">
          <button
            type="button"
            onClick={onCompleteDistribution}
            className="btn-amber w-full py-4 text-base font-bold font-display"
          >
            <span>🌙</span>
            <span>Commencer la Nuit 1</span>
          </button>
        </div>
      </div>
    )
  }

  const currentPlayer = assignedPlayers[currentIndex]
  const roleDef = ROLES_DATA[currentPlayer.role]
  const isMaitrise = roleDef.camp === 'maitrise'

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full p-4 sm:p-6">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
          <span>Distribution secrète</span>
          <span>
            {currentIndex + 1} / {total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#172036] rounded-full overflow-hidden border border-[#34497a]">
          <div
            className="h-full bg-[#415b99] transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {!isRevealed ? (
        <div className="glass-card p-6 sm:p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#101626] border border-[#34497a] flex items-center justify-center text-4xl">
            🤫
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Tour par tour confidentiel
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6] font-display">
              Passe le smartphone à{' '}
              <span className="text-amber-300 underline decoration-[#785127]">
                {currentPlayer.name}
              </span>
            </h2>
            <p className="text-xs text-slate-400 pt-1">
              Ne laisse personne regarder ton écran. Découvre ta carte en toute discrétion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRevealed(true)}
            className="btn-primary w-full py-4 text-sm sm:text-base font-bold font-display"
          >
            <span>👁️</span>
            <span>Révéler ma carte</span>
          </button>
        </div>
      ) : (
        <div
          className={`glass-card p-5 sm:p-6 text-center space-y-5 border-2 ${
            isMaitrise ? 'border-[#7f2d38]' : 'border-[#2d6a4f]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold font-mono">
              Scout : <strong className="text-[#f3f4f6]">{currentPlayer.name}</strong>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isMaitrise
                  ? 'bg-[#2b171b] text-red-200 border-[#7f2d38]'
                  : 'bg-[#122620] text-emerald-200 border-[#2d6a4f]'
              }`}
            >
              {roleDef.campLabel}
            </span>
          </div>

          <div className="space-y-2 py-2">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[#101626] border border-[#34497a] text-5xl">
              {roleDef.icon}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6] font-display">
              {roleDef.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium px-2">
              {roleDef.shortDesc}
            </p>
          </div>

          <div className="space-y-3 text-left">
            <div className="p-3.5 rounded-xl bg-[#101626] border border-[#34497a] text-xs text-slate-200 leading-relaxed">
              <span className="font-bold text-[#f3f4f6] block mb-1">📜 Rôle &amp; But :</span>
              {roleDef.fullDesc}
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isMaitrise
                  ? 'bg-[#2b171b] border-[#7f2d38] text-red-200'
                  : 'bg-[#122620] border-[#2d6a4f] text-emerald-200'
              }`}
            >
              <span className="font-bold block mb-1">⚡ Ce que tu dois faire :</span>
              {roleDef.actionDesc}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsRevealed(false)
              setCurrentIndex(prev => prev + 1)
            }}
            className="w-full py-4 rounded-xl font-bold text-sm sm:text-base font-display bg-[#101626] hover:bg-[#1e2a45] text-[#f3f4f6] border border-[#34497a] transition-colors flex items-center justify-center gap-2"
          >
            <span>🙈</span>
            <span>Cacher ma carte et continuer</span>
          </button>
        </div>
      )}
    </div>
  )
}
