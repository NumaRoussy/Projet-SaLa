import { useState, useCallback, useMemo } from 'react'
import type { CrisisPlayer } from '../types'
import { playSiren, playStamp, playVictory, playPing } from '../services/audio'

export const ELIMINATION_THRESHOLD = 10.0

const ELIMINATION_REASONS = [
  'Embarqué au poste cantonal pour non-respect des directives J+S.',
  'Dossier de camp rejeté sans appel par l\'expert Jeunesse et Sport.',
  'Révocation immédiate du brevet de responsable de camp.',
  'Mise sous scellés administrative de la tente de maîtrise.',
  'Audit sanitaire catastrophique : fermeture immédiate du campement.',
]

export function useCrisisStore(initialPlayers: CrisisPlayer[]) {
  const [players, setPlayers] = useState<CrisisPlayer[]>(() => {
    return initialPlayers.map(p => ({
      ...p,
      lossPercent: 0.0,
      isEliminated: false,
      activeDebuffs: [],
      sipsDrunk: 0,
    }))
  })

  const [activeChefIndex, setActiveChefIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [recentlyEliminated, setRecentlyEliminated] = useState<CrisisPlayer | null>(null)
  const [isGameOver, setIsGameOver] = useState(false)
  const [winner, setWinner] = useState<CrisisPlayer | null>(null)

  // Non-eliminated survivors
  const survivors = useMemo(() => {
    return players.filter(p => !p.isEliminated)
  }, [players])

  const activeChef = useMemo(() => {
    if (survivors.length === 0) return null
    return survivors[activeChefIndex % survivors.length]
  }, [survivors, activeChefIndex])

  // Check if player has permanent debuff
  const hasDebuff = useCallback((playerId: string, debuffSubstr: string) => {
    const p = players.find(x => x.id === playerId)
    return p ? p.activeDebuffs.some(d => d.toLowerCase().includes(debuffSubstr.toLowerCase())) : false
  }, [players])

  // Apply Loss Percent to one or more targets
  const applyLoss = useCallback((
    targetId: string,
    basePercent: number,
    sips = 0,
    isMaterialIncident = false
  ) => {
    playPing(750)

    setPlayers(prev => {
      let newlyEliminatedPlayer: CrisisPlayer | null = null

      const updated = prev.map(p => {
        if (p.id !== targetId || p.isEliminated) return p

        // Check permanent debuff: "Danger Public" adds +0.5% on material incidents
        let additionalPercent = 0.0
        if (isMaterialIncident && p.activeDebuffs.some(d => d.toLowerCase().includes('danger public'))) {
          additionalPercent = 0.5
        }

        // Check permanent debuff: "Bobologie" adds +1 sip
        let additionalSips = 0
        if (p.activeDebuffs.some(d => d.toLowerCase().includes('bobologie'))) {
          additionalSips = 1
        }

        const newPercent = Math.min(10.0, Math.round((p.lossPercent + basePercent + additionalPercent) * 10) / 10)
        const totalSips = p.sipsDrunk + sips + additionalSips

        const isEliminated = newPercent >= ELIMINATION_THRESHOLD

        if (isEliminated && !p.isEliminated) {
          const reason = ELIMINATION_REASONS[Math.floor(Math.random() * ELIMINATION_REASONS.length)]
          newlyEliminatedPlayer = {
            ...p,
            lossPercent: newPercent,
            isEliminated: true,
            eliminationReason: reason,
            eliminationRound: roundNumber,
            sipsDrunk: totalSips,
          }
          return newlyEliminatedPlayer
        }

        return {
          ...p,
          lossPercent: newPercent,
          sipsDrunk: totalSips,
        }
      })

      // If an elimination occurred, trigger siren & modal
      if (newlyEliminatedPlayer) {
        setRecentlyEliminated(newlyEliminatedPlayer)
        playSiren(2.8)
        setTimeout(() => playStamp(), 800)
      }

      // Check win condition
      const remainingSurvivors = updated.filter(p => !p.isEliminated)
      if (remainingSurvivors.length === 1 && !isGameOver) {
        setIsGameOver(true)
        setWinner(remainingSurvivors[0])
        setTimeout(() => playVictory(), 1000)
      }

      return updated
    })
  }, [roundNumber, isGameOver])

  // Add Permanent Malus / Debuff to a leader
  const addDebuff = useCallback((playerId: string, debuffTitle: string) => {
    setPlayers(prev =>
      prev.map(p => {
        if (p.id === playerId && !p.activeDebuffs.includes(debuffTitle)) {
          return {
            ...p,
            activeDebuffs: [...p.activeDebuffs, debuffTitle],
          }
        }
        return p
      })
    )
  }, [])

  // Close elimination alert modal
  const dismissElimination = useCallback(() => {
    setRecentlyEliminated(null)
  }, [])

  // Advance to next turn
  const nextTurn = useCallback(() => {
    setActiveChefIndex(prev => prev + 1)
    setRoundNumber(r => r + 1)
  }, [])

  // Restart / Reset Game
  const resetGame = useCallback((newPlayerList?: CrisisPlayer[]) => {
    const baseList = newPlayerList || players
    setPlayers(
      baseList.map(p => ({
        ...p,
        lossPercent: 0.0,
        isEliminated: false,
        activeDebuffs: [],
        sipsDrunk: 0,
      }))
    )
    setActiveChefIndex(0)
    setRoundNumber(1)
    setRecentlyEliminated(null)
    setIsGameOver(false)
    setWinner(null)
  }, [players])

  return {
    players,
    survivors,
    activeChef,
    roundNumber,
    recentlyEliminated,
    isGameOver,
    winner,
    applyLoss,
    addDebuff,
    hasDebuff,
    dismissElimination,
    nextTurn,
    resetGame,
    setPlayers,
  }
}
