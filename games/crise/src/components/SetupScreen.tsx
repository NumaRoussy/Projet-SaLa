import { useState } from 'react'
import type { CrisisPlayer } from '../types'
import { getHubUrl } from '../services/cookies'

interface Props {
  players: CrisisPlayer[]
  onAddPlayer: (name: string) => void
  onRemovePlayer: (id: string) => void
  onStartGame: () => void
}

export function SetupScreen({
  players,
  onAddPlayer,
  onRemovePlayer,
  onStartGame,
}: Props) {
  const [newName, setNewName] = useState('')
  const hubUrl = getHubUrl()

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    onAddPlayer(newName.trim())
    setNewName('')
  }

  const canStart = players.length >= 2

  return (
    <div className="min-h-screen bg-[#0a0c12] text-white p-4 max-w-lg mx-auto flex flex-col justify-between animate-fade-in">
      <div className="space-y-6">
        {/* Header */}
        <div className="pt-2 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <div>
              <h1 className="font-display font-black text-xl tracking-wide bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent leading-none">
                CELLULE DE CRISE
              </h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Le Battle Royale des responsables de camp</p>
            </div>
          </div>
          <a
            href={hubUrl}
            className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/10"
          >
            ← Quitter
          </a>
        </div>

        {/* Mission Briefing Card */}
        <div className="bg-[#121622] border-2 border-red-600/40 rounded-2xl p-4 space-y-3 shadow-lg shadow-red-950/40">
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
              <span><strong>Seuil d'élimination immédiat.</strong> Le responsable est exclu du campement avec mise sous scellés administrative.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">⚠️ Malus :</span>
              <span>Certaines sanctions (« Danger Public ») infligent des malus permanents sur les tours suivants.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">🏆 Top 1 :</span>
              <span>Le dernier responsable survivant est sacré <strong>Coach J+S</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Formulaire Joueurs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold tracking-wider text-red-400 uppercase">
              Responsables évalués ({players.length})
            </label>
            <span className="text-[11px] text-gray-400">Min. 2 (idéalement 3-8)</span>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Prénom ou Totem du responsable..."
              className="flex-1 bg-[#121624] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl"
            >
              Ajouter
            </button>
          </form>

          {/* Badges Joueurs */}
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {players.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-[#141a29] border border-white/10 rounded-full pl-2.5 pr-1.5 py-1 text-xs text-gray-200"
              >
                <span>{p.avatar || '👮'}</span>
                <span className="font-semibold">{p.name}</span>
                <button
                  type="button"
                  onClick={() => onRemovePlayer(p.id)}
                  className="w-4 h-4 rounded-full bg-white/10 hover:bg-red-500/80 hover:text-white flex items-center justify-center text-[10px] ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton Lancement */}
      <div className="pt-6 pb-2">
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-700 to-amber-600 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl shadow-red-950 hover:brightness-110 active:scale-98 transition-transform"
        >
          {canStart ? 'APPELER LA CELLULE DE CRISE 🚨' : 'Ajoutez au moins 2 responsables pour lancer l\'évaluation'}
        </button>
      </div>
    </div>
  )
}
