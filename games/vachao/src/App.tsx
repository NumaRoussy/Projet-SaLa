import { useState, useEffect, useRef } from 'react'
import type { Player, Card, GameMode, GamePhase, ActiveMiniGame, MiniGameResult } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchVachaoCards, sendTelemetry } from './services/api'
import { SetupScreen } from './components/SetupScreen'
import { CardView } from './components/CardView'
import { DebriefingStats } from './components/DebriefingStats'
import { FlammeBleue } from './components/mini-games/FlammeBleue'
import { SensDuTemps } from './components/mini-games/SensDuTemps'
import { TirCorde } from './components/mini-games/TirCorde'
import { SauvetageTente } from './components/mini-games/SauvetageTente'
import { useWakeLock } from './hooks/useWakeLock'

const FALLBACK_CARDS: Card[] = [
  { id: 1, game: 'vachao', mode: 'passif', category: 'carte', title: 'Le Champion du Cheni', content: 'Votez à main levée : qui dans la maîtrise a laissé le pire cheni dans l\'abri bouffe au dernier camp ?', extra: 'Le désigné boit {sips} gorgées', sips: 2, loss_percent: 0, min_players: 3 },
  { id: 2, game: 'vachao', mode: 'passif', category: 'regle', title: 'Loi du Quartier-Maître', content: 'Interdiction formelle de prononcer le mot « duvet » (on dit sac de couchage !). Chaque infraction coûte {sips} gorgée.', extra: 'durée:3 tours', sips: 1, loss_percent: 0, min_players: 3 },
  { id: 3, game: 'vachao', mode: 'passif', category: 'carte', title: 'Dilemme du MOVA', content: 'Préfères-tu revivre la canicule d\'Ulrichen avec 2 tonnes de pain à décharger [A] ou passer 4 heures à remplir un concept J+S sur MiData [B] ?', extra: 'Les minoritaires boivent {sips}', sips: 2, loss_percent: 0, min_players: 3 },
  { id: 4, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Flamme Bleue (Réflexe)', content: 'Duel tactile entre {p1} et {p2} : touchez l\'écran dès que la flamme devient bleu vif. Le plus lent boit {sips} gorgées.', extra: 'Duel réflexe', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 5, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Sens du Temps (Chrono)', content: 'Chrono à l\'aveugle : estimez le temps cible les yeux fermés. Le joueur qui s\'éloigne le plus du chrono boit {sips} gorgées.', extra: 'Duel chrono', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 6, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Tir à la Corde (Tug-of-War)', content: 'Duel tactile : marteler frénétiquement votre moitié d\'écran pour tirer le foulard scout vers votre camp.', extra: 'Duel de force', sips: 3, loss_percent: 0, min_players: 2 },
  { id: 7, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Sauvetage de Tente', content: 'Défendez la tente scoute ! Des troncs tombent du ciel : détruisez-les au swipe avant qu\'ils n\'écrasent le campement.', extra: 'Mini-jeu tactile', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 8, game: 'vachao', mode: 'actif', category: 'carte', title: 'Virelangue du Sarasani', content: '{p1} doit réciter 3 fois sans bégayer : « Six sarasanis suisses sèchent sur six souches scoutes ». Si raté boit {sips} gorgées.', extra: 'Défi vocal', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 9, game: 'vachao', mode: 'passif', category: 'carte', title: 'L\'Ambulance en Allemand', content: 'Votez : qui a eu la plus grosse sueur froide en essayant d\'expliquer un bobo au 144 en suisse-allemand ?', extra: 'Raconte ou bois {sips}', sips: 3, loss_percent: 0, min_players: 3 },
  { id: 10, game: 'vachao', mode: 'passif', category: 'carte', title: 'Météo Jurassienne', content: 'Préfères-tu 10 jours de roille non-stop à Plambuit [A] ou oublier la Malle de maîtrise à la gare de Lausanne [B] ?', extra: 'Choix cornélien : {sips} gorgées', sips: 2, loss_percent: 0, min_players: 3 },
]

