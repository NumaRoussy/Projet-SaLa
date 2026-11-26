import { useState, useEffect, useRef } from 'react'
import type { Player, Card, GameMode, GamePhase, ActiveMiniGame, MiniGameResult } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchVachaoCards, sendTelemetry } from './services/api'
import { SetupScreen } from './components/SetupScreen'
import { CardView } from './components/CardView'
import { DebriefingStats } from './components/DebriefingStats'
import { ProposeModal } from './components/ProposeModal'
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
  const [proposeOpen, setProposeOpen] = useState(false)

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
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
    fetchVachaoCards()
      .then(data => {
        if (data && data.length > 0) setCards(data)
        else setCards(FALLBACK_CARDS)
      })
      .catch(() => setCards(FALLBACK_CARDS))
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

  const setupCardDuelists = (card: Card | undefined, playerList = players) => {
    if (!card || playerList.length < 2) return
    const p1Idx = Math.floor(Math.random() * playerList.length)
    let p2Idx = Math.floor(Math.random() * (playerList.length - 1))
    if (p2Idx >= p1Idx) p2Idx += 1

    setDuelistP1(playerList[p1Idx])
    setDuelistP2(playerList[p2Idx])
  }

  const handleStartGame = () => {
    if (players.length < 2) return
    savePlayers(players)

    let filtered = [...cards]
    if (gameMode === 'pepere') {
      filtered = cards.filter(c => c.mode === 'passif' || c.category === 'carte' || c.category === 'regle')
    } else if (gameMode === 'commando') {
      filtered = cards.filter(c => c.mode === 'actif' || c.category === 'minijeu')
    } else {
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

  const currentCard = deck[currentCardIndex % (deck.length || 1)]

  const handleLaunchMiniGame = () => {
    if (!currentCard) return
    const title = currentCard.title.toLowerCase()
    if (title.includes('flamme')) setActiveMiniGame('flamme_bleue')
    else if (title.includes('sens') || title.includes('chrono')) setActiveMiniGame('sens_du_temps')
    else if (title.includes('corde') || title.includes('tir')) setActiveMiniGame('tir_corde')
    else if (title.includes('tente') || title.includes('arbre')) setActiveMiniGame('sauvetage_tente')
    else {
      const pick: ActiveMiniGame[] = ['flamme_bleue', 'sens_du_temps', 'tir_corde', 'sauvetage_tente']
      setActiveMiniGame(pick[Math.floor(Math.random() * pick.length)])
    }
  }

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

  const handleClearPlayers = () => {
    setPlayers([])
    savePlayers([])
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0e1722] flex items-center justify-center text-sky-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#28527a] border-t-[#32689c] rounded-full animate-spin" />
          <span className="text-sm font-semibold">Vérification de l'accès Maîtrise Vachao...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e1722] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 border border-[#28527a] rounded-2xl bg-[#152233] space-y-4">
          <div className="text-5xl">⛺</div>
          <h2 className="font-display font-bold text-[#f3f4f6] text-lg">Période de camp scoute</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{blackoutMessage}</p>
          <a href={hubUrl} className="block w-full py-2.5 bg-[#32689c] border border-[#28527a] rounded-xl font-bold text-sm text-[#f3f4f6]">
            ← Menu
          </a>
        </div>
      </div>
    )
  }

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

  return (
    <div className="app-container bg-[#0e1722] text-[#f3f4f6]">
      {/* ── En-tête uniforme ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#152233] border-b border-[#28527a] px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <a
              href={hubUrl}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-[#28527a] bg-[#0e1722] hover:bg-[#1c2e45] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              ← Menu
            </a>
          </div>
          <h1 className="justify-self-center font-display font-bold text-base text-[#f3f4f6] truncate">
            Vachao
          </h1>
          <div className="justify-self-end">
            <button
              type="button"
              onClick={() => setProposeOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#28527a] bg-[#32689c] hover:bg-[#3c7ab5] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              <span>💡</span>
              <span>Proposer</span>
            </button>
          </div>
        </div>
      </header>

      {phase === 'setup' && (
        <SetupScreen
          players={players}
          selectedMode={gameMode}
          onSelectMode={setGameMode}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onClearPlayers={handleClearPlayers}
          onStartGame={handleStartGame}
        />
      )}

      {phase === 'stats' && (
        <DebriefingStats
          players={players}
          totalRounds={roundNumber - 1}
          onRestart={() => setPhase('setup')}
        />
      )}

      {phase === 'playing' && (
        <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full">
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
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => setPhase('stats')}
              className="w-full py-2.5 bg-[#2b171b] hover:bg-[#3a1f24] border border-[#7f2d38] text-red-200 rounded-xl text-xs font-semibold transition-colors"
            >
              🏁 Terminer la veillée
            </button>
          </div>
        </div>
      )}

      <footer className="py-3 px-4 text-center border-t border-[#28527a] bg-[#152233] text-[11px] text-slate-400">
        Projet indépendant — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>

      <ProposeModal
        isOpen={proposeOpen}
        initialGameMode={gameMode}
        onClose={() => setProposeOpen(false)}
      />
    </div>
  )
}
