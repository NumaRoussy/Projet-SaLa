import { useState, useEffect, useRef } from 'react'
import type { Player, Card, AssignedPlayer, GamePhase } from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { fetchInfiltreCards, sendTelemetry } from './services/api'

const HUB_URL = getHubUrl()

export default function App() {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [infiltratorCount, setInfiltratorCount] = useState(1)

  const [phase, setPhase] = useState<GamePhase>('setup')
  const [assigned, setAssigned] = useState<AssignedPlayer[]>([])
  const [revealIndex, setRevealIndex] = useState(0)
  const [isWordRevealed, setIsWordRevealed] = useState(false)

  // Timer débat
  const [debateTime, setDebateTime] = useState(120)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Résultat du vote
  const [eliminatedPlayer, setEliminatedPlayer] = useState<AssignedPlayer | null>(null)
  const [winner, setWinner] = useState<'scouts' | 'infiltre' | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  // Chargement des cartes
  useEffect(() => {
    fetchInfiltreCards()
      .then(data => {
        setCards(data)
        if (data.length > 0) setSelectedCard(data[0])
      })
      .catch(() => {
        // Fallback local
        const fallback: Card[] = [
          { id: 1, game: 'infiltre', category: 'mots', title: 'Pionnier', content: 'Brêlage', extra: 'Nœud de cabestan' },
          { id: 2, game: 'infiltre', category: 'mots', title: 'Cuisine', content: 'Gamelle', extra: 'Gourde' },
          { id: 3, game: 'infiltre', category: 'mots', title: 'Topo', content: 'Boussole', extra: 'Altimètre' },
        ]
        setCards(fallback)
        setSelectedCard(fallback[0])
      })
  }, [])

  // Timer gestion
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setDebateTime(t => {
          if (t <= 1) {
            setIsTimerRunning(false)
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
  }, [isTimerRunning])

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

  function startGame() {
    if (players.length < 3) return
    const card = selectedCard || cards[Math.floor(Math.random() * cards.length)]
    if (!card) return

    // Assigner rôles
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const infCount = Math.min(infiltratorCount, Math.floor(players.length / 2))
    const assignedList: AssignedPlayer[] = shuffled.map((player, idx) => {
      const isInfiltre = idx < infCount
      return {
        player,
        role: isInfiltre ? 'infiltre' : 'scout',
        secretWord: isInfiltre ? (card.extra || 'Inconnu') : card.content,
        eliminated: false,
      }
    })

    // Remélanger pour la phase de révélation
    setAssigned(assignedList.sort(() => Math.random() - 0.5))
    setRevealIndex(0)
    setIsWordRevealed(false)
    setDebateTime(120)
    setIsTimerRunning(false)
    setWinner(null)
    setEliminatedPlayer(null)
    setGameStartTime(Date.now())
    setPhase('reveal')
  }

  function nextReveal() {
    setIsWordRevealed(false)
    if (revealIndex + 1 < assigned.length) {
      setRevealIndex(revealIndex + 1)
    } else {
      setPhase('debate')
      setIsTimerRunning(true)
    }
  }

  function handleVote(candidate: AssignedPlayer) {
    const updated = assigned.map(p => (p.player.id === candidate.player.id ? { ...p, eliminated: true } : p))
    setAssigned(updated)
    setEliminatedPlayer(candidate)

    const remainingInfiltres = updated.filter(p => p.role === 'infiltre' && !p.eliminated).length
    const remainingScouts = updated.filter(p => p.role === 'scout' && !p.eliminated).length

    if (remainingInfiltres === 0) {
      setWinner('scouts')
      setPhase('gameover')
      sendTelemetry((Date.now() - gameStartTime) / 1000)
    } else if (remainingScouts <= remainingInfiltres) {
      setWinner('infiltre')
      setPhase('gameover')
      sendTelemetry((Date.now() - gameStartTime) / 1000)
    }
  }

  const activePlayers = assigned.filter(p => !p.eliminated)

  return (
    <div className="app-container bg-gradient-to-b from-scout-night via-[#0f241a] to-scout-night text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-scout-night/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a href={HUB_URL} className="flex items-center gap-2 text-scout-sage hover:text-white transition-colors text-sm">
          <span>←</span>
          <span className="font-semibold">Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">🕵️</span>
          <h1 className="font-display font-bold text-base tracking-wide">L'Infiltré</h1>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-scout-mid/20 text-scout-sage border border-scout-mid/30">
          {players.length} joueurs
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">

        {/* ── Phase 1: Setup ──────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-white">Préparez la mission</h2>
              <p className="text-xs text-gray-400">Démasquez les agents infiltrés dans votre patrouille</p>
            </div>

            {/* Players list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-scout-sage uppercase tracking-wider">
                  Éclaireurs ({players.length})
                </label>
                <span className="text-xs text-gray-400">Min. 3 joueurs</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto p-1">
                {players.map(p => (
                  <div key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-scout-green/30 border border-scout-mid/40 text-xs text-white">
                    <span>{p.name}</span>
                    <button onClick={() => handleRemovePlayer(p.id)} className="text-gray-400 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  className="input-scout text-sm py-2"
                  placeholder="Ajouter un prénom…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                />
                <button type="submit" className="btn-primary py-2 px-4 text-sm">+</button>
              </form>
            </div>

            {/* Theme card selection */}
            <div>
              <label className="block text-xs font-semibold text-scout-sage uppercase tracking-wider mb-2">
                Thème de la partie
              </label>
              <select
                className="input-scout text-sm"
                value={selectedCard?.id || ''}
                onChange={e => {
                  const c = cards.find(item => item.id === Number(e.target.value))
                  if (c) setSelectedCard(c)
                }}
              >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.content} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Infiltrators count */}
            <div className="flex items-center justify-between bg-scout-dark/60 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-gray-300">Nombre d'infiltrés</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                  onClick={() => setInfiltratorCount(Math.max(1, infiltratorCount - 1))}
                >
                  -
                </button>
                <span className="font-bold text-scout-amber px-2">{infiltratorCount}</span>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                  onClick={() => setInfiltratorCount(Math.min(3, infiltratorCount + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={players.length < 3}
              className="btn-amber w-full py-3.5 text-base font-bold shadow-lg shadow-scout-amber/10"
            >
              🚀 Lancer la partie
            </button>
          </div>
        )}

        {/* ── Phase 2: Reveal ─────────────────────────────────────────────── */}
        {phase === 'reveal' && assigned[revealIndex] && (
          <div className="glass-card p-6 text-center space-y-6 animate-fade-in">
            <div className="text-xs uppercase tracking-widest text-scout-sage font-semibold">
              Joueur {revealIndex + 1} / {assigned.length}
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1">Passe le téléphone à</p>
              <h2 className="font-display font-extrabold text-3xl text-white">
                {assigned[revealIndex].player.name}
              </h2>
            </div>

            {!isWordRevealed ? (
              <div className="py-8 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-scout-mid/20 border-2 border-scout-mid/40 flex items-center justify-center text-4xl animate-pulse">
                  🔒
                </div>
                <p className="text-xs text-gray-400">Assure-toi que personne d'autre ne regarde l'écran</p>
                <button onClick={() => setIsWordRevealed(true)} className="btn-primary w-full py-3 text-base">
                  👁️ Révéler mon mot secret
                </button>
              </div>
            ) : (
              <div className="py-6 space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-scout-dark/90 border border-scout-mid/40">
                  <p className="text-xs text-gray-400 mb-1">Ton mot secret est :</p>
                  <p className="font-display font-black text-3xl text-scout-amber tracking-wide">
                    {assigned[revealIndex].secretWord}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Mémorise bien ce mot et n'en parle à personne pour le moment !
                </p>
                <button onClick={nextReveal} className="btn-amber w-full py-3 text-base">
                  ✅ C'est bon, joueur suivant
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 3: Debate ─────────────────────────────────────────────── */}
        {phase === 'debate' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in text-center">
            <div>
              <span className="badge-secret bg-scout-amber/20 text-scout-amber border border-scout-amber/30 text-xs px-2.5 py-1 rounded-full font-bold">
                🗣️ Phase de Débat
              </span>
              <h2 className="font-display font-bold text-2xl text-white mt-2">
                Débusquez l'infiltré !
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Chacun votre tour, donnez un mot ou un indice lié à votre terme secret.
              </p>
            </div>

            {/* Countdown timer */}
            <div className="p-4 rounded-2xl bg-scout-dark border border-white/5 space-y-2">
              <div className="font-mono font-black text-4xl text-scout-sage">
                {Math.floor(debateTime / 60)}:{String(debateTime % 60).padStart(2, '0')}
              </div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="btn-ghost text-xs py-1 px-3 border border-white/10"
                >
                  {isTimerRunning ? '⏸️ Pause' : '▶️ Reprendre'}
                </button>
                <button
                  onClick={() => setDebateTime(120)}
                  className="btn-ghost text-xs py-1 px-3 border border-white/10"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* Speaking order */}
            <div className="text-left space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Ordre de parole des éclaireurs encore en jeu :
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {activePlayers.map((p, idx) => (
                  <span key={p.player.id} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                    {idx + 1}. {p.player.name}
                  </span>
                ))}
              </div>
            </div>

            <button onClick={() => setPhase('vote')} className="btn-danger w-full py-3 text-sm font-bold">
              🗳️ Passer au vote d'élimination
            </button>
          </div>
        )}

        {/* ── Phase 4: Vote ───────────────────────────────────────────────── */}
        {phase === 'vote' && (
          <div className="glass-card p-5 space-y-4 animate-fade-in text-center">
            <div>
              <span className="text-3xl">⚖️</span>
              <h2 className="font-display font-bold text-2xl text-white mt-1">Vote d'élimination</h2>
              <p className="text-xs text-gray-400">Désignez la personne suspectée d'être l'infiltré</p>
            </div>

            <div className="space-y-2 pt-2">
              {activePlayers.map(p => (
                <button
                  key={p.player.id}
                  onClick={() => handleVote(p)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-scout-dark/80 hover:bg-red-950/30 border border-white/10 hover:border-red-500/40 transition-all text-left group"
                >
                  <span className="font-semibold text-sm text-white group-hover:text-red-300">
                    {p.player.name}
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-red-400 font-bold">
                    Éliminer ➔
                  </span>
                </button>
              ))}
            </div>

            <button onClick={() => setPhase('debate')} className="btn-ghost w-full text-xs">
              ← Revenir au débat
            </button>
          </div>
        )}

        {/* ── Phase 5: Game Over ──────────────────────────────────────────── */}
        {phase === 'gameover' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in">
            <div className="text-5xl">{winner === 'scouts' ? '🎉' : '🕵️'}</div>

            <div>
              <h2 className="font-display font-black text-2xl text-white">
                {winner === 'scouts' ? 'Victoire des Éclaireurs !' : 'Victoire de l\'Infiltré !'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {winner === 'scouts'
                  ? 'Tous les infiltrés ont été démasqués avec succès !'
                  : 'L\'infiltré a réussi à semer le doute et à tromper la patrouille.'}
              </p>
            </div>

            {eliminatedPlayer && (
              <div className="p-3 rounded-xl bg-scout-dark border border-white/10 text-xs">
                Dernier éliminé : <strong className="text-white">{eliminatedPlayer.player.name}</strong> ({eliminatedPlayer.role === 'infiltre' ? 'Infiltré 🕵️' : 'Scout ⚜️'})
              </div>
            )}

            {/* Récapitulatif des rôles */}
            <div className="text-left space-y-2 bg-scout-dark/60 p-3.5 rounded-xl border border-white/5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Révélation complète des rôles :
              </h3>
              <div className="space-y-1.5 text-xs">
                {assigned.map(p => (
                  <div key={p.player.id} className="flex items-center justify-between">
                    <span className="text-gray-300">{p.player.name}</span>
                    <span className={p.role === 'infiltre' ? 'text-red-400 font-bold' : 'text-scout-sage font-medium'}>
                      {p.role === 'infiltre' ? `Infiltré (${p.secretWord})` : `Scout (${p.secretWord})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button onClick={() => setPhase('setup')} className="btn-primary w-full py-3 text-sm font-bold">
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
