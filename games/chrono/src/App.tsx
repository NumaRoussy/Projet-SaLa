import { useState, useEffect, useRef } from 'react'
import type { Player, Card, Team, RoundNumber, GamePhase } from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { fetchChronoCards, sendTelemetry } from './services/api'
import { useWakeLock } from './hooks/useWakeLock'

const HUB_URL = getHubUrl()

const ROUND_RULES: Record<RoundNumber, { title: string; subtitle: string; icon: string; rule: string }> = {
  1: {
    title: 'Manche 1 : Description Libre',
    subtitle: 'Parle librement sans dire le mot',
    icon: '🗣️',
    rule: 'Fais deviner un maximum de cartes en parlant. Interdiction de prononcer le mot, sa racine ou les mots interdits !',
  },
  2: {
    title: 'Manche 2 : Un Seul Mot',
    subtitle: 'Un mot unique pour faire deviner',
    icon: '☝️',
    rule: 'Tu n\'as le droit de prononcer qu\'UN SEUL mot par carte. Tes coéquipiers n\'ont droit qu\'à une seule proposition !',
  },
  3: {
    title: 'Manche 3 : Mime Uniquement',
    subtitle: 'Silence absolu & gestes',
    icon: '🎭',
    rule: 'Silence total ! Seuls les mimes et gestes sont autorisés pour faire deviner les cartes.',
  },
}

