import { useState, useEffect, useRef } from 'react'
import type { Player, MiniGameResult } from '../../types'
import { playPing, playBuzzer, playVictory } from '../../services/audio'

interface Props {
  player1: Player
  player2: Player
  sips?: number
  onFinish: (result: MiniGameResult) => void
}

type GameState = 'countdown' | 'waiting' | 'ready' | 'finished'

export function FlammeBleue({ player1, player2, sips = 2, onFinish }: Props) {
  const [gameState, setGameState] = useState<GameState>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [reactionTimes, setReactionTimes] = useState<{ p1: number | null; p2: number | null }>({ p1: null, p2: null })
  const [faultPlayer, setFaultPlayer] = useState<string | null>(null)
  const [winner, setWinner] = useState<Player | null>(null)
  const [loser, setLoser] = useState<Player | null>(null)

  const triggerTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)

  // Countdown 3, 2, 1 -> waiting
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(c => c - 1), 800)
        return () => clearTimeout(t)
      } else {
        setGameState('waiting')
        // Schedule blue flame between 2.2s and 6.0s
        const delay = 2200 + Math.random() * 3800
        timerRef.current = setTimeout(() => {
          triggerTimeRef.current = performance.now()
          setGameState('ready')
          playPing(1200, 0.3)
        }, delay)
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [gameState, countdown])

  // Embers animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    const embers: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number }> = []
    for (let i = 0; i < 40; i++) {
      embers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1 - Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.8,
      })
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const isBlue = gameState === 'ready' || gameState === 'finished'

      embers.forEach(e => {
        e.x += e.vx
        e.y += e.vy
        e.alpha -= 0.005
        if (e.y < 0 || e.alpha <= 0) {
          e.y = canvas.height
          e.x = Math.random() * canvas.width
          e.alpha = 0.5 + Math.random() * 0.5
        }
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fillStyle = isBlue
          ? `rgba(56, 189, 248, ${e.alpha})`
          : `rgba(249, 115, 22, ${e.alpha})`
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameState])

  const handleTap = (playerId: string) => {
    if (gameState === 'countdown' || gameState === 'finished') return

    // Faux départ
    if (gameState === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setGameState('finished')
      playBuzzer()

      if (playerId === player1.id) {
        setFaultPlayer(player1.name)
        setWinner(player2)
        setLoser(player1)
      } else {
        setFaultPlayer(player2.name)
        setWinner(player1)
        setLoser(player2)
      }
      return
    }

    // Reaction tap
    if (gameState === 'ready') {
      const now = performance.now()
      const diff = Math.round(now - triggerTimeRef.current)

      if (playerId === player1.id && reactionTimes.p1 === null) {
        const nextTimes = { ...reactionTimes, p1: diff }
        setReactionTimes(nextTimes)
        if (nextTimes.p2 === null) {
          // Player 1 tapped first!
          setGameState('finished')
          setWinner(player1)
          setLoser(player2)
          playVictory()
        }
      } else if (playerId === player2.id && reactionTimes.p2 === null) {
        const nextTimes = { ...reactionTimes, p2: diff }
        setReactionTimes(nextTimes)
        if (nextTimes.p1 === null) {
          // Player 2 tapped first!
          setGameState('finished')
          setWinner(player2)
          setLoser(player1)
          playVictory()
        }
      }
    }
  }

  const handleConfirm = () => {
    if (!winner || !loser) return
    const details = faultPlayer
      ? `Faux départ de ${faultPlayer} !`
      : `${winner.name} l'emporte au réflexe !`

    onFinish({
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      sips,
      details,
    })
  }

  const isBlue = gameState === 'ready' || (gameState === 'finished' && !faultPlayer)

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] select-none flex flex-col touch-none overflow-hidden">
      {/* Canvas des braises */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Moitié Joueur 1 (Haut - orienté face à face) */}
      <div
        onPointerDown={() => handleTap(player1.id)}
        className={`relative z-10 flex-1 flex flex-col items-center justify-center p-6 border-b-2 border-white/10 transition-colors duration-200 cursor-pointer ${
          isBlue ? 'bg-cyan-950/40 active:bg-cyan-800/60' : 'bg-orange-950/20 active:bg-orange-900/40'
        }`}
      >
        <div className="rotate-180 flex flex-col items-center gap-2">
          <span className="text-3xl">{player1.avatar || '⛺'}</span>
          <span className="font-display font-black text-xl tracking-wide text-white">{player1.name}</span>
          {reactionTimes.p1 !== null && (
            <span className="text-cyan-300 font-mono text-lg font-bold">{reactionTimes.p1} ms</span>
          )}
          {faultPlayer === player1.name && (
            <span className="text-red-400 font-bold bg-red-950/80 px-3 py-1 rounded-full text-xs animate-bounce">
              FAUX DÉPART ! 🚨
            </span>
          )}
          <span className="text-xs text-gray-400">Touchez ici dès que la flamme devient BLEUE</span>
        </div>
      </div>

      {/* Centre : Flamme & Statut */}
      <div className="relative z-20 h-28 flex items-center justify-center bg-black/60 backdrop-blur-md border-y border-white/10">
        {gameState === 'countdown' && (
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black text-amber-400 animate-pulse">{countdown}</span>
            <span className="text-xs text-gray-400 mt-1">Préparez vos pouces...</span>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-4xl">🔥</span>
            <span className="text-xs font-semibold text-orange-400 mt-1">Attendez le bleu... Ne touchez pas !</span>
          </div>
        )}

        {gameState === 'ready' && (
          <div className="flex flex-col items-center scale-125 transition-transform">
            <span className="text-5xl animate-bounce">⚡🔷⚡</span>
            <span className="text-sm font-black text-cyan-300 tracking-wider">MAINTENANT !</span>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="flex flex-col items-center">
            {faultPlayer ? (
              <span className="text-sm font-black text-red-400 text-center">
                PÉNALITÉ ! {faultPlayer} prend {sips} gorgées
              </span>
            ) : (
              <span className="text-sm font-black text-cyan-300 text-center">
                🏆 {winner?.name} l'emporte ! {loser?.name} boit {sips} gorgées
              </span>
            )}
            <button
              onClick={handleConfirm}
              className="mt-2 px-5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs rounded-full shadow-lg hover:brightness-110 active:scale-95"
            >
              Continuer la veillée →
            </button>
          </div>
        )}
      </div>

      {/* Moitié Joueur 2 (Bas) */}
      <div
        onPointerDown={() => handleTap(player2.id)}
        className={`relative z-10 flex-1 flex flex-col items-center justify-center p-6 border-t-2 border-white/10 transition-colors duration-200 cursor-pointer ${
          isBlue ? 'bg-cyan-950/40 active:bg-cyan-800/60' : 'bg-orange-950/20 active:bg-orange-900/40'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-gray-400">Touchez ici dès que la flamme devient BLEUE</span>
          {faultPlayer === player2.name && (
            <span className="text-red-400 font-bold bg-red-950/80 px-3 py-1 rounded-full text-xs animate-bounce">
              FAUX DÉPART ! 🚨
            </span>
          )}
          {reactionTimes.p2 !== null && (
            <span className="text-cyan-300 font-mono text-lg font-bold">{reactionTimes.p2} ms</span>
          )}
          <span className="font-display font-black text-xl tracking-wide text-white">{player2.name}</span>
          <span className="text-3xl">{player2.avatar || '🪵'}</span>
        </div>
      </div>
    </div>
  )
}
