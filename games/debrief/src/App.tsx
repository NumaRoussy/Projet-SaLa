import { useEffect, useState, useRef, useMemo } from 'react'
import type { Card, Player } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchDebriefCards, sendTelemetry } from './services/api'
import { BlackoutScreen } from './components/BlackoutScreen'
import { FeedbackModal } from './components/FeedbackModal'

const FALLBACK_CARDS: Card[] = [
  {
    game_id: 'debrief',
    category: 'verite',
    title: 'Vérité Intendance',
    content: "Quel est le pire plat que tu as servi en camp sans assumer l'échec ?",
    extra_data: 'Avoue ou prends {sips} gorgées',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content: "Je n'ai jamais dormi pendant mon propre tour de veille de nuit.",
    extra_data: 'Tous les concernés boivent {sips}',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'verite',
    title: 'Gaffe Nocturne',
    content: "Quelle est la pire gaffe ou bêtise que tu as commise en raid sans jamais l'avouer ?",
    extra_data: 'Avoue tout ou bois {sips} gorgées',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'verite',
    title: 'Coup de Cœur de Maîtrise',
    content: "As-tu déjà eu un crush inavoué pour un animateur ou une animatrice d'un autre groupe ?",
    extra_data: 'Révèle le prénom ou bois {sips} gorgées',
    sips: 3,
  },
  {
    game_id: 'debrief',
    category: 'verite',
    title: 'Flemme Matinale',
    content: "Quel matin de camp as-tu prétendu être malade ou indisponible pour échapper au réveil matinal ?",
    extra_data: 'Confesse-toi ou prends {sips} gorgées',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'verite',
    title: 'Perte de Matériel',
    content: "Quel objet cher ou symbolique as-tu perdu en camp en faisant porter le chapeau à un jeune ?",
    extra_data: 'Assume ou bois {sips} gorgées',
    sips: 3,
  },
  {
    game_id: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content: "Je n'ai jamais fait brûler la gamelle de pâtes au point d'enfumer tout le sous-bois.",
    extra_data: 'Tous les coupables boivent {sips}',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content: "Je n'ai jamais falsifié un message codé en grand jeu pour que ma troupe gagne.",
    extra_data: 'Les tricheurs boivent {sips}',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content: "Je n'ai jamais oublié d'éteindre complètement le feu de camp avant d'aller dormir.",
    extra_data: 'Ceux qui ont eu chaud boivent {sips}',
    sips: 3,
  },
  {
    game_id: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content: "Je n'ai jamais caché de la nourriture industrielle dans mon sac lors d'un week-end de survie.",
    extra_data: 'Les gourmands boivent {sips}',
    sips: 2,
  },
  {
    game_id: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content: "Je n'ai jamais confondu deux éclaireurs pendant toute une semaine de camp sans qu'ils le sachent.",
    extra_data: 'Tous les concernés boivent {sips}',
    sips: 1,
  },
]

type FilterMode = 'all' | 'verite' | 'jamais'

