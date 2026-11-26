import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Player, Card, Team, RoundNumber, GamePhase, ChronoTheme } from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { fetchChronoCards, sendTelemetry } from './services/api'
import { useWakeLock } from './hooks/useWakeLock'
import { ASVD_GROUP_NAMES, ROUND_RULES, FALLBACK_CARDS } from './constants'
import { ProposeModal } from './components/ProposeModal'

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
    { id: 'teamA', name: names[0], color: '#deb07a', score: 0, players: teamAPlayers },
    { id: 'teamB', name: names[1], color: '#8fd4b0', score: 0, players: teamBPlayers },
  ]
}

export default function App() {
  useWakeLock()

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers().slice(0, MAX_PLAYERS))
  const [newPlayerName, setNewPlayerName] = useState('')
  const [allCards, setAllCards] = useState<Card[]>([])
  const [proposeOpen, setProposeOpen] = useState(false)

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

  const [masterDeck, setMasterDeck] = useState<Card[]>([])
  const [roundQueue, setRoundQueue] = useState<Card[]>([])

  const [timeLeft, setTimeLeft] = useState(45)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [turnWordsFound, setTurnWordsFound] = useState(0)
  const [roundPointsA, setRoundPointsA] = useState(0)
  const [roundPointsB, setRoundPointsB] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  useEffect(() => {
    fetchChronoCards()
      .then(data => {
        if (data && data.length > 0) setAllCards(data)
        else setAllCards(FALLBACK_CARDS)
      })
      .catch(() => setAllCards(FALLBACK_CARDS))
  }, [])

  useEffect(() => {
    if (!isTimerRunning || phase !== 'play') return
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isTimerRunning, phase])

  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false)
    setRoundQueue(prevQueue => {
      if (prevQueue.length <= 1) return prevQueue
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
        if (teamAFiltered.length <= teamBFiltered.length) teamAFiltered.push(p)
        else teamBFiltered.push(p)
      }

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

  function handleClearPlayers() {
    setPlayers([])
    savePlayers([])
    syncTeamsWithPlayers([])
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

    setTeams(prev => [
      activeTeamIndex === 0 ? { ...prev[0], score: prev[0].score + 1 } : prev[0],
      activeTeamIndex === 1 ? { ...prev[1], score: prev[1].score + 1 } : prev[1],
    ])
    if (activeTeamIndex === 0) setRoundPointsA(p => p + 1)
    else setRoundPointsB(p => p + 1)
    setTurnWordsFound(w => w + 1)

    const nextQueue = roundQueue.slice(1)
    setRoundQueue(nextQueue)

    if (nextQueue.length === 0) {
      setIsTimerRunning(false)
      const nextStartingTeam: 0 | 1 = activeTeamIndex === 0 ? 1 : 0
      setActiveTeamIndex(nextStartingTeam)

      if (currentRound < 3) setPhase('round_recap')
      else {
        setPhase('gameover')
        sendTelemetry((Date.now() - gameStartTime) / 1000)
      }
    }
  }

  function handlePassCard() {
    if (!ROUND_RULES[currentRound].allowSkip) return
    if (roundQueue.length > 1) {
      setRoundQueue(prev => [...prev.slice(1), prev[0]])
    }
  }

  function nextRound() {
    const nextR = (currentRound + 1) as RoundNumber
    setCurrentRound(nextR)
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

  const initialProposeTheme: ChronoTheme =
    selectedThemes.length === 1 ? selectedThemes[0] : 'scout'

  return (
    <div className="app-container bg-[#1c1611] text-[#f3f4f6]">
      {/* ── En-tête uniforme ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#17120e] border-b border-[#785127] px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <a
              href={HUB_URL}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-[#785127] bg-[#261e17] hover:bg-[#33271d] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              ← Menu
            </a>
          </div>
          <h1 className="justify-self-center font-display font-bold text-base text-[#f3f4f6] truncate">
            Chrono
          </h1>
          <div className="justify-self-end">
            <button
              type="button"
              onClick={() => setProposeOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#785127] bg-[#261e17] hover:bg-[#33271d] text-[#deb07a] text-xs font-semibold transition-colors"
            >
              <span>💡</span>
              <span>Proposer</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-[#f3f4f6]">Préparez le Défi Chrono</h2>
              <p className="text-xs text-[#c9b7a2]">
                3 manches avec les mêmes mots, 2 équipes tirées au sort
              </p>
            </div>

            {/* Gestionnaire de joueurs (déplié par défaut) */}
            <div className="p-3.5 rounded-xl bg-[#1c1611] border border-[#785127] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#deb07a] uppercase tracking-wider">
                    Joueurs ({players.length} / {MAX_PLAYERS})
                  </span>
                  <span className="block text-[11px] text-[#b09d87]">4 à 12 joueurs</span>
                </div>
                {players.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPlayers}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3a1b20] hover:bg-[#4e2229] border border-[#8c2d38] text-red-200 text-xs font-semibold transition-colors"
                  >
                    <span>🗑️</span>
                    <span>Vider</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">Aucun joueur enregistré.</p>
                ) : (
                  players.map(p => (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#261e17] border border-[#785127] text-xs font-medium text-[#f3f4f6]"
                    >
                      <span>{p.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(p.id)}
                        aria-label={`Supprimer ${p.name}`}
                        className="text-[#c9b7a2] hover:text-red-300 text-sm leading-none ml-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  className="input-scout text-sm py-2 disabled:opacity-50"
                  placeholder="Prénom ou Totem…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  disabled={players.length >= MAX_PLAYERS}
                  maxLength={30}
                />
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 text-sm"
                  disabled={!newPlayerName.trim() || players.length >= MAX_PLAYERS}
                >
                  +
                </button>
              </form>

              {players.length >= MAX_PLAYERS && (
                <p className="text-xs text-[#deb07a] text-center font-semibold">Maximum 12 joueurs atteint</p>
              )}
              {players.length < MIN_PLAYERS && (
                <p className="text-xs text-[#deb07a] text-center">
                  Minimum 4 joueurs requis (2 contre 2)
                </p>
              )}
            </div>

            {/* Équipes */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                {teams.map(t => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#1c1611] border border-[#785127] flex flex-col justify-between gap-2"
                  >
                    <div className="text-center font-bold text-xs leading-snug" style={{ color: t.color }}>
                      {t.name}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {t.players.length > 0 ? (
                        t.players.map(p => (
                          <span
                            key={p.id}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-[#261e17] border border-[#785127] text-gray-200"
                          >
                            {p.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Aucun joueur</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleReshuffleTeams}
                className="w-full py-2 px-3 rounded-xl bg-[#1c1611] hover:bg-[#33271d] border border-[#785127] text-xs font-semibold text-[#deb07a] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>🔀</span>
                <span>Remélanger les équipes</span>
              </button>
            </div>

            {/* Thèmes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#deb07a] uppercase tracking-wider">
                  Thèmes des mots
                </span>
                <span className="text-[11px] text-[#b09d87]">
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
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                        isChecked
                          ? 'bg-[#36281c] border-[#966530] text-[#f3f4f6]'
                          : 'bg-[#1c1611] border-[#785127] text-gray-400 hover:text-white'
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
                <p className="text-xs text-red-300 font-semibold text-center">
                  Sélectionne au moins un thème
                </p>
              )}
            </div>

            {/* Durée */}
            <div className="flex items-center justify-between bg-[#1c1611] p-3 rounded-xl border border-[#785127]">
              <span className="text-xs text-gray-200 font-medium">Durée d'un tour</span>
              <div className="flex gap-1.5">
                {([45, 60] as const).map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTurnDuration(sec)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      turnDuration === sec
                        ? 'bg-[#966530] border-[#b0783b] text-[#f3f4f6]'
                        : 'bg-[#261e17] border-[#785127] text-gray-300 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#1c1611] border border-[#785127] text-center text-xs text-[#deb07a] font-semibold">
              Paquet : {targetDeckSize} mots (7 par joueur)
              <span className="block text-[#b09d87] font-normal">(28 à 84 mots pour 4 à 12 joueurs)</span>
            </div>

            <button
              type="button"
              onClick={startChronoGame}
              disabled={!canStart}
              className="btn-primary w-full py-3.5 text-base font-bold"
            >
              Lancer la 1ère Manche ({effectiveDeckSize} mots)
            </button>
          </div>
        )}

        {/* ── Phase 2: Round Intro ────────────────────────────────────────── */}
        {phase === 'round_intro' && (
          <div className="glass-card p-6 text-center space-y-6">
            <div className="text-4xl">{ROUND_RULES[currentRound].icon}</div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#deb07a]">
                Manche {currentRound} sur 3
              </span>
              <h2 className="font-display font-black text-2xl text-[#f3f4f6] mt-1">
                {ROUND_RULES[currentRound].title}
              </h2>
              <p className="text-sm text-[#c9b7a2] font-semibold mt-1">
                {ROUND_RULES[currentRound].subtitle}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#1c1611] border border-[#785127] text-xs text-gray-200 leading-relaxed text-left">
              {ROUND_RULES[currentRound].rule}
            </div>

            <div className="grid grid-cols-2 gap-3 py-1">
              {teams.map(t => (
                <div key={t.id} className="p-2.5 rounded-xl bg-[#1c1611] border border-[#785127]">
                  <div className="text-xs truncate font-semibold" style={{ color: t.color }}>
                    {t.name}
                  </div>
                  <div className="text-xl font-black mt-0.5 text-[#f3f4f6]">{t.score} pts</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[#1c1611] border border-[#966530] text-xs text-gray-200">
              À l'équipe de commencer :{' '}
              <strong style={{ color: activeTeam.color }}>{activeTeam.name}</strong>
              <span className="text-[#b09d87] block mt-0.5">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#261e17] border border-[#785127]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activeTeam.color }} />
                <span className="font-bold text-xs truncate" style={{ color: activeTeam.color }}>
                  {activeTeam.name}
                </span>
              </div>
              <div className="text-xs text-[#c9b7a2] shrink-0">
                Manche {currentRound}/3 • Restants : <strong className="text-white">{roundQueue.length}</strong>
              </div>
            </div>

            <div className="glass-card p-4 text-center space-y-2">
              <div
                className={`font-mono font-black text-5xl ${
                  timeLeft <= 5 ? 'text-red-400' : 'text-[#deb07a]'
                }`}
              >
                {timeLeft}s
              </div>
              <div className="w-full h-2 bg-[#1c1611] rounded-full overflow-hidden border border-[#785127]/50">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-[#966530]"
                  style={{ width: `${(timeLeft / turnDuration) * 100}%` }}
                />
              </div>
            </div>

            <div className="glass-card p-8 text-center min-h-[220px] flex flex-col justify-center items-center">
              <h2 className="font-display font-black text-4xl sm:text-5xl text-[#f3f4f6] leading-tight break-words">
                {currentCard.title || currentCard.content}
              </h2>
            </div>

            <div
              className={`grid gap-3 pt-2 ${
                ROUND_RULES[currentRound].allowSkip ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {ROUND_RULES[currentRound].allowSkip && (
                <button
                  type="button"
                  onClick={handlePassCard}
                  className="btn-ghost py-4 text-sm font-semibold border border-[#785127] bg-[#261e17]"
                >
                  ⏭️ Passer
                </button>
              )}
              <button
                type="button"
                onClick={handleCardSuccess}
                className="btn-success py-4 text-base font-bold"
              >
                ✅ Trouvé ! (+1 pt)
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 3b: Turn Transition ───────────────────────────────────── */}
        {phase === 'turn_transition' && (
          <div className="glass-card p-6 text-center space-y-5">
            <div className="text-4xl">⏰</div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#deb07a]">
                Fin du chrono — Manche {currentRound}/3
              </span>
              <h2 className="font-display font-black text-2xl text-[#f3f4f6] mt-1">
                Temps écoulé !
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-[#1c1611] border border-[#785127] space-y-2 text-xs">
              <p className="text-gray-200">
                <strong style={{ color: previousTurnTeam.color }}>{previousTurnTeam.name}</strong> a
                trouvé{' '}
                <strong className="text-white">
                  {turnWordsFound} mot{turnWordsFound > 1 ? 's' : ''}
                </strong>{' '}
                sur ce tour.
              </p>
              <p className="text-[#deb07a] font-semibold">
                Il reste {roundQueue.length} mot{roundQueue.length > 1 ? 's' : ''} dans cette manche.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1c1611] border border-[#966530] text-xs text-gray-200">
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
          <div className="glass-card p-6 text-center space-y-5">
            <div className="text-4xl">🏁</div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#deb07a]">
                Fin de la Manche {currentRound}
              </span>
              <h2 className="font-display font-black text-2xl text-[#f3f4f6] mt-1">
                Tous les mots ont été trouvés !
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {teams.map(t => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-[#1c1611] border border-[#785127]">
                  <div className="text-xs truncate font-bold" style={{ color: t.color }}>
                    {t.name}
                  </div>
                  <div className="text-3xl font-black mt-1 text-[#f3f4f6]">{t.score} pts</div>
                  <div className="text-xs text-[#deb07a] mt-1">
                    +{t.id === 'teamA' ? roundPointsA : roundPointsB} pts cette manche
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-[#1c1611] border border-[#785127] text-left space-y-1 text-xs">
              <div className="font-bold text-[#deb07a]">
                {ROUND_RULES[(currentRound + 1) as RoundNumber].icon}{' '}
                {ROUND_RULES[(currentRound + 1) as RoundNumber].title}
              </div>
              <p className="text-gray-200 leading-relaxed">
                {ROUND_RULES[(currentRound + 1) as RoundNumber].rule}
              </p>
              <p className="text-[#b09d87] pt-1">
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
          <div className="glass-card p-6 text-center space-y-5">
            <div className="text-5xl">🏆</div>

            <div>
              <h2 className="font-display font-black text-3xl text-[#f3f4f6]">
                Fin du Grand Défi Chrono !
              </h2>
              <p className="text-sm text-[#deb07a] font-semibold mt-1">
                {teams[0].score > teams[1].score
                  ? `Victoire de ${teams[0].name} !`
                  : teams[1].score > teams[0].score
                  ? `Victoire de ${teams[1].name} !`
                  : 'Égalité parfaite entre les deux groupes !'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              {teams.map(t => (
                <div key={t.id} className="p-4 rounded-2xl bg-[#1c1611] border border-[#785127]">
                  <div className="text-xs font-bold truncate" style={{ color: t.color }}>
                    {t.name}
                  </div>
                  <div className="text-4xl font-black mt-2 text-[#f3f4f6]">{t.score}</div>
                  <div className="text-xs text-[#b09d87] mt-1">points au total</div>
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
                className="btn-ghost w-full py-2 text-xs font-semibold border border-[#785127]"
              >
                ⚙️ Modifier équipes &amp; thèmes
              </button>
              <a href={HUB_URL} className="btn-ghost w-full block text-center text-xs py-2">
                ← Menu
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="py-3 px-4 text-center border-t border-[#3b2916] bg-[#17120e] text-[11px] text-[#b09d87]">
        Projet indépendant — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>

      <ProposeModal
        isOpen={proposeOpen}
        initialTheme={initialProposeTheme}
        onClose={() => setProposeOpen(false)}
      />
    </div>
  )
}
