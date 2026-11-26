import { useState } from 'react'
import type { NightReport, AssignedPlayer } from '../types'
import { ROLES_DATA } from '../data/roles'

interface MorningPhaseProps {
  report: NightReport
  players: AssignedPlayer[]
  onAppointNewChief: (newChiefId: string) => void
  onProceedToDay: () => void
  onOpenHelp: () => void
}

export function MorningPhase({
  report,
  players,
  onAppointNewChief,
  onProceedToDay,
}: MorningPhaseProps) {
  const hasVictims = report.eliminatedPlayers.length > 0
  const deadChief = report.eliminatedPlayers.find(p => p.isCampChief)
  const alivePlayers = players.filter(p => p.isAlive)

  const [selectedNewChiefId, setSelectedNewChiefId] = useState<string | null>(null)
  const [appointedChiefId, setAppointedChiefId] = useState<string | null>(null)

  const isSuccessionPending = Boolean(deadChief && !appointedChiefId && alivePlayers.length > 0)

  const handleConfirmChief = () => {
    if (selectedNewChiefId) {
      onAppointNewChief(selectedNewChiefId)
      setAppointedChiefId(selectedNewChiefId)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#172036] border border-[#34497a] flex items-center justify-center text-4xl">
          ☀️
        </div>
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          Matin de la Nuit {report.nightNumber}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6] font-display">
          Le Lever du Soleil au Camp
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Le clairon réveille les patrouilles... Voici le bilan officiel des rondes nocturnes.
        </p>
      </div>

      <div className="glass-card p-5 sm:p-6 space-y-5">
        <div className="border-b border-[#34497a] pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Bilan &amp; Révélations Publiques
          </span>
        </div>

        {!hasVictims ? (
          <div className="p-5 rounded-2xl bg-[#122620] border border-[#2d6a4f] text-center space-y-2">
            <span className="text-4xl block">🕊️</span>
            <h3 className="text-base sm:text-lg font-bold text-emerald-200 font-display">
              Nuit paisible sur le campement !
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-sm mx-auto">
              {report.cuistoSaved || report.pharmacieSaved
                ? "Une attaque a eu lieu mais les secours du Cuisto ou de la Pharmacie ont sauvé la victime ! Aucun scout n'a été éliminé."
                : "Aucun scout n'a été éliminé cette nuit. Tous les feux étaient bien gardés."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#2b171b] border border-[#7f2d38] text-red-200 text-xs">
              <strong className="block mb-0.5">Rassemblement d'urgence :</strong>
              {report.eliminatedPlayers.length === 1
                ? '1 scout a été éliminé cette nuit ! Son rôle secret est révélé à tous :'
                : `${report.eliminatedPlayers.length} scouts ont été éliminés cette nuit ! Leurs rôles secrets sont révélés à tous :`}
            </div>

            <div className="space-y-3">
              {report.eliminatedPlayers.map(player => {
                const roleDef = ROLES_DATA[player.role]
                const isMaitrise = roleDef.camp === 'maitrise'

                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl border-2 flex items-center gap-4 ${
                      isMaitrise ? 'bg-[#2b171b] border-[#7f2d38]' : 'bg-[#122620] border-[#2d6a4f]'
                    }`}
                  >
                    <span className="text-4xl p-2 rounded-xl bg-[#101626] border border-[#34497a] shrink-0">
                      {roleDef.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-[#f3f4f6] truncate">
                          {player.name}
                        </h3>
                        {player.isCampChief && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#261d12] text-amber-200 font-bold border border-[#785127]">
                            ⭐ Chef de Camp sortant
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2b171b] text-red-200 font-bold border border-[#7f2d38] shrink-0">
                          Éliminé
                        </span>
                      </div>

                      <p className="text-sm font-extrabold text-amber-300 mt-1">
                        {player.name} était : {roleDef.name}
                      </p>

                      <span
                        className={`text-[11px] font-semibold block ${
                          isMaitrise ? 'text-red-300' : 'text-emerald-300'
                        }`}
                      >
                        {roleDef.campLabel}
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                        {roleDef.shortDesc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {deadChief && alivePlayers.length > 0 && (
          <div className="p-4 rounded-xl bg-[#101626] border-2 border-[#785127] space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h3 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider font-display">
                Passation du Chef de Camp au Matin
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Le Chef de Camp sortant <strong className="text-[#f3f4f6]">{deadChief.name}</strong> a péri cette nuit.
              Dans son dernier souffle au réveil des tentes, il désigne à l'oral son successeur :
            </p>

            {!appointedChiefId ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {alivePlayers.map(p => {
                    const isSelected = selectedNewChiefId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedNewChiefId(p.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#261d12] border-[#966530] text-amber-200'
                            : 'bg-[#172036] border-[#34497a] text-slate-200 hover:bg-[#1e2a45]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <span>⭐</span>}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmChief}
                  disabled={!selectedNewChiefId}
                  className="btn-amber w-full py-2.5 text-xs font-bold"
                >
                  Conférer l'insigne de Chef de Camp ➔
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#122620] border border-[#2d6a4f] text-xs text-emerald-200 flex items-center gap-2">
                <span>✅</span>
                <span>
                  Succession enregistrée :{' '}
                  <strong className="text-[#f3f4f6]">
                    {players.find(p => p.id === appointedChiefId)?.name}
                  </strong>{' '}
                  est le nouveau Chef de Camp ! ⭐
                </span>
              </div>
            )}
          </div>
        )}

        {report.details.length > 0 && (
          <div className="pt-2 border-t border-[#34497a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Journal des rondes
            </span>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              {report.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onProceedToDay}
        disabled={isSuccessionPending}
        className="btn-amber w-full py-4 text-base font-bold font-display"
      >
        <span>🚩</span>
        <span>
          {isSuccessionPending
            ? 'Désignez le nouveau Chef de Camp ci-dessus'
            : 'Passer au Rassemblement & Votes'}
        </span>
      </button>
    </div>
  )
}
