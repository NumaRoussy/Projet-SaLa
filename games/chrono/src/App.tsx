import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Player, Card, Team, RoundNumber, GamePhase, ChronoTheme } from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { fetchChronoCards, sendTelemetry } from './services/api'
import { useWakeLock } from './hooks/useWakeLock'
import { ASVD_GROUP_NAMES, ROUND_RULES, FALLBACK_CARDS } from './constants'

const HUB_URL = getHubUrl()
const MIN_PLAYERS = 4
const MAX_PLAYERS = 12

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickTwoDistinctGroupNames(): [string, string] {
  const shuffled = shuffleArray(ASVD_GROUP_NAMES)
  return [shuffled[0], shuffled[1]]
}

function splitIntoBalancedTeams(
  playerList: Player[],
  names: [string, string]
): [Team, Team] {
  const teamAPlayers: Player[] = []
  const teamBPlayers: Player[] = []
  playerList.forEach((p, idx) => {
    if (idx % 2 === 0) teamAPlayers.push(p)
    else teamBPlayers.push(p)
  })
  return [
    { id: 'teamA', name: names[0], color: '#f4a261', score: 0, players: teamAPlayers },
    { id: 'teamB', name: names[1], color: '#74c69d', score: 0, players: teamBPlayers },
  ]
}

