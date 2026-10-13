/**
 * hooks/usePlayers.ts
 * Gestion de la liste des joueurs actifs (section 7.2).
 */
import { useState, useCallback } from 'react'
import type { Player } from '../types'
import { savePlayers, loadPlayers } from '../services/cookies'

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'p_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export function usePlayers() {
  const [players, setPlayersState] = useState<Player[]>(() => loadPlayers())

  const setPlayers = useCallback((updated: Player[]) => {
    setPlayersState(updated)
    savePlayers(updated)
  }, [])

  const addPlayer = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setPlayers([...players, { id: makeId(), name: trimmed }])
  }, [players, setPlayers])

  const removePlayer = useCallback((id: string) => {
    setPlayers(players.filter(p => p.id !== id))
  }, [players, setPlayers])

  const clearAll = useCallback(() => setPlayers([]), [setPlayers])

  return { players, addPlayer, removePlayer, clearAll }
}
