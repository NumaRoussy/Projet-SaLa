import { useState, useEffect, useRef } from 'react'
import type { Card, CrisisPlayer, CrisisPhase } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchCrisisCards, sendTelemetry } from './services/api'
import { useCrisisStore } from './hooks/useCrisisStore'
import { Leaderboard } from './components/Leaderboard'
import { ActionCard } from './components/ActionCard'
import { SetupScreen } from './components/SetupScreen'
import { EliminationModal } from './components/EliminationModal'
import { VictoryModal } from './components/VictoryModal'
import { useWakeLock } from './hooks/useWakeLock'

const FALLBACK_CARDS: Card[] = [
  { id: 1, game: 'crise', mode: 'crise', category: 'attaque', title: 'Bidon d\'eau sous les pneus', content: '{p1} place un bidon sous les pneus de la voiture de {p2}. La voiture s\'embourbe sur le terrain : la cible prend +2.0% et boit {sips} gorgées.', extra: 'Cible désignée', sips: 2, loss_percent: 2.0, min_players: 3 },
  { id: 2, game: 'crise', mode: 'crise', category: 'attaque', title: 'Piment d\'intendance', content: 'Une marmite piégée par {p1} provoque une épidémie de dysenterie. {p2} doit désigner 2 acolytes qui mangent avec lui : ils prennent chacun +1.5% de perte.', extra: 'Attaque groupée', sips: 1, loss_percent: 1.5, min_players: 3 },
  { id: 3, game: 'crise', mode: 'crise', category: 'dilemme', title: 'Visite surprise de l\'expert cantonal J+S', content: 'L\'inspecteur cantonal débarque à l\'improviste. La maîtrise vote le chef dont le classeur de camp est le pire. Le désigné prend +3.0% ou boit cul-sec pour masquer les preuves.', extra: 'Vote éliminatoire', sips: 3, loss_percent: 3.0, min_players: 3 },
  { id: 4, game: 'crise', mode: 'crise', category: 'regle', title: 'Retrait du permis tronçonneuse / port de la hache', content: 'Le joueur {p1} est déclaré « Danger Public » par l\'expert J+S. Statut permanent : tout nouvel incident matériel lui infligera un malus additionnel de +0.5%.', extra: 'Malus permanent', sips: 1, loss_percent: 0.5, min_players: 2 },
  { id: 5, game: 'crise', mode: 'crise', category: 'dilemme', title: 'Fiches sanitaires disparues', content: 'Le classeur des fiches médicales est tombé dans les feuillées. Deux chefs désignés doivent négocier : qui plonge pour le repêcher ? Le perdant prend +2.5%.', extra: 'Dilemme sanitaire', sips: 2, loss_percent: 2.5, min_players: 2 },
  { id: 6, game: 'crise', mode: 'crise', category: 'attaque', title: 'Raid sans Boussole', content: '{p1} égare la carte 1:25\'000 de la patrouille de {p2}. La patrouille erre 4 heures dans le Jura : {p2} prend +2.5% de perte J+S.', extra: 'Attaque ciblée', sips: 2, loss_percent: 2.5, min_players: 2 },
  { id: 7, game: 'crise', mode: 'crise', category: 'regle', title: 'Mise sous Tutelle Sanitaire', content: '{p1} perd son brevet de premier secours. Statut permanent « Bobologie douteuse » : chaque attaque subie lui coûte 1 gorgée supplémentaire.', extra: 'Malus permanent', sips: 2, loss_percent: 0.0, min_players: 2 },
  { id: 8, game: 'crise', mode: 'crise', category: 'dilemme', title: 'Contrôle du Taux d\'Alcoolémie', content: 'L\'intendant sent la gentiane à 20 mètres. Votez pour désigner le chef le plus suspect. Il prend +2.0% de perte ou distribue {sips} gorgées pour acheter le silence.', extra: 'Dilemme d\'audit', sips: 2, loss_percent: 2.0, min_players: 3 },
]

