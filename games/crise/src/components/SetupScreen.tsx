import { useState } from 'react'
import type { CrisisPlayer } from '../types'

interface Props {
  players: CrisisPlayer[]
  onAddPlayer: (name: string) => void
  onRemovePlayer: (id: string) => void
  onClearPlayers: () => void
  onStartGame: () => void
}

export function SetupScreen({
  players,
  onAddPlayer,
  onRemovePlayer,
  onClearPlayers,
  onStartGame,
}: Props) {
  const [newName, setNewName] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    onAddPlayer(newName.trim())
    setNewName('')
  }

  const canStart = players.length >= 2

  return (
    <div className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col justify-between space-y-6">
      <div className="space-y-5">
        {/* Gestionnaire de joueurs (déplié par défaut) */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <label className="text-xs font-mono font-bold tracking-wider text-[#e88c95] uppercase block">
                Responsables évalués ({players.length})
              </label>
              <span className="text-[11px] text-slate-400">Minimum 2 joueurs</span>
            </div>
            {players.length > 0 && (
              <button
                type="button"
                onClick={onClearPlayers}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16181d] hover:bg-[#262a33] border border-[#9b2c37] text-red-200 text-xs font-semibold transition-colors"
              >
                <span>🗑️</span>
                <span>Vider</span>
              </button>
            )}
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Prénom ou Totem du responsable..."
              className="input-scout flex-1 py-2"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="btn-primary py-2 px-4 text-sm"
            >
              + Ajouter
            </button>
          </form>

          {players.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-0.5">
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 bg-[#16181d] border border-[#2e323c] rounded-full pl-3 pr-2 py-1 text-xs text-[#f3f4f6]"
                >
                  <span className="font-semibold">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(p.id)}
                    aria-label={`Supprimer ${p.name}`}
                    className="w-4 h-4 rounded-full bg-[#1f2229] hover:bg-[#9b2c37] text-slate-300 hover:text-[#f3f4f6] flex items-center justify-center text-[10px] ml-0.5 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Aucun responsable inscrit. Ajoutez au moins 2 prénoms pour lancer l'évaluation.
            </p>
          )}
        </div>

        {/* Briefing */}
        <div className="bg-[#1f2229] border border-[#9b2c37] rounded-2xl p-4 space-y-3">
          <div className="text-xs font-mono font-bold text-[#e88c95] uppercase tracking-wider">
            Évaluation Swiss Olympic
          </div>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-300 font-bold">0.0% :</span>
              <span>Tous les responsables commencent conformes avec un dossier vierge.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e88c95] font-bold">10.0% :</span>
              <span><strong>Seuil d'élimination immédiat.</strong> Le responsable est exclu du campement.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e5be6d] font-bold">Malus :</span>
              <span>Certaines sanctions infligent des malus permanents sur les tours suivants.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-200 font-bold">Top 1 :</span>
              <span>Le dernier responsable survivant est sacré <strong>Coach J+S</strong>.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bouton Lancement */}
      <div className="pt-2 pb-2">
        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStart}
          className="btn-primary w-full font-display"
        >
          {canStart
            ? 'Appeler la Cellule de crise'
            : "Ajoutez au moins 2 responsables pour lancer l'évaluation"}
        </button>
      </div>
    </div>
  )
}
