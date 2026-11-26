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
import { ProposeModal } from './components/ProposeModal'

const HUB_URL = getHubUrl()
const MIN_PLAYERS = 3
const MAX_PLAYERS = 50

export default function App() {
  useWakeLock()
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')
  const [theme, setTheme] = useState<GameTheme>('scout')
  const [scoutCards, setScoutCards] = useState<Card[]>(SCOUT_FALLBACK_CARDS)
  const [molduApiCards, setMolduApiCards] = useState<Card[]>([])
  const [proposeOpen, setProposeOpen] = useState(false)

  const [infiltratorCount, setInfiltratorCount] = useState(1)
  const [misterWhiteCount, setMisterWhiteCount] = useState(() => (loadPlayers().length >= 5 ? 1 : 0))

  const [phase, setPhase] = useState<GamePhase>('setup')
  const [round, setRound] = useState(1)
  const [assigned, setAssigned] = useState<AssignedPlayer[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [revealIndex, setRevealIndex] = useState(0)
  const [isWordRevealed, setIsWordRevealed] = useState(false)
  const [speakingOrder, setSpeakingOrder] = useState<AssignedPlayer[]>([])

  const [eliminatedPlayer, setEliminatedPlayer] = useState<AssignedPlayer | null>(null)
  const [winner, setWinner] = useState<'civils' | 'enemies' | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  useEffect(() => {
    fetchInfiltreCards()
      .then(data => {
        if (data && data.length > 0) {
          const molduList = data.filter(c => c.mode === 'moldu' || c.mode === 'moldus')
          const scoutList = data.filter(c => c.mode !== 'moldu' && c.mode !== 'moldus')
          if (scoutList.length > 0) setScoutCards(scoutList)
          if (molduList.length > 0) setMolduApiCards(molduList)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const total = players.length
    if (total < MIN_PLAYERS) {
      if (misterWhiteCount !== 0) setMisterWhiteCount(0)
      if (infiltratorCount !== 1) setInfiltratorCount(1)
      return
    }

    const maxEnemies = total - 1
    if (infiltratorCount + misterWhiteCount > maxEnemies) {
      let newWhites = misterWhiteCount
      let newInfiltres = infiltratorCount

      while (newInfiltres + newWhites > maxEnemies) {
        if (newWhites > 0) newWhites--
        else if (newInfiltres > 1) newInfiltres--
        else break
      }
      setMisterWhiteCount(newWhites)
      setInfiltratorCount(newInfiltres)
    }
  }, [players.length, infiltratorCount, misterWhiteCount])

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed || players.length >= MAX_PLAYERS) return

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

  function handleClearPlayers() {
    setPlayers([])
    savePlayers([])
  }

  function handleInfiltratorChange(delta: number) {
    const maxAllowed = Math.max(1, players.length - misterWhiteCount - 1)
    const nextVal = infiltratorCount + delta
    if (nextVal >= 1 && nextVal <= maxAllowed) {
      setInfiltratorCount(nextVal)
    }
  }

  function handleMisterWhiteChange(delta: number) {
    const maxAllowed = Math.max(0, players.length - infiltratorCount - 1)
    const nextVal = misterWhiteCount + delta
    if (nextVal >= 0 && nextVal <= maxAllowed) {
      setMisterWhiteCount(nextVal)
    }
  }

  function startGame() {
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return
    if (infiltratorCount + misterWhiteCount >= players.length) return

    const cardPool = theme === 'moldus' ? [...MOLDUS_CARDS, ...molduApiCards] : scoutCards
    if (!cardPool || cardPool.length === 0) return

    const availableCards =
      cardPool.length > 1 && currentCard
        ? cardPool.filter(c => c.id !== currentCard.id)
        : cardPool
    const pool = availableCards.length > 0 ? availableCards : cardPool
    const chosenCard = pool[Math.floor(Math.random() * pool.length)]
    if (!chosenCard) return

    const assignedList = assignRoles(players, infiltratorCount, misterWhiteCount, chosenCard)
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
    <div className="app-container bg-[#0f1f18] text-[#f3f4f6]">
      {/* ── En-tête uniforme ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0c1913] border-b border-[#2d6a4f] px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <a
              href={HUB_URL}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-[#2d6a4f] bg-[#162b22] hover:bg-[#1e3a2d] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              ← Menu
            </a>
          </div>
          <h1 className="justify-self-center font-display font-bold text-base text-[#f3f4f6] truncate">
            L'Infiltré
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

      {/* ── Contenu principal ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        {/* ── Phase 1: Setup ───────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-[#f3f4f6]">Préparez la mission</h2>
              <p className="text-xs text-[#a3c9b4]">
                Démasquez les agents secrets infiltrés parmi les joueurs
              </p>
            </div>

            {/* Gestionnaire de joueurs (déplié par défaut) */}
            <div className="p-3.5 rounded-xl bg-[#0f1f18] border border-[#2d6a4f] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#95d5b2] uppercase tracking-wider">
                    Joueurs ({players.length} / {MAX_PLAYERS})
                  </span>
                  <span className="block text-[11px] text-[#83a190]">Min. {MIN_PLAYERS} participants</span>
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

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">Aucun joueur enregistré.</p>
                ) : (
                  players.map(p => (
                    <div
                      key={p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#162b22] border border-[#2d6a4f] text-xs font-medium text-[#f3f4f6]"
                    >
                      <span>{p.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(p.id)}
                        className="text-[#8ab39c] hover:text-red-300 text-sm leading-none ml-0.5"
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
                  className="input-scout text-sm py-2"
                  placeholder="Ajouter un prénom…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  maxLength={30}
                  disabled={players.length >= MAX_PLAYERS}
                />
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 text-sm font-bold"
                  disabled={!newPlayerName.trim() || players.length >= MAX_PLAYERS}
                  title="Ajouter"
                >
                  +
                </button>
              </form>
            </div>

            {/* Mode de jeu : Scout / Moldus */}
            <div>
              <label className="block text-xs font-bold text-[#95d5b2] uppercase tracking-wider mb-2">
                Mode de jeu
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTheme('scout')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    theme === 'scout'
                      ? 'bg-[#213f32] border-[#388463] text-[#f3f4f6]'
                      : 'bg-[#0f1f18] border-[#2d6a4f] text-gray-300 hover:border-[#388463]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">⚜️</span>
                    {theme === 'scout' && (
                      <span className="text-[10px] uppercase font-bold text-[#8fd4b0] bg-[#162b22] border border-[#2d6a4f] px-1.5 py-0.5 rounded">
                        Actif
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-[#f3f4f6] mt-1">Scout</div>
                  <div className="text-[11px] text-[#a3c9b4] mt-0.5">Culture &amp; traditions scoutes</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('moldus')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    theme === 'moldus'
                      ? 'bg-[#2a2117] border-[#855a2b] text-[#f3f4f6]'
                      : 'bg-[#0f1f18] border-[#2d6a4f] text-gray-300 hover:border-[#388463]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🌍</span>
                    {theme === 'moldus' && (
                      <span className="text-[10px] uppercase font-bold text-[#deb07a] bg-[#1c1611] border border-[#785127] px-1.5 py-0.5 rounded">
                        Actif
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-[#f3f4f6] mt-1">Moldus</div>
                  <div className="text-[11px] text-[#c9b7a2] mt-0.5">Mots génériques du quotidien</div>
                </button>
              </div>
            </div>

            {/* Répartition des rôles */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-[#95d5b2] uppercase tracking-wider">
                Rôles ajustables
              </label>

              <div className="flex items-center justify-between bg-[#0f1f18] p-3 rounded-xl border border-[#2d6a4f]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🕵️</span>
                  <div>
                    <div className="text-sm font-semibold text-[#f3f4f6]">Infiltrés</div>
                    <div className="text-[11px] text-[#a3c9b4]">Reçoivent un mot secret alternatif</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-[#162b22] border border-[#2d6a4f] hover:bg-[#1e3a2d] disabled:opacity-35 text-[#f3f4f6] font-bold flex items-center justify-center"
                    onClick={() => handleInfiltratorChange(-1)}
                    disabled={infiltratorCount <= 1}
                    aria-label="Diminuer le nombre d'infiltrés"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-[#deb07a] text-base w-6 text-center">
                    {infiltratorCount}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-[#162b22] border border-[#2d6a4f] hover:bg-[#1e3a2d] disabled:opacity-35 text-[#f3f4f6] font-bold flex items-center justify-center"
                    onClick={() => handleInfiltratorChange(1)}
                    disabled={players.length < MIN_PLAYERS || infiltratorCount + misterWhiteCount >= players.length - 1}
                    aria-label="Augmenter le nombre d'infiltrés"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#0f1f18] p-3 rounded-xl border border-[#2d6a4f]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎭</span>
                  <div>
                    <div className="text-sm font-semibold text-[#f3f4f6]">Mister White</div>
                    <div className="text-[11px] text-[#a3c9b4]">Ne reçoit aucun mot secret</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-[#162b22] border border-[#2d6a4f] hover:bg-[#1e3a2d] disabled:opacity-35 text-[#f3f4f6] font-bold flex items-center justify-center"
                    onClick={() => handleMisterWhiteChange(-1)}
                    disabled={misterWhiteCount <= 0}
                    aria-label="Diminuer le nombre de Mister White"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-[#8fd4b0] text-base w-6 text-center">
                    {misterWhiteCount}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-[#162b22] border border-[#2d6a4f] hover:bg-[#1e3a2d] disabled:opacity-35 text-[#f3f4f6] font-bold flex items-center justify-center"
                    onClick={() => handleMisterWhiteChange(1)}
                    disabled={players.length < MIN_PLAYERS || infiltratorCount + misterWhiteCount >= players.length - 1}
                    aria-label="Augmenter le nombre de Mister White"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0f1f18] border border-[#2d6a4f] text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>Joueurs ordinaires</span>
                </div>
                <span className="font-mono font-bold text-[#f3f4f6]">{civilCount}</span>
              </div>
            </div>

            {players.length < MIN_PLAYERS && (
              <div className="text-xs text-[#deb07a] bg-[#261e17] border border-[#785127] p-2.5 rounded-xl text-center">
                Il faut au moins {MIN_PLAYERS} joueurs pour démarrer une mission.
              </div>
            )}

            <button
              type="button"
              onClick={startGame}
              disabled={players.length < MIN_PLAYERS || players.length > MAX_PLAYERS || civilCount < 1}
              className="btn-primary w-full py-3.5 text-base font-bold"
            >
              Lancer la partie
            </button>
          </div>
        )}

        {/* ── Phase 2: Reveal ──────────────────────────────────────────────── */}
        {phase === 'reveal' && assigned[revealIndex] && (
          <div className="glass-card p-6 text-center space-y-6">
            <div className="text-xs uppercase tracking-widest text-[#95d5b2] font-semibold">
              Joueur {revealIndex + 1} / {assigned.length}
            </div>

            <div>
              <p className="text-[#a3c9b4] text-xs mb-1">Passe le téléphone à</p>
              <h2 className="font-display font-extrabold text-3xl text-[#f3f4f6] tracking-tight">
                {assigned[revealIndex].player.name}
              </h2>
            </div>

            {!isWordRevealed ? (
              <div className="py-6 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#0f1f18] border border-[#2d6a4f] flex items-center justify-center text-4xl">
                  🔒
                </div>
                <p className="text-xs text-gray-300 max-w-xs mx-auto">
                  Assure-toi que personne d'autre ne regarde l'écran avant de dévoiler ton rôle secret.
                </p>
                <button
                  type="button"
                  onClick={() => setIsWordRevealed(true)}
                  className="btn-primary w-full py-3.5 text-base font-bold"
                >
                  👁️ Révéler mon mot secret
                </button>
                {revealIndex > 0 && (
                  <button
                    type="button"
                    onClick={prevReveal}
                    className="text-xs text-[#a3c9b4] hover:text-white transition-colors block mx-auto underline pt-1"
                  >
                    ← Joueur précédent
                  </button>
                )}
              </div>
            ) : (
              <div className="py-4 space-y-4">
                {assigned[revealIndex].role !== 'white' ? (
                  <div className="p-5 rounded-2xl bg-[#0f1f18] border border-[#388463] space-y-2">
                    <p className="text-xs font-semibold text-[#95d5b2] uppercase tracking-wider">
                      Ton mot secret
                    </p>
                    <p className="font-display font-black text-3xl text-[#f3f4f6] tracking-wide py-1">
                      {assigned[revealIndex].secretWord}
                    </p>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-[#241b2f] border border-[#6b4d8c] space-y-3">
                    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-[#181121] text-purple-200 border border-[#6b4d8c]">
                      🎭 Mister White
                    </span>
                    <p className="text-sm font-semibold text-purple-100 leading-relaxed">
                      « Tu es Mister White ! Tu n'as pas de mot secret. Écoute bien les autres et fonds-toi dans la masse. »
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-300">
                  {assigned[revealIndex].role === 'white'
                    ? 'Retiens bien ta couverture et ne laisse rien paraître !'
                    : "Mémorise bien ce mot et n'en parle à personne pour le moment !"}
                </p>

                <button
                  type="button"
                  onClick={nextReveal}
                  className="btn-amber w-full py-3.5 text-base font-bold"
                >
                  {revealIndex + 1 < assigned.length
                    ? "✅ C'est bon, joueur suivant"
                    : 'Démarrer le Tour 1'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 3: Débat & Ordre de parole ──────────────────────────────── */}
        {phase === 'debate' && (
          <div className="glass-card p-5 space-y-5 text-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#261e17] text-[#deb07a] border border-[#785127] text-xs font-bold mb-2">
                <span>🗣️ Tour {round}</span>
                <span>•</span>
                <span>Tour de table</span>
              </div>
              <h2 className="font-display font-bold text-2xl text-[#f3f4f6]">
                Donnez vos indices !
              </h2>
              <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
                Chacun votre tour, énoncez <strong className="text-white">un seul mot ou indice</strong> en rapport avec votre terme secret.
              </p>
            </div>

            <div className="text-left space-y-2.5 bg-[#0f1f18] p-4 rounded-2xl border border-[#2d6a4f]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#95d5b2] uppercase tracking-wider">
                  Ordre de parole :
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
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        isFirst
                          ? 'bg-[#213f32] border-[#388463] text-[#f3f4f6]'
                          : 'bg-[#162b22] border-[#2d6a4f] text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isFirst
                              ? 'bg-[#388463] text-white'
                              : 'bg-[#0f1f18] text-gray-300 border border-[#2d6a4f]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm">{p.player.name}</span>
                      </div>
                      {isFirst && (
                        <span className="text-[11px] font-bold text-[#8fd4b0] bg-[#162b22] border border-[#2d6a4f] px-2 py-0.5 rounded-full">
                          Commence
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setPhase('vote')}
                className="btn-danger w-full py-3.5 text-sm font-bold"
              >
                🗳️ Passer au vote d'élimination
              </button>
              <p className="text-[11px] text-[#83a190] mt-2">
                Le jeu et les votes se font à l'oral autour de la table.
              </p>
            </div>
          </div>
        )}

        {/* ── Phase 4: Vote ─────────────────────────────────────────────────── */}
        {phase === 'vote' && (
          <div className="glass-card p-5 space-y-4 text-center">
            <div>
              <span className="text-3xl">⚖️</span>
              <h2 className="font-display font-bold text-2xl text-[#f3f4f6] mt-1">Vote d'élimination</h2>
              <p className="text-xs text-[#a3c9b4] mt-0.5">
                Tour {round} — Le meneur clique sur le joueur éliminé à l'oral
              </p>
            </div>

            <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
              {activePlayers.map(p => (
                <button
                  type="button"
                  key={p.player.id}
                  onClick={() => handleEliminate(p)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#0f1f18] hover:bg-[#3a1b20] border border-[#2d6a4f] hover:border-[#8c2d38] transition-colors text-left group"
                >
                  <span className="font-semibold text-sm text-[#f3f4f6] group-hover:text-red-200">
                    {p.player.name}
                  </span>
                  <span className="text-xs text-[#a3c9b4] group-hover:text-red-300 font-bold flex items-center gap-1">
                    <span>Éliminer</span>
                    <span>➔</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPhase('debate')}
              className="btn-ghost w-full text-xs pt-2"
            >
              ← Revenir à l'ordre de parole
            </button>
          </div>
        )}

        {/* ── Phase 5: Révélation de l'éliminé ──────────────────────────────── */}
        {phase === 'elimination' && eliminatedPlayer && (
          <div className="glass-card p-6 text-center space-y-5">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-[#0f1f18] border border-[#2d6a4f] flex items-center justify-center text-3xl mb-3">
                {eliminatedPlayer.role === 'civil' && '👤'}
                {eliminatedPlayer.role === 'infiltre' && '🕵️'}
                {eliminatedPlayer.role === 'white' && '🎭'}
              </div>
              <span className="text-xs uppercase tracking-widest text-[#95d5b2] font-semibold">
                Révélation
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f1f18] border border-[#2d6a4f]">
              <p className="text-xl font-display font-extrabold text-[#f3f4f6]">
                {eliminatedPlayer.role === 'civil' && (
                  <span>« {eliminatedPlayer.player.name} était un Joueur ordinaire »</span>
                )}
                {eliminatedPlayer.role === 'infiltre' && (
                  <span className="text-red-300">« {eliminatedPlayer.player.name} était L'Infiltré »</span>
                )}
                {eliminatedPlayer.role === 'white' && (
                  <span className="text-purple-200">« {eliminatedPlayer.player.name} était Mister White »</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[#0f1f18] border border-[#2d6a4f]">
                <div className="font-mono font-bold text-base text-[#8fd4b0]">{remainingCivils}</div>
                <div className="text-[10px] text-gray-300 mt-0.5">Ordinaires</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0f1f18] border border-[#2d6a4f]">
                <div className="font-mono font-bold text-base text-[#deb07a]">{remainingInfiltres}</div>
                <div className="text-[10px] text-gray-300 mt-0.5">Infiltrés</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0f1f18] border border-[#2d6a4f]">
                <div className="font-mono font-bold text-base text-purple-200">{remainingWhites}</div>
                <div className="text-[10px] text-gray-300 mt-0.5">Mister White</div>
              </div>
            </div>

            {winner === 'civils' && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-[#162b22] border border-[#388463] text-xs text-[#8fd4b0] font-semibold">
                  🎉 Tous les Infiltrés et Mister White ont été éliminés !
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('gameover')}
                  className="btn-primary w-full py-3.5 text-base font-bold"
                >
                  🏆 Proclamer la victoire des Civils
                </button>
              </div>
            )}

            {winner === 'enemies' && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-[#3a1b20] border border-[#8c2d38] text-xs text-red-200 font-semibold">
                  🕵️ Il ne reste plus qu'un seul Joueur ordinaire en jeu !
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('gameover')}
                  className="btn-danger w-full py-3.5 text-base font-bold"
                >
                  🏆 Proclamer la victoire des Ennemis
                </button>
              </div>
            )}

            {winner === null && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-gray-300">
                  La partie continue ! Il reste des ennemis cachés dans le groupe.
                </p>
                <button
                  type="button"
                  onClick={startNextRound}
                  className="btn-primary w-full py-3.5 text-base font-bold"
                >
                  ⏭️ Lancer le Tour {round + 1}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 6: Fin de partie ────────────────────────────────────────── */}
        {phase === 'gameover' && (
          <div className="glass-card p-6 text-center space-y-5">
            <div className="text-5xl">{winner === 'civils' ? '🎉' : '🕵️'}</div>

            <div>
              <h2 className="font-display font-black text-2xl text-[#f3f4f6]">
                {winner === 'civils' ? 'Victoire des Civils !' : 'Victoire des Ennemis !'}
              </h2>
              <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
                {winner === 'civils'
                  ? 'Tous les Infiltrés et Mister White ont été démasqués avec succès !'
                  : "Les Infiltrés et Mister White ont triomphé : il ne reste plus qu'un seul Joueur ordinaire en jeu."}
              </p>
            </div>

            {currentCard && (
              <div className="p-3.5 rounded-xl bg-[#0f1f18] border border-[#2d6a4f] text-left space-y-1.5 text-xs">
                <div className="text-[#95d5b2] font-semibold uppercase text-[10px] tracking-wider mb-1">
                  Mots secrets de la partie :
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Joueurs ordinaires :</span>
                  <span className="font-bold text-[#8fd4b0]">{currentCard.content}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Infiltrés :</span>
                  <span className="font-bold text-[#deb07a]">{currentCard.extra || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Mister White :</span>
                  <span className="italic text-purple-200">Aucun mot secret</span>
                </div>
              </div>
            )}

            <div className="text-left space-y-2 bg-[#0f1f18] p-3.5 rounded-xl border border-[#2d6a4f]">
              <h3 className="text-xs font-semibold text-[#95d5b2] uppercase tracking-wider">
                Révélation complète des rôles :
              </h3>
              <div className="space-y-1.5 text-xs">
                {assigned.map(p => {
                  let roleLabel = 'Joueur ordinaire 👤'
                  let roleColor = 'text-[#8fd4b0] font-medium'
                  if (p.role === 'infiltre') {
                    roleLabel = "L'Infiltré 🕵️"
                    roleColor = 'text-red-300 font-bold'
                  } else if (p.role === 'white') {
                    roleLabel = 'Mister White 🎭'
                    roleColor = 'text-purple-200 font-bold'
                  }

                  return (
                    <div
                      key={p.player.id}
                      className="flex items-center justify-between py-1 border-b border-[#2d6a4f]/40 last:border-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#f3f4f6] font-medium">{p.player.name}</span>
                        {p.eliminated && (
                          <span className="text-[10px] text-gray-400">
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
                type="button"
                onClick={() => setPhase('setup')}
                className="btn-primary w-full py-3.5 text-sm font-bold"
              >
                🔄 Rejouer une partie
              </button>
              <a href={HUB_URL} className="btn-ghost w-full block text-center text-xs py-2">
                ← Menu
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="py-3 px-4 text-center border-t border-[#1e3a2d] bg-[#0c1913] text-[11px] text-[#83a190]">
        Projet indépendant — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
      </footer>

      <ProposeModal
        isOpen={proposeOpen}
        initialTheme={theme}
        onClose={() => setProposeOpen(false)}
      />
    </div>
  )
}
