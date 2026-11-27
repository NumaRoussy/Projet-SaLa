import { useState, useEffect, useRef } from 'react'
import type { Player, Card, GameMode, GamePhase, ActiveMiniGame, MiniGameResult, ActiveRule } from './types'
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
  { id: 3, game: 'vachao', mode: 'passif', category: 'carte', title: 'Dilemme du MOVA', content: 'Préfères-tu revivre la canicule d\'Ulrichen avec 2 tonnes de pain à décharger ou passer 4 heures à remplir un concept J+S sur MiData ?', extra: 'Les minoritaires boivent {sips}', sips: 2, loss_percent: 0, min_players: 3 },
  { id: 4, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Flamme Bleue (Réflexe)', content: 'Duel tactile entre {p1} et {p2} : touchez l\'écran dès que la flamme devient bleu vif. Le plus lent boit {sips} gorgées.', extra: 'Duel réflexe', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 5, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Sens du Temps (Chrono)', content: 'Chrono à l\'aveugle : estimez le temps cible les yeux fermés. Le joueur qui s\'éloigne le plus du chrono boit {sips} gorgées.', extra: 'Duel chrono', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 6, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Tir à la Corde (Tug-of-War)', content: 'Duel tactile : marteler frénétiquement votre moitié d\'écran pour tirer le foulard scout vers votre camp.', extra: 'Duel de force', sips: 3, loss_percent: 0, min_players: 2 },
  { id: 7, game: 'vachao', mode: 'actif', category: 'minijeu', title: 'Sauvetage de Tente', content: 'Défendez la tente scoute ! Des troncs tombent du ciel : détruisez-les au swipe avant qu\'ils n\'écrasent le campement.', extra: 'Mini-jeu tactile', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 8, game: 'vachao', mode: 'actif', category: 'carte', title: 'Virelangue du Sarasani', content: '{p1} doit réciter 3 fois sans bégayer : « Six sarasanis suisses sèchent sur six souches scoutes ». Si raté boit {sips} gorgées.', extra: 'Défi vocal', sips: 2, loss_percent: 0, min_players: 2 },
  { id: 9, game: 'vachao', mode: 'passif', category: 'carte', title: 'L\'Ambulance en Allemand', content: 'Tous ceux qui ont déjà eu une grosse sueur froide en essayant d\'expliquer un bobo au 144 en suisse-allemand boivent {sips} gorgées.', extra: 'Tournée générale', sips: 3, loss_percent: 0, min_players: 3 },
  { id: 10, game: 'vachao', mode: 'passif', category: 'carte', title: 'Météo Jurassienne', content: 'Préfères-tu 10 jours de roille non-stop à Plambuit ou oublier la Malle de maîtrise à la gare de Lausanne ?', extra: 'Choix cornélien : {sips} gorgées', sips: 2, loss_percent: 0, min_players: 3 },
]

function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function readHistory(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeHistory(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Ignore storage quota errors
  }
}

function getCardKey(card: Card): string {
  return (card.content || card.title || String(card.id)).trim().toLowerCase()
}