export default function App() {
  useWakeLock()
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')
  const [allCards, setAllCards] = useState<Card[]>([])

  const [turnDuration, setTurnDuration] = useState(30)
  const [teams, setTeams] = useState<Team[]>([
    { id: 'teamA', name: 'Patrouille des Loups 🐺', color: '#f4a261', score: 0 },
    { id: 'teamB', name: 'Patrouille des Aigles 🦅', color: '#74c69d', score: 0 },
  ])
  const [activeTeamIndex, setActiveTeamIndex] = useState(0)

  const [currentRound, setCurrentRound] = useState<RoundNumber>(1)
  const [phase, setPhase] = useState<GamePhase>('setup')

  // Cartes restantes pour la manche en cours
  const [roundDeck, setRoundDeck] = useState<Card[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  // Timer du tour
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [roundPointsA, setRoundPointsA] = useState(0)
  const [roundPointsB, setRoundPointsB] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  useEffect(() => {
    fetchChronoCards()
      .then(data => setAllCards(data))
      .catch(() => {
        setAllCards([
          { id: 1, game: 'chrono', category: 'scout', title: 'Tente', content: 'Tente Canadienne', extra: 'camping dormir toile' },
          { id: 2, game: 'chrono', category: 'scout', title: 'Nœud', content: 'Nœud de Cabestan', extra: 'corde bois attacher' },
          { id: 3, game: 'chrono', category: 'nature', title: 'Orientation', content: 'Boussole Plate', extra: 'nord cap aiguille' },
        ])
      })
  }, [])

  // Gestion du chronomètre de tour
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsTimerRunning(false)
            handleTimeUp()
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning, roundDeck, activeTeamIndex])

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const updated = [...players, { id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), name: trimmed }]
    setPlayers(updated)
    savePlayers(updated)
    setNewPlayerName('')
  }

  function handleRemovePlayer(id: string) {
    const updated = players.filter(p => p.id !== id)
    setPlayers(updated)
    savePlayers(updated)
  }

  function startChronoGame() {
    if (allCards.length === 0) return
    const shuffled = [...allCards].sort(() => Math.random() - 0.5)
    setRoundDeck(shuffled)
    setCurrentCardIndex(0)
    setCurrentRound(1)
    setActiveTeamIndex(0)
    setTeams(t => t.map(item => ({ ...item, score: 0 })))
    setRoundPointsA(0)
    setRoundPointsB(0)
    setGameStartTime(Date.now())
    setPhase('round_intro')
  }

  function startTurn() {
    setTimeLeft(turnDuration)
    setIsTimerRunning(true)
    setPhase('play')
  }

  function handleTimeUp() {
    setIsTimerRunning(false)
    // Basculer d'équipe
    setActiveTeamIndex(idx => (idx === 0 ? 1 : 0))
  }

  function handleCardSuccess() {
    // Marquer point pour l'équipe active
    setTeams(currentTeams =>
      currentTeams.map((team, idx) =>
        idx === activeTeamIndex ? { ...team, score: team.score + 1 } : team
      )
    )
    if (activeTeamIndex === 0) setRoundPointsA(p => p + 1)
    else setRoundPointsB(p => p + 1)

    // Retirer la carte du deck
    const updatedDeck = roundDeck.filter((_, idx) => idx !== currentCardIndex)
    if (updatedDeck.length === 0) {
      // Manche terminée !
      setIsTimerRunning(false)
      if (currentRound < 3) {
        setPhase('round_recap')
      } else {
        setPhase('gameover')
        sendTelemetry((Date.now() - gameStartTime) / 1000)
      }
    } else {
      setRoundDeck(updatedDeck)
      setCurrentCardIndex(idx => (idx >= updatedDeck.length ? 0 : idx))
    }
  }

  function handlePassCard() {
    // Passer la carte sans marquer
    if (roundDeck.length > 1) {
      setCurrentCardIndex(idx => (idx + 1) % roundDeck.length)
    }
  }

  function nextRound() {
    const nextR = (currentRound + 1) as RoundNumber
    setCurrentRound(nextR)
    // Remélanger toutes les cartes pour la nouvelle manche
    const shuffled = [...allCards].sort(() => Math.random() - 0.5)
    setRoundDeck(shuffled)
    setCurrentCardIndex(0)
    setRoundPointsA(0)
    setRoundPointsB(0)
    setActiveTeamIndex(0)
    setPhase('round_intro')
  }

  const activeTeam = teams[activeTeamIndex]
  const currentCard = roundDeck[currentCardIndex]

  return (
    <div className="app-container bg-gradient-to-b from-[#110c08] via-[#24150b] to-[#110c08] text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#110c08]/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a href={HUB_URL} className="flex items-center gap-2 text-scout-orange hover:text-white transition-colors text-sm">
          <span>←</span>
          <span className="font-semibold">Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <h1 className="font-display font-bold text-base tracking-wide">Chrono</h1>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-scout-orange/20 text-scout-amber border border-scout-orange/30 font-bold">
          M{currentRound}/3
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">

        {/* ── Phase 1: Setup ──────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-white">Préparez le Défi Chrono</h2>
              <p className="text-xs text-gray-400">Le grand jeu d'ambiance et de mime scout en 3 manches</p>
            </div>

            {/* Teams display */}
            <div className="grid grid-cols-2 gap-3">
              {teams.map(t => (
                <div key={t.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="font-bold text-xs" style={{ color: t.color }}>{t.name}</div>
                  <div className="text-2xl font-black mt-1">{t.score} pts</div>
                </div>
              ))}
            </div>

            {/* Turn duration */}
            <div className="flex items-center justify-between bg-scout-dark/60 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-gray-300">Durée d'un tour</span>
              <div className="flex gap-1.5">
                {[30, 45, 60].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setTurnDuration(sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-28 overflow-y-auto p-1">
                {players.map(p => (
                  <div key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/40 border border-orange-500/30 text-xs text-white">
                    <span>{p.name}</span>
                    <button onClick={() => handleRemovePlayer(p.id)} className="text-gray-400 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  className="input-scout text-sm py-2"
                  placeholder="Ajouter un joueur…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                />
                <button type="submit" className="btn-primary py-2 px-4 text-sm">+</button>
              </form>
            </div>

            <button
              onClick={startChronoGame}
              disabled={allCards.length === 0}
              className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-scout-orange/20"
            >
              🚀 Lancer la 1ère Manche ({allCards.length} cartes)
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
                  <div className="text-xs truncate font-semibold" style={{ color: t.color }}>{t.name}</div>
                  <div className="text-xl font-black mt-0.5">{t.score} pts</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-500/40 text-xs">
              À l'équipe de commencer : <strong style={{ color: activeTeam.color }}>{activeTeam.name}</strong>
            </div>

            <button onClick={startTurn} className="btn-primary w-full py-3.5 text-base font-bold">
              ⏱️ C'est parti ! ({turnDuration}s)
            </button>
          </div>
        )}

        {/* ── Phase 3: Play ───────────────────────────────────────────────── */}
        {phase === 'play' && currentCard && (
          <div className="space-y-4 animate-fade-in">
            {/* Turn Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeTeam.color }} />
                <span className="font-bold text-xs" style={{ color: activeTeam.color }}>{activeTeam.name}</span>
              </div>
              <div className="text-xs text-gray-400">
                Cartes restantes : <strong className="text-white">{roundDeck.length}</strong>
              </div>
            </div>

            {/* Timer countdown bar */}
            <div className="glass-card p-4 text-center space-y-2">
              <div className={`font-mono font-black text-5xl transition-all ${
                timeLeft <= 5 ? 'text-red-400 animate-pulse scale-110' : 'text-scout-amber'
              }`}>
                {timeLeft}s
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-scout-amber to-scout-orange"
                  style={{ width: `${(timeLeft / turnDuration) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Card */}
            <div className="glass-card p-6 text-center space-y-4 border border-white/15 min-h-[220px] flex flex-col justify-center">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {currentCard.category}
              </div>

              <h2 className="font-display font-black text-3xl text-white leading-tight">
                {currentCard.content}
              </h2>

              {currentCard.extra && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/40 text-xs text-red-300">
                  ⚠️ {currentCard.extra}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handlePassCard}
                className="btn-ghost py-4 text-sm font-semibold border border-white/10"
              >
                ⏭️ Passer
              </button>
              <button
                onClick={handleCardSuccess}
                className="btn-success py-4 text-base font-bold shadow-lg shadow-emerald-600/30"
              >
                ✅ Trouvé ! (+1 pt)
              </button>
            </div>
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
                Toutes les cartes ont été trouvées !
              </h2>
            </div>

            {/* Scores summary */}
            <div className="grid grid-cols-2 gap-3">
              {teams.map(t => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="text-xs truncate font-bold" style={{ color: t.color }}>{t.name}</div>
                  <div className="text-3xl font-black mt-1 text-white">{t.score} pts</div>
                  <div className="text-xs text-scout-amber mt-1">
                    +{t.id === 'teamA' ? roundPointsA : roundPointsB} pts cette manche
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-400">
              Préparez-vous : les mêmes cartes reviennent dans la manche suivante avec des règles plus exigeantes !
            </div>

            <button onClick={nextRound} className="btn-primary w-full py-3.5 text-base font-bold">
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
                  : 'Égalité parfaite entre les deux patrouilles !'}
              </p>
            </div>

            {/* Podium */}
            <div className="grid grid-cols-2 gap-3 py-2">
              {teams.map(t => (
                <div key={t.id} className="p-4 rounded-2xl bg-black/50 border border-white/15">
                  <div className="text-xs font-bold truncate" style={{ color: t.color }}>{t.name}</div>
                  <div className="text-4xl font-black mt-2 text-white">{t.score}</div>
                  <div className="text-xs text-gray-500 mt-1">points au total</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <button onClick={startChronoGame} className="btn-primary w-full py-3 text-sm font-bold">
                🔄 Rejouer une partie
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
