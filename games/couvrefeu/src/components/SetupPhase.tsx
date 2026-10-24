import { useState } from 'react'
import type { Player } from '../types'
import { getRoleComposition, formatCompositionSummary, ROLES_DATA } from '../data/roles'

interface SetupPhaseProps {
  players: Player[]
  onUpdatePlayers: (players: Player[]) => void
  onStartDistribution: () => void
  onOpenHelp: () => void
}

export function SetupPhase({
  players,
  onUpdatePlayers,
  onStartDistribution,
  onOpenHelp,
}: SetupPhaseProps) {
  const [newPlayerName, setNewPlayerName] = useState('')

  const count = players.length
  const isValidCount = count >= 8 && count <= 20
  const comp = getRoleComposition(count)
  const summaryParts = formatCompositionSummary(comp)

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Un joueur avec ce prénom est déjà inscrit !')
      return
    }
    const updated = [...players, { id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, name: trimmed }]
    onUpdatePlayers(updated)
    setNewPlayerName('')
  }

  const handleRemovePlayer = (id: string) => {
    onUpdatePlayers(players.filter(p => p.id !== id))
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
    <div className="flex-1 flex flex-col max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Bannière de bienvenue */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-scout-amber/10 border border-scout-amber/30 text-3xl shadow-lg shadow-scout-amber/5">
          ⛺
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
          Couvre-feu
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto">
          Rôles secrets et déduction au camp scout. La Maîtrise rôde après l'extinction des feux !
        </p>
      </div>

      {/* Composition dynamique du Meneur */}
      <div className="glass-card p-4 sm:p-5 border-scout-amber/20 bg-gradient-to-b from-[#111827]/90 to-[#0b0f19]/90 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <h2 className="text-xs sm:text-sm font-bold text-scout-amber uppercase tracking-wider font-display">
              Index du Meneur & Composition
            </h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isValidCount
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {count} / 20 Joueurs
          </span>
        </div>

        {/* Message d'aide orale pour le meneur */}
        <p className="text-xs text-gray-400">
          À lire au rassemblement avant de distribuer les rôles :
        </p>

        {/* Récapitulatif clair de la composition exacte */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {summaryParts.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
            <span>⭐ Chef de Camp : élu le Jour 1</span>
            <button
              onClick={onOpenHelp}
              className="text-scout-amber hover:underline font-semibold flex items-center gap-1"
            >
              <span>Détails des pouvoirs</span> ➔
            </button>
          </div>
        </div>

        {/* Avertissement nombre de joueurs */}
        {!isValidCount && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <p>
              {count < 8
                ? `Il vous manque encore ${8 - count} scout(s) pour lancer la partie (8 joueurs minimum).`
                : 'Le jeu accepte au maximum 20 joueurs.'}
            </p>
          </div>
        )}
      </div>

      {/* Gestion des joueurs */}
      <div className="glass-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
            Effectif des Tentes ({count})
          </h3>
          {count === 0 && (
            <button
              type="button"
              onClick={handleAddDemoPlayers}
              className="text-xs text-scout-pale hover:text-white underline"
            >
              Remplir (10 joueurs démo)
            </button>
          )}
        </div>

        {/* Formulaire ajout rapide */}
        <form onSubmit={handleAddPlayer} className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            placeholder="Prénom du scout (ex: Bastien)..."
            className="input-scout flex-1"
            maxLength={20}
          />
          <button
            type="submit"
            disabled={!newPlayerName.trim() || count >= 20}
            className="btn-amber px-4 py-2.5 shrink-0"
          >
            + Ajouter
          </button>
        </form>

        {/* Liste des scouts */}
        {count > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs group hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-gray-500 font-mono text-[10px] w-4">
                    {idx + 1}.
                  </span>
                  <span className="font-semibold text-white truncate">{p.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePlayer(p.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-xs border border-dashed border-white/10 rounded-xl">
            Aucun scout inscrit. Saisissez au moins 8 prénoms pour débuter.
          </div>
        )}
      </div>

      {/* Bouton de lancement */}
      <div className="pt-2">
        <button
          onClick={onStartDistribution}
          disabled={!isValidCount}
          className="w-full py-4 rounded-xl font-bold text-base font-display tracking-wide
                     bg-gradient-to-r from-scout-amber to-scout-orange text-scout-night
                     hover:brightness-110 active:scale-[0.98] transition-all duration-200
                     shadow-lg shadow-scout-amber/20 disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2.5"
        >
          <span>🃏</span>
          <span>Lancer la distribution des cartes</span>
        </button>
      </div>
    </div>
  )
}
