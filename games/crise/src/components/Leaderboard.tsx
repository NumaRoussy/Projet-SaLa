import type { CrisisPlayer } from '../types'
import { ELIMINATION_THRESHOLD } from '../hooks/useCrisisStore'

interface Props {
  players: CrisisPlayer[]
  activeResponsableId?: string
}

export function Leaderboard({ players, activeResponsableId }: Props) {
  const sorted = [...players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1
    if (!a.isEliminated && b.isEliminated) return -1
    return a.lossPercent - b.lossPercent
  })

  const getBarColor = (p: CrisisPlayer) => {
    if (p.isEliminated || p.lossPercent >= ELIMINATION_THRESHOLD) {
      return '#4b5563'
    }
    if (p.lossPercent >= 9.0) {
      return '#9b2c37'
    }
    if (p.lossPercent >= 5.0) {
      return '#b5892e'
    }
    return '#2e6f56'
  }

  return (
    <div className="bg-[#1f2229] border-b border-[#2e323c] px-3 py-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-mono font-bold tracking-wide text-slate-300">
          Taux de perte J+S (seuil éliminatoire : 10 %)
        </span>
        <span className="text-[10px] text-slate-400 font-mono shrink-0">
          {players.filter(p => !p.isEliminated).length}/{players.length} en poste
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map(p => {
          const isActive = p.id === activeResponsableId
          const pctWidth = Math.min(100, (p.lossPercent / ELIMINATION_THRESHOLD) * 100)

          return (
            <div
              key={p.id}
              className={`py-1.5 px-2.5 rounded-lg border transition-colors bg-[#16181d] ${
                p.isEliminated
                  ? 'border-[#2e323c] opacity-55'
                  : isActive
                  ? 'border-[#9b2c37]'
                  : 'border-[#2e323c]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-xs mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  {isActive && !p.isEliminated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9b2c37] shrink-0" />
                  )}
                  <span
                    className={`font-display font-bold truncate ${
                      p.isEliminated ? 'text-slate-500 line-through' : isActive ? 'text-[#f3f4f6]' : 'text-slate-200'
                    }`}
                  >
                    {p.name}
                  </span>
                  {p.activeDebuffs.length > 0 && !p.isEliminated && (
                    <span
                      title={p.activeDebuffs.join(', ')}
                      className="text-[9px] px-1 rounded bg-[#1f2229] text-[#e88c95] border border-[#9b2c37] font-mono shrink-0"
                    >
                      !{p.activeDebuffs.length > 1 ? p.activeDebuffs.length : ''}
                    </span>
                  )}
                </div>

                <span
                  className={`font-mono font-bold text-[11px] shrink-0 ${
                    p.isEliminated
                      ? 'text-slate-500'
                      : p.lossPercent >= 9.0
                      ? 'text-[#e88c95]'
                      : p.lossPercent >= 5.0
                      ? 'text-[#e5be6d]'
                      : 'text-emerald-300'
                  }`}
                >
                  {p.lossPercent.toFixed(1)} %
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#1f2229] rounded-full overflow-hidden border border-[#2e323c]">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${pctWidth}%`, backgroundColor: getBarColor(p) }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
