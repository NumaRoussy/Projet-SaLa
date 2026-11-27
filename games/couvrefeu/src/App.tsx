import { useState } from 'react'
import type {
  Player,
  AssignedPlayer,
  GamePhase,
  NightReport,
  CascadeEvent,
  VictoryResult,
} from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { sendTelemetry } from './services/api'
import {
  assignRoles,
  resolveNight,
  checkVictoryCondition,
  detectCascadeEvents,
} from './utils/gameLogic'

import { SetupPhase } from './components/SetupPhase'
import { DistributionPhase } from './components/DistributionPhase'
import { NightPhase, type NightActions } from './components/NightPhase'
import { MorningPhase } from './components/MorningPhase'
import { DayPhase } from './components/DayPhase'
import { CascadeModal } from './components/CascadeModal'
import { GameOverPhase } from './components/GameOverPhase'
import { HelpModal } from './components/HelpModal'
import { ProposeModal } from './components/ProposeModal'
import { useWakeLock } from './hooks/useWakeLock'

const HUB_URL = getHubUrl()

export default function App() {
  useWakeLock()
  // Liste des joueurs et synchronisation cookie partagé
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())

  // Navigation & Modales permanentes
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isProposeOpen, setIsProposeOpen] = useState(false)

  // État du jeu
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [nightNumber, setNightNumber] = useState(1)
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([])

  // Historique et mémoire du jeu
  const [lastCuistoProtectedId, setLastCuistoProtectedId] = useState<string | null>(null)
  const [pharmacieUsedSave, setPharmacieUsedSave] = useState(false)
  const [pharmacieUsedKill, setPharmacieUsedKill] = useState(false)
  const [hasCampChief, setHasCampChief] = useState(false)

  // Rapport du matin & Cascades
  const [nightReport, setNightReport] = useState<NightReport | null>(null)
  const [cascadeQueue, setCascadeQueue] = useState<CascadeEvent[]>([])

  // Fin de partie & Télémétrie
  const [victory, setVictory] = useState<VictoryResult | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [gameDurationSeconds, setGameDurationSeconds] = useState<number>(0)

  // Sauvegarde automatique des joueurs dans le cookie
  const handleUpdatePlayers = (updated: Player[]) => {
    setPlayers(updated)
    savePlayers(updated)
  }

  // 1. Démarrer la distribution
  const handleStartDistribution = () => {
    const assigned = assignRoles(players)
    setAssignedPlayers(assigned)
    setPhase('distribution')
    setGameStartTime(Date.now())
  }

  // 2. Fin de la distribution -> Nuit 1
  const handleCompleteDistribution = () => {
    setNightNumber(1)
    setPhase('night')
  }

  // Vérifier la victoire et déclencher la fin de partie si applicable
  const verifyVictory = (currentPlayers: AssignedPlayer[]): boolean => {
    const v = checkVictoryCondition(currentPlayers)
    if (v) {
      setVictory(v)
      setPhase('gameover')
      const duration = Math.max(1, Math.round((Date.now() - gameStartTime) / 1000))
      setGameDurationSeconds(duration)
      sendTelemetry(duration)
      return true
    }
    return false
  }

  // 3. Fin de la nuit (Validation des actions par le meneur)
  const handleCompleteNight = (actions: NightActions) => {
    // Mémoriser les Inséparables si Nuit 1
    let updatedPlayers = [...assignedPlayers]
    if (actions.inseparables && actions.inseparables[0] && actions.inseparables[1]) {
      const [id1, id2] = actions.inseparables
      updatedPlayers = updatedPlayers.map(p => {
        if (p.id === id1) {
          return { ...p, isInseparable: true, inseparablePartnerId: id2 }
        }
        if (p.id === id2) {
          return { ...p, isInseparable: true, inseparablePartnerId: id1 }
        }
        return p
      })
    }

    // Mise à jour de l'historique Cuisto
    setLastCuistoProtectedId(actions.cuistoProtectedId)

    // Mise à jour de l'état des potions Pharmacie
    if (actions.pharmacieSavedTarget) {
      setPharmacieUsedSave(true)
    }
    if (actions.pharmacieKillTargetId) {
      setPharmacieUsedKill(true)
    }

    // Résolution de la nuit
    const report = resolveNight(nightNumber, updatedPlayers, actions)
    setNightReport(report)

    // Appliquer les éliminations sans déclencher de popups pendant la nuit
    if (report.eliminatedPlayers.length > 0) {
      const killedIds = new Set(report.eliminatedPlayers.map(p => p.id))
      updatedPlayers = updatedPlayers.map(p =>
        killedIds.has(p.id) ? { ...p, isAlive: false } : p
      )
    }

    setAssignedPlayers(updatedPlayers)
    setPhase('morning')
  }

  // 4. Nomination du nouveau Chef de Camp au matin si l'ancien est mort cette nuit
  const handleAppointNewChief = (newChiefId: string) => {
    const updated = assignedPlayers.map(p => ({
      ...p,
      isCampChief: p.id === newChiefId,
    }))
    setAssignedPlayers(updated)
    setHasCampChief(true)
  }

  // 5. Passer du bilan du matin au Rassemblement du Jour
  const handleProceedToDay = () => {
    if (verifyVictory(assignedPlayers)) return

    // Vérifier les cascades post-nuit (ex: CP ou Inséparable éliminé cette nuit)
    // (Note : la succession du Chef de Camp est déjà résolue dans MorningPhase)
    if (nightReport && nightReport.eliminatedPlayers.length > 0) {
      const postNightCascades = detectCascadeEvents(
        nightReport.eliminatedPlayers,
        assignedPlayers,
        { includeChiefSuccession: false }
      )
      if (postNightCascades.length > 0) {
        setCascadeQueue(postNightCascades)
        return
      }
    }

    if (!hasCampChief && nightNumber === 1) {
      setPhase('day_election')
    } else {
      setPhase('day_vote')
    }
  }

  // 6. Élection initiale du Chef de Camp (Jour 1)
  const handleElectCampChief = (playerId: string) => {
    const updated = assignedPlayers.map(p => ({
      ...p,
      isCampChief: p.id === playerId,
    }))
    setAssignedPlayers(updated)
    setHasCampChief(true)
    setPhase('day_vote')
  }

  // 7. Condamnation du vote de rassemblement
  const handleEliminatePlayer = (playerId: string | null) => {
    let updated = [...assignedPlayers]

    if (playerId) {
      const condemned = updated.find(p => p.id === playerId)
      if (condemned) {
        updated = updated.map(p => (p.id === playerId ? { ...p, isAlive: false } : p))
        setAssignedPlayers(updated)

        // Cascades potentielles de jour (CP, Inséparable OU Chef de Camp)
        const cascades = detectCascadeEvents([condemned], updated, {
          includeChiefSuccession: true,
        })
        if (cascades.length > 0) {
          setCascadeQueue(cascades)
          return
        }
      }
    }

    // Vérifier fin de partie ou passer à la nuit
    if (!verifyVictory(updated)) {
      setNightNumber(prev => prev + 1)
      setPhase('night')
    }
  }

  // 8. Résolution d'un événement en cascade
  const handleResolveCascade = (targetPlayerId?: string) => {
    if (cascadeQueue.length === 0) return

    const currentCascade = cascadeQueue[0]
    let updated = [...assignedPlayers]
    const nextCascades = cascadeQueue.slice(1)

    // Mort d'un Inséparable : le partenaire meurt
    if (currentCascade.type === 'inseparable_death' && currentCascade.targetPlayerId) {
      const partner = updated.find(p => p.id === currentCascade.targetPlayerId)
      if (partner) {
        updated = updated.map(p =>
          p.id === currentCascade.targetPlayerId ? { ...p, isAlive: false } : p
        )
        // Vérifier si le partenaire déclenche à son tour une cascade (ex: CP ou Chef de camp)
        const secondaryCascades = detectCascadeEvents([partner], updated, {
          includeChiefSuccession: true,
        })
        nextCascades.push(...secondaryCascades)
      }
    }

    // Tir du Chef de Patrouille : la cible collatérale meurt
    if (currentCascade.type === 'cp_shot' && targetPlayerId) {
      const collateral = updated.find(p => p.id === targetPlayerId)
      if (collateral) {
        updated = updated.map(p => (p.id === targetPlayerId ? { ...p, isAlive: false } : p))
        // Vérifier si la victime collatérale déclenche une cascade (Inséparable ou Chef)
        const secondaryCascades = detectCascadeEvents([collateral], updated, {
          includeChiefSuccession: true,
        })
        nextCascades.push(...secondaryCascades)
      }
    }

    // Succession du Chef de Camp (en journée) : transmission du badge
    if (currentCascade.type === 'chief_succession' && targetPlayerId) {
      updated = updated.map(p => ({
        ...p,
        isCampChief: p.id === targetPlayerId,
      }))
      setHasCampChief(true)
    }

    setAssignedPlayers(updated)
    setCascadeQueue(nextCascades)

    // Si aucune cascade ne reste, vérifier les conditions de victoire ou avancer la phase
    if (nextCascades.length === 0) {
      if (!verifyVictory(updated)) {
        if (phase === 'morning') {
          if (!hasCampChief && nightNumber === 1) {
            setPhase('day_election')
          } else {
            setPhase('day_vote')
          }
        } else if (phase === 'day_vote') {
          setNightNumber(prev => prev + 1)
          setPhase('night')
        }
      }
    }
  }

  // 8. Recommencer une partie
  const handleRestartGame = () => {
    setPhase('setup')
    setNightNumber(1)
    setAssignedPlayers([])
    setLastCuistoProtectedId(null)
    setPharmacieUsedSave(false)
    setPharmacieUsedKill(false)
    setHasCampChief(false)
    setNightReport(null)
    setCascadeQueue([])
    setVictory(null)
  }

  return (
    <div className="app-container bg-[#16181d] text-[#f3f4f6] min-h-[100dvh] flex flex-col justify-between">
      {/* ── En-tête uniforme ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1f2229] border-b border-[#3b5998] px-4 py-3">
        <div className="max-w-xl mx-auto grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <a
              href={HUB_URL}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-[#2e323c] bg-[#16181d] hover:bg-[#262a33] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              ← Menu
            </a>
          </div>

          <h1 className="justify-self-center font-display font-bold text-base text-[#f3f4f6] truncate">
            Couvre-feu
          </h1>

          <div className="justify-self-end flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#2e323c] bg-[#16181d] hover:bg-[#262a33] text-[#f3f4f6] text-xs font-semibold transition-colors"
              title="Consulter le guide des rôles et règles"
            >
              <span>?</span>
              <span>Aide</span>
            </button>
            <button
              type="button"
              onClick={() => setIsProposeOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#b5892e] bg-[#1f2229] hover:bg-[#262a33] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              <span>💡</span>
              <span>Proposer</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENU PRINCIPAL SELON LA PHASE ──────────────────────── */}
      <main className="flex-1 flex flex-col">
        {phase === 'setup' && (
          <SetupPhase
            players={players}
            onUpdatePlayers={handleUpdatePlayers}
            onStartDistribution={handleStartDistribution}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {phase === 'distribution' && (
          <DistributionPhase
            assignedPlayers={assignedPlayers}
            onCompleteDistribution={handleCompleteDistribution}
          />
        )}

        {phase === 'night' && (
          <NightPhase
            nightNumber={nightNumber}
            players={assignedPlayers}
            lastCuistoProtectedId={lastCuistoProtectedId}
            pharmacieUsedSave={pharmacieUsedSave}
            pharmacieUsedKill={pharmacieUsedKill}
            onCompleteNight={handleCompleteNight}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {phase === 'morning' && nightReport && (
          <MorningPhase
            report={nightReport}
            players={assignedPlayers}
            onAppointNewChief={handleAppointNewChief}
            onProceedToDay={handleProceedToDay}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {phase === 'day_election' && (
          <DayPhase
            dayNumber={nightNumber}
            players={assignedPlayers}
            hasCampChief={false}
            onElectCampChief={handleElectCampChief}
            onEliminatePlayer={handleEliminatePlayer}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {phase === 'day_vote' && (
          <DayPhase
            dayNumber={nightNumber}
            players={assignedPlayers}
            hasCampChief={true}
            onElectCampChief={handleElectCampChief}
            onEliminatePlayer={handleEliminatePlayer}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {phase === 'gameover' && victory && (
          <GameOverPhase
            victory={victory}
            players={assignedPlayers}
            durationSeconds={gameDurationSeconds}
            onRestartGame={handleRestartGame}
          />
        )}
      </main>

      {/* ── MODALE DES EFFETS EN CASCADE ─────────────────────────── */}
      {cascadeQueue.length > 0 && (
        <CascadeModal
          cascade={cascadeQueue[0]}
          players={assignedPlayers}
          onResolve={handleResolveCascade}
        />
      )}

      {/* ── GUIDE D'AIDE PERMANENT (TIROIR / MODALE) ─────────────── */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ProposeModal isOpen={isProposeOpen} onClose={() => setIsProposeOpen(false)} />

      {/* ── PIED DE PAGE DISCRET ─────────────────────────────────── */}
      <footer className="py-3 px-4 text-center border-t border-[#2e323c] bg-[#1f2229] text-[11px] text-slate-400">
        Projet indépendant. Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>
    </div>
  )
}
