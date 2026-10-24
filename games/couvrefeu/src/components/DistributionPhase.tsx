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

  // Écran final de restitution au meneur
  if (isFinished) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full p-6 text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-scout-amber/10 border border-scout-amber/30 flex items-center justify-center text-5xl shadow-2xl animate-bounce">
          📱
        </div>

        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Toutes les cartes ont été distribuées
          </span>
          <h2 className="text-2xl font-extrabold text-white font-display">
            Rendre le smartphone au meneur de jeu
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Chaque scout connaît désormais son rôle secret sous la tente. Place au silence et à l'extinction des feux !
          </p>
        </div>

        <div className="w-full pt-4">
          <button
            onClick={onCompleteDistribution}
            className="w-full py-4 rounded-xl font-bold text-base font-display tracking-wide
                       bg-gradient-to-r from-scout-amber to-scout-orange text-scout-night
                       hover:brightness-110 active:scale-[0.98] transition-all duration-200
                       shadow-xl shadow-scout-amber/20 flex items-center justify-center gap-2"
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
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full p-4 sm:p-6 animate-fade-in">
      {/* Barre de progression */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
          <span>Distribution secrète</span>
          <span>
            {currentIndex + 1} / {total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-scout-amber transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {!isRevealed ? (
        /* Écran intermédiaire : "Passe le smartphone à [Prénom]" */
        <div className="glass-card p-6 sm:p-8 text-center space-y-6 border-white/10 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
            🤫
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-scout-pale uppercase tracking-wider">
              Tour par tour confidentiel
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Passe le smartphone à{' '}
              <span className="text-scout-amber underline decoration-scout-amber/40">
                {currentPlayer.name}
              </span>
            </h2>
            <p className="text-xs text-gray-400 pt-1">
              Ne laisse personne regarder ton écran. Découvre ta carte en toute discrétion.
            </p>
          </div>

          <button
            onClick={() => setIsRevealed(true)}
            className="w-full py-4 rounded-xl font-bold text-sm sm:text-base font-display
                       bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30
                       active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-600/30
                       flex items-center justify-center gap-2"
          >
            <span>👁️</span>
            <span>Révéler ma carte</span>
          </button>
        </div>
      ) : (
        /* Vue détaillée de la carte révélée */
        <div
          className={`glass-card p-5 sm:p-6 text-center space-y-5 border-2 shadow-2xl animate-fade-in ${
            isMaitrise
              ? 'border-red-500/40 bg-gradient-to-b from-red-950/40 to-[#0b0f19]'
              : 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-[#0b0f19]'
          }`}
        >
          {/* Badge de camp */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold font-mono">
              Scout : <strong className="text-white">{currentPlayer.name}</strong>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isMaitrise
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {roleDef.campLabel}
            </span>
          </div>

          {/* Icône & Titre du rôle */}
          <div className="space-y-2 py-2">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-black/40 border border-white/10 text-5xl shadow-2xl">
              {roleDef.icon}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {roleDef.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 font-medium px-2">
              {roleDef.shortDesc}
            </p>
          </div>

          {/* Description complète et consignes d'action */}
          <div className="space-y-3 text-left">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-200 leading-relaxed">
              <span className="font-bold text-white block mb-1">📜 Rôle & But :</span>
              {roleDef.fullDesc}
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isMaitrise
                  ? 'bg-red-950/50 border-red-500/30 text-red-200'
                  : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <span className="font-bold block mb-1">⚡ Ce que tu dois faire :</span>
              {roleDef.actionDesc}
            </div>
          </div>

          {/* Bouton pour cacher la carte */}
          <button
            onClick={() => {
              setIsRevealed(false)
              setCurrentIndex(prev => prev + 1)
            }}
            className="w-full py-4 rounded-xl font-bold text-sm sm:text-base font-display
                       bg-white/10 hover:bg-white/20 text-white border border-white/20
                       active:scale-[0.98] transition-all duration-200
                       flex items-center justify-center gap-2"
          >
            <span>🙈</span>
            <span>Cacher ma carte et continuer</span>
          </button>
        </div>
      )}
    </div>
  )
}
