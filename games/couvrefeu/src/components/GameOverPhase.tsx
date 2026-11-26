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
          colorBadge: 'bg-[#122620] text-emerald-200 border-[#2d6a4f]',
          border: 'border-[#2d6a4f]',
        }
      case 'maitrise':
        return {
          icon: '🔦',
          colorBadge: 'bg-[#2b171b] text-red-200 border-[#7f2d38]',
          border: 'border-[#7f2d38]',
        }
      case 'pico':
        return {
          icon: '🗡️',
          colorBadge: 'bg-[#201830] text-purple-200 border-[#5f3d91]',
          border: 'border-[#5f3d91]',
        }
      case 'inseparables':
        return {
          icon: '💖',
          colorBadge: 'bg-[#291724] text-pink-200 border-[#7d3666]',
          border: 'border-[#7d3666]',
        }
    }
  }

  const theme = getVictoryTheme()

  return (
    <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
      <div className={`glass-card p-6 sm:p-8 text-center space-y-4 border-2 ${theme.border}`}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#101626] border border-[#34497a] flex items-center justify-center text-4xl">
          {theme.icon}
        </div>

        <div className="space-y-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.colorBadge}`}
          >
            Fin de la partie
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6] font-display">
            {victory.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            {victory.description}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-slate-400 font-mono">
          <span>
            ⏱️ Durée : {minutes}m {seconds < 10 ? `0${seconds}` : seconds}s
          </span>
          <span>•</span>
          <span>👥 {players.length} scouts</span>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-xs sm:text-sm font-bold text-[#f3f4f6] uppercase tracking-wider">
          Récapitulatif de la Patrouille ({players.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {players.map(p => {
            const rDef = ROLES_DATA[p.role]
            const isMaitrise = rDef.camp === 'maitrise'

            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  p.isAlive
                    ? 'bg-[#101626] border-[#34497a] text-[#f3f4f6]'
                    : 'bg-[#121828] border-[#263559] text-slate-400 opacity-75'
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
                    <span className={`text-[11px] block ${isMaitrise ? 'text-red-300' : 'text-emerald-300'}`}>
                      {rDef.name}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                    p.isAlive
                      ? 'bg-[#122620] text-emerald-200 border-[#2d6a4f]'
                      : 'bg-[#2b171b] text-red-200 border-[#7f2d38]'
                  }`}
                >
                  {p.isAlive ? 'Vivant' : 'Éliminé'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pt-1">
        <button type="button" onClick={onRestartGame} className="btn-amber w-full py-4 text-base font-bold font-display">
          <span>🔄</span>
          <span>Rejouer une nouvelle partie</span>
        </button>
      </div>
    </div>
  )
}
