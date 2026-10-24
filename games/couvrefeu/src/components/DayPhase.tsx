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
  onOpenHelp,
}: DayPhaseProps) {
  const [selectedChiefId, setSelectedChiefId] = useState<string | null>(null)
  const [selectedCondemnedId, setSelectedCondemnedId] = useState<string | null>(null)
  const [isWhiteVote, setIsWhiteVote] = useState(false)
  const [revealedCondemnedPlayer, setRevealedCondemnedPlayer] = useState<AssignedPlayer | null>(null)

  const alivePlayers = players.filter(p => p.isAlive)
  const campChief = alivePlayers.find(p => p.isCampChief)

  // 1. Élection du Chef de Camp (Jour 1 uniquement si non élu)
  if (!hasCampChief) {
    return (
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-scout-amber/10 border border-scout-amber/30 flex items-center justify-center text-4xl shadow-lg">
            ⭐
          </div>
          <span className="text-xs font-bold text-scout-amber uppercase tracking-wider">
            Jour 1 — Rassemblement Spécial
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Élection du Chef de Camp
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Les patrouilles doivent choisir leur porte-parole officiel au mât des couleurs.
          </p>
        </div>

        <div className="glass-card p-5 sm:p-6 border-scout-amber/30 space-y-4 shadow-xl">
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « Scouts des patrouilles, débattez et procédez à l'élection de votre Chef de Camp à
              main levée ! Le vote du Chef de Camp fera foi pour trancher toute égalité lors des
              rassemblements. »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
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
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
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
            onClick={() => {
              if (selectedChiefId) onElectCampChief(selectedChiefId)
            }}
            disabled={!selectedChiefId}
            className="btn-amber w-full py-4 text-sm font-bold shadow-xl shadow-scout-amber/20 disabled:opacity-40"
          >
            Conférer l'insigne de Chef de Camp ➔
          </button>
        </div>
      </div>
    )
  }

  // Modale de révélation systématique du vote du rassemblement
  if (revealedCondemnedPlayer) {
    const roleDef = ROLES_DATA[revealedCondemnedPlayer.role]
    const isMaitrise = roleDef.camp === 'maitrise'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#111827] border-2 border-red-500/50 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-4xl animate-bounce">
            ⚖️
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
              Verdict du Rassemblement • Révélation Publique
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              Scout Exclu du Camp !
            </h2>
            <p className="text-xs sm:text-sm text-gray-300">
              Le rassemblement a tranché : <strong className="text-white">{revealedCondemnedPlayer.name}</strong> a
              reçu la majorité des voix et est exclu(e) du campement.
            </p>
          </div>

          {/* Révélation claire et visible du rôle */}
          <div
            className={`p-4 rounded-xl border-2 space-y-2 animate-fade-in shadow-xl ${
              isMaitrise
                ? 'bg-gradient-to-r from-red-950/60 to-black/60 border-red-500/50'
                : 'bg-gradient-to-r from-emerald-950/60 to-black/60 border-emerald-500/50'
            }`}
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-left">
              Véritable rôle révélé :
            </span>
            <div className="flex items-center gap-3 text-left">
              <span className="text-4xl p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
                {roleDef.icon}
              </span>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {revealedCondemnedPlayer.name} était :{' '}
                  <span className="text-scout-amber">{roleDef.name}</span>
                </h3>
                <span
                  className={`text-xs font-bold block ${
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
          </div>

          <button
            onClick={() => {
              const pid = revealedCondemnedPlayer.id
              setRevealedCondemnedPlayer(null)
              onEliminatePlayer(pid)
            }}
            className="btn-amber w-full py-4 text-sm font-bold shadow-xl shadow-scout-amber/20"
          >
            Confirmer la sentence et continuer ➔
          </button>
        </div>
      </div>
    )
  }

  // 2. Vote du Rassemblement
  return (
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* En-tête Rassemblement */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-scout-amber/10 border border-scout-amber/30 flex items-center justify-center text-lg">
            ⚖️
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white font-display">
              Jour {dayNumber} — Vote du Rassemblement
            </h1>
            <p className="text-xs text-gray-400">Rassemblement au Mât des Couleurs</p>
          </div>
        </div>

        <button
          onClick={onOpenHelp}
          className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 text-scout-amber"
        >
          <span>?</span>
          <span>Aide</span>
        </button>
      </div>

      {/* Rappel du Chef de Camp et égalité */}
      {campChief && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-lg">⭐</span>
            <span className="text-gray-300 truncate">
              Chef de Camp : <strong className="text-white">{campChief.name}</strong>
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
            Tranche les égalités
          </span>
        </div>
      )}

      {/* Carte du débat */}
      <div className="glass-card p-5 sm:p-6 border-white/10 space-y-5 shadow-xl">
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
          <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
            <span>🗣️</span> À réciter au groupe :
          </span>
          <p className="text-xs text-gray-200 italic leading-relaxed">
            « Le campement débat à voix haute ! Qui fait la ronde après l'extinction des feux ? Qui
            est membre de la Maîtrise ? Concertez-vous et votez pour exclure un suspect. »
          </p>
        </div>

        {/* Sélection du joueur condamné */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-300">
              Résultat du vote oral :
            </label>
            <span className="text-[11px] text-gray-400">
              {alivePlayers.length} scouts votants
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {/* Option vote blanc / personne */}
            <button
              type="button"
              onClick={() => {
                setIsWhiteVote(true)
                setSelectedCondemnedId(null)
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between col-span-2 sm:col-span-3 ${
                isWhiteVote
                  ? 'bg-blue-600/30 border-blue-400 text-blue-200 ring-1 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
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
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                    isSelected
                      ? 'bg-red-600/40 border-red-400 text-red-200 ring-1 ring-red-400/50'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
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

        {/* Bouton de confirmation du vote */}
        <button
          onClick={() => {
            if (isWhiteVote) {
              onEliminatePlayer(null)
            } else if (selectedCondemnedId) {
              const target = alivePlayers.find(p => p.id === selectedCondemnedId)
              if (target) {
                setRevealedCondemnedPlayer(target)
              }
            }
          }}
          disabled={!isWhiteVote && !selectedCondemnedId}
          className={`w-full py-4 text-sm font-bold shadow-xl transition-all ${
            isWhiteVote
              ? 'btn-amber shadow-scout-amber/20'
              : 'btn-danger shadow-red-900/30 disabled:opacity-40'
          }`}
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
