import type { VictoryResult, AssignedPlayer } from '../types'
import { ROLES_DATA } from '../data/roles'

interface GameOverPhaseProps {
  victory: VictoryResult
  players: AssignedPlayer[]
  durationSeconds: number
  onRestartGame: () => void
}

export function GameOverPhase({
  victory,
  players,
  durationSeconds,
  onRestartGame,
}: GameOverPhaseProps) {
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60

  const getVictoryTheme = () => {
    switch (victory.winner) {
      case 'tentes':
        return {
          icon: '⛺',
          colorBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          gradientBg: 'from-emerald-950/60 to-[#0b0f19]',
          border: 'border-emerald-500/40',
        }
      case 'maitrise':
        return {
          icon: '🔦',
          colorBadge: 'bg-red-500/20 text-red-300 border-red-500/40',
          gradientBg: 'from-red-950/60 to-[#0b0f19]',
          border: 'border-red-500/40',
        }
      case 'pico':
        return {
          icon: '🗡️',
          colorBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          gradientBg: 'from-purple-950/60 to-[#0b0f19]',
          border: 'border-purple-500/40',
        }
      case 'inseparables':
        return {
          icon: '💖',
          colorBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
          gradientBg: 'from-pink-950/60 to-[#0b0f19]',
          border: 'border-pink-500/40',
        }
    }
  }

  const theme = getVictoryTheme()

  return (
    <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Bannière de Victoire */}
      <div
        className={`glass-card p-6 sm:p-8 text-center space-y-4 border-2 shadow-2xl bg-gradient-to-b ${theme.gradientBg} ${theme.border}`}
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center text-5xl shadow-2xl animate-bounce">
          {theme.icon}
        </div>

        <div className="space-y-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.colorBadge}`}
          >
            Fin de la partie
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            {victory.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-md mx-auto">
            {victory.description}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-gray-400 font-mono">
          <span>
            ⏱️ Durée : {minutes}m {seconds < 10 ? `0${seconds}` : seconds}s
          </span>
          <span>•</span>
          <span>👥 {players.length} scouts</span>
        </div>
      </div>

      {/* Révélation complète des rôles de tous les joueurs */}
      <div className="glass-card p-5 space-y-4 border-white/10">
        <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
          Récapitulatif de la Patrouille ({players.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {players.map(p => {
            const rDef = ROLES_DATA[p.role]
            const isMaitrise = rDef.camp === 'maitrise'

            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  p.isAlive
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-black/40 border-white/5 text-gray-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-xl shrink-0">{rDef.icon}</span>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold truncate">{p.name}</span>
                      {p.isCampChief && <span title="Chef de Camp">⭐</span>}
                      {p.isInseparable && <span title="Inséparable">❤️</span>}
                    </div>
                    <span
                      className={`text-[11px] block ${
                        isMaitrise ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {rDef.name}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    p.isAlive
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {p.isAlive ? 'Vivant' : 'Éliminé'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bouton pour rejouer */}
      <div className="pt-2">
        <button
          onClick={onRestartGame}
          className="w-full py-4 rounded-xl font-bold text-base font-display tracking-wide
                     bg-gradient-to-r from-scout-amber to-scout-orange text-scout-night
                     hover:brightness-110 active:scale-[0.98] transition-all duration-200
                     shadow-xl shadow-scout-amber/20 flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Rejouer une nouvelle partie</span>
        </button>
      </div>
    </div>
  )
}