export default function App() {
  useWakeLock()
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [players, setPlayers] = useState<Player[]>(() => {
    const raw = loadPlayers()
    if (raw.length >= 2) return raw
    return [
      { id: '1', name: 'Loup Ardent', avatar: '🐺', sipsDrunk: 0, sipsGiven: 0, challengesWon: 0, challengesLost: 0 },
      { id: '2', name: 'Renard Rusé', avatar: '🦊', sipsDrunk: 0, sipsGiven: 0, challengesWon: 0, challengesLost: 0 },
      { id: '3', name: 'Faucon Vif', avatar: '🦅', sipsDrunk: 0, sipsGiven: 0, challengesWon: 0, challengesLost: 0 },
    ]
  })

  const [gameMode, setGameMode] = useState<GameMode>('mixte')
  const [phase, setPhase] = useState<GamePhase>('setup')

  const [cards, setCards] = useState<Card[]>([])
  const [deck, setDeck] = useState<Card[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)

  const [activeMiniGame, setActiveMiniGame] = useState<ActiveMiniGame>('none')
  const [duelistP1, setDuelistP1] = useState<Player | null>(null)
  const [duelistP2, setDuelistP2] = useState<Player | null>(null)

  const sessionStartRef = useRef<number>(Date.now())
  const hubUrl = getHubUrl()

  // 1. Auth check
  useEffect(() => {
    async function checkAuth() {
      const pass = loadDevicePass()
      if (!pass) {
        // En développement local, on permet l'accès si pas de domaine scoutgame.ch
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
    fetchVachaoCards()
      .then(data => {
        if (data && data.length > 0) {
          setCards(data)
        } else {
          setCards(FALLBACK_CARDS)
        }
      })
      .catch(() => {
        setCards(FALLBACK_CARDS)
      })
  }, [])

  // 3. Telemetry on unmount
  useEffect(() => {
    return () => {
      const elapsed = (Date.now() - sessionStartRef.current) / 1000
      sendTelemetry(elapsed)
    }
  }, [])

  // Start game handler
  const handleStartGame = () => {
    savePlayers(players)

    // Build tailored deck according to mode
    let filtered = [...cards]
    if (gameMode === 'pepere') {
      filtered = cards.filter(c => c.mode === 'passif' || c.category === 'carte' || c.category === 'regle')
    } else if (gameMode === 'commando') {
      filtered = cards.filter(c => c.mode === 'actif' || c.category === 'minijeu')
    } else {
      // Mixte: ~65% passif / 35% actif
      const passives = cards.filter(c => c.mode === 'passif' || c.category === 'carte')
      const actives = cards.filter(c => c.mode === 'actif' || c.category === 'minijeu')
      filtered = shuffleArray([...passives, ...actives, ...actives])
    }

    if (filtered.length === 0) filtered = FALLBACK_CARDS
    const shuffled = shuffleArray(filtered)
    setDeck(shuffled)
    setCurrentCardIndex(0)
    setRoundNumber(1)
    setupCardDuelists(shuffled[0])
    setPhase('playing')
  }

  function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const setupCardDuelists = (card: Card | undefined) => {
    if (!card || players.length < 2) return
    const p1Idx = Math.floor(Math.random() * players.length)
    let p2Idx = Math.floor(Math.random() * (players.length - 1))
    if (p2Idx >= p1Idx) p2Idx += 1

    setDuelistP1(players[p1Idx])
    setDuelistP2(players[p2Idx])
  }

  const currentCard = deck[currentCardIndex % (deck.length || 1)]

  // Launch mini-game based on card title or category
  const handleLaunchMiniGame = () => {
    if (!currentCard) return
    const title = currentCard.title.toLowerCase()
    if (title.includes('flamme')) {
      setActiveMiniGame('flamme_bleue')
    } else if (title.includes('sens') || title.includes('chrono')) {
      setActiveMiniGame('sens_du_temps')
    } else if (title.includes('corde') || title.includes('tir')) {
      setActiveMiniGame('tir_corde')
    } else if (title.includes('tente') || title.includes('arbre')) {
      setActiveMiniGame('sauvetage_tente')
    } else {
      // Random pick
      const pick: ActiveMiniGame[] = ['flamme_bleue', 'sens_du_temps', 'tir_corde', 'sauvetage_tente']
      setActiveMiniGame(pick[Math.floor(Math.random() * pick.length)])
    }
  }

  // Handle mini-game outcome
  const handleMiniGameFinish = (result: MiniGameResult) => {
    setActiveMiniGame('none')

    setPlayers(prev =>
      prev.map(p => {
        if (p.id === result.winnerId) {
          return {
            ...p,
            challengesWon: p.challengesWon + 1,
            sipsGiven: p.sipsGiven + result.sips,
          }
        }
        if (p.id === result.loserId) {
          return {
            ...p,
            challengesLost: p.challengesLost + 1,
            sipsDrunk: p.sipsDrunk + result.sips,
          }
        }
        return p
      })
    )

    advanceNextCard()
  }

  // Handle manual validation (Réussi / Échoué) for passive cards
  const handleValidateCard = (success: boolean) => {
    const sipsVal = currentCard?.sips || 2
    if (duelistP1) {
      setPlayers(prev =>
        prev.map(p => {
          if (p.id === duelistP1.id) {
            return {
              ...p,
              challengesWon: success ? p.challengesWon + 1 : p.challengesWon,
              challengesLost: !success ? p.challengesLost + 1 : p.challengesLost,
              sipsDrunk: !success ? p.sipsDrunk + sipsVal : p.sipsDrunk,
              sipsGiven: success ? p.sipsGiven + sipsVal : p.sipsGiven,
            }
          }
          return p
        })
      )
    }
    advanceNextCard()
  }

  const advanceNextCard = () => {
    const nextIdx = currentCardIndex + 1
    setCurrentCardIndex(nextIdx)
    setRoundNumber(r => r + 1)
    setupCardDuelists(deck[nextIdx % deck.length])
  }

  const handleEndVeillee = () => {
    setPhase('stats')
  }

  const handleRestart = () => {
    setPhase('setup')
  }

  // Player modification
  const handleAddPlayer = (name: string) => {
    const avatars = ['⛺', '🪵', '🔥', '🪓', '🐺', '🦊', '🦅', '🐻', '🌲', '🦉']
    const newPlayer: Player = {
      id: `p_${Date.now()}`,
      name,
      avatar: avatars[players.length % avatars.length],
      sipsDrunk: 0,
      sipsGiven: 0,
      challengesWon: 0,
      challengesLost: 0,
    }
    const updated = [...players, newPlayer]
    setPlayers(updated)
    savePlayers(updated)
  }

  const handleRemovePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id)
    setPlayers(updated)
    savePlayers(updated)
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Vérification de l'accès Maîtrise Vachao...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070b14]/95 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 border border-cyan-500/30 rounded-2xl bg-[#0f1422] space-y-4">
          <div className="text-5xl">⛺</div>
          <h2 className="font-display font-bold text-white text-lg">Période de camp scoute</h2>
          <p className="text-xs text-gray-300 leading-relaxed">{blackoutMessage}</p>
          <a href={hubUrl} className="block w-full py-2.5 bg-cyan-600 rounded-xl font-bold text-sm text-white">
            Retour au Hub
          </a>
        </div>
      </div>
    )
  }

  // Render Mini-Games overlays
  if (activeMiniGame === 'flamme_bleue' && duelistP1 && duelistP2) {
    return (
      <FlammeBleue
        player1={duelistP1}
        player2={duelistP2}
        sips={currentCard?.sips || 2}
        onFinish={handleMiniGameFinish}
      />
    )
  }

  if (activeMiniGame === 'sens_du_temps' && duelistP1 && duelistP2) {
    return (
      <SensDuTemps
        player1={duelistP1}
        player2={duelistP2}
        sips={currentCard?.sips || 2}
        onFinish={handleMiniGameFinish}
      />
    )
  }

  if (activeMiniGame === 'tir_corde' && duelistP1 && duelistP2) {
    return (
      <TirCorde
        player1={duelistP1}
        player2={duelistP2}
        sips={currentCard?.sips || 3}
        onFinish={handleMiniGameFinish}
      />
    )
  }

  if (activeMiniGame === 'sauvetage_tente' && duelistP1 && duelistP2) {
    return (
      <SauvetageTente
        player1={duelistP1}
        player2={duelistP2}
        sips={currentCard?.sips || 2}
        onFinish={handleMiniGameFinish}
      />
    )
  }

  // Phase Setup
  if (phase === 'setup') {
    return (
      <SetupScreen
        players={players}
        selectedMode={gameMode}
        onSelectMode={setGameMode}
        onAddPlayer={handleAddPlayer}
        onRemovePlayer={handleRemovePlayer}
        onStartGame={handleStartGame}
      />
    )
  }

  // Phase Stats / Debriefing
  if (phase === 'stats') {
    return (
      <DebriefingStats
        players={players}
        totalRounds={roundNumber - 1}
        onRestart={handleRestart}
      />
    )
  }

  // Phase Playing
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between">
      {/* Top Bar with Persistent "Terminer la veillée" */}
      <header className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#070b14]/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐮</span>
          <div>
            <div className="font-display font-black text-sm text-cyan-400">VACHAO</div>
            <div className="text-[10px] text-gray-400">Tour #{roundNumber}</div>
          </div>
        </div>

        <button
          onClick={handleEndVeillee}
          className="px-3 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95"
          title="Afficher les statistiques finales"
        >
          <span>🏁</span>
          <span>Terminer la veillée</span>
        </button>
      </header>

      {/* Main Card */}
      {currentCard && (
        <CardView
          card={currentCard}
          player1={duelistP1}
          player2={duelistP2}
          roundNumber={roundNumber}
          totalCards={deck.length}
          onLaunchMiniGame={currentCard.category === 'minijeu' ? handleLaunchMiniGame : undefined}
          onValidate={handleValidateCard}
          onNext={advanceNextCard}
        />
      )}
    </div>
  )
}
