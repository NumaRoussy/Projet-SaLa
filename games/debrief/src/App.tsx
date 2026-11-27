import { useEffect, useState, useRef, useMemo } from 'react'
import type { Card, Player, DebriefMode } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchDebriefCards, sendTelemetry } from './services/api'
import { BlackoutScreen } from './components/BlackoutScreen'
import { FeedbackModal } from './components/FeedbackModal'
import { SetupScreen } from './components/SetupScreen'
import { useWakeLock } from './hooks/useWakeLock'

const FALLBACK_CARDS: Card[] = [
  {
    id: 1,
    game: 'debrief',
    mode: 'debrief',
    category: 'dossiers',
    title: 'La boulette cachée au QM',
    content:
      '{p1}, quelle est la pire pièce de matériel (carré militaire moisi, mât tordu, tente Spatz déchirée) que tu as rangée en douce au local en espérant que le QM ne le voie jamais ?',
    extra: 'Avoue le dossier ou bois {sips} gorgées.',
    sips: 3,
    min_players: 2,
  },
  {
    id: 2,
    game: 'debrief',
    mode: 'debrief',
    category: 'dossiers',
    title: 'Le dossier de Froideville',
    content:
      "{p1}, quelle est la chose la plus honteuse ou improbable que tu aies faite lors d'un week-end de maîtrise à la cabane de Froideville ou après une AG cantonale ?",
    extra: 'Avoue le dossier ou bois {sips} gorgées.',
    sips: 4,
    min_players: 2,
  },
  {
    id: 3,
    game: 'debrief',
    mode: 'debrief',
    category: 'dossiers',
    title: 'Falsification de grille 3x3',
    content:
      "{p1}, raconte la fois où tu as rempli une analyse de risques 3x3 ou une fiche J+S à l'arrache dans la voiture sur le trajet du camp, ou carrément après l'activité.",
    extra: 'Avoue le dossier ou bois {sips} gorgées.',
    sips: 3,
    min_players: 2,
  },
  {
    id: 4,
    game: 'debrief',
    mode: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content:
      "Je n'ai jamais plié un carré militaire Gothard ou Berlingot encore trempé sans le talquer en croisant les doigts pour que ce soit un autre responsable qui l'ouvre au camp suivant.",
    extra: 'Si tu as déjà, tu bois {sips} gorgées.',
    sips: 3,
    min_players: 2,
  },
  {
    id: 5,
    game: 'debrief',
    mode: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content:
      "Je n'ai jamais dormi ou somnolé pendant mon propre tour de veille de nuit ou pendant un grand jeu nocturne au milieu de la forêt.",
    extra: 'Si tu as déjà, tu bois {sips} gorgées.',
    sips: 3,
    min_players: 2,
  },
  {
    id: 6,
    game: 'debrief',
    mode: 'debrief',
    category: 'jamais',
    title: "Je n'ai jamais",
    content:
      "Je n'ai jamais passé la panosse à l'arrache dans la cabane de Froideville ou au local en planquant la poussière sous un tapis ou derrière la Malle de maîtrise.",
    extra: 'Si tu as déjà, tu bois {sips} gorgées.',
    sips: 2,
    min_players: 2,
  },
  {
    id: 7,
    game: 'debrief',
    mode: 'debrief',
    category: 'prefere',
    title: 'Galère de campement',
    content:
      'Tu préfères monter un Sarasani complet sous une roille battante de nuit, ou devoir sécher et talquer 15 carrés militaires Gothard moisis au local ?',
    extra: 'A: Monter le Sarasani sous la roille | B: Talquer 15 carrés moisis',
    sips: 3,
    min_players: 3,
  },
  {
    id: 8,
    game: 'debrief',
    mode: 'debrief',
    category: 'prefere',
    title: 'Menu de survie',
    content:
      'Tu préfères manger uniquement du Chili Sin Carne tiède pendant 10 jours de camp, ou finir les palettes de pain sec du MOVA à tous les repas ?',
    extra: 'A: Chili Sin Carne pendant 10 jours | B: Pain sec du MOVA à vie',
    sips: 3,
    min_players: 3,
  },
  {
    id: 9,
    game: 'debrief',
    mode: 'debrief',
    category: 'prefere',
    title: '3e mi-temps de Froideville',
    content:
      'Tu préfères passer la panosse dans tout le carnotzet de Froideville à 7h du matin le dimanche, ou faire tous les allers-retours à la déchetterie avec la remorque ?',
    extra: 'A: Panosse à 7h du mat | B: Corvée déchetterie avec remorque',
    sips: 2,
    min_players: 3,
  },
]

