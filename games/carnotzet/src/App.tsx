import { useState, useEffect, useCallback, useRef } from 'react'
import type { Player, Card, ActiveRule } from './types'
import { loadPlayers, savePlayers, loadDevicePass, getHubUrl } from './services/cookies'
import { verifyDevice, fetchCarnotzetCards, sendTelemetry } from './services/api'
import { BlackoutScreen } from './components/BlackoutScreen'

const CATEGORY_META: Record<Card['category'], { label: string; icon: string; color: string; badge: string }> = {
  duel:  { label: 'Duel',  icon: '⚔️', color: '#f4a261', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  vote:  { label: 'Vote',  icon: '🗳️', color: '#60a5fa', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  pub:   { label: 'Dilemme', icon: '🍺', color: '#74c69d', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  regle: { label: 'Règle', icon: '📜', color: '#e9c46a', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
}

export default function App() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [blackoutMessage, setBlackoutMessage] = useState<string | null>(null)

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers())
  const [newPlayerName, setNewPlayerName] = useState('')
  const [showPlayerModal, setShowPlayerModal] = useState(false)

  const [cards, setCards] = useState<Card[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [cardHistory, setCardHistory] = useState<Card[]>([])
  const [activeRules, setActiveRules] = useState<ActiveRule[]>([])
  const [drawnCount, setDrawnCount] = useState(0)

  // Remplacements dynamiques pour la carte affichée
  const [formattedContent, setFormattedContent] = useState('')
  const [pubOptions, setPubOptions] = useState<{ a: string; b: string } | null>(null)

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
      // En cas de coupure momentanée, on ne bloque pas si déjà vérifié
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
    fetchCarnotzetCards()
      .then(data => {
        setCards(data)
        if (data.length > 0) drawCard(data, [])
      })
      .catch(() => {
        const fallback: Card[] = [
          { id: 1, game: 'carnotzet', category: 'duel', title: 'Bras de Fer', content: "{p1} et {p2} s'affrontent au bras de fer. Le perdant boit {sips} gorgées.", extra: null, sips: 3, min_players: 2 },
          { id: 2, game: 'carnotzet', category: 'regle', title: 'Règle Intendance', content: 'Interdiction de pointer du doigt sous peine de boire {sips} gorgées.', extra: 'durée:3 tours', sips: 1, min_players: 3 },
          { id: 3, game: 'carnotzet', category: 'vote', title: 'Tente oubliée', content: "Votez à main levée : qui est le plus susceptible d'oublier les sardines ? Le désigné boit {sips}.", extra: null, sips: 2, min_players: 3 },
        ]
        setCards(fallback)
        drawCard(fallback, [])
      })
    return () => {
      sendTelemetry((Date.now() - gameStartTime.current) / 1000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 3. Tirage et substitution dynamique ───────────────────────────────────
  function drawCard(deck = cards, rules = activeRules) {
    if (deck.length === 0) return

    // Sélection aléatoire
    const card = deck[Math.floor(Math.random() * deck.length)]
    setCurrentCard(card)
    setCardHistory(h => [card, ...h.slice(0, 19)])
    setDrawnCount(c => c + 1)

    // Joueurs aléatoires
    const pool = players.length >= 2 ? [...players] : [{ id: '1', name: 'Loup Ardent' }, { id: '2', name: 'Faucon Vif' }]
    const shuffledPool = pool.sort(() => Math.random() - 0.5)
    const p1 = shuffledPool[0]?.name || 'Loup Ardent'
    const p2 = shuffledPool[1]?.name || 'Faucon Vif'
    const sips = String(card.sips || 2)

    // Remplacements
    let text = card.content
      .replace(/{p1}/g, p1)
      .replace(/{p2}/g, p2)
      .replace(/{sips}/g, sips)

    setFormattedContent(text)

    // Options pub (A/B)
    if (card.category === 'pub' && card.extra && card.extra.includes('A:') && card.extra.includes('B:')) {
      const parts = card.extra.split('|')
      const a = parts[0]?.replace('A:', '').trim() || ''
      const b = parts[1]?.replace('B:', '').trim() || ''
      setPubOptions({ a, b })
    } else {
      setPubOptions(null)
    }

    // Gestion des règles actives (décrémenter + ajouter si nouvelle règle)
    const updatedRules: ActiveRule[] = rules
      .map(r => ({ ...r, remainingTurns: r.remainingTurns - 1 }))
      .filter(r => r.remainingTurns > 0)

    if (card.category === 'regle' && card.extra && card.extra.includes('durée:')) {
      const match = card.extra.match(/durée:(\d+)/)
      const turns = match ? parseInt(match[1], 10) : 3
      updatedRules.push({
        id: 'rule_' + Date.now(),
        title: card.title || 'Règle spéciale',
        content: text,
        remainingTurns: turns,
      })
    }

    setActiveRules(updatedRules)
  }

  function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) return
    const updated = [...players, { id: 'p_' + Date.now(), name: trimmed }]
    setPlayers(updated)
    savePlayers(updated)
    setNewPlayerName('')
  }

  function handleRemovePlayer(id: string) {
    const updated = players.filter(p => p.id !== id)
    setPlayers(updated)
    savePlayers(updated)
  }

  if (isVerifying) {
    return (
      <div className="app-container bg-[#130e0a] flex items-center justify-center text-scout-amber">
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

  const meta = currentCard ? CATEGORY_META[currentCard.category] : null

  return (
    <div className="app-container bg-gradient-to-b from-[#130e0a] via-[#21140e] to-[#130e0a] text-white">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#130e0a]/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <a href={hubUrl} className="flex items-center gap-2 text-scout-amber hover:text-white transition-colors text-sm">
          <span>←</span>
          <span className="font-semibold">Scout Game</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xl">🍺</span>
          <h1 className="font-display font-bold text-base tracking-wide">Carnotzet</h1>
        </div>
        <button
          onClick={() => setShowPlayerModal(true)}
          className="text-xs px-2.5 py-1 rounded-full bg-scout-amber/20 text-scout-amber border border-scout-amber/30 hover:bg-scout-amber/30 transition-all"
        >
          👥 {players.length} responsables
        </button>
      </header>

      {/* ── Active Rules Bar ──────────────────────────────────────────────── */}
      {activeRules.length > 0 && (
        <div className="px-4 pt-3 max-w-md mx-auto w-full">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-scout-amber">
              <span className="flex items-center gap-1.5">
                <span>📜</span>
                <span>Règles actives en vigueur ({activeRules.length})</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {activeRules.map(r => (
                <div key={r.id} className="text-xs flex items-center justify-between bg-black/30 p-2 rounded-lg">
                  <span className="truncate pr-2 text-gray-200">{r.title}</span>
                  <span className="shrink-0 font-mono font-bold text-scout-amber bg-scout-amber/20 px-2 py-0.5 rounded">
                    {r.remainingTurns} tour{r.remainingTurns > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Card Area ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        {currentCard && meta && (
          <div className="glass-card p-6 min-h-[320px] flex flex-col justify-between border-2 border-white/10 shadow-2xl relative overflow-hidden animate-fade-in">
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${meta.badge}`}>
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </div>
              {currentCard.sips ? (
                <div className="px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-xs font-extrabold text-red-300">
                  🍺 {currentCard.sips} gorgée{currentCard.sips > 1 ? 's' : ''}
                </div>
              ) : null}
            </div>

            {/* Title & Content */}
            <div className="space-y-3 py-4 text-center my-auto">
              {currentCard.title && (
                <h2 className="font-display font-black text-2xl text-white tracking-wide">
                  {currentCard.title}
                </h2>
              )}
              <p className="font-medium text-lg leading-relaxed text-gray-100">
                {formattedContent}
              </p>

              {/* Pub dilemma interactive choice */}
              {pubOptions && (
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <button className="p-3 rounded-xl bg-scout-dark/90 border border-emerald-500/40 hover:bg-emerald-950/40 text-xs font-bold text-left transition-all">
                    🅰️ {pubOptions.a}
                  </button>
                  <button className="p-3 rounded-xl bg-scout-dark/90 border border-amber-500/40 hover:bg-amber-950/40 text-xs font-bold text-left transition-all">
                    🅱️ {pubOptions.b}
                  </button>
                </div>
              )}
            </div>

            {/* Footer card info */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
              <span>Carte #{drawnCount}</span>
              <span>Réservé Maîtrise 🔒</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 flex gap-2">
          {cardHistory.length > 1 && (
            <button
              onClick={() => {
                const prev = cardHistory[1]
                if (prev) {
                  setCurrentCard(prev)
                  setCardHistory(h => h.slice(1))
                }
              }}
              className="btn-ghost py-4 px-4 text-xs font-bold border border-white/10"
              title="Revenir à la carte précédente"
            >
              ↩ Précédente
            </button>
          )}
          <button
            onClick={() => drawCard()}
            className="btn-amber flex-1 py-4 text-base font-black shadow-xl shadow-scout-amber/20 active:scale-95 transition-all"
          >
            🎲 Carte suivante ➔
          </button>
        </div>
      </main>

      {/* ── Player Management Modal ───────────────────────────────────────── */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0" onClick={() => setShowPlayerModal(false)}>
          <div className="glass-card w-full max-w-md rounded-b-none rounded-t-3xl p-6 space-y-4 max-h-[80dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Membres de maîtrise ({players.length})</h3>
              <button onClick={() => setShowPlayerModal(false)} className="btn-ghost py-1 px-3 text-xs">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {players.map(p => (
                <div key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-500/30 text-xs text-white">
                  <span>{p.name}</span>
                  <button onClick={() => handleRemovePlayer(p.id)} className="text-gray-400 hover:text-red-400">×</button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <input
                className="input-scout text-sm py-2"
                placeholder="Totem ou prénom du responsable…"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
              />
              <button type="submit" className="btn-amber py-2 px-4 text-sm">+</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
