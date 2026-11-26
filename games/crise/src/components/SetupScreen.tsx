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
              <label className="text-xs font-mono font-bold tracking-wider text-red-400 uppercase block">
                Responsables évalués ({players.length})
              </label>
              <span className="text-[11px] text-gray-400">Minimum 2 joueurs</span>
            </div>
            {players.length > 0 && (
              <button
                type="button"
                onClick={onClearPlayers}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-700/50 text-red-300 text-xs font-semibold transition-colors"
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
                  className="flex items-center gap-1.5 bg-[#0d1016] border border-[#2a2f3d] rounded-full pl-2.5 pr-1.5 py-1 text-xs text-gray-200"
                >
                  <span>{p.avatar || '👮'}</span>
                  <span className="font-semibold">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(p.id)}
                    aria-label={`Supprimer ${p.name}`}
                    className="w-4 h-4 rounded-full bg-[#161922] hover:bg-[#8c2d38] text-slate-300 hover:text-[#f3f4f6] flex items-center justify-center text-[10px] ml-0.5 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">
              Aucun responsable inscrit. Ajoutez au moins 2 prénoms pour lancer l'évaluation.
            </p>
          )}
        </div>

        {/* Briefing */}
        <div className="bg-[#161922] border border-red-900/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
            <span>📋</span>
            <span>Évaluation Swiss Olympic</span>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">0.0% :</span>
              <span>Tous les responsables commencent conformes avec un dossier vierge.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">10.0% :</span>
              <span><strong>Seuil d'élimination immédiat.</strong> Le responsable est exclu du campement.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">⚠️ Malus :</span>
              <span>Certaines sanctions infligent des malus permanents sur les tours suivants.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">🏆 Top 1 :</span>
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
          className="btn-primary w-full py-4 text-base font-bold font-display"
        >
          {canStart
            ? 'Appeler la Cellule de crise 🚨'
            : "Ajoutez au moins 2 responsables pour lancer l'évaluation"}
        </button>
      </div>
    </div>
  )
}
