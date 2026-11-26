import type { CrisisPlayer } from '../types'
import { ELIMINATION_THRESHOLD } from '../hooks/useCrisisStore'

interface Props {
  players: CrisisPlayer[]
  activeResponsableId?: string
}

export function Leaderboard({ players, activeResponsableId }: Props) {
  // Tri : Survivants d'abord (du plus bas au plus haut % de perte), puis éliminés
  const sorted = [...players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1
    if (!a.isEliminated && b.isEliminated) return -1
    return a.lossPercent - b.lossPercent
  })

  const getBarColor = (p: CrisisPlayer) => {
    if (p.isEliminated || p.lossPercent >= ELIMINATION_THRESHOLD) {
      return 'bg-gray-700'
    }
    if (p.lossPercent >= 9.0) {
      return 'bg-red-500 animate-pulse'
    }
    if (p.lossPercent >= 5.0) {
      return 'bg-amber-500'
    }
    return 'bg-emerald-500'
  }

  const getZoneBadge = (p: CrisisPlayer) => {
    if (p.isEliminated) {
      return (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 line-through">
          ÉLIMINÉ (10%)
        </span>
      )
    }
    if (p.lossPercent >= 9.0) {
      return (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/60 animate-bounce">
          CRITIQUE
        </span>
      )
    }
    if (p.lossPercent >= 5.0) {
      return (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-600/40">
          ALERTE
        </span>
      )
    }
    return (
      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">
        CONFORME
      </span>
    )
  }

  return (
    <div className="bg-[#0f1118] border-b border-white/10 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🚨</span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-gray-300 uppercase">
            Surveillance J+S — Seuil Éliminatoire 10.0%
          </span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">
          {players.filter(p => !p.isEliminated).length}/{players.length} en poste
        </span>
      </div>

      {/* Mini Bar Leaderboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sorted.map(p => {
          const isActive = p.id === activeResponsableId
          const pctWidth = Math.min(100, (p.lossPercent / ELIMINATION_THRESHOLD) * 100)

          return (
            <div
              key={p.id}
              className={`p-2 rounded-xl border transition-all ${
                p.isEliminated
                  ? 'bg-black/40 border-gray-800 opacity-60'
                  : isActive
                  ? 'bg-red-950/20 border-red-500/50 shadow-sm'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">{p.avatar || '👮'}</span>
                  <span
                    className={`font-display font-bold truncate ${
                      p.isEliminated ? 'text-gray-500 line-through' : isActive ? 'text-white font-black' : 'text-gray-200'
                    }`}
                  >
                    {p.name}
                  </span>
                  {isActive && !p.isEliminated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {getZoneBadge(p)}
                  <span
                    className={`font-mono font-bold text-xs ${
                      p.isEliminated
                        ? 'text-gray-500'
                        : p.lossPercent >= 9.0
                        ? 'text-red-400'
                        : p.lossPercent >= 5.0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {p.lossPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-500 ${getBarColor(p)}`}
                  style={{ width: `${pctWidth}%` }}
                />
              </div>

              {/* Badges de Malus Permanents */}
              {p.activeDebuffs.length > 0 && !p.isEliminated && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.activeDebuffs.map((d, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-700/40 font-mono"
                    >
                      ⚠️ {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
