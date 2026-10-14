import { useState, useEffect } from 'react'
import type { Player, Card, AssignedPlayer, RoleType, GamePhase } from './types'
import { loadPlayers, savePlayers, getHubUrl } from './services/cookies'
import { fetchRondeCards, sendTelemetry } from './services/api'

const HUB_URL = getHubUrl()

const ROLE_DEFINITIONS: Record<RoleType, { name: string; team: 'scouts' | 'saboteurs'; icon: string; desc: string }> = {
  guide: {
    name: 'Guide du Campement',
    team: 'scouts',
    icon: '⚜️',
    desc: 'Tu veilles sur le campement vaudois. En cas d\'égalité lors du débriefing au mât, ta voix est prépondérante.',
  },
  veilleur: {
    name: 'Éclaireur Loyal',
    team: 'scouts',
    icon: '🔦',
    desc: 'Explore le campement dans la nuit, protège le Sarasani et démasque les rôdeurs nocturnes au rassemblement.',
  },
  intendant: {
    name: 'Quartier-Maître (QM)',
    team: 'scouts',
    icon: '🎒',
    desc: 'Garant des vivres, de l\'abri bouffe et du matériel. Tu connais les moindres recoins du campement.',
  },
  saboteur: {
    name: 'Rôdeur Nocturne',
    team: 'saboteurs',
    icon: '🦉',
    desc: 'Furtif sous la lune, sème le mystère autour des carrés militaires et du trou bouffe sans te faire repérer.',
  },
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [currentEventCard, setCurrentEventCard] = useState<Card | null>(null)
  const [saboteurCount, setSaboteurCount] = useState(1)

  const [phase, setPhase] = useState<GamePhase>('setup')
  const [assigned, setAssigned] = useState<AssignedPlayer[]>([])
  const [assignIndex, setAssignIndex] = useState(0)
  const [isRoleRevealed, setIsRoleRevealed] = useState(false)

  const [nightCount, setNightCount] = useState(1)
  const [eliminatedPlayer, setEliminatedPlayer] = useState<AssignedPlayer | null>(null)
  const [winner, setWinner] = useState<'scouts' | 'saboteurs' | null>(null)
  const [gameStartTime, setGameStartTime] = useState<number>(0)

  useEffect(() => {
    fetchRondeCards()
      .then(data => setCards(data))
      .catch(() => {
        setCards([
          { id: 1, game: 'rondedenuit', category: 'action', title: 'Craquement près du Sarasani', content: 'Un bruit suspect a été entendu près du mât central.', extra: 'Rassemblement d\'urgence' },
          { id: 2, game: 'rondedenuit', category: 'meteo', title: 'La Roille Nocturne', content: 'Une pluie battante s\'abat sur les carrés Berlingot.', extra: 'Vérification des haubans' },
        ])
      })
  }, [])

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

  function startRonde() {
    if (players.length < 4) return
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const sabCount = Math.min(saboteurCount, Math.floor(players.length / 2))

    const assignedList: AssignedPlayer[] = shuffled.map((player, idx) => {
      let role: RoleType = 'veilleur'
      if (idx === 0) role = 'guide'
      else if (idx === 1 && players.length >= 5) role = 'intendant'
      else if (idx >= players.length - sabCount) role = 'saboteur'

      return { player, role, eliminated: false }
    })

    setAssigned(assignedList.sort(() => Math.random() - 0.5))
    setAssignIndex(0)
    setIsRoleRevealed(false)
    setNightCount(1)
    setWinner(null)
    setEliminatedPlayer(null)
    setGameStartTime(Date.now())
    setPhase('assign')
  }

  function nextAssign() {
    setIsRoleRevealed(false)
    if (assignIndex + 1 < assigned.length) {
      setAssignIndex(assignIndex + 1)
    } else {
      drawNightCard()
      setPhase('night')
    }
  }

  function drawNightCard() {
    if (cards.length > 0) {
      const randomCard = cards[Math.floor(Math.random() * cards.length)]
      setCurrentEventCard(randomCard)
    }
  }

  function handleVote(candidate: AssignedPlayer) {
    const updated = assigned.map(p => (p.player.id === candidate.player.id ? { ...p, eliminated: true } : p))
    setAssigned(updated)
    setEliminatedPlayer(candidate)

    const activeSaboteurs = updated.filter(p => p.role === 'saboteur' && !p.eliminated).length
    const activeLoyals = updated.filter(p => p.role !== 'saboteur' && !p.eliminated).length

    if (activeSaboteurs === 0) {
      setWinner('scouts')
      setPhase('gameover')
      sendTelemetry((Date.now() - gameStartTime) / 1000)
    } else if (activeLoyals <= activeSaboteurs) {
      setWinner('saboteurs')
      setPhase('gameover')
      sendTelemetry((Date.now() - gameStartTime) / 1000)
    } else {
      // Continue to next night
      setNightCount(n => n + 1)
      drawNightCard()
      setPhase('night')
    }
  }

  const activePlayers = assigned.filter(p => !p.eliminated)

  return (
    <div className="app-container bg-gradient-to-b from-[#060913] via-[#0b1329] to-[#060913] text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#060913]/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a href={HUB_URL} className="flex items-center gap-2 text-blue-400 hover:text-white transition-colors text-sm">
          <span>←</span>
          <span className="font-semibold">Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <div>
            <h1 className="font-display font-bold text-base tracking-wide leading-tight">Grand Jeu de Nuit</h1>
            <p className="text-[10px] text-blue-300">Mystère au campement vaudois</p>
          </div>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-blue-900/30 text-blue-300 border border-blue-500/30 font-semibold">
          Veillée {nightCount}
        </div>
      </header>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">

        {/* ── Phase 1: Setup ──────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="glass-card p-5 space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="font-display font-bold text-2xl text-white">Mystère Nocturne</h2>
              <p className="text-xs text-gray-400">Éclaireurs loyaux vs Rôdeurs du campement</p>
            </div>

            {/* Players list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Patrouille ({players.length})
                </label>
                <span className="text-xs text-gray-400">Min. 4 joueurs</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto p-1">
                {players.map(p => (
                  <div key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/40 text-xs text-white">
                    <span>{p.name}</span>
                    <button onClick={() => handleRemovePlayer(p.id)} className="text-gray-400 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddPlayer} className="flex gap-2">
                <input
                  className="input-scout text-sm py-2"
                  placeholder="Ajouter un éclaireur ou une éclé…"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                />
                <button type="submit" className="btn-primary py-2 px-4 text-sm">+</button>
              </form>
            </div>

            {/* Roles reminder */}
            <div className="bg-scout-dark/60 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs text-gray-300">
              <div className="font-bold text-blue-300 mb-1">Rôles du Grand Jeu :</div>
              <div>⚜️ <strong>Guide du Campement</strong> : voix prépondérante au débriefing</div>
              <div>🎒 <strong>Quartier-Maître</strong> : protège l'abri bouffe et le matériel</div>
              <div>🔦 <strong>Éclaireurs</strong> : explorent le camp et résolvent l'énigme</div>
              <div>🦉 <strong>Rôdeurs</strong> : sèment le mystère autour des tentes</div>
            </div>

            {/* Saboteurs count */}
            <div className="flex items-center justify-between bg-scout-dark/60 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-gray-300">Nombre de rôdeurs nocturnes</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                  onClick={() => setSaboteurCount(Math.max(1, saboteurCount - 1))}
                >
                  -
                </button>
                <span className="font-bold text-scout-amber px-2">{saboteurCount}</span>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                  onClick={() => setSaboteurCount(Math.min(2, saboteurCount + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={startRonde}
              disabled={players.length < 4}
              className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-blue-500/20"
            >
              🌙 Lancer le Grand Jeu de Nuit
            </button>
          </div>
        )}

        {/* ── Phase 2: Role Assignment ────────────────────────────────────── */}
        {phase === 'assign' && assigned[assignIndex] && (
          <div className="glass-card p-6 text-center space-y-6 animate-fade-in">
            <div className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
              Attribution secrète ({assignIndex + 1} / {assigned.length})
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1">Passe l'écran discrètement à</p>
              <h2 className="font-display font-extrabold text-3xl text-white">
                {assigned[assignIndex].player.name}
              </h2>
            </div>

            {!isRoleRevealed ? (
              <div className="py-6 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-blue-900/30 border-2 border-blue-500/40 flex items-center justify-center text-4xl animate-pulse">
                  🤫
                </div>
                <p className="text-xs text-gray-400">Ne révèle ton rôle à personne</p>
                <button onClick={() => setIsRoleRevealed(true)} className="btn-primary w-full py-3 text-base">
                  👁️ Découvrir mon rôle secret
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-4 animate-fade-in">
                {(() => {
                  const roleDef = ROLE_DEFINITIONS[assigned[assignIndex].role]
                  return (
                    <div className="p-4 rounded-2xl bg-[#0e1629] border border-blue-500/40 space-y-2">
                      <div className="text-4xl">{roleDef.icon}</div>
                      <h3 className="font-display font-black text-2xl text-white">
                        {roleDef.name}
                      </h3>
                      <p className="text-xs text-blue-300 leading-relaxed">
                        {roleDef.desc}
                      </p>
                    </div>
                  )
                })()}

                <button onClick={nextAssign} className="btn-amber w-full py-3 text-base font-bold">
                  ✅ Rôle mémorisé ➔
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 3: Night Phase ────────────────────────────────────────── */}
        {phase === 'night' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-4xl">🌌</span>
              <h2 className="font-display font-black text-2xl text-blue-200">
                Nuit Noire — Énigme n°{nightCount}
              </h2>
              <p className="text-xs text-gray-400">
                Le campement de Froideville ou de Plambuit s'endort sous la voûte céleste...
              </p>
            </div>

            {/* Night incident / weather card */}
            {currentEventCard && (
              <div className="p-4 rounded-2xl bg-[#0e172a] border border-blue-400/30 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-scout-amber uppercase tracking-wider">
                  <span>⚠️ Événement Nocturne</span>
                  <span className="text-gray-400">{currentEventCard.category}</span>
                </div>
                <h3 className="font-bold text-white text-base">
                  {currentEventCard.title}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {currentEventCard.content}
                </p>
                {currentEventCard.extra && (
                  <p className="text-xs text-blue-300 font-mono bg-blue-950/40 p-2 rounded-lg border border-blue-800/40">
                    ℹ️ Indice : {currentEventCard.extra}
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-xl space-y-1.5 text-left">
              <div className="font-bold text-white mb-1">Actions nocturnes :</div>
              <div>1. Les rôdeurs nocturnes s'orientent en silence près du Sarasani.</div>
              <div>2. Le Quartier-Maître inspecte discrètement l'abri bouffe et les jerricans.</div>
              <div>3. Le Guide du Campement effectue sa ronde autour des carrés militaires.</div>
            </div>

            <button
              onClick={() => setPhase('day')}
              className="btn-amber w-full py-3.5 text-sm font-bold shadow-lg shadow-scout-amber/20"
            >
              ☀️ Le jour se lève — Rassemblement au mât des couleurs
            </button>
          </div>
        )}

        {/* ── Phase 4: Day Phase ──────────────────────────────────────────── */}
        {phase === 'day' && (
          <div className="glass-card p-5 space-y-4 animate-fade-in text-center">
            <div>
              <span className="text-3xl">🌅</span>
              <h2 className="font-display font-bold text-2xl text-white mt-1">
                Rassemblement au Mât des Couleurs
              </h2>
              <p className="text-xs text-gray-400">
                Débattez des indices de la nuit et démasquez le rôdeur !
              </p>
            </div>

            {eliminatedPlayer && (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-700/40 text-xs text-red-200">
                Dernier démasqué : <strong>{eliminatedPlayer.player.name}</strong> ({ROLE_DEFINITIONS[eliminatedPlayer.role].name})
              </div>
            )}

            <div className="space-y-2 pt-1 text-left">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Désignez un éclaireur suspecté d'être le Rôdeur Nocturne :
              </h3>
              {activePlayers.map(p => (
                <button
                  key={p.player.id}
                  onClick={() => handleVote(p)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-scout-dark/80 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 transition-all text-left group"
                >
                  <span className="font-semibold text-sm text-white group-hover:text-red-300">
                    {p.player.name}
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-red-400 font-bold">
                    Démasquer ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Phase 5: Game Over ──────────────────────────────────────────── */}
        {phase === 'gameover' && (
          <div className="glass-card p-6 text-center space-y-5 animate-fade-in">
            <div className="text-5xl">{winner === 'scouts' ? '🏕️' : '🦉'}</div>

            <div>
              <h2 className="font-display font-black text-2xl text-white">
                {winner === 'scouts' ? 'Victoire de la Patrouille !' : 'Victoire des Rôdeurs Nocturnes !'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {winner === 'scouts'
                  ? 'La patrouille a percé le mystère et protégé la sérénité du campement vaudois !'
                  : 'Les rôdeurs ont semé un magnifique cheni sans se faire démasquer !'}
              </p>
            </div>

            {/* Récapitulatif */}
            <div className="text-left space-y-2 bg-[#0d1424] p-3.5 rounded-xl border border-white/5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Bilan du Grand Jeu de Nuit :
              </h3>
              <div className="space-y-1.5 text-xs">
                {assigned.map(p => {
                  const roleDef = ROLE_DEFINITIONS[p.role]
                  return (
                    <div key={p.player.id} className="flex items-center justify-between">
                      <span className="text-gray-300">{p.player.name}</span>
                      <span className={p.role === 'saboteur' ? 'text-red-400 font-bold' : 'text-blue-300'}>
                        {roleDef.icon} {roleDef.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button onClick={() => setPhase('setup')} className="btn-primary w-full py-3 text-sm font-bold">
                🔄 Relancer un Grand Jeu
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