function parseRuleDuration(extra: string | null): number {
  if (!extra) return 3
  const match = extra.match(/dur[ée]e\s*:\s*(\d+)/i)
  if (match) {
    const val = parseInt(match[1], 10)
    if (val > 0) return val
  }
  return 3
}

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
  const [activeRules, setActiveRules] = useState<ActiveRule[]>([])

  const justDrawnRuleIdRef = useRef<string | null>(null)
  const playerQueueRef = useRef<string[]>([])
  const lastPickedPlayerRef = useRef<string | null>(null)
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

  const pickNextPlayerFromQueue = (playerList: Player[], excludeId?: string): Player | null => {
    if (playerList.length === 0) return null
    const validIds = new Set(playerList.map(p => p.id))
    let queue = playerQueueRef.current.filter(id => validIds.has(id))

    if (queue.length === 0) {
      queue = shuffleArray(playerList.map(p => p.id))
      if (queue.length > 1 && queue[0] === lastPickedPlayerRef.current) {
        const swapIdx = 1 + Math.floor(Math.random() * (queue.length - 1))
        ;[queue[0], queue[swapIdx]] = [queue[swapIdx], queue[0]]
      }
    }

    let pickedIdx = queue.findIndex(id => id !== excludeId)
    if (pickedIdx === -1) {
      queue = shuffleArray(playerList.map(p => p.id))
      pickedIdx = queue.findIndex(id => id !== excludeId)
      if (pickedIdx === -1) pickedIdx = 0
    }

    const pickedId = queue[pickedIdx]
    queue.splice(pickedIdx, 1)
    playerQueueRef.current = queue
    lastPickedPlayerRef.current = pickedId

    return playerList.find(p => p.id === pickedId) || playerList[0]
  }

  const setupCardDuelists = (card: Card | undefined, playerList = players) => {
    if (!card || playerList.length < 2) return
    const p1 = pickNextPlayerFromQueue(playerList)
    const p2 = pickNextPlayerFromQueue(playerList, p1?.id)
    setDuelistP1(p1)
    setDuelistP2(p2)
  }

  const markCardAsSeen = (card: Card | undefined, mode: GameMode) => {
    if (!card) return
    const storageKey = `scoutgame_history_vachao_${mode}`
    const cardKey = getCardKey(card)
    const prev = readHistory(storageKey)
    writeHistory(storageKey, [...prev.filter(k => k !== cardKey), cardKey])
  }

  const buildOrderedDeck = (pool: Card[], mode: GameMode): Card[] => {
    const uniqueMap = new Map<string, Card>()
    for (const c of pool) {
      const k = getCardKey(c)
      if (!uniqueMap.has(k)) uniqueMap.set(k, c)
    }
    const uniqueCards = Array.from(uniqueMap.values())
    const storageKey = `scoutgame_history_vachao_${mode}`
    const history = readHistory(storageKey)
    const historySet = new Set(history)

    const unseen = uniqueCards.filter(c => !historySet.has(getCardKey(c)))
    if (unseen.length > 0) {
      return shuffleArray(unseen)
    }

    // Toutes les cartes du mode ont été jouées : réinitialise en gardant la dernière jouée
    const lastKey = history.length > 0 ? history[history.length - 1] : null
    const nextHistory = lastKey && uniqueCards.length > 1 ? [lastKey] : []
    writeHistory(storageKey, nextHistory)
    const resetSet = new Set(nextHistory)
    const fresh = uniqueCards.filter(c => !resetSet.has(getCardKey(c)))
    return shuffleArray(fresh.length > 0 ? fresh : uniqueCards)
  }

  const activateRuleForCard = (card: Card | undefined) => {
    if (!card || card.category !== 'regle') {
      justDrawnRuleIdRef.current = null
      return
    }

    const duration = parseRuleDuration(card.extra)
    const sipsVal = card.sips || 1
    const formattedContent = card.content.replace(/{sips}/g, String(sipsVal))
    const ruleId = String(card.id || card.title || Date.now())
    const ruleTitle = card.title || 'Règle active'

    justDrawnRuleIdRef.current = ruleId
    setActiveRules(prev => [
      ...prev.filter(r => r.id !== ruleId && r.title !== ruleTitle),
      {
        id: ruleId,
        title: ruleTitle,
        content: formattedContent,
        remainingTurns: duration,
      },
    ])
  }

  const handleStartGame = () => {
    if (players.length < 2) return
    const resetPlayers = players.map(p => ({
      ...p,
      sipsDrunk: 0,
      sipsGiven: 0,
      challengesWon: 0,
      challengesLost: 0,
    }))
    setPlayers(resetPlayers)
    savePlayers(resetPlayers)
    playerQueueRef.current = []
    lastPickedPlayerRef.current = null
    setActiveRules([])
    justDrawnRuleIdRef.current = null

    let filtered = [...cards]
    if (gameMode === 'pepere') {
      filtered = cards.filter(c => c.mode === 'passif' || c.category === 'carte' || c.category === 'regle')
    } else if (gameMode === 'commando') {
      filtered = cards.filter(c => c.mode === 'actif' || c.category === 'minijeu')
    } else {
      filtered = cards.filter(c => c.mode === 'passif' || c.mode === 'actif' || c.category === 'minijeu' || c.category === 'carte' || c.category === 'regle')
    }

    if (filtered.length === 0) filtered = FALLBACK_CARDS
    const ordered = buildOrderedDeck(filtered, gameMode)
    setDeck(ordered)
    setCurrentCardIndex(0)
    setRoundNumber(1)
    markCardAsSeen(ordered[0], gameMode)
    setupCardDuelists(ordered[0], resetPlayers)
    activateRuleForCard(ordered[0])
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
        if (result.winnerId && result.loserId) {
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
        } else if (p.id === duelistP1?.id || p.id === duelistP2?.id) {
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

  const handleDesignatePlayer = (playerId: string) => {
    const sipsVal = currentCard?.sips || 2
    const distributorId = currentCard?.content.includes('{p1}') ? duelistP1?.id : undefined
    setPlayers(prev =>
      prev.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            sipsDrunk: p.sipsDrunk + sipsVal,
          }
        }
        if (distributorId && p.id === distributorId) {
          return {
            ...p,
            sipsGiven: p.sipsGiven + sipsVal,
          }
        }
        return p
      })
    )
    advanceNextCard()
  }

  const handleIndividualChallenge = (success: boolean) => {
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
            }
          }
          return p
        })
      )
    }
    advanceNextCard()
  }

  const handleDuelResult = (loserId: string) => {
    const sipsVal = currentCard?.sips || 2
    const winnerId = loserId === duelistP1?.id ? duelistP2?.id : duelistP1?.id
    setPlayers(prev =>
      prev.map(p => {
        if (p.id === loserId) {
          return {
            ...p,
            challengesLost: p.challengesLost + 1,
            sipsDrunk: p.sipsDrunk + sipsVal,
          }
        }
        if (winnerId && p.id === winnerId) {
          return {
            ...p,
            challengesWon: p.challengesWon + 1,
            sipsGiven: p.sipsGiven + sipsVal,
          }
        }
        return p
      })
    )
    advanceNextCard()
  }

  const advanceNextCard = () => {
    const skipRuleId = justDrawnRuleIdRef.current
    setActiveRules(prev =>
      prev
        .map(rule =>
          rule.id === skipRuleId
            ? rule
            : { ...rule, remainingTurns: rule.remainingTurns - 1 }
        )
        .filter(rule => rule.remainingTurns > 0)
    )

    const nextIdx = currentCardIndex + 1
    let activeDeck = deck
    let targetIdx = nextIdx

    if (nextIdx >= deck.length) {
      let pool = [...cards]
      if (gameMode === 'pepere') {
        pool = cards.filter(c => c.mode === 'passif' || c.category === 'carte' || c.category === 'regle')
      } else if (gameMode === 'commando') {
        pool = cards.filter(c => c.mode === 'actif' || c.category === 'minijeu')
      }
      if (pool.length === 0) pool = FALLBACK_CARDS
      activeDeck = buildOrderedDeck(pool, gameMode)
      setDeck(activeDeck)
      targetIdx = 0
    }

    const nextCard = activeDeck[targetIdx]
    setCurrentCardIndex(targetIdx)
    setRoundNumber(r => r + 1)
    markCardAsSeen(nextCard, gameMode)
    setupCardDuelists(nextCard)
    activateRuleForCard(nextCard)
  }

  const handleAddPlayer = (name: string) => {
    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name,
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
      <div className="min-h-screen bg-[#16181d] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2e323c] border-t-[#2d6394] rounded-full animate-spin" />
          <span className="text-sm font-semibold">Vérification de l'accès Maîtrise Vachao...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return (
      <div className="fixed inset-0 z-50 bg-[#16181d] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 border border-[#2d6394] rounded-2xl bg-[#1f2229] space-y-4">
          <h2 className="font-display font-bold text-[#f3f4f6] text-lg">Période de camp scoute</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{blackoutMessage}</p>
          <a href={hubUrl} className="btn-primary w-full">
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
    <div className="app-container bg-[#16181d] text-[#f3f4f6]">
      {/* ── En-tête uniforme ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1f2229] border-b border-[#2d6394] px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <a
              href={hubUrl}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-[#2e323c] bg-[#16181d] hover:bg-[#262a33] text-[#f3f4f6] text-xs font-semibold transition-colors"
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#b5892e] bg-[#1f2229] hover:bg-[#262a33] text-[#f3f4f6] text-xs font-semibold transition-colors"
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
          {activeRules.length > 0 && (
            <div className="px-4 pt-3 space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#e5be6d]">
                Règles actives ({activeRules.length})
              </div>
              {activeRules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-[#1f2229] border border-[#b5892e] text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[#f3f4f6] block truncate">{rule.title}</span>
                    <span className="text-[11px] text-slate-300 leading-snug line-clamp-2 block">
                      {rule.content}
                    </span>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#16181d] border border-[#b5892e] text-[#e5be6d] font-mono font-bold text-[10px]">
                    {rule.remainingTurns === 1
                      ? 'Dernier tour'
                      : `${rule.remainingTurns} tours restants`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {currentCard && (
            <CardView
              card={currentCard}
              players={players}
              player1={duelistP1}
              player2={duelistP2}
              roundNumber={roundNumber}
              totalCards={deck.length}
              onLaunchMiniGame={currentCard.category === 'minijeu' ? handleLaunchMiniGame : undefined}
              onDesignatePlayer={handleDesignatePlayer}
              onIndividualChallenge={handleIndividualChallenge}
              onDuelResult={handleDuelResult}
              onNext={advanceNextCard}
            />
          )}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => setPhase('stats')}
              className="w-full py-2.5 bg-[#1f2229] hover:bg-[#262a33] border border-[#9b2c37] text-red-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Terminer la veillée
            </button>
          </div>
        </div>
      )}

      <footer className="py-3 px-4 text-center border-t border-[#2e323c] bg-[#1f2229] text-[11px] text-slate-400">
        Projet indépendant. Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>

      <ProposeModal
        isOpen={proposeOpen}
        initialGameMode={gameMode}
        onClose={() => setProposeOpen(false)}
      />
    </div>
  )
}
