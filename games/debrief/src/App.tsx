import { useEffect, useState, useRef, useMemo } from 'react'
import type { Card, Player, DebriefMode } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchDebriefCards, sendTelemetry } from './services/api'
import { BlackoutScreen } from './components/BlackoutScreen'
import { FeedbackModal } from './components/FeedbackModal'
import { useWakeLock } from './hooks/useWakeLock'

const FALLBACK_CARDS: Card[] = [
  {
    id: 1,
    game: 'debrief',
    mode: 'jamais',
    category: 'carte',
    title: 'Réserve Secrète de Sirop',
    content: "Je n'ai jamais siphonné la bouteille de sirop de grenadine de l'intendance en douce au milieu de la nuit.",
    extra: 'Tous les concernés boivent {sips}',
    sips: 2,
    min_players: 3,
  },
  {
    id: 2,
    game: 'debrief',
    mode: 'jamais',
    category: 'carte',
    title: 'Sommeil de Garde',
    content: "Je n'ai jamais dormi profondément pendant mon propre tour de veille de nuit autour du feu.",
    extra: 'Tous les concernés boivent {sips}',
    sips: 2,
    min_players: 2,
  },
  {
    id: 3,
    game: 'debrief',
    mode: 'jamais',
    category: 'carte',
    title: 'Chute de Saucisse',
    content: "Je n'ai jamais fait tomber un cervelas dans la cendre et l'avoir resservi à un louveteau sans rien dire.",
    extra: 'Tous les coupables boivent {sips}',
    sips: 2,
    min_players: 2,
  },
  {
    id: 4,
    game: 'debrief',
    mode: 'prefere',
    category: 'dilemme',
    title: 'Dilemme des Feuillées',
    content: "Préfères-tu creuser des feuillées de 2 mètres de fond dans un sol caillouteux [A] ou nettoyer les 10 gamelles de fromage fondu sans eau chaude [B] ?",
    extra: 'La minorité boit {sips} gorgées',
    sips: 2,
    min_players: 3,
  },
  {
    id: 5,
    game: 'debrief',
    mode: 'prefere',
    category: 'dilemme',
    title: 'Dilemme Météorologique',
    content: "Préfères-tu passer 14 jours sous la roille avec des chaussettes mouillées [A] ou passer tout le camp avec un intendant qui cuisine sans sel [B] ?",
    extra: 'La minorité boit {sips} gorgées',
    sips: 2,
    min_players: 3,
  },
  {
    id: 6,
    game: 'debrief',
    mode: 'mixte',
    category: 'verite',
    title: 'Le Pire Carnage Culinaire',
    content: "Quel est le plat de camp le plus immangeable que tu as osé servir en faisant semblant que c'était délicieux ?",
    extra: 'Avoue tout ou bois {sips} gorgées',
    sips: 3,
    min_players: 2,
  },
  {
    id: 7,
    game: 'debrief',
    mode: 'mixte',
    category: 'verite',
    title: 'Le Dossier Inavouable',
    content: "Révèle la pire bêtise commise en camp dont les jeunes ou la brigade n'ont jamais su que tu étais l'auteur.",
    extra: 'Confession obligatoire ou {sips} gorgées',
    sips: 3,
    min_players: 2,
  },
]

