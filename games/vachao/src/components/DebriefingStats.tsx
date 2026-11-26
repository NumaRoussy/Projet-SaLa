import type { Player } from '../types'
import { getHubUrl } from '../services/cookies'

interface Props {
  players: Player[]
  totalRounds: number
  onRestart: () => void
}

export function DebriefingStats({ players, totalRounds, onRestart }: Props) {
  const hubUrl = getHubUrl()

  const sortedByDrunk = [...players].sort((a, b) => b.sipsDrunk - a.sipsDrunk)
  const sortedByGiven = [...players].sort((a, b) => b.sipsGiven - a.sipsGiven)
  const sortedByWinRate = [...players].sort((a, b) => {
    const rateA = (a.challengesWon + a.challengesLost) > 0 ? a.challengesWon / (a.challengesWon + a.challengesLost) : 0
    const rateB = (b.challengesWon + b.challengesLost) > 0 ? b.challengesWon / (b.challengesWon + b.challengesLost) : 0
    return rateB - rateA
  })

  const boulet = sortedByDrunk[0]
  const vigie = sortedByWinRate[0]
  const intendant = sortedByGiven[0]
  const gorgeeTradition = sortedByDrunk[0]

  return (
    <div className="min-h-screen bg-[#0e1722] text-[#f3f4f6] p-4 max-w-lg mx-auto flex flex-col justify-between">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center pt-4">
          <span className="text-4xl">🐮🏆</span>
          <h1 className="font-display font-black text-2xl tracking-wide text-[#f3f4f6] mt-1">
            Débriefing de Veillée Vachao
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {totalRounds} tours joués • Bilan officiel de la maîtrise
          </p>
        </div>

        {/* Gorgée de Tradition */}
        {gorgeeTradition && (
          <div className="bg-[#152233] border border-[#785127] rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-300 uppercase">
              👑 Élection de la « Gorgée de Tradition »
            </span>
            <div className="font-display font-black text-xl text-[#f3f4f6]">
              {gorgeeTradition.avatar} {gorgeeTradition.name}
            </div>
            <p className="text-xs text-amber-200">
              Avec {gorgeeTradition.sipsDrunk} gorgées avalées, le titre du champion incontesté de la cuve lui revient d'office !
            </p>
          </div>
        )}

        {/* Titres Parodiques */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#152233] border border-[#28527a] rounded-xl p-3">
            <div className="text-xs text-red-300 font-bold">Le Boulet de l'Intendance</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1">
              {boulet?.avatar} {boulet?.name || '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{boulet?.sipsDrunk || 0} gorgées subies</div>
          </div>

          <div className="bg-[#152233] border border-[#28527a] rounded-xl p-3">
            <div className="text-xs text-emerald-300 font-bold">La Vigie Inoxydable</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1">
              {vigie?.avatar} {vigie?.name || '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{vigie?.challengesWon || 0} duels remportés</div>
          </div>

          <div className="bg-[#152233] border border-[#28527a] rounded-xl p-3">
            <div className="text-xs text-sky-300 font-bold">L'Intendant de l'Ombre</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1">
              {intendant?.avatar} {intendant?.name || '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{intendant?.sipsGiven || 0} gorgées distribuées</div>
          </div>

          <div className="bg-[#152233] border border-[#28527a] rounded-xl p-3">
            <div className="text-xs text-purple-300 font-bold">Le Casse-Cou du Sarasani</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1">
              {sortedByDrunk[1]?.avatar || '⛺'} {sortedByDrunk[1]?.name || '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Actif sur tous les fronts</div>
          </div>
        </div>

        {/* Tableau d'Honneur */}
        <div className="bg-[#152233] border border-[#28527a] rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
            📊 Tableau d'Honneur de la Maîtrise
          </h2>
          <div className="space-y-2">
            {players.map(p => {
              const totalChallenges = p.challengesWon + p.challengesLost
              const winPct = totalChallenges > 0 ? Math.round((p.challengesWon / totalChallenges) * 100) : 0
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0e1722] border border-[#28527a]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.avatar || '⛺'}</span>
                    <div>
                      <div className="font-display font-bold text-sm text-[#f3f4f6]">{p.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {winPct}% victoires ({p.challengesWon}/{totalChallenges})
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-sky-300">
                      🍺 {p.sipsDrunk} <span className="text-[10px] text-slate-400 font-normal">bues</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      🎯 {p.sipsGiven} distribuées
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="pt-6 pb-2 space-y-2">
        <button
          onClick={onRestart}
          className="w-full py-3 bg-[#32689c] hover:bg-[#3c7ab5] border border-[#28527a] text-[#f3f4f6] font-bold text-sm rounded-xl transition-colors"
        >
          🔄 Recommencer une nouvelle veillée
        </button>
        <a
          href={hubUrl}
          className="block w-full py-2.5 text-center text-xs font-semibold text-slate-400 hover:text-[#f3f4f6]"
        >
          ← Menu
        </a>
      </div>
    </div>
  )
}
