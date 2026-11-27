import type { Player } from '../types'
import { getHubUrl } from '../services/cookies'

interface Props {
  players: Player[]
  totalRounds: number
  onRestart: () => void
}

export function DebriefingStats({ players, totalRounds, onRestart }: Props) {
  const hubUrl = getHubUrl()

  const sortedByDrunkDesc = [...players].sort((a, b) => b.sipsDrunk - a.sipsDrunk)
  const sortedByDrunkAsc = [...players].sort((a, b) => a.sipsDrunk - b.sipsDrunk)

  const challengeParticipants = players.filter(p => p.challengesWon + p.challengesLost > 0)
  const sortedByWinRate = [...challengeParticipants].sort((a, b) => {
    const rateA = a.challengesWon / (a.challengesWon + a.challengesLost)
    const rateB = b.challengesWon / (b.challengesWon + b.challengesLost)
    if (rateB !== rateA) return rateB - rateA
    return b.challengesWon - a.challengesWon
  })

  const sortedByLostDesc = [...players].sort((a, b) => b.challengesLost - a.challengesLost)

  const vachaoPercee = sortedByDrunkDesc[0]
  const ptitGodet = sortedByDrunkAsc[0]
  const intouchable = sortedByWinRate[0]
  const calimero = sortedByLostDesc[0]

  const intouchableTotal = intouchable ? intouchable.challengesWon + intouchable.challengesLost : 0
  const intouchablePct =
    intouchable && intouchableTotal > 0
      ? Math.round((intouchable.challengesWon / intouchableTotal) * 100)
      : 0

  return (
    <div className="min-h-screen bg-[#16181d] text-[#f3f4f6] p-4 max-w-lg mx-auto flex flex-col justify-between">
      <div className="space-y-5">
        <div className="text-center pt-4">
          <h1 className="font-display font-black text-2xl tracking-wide text-[#f3f4f6]">
            Débriefing de Veillée Vachao
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {totalRounds} tours joués · Bilan officiel de la maîtrise
          </p>
        </div>

        {/* 4 Titres honorifiques validés */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#1f2229] border border-[#9b2c37] rounded-xl p-3">
            <div className="text-xs text-[#e88c95] font-bold">La Vachao Percée</div>
            <div className="text-[10px] text-slate-400 italic">(record de gorgées)</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1.5 truncate">
              {vachaoPercee?.name || '-'}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {vachaoPercee?.sipsDrunk || 0} gorgée{(vachaoPercee?.sipsDrunk || 0) > 1 ? 's' : ''} bue{(vachaoPercee?.sipsDrunk || 0) > 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-[#1f2229] border border-[#2d6394] rounded-xl p-3">
            <div className="text-xs text-[#8ec2eb] font-bold">Le P'tit Godet</div>
            <div className="text-[10px] text-slate-400 italic">(le plus sobre)</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1.5 truncate">
              {ptitGodet?.name || '-'}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {ptitGodet?.sipsDrunk || 0} gorgée{(ptitGodet?.sipsDrunk || 0) > 1 ? 's' : ''} bue{(ptitGodet?.sipsDrunk || 0) > 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-[#1f2229] border border-[#2e6f56] rounded-xl p-3">
            <div className="text-xs text-emerald-300 font-bold">L'Intouchable</div>
            <div className="text-[10px] text-slate-400 italic">(invaincu aux défis)</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1.5 truncate">
              {intouchable?.name || '-'}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {intouchable
                ? `${intouchablePct}% (${intouchable.challengesWon}/${intouchableTotal})`
                : 'Aucun défi disputé'}
            </div>
          </div>

          <div className="bg-[#1f2229] border border-[#b5892e] rounded-xl p-3">
            <div className="text-xs text-[#e5be6d] font-bold">Caliméro</div>
            <div className="text-[10px] text-slate-400 italic">(abonné aux gages)</div>
            <div className="font-display font-bold text-sm text-[#f3f4f6] mt-1.5 truncate">
              {calimero && calimero.challengesLost > 0 ? calimero.name : '-'}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {calimero && calimero.challengesLost > 0
                ? `${calimero.challengesLost} défi${calimero.challengesLost > 1 ? 's' : ''} perdu${calimero.challengesLost > 1 ? 's' : ''}`
                : 'Aucun gage subi'}
            </div>
          </div>
        </div>

        {/* Récapitulatif par joueur */}
        <div className="bg-[#1f2229] border border-[#2e323c] rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
            Statistiques par joueur
          </h2>
          <div className="space-y-2">
            {sortedByDrunkDesc.map(p => {
              const totalChallenges = p.challengesWon + p.challengesLost
              const winPct = totalChallenges > 0 ? Math.round((p.challengesWon / totalChallenges) * 100) : 0
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#16181d] border border-[#2e323c]"
                >
                  <div>
                    <div className="font-display font-bold text-sm text-[#f3f4f6]">{p.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {p.challengesWon} gagné{p.challengesWon > 1 ? 's' : ''} · {p.challengesLost} perdu{p.challengesLost > 1 ? 's' : ''}
                      {totalChallenges > 0 ? ` (${winPct}%)` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-[#8ec2eb]">
                      🍺 {p.sipsDrunk} <span className="text-[10px] text-slate-400 font-normal">bues</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="pt-6 pb-2 space-y-2">
        <button
          onClick={onRestart}
          className="btn-primary w-full"
        >
          Recommencer une nouvelle veillée
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
