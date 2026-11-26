import { useState } from 'react'
import type { DebriefMode, Player } from '../types'

interface Props {
  selectedModes: DebriefMode[]
  onToggleMode: (mode: DebriefMode) => void
  players: Player[]
  onAddPlayer: (name: string) => void
  onRemovePlayer: (id: string) => void
  onStartGame: () => void
  onOpenFeedback: () => void
  hubUrl: string
}

const MODES_INFO: {
  id: DebriefMode
  icon: string
  title: string
  description: string
}[] = [
  {
    id: 'dossiers',
    icon: '📁',
    title: 'Dossiers de camp',
    description: 'Confessions, anecdotes et dossiers inavouables.',
  },
  {
    id: 'jamais',
    icon: '🙈',
    title: "Je n'ai jamais",
    description: 'Si tu as déjà, tu bois.',
  },
  {
    id: 'prefere',
    icon: '⚖️',
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
  onStartGame,
  onOpenFeedback,
  hubUrl,
}: Props) {
  const [newName, setNewName] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    onAddPlayer(trimmed)
    setNewName('')
  }

  const canStart = selectedModes.length > 0

  return (
    <div className="app-container min-h-screen bg-gradient-to-b from-[#0f090b] via-[#140b0e] to-[#0a0607] text-white flex flex-col justify-between selection:bg-amber-600">
      {/* Header */}
      <header className="px-4 py-2.5 border-b border-amber-900/30 flex items-center justify-between sticky top-0 bg-[#0f090b]/95 backdrop-blur-md z-40">
        <div className="flex items-center gap-2.5">
          <a
            href={hubUrl}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-300 hover:text-white"
            title="Retour au Hub"
          >
            ←
          </a>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🔥</span>
              <h1 className="font-display font-black text-sm tracking-wide bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
                DÉBRIEF
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40 font-mono">
                Carnotzet
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Veillée de maîtrise & dossiers d'après-camp</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFeedback}
          className="py-1 px-2.5 text-xs text-amber-300 border border-amber-500/30 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 flex items-center gap-1"
          title="Proposer une carte"
        >
          <span>💡</span>
          <span className="hidden sm:inline font-semibold">Proposer</span>
        </button>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-between gap-6">
        <div className="space-y-6">
          {/* Mode Multi-Selection */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                Modes de jeu ({selectedModes.length}/3)
              </h2>
              <span className="text-[11px] text-gray-400">1, 2 ou 3 modes mélangés</span>
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
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'bg-gradient-to-r from-amber-950/70 via-[#1b1015] to-orange-950/50 border-amber-500/60 shadow-lg shadow-amber-950/30'
                        : 'bg-white/[0.02] border-white/10 opacity-65 hover:opacity-90'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                        isChecked
                          ? 'bg-amber-500 border-amber-400 text-black'
                          : 'bg-black/40 border-white/25 text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{mode.icon}</span>
                        <span className="font-display font-bold text-sm text-white">
                          {mode.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                        {mode.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {!canStart && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-semibold text-center">
                ⚠️ Sélectionne au moins un mode pour lancer le Débrief
              </div>
            )}
          </section>

          {/* Editable Responsables List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                Responsables ({players.length})
              </label>
              <span className="text-[11px] text-gray-400">Synchronisé avec le Hub</span>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Prénom ou Totem du responsable..."
                className="flex-1 bg-[#161014] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
              >
                Ajouter
              </button>
            </form>

            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-0.5">
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 bg-[#1b1015] border border-amber-700/30 rounded-full pl-2.5 pr-1.5 py-1 text-xs text-gray-100"
                >
                  <span>{p.avatar || '⛺'}</span>
                  <span className="font-semibold">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(p.id)}
                    aria-label={`Supprimer ${p.name}`}
                    className="w-4 h-4 rounded-full bg-white/10 hover:bg-red-500/80 hover:text-white flex items-center justify-center text-[10px] ml-0.5"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-xs text-gray-500 italic">
                  Aucun responsable enregistré. Ajoute des prénoms ou totems pour personnaliser les dossiers !
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Launch Button */}
        <div className="pt-2 pb-2">
          <button
            type="button"
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base rounded-2xl shadow-xl shadow-amber-950/50 transition-all"
          >
            Lancer le Débrief 🔥
          </button>
        </div>
      </main>
    </div>
  )
}
