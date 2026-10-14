/**
 * components/FaceB/SponsorModule.tsx
 * Module « Parrainer un responsable » — génère un QR code éphémère de 120 secondes
 * (section 2.2 & 7.4).
 */
import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { apiGenerateInvite } from '../../services/api'
import { copyToClipboard } from '../../services/clipboard'

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
    ? `${window.location.origin}/?invite=${inviteToken}`
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
          <h3 className="font-display font-bold text-white">Parrainer un responsable</h3>
          <p className="text-xs text-gray-400">Code valable 120 secondes · Usage unique</p>
        </div>
      </div>

      {/* Avertissement de responsabilisation du parrain (Point 1B) */}
      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5 leading-relaxed">
        <div className="font-bold text-amber-400 flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Parrainage sous ta responsabilité</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-300">
          Ce système sans compte a été choisi pour t'éviter de devoir prouver ton identité de manière contraignante. Ne parraine que des responsables majeurs de confiance : s'il y a des abus ou des fuites vers des mineurs, ta branche sera coupée et nous serons obligés de durcir l'accès ou de fermer définitivement cette partie du site.
        </p>
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

          {/* Code brut d'invitation (pour saisie ou copier-coller) */}
          <div className="p-3 rounded-xl bg-scout-dark border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Code d'invitation :</span>
              <button
                type="button"
                className="text-scout-sage hover:text-white transition-colors flex items-center gap-1 font-semibold text-xs"
                onClick={() => copyToClipboard(inviteToken)}
              >
                <span>📋</span>
                <span>Copier le code</span>
              </button>
            </div>
            <code className="block text-xs font-mono text-scout-sage font-bold tracking-wider select-all break-all">
              {inviteToken}
            </code>
          </div>

          {/* URL (pour partage direct) */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-scout-dark border border-white/10">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Lien direct</div>
              <code className="text-xs text-gray-300 truncate block">{inviteUrl}</code>
            </div>
            <button
              type="button"
              className="shrink-0 btn-ghost text-xs py-1.5 px-2.5 text-gray-300 hover:text-white"
              onClick={() => copyToClipboard(inviteUrl)}
              title="Copier le lien direct"
            >
              📋 Copier
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