function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalizeCardCategory(card: Card): DebriefMode {
  if (card.category === 'jamais' || card.mode === 'jamais') return 'jamais'
  if (card.category === 'prefere' || card.category === 'dilemme' || card.mode === 'prefere') {
    return 'prefere'
  }
  return 'dossiers'
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

function buildOrderedDeck(pool: Card[], modes: DebriefMode[]): Card[] {
  const uniqueMap = new Map<string, Card>()
  for (const c of pool) {
    const cat = normalizeCardCategory(c)
    if (!modes.includes(cat)) continue
    const k = getCardKey(c)
    if (!uniqueMap.has(k)) uniqueMap.set(k, c)
  }

  const allSelected = Array.from(uniqueMap.values())
  const unseen: Card[] = []
  const byCatHistory: Record<DebriefMode, Set<string>> = {
    dossiers: new Set(readHistory('scoutgame_history_debrief_dossiers')),
    jamais: new Set(readHistory('scoutgame_history_debrief_jamais')),
    prefere: new Set(readHistory('scoutgame_history_debrief_prefere')),
  }

  for (const c of allSelected) {
    const cat = normalizeCardCategory(c)
    if (!byCatHistory[cat].has(getCardKey(c))) {
      unseen.push(c)
    }
  }

  if (unseen.length > 0) {
    return shuffleArray(unseen)
  }

  // Tout est épuisé pour ces modes : réinitialise en gardant la dernière carte de chaque mode sélectionné
  const resetKeepKeys = new Set<string>()
  for (const m of modes) {
    const key = `scoutgame_history_debrief_${m}`
    const h = readHistory(key)
    const last = h.length > 0 ? [h[h.length - 1]] : []
    writeHistory(key, last)
    if (last[0]) resetKeepKeys.add(last[0])
  }

  const fresh = allSelected.filter(c => !resetKeepKeys.has(getCardKey(c)))
  return shuffleArray(fresh.length > 0 ? fresh : allSelected)
}

function markCardSeen(card: Card | undefined): void {
  if (!card) return
  const cat = normalizeCardCategory(card)
  const storageKey = `scoutgame_history_debrief_${cat}`
  const key = getCardKey(card)
  const prev = readHistory(storageKey)
  writeHistory(storageKey, [...prev.filter(k => k !== key), key])
}

function parsePrefereOptions(extra?: string | null): { optionA: string; optionB: string } | null {
  if (!extra || !extra.includes('|')) return null
  const parts = extra.split('|').map(s => s.trim())
  if (parts.length < 2) return null
  const optionA = parts[0].replace(/^A\s*:\s*/i, '').trim()
  const optionB = parts[1].replace(/^B\s*:\s*/i, '').trim()
  if (!optionA || !optionB) return null
  return { optionA, optionB }
}

function formatSipsLabel(sips?: number): string {
  const val = sips && sips > 0 ? sips : 2
  return val === 1 ? '1 gorgée' : `${val} gorgées`
}

function renderCardContent(text: string, p1Name: string | null, p2Name: string | null) {
  const tokens = text.split(/(\{p1\}|\{p2\})/g)
  return tokens.map((part, idx) => {
    if (part === '{p1}') {
      return (
        <span
          key={idx}
          className="inline-block px-2 py-0.5 mx-0.5 rounded-lg bg-[#16181d] text-[#e5be6d] border border-[#b5892e] font-bold not-italic"
        >
          {p1Name || 'Un responsable'}
        </span>
      )
    }
    if (part === '{p2}') {
      return (
        <span
          key={idx}
          className="inline-block px-2 py-0.5 mx-0.5 rounded-lg bg-[#16181d] text-[#f3f4f6] border border-[#2e323c] font-bold not-italic"
        >
          {p2Name || 'un autre responsable'}
        </span>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

export default function App() {
  useWakeLock()
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [phase, setPhase] = useState<'setup' | 'playing'>('setup')
  const [selectedModes, setSelectedModes] = useState<DebriefMode[]>(['dossiers', 'jamais', 'prefere'])

  const [allCards, setAllCards] = useState<Card[]>([])
  const [gameDeck, setGameDeck] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null)
  const [secondaryPlayer, setSecondaryPlayer] = useState<string | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  const playerQueueRef = useRef<string[]>([])
  const lastPickedRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())
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
    fetchDebriefCards()
      .then(apiCards => {
        if (apiCards && apiCards.length > 0) setAllCards(apiCards)
        else setAllCards(FALLBACK_CARDS)
      })
      .catch(() => setAllCards(FALLBACK_CARDS))
  }, [])

  useEffect(() => {
    return () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      sendTelemetry(elapsed)
    }
  }, [])

  const pickNextPlayerName = (excludeName?: string | null): string | null => {
    if (players.length === 0) return null
    const validNames = new Set(players.map(p => p.name))
    let queue = playerQueueRef.current.filter(name => validNames.has(name))

    if (queue.length === 0) {
      queue = shuffleArray(players.map(p => p.name))
      if (queue.length > 1 && queue[0] === lastPickedRef.current) {
        const swapIdx = 1 + Math.floor(Math.random() * (queue.length - 1))
        ;[queue[0], queue[swapIdx]] = [queue[swapIdx], queue[0]]
      }
    }

    let idx = excludeName ? queue.findIndex(n => n !== excludeName) : 0
    if (idx === -1) {
      queue = shuffleArray(players.map(p => p.name))
      idx = excludeName ? queue.findIndex(n => n !== excludeName) : 0
      if (idx === -1) idx = 0
    }

    const picked = queue[idx]
    queue.splice(idx, 1)
    playerQueueRef.current = queue
    lastPickedRef.current = picked
    return picked
  }

  const toggleMode = (mode: DebriefMode) => {
    setSelectedModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    )
  }

  const handleAddPlayer = (name: string) => {
    const updated: Player[] = [
      ...players,
      {
        id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 5),
        name,
        sipsCount: 0,
      },
    ]
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

  const assignTargetsForCard = (card: Card | undefined) => {
    if (card && normalizeCardCategory(card) === 'dossiers') {
      const p1 = pickNextPlayerName()
      const p2 = players.length >= 2 ? pickNextPlayerName(p1) : null
      setTargetPlayer(p1)
      setSecondaryPlayer(p2)
    } else {
      setTargetPlayer(null)
      setSecondaryPlayer(null)
    }
  }

  const handleStartGame = () => {
    if (selectedModes.length === 0 || players.length < 2) return
    playerQueueRef.current = []
    lastPickedRef.current = null

    const source = allCards.length > 0 ? allCards : FALLBACK_CARDS
    const deck = buildOrderedDeck(source, selectedModes)
    const fallbackDeck = deck.length > 0 ? deck : shuffleArray(source)
    const firstCard = fallbackDeck[0]

    setGameDeck(fallbackDeck)
    setCurrentIndex(0)
    markCardSeen(firstCard)
    assignTargetsForCard(firstCard)
    setPhase('playing')
  }

  const currentCard = gameDeck[currentIndex % (gameDeck.length || 1)]
  const currentCategory: DebriefMode = currentCard
    ? normalizeCardCategory(currentCard)
    : selectedModes[0] || 'dossiers'

  const prefereOptions = useMemo(() => {
    if (!currentCard || currentCategory !== 'prefere') return null
    return parsePrefereOptions(currentCard.extra || currentCard.extra_data)
  }, [currentCard, currentCategory])

  const drawNextCard = () => {
    if (gameDeck.length === 0) return
    let nextDeck = gameDeck
    let nextIdx = currentIndex + 1

    if (nextIdx >= gameDeck.length) {
      const source = allCards.length > 0 ? allCards : FALLBACK_CARDS
      nextDeck = buildOrderedDeck(source, selectedModes)
      setGameDeck(nextDeck)
      nextIdx = 0
    }

    setCurrentIndex(nextIdx)
    const nextCard = nextDeck[nextIdx]
    markCardSeen(nextCard)
    assignTargetsForCard(nextCard)
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#16181d] flex items-center justify-center text-[#e5be6d]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2e323c] border-t-[#b5892e] rounded-full animate-spin" />
          <span className="text-sm font-semibold">Accès au Débrief de veillée...</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return <BlackoutScreen message={blackoutMessage} />
  }

  const sipsText = formatSipsLabel(currentCard?.sips)

  const categoryBadge =
    currentCategory === 'dossiers'
      ? {
          label: 'Dossier de camp',
          className: 'bg-[#16181d] text-[#e5be6d] border-[#b5892e]',
        }
      : currentCategory === 'jamais'
      ? {
          label: "Je n'ai jamais",
          className: 'bg-[#16181d] text-[#e5be6d] border-[#b5892e]',
        }
      : {
          label: 'Tu préfères',
          className: 'bg-[#16181d] text-[#e5be6d] border-[#b5892e]',
        }

  const initialProposeCategory: DebriefMode =
    phase === 'playing' && currentCard
      ? normalizeCardCategory(currentCard)
      : selectedModes[0] || 'dossiers'

  return (
    <div className="app-container bg-[#16181d] text-[#f3f4f6]">
      {/* ── En-tête uniforme ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#1f2229] border-b border-[#b5892e] px-4 py-3">
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
            Débrief
          </h1>
          <div className="justify-self-end">
            <button
              type="button"
              onClick={() => setShowFeedbackModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#b5892e] bg-[#1f2229] hover:bg-[#262a33] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              <span>💡</span>
              <span>Proposer</span>
            </button>
          </div>
        </div>
      </header>

      {phase === 'setup' ? (
        <SetupScreen
          selectedModes={selectedModes}
          onToggleMode={toggleMode}
          players={players}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onClearPlayers={handleClearPlayers}
          onStartGame={handleStartGame}
        />
      ) : (
        <main className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full py-5 gap-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              Carte {(currentIndex % (gameDeck.length || 1)) + 1} / {gameDeck.length}
            </span>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="text-[#e5be6d] hover:underline font-sans font-semibold"
            >
              Changer les modes
            </button>
          </div>

          {currentCard && (
            <div className="bg-[#1f2229] border border-[#b5892e] rounded-2xl p-6 sm:p-7 text-center space-y-5 my-auto">
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold border ${categoryBadge.className}`}
                >
                  {categoryBadge.label}
                </span>
              </div>

              {currentCard.title && currentCard.title !== "Je n'ai jamais" && (
                <h2 className="font-display font-black text-xl sm:text-2xl text-[#f3f4f6] tracking-wide">
                  {currentCard.title}
                </h2>
              )}

              <p className="font-display text-lg sm:text-xl text-[#f3f4f6] font-medium leading-relaxed italic">
                «{' '}
                {currentCategory === 'dossiers'
                  ? renderCardContent(currentCard.content, targetPlayer, secondaryPlayer)
                  : currentCard.content}{' '}
                »
              </p>

              {currentCategory === 'prefere' && prefereOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-1">
                  <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1">
                    <div className="text-[11px] font-mono font-bold text-[#e5be6d] uppercase">
                      Option A
                    </div>
                    <div className="text-sm font-semibold text-[#f3f4f6] leading-snug">
                      {prefereOptions.optionA}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1">
                    <div className="text-[11px] font-mono font-bold text-[#e5be6d] uppercase">
                      Option B
                    </div>
                    <div className="text-sm font-semibold text-[#f3f4f6] leading-snug">
                      {prefereOptions.optionB}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-center">
                <div className="inline-flex items-center bg-[#16181d] border border-[#b5892e] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#e5be6d]">
                  {currentCategory === 'dossiers' &&
                    `Avoue le dossier ou bois ${sipsText}.`}
                  {currentCategory === 'jamais' &&
                    `Si tu as déjà, tu bois ${sipsText}.`}
                  {currentCategory === 'prefere' &&
                    `Votez en même temps : la minorité boit ${sipsText} !`}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={drawNextCard}
              className="btn-primary w-full font-display"
            >
              <span>Carte suivante</span>
              <span>→</span>
            </button>
          </div>
        </main>
      )}

      <footer className="py-3 px-4 text-center border-t border-[#2e323c] bg-[#1f2229] text-[11px] text-slate-400">
        Projet indépendant. Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>

      <FeedbackModal
        isOpen={showFeedbackModal}
        initialCategory={initialProposeCategory}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  )
}
