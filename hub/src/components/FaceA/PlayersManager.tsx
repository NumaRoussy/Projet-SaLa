/**
 * components/FaceA/PlayersManager.tsx
 * Gestionnaire de la liste des joueurs actifs (replié par défaut sur le Hub).
 */
import { useState } from 'react'
import { usePlayers } from '../../hooks/usePlayers'

export function PlayersManager() {
  const { players, addPlayer, removePlayer, clearAll } = usePlayers()
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    addPlayer(input)
    setInput('')
  }

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-300 hover:text-[#f3f4f6] transition-colors mx-auto"
        onClick={() => setOpen(!open)}
      >
        <span>{players.length > 0 ? `Joueurs (${players.length})` : 'Ajouter des joueurs'}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 bg-[#1f2229] border border-[#2e323c] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f3f4f6]">Joueurs actifs</h3>
            {players.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16181d] border border-[#9b2c37] text-xs font-medium text-red-200 hover:bg-[#262a33] transition-colors"
              >
                <span>🗑️</span>
                <span>Vider</span>
              </button>
            )}
          </div>

          {players.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16181d] border border-[#2e323c] text-sm text-[#f3f4f6]"
                >
                  <span>{p.name}</span>
                  <button
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    className="text-slate-400 hover:text-red-300 transition-colors leading-none"
                    aria-label={`Supprimer ${p.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              className="input-scout flex-1 py-2 text-sm"
              placeholder="Prénom du joueur…"
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={30}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn-primary py-2 px-4 text-sm"
            >
              +
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
