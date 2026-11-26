import { useState, useEffect, useRef } from 'react'
import type { Card, CrisisPlayer, CrisisPhase, CrisisCategory } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchCrisisCards, sendTelemetry } from './services/api'
import { useCrisisStore } from './hooks/useCrisisStore'
import { Leaderboard } from './components/Leaderboard'
import { ActionCard } from './components/ActionCard'
import { SetupScreen } from './components/SetupScreen'
import { EliminationModal } from './components/EliminationModal'
import { VictoryModal } from './components/VictoryModal'
import { ProposeModal } from './components/ProposeModal'
import { useWakeLock } from './hooks/useWakeLock'

const FALLBACK_CARDS: Card[] = [
  { id: 1, game: 'crise', mode: 'crise', category: 'attaque', title: 'Bidon d\'eau sous les pneus', content: '{p1} place un jerrican d\'eau sous les pneus de la voiture de {p2}. Le véhicule s\'embourbe sur le terrain : la cible prend +1.0% et boit {sips} gorgées.', extra: 'Cible désignée', sips: 3, loss_percent: 1.0, min_players: 3 },
  { id: 2, game: 'crise', mode: 'crise', category: 'attaque', title: 'Piment d\'intendance', content: 'Une marmite piégée par {p1} provoque une épidémie de dysenterie. {p2} doit désigner 2 acolytes qui mangent avec lui : ils prennent chacun +1.0% de perte et boivent {sips} gorgées.', extra: 'Attaque groupée', sips: 3, loss_percent: 1.0, min_players: 3 },
  { id: 3, game: 'crise', mode: 'crise', category: 'dilemme', title: 'Visite surprise de l\'expert Swiss Olympic', content: 'L\'évaluateur débarque à l\'improviste. La maîtrise vote le responsable dont le classeur de camp est le pire. Le désigné prend +2.0% ou boit {sips} gorgées pour masquer les preuves.', extra: 'Vote éliminatoire', sips: 5, loss_percent: 2.0, min_players: 3 },
  { id: 4, game: 'crise', mode: 'crise', category: 'regle', title: 'Retrait du permis tronçonneuse / hache', content: '{p1} est déclaré « Danger Public » lors de l\'évaluation. Statut permanent : tout nouvel incident matériel lui infligera un malus additionnel de +0.5% (et {sips} gorgées immédiates).', extra: 'Malus permanent', sips: 3, loss_percent: 0.5, min_players: 2 },
  { id: 5, game: 'crise', mode: 'crise', category: 'dilemme', title: 'Fiches sanitaires disparues', content: 'Le classeur des fiches médicales est tombé dans les feuillées. Deux responsables désignés doivent négocier : qui plonge pour le repêcher ? Le perdant prend +1.5% et boit {sips} gorgées.', extra: 'Dilemme sanitaire', sips: 4, loss_percent: 1.5, min_players: 2 },
  { id: 6, game: 'crise', mode: 'crise', category: 'attaque', title: 'Raid sans Boussole', content: '{p1} égare la carte 1:25\'000 de la patrouille de {p2}. La patrouille erre 4 heures sous la roille : {p2} prend +1.5% de perte J+S et boit {sips} gorgées.', extra: 'Attaque ciblée', sips: 3, loss_percent: 1.5, min_players: 2 },
  { id: 7, game: 'crise', mode: 'crise', category: 'regle', title: 'Mise sous Tutelle Sanitaire', content: '{p1} perd son brevet de premier secours. Statut permanent « Bobologie douteuse » : chaque attaque subie lui coûte 2 gorgées supplémentaires (et {sips} gorgées maintenant).', extra: 'Malus permanent', sips: 3, loss_percent: 0.0, min_players: 2 },
  { id: 8, game: 'crise', mode: 'crise', category: 'dilemme', title: 'Contrôle de la Malle de Maîtrise', content: 'Quelqu\'un a oublié de verrouiller la Malle avant le week-end de maîtrise à Froideville. Votez pour le responsable le plus suspect : il prend +1.5% ou distribue {sips} gorgées.', extra: 'Dilemme d\'audit', sips: 4, loss_percent: 1.5, min_players: 3 },
]

