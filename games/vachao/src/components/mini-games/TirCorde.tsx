import { useState, useEffect, useRef } from 'react'
import type { Player, MiniGameResult } from '../../types'
import { playPing, playVictory } from '../../services/audio'

interface Props {
  player1: Player
  player2: Player
  sips?: number
  onFinish: (result: MiniGameResult) => void
}

export function TirCorde({ player1, player2, sips = 3, onFinish }: Props) {
  // Position from -50 (Player 1 wins) to +50 (Player 2 wins)
  const [position, setPosition] = useState<number>(0)
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'finished'>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [winner, setWinner] = useState<Player | null>(null)
  const [loser, setLoser] = useState<Player | null>(null)

  const posRef = useRef<number>(0)
  const animRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Countdown
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(c => c - 1), 750)
        return () => clearTimeout(t)
      } else {
        setGameState('playing')
      }
    }
  }, [gameState, countdown])

  // Canvas Rope & Neckerchief animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width
      const h = canvas.height
      const midY = h / 2

      // Current rope offset (-50 to +50 scaled to canvas height)
      const currentOffset = (posRef.current / 50) * (h * 0.35)
      const knotY = midY + currentOffset

      // Boundary lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      // Top boundary (P1 win)
      ctx.beginPath()
      ctx.moveTo(0, midY - h * 0.35)
      ctx.lineTo(w, midY - h * 0.35)
      ctx.stroke()
      // Bottom boundary (P2 win)
      ctx.beginPath()
      ctx.moveTo(0, midY + h * 0.35)
      ctx.lineTo(w, midY + h * 0.35)
      ctx.stroke()
      ctx.setLineDash([])

      // Rope line (hemp color)
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.quadraticCurveTo(w / 2 + Math.sin(Date.now() / 150) * 8, knotY, w / 2, h)
      ctx.strokeStyle = '#d4a373'
      ctx.lineWidth = 14
      ctx.lineCap = 'round'
      ctx.stroke()

      // Braided details
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.quadraticCurveTo(w / 2 + Math.sin(Date.now() / 150) * 8, knotY, w / 2, h)
      ctx.strokeStyle = '#b08968'
      ctx.lineWidth = 4
      ctx.stroke()

      // Foulard scout (Neckerchief knot at knotY)
      // Triangle knot
      ctx.fillStyle = '#ef4444' // Foulard rouge vif
      ctx.beginPath()
      ctx.moveTo(w / 2 - 18, knotY - 14)
      ctx.lineTo(w / 2 + 18, knotY - 14)
      ctx.lineTo(w / 2, knotY + 18)
      ctx.closePath()
      ctx.fill()

      // Bague de foulard (woggle)
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(w / 2 - 8, knotY - 6, 16, 8)

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Handle tap for P1 (pulls towards -50)
  const handleP1Tap = () => {
    if (gameState !== 'playing') return
    playPing(900, 0.05)
    posRef.current = Math.max(-50, posRef.current - 2.8)
    setPosition(posRef.current)
    checkWin()
  }

  // Handle tap for P2 (pulls towards +50)
  const handleP2Tap = () => {
    if (gameState !== 'playing') return
    playPing(700, 0.05)
    posRef.current = Math.min(50, posRef.current + 2.8)
    setPosition(posRef.current)
    checkWin()
  }

  const checkWin = () => {
    if (posRef.current <= -45) {
      setGameState('finished')
      setWinner(player1)
      setLoser(player2)
      playVictory()
    } else if (posRef.current >= 45) {
      setGameState('finished')
      setWinner(player2)
      setLoser(player1)
      playVictory()
    }
  }

  const handleConfirm = () => {
    if (!winner || !loser) return
    onFinish({
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      sips,
      details: `${winner.name} arrache le foulard scout au Tir à la Corde !`,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0e1722] select-none flex flex-col touch-none overflow-hidden">
      {/* Canvas Corde */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Moitié P1 (Haut) */}
      <div
        onPointerDown={handleP1Tap}
        className="relative z-20 flex-1 flex flex-col items-center justify-between p-4 bg-[#0e1722] active:bg-[#152233] border-b border-[#28527a] cursor-pointer"
      >
        <div className="rotate-180 flex flex-col items-center gap-1">
          <span className="text-3xl">{player1.avatar || '⛺'}</span>
          <span className="font-display font-black text-xl text-[#f3f4f6]">{player1.name}</span>
          <span className="text-[11px] text-sky-300 font-bold uppercase tracking-wider">
            TAPPEZ FRÉNÉTIQUEMENT ICI !
          </span>
        </div>
        <div className="rotate-180 text-xs font-mono text-sky-300">
          Avance : {Math.max(0, -Math.round(position))}%
        </div>
      </div>

      {/* Ligne médiane / Statut */}
      <div className="relative z-30 h-14 bg-[#152233] flex items-center justify-center border-y border-[#28527a] px-3">
        {gameState === 'countdown' && (
          <span className="text-3xl font-black text-amber-300">{countdown}</span>
        )}
        {gameState === 'playing' && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              TIR À LA CORDE — MARTÈLE TON CÔTÉ !
            </span>
          </div>
        )}
        {gameState === 'finished' && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-amber-300">
              🏆 {winner?.name} GAGNE ! {loser?.name} prend {sips} gorgées
            </span>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 bg-[#32689c] hover:bg-[#3c7ab5] border border-[#28527a] text-[#f3f4f6] font-bold text-xs rounded-full transition-colors"
            >
              Continuer →
            </button>
          </div>
        )}
      </div>

      {/* Moitié P2 (Bas) */}
      <div
        onPointerDown={handleP2Tap}
        className="relative z-20 flex-1 flex flex-col items-center justify-between p-4 bg-[#121a26] active:bg-[#1a2636] border-t border-[#28527a] cursor-pointer"
      >
        <div className="text-xs font-mono text-amber-300">
          Avance : {Math.max(0, Math.round(position))}%
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">
            TAPPEZ FRÉNÉTIQUEMENT ICI !
          </span>
          <span className="font-display font-black text-xl text-[#f3f4f6]">{player2.name}</span>
          <span className="text-3xl">{player2.avatar || '🪵'}</span>
        </div>
      </div>
    </div>
  )
}
