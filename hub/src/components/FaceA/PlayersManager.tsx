/**
 * components/FaceA/PlayersManager.tsx
 * Gestionnaire de la liste des joueurs actifs (section 7.2).
 */
import { useState } from 'react'
import { usePlayers } from '../../hooks/usePlayers'

export function PlayersManager() {
  const { players, addPlayer, removePlayer, clearAll } = usePlayers()
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    addPlayer(input)
    setInput('')
  }

  return (
    <div>
      <button
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-scout-sage transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>👥</span>
        <span>{players.length > 0 ? `${players.length} joueur${players.length > 1 ? 's' : ''}` : 'Ajouter des joueurs'}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 glass-card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Joueurs actifs</h3>
            {players.length > 0 && (
              <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Effacer tout
              </button>
            )}
          </div>

          {/* Player list */}
          {players.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-scout-green/20 border border-scout-mid/30 text-sm text-scout-sage"
                >
                  <span>{p.name}</span>
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              className="input-scout flex-1 py-2 text-sm"
              placeholder="Prénom du joueur…"
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={30}
            />
            <button type="submit" className="btn-primary py-2 px-4 text-sm">
              +
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
