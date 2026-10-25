import { useState } from 'react'
import type { Player, GameMode } from '../types'
import { getHubUrl } from '../services/cookies'

interface Props {
  players: Player[]
  selectedMode: GameMode
  onSelectMode: (mode: GameMode) => void
  onAddPlayer: (name: string) => void
  onRemovePlayer: (id: string) => void
  onStartGame: () => void
}

export function SetupScreen({
  players,
  selectedMode,
  onSelectMode,
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

  const modes: Array<{
    id: GameMode
    title: string
    badge: string
    badgeColor: string
    description: string
    ratio: string
    icon: string
  }> = [
    {
      id: 'mixte',
      title: 'Mode Mixte',
      badge: 'Recommandé',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description: 'L\'expérience ultime au coin du feu. Alterne débats d\'intendance et duels tactiles frénétiques sur l\'écran.',
      ratio: '65% passif / 35% actif',
      icon: '⚖️',
    },
    {
      id: 'pepere',
      title: 'Mode Pépère',
      badge: '100% Passif',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      description: 'Tranquille sous le Sarasani : 100% cartes de lecture, votes à main levée, intendance et règles de veillée.',
      ratio: '100% cartes de lecture',
      icon: '🪵',
    },
    {
      id: 'commando',
      title: 'Mode Commando',
      badge: '100% Actif',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      description: 'Adrénaline pure : mini-jeux tactiles en duel sur écran (Flamme bleue, Tir à la corde, Sauvetage de tente) et défis physiques.',
      ratio: '100% mini-jeux & défis',
      icon: '⚡',
    },
  ]

  const canStart = players.length >= 2

  return (
    <div className="min-h-screen bg-[#070b14] text-white p-4 max-w-lg mx-auto flex flex-col justify-between animate-fade-in">
      <div className="space-y-6">
        {/* Header */}
        <div className="pt-2 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐮</span>
            <div>
              <h1 className="font-display font-black text-xl tracking-wide bg-gradient-to-r from-cyan-400 to-blue-300 bg-clip-text text-transparent leading-none">
                VACHAO
              </h1>
              <p className="text-[10px] text-gray-400 mt-0.5">La réserve de veillée de la maîtrise</p>
            </div>
          </div>
          <a
            href={hubUrl}
            className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/10"
          >
            ← Quitter
          </a>
        </div>

        {/* 1. Sélection du Mode Obligatoire */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
            1. Choix du Mode de Jeu
          </label>
          <div className="space-y-2.5">
            {modes.map(m => {
              const isSelected = selectedMode === m.id
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMode(m.id)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/50'
                      : 'bg-[#0f1422] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                          <span>{m.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{m.ratio}</div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">{m.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. Liste des Joueurs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
              2. Chefs Participants ({players.length})
            </label>
            <span className="text-[11px] text-gray-400">Min. 2 joueurs</span>
          </div>

          {/* Form Ajout */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Prénom ou Totem du chef..."
              className="flex-1 bg-[#101626] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl"
            >
              Ajouter
            </button>
          </form>

          {/* Badges Joueurs */}
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
            {players.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-[#12192c] border border-white/10 rounded-full pl-2.5 pr-1.5 py-1 text-xs text-gray-200"
              >
                <span>{p.avatar || '⛺'}</span>
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

      {/* Bouton Démarrer */}
      <div className="pt-6 pb-2">
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl shadow-cyan-500/20 hover:brightness-110 active:scale-98 transition-transform"
        >
          {canStart ? 'LANCER LA VEILLÉE VACHAO 🐮' : 'Ajoutez au moins 2 chefs pour jouer'}
        </button>
      </div>
    </div>
  )
}