export default function App() {
  useWakeLock()

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers().slice(0, MAX_PLAYERS))
  const [newPlayerName, setNewPlayerName] = useState('')
  const [allCards, setAllCards] = useState<Card[]>([])

  const [selectedThemes, setSelectedThemes] = useState<ChronoTheme[]>(['scout', 'moldu'])
  const [turnDuration, setTurnDuration] = useState<45 | 60>(45)

  const [teams, setTeams] = useState<[Team, Team]>(() => {
    const initialNames = pickTwoDistinctGroupNames()
    return splitIntoBalancedTeams(shuffleArray(loadPlayers().slice(0, MAX_PLAYERS)), initialNames)
  })

  const [activeTeamIndex, setActiveTeamIndex] = useState<0 | 1>(0)
  const [lastTurnTeamIndex, setLastTurnTeamIndex] = useState<0 | 1>(0)

  const [currentRound, setCurrentRound] = useState<RoundNumber>(1)
  const [phase, setPhase] = useState<GamePhase>('setup')

  // Paquet maître figé pour les 3 manches (jamais remélangé entre les manches)
  const [masterDeck, setMasterDeck] = useState<Card[]>([])
  const [roundQueue, setRoundQueue] = useState<Card[]>([])

  // Timer & stats du tour/manche
  const [timeLeft, setTimeLeft] = useState(45)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [turnWordsFound, setTurnWordsFound] = useState(0)
  const [roundPointsA, setRoundPointsA] = useState(0)
  const [roundPointsB, setRoundPointsB] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  useEffect(() => {
    fetchChronoCards()
      .then(data => {
        if (data && data.length > 0) {
          setAllCards(data)
        } else {
          setAllCards(FALLBACK_CARDS)
        }
      })
      .catch(() => {
        setAllCards(FALLBACK_CARDS)
      })
  }, [])

  // Compte à rebours d'une seconde
  useEffect(() => {
    if (!isTimerRunning || phase !== 'play') return
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isTimerRunning, phase])

  // Expiration du chronomètre à 0s
  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false)
    setRoundQueue(prevQueue => {
      if (prevQueue.length <= 1) return prevQueue
      // La carte affichée au moment où le temps expire part au fond du paquet
      return [...prevQueue.slice(1), prevQueue[0]]
    })
    setLastTurnTeamIndex(activeTeamIndex)
    setActiveTeamIndex(activeTeamIndex === 0 ? 1 : 0)
    setPhase('turn_transition')
  }, [activeTeamIndex])

  useEffect(() => {
    if (phase === 'play' && isTimerRunning && timeLeft === 0) {
      handleTimeUp()
    }
  }, [phase, isTimerRunning, timeLeft, handleTimeUp])

  const filteredCards = useMemo(() => {
    const source = allCards.length > 0 ? allCards : FALLBACK_CARDS
    return source.filter(card => {
      const cardMode = (card.mode || 'scout').toLowerCase() as ChronoTheme
      return selectedThemes.includes(cardMode)
    })
  }, [allCards, selectedThemes])

  const targetDeckSize = players.length * 7
  const effectiveDeckSize = Math.min(targetDeckSize, filteredCards.length)

  function syncTeamsWithPlayers(updatedPlayers: Player[]) {
    setTeams(prev => {
      const existingIds = new Set(updatedPlayers.map(p => p.id))
      const teamAFiltered = prev[0].players.filter(p => existingIds.has(p.id))
      const teamBFiltered = prev[1].players.filter(p => existingIds.has(p.id))
      const assignedIds = new Set([...teamAFiltered, ...teamBFiltered].map(p => p.id))
      const unassigned = updatedPlayers.filter(p => !assignedIds.has(p.id))

      for (const p of unassigned) {
        if (teamAFiltered.length <= teamBFiltered.length) {
          teamAFiltered.push(p)
        } else {
          teamBFiltered.push(p)
        }
      }

      // Rééquilibrer si la différence dépasse 1
      while (teamAFiltered.length - teamBFiltered.length > 1) {
        const moved = teamAFiltered.pop()
        if (moved) teamBFiltered.push(moved)
      }
      while (teamBFiltered.length - teamAFiltered.length > 1) {
        const moved = teamBFiltered.pop()
        if (moved) teamAFiltered.push(moved)
      }

      return [
        { ...prev[0], players: teamAFiltered },
        { ...prev[1], players: teamBFiltered },
      ]
    })
  }

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (players.length >= MAX_PLAYERS) return
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const updated = [
      ...players,
      { id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), name: trimmed },
    ]
    setPlayers(updated)
    savePlayers(updated)
    syncTeamsWithPlayers(updated)
    setNewPlayerName('')
  }

  function handleRemovePlayer(id: string) {
    const updated = players.filter(p => p.id !== id)
    setPlayers(updated)
    savePlayers(updated)
    syncTeamsWithPlayers(updated)
  }

  function handleReshuffleTeams() {
    const shuffledPlayers = shuffleArray(players)
    const newNames = pickTwoDistinctGroupNames()
    setTeams(splitIntoBalancedTeams(shuffledPlayers, newNames))
  }

  function toggleTheme(theme: ChronoTheme) {
    setSelectedThemes(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    )
  }

  function startChronoGame() {
    if (
      players.length < MIN_PLAYERS ||
      players.length > MAX_PLAYERS ||
      selectedThemes.length === 0 ||
      filteredCards.length === 0
    ) {
      return
    }
    const shuffledPool = shuffleArray(filteredCards)
    const deck = shuffledPool.slice(0, Math.min(players.length * 7, shuffledPool.length))

    setMasterDeck(deck)
    // Mélange Fisher-Yates au lancement de la Manche 1
    setRoundQueue(shuffleArray([...deck]))
    setCurrentRound(1)
    setActiveTeamIndex(0)
    setTeams(prev => [
      { ...prev[0], score: 0 },
      { ...prev[1], score: 0 },
    ])
    setRoundPointsA(0)
    setRoundPointsB(0)
    setTurnWordsFound(0)
    setGameStartTime(Date.now())
    setPhase('round_intro')
  }

  function startTurn() {
    setTurnWordsFound(0)
    setTimeLeft(turnDuration)
    setIsTimerRunning(true)
    setPhase('play')
  }

  function handleCardSuccess() {
    if (roundQueue.length === 0) return

    // +1 point pour l'équipe active
    setTeams(prev => [
      activeTeamIndex === 0 ? { ...prev[0], score: prev[0].score + 1 } : prev[0],
      activeTeamIndex === 1 ? { ...prev[1], score: prev[1].score + 1 } : prev[1],
    ])
    if (activeTeamIndex === 0) setRoundPointsA(p => p + 1)
    else setRoundPointsB(p => p + 1)
    setTurnWordsFound(w => w + 1)

    // Retire définitivement la carte de roundQueue
    const nextQueue = roundQueue.slice(1)
    setRoundQueue(nextQueue)

    if (nextQueue.length === 0) {
      setIsTimerRunning(false)
      // L'équipe qui n'avait pas la main au dernier mot commence la manche suivante
      const nextStartingTeam: 0 | 1 = activeTeamIndex === 0 ? 1 : 0
      setActiveTeamIndex(nextStartingTeam)

      if (currentRound < 3) {
        setPhase('round_recap')
      } else {
        setPhase('gameover')
        sendTelemetry((Date.now() - gameStartTime) / 1000)
      }
    }
  }

  function handlePassCard() {
    // Interdit en Manche 1
    if (!ROUND_RULES[currentRound].allowSkip) return
    if (roundQueue.length > 1) {
      setRoundQueue(prev => [...prev.slice(1), prev[0]])
    }
  }

  function nextRound() {
    const nextR = (currentRound + 1) as RoundNumber
    setCurrentRound(nextR)
    // Mélange Fisher-Yates des mêmes cartes de masterDeck pour la nouvelle manche
    setRoundQueue(shuffleArray([...masterDeck]))
    setRoundPointsA(0)
    setRoundPointsB(0)
    setTurnWordsFound(0)
    setPhase('round_intro')
  }

  const activeTeam = teams[activeTeamIndex]
  const previousTurnTeam = teams[lastTurnTeamIndex]
  const currentCard = roundQueue[0]
  const canStart =
    players.length >= MIN_PLAYERS &&
    players.length <= MAX_PLAYERS &&
    selectedThemes.length > 0 &&
    effectiveDeckSize > 0

  return (
    <div className="app-container bg-gradient-to-b from-[#110c08] via-[#24150b] to-[#110c08] text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#110c08]/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a
          href={HUB_URL}
          className="flex items-center gap-2 text-scout-orange hover:text-white transition-colors text-sm"
        >
          <span>←</span>
          <span className="font-semibold">Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <h1 className="font-display font-bold text-base tracking-wide">Chrono</h1>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-scout-orange/20 text-scout-amber border border-scout-orange/30 font-bold">
          {phase === 'setup' ? `${effectiveDeckSize} mots` : `M${currentRound}/3`}
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        {/* ── Phase 1: Setup ──────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-white">Préparez le Défi Chrono</h2>
              <p className="text-xs text-gray-400">
                3 manches avec les mêmes mots, 2 équipes ASVd tirées au sort
              </p>
            </div>

            {/* Teams display & Reshuffle */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                {teams.map(t => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-2"
                  >
                    <div className="text-center font-bold text-xs leading-snug" style={{ color: t.color }}>
                      {t.name}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {t.players.length > 0 ? (
                        t.players.map(p => (
                          <span
                            key={p.id}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-gray-200"
                          >
                            {p.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-500 italic">Aucun joueur</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleReshuffleTeams}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-scout-amber flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>🔀</span>
                <span>Remélanger les équipes</span>
              </button>
            </div>

            {/* Themes multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-scout-orange uppercase tracking-wider">
                  Thèmes des mots
                </span>
                <span className="text-[11px] text-gray-400">
                  {filteredCards.length} disponibles
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'scout', label: 'Scout', icon: '🏕️' },
                    { id: 'moldu', label: 'Moldu', icon: '🏙️' },
                  ] as const
                ).map(theme => {
                  const isChecked = selectedThemes.includes(theme.id)
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggleTheme(theme.id)}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        isChecked
                          ? 'bg-scout-orange/25 border-scout-orange text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>{isChecked ? '☑️' : '⬜'}</span>
                      <span>{theme.icon}</span>
                      <span>{theme.label}</span>
                    </button>
                  )
                })}
              </div>
              {selectedThemes.length === 0 && (
                <p className="text-xs text-red-400 font-semibold text-center">
                  ⚠️ Sélectionne au moins un thème
                </p>
              )}
            </div>

            {/* Turn duration (45s / 60s only) */}
            <div className="flex items-center justify-between bg-scout-dark/60 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-gray-300 font-medium">Durée d'un tour</span>
              <div className="flex gap-1.5">
                {([45, 60] as const).map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTurnDuration(sec)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      turnDuration === sec
                        ? 'bg-scout-orange text-white'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Players list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-scout-orange uppercase tracking-wider">
                  Joueurs inscrits ({players.length})
                </label>
                <span className="text-[11px] text-gray-400">4 à 12 joueurs</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-28 overflow-y-auto p-1">
                {players.map(p => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/40 border border-orange-500/30 text-xs text-white"
                  >
                    <span>{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(p.id)}
                      aria-label={`Supprimer ${p.name}`}
                      className="text-gray-400 hover:text-red-400 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  className="input-scout text-sm py-2"
                  placeholder="Prénom ou Totem…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  disabled={players.length >= MAX_PLAYERS}
                />
                <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={players.length >= MAX_PLAYERS}>
                  +
                </button>
              </form>
              {players.length >= MAX_PLAYERS && (
                <p className="text-xs text-amber-300 text-center font-semibold mt-2">Maximum 12 joueurs atteint</p>
              )}
              {players.length < MIN_PLAYERS && players.length > 0 && (
                <p className="text-xs text-amber-300 mt-2 text-center">
                  Minimum 4 joueurs requis (2 contre 2)
                </p>
              )}
            </div>

            {/* Deck size banner */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-center text-xs text-scout-amber font-semibold">
              Paquet : {players.length >= MIN_PLAYERS ? `${players.length * 7} mots (7 par joueur)` : `${MIN_PLAYERS * 7}–${MAX_PLAYERS * 7} mots (7 par joueur)`}
              <span className="block text-gray-400 font-normal">(28 à 84 mots selon l'effectif)</span>
            </div>

            <button
              type="button"
              onClick={startChronoGame}
              disabled={!canStart}
              className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-scout-orange/20"
            >
              🚀 Lancer la 1ère Manche ({effectiveDeckSize} mots)
            </button>
          </div>
        )}

        {/* ── Phase 2: Round Intro ────────────────────────────────────────── */}
        {phase === 'round_intro' && (
          <div className="glass-card p-6 text-center space-y-6 animate-fade-in">
            <div className="text-4xl">{ROUND_RULES[currentRound].icon}</div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-scout-orange">
                Manche {currentRound} sur 3
              </span>
              <h2 className="font-display font-black text-2xl text-white mt-1">
                {ROUND_RULES[currentRound].title}
              </h2>
              <p className="text-sm text-scout-amber font-semibold mt-1">
                {ROUND_RULES[currentRound].subtitle}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 leading-relaxed text-left">
              {ROUND_RULES[currentRound].rule}
            </div>

            {/* Score reminder */}
            <div className="grid grid-cols-2 gap-3 py-1">
              {teams.map(t => (
                <div key={t.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-xs truncate font-semibold" style={{ color: t.color }}>
                    {t.name}
                  </div>
                  <div className="text-xl font-black mt-0.5">{t.score} pts</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-500/40 text-xs">
              À l'équipe de commencer :{' '}
              <strong style={{ color: activeTeam.color }}>{activeTeam.name}</strong>
              <span className="text-gray-400 block mt-0.5">
                ({roundQueue.length} mots à faire deviner)
              </span>
            </div>

            <button type="button" onClick={startTurn} className="btn-primary w-full py-3.5 text-base font-bold">
              ⏱️ C'est parti ! ({turnDuration}s)
            </button>
          </div>
        )}

        {/* ── Phase 3: Play ───────────────────────────────────────────────── */}
        {phase === 'play' && currentCard && (
          <div className="space-y-4 animate-fade-in">
            {/* Turn Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activeTeam.color }} />
                <span className="font-bold text-xs truncate" style={{ color: activeTeam.color }}>
                  {activeTeam.name}
                </span>
              </div>
              <div className="text-xs text-gray-400 shrink-0">
                Cartes restantes : <strong className="text-white">{roundQueue.length}</strong>
              </div>
            </div>

            {/* Timer countdown bar */}
            <div className="glass-card p-4 text-center space-y-2">
              <div
                className={`font-mono font-black text-5xl transition-all ${
                  timeLeft <= 5 ? 'text-red-400 animate-pulse scale-110' : 'text-scout-amber'
                }`}
              >
                {timeLeft}s
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-scout-amber to-scout-orange"
                  style={{ width: `${(timeLeft / turnDuration) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Single-Word Card */}
            <div className="glass-card p-8 text-center border border-white/15 min-h-[220px] flex flex-col justify-center items-center">
              <h2 className="font-display font-black text-4xl sm:text-5xl text-white leading-tight break-words">
                {currentCard.title || currentCard.content}
              </h2>
            </div>

            {/* Action buttons */}
            <div
              className={`grid gap-3 pt-2 ${
                ROUND_RULES[currentRound].allowSkip ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {ROUND_RULES[currentRound].allowSkip && (
                <button
                  type="button"
                  onClick={handlePassCard}
                  className="btn-ghost py-4 text-sm font-semibold border border-white/10"
                >
                  ⏭️ Passer
                </button>
              )}
              <button
                type="button"
                onClick={handleCardSuccess}
                className="btn-success py-4 text-base font-bold shadow-lg shadow-emerald-600/30"
              >
                ✅ Trouvé ! (+1 pt)
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 3b: Turn Transition (Time Up) ─────────────────────────── */}
        {phase === 'turn_transition' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in">
            <div className="text-4xl">⏰</div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-scout-orange">
                Fin du chrono — Manche {currentRound}/3
              </span>
              <h2 className="font-display font-black text-2xl text-white mt-1">
                Temps écoulé !
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <p className="text-gray-300">
                <strong style={{ color: previousTurnTeam.color }}>{previousTurnTeam.name}</strong> a
                trouvé{' '}
                <strong className="text-white">
                  {turnWordsFound} mot{turnWordsFound > 1 ? 's' : ''}
                </strong>{' '}
                sur ce tour.
              </p>
              <p className="text-scout-amber font-semibold">
                Il reste {roundQueue.length} mot{roundQueue.length > 1 ? 's' : ''} dans cette manche.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-500/40 text-xs">
              C'est au tour de :{' '}
              <strong style={{ color: activeTeam.color }}>{activeTeam.name}</strong>
            </div>

            <button type="button" onClick={startTurn} className="btn-primary w-full py-3.5 text-base font-bold">
              ⏱️ C'est parti ! ({turnDuration}s)
            </button>
          </div>
        )}

        {/* ── Phase 4: Round Recap ────────────────────────────────────────── */}
        {phase === 'round_recap' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in">
            <div className="text-4xl">🏁</div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-scout-orange">
                Fin de la Manche {currentRound}
              </span>
              <h2 className="font-display font-black text-2xl text-white mt-1">
                Tous les mots ont été trouvés !
              </h2>
            </div>

            {/* Scores summary */}
            <div className="grid grid-cols-2 gap-3">
              {teams.map(t => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="text-xs truncate font-bold" style={{ color: t.color }}>
                    {t.name}
                  </div>
                  <div className="text-3xl font-black mt-1 text-white">{t.score} pts</div>
                  <div className="text-xs text-scout-amber mt-1">
                    +{t.id === 'teamA' ? roundPointsA : roundPointsB} pts cette manche
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1 text-xs">
              <div className="font-bold text-scout-amber">
                {ROUND_RULES[(currentRound + 1) as RoundNumber].icon}{' '}
                {ROUND_RULES[(currentRound + 1) as RoundNumber].title}
              </div>
              <p className="text-gray-300 leading-relaxed">
                {ROUND_RULES[(currentRound + 1) as RoundNumber].rule}
              </p>
              <p className="text-gray-400 pt-1">
                Équipe qui démarre :{' '}
                <strong style={{ color: activeTeam.color }}>{activeTeam.name}</strong>
              </p>
            </div>

            <button type="button" onClick={nextRound} className="btn-primary w-full py-3.5 text-base font-bold">
              Passer à la Manche {currentRound + 1} ➔
            </button>
          </div>
        )}

        {/* ── Phase 5: Game Over ──────────────────────────────────────────── */}
        {phase === 'gameover' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in">
            <div className="text-5xl">🏆</div>

            <div>
              <h2 className="font-display font-black text-3xl text-white">
                Fin du Grand Défi Chrono !
              </h2>
              <p className="text-sm text-scout-amber font-semibold mt-1">
                {teams[0].score > teams[1].score
                  ? `Victoire de ${teams[0].name} !`
                  : teams[1].score > teams[0].score
                  ? `Victoire de ${teams[1].name} !`
                  : 'Égalité parfaite entre les deux groupes !'}
              </p>
            </div>

            {/* Podium */}
            <div className="grid grid-cols-2 gap-3 py-2">
              {teams.map(t => (
                <div key={t.id} className="p-4 rounded-2xl bg-black/50 border border-white/15">
                  <div className="text-xs font-bold truncate" style={{ color: t.color }}>
                    {t.name}
                  </div>
                  <div className="text-4xl font-black mt-2 text-white">{t.score}</div>
                  <div className="text-xs text-gray-500 mt-1">points au total</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <button type="button" onClick={startChronoGame} className="btn-primary w-full py-3 text-sm font-bold">
                🔄 Rejouer avec ces équipes
              </button>
              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="btn-ghost w-full py-2 text-xs font-semibold border border-white/10"
              >
                ⚙️ Modifier équipes &amp; thèmes
              </button>
              <a href={HUB_URL} className="btn-ghost w-full block text-center text-xs py-2">
                Retour au portail Scout Game
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
