import { useState, useEffect } from 'react'
import type { Player, Card, AssignedPlayer, GamePhase, GameTheme } from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { fetchInfiltreCards, sendTelemetry } from './services/api'
import { MOLDUS_CARDS } from './data/moldus'
import { SCOUT_FALLBACK_CARDS } from './data/scoutFallback'
import {
  assignRoles,
  generateSpeakingOrder,
  checkVictoryCondition,
} from './utils/gameLogic'
import { useWakeLock } from './hooks/useWakeLock'

const HUB_URL = getHubUrl()

export default function App() {
  useWakeLock()
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')
  const [theme, setTheme] = useState<GameTheme>('scout')
  const [scoutCards, setScoutCards] = useState<Card[]>(SCOUT_FALLBACK_CARDS)

  // Nombre de rôles secrets
  const [infiltratorCount, setInfiltratorCount] = useState(1)
  const [misterWhiteCount, setMisterWhiteCount] = useState(() => (loadPlayers().length >= 5 ? 1 : 0))

  // État de la partie
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [round, setRound] = useState(1)
  const [assigned, setAssigned] = useState<AssignedPlayer[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [revealIndex, setRevealIndex] = useState(0)
  const [isWordRevealed, setIsWordRevealed] = useState(false)
  const [speakingOrder, setSpeakingOrder] = useState<AssignedPlayer[]>([])

  // Élimination et fin de partie
  const [eliminatedPlayer, setEliminatedPlayer] = useState<AssignedPlayer | null>(null)
  const [winner, setWinner] = useState<'civils' | 'enemies' | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  // Chargement des cartes Scout depuis l'API
  useEffect(() => {
    fetchInfiltreCards()
      .then(data => {
        if (data && data.length > 0) {
          setScoutCards(data)
        }
      })
      .catch(() => {
        // Fallback local déjà en place
      })
  }, [])

  // Ajustement automatique des rôles si l'effectif change
  useEffect(() => {
    const total = players.length
    if (total < 3) {
      if (misterWhiteCount !== 0) setMisterWhiteCount(0)
      if (infiltratorCount !== 1) setInfiltratorCount(1)
      return
    }

    // Le total d'ennemis doit laisser au moins 1 Joueur ordinaire
    const maxEnemies = total - 1
    if (infiltratorCount + misterWhiteCount > maxEnemies) {
      let newWhites = misterWhiteCount
      let newInfiltres = infiltratorCount

      while (newInfiltres + newWhites > maxEnemies) {
        if (newWhites > 0) {
          newWhites--
        } else if (newInfiltres > 1) {
          newInfiltres--
        } else {
          break
        }
      }
      setMisterWhiteCount(newWhites)
      setInfiltratorCount(newInfiltres)
    }
  }, [players.length, infiltratorCount, misterWhiteCount])

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return

    // Plafond technique interne de 50 joueurs maximum (sans affichage superflu)
    if (players.length >= 50) return

    const updated = [
      ...players,
      { id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), name: trimmed },
    ]
    setPlayers(updated)
    savePlayers(updated)
    setNewPlayerName('')
  }

  function handleRemovePlayer(id: string) {
    const updated = players.filter(p => p.id !== id)
    setPlayers(updated)
    savePlayers(updated)
  }

  // Contrôles Infiltrés (+ / -)
  function handleInfiltratorChange(delta: number) {
    const maxAllowed = Math.max(1, players.length - misterWhiteCount - 1)
    const nextVal = infiltratorCount + delta
    if (nextVal >= 1 && nextVal <= maxAllowed) {
      setInfiltratorCount(nextVal)
    }
  }

  // Contrôles Mister White (+ / -)
  function handleMisterWhiteChange(delta: number) {
    const maxAllowed = Math.max(0, players.length - infiltratorCount - 1)
    const nextVal = misterWhiteCount + delta
    if (nextVal >= 0 && nextVal <= maxAllowed) {
      setMisterWhiteCount(nextVal)
    }
  }

  function startGame() {
    if (players.length < 3) return
    if (infiltratorCount + misterWhiteCount >= players.length) return

    // Sélection aléatoire d'une paire selon le thème
    const cardPool = theme === 'moldus' ? MOLDUS_CARDS : scoutCards
    if (!cardPool || cardPool.length === 0) return

    // Éviter de répéter immédiatement la même carte si plusieurs sont disponibles
    const availableCards = cardPool.length > 1 && currentCard
      ? cardPool.filter(c => c.id !== currentCard.id)
      : cardPool
    const pool = availableCards.length > 0 ? availableCards : cardPool
    const chosenCard = pool[Math.floor(Math.random() * pool.length)]
    if (!chosenCard) return

    // Attribution robuste par algorithme de Fisher-Yates
    const assignedList = assignRoles(players, infiltratorCount, misterWhiteCount, chosenCard)

    // Préparation de l'ordre de parole du Tour 1 (Mister White ne doit JAMAIS commencer)
    const initialSpeakingOrder = generateSpeakingOrder(assignedList, 1)

    setCurrentCard(chosenCard)
    setAssigned(assignedList)
    setSpeakingOrder(initialSpeakingOrder)
    setRound(1)
    setRevealIndex(0)
    setIsWordRevealed(false)
    setEliminatedPlayer(null)
    setWinner(null)
    setGameStartTime(Date.now())
    setPhase('reveal')
  }

  function nextReveal() {
    setIsWordRevealed(false)
    if (revealIndex + 1 < assigned.length) {
      setRevealIndex(revealIndex + 1)
    } else {
      // Tous les joueurs ont découvert leur mot/rôle : lancement du Tour 1
      setPhase('debate')
    }
  }

  function prevReveal() {
    if (revealIndex > 0) {
      setIsWordRevealed(false)
      setRevealIndex(revealIndex - 1)
    }
  }

  function handleEliminate(candidate: AssignedPlayer) {
    const updated = assigned.map(p =>
      p.player.id === candidate.player.id
        ? { ...p, eliminated: true, eliminatedInRound: round }
        : p
    )
    setAssigned(updated)
    setEliminatedPlayer({ ...candidate, eliminated: true, eliminatedInRound: round })

    // Vérification des conditions de victoire
    const outcome = checkVictoryCondition(updated)
    if (outcome) {
      setWinner(outcome)
      sendTelemetry((Date.now() - gameStartTime) / 1000)
    } else {
      setWinner(null)
    }

    setPhase('elimination')
  }

  function startNextRound() {
    const nextRound = round + 1
    const nextSpeakingOrder = generateSpeakingOrder(assigned, nextRound)
    setRound(nextRound)
    setSpeakingOrder(nextSpeakingOrder)
    setEliminatedPlayer(null)
    setPhase('debate')
  }

  const activePlayers = assigned.filter(p => !p.eliminated)
  const remainingInfiltres = activePlayers.filter(p => p.role === 'infiltre').length
  const remainingWhites = activePlayers.filter(p => p.role === 'white').length
  const remainingCivils = activePlayers.filter(p => p.role === 'civil').length
  const civilCount = Math.max(0, players.length - infiltratorCount - misterWhiteCount)

  return (
    <div className="app-container bg-gradient-to-b from-scout-night via-[#0f241a] to-scout-night text-white selection:bg-scout-mid selection:text-white">
      {/* ── En-tête supérieur ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-scout-night/85 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a
          href={HUB_URL}
          className="flex items-center gap-1.5 text-scout-sage hover:text-white transition-colors text-xs font-semibold"
        >
          <span>←</span>
          <span>Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">🕵️</span>
          <h1 className="font-display font-bold text-base tracking-wide text-white">L'Infiltré</h1>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-scout-mid/20 text-scout-sage border border-scout-mid/30 font-medium">
          {players.length} joueur{players.length > 1 ? 's' : ''}
        </div>
      </header>

      {/* ── Contenu principal ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">

        {/* ── Phase 1: Configuration (Setup) ───────────────────────────────── */}
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-white">Préparez la mission</h2>
              <p className="text-xs text-gray-400">
                Démasquez les agents secrets infiltrés parmi les joueurs
              </p>
            </div>

            {/* Liste des joueurs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-scout-sage uppercase tracking-wider">
                  Joueurs ({players.length})
                </label>
                <span className="text-xs text-gray-400">Min. 3 participants</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto p-1 rounded-xl bg-scout-dark/40 border border-white/5">
                {players.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2 px-1">Aucun joueur enregistré</p>
                ) : (
                  players.map(p => (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-scout-green/30 border border-scout-mid/40 text-xs text-white"
                    >
                      <span>{p.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(p.id)}
                        className="text-gray-400 hover:text-red-400 text-sm leading-none ml-0.5"
                        aria-label={`Supprimer ${p.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  className="input-scout text-sm py-2.5"
                  placeholder="Ajouter un prénom…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  maxLength={30}
                />
                <button
                  type="submit"
                  className="btn-primary py-2.5 px-4 text-sm font-bold"
                  disabled={!newPlayerName.trim() || players.length >= 50}
                  title="Ajouter"
                >
                  +
                </button>
              </form>
            </div>

            {/* Mode de jeu : 2 boutons simples Scout / Moldus */}
            <div>
              <label className="block text-xs font-semibold text-scout-sage uppercase tracking-wider mb-2">
                Mode de jeu
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTheme('scout')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    theme === 'scout'
                      ? 'bg-scout-mid/30 border-scout-sage text-white ring-2 ring-scout-sage/40 shadow-lg shadow-scout-mid/20'
                      : 'bg-scout-dark/60 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">⚜️</span>
                    {theme === 'scout' && (
                      <span className="text-[10px] uppercase font-bold text-scout-sage bg-scout-sage/20 px-1.5 py-0.5 rounded">
                        Actif
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-white mt-1">Scout</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Culture & traditions scoutes</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('moldus')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    theme === 'moldus'
                      ? 'bg-scout-amber/25 border-scout-amber text-white ring-2 ring-scout-amber/40 shadow-lg shadow-scout-amber/20'
                      : 'bg-scout-dark/60 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🌍</span>
                    {theme === 'moldus' && (
                      <span className="text-[10px] uppercase font-bold text-scout-amber bg-scout-amber/20 px-1.5 py-0.5 rounded">
                        Actif
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-white mt-1">Moldus</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Mots génériques du quotidien</div>
                </button>
              </div>
            </div>

            {/* Répartition des rôles ajustables (+ / -) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-scout-sage uppercase tracking-wider">
                Rôles ajustables
              </label>

              {/* Nombre d'Infiltrés */}
              <div className="flex items-center justify-between bg-scout-dark/70 p-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🕵️</span>
                  <div>
                    <div className="text-sm font-semibold text-white">Infiltrés</div>
                    <div className="text-[11px] text-gray-400">Reçoivent un mot secret alternatif</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center transition-colors"
                    onClick={() => handleInfiltratorChange(-1)}
                    disabled={infiltratorCount <= 1}
                    aria-label="Diminuer le nombre d'infiltrés"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-scout-amber text-base w-6 text-center">
                    {infiltratorCount}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center transition-colors"
                    onClick={() => handleInfiltratorChange(1)}
                    disabled={players.length < 3 || infiltratorCount + misterWhiteCount >= players.length - 1}
                    aria-label="Augmenter le nombre d'infiltrés"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Nombre de Mister White */}
              <div className="flex items-center justify-between bg-scout-dark/70 p-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎭</span>
                  <div>
                    <div className="text-sm font-semibold text-white">Mister White</div>
                    <div className="text-[11px] text-gray-400">Ne reçoit aucun mot secret</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center transition-colors"
                    onClick={() => handleMisterWhiteChange(-1)}
                    disabled={misterWhiteCount <= 0}
                    aria-label="Diminuer le nombre de Mister White"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-scout-sage text-base w-6 text-center">
                    {misterWhiteCount}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center transition-colors"
                    onClick={() => handleMisterWhiteChange(1)}
                    disabled={players.length < 3 || infiltratorCount + misterWhiteCount >= players.length - 1}
                    aria-label="Augmenter le nombre de Mister White"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Récapitulatif Joueurs ordinaires */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>Joueurs ordinaires</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {civilCount}
                </span>
              </div>
            </div>

            {players.length < 3 && (
              <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-center">
                ⚠️ Il faut au moins 3 joueurs pour démarrer une mission.
              </div>
            )}

            <button
              onClick={startGame}
              disabled={players.length < 3 || civilCount < 1}
              className="btn-amber w-full py-3.5 text-base font-bold shadow-lg shadow-scout-amber/10"
            >
              🚀 Lancer la partie
            </button>
          </div>
        )}

        {/* ── Phase 2: Révélation des rôles secrets (Reveal) ───────────────── */}
        {phase === 'reveal' && assigned[revealIndex] && (
          <div className="glass-card p-6 text-center space-y-6 animate-fade-in shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-scout-sage font-semibold">
              Joueur {revealIndex + 1} / {assigned.length}
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1">Passe le téléphone à</p>
              <h2 className="font-display font-extrabold text-3xl text-white tracking-tight">
                {assigned[revealIndex].player.name}
              </h2>
            </div>

            {!isWordRevealed ? (
              <div className="py-6 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-scout-mid/20 border-2 border-scout-mid/40 flex items-center justify-center text-4xl animate-pulse">
                  🔒
                </div>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Assure-toi que personne d'autre ne regarde l'écran avant de dévoiler ton rôle secret.
                </p>
                <button
                  onClick={() => setIsWordRevealed(true)}
                  className="btn-primary w-full py-3.5 text-base font-bold"
                >
                  👁️ Révéler mon mot secret
                </button>
                {revealIndex > 0 && (
                  <button
                    type="button"
                    onClick={prevReveal}
                    className="text-xs text-gray-400 hover:text-white transition-colors block mx-auto underline pt-1"
                  >
                    ← Joueur précédent
                  </button>
                )}
              </div>
            ) : (
              <div className="py-4 space-y-4 animate-fade-in">
                {/* Rôle : Joueur ordinaire ou Infiltré (affichage neutre identique, sans libellé de rôle) */}
                {assigned[revealIndex].role !== 'white' ? (
                  <div className="p-5 rounded-2xl bg-scout-dark/90 border border-scout-sage/40 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ton mot secret
                    </p>
                    <p className="font-display font-black text-3xl text-white tracking-wide py-1">
                      {assigned[revealIndex].secretWord}
                    </p>
                  </div>
                ) : (
                  /* Rôle : Mister White */
                  <div className="p-5 rounded-2xl bg-scout-dark/90 border border-purple-500/40 space-y-3">
                    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      🎭 Mister White
                    </span>
                    <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
                      <p className="text-sm font-semibold text-purple-200 leading-relaxed">
                        « Tu es Mister White ! Tu n'as pas de mot secret. Écoute bien les autres et fonds-toi dans la masse. »
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {assigned[revealIndex].role === 'white'
                    ? 'Retiens bien ta couverture et ne laisse rien paraître !'
                    : 'Mémorise bien ce mot et n\'en parle à personne pour le moment !'}
                </p>

                <button
                  onClick={nextReveal}
                  className="btn-amber w-full py-3.5 text-base font-bold shadow-lg shadow-scout-amber/10"
                >
                  {revealIndex + 1 < assigned.length
                    ? '✅ C\'est bon, joueur suivant'
                    : '🚀 Démarrer le Tour 1'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 3: Débat & Ordre de parole (Debate - SANS CHRONOMÈTRE) ──── */}
        {phase === 'debate' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in text-center shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-scout-amber/20 text-scout-amber border border-scout-amber/30 text-xs font-bold mb-2">
                <span>🗣️ Tour {round}</span>
                <span>•</span>
                <span>Tour de table</span>
              </div>
              <h2 className="font-display font-bold text-2xl text-white">
                Donnez vos indices !
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Le smartphone reste entre les mains du meneur. Chacun votre tour, énoncez <strong className="text-white">un seul mot ou indice</strong> en rapport avec votre terme secret.
              </p>
            </div>

            {/* Carte de l'ordre de parole */}
            <div className="text-left space-y-2.5 bg-scout-dark/70 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-scout-sage uppercase tracking-wider">
                  Ordre de parole des joueurs :
                </h3>
                <span className="text-[11px] text-gray-400">
                  {speakingOrder.length} en jeu
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {speakingOrder.map((p, idx) => {
                  const isFirst = idx === 0
                  return (
                    <div
                      key={p.player.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isFirst
                          ? 'bg-scout-mid/25 border-scout-sage/50 text-white shadow-md'
                          : 'bg-white/5 border-white/5 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isFirst
                              ? 'bg-scout-amber text-scout-forest'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm">
                          {p.player.name}
                        </span>
                      </div>
                      {isFirst && (
                        <span className="text-[11px] font-bold text-scout-amber bg-scout-amber/15 px-2 py-0.5 rounded-full border border-scout-amber/30">
                          Commence 🎙️
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setPhase('vote')}
                className="btn-danger w-full py-3.5 text-sm font-bold shadow-lg shadow-red-900/20"
              >
                🗳️ Passer au vote d'élimination
              </button>
              <p className="text-[11px] text-gray-500 mt-2">
                Le jeu et les votes se font à l'oral autour de la table.
              </p>
            </div>
          </div>
        )}

        {/* ── Phase 4: Vote d'élimination (Vote) ───────────────────────────── */}
        {phase === 'vote' && (
          <div className="glass-card p-5 space-y-4 animate-fade-in text-center shadow-2xl">
            <div>
              <span className="text-3xl">⚖️</span>
              <h2 className="font-display font-bold text-2xl text-white mt-1">Vote d'élimination</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Tour {round} — Le meneur clique sur le joueur éliminé à l'oral
              </p>
            </div>

            <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
              {activePlayers.map(p => (
                <button
                  key={p.player.id}
                  onClick={() => handleEliminate(p)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-scout-dark/80 hover:bg-red-950/40 border border-white/10 hover:border-red-500/50 transition-all text-left group"
                >
                  <span className="font-semibold text-sm text-white group-hover:text-red-300">
                    {p.player.name}
                  </span>
                  <span className="text-xs text-gray-400 group-hover:text-red-400 font-bold flex items-center gap-1">
                    <span>Éliminer</span>
                    <span>➔</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPhase('debate')}
              className="btn-ghost w-full text-xs text-gray-400 hover:text-white pt-2"
            >
              ← Revenir à l'ordre de parole
            </button>
          </div>
        )}

        {/* ── Phase 5: Révélation de l'éliminé (Elimination) ────────────────── */}
        {phase === 'elimination' && eliminatedPlayer && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in shadow-2xl">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl mb-3">
                {eliminatedPlayer.role === 'civil' && '👤'}
                {eliminatedPlayer.role === 'infiltre' && '🕵️'}
                {eliminatedPlayer.role === 'white' && '🎭'}
              </div>
              <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                Révélation
              </span>
            </div>

            {/* Révélation stricte du vrai rôle uniquement (sans révélation de mot secret) */}
            <div className="p-4 rounded-2xl bg-scout-dark/90 border border-white/15">
              <p className="text-xl font-display font-extrabold text-white">
                {eliminatedPlayer.role === 'civil' && (
                  <span>« {eliminatedPlayer.player.name} était un Joueur ordinaire »</span>
                )}
                {eliminatedPlayer.role === 'infiltre' && (
                  <span className="text-red-400">« {eliminatedPlayer.player.name} était L'Infiltré »</span>
                )}
                {eliminatedPlayer.role === 'white' && (
                  <span className="text-purple-300">« {eliminatedPlayer.player.name} était Mister White »</span>
                )}
              </p>
            </div>

            {/* Compteurs de survivants */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="font-mono font-bold text-base text-scout-sage">{remainingCivils}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Joueurs ordinaires</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="font-mono font-bold text-base text-scout-amber">{remainingInfiltres}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Infiltrés</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="font-mono font-bold text-base text-purple-300">{remainingWhites}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Mister White</div>
              </div>
            </div>

            {/* Conditions de fin de partie / Suite */}
            {winner === 'civils' && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-xs text-green-300 font-semibold">
                  🎉 Tous les Infiltrés et Mister White ont été éliminés !
                </div>
                <button
                  onClick={() => setPhase('gameover')}
                  className="btn-amber w-full py-3.5 text-base font-bold shadow-lg"
                >
                  🏆 Proclamer la victoire des Civils
                </button>
              </div>
            )}

            {winner === 'enemies' && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold">
                  🕵️ Il ne reste plus qu'un seul Joueur ordinaire en jeu !
                </div>
                <button
                  onClick={() => setPhase('gameover')}
                  className="btn-danger w-full py-3.5 text-base font-bold shadow-lg"
                >
                  🏆 Proclamer la victoire des Ennemis
                </button>
              </div>
            )}

            {winner === null && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-gray-400">
                  La partie continue ! Il reste des ennemis cachés dans le groupe.
                </p>
                <button
                  onClick={startNextRound}
                  className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-scout-mid/20"
                >
                  ⏭️ Lancer le Tour {round + 1}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 6: Fin de partie (Game Over) ──────────────────────────── */}
        {phase === 'gameover' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in shadow-2xl">
            <div className="text-5xl">{winner === 'civils' ? '🎉' : '🕵️'}</div>

            <div>
              <h2 className="font-display font-black text-2xl text-white">
                {winner === 'civils' ? 'Victoire des Civils !' : 'Victoire des Ennemis !'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                {winner === 'civils'
                  ? 'Tous les Infiltrés et Mister White ont été démasqués avec succès !'
                  : 'Les Infiltrés et Mister White ont triomphé : il ne reste plus qu\'un seul Joueur ordinaire en jeu.'}
              </p>
            </div>

            {/* Récapitulatif des mots secrets */}
            {currentCard && (
              <div className="p-3.5 rounded-xl bg-scout-dark/80 border border-white/10 text-left space-y-1.5 text-xs">
                <div className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider mb-1">
                  Mots secrets de la partie :
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Joueurs ordinaires :</span>
                  <span className="font-bold text-scout-sage">{currentCard.content}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Infiltrés :</span>
                  <span className="font-bold text-scout-amber">{currentCard.extra || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Mister White :</span>
                  <span className="italic text-purple-300">Aucun mot secret</span>
                </div>
              </div>
            )}

            {/* Révélation complète des rôles */}
            <div className="text-left space-y-2 bg-scout-dark/60 p-3.5 rounded-xl border border-white/5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Révélation complète des rôles :
              </h3>
              <div className="space-y-1.5 text-xs">
                {assigned.map(p => {
                  let roleLabel = 'Joueur ordinaire 👤'
                  let roleColor = 'text-scout-sage font-medium'
                  if (p.role === 'infiltre') {
                    roleLabel = 'L\'Infiltré 🕵️'
                    roleColor = 'text-red-400 font-bold'
                  } else if (p.role === 'white') {
                    roleLabel = 'Mister White 🎭'
                    roleColor = 'text-purple-300 font-bold'
                  }

                  return (
                    <div
                      key={p.player.id}
                      className="flex items-center justify-between py-1 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-medium">{p.player.name}</span>
                        {p.eliminated && (
                          <span className="text-[10px] text-gray-500">
                            (éliminé T{p.eliminatedInRound || '?'})
                          </span>
                        )}
                      </div>
                      <span className={roleColor}>{roleLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setPhase('setup')}
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg"
              >
                🔄 Rejouer une partie
              </button>
              <a
                href={HUB_URL}
                className="btn-ghost w-full block text-center text-xs py-2 text-gray-400 hover:text-white"
              >
                Retour au portail Scout Game
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
