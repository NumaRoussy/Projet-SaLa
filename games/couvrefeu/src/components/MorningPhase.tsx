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
  onOpenHelp,
}: MorningPhaseProps) {
  const hasVictims = report.eliminatedPlayers.length > 0
  const deadChief = report.eliminatedPlayers.find(p => p.isCampChief)
  const alivePlayers = players.filter(p => p.isAlive)

  // Gestion de la succession du Chef de Camp au matin
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
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* En-tête Matinal */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/10">
          ☀️
        </div>
        <span className="text-xs font-bold text-scout-amber uppercase tracking-wider">
          Matin de la Nuit {report.nightNumber}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
          Le Lever du Soleil au Camp
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          Le clairon réveille les patrouilles... Voici le bilan officiel des rondes nocturnes.
        </p>
      </div>

      {/* Résumé des faits & Révélation publique */}
      <div className="glass-card p-5 sm:p-6 border-white/10 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Bilan & Révélations Publiques
          </span>
          <button
            onClick={onOpenHelp}
            className="text-xs text-scout-amber hover:underline flex items-center gap-1"
          >
            <span>?</span> Guide rôles
          </button>
        </div>

        {!hasVictims ? (
          /* Nuit paisible sans victime */
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2 animate-fade-in">
            <span className="text-4xl block">🕊️</span>
            <h3 className="text-base sm:text-lg font-bold text-emerald-300 font-display">
              Nuit paisible sur le campement !
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed max-w-sm mx-auto">
              {report.cuistoSaved || report.pharmacieSaved
                ? "Une attaque a eu lieu mais les secours du Cuisto ou de la Pharmacie ont sauvé la victime ! Aucun scout n'a été éliminé."
                : "Aucun scout n'a été éliminé cette nuit. Tous les feux étaient bien gardés."}
            </p>
          </div>
        ) : (
          /* Victimes éliminées avec révélation publique systématique et obligatoire */
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
              <strong className="block mb-0.5 text-white">Rassemblement d'urgence :</strong>
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
                    className={`p-4 rounded-xl border-2 flex items-center gap-4 animate-fade-in shadow-lg ${
                      isMaitrise
                        ? 'bg-gradient-to-r from-red-950/60 to-black/60 border-red-500/50'
                        : 'bg-gradient-to-r from-emerald-950/60 to-black/60 border-emerald-500/50'
                    }`}
                  >
                    <span className="text-4xl p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
                      {roleDef.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-white truncate">
                          {player.name}
                        </h3>
                        {player.isCampChief && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-scout-amber/20 text-scout-amber font-bold border border-scout-amber/40">
                            ⭐ Chef de Camp sortant
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30 shrink-0">
                          Éliminé
                        </span>
                      </div>

                      <p className="text-sm font-extrabold text-scout-amber mt-1">
                        {player.name} était : {roleDef.name}
                      </p>

                      <span
                        className={`text-[11px] font-semibold block ${
                          isMaitrise ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {roleDef.campLabel}
                      </span>
                      <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-1">
                        {roleDef.shortDesc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SECTION SUCCESSION DU CHEF DE CAMP AU MATIN ──────────────── */}
        {deadChief && alivePlayers.length > 0 && (
          <div className="p-4 rounded-xl bg-[#111827] border-2 border-scout-amber/40 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h3 className="text-xs sm:text-sm font-bold text-scout-amber uppercase tracking-wider font-display">
                Passation du Chef de Camp au Matin
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Le Chef de Camp sortant <strong className="text-white">{deadChief.name}</strong> a péri cette nuit.
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
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-600/40 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
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
                  className="btn-amber w-full py-2.5 text-xs font-bold disabled:opacity-40"
                >
                  Conférer l'insigne de Chef de Camp ➔
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <span>✅</span>
                <span>
                  Succession enregistrée :{' '}
                  <strong className="text-white">
                    {players.find(p => p.id === appointedChiefId)?.name}
                  </strong>{' '}
                  est le nouveau Chef de Camp ! ⭐
                </span>
              </div>
            )}
          </div>
        )}

        {/* Détails du journal des rondes */}
        {report.details.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Journal des rondes
            </span>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              {report.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Bouton de passage au rassemblement */}
      <button
        onClick={onProceedToDay}
        disabled={isSuccessionPending}
        className="w-full py-4 rounded-xl font-bold text-base font-display tracking-wide
                   bg-gradient-to-r from-scout-amber to-scout-orange text-scout-night
                   hover:brightness-110 active:scale-[0.98] transition-all duration-200
                   shadow-xl shadow-scout-amber/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
