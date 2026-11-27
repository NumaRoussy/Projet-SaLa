import { useState } from 'react'
import type { Player } from '../types'
import { getRoleComposition, formatCompositionSummary } from '../data/roles'

interface SetupPhaseProps {
  players: Player[]
  onUpdatePlayers: (players: Player[]) => void
  onStartDistribution: () => void
  onOpenHelp: () => void
}

const MIN_PLAYERS = 8
const MAX_PLAYERS = 20

export function SetupPhase({
  players,
  onUpdatePlayers,
  onStartDistribution,
  onOpenHelp,
}: SetupPhaseProps) {
  const [newPlayerName, setNewPlayerName] = useState('')
  const [dupNotice, setDupNotice] = useState(false)

  const count = players.length
  const isValidCount = count >= MIN_PLAYERS && count <= MAX_PLAYERS
  const comp = getRoleComposition(count)
  const summaryParts = formatCompositionSummary(comp)

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed || count >= MAX_PLAYERS) return
    if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setDupNotice(true)
      return
    }
    setDupNotice(false)
    const updated = [
      ...players,
      { id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, name: trimmed },
    ]
    onUpdatePlayers(updated)
    setNewPlayerName('')
  }

  const handleRemovePlayer = (id: string) => {
    onUpdatePlayers(players.filter(p => p.id !== id))
  }

  const handleClearPlayers = () => {
    onUpdatePlayers([])
    setDupNotice(false)
  }

  const handleAddDemoPlayers = () => {
    const demoNames = [
      'Bastien',
      'Camille',
      'Éléonore',
      'Gaétan',
      'Juliette',
      'Loïc',
      'Mathieu',
      'Noémie',
      'Romain',
      'Sophie',
    ]
    const updated = demoNames.map((name, i) => ({
      id: `demo_${Date.now()}_${i}`,
      name,
    }))
    onUpdatePlayers(updated)
  }

  return (
    <div className="flex-1 flex flex-col max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5">
      {/* Bannière */}
      <div className="text-center space-y-1.5 pt-1">
        <h2 className="text-2xl font-extrabold text-[#f3f4f6] font-display tracking-tight">
          Préparez la veillée
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Rôles secrets et déduction au camp scout. La Maîtrise rôde après l'extinction des feux !
        </p>
      </div>

      {/* Gestionnaire de joueurs (déplié par défaut) */}
      <div className="glass-card p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              Joueurs ({count} / {MAX_PLAYERS})
            </h3>
            <span className="text-[11px] text-slate-400">De {MIN_PLAYERS} à {MAX_PLAYERS} scouts</span>
          </div>
          <div className="flex items-center gap-2">
            {count === 0 && (
              <button
                type="button"
                onClick={handleAddDemoPlayers}
                className="text-xs text-slate-300 hover:text-[#f3f4f6] hover:underline font-medium"
              >
                Remplir (10 démo)
              </button>
            )}
            {count > 0 && (
              <button
                type="button"
                onClick={handleClearPlayers}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16181d] hover:bg-[#262a33] border border-[#9b2c37] text-red-200 text-xs font-semibold transition-colors"
              >
                <span>🗑️</span>
                <span>Vider</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleAddPlayer} className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={e => {
              setNewPlayerName(e.target.value)
              if (dupNotice) setDupNotice(false)
            }}
            placeholder="Prénom du scout (ex: Bastien)..."
            className="input-scout flex-1"
            maxLength={25}
            disabled={count >= MAX_PLAYERS}
          />
          <button
            type="submit"
            disabled={!newPlayerName.trim() || count >= MAX_PLAYERS}
            className="btn-primary py-2.5 px-4 shrink-0"
          >
            + Ajouter
          </button>
        </form>

        {dupNotice && (
          <p className="text-xs text-red-300">Ce prénom est déjà dans la liste.</p>
        )}

        {count > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-400 font-mono text-[10px] w-4">{idx + 1}.</span>
                  <span className="font-semibold text-[#f3f4f6] truncate">{p.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePlayer(p.id)}
                  className="text-slate-400 hover:text-red-300 transition-colors p-0.5"
                  title="Retirer"
                  aria-label={`Supprimer ${p.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5 text-slate-400 text-xs border border-dashed border-[#2e323c] rounded-xl bg-[#16181d]">
            Aucun scout inscrit. Ajoutez entre {MIN_PLAYERS} et {MAX_PLAYERS} prénoms pour débuter.
          </div>
        )}
      </div>

      {/* Composition dynamique du Meneur */}
      <div className="glass-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider font-display">
            Composition de la partie
          </h2>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isValidCount
                ? 'bg-[#16181d] text-emerald-300 border-[#2e6f56]'
                : 'bg-[#16181d] text-[#e5be6d] border-[#b5892e]'
            }`}
          >
            {count} / {MAX_PLAYERS} Joueurs
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {summaryParts.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1f2229] border border-[#2e323c] text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="pt-2 border-t border-[#2e323c] flex items-center justify-between text-[11px] text-slate-400">
            <span>Chef de Camp : élu le Jour 1</span>
            <button
              type="button"
              onClick={onOpenHelp}
              className="text-slate-200 hover:text-[#f3f4f6] hover:underline font-semibold flex items-center gap-1"
            >
              <span>Détails des pouvoirs</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {!isValidCount && (
          <div className="p-3 rounded-xl bg-[#16181d] border border-[#b5892e] text-[#e5be6d] text-xs">
            {count < MIN_PLAYERS
              ? `Il vous manque encore ${MIN_PLAYERS - count} scout(s) pour lancer la partie (${MIN_PLAYERS} joueurs minimum).`
              : `Le jeu accepte au maximum ${MAX_PLAYERS} joueurs.`}
          </div>
        )}
      </div>

      {/* Bouton de lancement */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onStartDistribution}
          disabled={!isValidCount}
          className="btn-primary w-full font-display"
        >
          Lancer la distribution des cartes
        </button>
      </div>
    </div>
  )
}
