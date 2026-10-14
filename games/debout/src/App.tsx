import { useState, useEffect, useCallback, useRef } from 'react'
import type { Player, Card, MiniGameType } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchDeboutCards, sendTelemetry } from './services/api'
import { BlackoutScreen } from './components/BlackoutScreen'

export default function App() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [players, setPlayers] = useState<Player[]>(() => {
    const raw = loadPlayers()
    if (raw.length > 0) return raw.map(p => ({ ...p, isStanding: true }))
    return [
      { id: '1', name: 'Loup Ardent', isStanding: true },
      { id: '2', name: 'Renard Rusé', isStanding: true },
      { id: '3', name: 'Faucon Vif', isStanding: true },
      { id: '4', name: 'Castor Bâtisseur', isStanding: true },
    ]
  })
  const [newPlayerName, setNewPlayerName] = useState('')
  const [showPlayerModal, setShowPlayerModal] = useState(false)

  const [cards, setCards] = useState<Card[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [roundNumber, setRoundNumber] = useState(1)

  // Mini-jeu actif
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameType>('none')

  // State Réflexe (Flamme Bleue)
  const [reflexeState, setReflexeState] = useState<'idle' | 'waiting' | 'ready' | 'clicked' | 'early'>('idle')
  const [reactionTime, setReactionTime] = useState<number | null>(null)
  const reflexeStartRef = useRef<number>(0)
  const reflexeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // State Chrono (Sens du Temps 10s)
  const [chronoState, setChronoState] = useState<'idle' | 'running' | 'stopped'>('idle')
  const chronoStartRef = useRef<number>(0)
  const [chronoElapsed, setChronoElapsed] = useState<number>(0)

  const gameStartTime = useRef<number>(Date.now())
  const hubUrl = getHubUrl()

  // ── 1. Vérification sécurité & Heartbeat ────────────────────────────────────
  const checkAuth = useCallback(async () => {
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
      setIsVerifying(false)
    }
  }, [hubUrl])

  useEffect(() => {
    checkAuth()
    const heartbeat = setInterval(checkAuth, 30000)
    return () => clearInterval(heartbeat)
  }, [checkAuth])

  // ── 2. Chargement des cartes ───────────────────────────────────────────────
  useEffect(() => {
    fetchDeboutCards()
      .then(data => {
        setCards(data)
        if (data.length > 0) drawNextChallenge(data)
      })
      .catch(() => {
        const fallback: Card[] = [
          { id: 1, game: 'debout', category: 'reflexe', title: 'Flamme Bleue', content: 'Touchez l\'écran dès que la flamme devient bleue. Le plus lent est éliminé.', extra: null, sips: 0, min_players: 2 },
          { id: 2, game: 'debout', category: 'chrono', title: 'Sens du Temps', content: 'Estimez 10 secondes les yeux fermés. Le pire écart boit 2 et s\'assoit.', extra: 'duree:10s', sips: 2, min_players: 2 },
          { id: 3, game: 'debout', category: 'duel', title: 'Chaise Suisse', content: '{p1} et {p2} se mettent en position de la chaise. Le premier qui lâche s\'assoit.', extra: null, sips: 0, min_players: 2 },
        ]
        setCards(fallback)
        drawNextChallenge(fallback)
      })
    return () => {
      sendTelemetry((Date.now() - gameStartTime.current) / 1000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 3. Tirage défi ────────────────────────────────────────────────────────
  function drawNextChallenge(deck = cards) {
    if (deck.length === 0) return
    const card = deck[Math.floor(Math.random() * deck.length)]
    setCurrentCard(card)
    setActiveMiniGame('none')
    setReflexeState('idle')
    setReactionTime(null)
    setChronoState('idle')
    setChronoElapsed(0)
    setRoundNumber(r => r + 1)
  }

  // ── 4. Mini-Jeu 1: Réflexe Flamme Bleue ────────────────────────────────────
  function startReflexeTest() {
    setReflexeState('waiting')
    setReactionTime(null)
    const delay = Math.floor(Math.random() * 3000) + 1500 // 1.5s à 4.5s
    if (reflexeTimerRef.current) clearTimeout(reflexeTimerRef.current)

    reflexeTimerRef.current = setTimeout(() => {
      reflexeStartRef.current = performance.now()
      setReflexeState('ready')
    }, delay)
  }

  function handleReflexeTap() {
    if (reflexeState === 'waiting') {
      if (reflexeTimerRef.current) clearTimeout(reflexeTimerRef.current)
      setReflexeState('early')
    } else if (reflexeState === 'ready') {
      const elapsed = Math.round(performance.now() - reflexeStartRef.current)
      setReactionTime(elapsed)
      setReflexeState('clicked')
    }
  }

  // ── 5. Mini-Jeu 2: Chrono 10 Secondes ─────────────────────────────────────
  function startChronoTest() {
    chronoStartRef.current = performance.now()
    setChronoState('running')
  }

  function stopChronoTest() {
    const elapsedMs = performance.now() - chronoStartRef.current
    const seconds = elapsedMs / 1000
    setChronoElapsed(seconds)
    setChronoState('stopped')
  }

  // ── 6. Joueurs et statut Debout/Assis ─────────────────────────────────────
  function toggleStanding(playerId: string) {
    setPlayers(current =>
      current.map(p => (p.id === playerId ? { ...p, isStanding: !p.isStanding } : p))
    )
  }

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const updated = [...players, { id: 'p_' + Date.now(), name: trimmed, isStanding: true }]
    setPlayers(updated)
    savePlayers(updated)
    setNewPlayerName('')
  }

  const standingPlayers = players.filter(p => p.isStanding)

  if (isVerifying) {
    return (
      <div className="app-container bg-[#0d1117] flex items-center justify-center text-scout-amber">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-scout-amber/30 border-t-scout-amber rounded-full animate-spin" />
          <span className="text-sm font-semibold">Vérification du laissez-passer maîtrise…</span>
        </div>
      </div>
    )
  }

  if (blackoutMessage) {
    return <BlackoutScreen message={blackoutMessage} />
  }

  // Formattage du texte avec 2 joueurs debout aléatoires
  let challengeText = currentCard?.content || ''
  if (standingPlayers.length >= 2) {
    challengeText = challengeText
      .replace(/{p1}/g, standingPlayers[0].name)
      .replace(/{p2}/g, standingPlayers[1].name)
  } else if (players.length >= 2) {
    challengeText = challengeText
      .replace(/{p1}/g, players[0].name)
      .replace(/{p2}/g, players[1].name)
  }

  return (
    <div className="app-container bg-gradient-to-b from-[#0d1117] via-[#111927] to-[#0d1117] text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0d1117]/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a href={hubUrl} className="flex items-center gap-2 text-scout-amber hover:text-white transition-colors text-sm">
          <span>←</span>
          <span className="font-semibold">Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h1 className="font-display font-bold text-base tracking-wide">Debout</h1>
        </div>
        <button
          onClick={() => setShowPlayerModal(true)}
          className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
        >
          🧍 {standingPlayers.length} debout
        </button>
      </header>

      {/* ── Bottle Royale Tracker ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 max-w-md mx-auto w-full">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-300">Responsables en lice :</span>
            <span className="text-gray-400">Cliquez pour asseoir / relever</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => toggleStanding(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  p.isStanding
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50'
                    : 'bg-red-950/40 text-red-400 border border-red-700/30 line-through opacity-70 hover:opacity-100'
                }`}
              >
                <span>{p.isStanding ? '🧍' : '🪑'}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Challenge Card ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center space-y-4">
        {currentCard && (
          <div className="glass-card p-6 min-h-[280px] flex flex-col justify-between border-2 border-white/10 shadow-2xl animate-fade-in">
            {/* Category */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-scout-amber border border-amber-500/30">
                {currentCard.category === 'reflexe' && '⚡ Réflexe & Vitesse'}
                {currentCard.category === 'chrono' && '⏱️ Sens du Temps'}
                {currentCard.category === 'duel' && '⚔️ Duel de Patrouille'}
              </span>
              <span className="text-xs text-gray-500">Défi #{roundNumber}</span>
            </div>

            {/* Content */}
            <div className="text-center my-auto py-3 space-y-2">
              <h2 className="font-display font-black text-2xl text-white">
                {currentCard.title}
              </h2>
              <p className="font-medium text-base leading-relaxed text-gray-200">
                {challengeText}
              </p>
            </div>

            {/* Mini-game launcher buttons */}
            <div className="pt-2">
              {currentCard.category === 'reflexe' && activeMiniGame !== 'reflexe' && (
                <button
                  onClick={() => {
                    setActiveMiniGame('reflexe')
                    setReflexeState('idle')
                  }}
                  className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-blue-600/20"
                >
                  ⚡ Lancer le défi Flamme Bleue
                </button>
              )}

              {currentCard.category === 'chrono' && activeMiniGame !== 'chrono' && (
                <button
                  onClick={() => {
                    setActiveMiniGame('chrono')
                    setChronoState('idle')
                  }}
                  className="btn-amber w-full py-3 text-sm font-bold shadow-lg shadow-scout-amber/20"
                >
                  ⏱️ Lancer le test des 10 secondes
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Mini-Game 1: Interactive Reflexe Test ───────────────────────── */}
        {activeMiniGame === 'reflexe' && (
          <div className="glass-card p-5 space-y-4 border border-blue-500/40 animate-fade-in text-center">
            <h3 className="font-bold text-sm text-blue-300">⚡ Test de Réflexe : Flamme Bleue</h3>

            {reflexeState === 'idle' && (
              <div className="space-y-3 py-2">
                <p className="text-xs text-gray-300">
                  Posez le doigt sur l'écran. Dès que l'écran vire au BLEU, tapez le plus vite possible !
                </p>
                <button onClick={startReflexeTest} className="btn-primary w-full py-3 text-sm font-bold">
                  Prêt ? Démarrer !
                </button>
              </div>
            )}

            {(reflexeState === 'waiting' || reflexeState === 'ready') && (
              <div
                onClick={handleReflexeTap}
                className={`rounded-2xl p-8 min-h-[180px] flex items-center justify-center cursor-pointer select-none transition-colors ${
                  reflexeState === 'ready'
                    ? 'bg-blue-600 animate-pulse text-white'
                    : 'bg-red-950/80 border border-red-500/50 text-red-300'
                }`}
              >
                <div className="font-display font-black text-2xl">
                  {reflexeState === 'ready' ? '⚡ TAPEZ MAINTENANT !' : '🔴 ATTENDEZ LE BLEU...'}
                </div>
              </div>
            )}

            {reflexeState === 'early' && (
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/40 text-center space-y-2">
                <div className="text-3xl">🚫</div>
                <div className="font-bold text-red-300 text-sm">Faux départ !</div>
                <p className="text-xs text-gray-300">Tu as tapé avant le signal bleu. Pénalité ou élimination !</p>
                <button onClick={startReflexeTest} className="btn-ghost text-xs py-1.5 px-3 border border-white/10">
                  Réessayer
                </button>
              </div>
            )}

            {reflexeState === 'clicked' && reactionTime !== null && (
              <div className="p-4 rounded-xl bg-blue-950/80 border border-blue-500/40 text-center space-y-2 animate-fade-in">
                <div className="text-3xl">⏱️</div>
                <div className="font-mono font-black text-4xl text-blue-300">
                  {reactionTime} ms
                </div>
                <p className="text-xs text-gray-300">
                  {reactionTime < 220
                    ? '⚡ Réflexe d\'élite ! Intouchable !'
                    : reactionTime < 320
                    ? '👍 Bon réflexe scout !'
                    : '🐢 Un peu lent... Le perdant s\'assoit !'}
                </p>
                <button onClick={startReflexeTest} className="btn-ghost text-xs py-1.5 px-3 border border-white/10">
                  Rejouer le test
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Mini-Game 2: Interactive 10s Chrono Test ───────────────────── */}
        {activeMiniGame === 'chrono' && (
          <div className="glass-card p-5 space-y-4 border border-amber-500/40 animate-fade-in text-center">
            <h3 className="font-bold text-sm text-scout-amber">⏱️ Test du Sens du Temps (10.0s)</h3>

            {chronoState === 'idle' && (
              <div className="space-y-3 py-2">
                <p className="text-xs text-gray-300">
                  Ferme les yeux. Appuie sur Start, compte mentalement 10 secondes, puis appuie sur STOP !
                </p>
                <button onClick={startChronoTest} className="btn-amber w-full py-3 text-sm font-bold">
                  Démarrer le test
                </button>
              </div>
            )}

            {chronoState === 'running' && (
              <div className="py-6 space-y-4">
                <div className="text-5xl animate-pulse">🙈</div>
                <p className="text-xs text-gray-400 font-semibold">
                  Chrono en cours... Compte les secondes dans ta tête !
                </p>
                <button onClick={stopChronoTest} className="btn-danger w-full py-4 text-lg font-black tracking-wide">
                  🛑 STOP !
                </button>
              </div>
            )}

            {chronoState === 'stopped' && (
              <div className="p-4 rounded-xl bg-scout-dark border border-amber-500/40 space-y-2 animate-fade-in">
                <div className="font-mono font-black text-4xl text-scout-amber">
                  {chronoElapsed.toFixed(2)}s
                </div>
                <div className="text-xs text-gray-300">
                  Écart par rapport à 10.0s :{' '}
                  <strong className={Math.abs(chronoElapsed - 10) < 0.5 ? 'text-emerald-400' : 'text-red-400'}>
                    {chronoElapsed >= 10 ? '+' : ''}{(chronoElapsed - 10).toFixed(2)}s
                  </strong>
                </div>
                <button onClick={startChronoTest} className="btn-ghost text-xs py-1.5 px-3 border border-white/10 mt-2">
                  Recommencer le test
                </button>
              </div>
            )}
          </div>
        )}

        {/* Next Card Button */}
        <button
          onClick={() => drawNextChallenge()}
          className="btn-primary w-full py-3.5 text-base font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          🎲 Défi suivant ➔
        </button>
      </main>

      {/* ── Player Management Modal ───────────────────────────────────────── */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0" onClick={() => setShowPlayerModal(false)}>
          <div className="glass-card w-full max-w-md rounded-b-none rounded-t-3xl p-6 space-y-4 max-h-[80dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Responsables en lice ({standingPlayers.length}/{players.length} debout)</h3>
                <p className="text-xs text-gray-400">Cliquez sur un responsable pour l'asseoir ou le relever</p>
              </div>
              <button onClick={() => setShowPlayerModal(false)} className="btn-ghost py-1 px-3 text-xs">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => toggleStanding(p.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    p.isStanding
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-950/40 text-red-400 border border-red-700/30 line-through'
                  }`}
                >
                  <span>{p.isStanding ? '🧍' : '🪑'}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <form onSubmit={handleAddPlayer} className="flex gap-2 pt-2">
              <input
                className="input-scout text-sm py-2"
                placeholder="Ajouter un responsable (totem/prénom)…"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
              />
              <button type="submit" className="btn-primary py-2 px-4 text-sm">+</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
