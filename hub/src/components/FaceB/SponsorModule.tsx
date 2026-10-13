/**
 * components/FaceB/SponsorModule.tsx
 * Module « Parrainer un chef » — génère un QR code éphémère de 120 secondes
 * (section 2.2 & 7.4).
 */
import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { apiGenerateInvite } from '../../services/api'

const INVITE_TTL = 120

interface Props {
  devicePass: string
}

export function SponsorModule({ devicePass }: Props) {
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(INVITE_TTL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const inviteUrl = inviteToken
    ? `${window.location.origin}?invite=${inviteToken}`
    : ''

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await apiGenerateInvite(devicePass)
      setInviteToken(res.invite_token)
      setTimeLeft(INVITE_TTL)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!)
            setInviteToken(null)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const progress = inviteToken ? ((INVITE_TTL - timeLeft) / INVITE_TTL) * 100 : 0

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🤝</span>
        <div>
          <h3 className="font-display font-bold text-white">Parrainer un chef</h3>
          <p className="text-xs text-gray-400">Code valable 120 secondes · Usage unique</p>
        </div>
      </div>

      {!inviteToken ? (
        <button
          className="btn-primary w-full"
          onClick={generate}
          disabled={loading}
        >
          {loading ? '⏳ Génération…' : '📲 Générer un QR code d\'invitation'}
        </button>
      ) : (
        <div className="space-y-3">
          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-2xl">
            <QRCodeSVG
              value={inviteUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#111827"
              level="M"
            />
          </div>

          {/* URL (for sharing) */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-scout-dark border border-white/10">
            <code className="text-xs text-scout-sage flex-1 truncate break-all">{inviteUrl}</code>
            <button
              className="shrink-0 text-xs text-gray-400 hover:text-white transition-colors"
              onClick={() => navigator.clipboard?.writeText(inviteUrl)}
            >
              📋
            </button>
          </div>

          {/* Countdown bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Expiration</span>
              <span className={timeLeft <= 30 ? 'text-red-400 font-bold' : 'text-scout-sage'}>
                {timeLeft}s
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${100 - progress}%`,
                  background: timeLeft > 30
                    ? 'linear-gradient(90deg, #40916c, #74c69d)'
                    : 'linear-gradient(90deg, #e76f51, #f4a261)',
                }}
              />
            </div>
          </div>

          <button className="btn-ghost w-full text-sm" onClick={generate} disabled={loading}>
            🔄 Régénérer
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