export default function App() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const [players, setPlayers] = useState<Player[]>([])
  const [designatedPlayer, setDesignatedPlayer] = useState<string | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  const [historyCount, setHistoryCount] = useState(1)
  const startTimeRef = useRef<number>(Date.now())
  const hubUrl = getHubUrl()

  // 1. Initial Device Auth & Heartbeat
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    async function checkAuth() {
      const pass = loadDevicePass()
      if (!pass) {
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
        // En cas d'erreur réseau, on permet l'accès temporaire si pass existe
        setIsVerifying(false)
      }
    }

    checkAuth()

    // Heartbeat toutes les 30 secondes
    timer = setInterval(async () => {
      const pass = loadDevicePass()
      if (!pass) {
        window.location.href = hubUrl
        return
      }
      try {
        const res = await verifyDevice(pass)
        if (res.blackout) {
          setBlackoutMessage(res.reason || 'Période de camp en cours.')
        } else if (!res.valid) {
          window.location.href = hubUrl
        }
      } catch {
        // Silencieux sur heartbeat
      }
    }, 30_000)

    return () => {
      if (timer) clearInterval(timer)
    }
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
    const handleBeforeUnload = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      sendTelemetry(elapsed)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      sendTelemetry(elapsed)
    }
  }, [])

  // Helper shuffle
  function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  // Filtered Cards
  const activeDeck = useMemo(() => {
    if (cards.length === 0) return []
    if (filterMode === 'all') return cards
    return cards.filter(c => c.category === filterMode)
  }, [cards, filterMode])

  const currentCard = activeDeck[currentIndex % (activeDeck.length || 1)]

  // Format content with sips & player placeholders
  const formattedContent = useMemo(() => {
    if (!currentCard) return ''
    let text = currentCard.content

    const sipsVal = currentCard.sips || Math.floor(Math.random() * 2) + 2
    text = text.replace(/{sips}/g, `${sipsVal}`)

    // Player replacement if present
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
    if (!currentCard || !currentCard.extra_data) return null
    let extra = currentCard.extra_data
    const sipsVal = currentCard.sips || 2
    extra = extra.replace(/{sips}/g, `${sipsVal}`)
    return extra
  }, [currentCard])

  const drawNextCard = () => {
    setCurrentIndex(prev => prev + 1)
    setHistoryCount(prev => prev + 1)
    // Re-pick or clear designated player
    if (players.length > 0 && Math.random() < 0.6) {
      const random = players[Math.floor(Math.random() * players.length)].name
      setDesignatedPlayer(random)
    } else {
      setDesignatedPlayer(null)
    }
  }

  const pickRandomResponsable = () => {
    if (players.length === 0) return
    const random = players[Math.floor(Math.random() * players.length)].name
    setDesignatedPlayer(random)
  }

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const updated = [...players, { id: 'p_' + Date.now(), name: trimmed }]
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
      <div className="app-container bg-[#0b0e14] flex items-center justify-center text-purple-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Vérification de l'accès maîtrise…</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return <BlackoutScreen message={blackoutMessage} />
  }

  const isVerite = currentCard?.category === 'verite'

  return (
    <div className="app-container bg-[#0b0e14] text-white">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0b0e14]/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-2.5">
          <a
            href={hubUrl}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs text-gray-300 hover:text-white hover:bg-white/15"
            title="Retour au Hub"
          >
            ←
          </a>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🤫</span>
              <h1 className="font-display font-black text-sm tracking-wide bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                DÉBRIEF
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40 font-mono">
                Face B
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Veillée de maîtrise & confidences (Froideville)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="btn-ghost py-1 px-2.5 text-xs text-purple-300 border border-purple-500/30 rounded-lg bg-purple-950/30 hover:bg-purple-900/50"
            title="Proposer une carte"
          >
            <span>✍️</span>
            <span className="hidden sm:inline ml-1 font-semibold">Proposer</span>
          </button>
          <button
            onClick={() => setShowPlayerModal(true)}
            className="btn-ghost py-1 px-2.5 text-xs text-gray-300 border border-white/10 rounded-lg hover:bg-white/10"
          >
            <span>👥</span>
            <span className="ml-1 font-mono font-bold">{players.length}</span>
          </button>
        </div>
      </header>

      {/* ── Filter / Category Bar ─────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between gap-2 bg-[#12161f]">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mixte
          </button>
          <button
            onClick={() => setFilterMode('verite')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              filterMode === 'verite'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🤫</span>
            <span>Vérités</span>
          </button>
          <button
            onClick={() => setFilterMode('jamais')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              filterMode === 'jamais'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🍻</span>
            <span>Je n'ai jamais</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap">
          #{historyCount}
        </span>
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 p-4 flex flex-col items-center justify-between max-w-lg mx-auto w-full gap-4">
        {/* Designated Player Alert (for Truths) */}
        {isVerite && (
          <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <div>
                <span className="text-gray-400">Responsable désigné : </span>
                <strong className="text-purple-300 font-bold">
                  {designatedPlayer || (players.length > 0 ? 'Aucun (au choix)' : 'Ajoutez votre maîtrise')}
                </strong>
              </div>
            </div>
            {players.length > 0 && (
              <button
                onClick={pickRandomResponsable}
                className="btn-ghost py-1 px-2 text-[11px] text-purple-200 border border-purple-400/30 rounded-lg hover:bg-purple-900/50"
              >
                🎲 Tirer au sort
              </button>
            )}
          </div>
        )}

        {/* ── Main Card ───────────────────────────────────────────────────── */}
        <div className="w-full flex-1 flex flex-col justify-center my-auto min-h-[340px]">
          {currentCard ? (
            <div
              key={currentIndex}
              onClick={drawNextCard}
              className={`glass-card p-6 md:p-8 flex flex-col justify-between cursor-pointer select-none transition-all duration-300 border shadow-2xl relative overflow-hidden group ${
                isVerite
                  ? 'border-purple-500/30 hover:border-purple-500/60 shadow-purple-950/30 bg-gradient-to-b from-[#1c142b]/90 to-[#12161f]/90'
                  : 'border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/20 bg-gradient-to-b from-[#241a12]/90 to-[#12161f]/90'
              }`}
            >
              {/* Subtle background glow */}
              <div
                className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 ${
                  isVerite ? 'bg-purple-500' : 'bg-amber-500'
                }`}
              />

              {/* Card Badge & Category */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    isVerite
                      ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <span>{isVerite ? '🤫' : '🍻'}</span>
                  <span>{isVerite ? 'Vérité' : "Je n'ai jamais"}</span>
                </span>

                {currentCard.sips && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
                    🍺 {currentCard.sips} {currentCard.sips > 1 ? 'gorgées' : 'gorgée'}
                  </span>
                )}
              </div>

              {/* Card Title */}
              <h2 className="font-display font-black text-xl md:text-2xl text-white mb-4">
                {currentCard.title}
              </h2>

              {/* Card Content Statement */}
              <p className="text-base md:text-lg text-gray-100 font-medium leading-relaxed my-auto">
                {formattedContent}
              </p>

              {/* Card Penalty / Consequence */}
              {formattedExtra && (
                <div
                  className={`mt-6 p-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
                    isVerite
                      ? 'bg-purple-950/50 border-purple-500/30 text-purple-200'
                      : 'bg-amber-950/50 border-amber-500/30 text-amber-200'
                  }`}
                >
                  <span className="text-lg">⚖️</span>
                  <span>{formattedExtra}</span>
                </div>
              )}

              {/* Tap to continue indicator */}
              <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                <span>Cliquez pour passer ➔</span>
                <span className="font-mono text-[10px]">Scout Débrief</span>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center space-y-3">
              <div className="text-4xl">🏕️</div>
              <h3 className="font-bold text-white text-base">Aucune carte disponible</h3>
              <p className="text-xs text-gray-400">Changez de filtre ou ajoutez des cartes.</p>
            </div>
          )}
        </div>

        {/* ── Actions Footer ──────────────────────────────────────────────── */}
        <div className="w-full space-y-2">
          <button
            onClick={drawNextCard}
            className="btn-primary w-full py-4 text-base font-black shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
          >
            🔥 Confession suivante ➔
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="btn-secondary flex-1 py-2 text-xs text-gray-300 flex items-center justify-center gap-1.5"
            >
              <span>✍️</span>
              <span>Proposer une carte</span>
            </button>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn-secondary flex-1 py-2 text-xs text-gray-300 flex items-center justify-center gap-1.5"
            >
              <span>👥</span>
              <span>Gérer la maîtrise ({players.length})</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── Player Management Modal ───────────────────────────────────────── */}
      {showPlayerModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0"
          onClick={() => setShowPlayerModal(false)}
        >
          <div
            className="glass-card w-full max-w-md rounded-b-none rounded-t-3xl p-6 space-y-4 max-h-[80dvh] overflow-y-auto border border-purple-500/30"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Membres de la maîtrise</h3>
                <p className="text-xs text-gray-400">Pour cibler les questions et vérités</p>
              </div>
              <button onClick={() => setShowPlayerModal(false)} className="btn-ghost py-1 px-3 text-xs">✕</button>
            </div>

            <form onSubmit={addPlayer} className="flex gap-2">
              <input
                type="text"
                placeholder="Prénom ou totem…"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                className="input-scout py-2 text-xs flex-1"
              />
              <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold">
                Ajouter
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {players.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">Aucun prénom renseigné.</p>
              ) : (
                players.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10"
                  >
                    <span>{p.name}</span>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="text-gray-400 hover:text-red-400 ml-1 text-sm font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <button onClick={() => setShowPlayerModal(false)} className="btn-secondary w-full py-2.5 text-xs font-bold">
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* ── Feedback / Card Proposal Modal ─────────────────────────────────── */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  )
}
