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
          colorBadge: 'bg-[#16181d] text-emerald-300 border-[#2e6f56]',
          border: 'border-[#2e6f56]',
        }
      case 'maitrise':
        return {
          colorBadge: 'bg-[#16181d] text-[#e88c95] border-[#9b2c37]',
          border: 'border-[#9b2c37]',
        }
      case 'pico':
        return {
          colorBadge: 'bg-[#16181d] text-[#e5be6d] border-[#b5892e]',
          border: 'border-[#b5892e]',
        }
      case 'inseparables':
        return {
          colorBadge: 'bg-[#16181d] text-[#9eb4eb] border-[#3b5998]',
          border: 'border-[#3b5998]',
        }
    }
  }

  const theme = getVictoryTheme()

  return (
    <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
      <div className={`glass-card p-6 sm:p-8 text-center space-y-4 border-2 ${theme.border}`}>
        <div className="space-y-2">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.colorBadge}`}
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
            Durée : {minutes}m {seconds < 10 ? `0${seconds}` : seconds}s
          </span>
          <span>•</span>
          <span>{players.length} scouts</span>
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
                    ? 'bg-[#16181d] border-[#2e323c] text-[#f3f4f6]'
                    : 'bg-[#16181d] border-[#2e323c] text-slate-400 opacity-70'
                }`}
              >
                <div className="truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold truncate">{p.name}</span>
                    {p.isCampChief && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1f2229] border border-[#b5892e] text-[#e5be6d]">
                        Chef
                      </span>
                    )}
                    {p.isInseparable && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1f2229] border border-[#3b5998] text-[#9eb4eb]">
                        Lié
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] block ${isMaitrise ? 'text-[#e88c95]' : 'text-emerald-300'}`}>
                    {rDef.name}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border bg-[#1f2229] ${
                    p.isAlive
                      ? 'text-emerald-300 border-[#2e6f56]'
                      : 'text-[#e88c95] border-[#9b2c37]'
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
        <button type="button" onClick={onRestartGame} className="btn-primary w-full font-display">
          Rejouer une nouvelle partie
        </button>
      </div>
    </div>
  )
}
