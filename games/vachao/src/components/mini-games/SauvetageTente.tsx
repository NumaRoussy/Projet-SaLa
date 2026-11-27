import { useState, useEffect, useRef } from 'react'
import type { Player, MiniGameResult } from '../../types'
import { playSlash, playBuzzer, playVictory } from '../../services/audio'

interface Props {
  player1: Player
  player2: Player
  sips?: number
  onFinish: (result: MiniGameResult) => void
}

interface Trunk {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  angle: number
  va: number
  sliced: boolean
  slicedParts?: Array<{ x: number; y: number; vx: number; vy: number; angle: number }>
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
}

export function SauvetageTente({ player1, player2, sips = 2, onFinish }: Props) {
  const [timeLeft, setTimeLeft] = useState(18)
  const [tentHealth, setTentHealth] = useState(100)
  const [scoreP1, setScoreP1] = useState(0)
  const [scoreP2, setScoreP2] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const trunksRef = useRef<Trunk[]>([])
  const particlesRef = useRef<Particle[]>([])
  const trailsRef = useRef<Map<number, Array<{ x: number; y: number; t: number }>>>(new Map())

  const animRef = useRef<number>(0)
  const nextTrunkTimeRef = useRef<number>(0)
  const trunkIdCounter = useRef(1)

  // Timer countdown
  useEffect(() => {
    if (isFinished) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          finishGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isFinished])

  const finishGame = () => {
    setIsFinished(true)
    if (tentHealth <= 0) {
      playBuzzer()
    } else {
      playVictory()
    }
  }

  // Canvas game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width
      const h = canvas.height

      // 1. Background forest ambience
      ctx.fillStyle = '#081118'
      ctx.fillRect(0, 0, w, h)

      // 2. Spawn trunks
      if (!isFinished && time > nextTrunkTimeRef.current) {
        nextTrunkTimeRef.current = time + 700 + Math.random() * 800
        trunksRef.current.push({
          id: trunkIdCounter.current++,
          x: 40 + Math.random() * (w - 80),
          y: -40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 2.5 + Math.random() * 2.2,
          width: 24,
          height: 60 + Math.random() * 30,
          angle: (Math.random() - 0.5) * 0.8,
          va: (Math.random() - 0.5) * 0.05,
          sliced: false,
        })
      }

      // 3. Update & Draw Trunks
      const tentTopY = h - 90
      const tentLeftX = w / 2 - 60
      const tentRightX = w / 2 + 60

      trunksRef.current.forEach(t => {
        if (!t.sliced) {
          t.x += t.vx
          t.y += t.vy
          t.angle += t.va

          // Check if hits tent
          if (t.y + t.height / 2 >= tentTopY && t.x >= tentLeftX && t.x <= tentRightX) {
            t.sliced = true
            setTentHealth(prev => Math.max(0, prev - 18))
            playBuzzer()
            // Spawn debris
            for (let i = 0; i < 15; i++) {
              particlesRef.current.push({
                x: t.x,
                y: t.y,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 5,
                size: 3 + Math.random() * 4,
                alpha: 1,
                color: '#b45309',
              })
            }
          }

          // Draw Trunk (Wood texture with bark rings)
          ctx.save()
          ctx.translate(t.x, t.y)
          ctx.rotate(t.angle)
          ctx.fillStyle = '#78350f'
          ctx.beginPath()
          ctx.roundRect(-t.width / 2, -t.height / 2, t.width, t.height, 4)
          ctx.fill()
          // Inner wood
          ctx.fillStyle = '#92400e'
          ctx.fillRect(-t.width / 4, -t.height / 2 + 4, t.width / 2, t.height - 8)
          ctx.restore()
        } else if (t.slicedParts) {
          // Draw sliced parts flying apart
          t.slicedParts.forEach(p => {
            p.x += p.vx
            p.y += p.vy
            p.angle += 0.1
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.angle)
            ctx.fillStyle = '#92400e'
            ctx.fillRect(-t.width / 2, -t.height / 4, t.width, t.height / 2)
            ctx.restore()
          })
        }
      })

      // Clean off-screen trunks
      trunksRef.current = trunksRef.current.filter(t => t.y < h + 100)

      // 4. Update & Draw Particles (Wood chips)
      particlesRef.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2 // gravity
        p.alpha -= 0.02
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      })
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0)

      // 5. Draw Scout Tent at bottom center
      const tentBaseY = h - 20
      ctx.save()
      // Canadian Spatz tent triangle
      ctx.beginPath()
      ctx.moveTo(w / 2 - 70, tentBaseY)
      ctx.lineTo(w / 2, tentTopY)
      ctx.lineTo(w / 2 + 70, tentBaseY)
      ctx.closePath()
      ctx.fillStyle = tentHealth > 30 ? '#15803d' : '#991b1b' // Green tent canvas or damaged red
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#facc15'
      ctx.stroke()

      // Tent door flap
      ctx.beginPath()
      ctx.moveTo(w / 2, tentTopY)
      ctx.lineTo(w / 2, tentBaseY)
      ctx.strokeStyle = '#052e16'
      ctx.lineWidth = 2
      ctx.stroke()

      // Ground peg lines
      ctx.strokeStyle = '#d4d4d8'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(w / 2, tentTopY)
      ctx.lineTo(w / 2 - 95, tentBaseY)
      ctx.moveTo(w / 2, tentTopY)
      ctx.lineTo(w / 2 + 95, tentBaseY)
      ctx.stroke()
      ctx.restore()

      // 6. Draw Swipe Trails
      const now = performance.now()
      trailsRef.current.forEach((pts, _id) => {
        if (pts.length < 2) return
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y)
        }
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.shadowColor = '#0284c7'
        ctx.shadowBlur = 10
        ctx.stroke()
        ctx.restore()

        // Purge points older than 200ms
        const filtered = pts.filter(p => now - p.t < 200)
        trailsRef.current.set(_id, filtered)
      })

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [isFinished, tentHealth])

  // Touch / Pointer Swipe handling
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    trailsRef.current.set(e.pointerId, [{ x, y, t: performance.now() }])
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pts = trailsRef.current.get(e.pointerId)
    if (!pts) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    pts.push({ x, y, t: performance.now() })

    // Check intersection with any active trunk
    const lastPt = pts[pts.length - 2]
    if (!lastPt) return

    trunksRef.current.forEach(t => {
      if (t.sliced) return
      // Simple bounding box / distance check
      const dist = Math.hypot(t.x - x, t.y - y)
      if (dist < 40) {
        // Cut the trunk!
        t.sliced = true
        t.slicedParts = [
          { x: t.x - 12, y: t.y, vx: -3 - Math.random() * 2, vy: -2, angle: t.angle },
          { x: t.x + 12, y: t.y, vx: 3 + Math.random() * 2, vy: -2, angle: t.angle },
        ]
        playSlash()

        // Attribution: Top half vs bottom half of screen
        const midH = e.currentTarget.clientHeight / 2
        if (y < midH) {
          setScoreP1(s => s + 1)
        } else {
          setScoreP2(s => s + 1)
        }

        // Particle sparks
        for (let i = 0; i < 10; i++) {
          particlesRef.current.push({
            x: t.x,
            y: t.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            size: 2 + Math.random() * 3,
            alpha: 1,
            color: '#f59e0b',
          })
        }
      }
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    trailsRef.current.delete(e.pointerId)
  }

  const handleConfirm = () => {
    let details = ''
    let winnerId: string | null = null
    let loserId: string | null = null
    let winnerName = ''
    let loserName = ''

    if (tentHealth <= 0) {
      details = `La tente a été écrasée ! L'intendant est furieux : les deux chefs boivent ${sips} gorgées.`
      winnerName = 'Intendant'
      loserName = `${player1.name} & ${player2.name}`
    } else {
      if (scoreP1 >= scoreP2) {
        winnerId = player1.id
        loserId = player2.id
        winnerName = player1.name
        loserName = player2.name
      } else {
        winnerId = player2.id
        loserId = player1.id
        winnerName = player2.name
        loserName = player1.name
      }
      details = `Tente sauvée (${tentHealth}% pv) ! ${winnerName} a détruit le plus de troncs.`
    }

    onFinish({
      winnerId,
      loserId,
      winnerName,
      loserName,
      sips,
      details,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#16181d] select-none flex flex-col touch-none overflow-hidden">
      {/* HUD Header */}
      <div className="relative z-20 px-4 py-2 bg-[#1f2229] border-b border-[#2d6394] flex items-center justify-between">
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-mono">État de la Tente</div>
          <div className="w-24 h-2.5 bg-[#16181d] rounded-full overflow-hidden border border-[#2e323c] mt-0.5">
            <div
              className={`h-full transition-all duration-300 ${
                tentHealth > 50 ? 'bg-[#2e6f56]' : tentHealth > 20 ? 'bg-[#b5892e]' : 'bg-[#9b2c37]'
              }`}
              style={{ width: `${tentHealth}%` }}
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Temps Restant</div>
          <div className="text-lg font-black font-mono text-[#8ec2eb]">{timeLeft}s</div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#8ec2eb] font-bold">{player1.name}: {scoreP1}</span>
          <span className="text-[#e5be6d] font-bold">{player2.name}: {scoreP2}</span>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full cursor-crosshair"
        />

        {/* Modal Fin de Manche */}
        {isFinished && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-30">
            <div className="bg-[#1f2229] border border-[#2d6394] rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
              <h2 className="font-display font-black text-xl text-[#f3f4f6]">
                {tentHealth > 0 ? 'Tente Sauvée !' : 'Tente Écrasée !'}
              </h2>
              <p className="text-sm text-slate-300">
                {tentHealth > 0
                  ? scoreP1 >= scoreP2
                    ? `${player1.name} a dévié le plus de troncs (${scoreP1} vs ${scoreP2}). ${player2.name} boit ${sips} gorgées !`
                    : `${player2.name} a dévié le plus de troncs (${scoreP2} vs ${scoreP1}). ${player1.name} boit ${sips} gorgées !`
                  : `L'intendant vous fusille du regard. ${player1.name} et ${player2.name} prennent chacun ${sips} gorgées !`}
              </p>
              <button
                onClick={handleConfirm}
                className="btn-primary w-full"
              >
                Continuer la veillée →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guide Swipe */}
      {!isFinished && (
        <div className="relative z-20 py-1.5 text-center bg-[#1f2229] text-[11px] text-slate-400 border-t border-[#2e323c]">
          Balayez l'écran au doigt pour trancher les troncs avant qu'ils ne touchent la tente !
        </div>
      )}
    </div>
  )
}
