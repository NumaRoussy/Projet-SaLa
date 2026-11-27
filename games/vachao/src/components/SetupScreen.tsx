import { useState } from 'react'
import type { Player, GameMode } from '../types'

interface Props {
  players: Player[]
  selectedMode: GameMode
  onSelectMode: (mode: GameMode) => void
  onAddPlayer: (name: string) => void
  onRemovePlayer: (id: string) => void
  onClearPlayers: () => void
  onStartGame: () => void
}

export function SetupScreen({
  players,
  selectedMode,
  onSelectMode,
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

  const modes: Array<{
    id: GameMode
    title: string
    badge: string
    badgeColor: string
    description: string
    ratio: string
  }> = [
    {
      id: 'mixte',
      title: 'Mode Mixte',
      badge: 'Recommandé',
      badgeColor: 'bg-[#16181d] text-emerald-300 border-[#2e6f56]',
      description:
        "L'expérience au coin du feu. Alterne débats d'intendance et duels tactiles sur l'écran.",
      ratio: '65% passif / 35% actif',
    },
    {
      id: 'pepere',
      title: 'Mode Pépère',
      badge: '100% Passif',
      badgeColor: 'bg-[#16181d] text-[#8ec2eb] border-[#2d6394]',
      description:
        'Tranquille sous le Sarasani : 100% cartes de lecture, votes à main levée, intendance et règles de veillée.',
      ratio: '100% cartes de lecture',
    },
    {
      id: 'commando',
      title: 'Mode Commando',
      badge: '100% Actif',
      badgeColor: 'bg-[#16181d] text-[#e5be6d] border-[#b5892e]',
      description:
        'Mini-jeux tactiles en duel sur écran (Flamme bleue, Tir à la corde, Sauvetage de tente) et défis physiques.',
      ratio: '100% mini-jeux & défis',
    },
  ]

  const canStart = players.length >= 2

  return (
    <div className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* 1. Gestionnaire de joueurs (déplié par défaut) */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <label className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase block">
                Chefs Participants ({players.length})
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
              placeholder="Prénom ou Totem du chef..."
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
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-0.5">
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
              Aucun chef inscrit. Ajoutez au moins 2 prénoms pour commencer.
            </p>
          )}
        </div>

        {/* 2. Sélection du Mode */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase block">
            Choix du Mode de Jeu
          </label>
          <div className="space-y-2.5">
            {modes.map(m => {
              const isSelected = selectedMode === m.id
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => onSelectMode(m.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-colors bg-[#1f2229] ${
                    isSelected
                      ? 'border-[#2d6394]'
                      : 'border-[#2e323c] hover:border-[#2d6394]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-[#f3f4f6] flex items-center gap-2">
                        <span>{m.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${m.badgeColor}`}>
                          {m.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8ec2eb] font-mono mt-0.5">{m.ratio}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#2d6394] bg-[#2d6394]' : 'border-[#2e323c]'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#f3f4f6]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{m.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bouton Démarrer */}
      <div className="pt-2 pb-2">
        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStart}
          className="btn-primary w-full font-display"
        >
          {canStart ? 'Lancer la veillée Vachao' : 'Ajoutez au moins 2 chefs pour jouer'}
        </button>
      </div>
    </div>
  )
}