export default function App() {
  useWakeLock()
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)
  const [proposeOpen, setProposeOpen] = useState(false)

  const [initialPlayers, setInitialPlayers] = useState<CrisisPlayer[]>(() => loadPlayers())

  const [phase, setPhase] = useState<CrisisPhase>('setup')
  const [cards, setCards] = useState<Card[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  const crisis = useCrisisStore(initialPlayers)
  const sessionStartRef = useRef<number>(Date.now())
  const hubUrl = getHubUrl()

  useEffect(() => {
    async function checkAuth() {
      const pass = loadDevicePass()
      if (!pass) {
        if (typeof window !== 'undefined' && !window.location.hostname.endsWith('scoutgame.ch')) {
          setIsVerifying(false)
          return
        }
        window.location.href = hubUrl
        return
      }

      try {
        const res = await verifyDevice(pass)
        if (res.blackout) {
          setBlackoutMessage(res.reason || 'Période de camp en cours.')
          setIsVerifying(false)
          return
        }
        if (!res.valid) {
          window.location.href = hubUrl
          return
        }
        setIsVerifying(false)
      } catch {
        setIsVerifying(false)
      }
    }

    checkAuth()
  }, [hubUrl])

  useEffect(() => {
    fetchCrisisCards()
      .then(data => {
        if (data && data.length > 0) setCards(shuffleArray(data))
        else setCards(shuffleArray(FALLBACK_CARDS))
      })
      .catch(() => setCards(shuffleArray(FALLBACK_CARDS)))
  }, [])

  useEffect(() => {
    return () => {
      const elapsed = (Date.now() - sessionStartRef.current) / 1000
      sendTelemetry(elapsed)
    }
  }, [])

  function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const handleAddPlayer = (name: string) => {
    const avatars = ['👮', '🦺', '📋', '🚨', '🎒', '🔦', '📻', '🛠️']
    const newPlayer: CrisisPlayer = {
      id: `p_${Date.now()}`,
      name,
      avatar: avatars[initialPlayers.length % avatars.length],
      lossPercent: 0,
      isEliminated: false,
      activeDebuffs: [],
      sipsDrunk: 0,
    }
    const updated = [...initialPlayers, newPlayer]
    setInitialPlayers(updated)
    crisis.setPlayers(updated)
    savePlayers(updated)
  }

  const handleRemovePlayer = (id: string) => {
    const updated = initialPlayers.filter(p => p.id !== id)
    setInitialPlayers(updated)
    crisis.setPlayers(updated)
    savePlayers(updated)
  }

  const handleClearPlayers = () => {
    setInitialPlayers([])
    crisis.setPlayers([])
    savePlayers([])
  }

  const handleStartGame = () => {
    if (initialPlayers.length < 2) return
    savePlayers(initialPlayers)
    crisis.resetGame(initialPlayers)
    setCurrentCardIndex(0)
    setPhase('playing')
  }

  const currentCard = cards[currentCardIndex % (cards.length || 1)]

  const handleExecuteAction = (
    targetId: string,
    lossPercent: number,
    sips: number,
    isDebuff: boolean,
    debuffTitle?: string
  ) => {
    const isMaterial =
      currentCard?.title.toLowerCase().includes('hache') ||
      currentCard?.title.toLowerCase().includes('tronçonneuse') ||
      currentCard?.title.toLowerCase().includes('pneu')

    crisis.applyLoss(targetId, lossPercent, sips, isMaterial)

    if (isDebuff && debuffTitle) {
      crisis.addDebuff(targetId, debuffTitle)
    }

    setCurrentCardIndex(prev => prev + 1)
    crisis.nextTurn()
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0d1016] flex items-center justify-center text-red-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Connexion à la Cellule de Crise...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d1016] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 border border-[#2a2f3d] rounded-2xl bg-[#161922] space-y-4">
          <div className="text-5xl">⛺</div>
          <h2 className="font-display font-bold text-white text-lg">Période de camp scoute</h2>
          <p className="text-xs text-gray-300 leading-relaxed">{blackoutMessage}</p>
          <a href={hubUrl} className="block w-full py-2.5 bg-red-700 rounded-xl font-bold text-sm text-white">
            ← Menu
          </a>
        </div>
      </div>
    )
  }

  const currentProposeCategory: CrisisCategory =
    phase === 'playing' &&
    currentCard &&
    (currentCard.category === 'attaque' ||
      currentCard.category === 'dilemme' ||
      currentCard.category === 'regle')
      ? currentCard.category
      : 'attaque'

  return (
    <div className="app-container bg-[#0d1016] text-gray-100">
      {/* ── En-tête uniforme ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#12151d] border-b border-[#2a2f3d] px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <a
              href={hubUrl}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-[#2a2f3d] bg-[#161922] hover:bg-[#1f2330] text-gray-200 text-xs font-semibold transition-colors"
            >
              ← Menu
            </a>
          </div>
          <h1 className="justify-self-center font-display font-bold text-base text-white truncate">
            Cellule de crise
          </h1>
          <div className="justify-self-end">
            <button
              type="button"
              onClick={() => setProposeOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 text-xs font-semibold transition-colors"
            >
              <span>💡</span>
              <span>Proposer</span>
            </button>
          </div>
        </div>
      </header>

      {phase === 'setup' ? (
        <SetupScreen
          players={initialPlayers}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onClearPlayers={handleClearPlayers}
          onStartGame={handleStartGame}
        />
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <Leaderboard
            players={crisis.players}
            activeResponsableId={crisis.activeResponsable?.id}
          />

          {currentCard && crisis.activeResponsable && (
            <ActionCard
              card={currentCard}
              activeResponsable={crisis.activeResponsable}
              survivors={crisis.survivors}
              roundNumber={crisis.roundNumber}
              onExecute={handleExecuteAction}
            />
          )}

          {crisis.recentlyEliminated && (
            <EliminationModal
              player={crisis.recentlyEliminated}
              onDismiss={crisis.dismissElimination}
            />
          )}

          {crisis.isGameOver && crisis.winner && (
            <VictoryModal
              winner={crisis.winner}
              totalRounds={crisis.roundNumber}
              onRestart={() => setPhase('setup')}
            />
          )}
        </div>
      )}

      <footer className="py-3 px-4 text-center border-t border-[#1c202c] text-[11px] text-gray-500">
        Projet indépendant — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>

      <ProposeModal
        isOpen={proposeOpen}
        initialCategory={currentProposeCategory}
        onClose={() => setProposeOpen(false)}
      />
    </div>
  )
}