export default function App() {
  useWakeLock()
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [cards, setCards] = useState<Card[]>([])
  const [currentMode, setCurrentMode] = useState<DebriefMode>('mixte')
  const [currentIndex, setCurrentIndex] = useState(0)

  const [players, setPlayers] = useState<Player[]>([])
  const [designatedPlayer, setDesignatedPlayer] = useState<string | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [totalDrinksCount, setTotalDrinksCount] = useState(0)

  const startTimeRef = useRef<number>(Date.now())
  const hubUrl = getHubUrl()

  // 1. Initial Device Auth & Heartbeat
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

  // 2. Load Cards & Players
  useEffect(() => {
    setPlayers(loadPlayers())

    fetchDebriefCards()
      .then(apiCards => {
        if (apiCards && apiCards.length > 0) {
          setCards(shuffleArray(apiCards))
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
      const elapsed = (Date.now() - startTimeRef.current) / 1000
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

  // Filter cards by selected mode
  const activeDeck = useMemo(() => {
    if (cards.length === 0) return []
    if (currentMode === 'jamais') {
      const filtered = cards.filter(c => c.mode === 'jamais' || c.category === 'jamais')
      return filtered.length > 0 ? filtered : cards
    }
    if (currentMode === 'prefere') {
      const filtered = cards.filter(c => c.mode === 'prefere' || c.category === 'prefere' || c.category === 'dilemme')
      return filtered.length > 0 ? filtered : cards
    }
    // 'mixte' / Fond de Veillée
    return cards
  }, [cards, currentMode])

  const currentCard = activeDeck[currentIndex % (activeDeck.length || 1)]

  // Format content with sips & player placeholders
  const formattedContent = useMemo(() => {
    if (!currentCard) return ''
    let text = currentCard.content

    const sipsVal = currentCard.sips || 2
    text = text.replace(/{sips}/g, `${sipsVal}`)

    if (players.length > 0) {
      const randomP1 = designatedPlayer || players[Math.floor(Math.random() * players.length)].name
      text = text.replace(/{p1}/g, randomP1)
      if (players.length > 1) {
        const others = players.filter(p => p.name !== randomP1)
        const randomP2 = others[Math.floor(Math.random() * others.length)].name
        text = text.replace(/{p2}/g, randomP2)
      }
    }
    return text
  }, [currentCard, players, designatedPlayer])

  const formattedExtra = useMemo(() => {
    const extra = currentCard?.extra || currentCard?.extra_data
    if (!extra) return null
    const sipsVal = currentCard?.sips || 2
    return extra.replace(/{sips}/g, `${sipsVal}`)
  }, [currentCard])

  const drawNextCard = () => {
    setCurrentIndex(prev => prev + 1)
    if (players.length > 0 && Math.random() < 0.6) {
      const random = players[Math.floor(Math.random() * players.length)].name
      setDesignatedPlayer(random)
    } else {
      setDesignatedPlayer(null)
    }
  }

  // Quick drink counter increment
  const handleQuickDrink = (sips = 1) => {
    setTotalDrinksCount(prev => prev + sips)
  }

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const avatars = ['⛺', '🪵', '🔥', '🪓', '🐺', '🦊', '🦅', '🐻']
    const updated = [
      ...players,
      {
        id: 'p_' + Date.now(),
        name: trimmed,
        avatar: avatars[players.length % avatars.length],
        sipsCount: 0,
      },
    ]
    setPlayers(updated)
    savePlayers(updated)
    setNewPlayerName('')
  }

  const removePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id)
    setPlayers(updated)
    savePlayers(updated)
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0d090a] flex items-center justify-center text-amber-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Accès au Débrief de veillée...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return <BlackoutScreen message={blackoutMessage} />
  }

  const modesConfig = [
    { id: 'mixte', label: 'Fond de Veillée', icon: '🔥', desc: 'Mixte' },
    { id: 'jamais', label: 'Je n\'ai jamais', icon: '🤫', desc: 'Spécial Camp' },
    { id: 'prefere', label: 'Tu préfères', icon: '⚖️', desc: 'Dilemmes' },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f090b] via-[#140b0e] to-[#0a0607] text-white flex flex-col justify-between selection:bg-amber-600">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="px-4 py-2.5 border-b border-amber-900/30 flex items-center justify-between sticky top-0 bg-[#0f090b]/95 backdrop-blur-md z-40">
        <div className="flex items-center gap-2.5">
          <a
            href={hubUrl}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-300 hover:text-white"
            title="Retour au Hub"
          >
            ←
          </a>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🔥</span>
              <h1 className="font-display font-black text-sm tracking-wide bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
                DÉBRIEF
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40 font-mono">
                Carnotzet
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Veillée de maîtrise & dossiers d'après-camp</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="py-1 px-2.5 text-xs text-amber-300 border border-amber-500/30 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 flex items-center gap-1"
            title="Proposer une carte"
          >
            <span>✍️</span>
            <span className="hidden sm:inline font-semibold">Proposer</span>
          </button>
          <button
            onClick={() => setShowPlayerModal(true)}
            className="py-1 px-2.5 text-xs text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 flex items-center gap-1"
          >
            <span>👥</span>
            <span className="font-mono font-bold">{players.length}</span>
          </button>
        </div>
      </header>

      {/* ── Mode Selection Tabs ────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-amber-950/40 flex items-center justify-between gap-1.5 bg-[#170e12]/60 backdrop-blur-md">
        {modesConfig.map(m => {
          const isActive = currentMode === m.id
          return (
            <button
              key={m.id}
              onClick={() => {
                setCurrentMode(m.id)
                setCurrentIndex(0)
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/60 border border-amber-400/40'
                  : 'text-gray-400 hover:text-white bg-white/[0.02] border border-white/5'
              }`}
            >
              <span>{m.icon}</span>
              <span className="truncate">{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Main Discussion Card Canvas ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full my-auto py-6">
        {/* Designated Player Badge (if any) */}
        {designatedPlayer && (
          <div className="text-center pb-2 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-500/40 rounded-full text-xs font-bold text-amber-200 shadow-md">
              <span>👉</span>
              <span>Parole à : {designatedPlayer}</span>
            </span>
          </div>
        )}

        {/* Card Frame */}
        <div className="bg-gradient-to-b from-[#1b1015] to-[#12090c] border border-amber-600/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-orange-950/30 text-center space-y-6">
          {/* Card Title */}
          {currentCard?.title && (
            <h2 className="font-display font-black text-xl sm:text-2xl text-amber-100 tracking-wide">
              {currentCard.title}
            </h2>
          )}

          {/* Statement / Dilemma */}
          <p className="font-display text-lg sm:text-xl text-gray-100 font-medium leading-relaxed italic">
            « {formattedContent} »
          </p>

          {/* Extra Rule / Consequence */}
          <div className="flex flex-col items-center gap-2 pt-2">
            {formattedExtra && (
              <span className="text-xs text-amber-300 font-semibold bg-amber-950/50 px-3 py-1 rounded-full border border-amber-800/40">
                💡 {formattedExtra}
              </span>
            )}
            {currentCard?.sips && currentCard.sips > 0 ? (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                <span className="text-sm">🍺</span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  {currentCard.sips} gorgée{currentCard.sips > 1 ? 's' : ''} associées
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Quick Sip Counters Bar & Next Button */}
        <div className="pt-6 space-y-3">
          {/* Interactive sip counting buttons */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-amber-900/30">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 pl-1">
              <span>🍺 Gorgées totales :</span>
              <strong className="text-amber-300 text-sm font-bold">{totalDrinksCount}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleQuickDrink(1)}
                className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 rounded-lg text-xs font-mono font-bold text-amber-200 active:scale-95"
              >
                +1 🍺
              </button>
              <button
                onClick={() => handleQuickDrink(2)}
                className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 rounded-lg text-xs font-mono font-bold text-amber-200 active:scale-95"
              >
                +2 🍺
              </button>
            </div>
          </div>

          <button
            onClick={drawNextCard}
            className="w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:brightness-110 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2"
          >
            <span>Passer à la suite</span>
            <span>→</span>
          </button>
        </div>
      </main>

      {/* ── Player Management Modal ────────────────────────────────────────── */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#180e12] border border-amber-700/30 rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-white">Participants ({players.length})</h3>
              <button
                onClick={() => setShowPlayerModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addPlayer} className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                placeholder="Nouveau chef..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl"
              >
                Ajouter
              </button>
            </form>

            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                >
                  <span className="font-semibold text-gray-200">{p.avatar || '⛺'} {p.name}</span>
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="text-gray-400 hover:text-red-400 text-xs px-1"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPlayerModal(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Feedback Modal ─────────────────────────────────────────────────── */}
      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  )
}