export default function App() {
  useWakeLock()
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [initialPlayers, setInitialPlayers] = useState<CrisisPlayer[]>(() => {
    const raw = loadPlayers()
    if (raw.length >= 2) return raw
    return [
      { id: '1', name: 'Loup Vigilant', avatar: '🐺', lossPercent: 0, isEliminated: false, activeDebuffs: [], sipsDrunk: 0 },
      { id: '2', name: 'Renard Rusé', avatar: '🦊', lossPercent: 0, isEliminated: false, activeDebuffs: [], sipsDrunk: 0 },
      { id: '3', name: 'Faucon Auditeur', avatar: '🦅', lossPercent: 0, isEliminated: false, activeDebuffs: [], sipsDrunk: 0 },
    ]
  })

  const [phase, setPhase] = useState<CrisisPhase>('setup')
  const [cards, setCards] = useState<Card[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  const crisis = useCrisisStore(initialPlayers)
  const sessionStartRef = useRef<number>(Date.now())
  const hubUrl = getHubUrl()

  // 1. Auth & Blackout
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

  // 2. Fetch cards
  useEffect(() => {
    fetchCrisisCards()
      .then(data => {
        if (data && data.length > 0) {
          setCards(shuffleArray(data))
        } else {
          setCards(shuffleArray(FALLBACK_CARDS))
        }
      })
      .catch(() => {
        setCards(shuffleArray(FALLBACK_CARDS))
      })
  }, [])

  // 3. Telemetry on unmount
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

  // Player modification
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

  const handleStartGame = () => {
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
    const isMaterial = currentCard?.title.toLowerCase().includes('hache') ||
      currentCard?.title.toLowerCase().includes('tronçonneuse') ||
      currentCard?.title.toLowerCase().includes('pneu')

    crisis.applyLoss(targetId, lossPercent, sips, isMaterial)

    if (isDebuff && debuffTitle) {
      crisis.addDebuff(targetId, debuffTitle)
    }

    // Advance card and turn
    setCurrentCardIndex(prev => prev + 1)
    crisis.nextTurn()
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-red-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Connexion à la Cellule de Crise...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0c10]/95 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 border border-red-500/30 rounded-2xl bg-[#141620] space-y-4">
          <div className="text-5xl">⛺</div>
          <h2 className="font-display font-bold text-white text-lg">Période de camp scoute</h2>
          <p className="text-xs text-gray-300 leading-relaxed">{blackoutMessage}</p>
          <a href={hubUrl} className="block w-full py-2.5 bg-red-600 rounded-xl font-bold text-sm text-white">
            Retour au Hub
          </a>
        </div>
      </div>
    )
  }

  if (phase === 'setup') {
    return (
      <SetupScreen
        players={initialPlayers}
        onAddPlayer={handleAddPlayer}
        onRemovePlayer={handleRemovePlayer}
        onStartGame={handleStartGame}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col justify-between">
      {/* Header */}
      <header className="px-4 py-2 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0b0c10]/95 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚨</span>
          <div>
            <div className="font-display font-black text-sm text-red-500">CELLULE DE CRISE</div>
            <div className="text-[10px] text-gray-400">Tour #{crisis.roundNumber}</div>
          </div>
        </div>

        <button
          onClick={() => setPhase('setup')}
          className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/10"
        >
          ⚙️ Config
        </button>
      </header>

      {/* Permanent Leaderboard */}
      <Leaderboard
        players={crisis.players}
        activeChefId={crisis.activeChef?.id}
      />

      {/* Action Card */}
      {currentCard && crisis.activeChef && (
        <ActionCard
          card={currentCard}
          activeChef={crisis.activeChef}
          survivors={crisis.survivors}
          roundNumber={crisis.roundNumber}
          onExecute={handleExecuteAction}
        />
      )}

      {/* Elimination Modal with Administrative Sealing Stamp */}
      {crisis.recentlyEliminated && (
        <EliminationModal
          player={crisis.recentlyEliminated}
          onDismiss={crisis.dismissElimination}
        />
      )}

      {/* Top 1 Victory Modal */}
      {crisis.isGameOver && crisis.winner && (
        <VictoryModal
          winner={crisis.winner}
          totalRounds={crisis.roundNumber}
          onRestart={() => setPhase('setup')}
        />
      )}
    </div>
  )
}
