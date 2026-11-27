import { useState } from 'react'
import type { DebriefMode, Player } from '../types'

interface Props {
  selectedModes: DebriefMode[]
  onToggleMode: (mode: DebriefMode) => void
  players: Player[]
  onAddPlayer: (name: string) => void
  onRemovePlayer: (id: string) => void
  onClearPlayers: () => void
  onStartGame: () => void
}

const MODES_INFO: {
  id: DebriefMode
  title: string
  description: string
}[] = [
  {
    id: 'dossiers',
    title: 'Dossiers de camp',
    description: 'Confessions, anecdotes et dossiers inavouables.',
  },
  {
    id: 'jamais',
    title: "Je n'ai jamais",
    description: 'Si tu as déjà, tu bois.',
  },
  {
    id: 'prefere',
    title: 'Tu préfères',
    description: 'Vote collectif : la minorité boit.',
  },
]

export function SetupScreen({
  selectedModes,
  onToggleMode,
  players,
  onAddPlayer,
  onRemovePlayer,
  onClearPlayers,
  onStartGame,
}: Props) {
  const [newName, setNewName] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddPlayer(trimmed)
    setNewName('')
  }

  const canStart = selectedModes.length > 0 && players.length >= 2

  return (
    <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between gap-6">
      <div className="space-y-6">
        {/* Editable Responsables List (ouvert par défaut) */}
        <section className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#e5be6d] block">
                Responsables ({players.length})
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
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-0.5">
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
              Aucun responsable enregistré. Ajoutez au moins 2 prénoms pour personnaliser les dossiers.
            </p>
          )}
        </section>

        {/* Mode Multi-Selection : fond gris anthracite #1f2229, uniquement bordure et coche en #b5892e */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#e5be6d]">
              Modes de jeu ({selectedModes.length}/3)
            </h2>
            <span className="text-[11px] text-slate-400">1, 2 ou 3 modes mélangés</span>
          </div>

          <div className="space-y-2.5">
            {MODES_INFO.map(mode => {
              const isChecked = selectedModes.includes(mode.id)
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => onToggleMode(mode.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border bg-[#1f2229] transition-colors flex items-start gap-3 ${
                    isChecked
                      ? 'border-[#b5892e]'
                      : 'border-[#2e323c] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                      isChecked
                        ? 'bg-[#b5892e] border-[#b5892e] text-[#16181d]'
                        : 'bg-[#16181d] border-[#2e323c] text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-bold text-sm text-[#f3f4f6] block">
                      {mode.title}
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedModes.length === 0 && (
            <div className="p-3 rounded-xl bg-[#1f2229] border border-[#9b2c37] text-[#e88c95] text-xs font-semibold text-center">
              Sélectionne au moins un mode pour lancer le Débrief
            </div>
          )}
        </section>
      </div>

      {/* Bottom Launch Button */}
      <div className="pt-2 pb-2">
        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStart}
          className="btn-primary w-full font-display"
        >
          {players.length < 2
            ? 'Ajoutez au moins 2 responsables'
            : 'Lancer le Débrief'}
        </button>
      </div>
    </main>
  )
}
