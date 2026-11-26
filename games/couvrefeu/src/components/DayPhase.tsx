import { useState } from 'react'
import type { AssignedPlayer } from '../types'
import { ROLES_DATA } from '../data/roles'

interface DayPhaseProps {
  dayNumber: number
  players: AssignedPlayer[]
  hasCampChief: boolean
  onElectCampChief: (playerId: string) => void
  onEliminatePlayer: (playerId: string | null) => void
  onOpenHelp: () => void
}

export function DayPhase({
  dayNumber,
  players,
  hasCampChief,
  onElectCampChief,
  onEliminatePlayer,
}: DayPhaseProps) {
  const [selectedChiefId, setSelectedChiefId] = useState<string | null>(null)
  const [selectedCondemnedId, setSelectedCondemnedId] = useState<string | null>(null)
  const [isWhiteVote, setIsWhiteVote] = useState(false)
  const [revealedCondemnedPlayer, setRevealedCondemnedPlayer] = useState<AssignedPlayer | null>(null)

  const alivePlayers = players.filter(p => p.isAlive)
  const campChief = alivePlayers.find(p => p.isCampChief)

  if (!hasCampChief) {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#172036] border border-[#34497a] flex items-center justify-center text-4xl">
            ⭐
          </div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Jour 1 — Rassemblement Spécial
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6] font-display">
            Élection du Chef de Camp
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Les patrouilles doivent choisir leur porte-parole officiel au mât des couleurs.
          </p>
        </div>

        <div className="glass-card p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#101626] border border-[#34497a] space-y-1.5">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « Scouts des patrouilles, débattez et procédez à l'élection de votre Chef de Camp à
              main levée ! Le vote du Chef de Camp fera foi pour trancher toute égalité lors des
              rassemblements. »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Sélectionnez le scout élu Chef de Camp :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isSelected = selectedChiefId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedChiefId(p.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#261d12] border-[#966530] text-amber-200'
                        : 'bg-[#101626] border-[#34497a] text-slate-200 hover:bg-[#1e2a45]'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>⭐</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedChiefId) onElectCampChief(selectedChiefId)
            }}
            disabled={!selectedChiefId}
            className="btn-amber w-full py-4 text-sm font-bold"
          >
            Conférer l'insigne de Chef de Camp ➔
          </button>
        </div>
      </div>
    )
  }

  if (revealedCondemnedPlayer) {
    const roleDef = ROLES_DATA[revealedCondemnedPlayer.role]
    const isMaitrise = roleDef.camp === 'maitrise'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#172036] border-2 border-[#7f2d38] text-center space-y-5 text-[#f3f4f6]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2b171b] border border-[#7f2d38] flex items-center justify-center text-4xl">
            ⚖️
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2b171b] text-red-200 border border-[#7f2d38] uppercase tracking-wider">
              Verdict du Rassemblement • Révélation Publique
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
              Scout Exclu du Camp !
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Le rassemblement a tranché : <strong className="text-[#f3f4f6]">{revealedCondemnedPlayer.name}</strong> a
              reçu la majorité des voix et est exclu(e) du campement.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border-2 space-y-2 ${
              isMaitrise ? 'bg-[#2b171b] border-[#7f2d38]' : 'bg-[#122620] border-[#2d6a4f]'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
              Véritable rôle révélé :
            </span>
            <div className="flex items-center gap-3 text-left">
              <span className="text-4xl p-2 rounded-xl bg-[#101626] border border-[#34497a] shrink-0">
                {roleDef.icon}
              </span>
              <div>
                <h3 className="font-extrabold text-[#f3f4f6] text-base">
                  {revealedCondemnedPlayer.name} était :{' '}
                  <span className="text-amber-300">{roleDef.name}</span>
                </h3>
                <span className={`text-xs font-bold block ${isMaitrise ? 'text-red-300' : 'text-emerald-300'}`}>
                  {roleDef.campLabel}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                  {roleDef.shortDesc}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const pid = revealedCondemnedPlayer.id
              setRevealedCondemnedPlayer(null)
              onEliminatePlayer(pid)
            }}
            className="btn-amber w-full py-4 text-sm font-bold"
          >
            Confirmer la sentence et continuer ➔
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-[#172036] border border-[#34497a] flex items-center justify-center text-lg">
          ⚖️
        </span>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#f3f4f6] font-display">
            Jour {dayNumber} — Vote du Rassemblement
          </h2>
          <p className="text-xs text-slate-400">Rassemblement au Mât des Couleurs</p>
        </div>
      </div>

      {campChief && (
        <div className="p-3.5 rounded-xl bg-[#261d12] border border-[#785127] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-lg">⭐</span>
            <span className="text-amber-200 truncate">
              Chef de Camp : <strong className="text-[#f3f4f6]">{campChief.name}</strong>
            </span>
          </div>
          <span className="text-[10px] text-amber-200 font-semibold bg-[#172036] border border-[#785127] px-2 py-0.5 rounded-full shrink-0">
            Tranche les égalités
          </span>
        </div>
      )}

      <div className="glass-card p-5 sm:p-6 space-y-5">
        <div className="p-3.5 rounded-xl bg-[#101626] border border-[#34497a] space-y-1.5">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🗣️</span> À réciter au groupe :
          </span>
          <p className="text-xs text-slate-300 italic leading-relaxed">
            « Le campement débat à voix haute ! Qui fait la ronde après l'extinction des feux ? Qui
            est membre de la Maîtrise ? Concertez-vous et votez pour exclure un suspect. »
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Résultat du vote oral :
            </label>
            <span className="text-[11px] text-slate-400">{alivePlayers.length} scouts votants</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setIsWhiteVote(true)
                setSelectedCondemnedId(null)
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between col-span-2 sm:col-span-3 transition-colors ${
                isWhiteVote
                  ? 'bg-[#142336] border-[#32689c] text-sky-200'
                  : 'bg-[#101626] border-[#34497a] text-slate-200 hover:bg-[#1e2a45]'
              }`}
            >
              <span>🕊️ Aucun joueur éliminé (Égalité ou Vote Blanc)</span>
              {isWhiteVote && <span>✓</span>}
            </button>

            {alivePlayers.map(p => {
              const isSelected = selectedCondemnedId === p.id && !isWhiteVote
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setIsWhiteVote(false)
                    setSelectedCondemnedId(p.id)
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#2b171b] border-[#7f2d38] text-red-200'
                      : 'bg-[#101626] border-[#34497a] text-slate-200 hover:bg-[#1e2a45]'
                  }`}
                >
                  <div className="truncate flex items-center gap-1.5">
                    {p.isCampChief && <span title="Chef de Camp">⭐</span>}
                    <span className="truncate">{p.name}</span>
                  </div>
                  {isSelected && <span>🚫</span>}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isWhiteVote) {
              onEliminatePlayer(null)
            } else if (selectedCondemnedId) {
              const target = alivePlayers.find(p => p.id === selectedCondemnedId)
              if (target) setRevealedCondemnedPlayer(target)
            }
          }}
          disabled={!isWhiteVote && !selectedCondemnedId}
          className={`w-full py-4 text-sm font-bold ${isWhiteVote ? 'btn-amber' : 'btn-danger'}`}
        >
          {isWhiteVote
            ? 'Clôturer le rassemblement sans condamnation ➔'
            : `Condamner et révéler le rôle de ${
                alivePlayers.find(p => p.id === selectedCondemnedId)?.name || ''
              } ➔`}
        </button>
      </div>
    </div>
  )
}
