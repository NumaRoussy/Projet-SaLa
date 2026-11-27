/**
 * components/FaceB/SponsorModule.tsx
 * Module « Parrainer un responsable » : génère un QR code éphémère de 120 secondes.
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
    <div className="bg-[#1f2229] border border-[#2e323c] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-display font-bold text-[#f3f4f6]">Parrainer un responsable</h3>
        <p className="text-xs text-slate-400">Code valable 120 secondes · Usage unique</p>
      </div>

      {/* Avertissement de responsabilisation du parrain */}
      <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#9b2c37] text-xs text-slate-200 space-y-1.5 leading-relaxed">
        <div className="font-bold text-[#e88c95]">
          Parrainage sous ta responsabilité
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          Ce système sans compte a été choisi pour t'éviter de devoir prouver ton identité de manière contraignante. Ne parraine que des responsables majeurs de confiance : s'il y a des abus ou des fuites vers des mineurs, ta branche sera coupée et nous serons obligés de durcir l'accès ou de fermer définitivement cette partie du site.
        </p>
      </div>

      {!inviteToken ? (
        <button
          className="btn-danger w-full"
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Génération…' : "Générer un QR code d'invitation"}
        </button>
      ) : (
        <div className="space-y-3">
          {/* QR Code */}
          <div className="flex justify-center p-4 bg-[#f3f4f6] rounded-2xl border border-[#2e323c]">
            <QRCodeSVG
              value={inviteUrl}
              size={200}
              bgColor="#f3f4f6"
              fgColor="#111827"
              level="M"
            />
          </div>

          {/* Code brut d'invitation */}
          <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Code d'invitation :</span>
              <button
                type="button"
                className="text-[#e5be6d] hover:text-[#f3f4f6] transition-colors font-semibold text-xs"
                onClick={() => copyToClipboard(inviteToken)}
              >
                Copier le code
              </button>
            </div>
            <code className="block text-xs font-mono text-[#e5be6d] font-bold tracking-wider select-all break-all">
              {inviteToken}
            </code>
          </div>

          {/* URL */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#16181d] border border-[#2e323c]">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Lien direct</div>
              <code className="text-xs text-slate-300 truncate block">{inviteUrl}</code>
            </div>
            <button
              type="button"
              className="shrink-0 btn-ghost text-xs py-1.5 px-2.5 text-slate-300 hover:text-[#f3f4f6]"
              onClick={() => copyToClipboard(inviteUrl)}
              title="Copier le lien direct"
            >
              Copier
            </button>
          </div>

          {/* Countdown bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Expiration</span>
              <span className={timeLeft <= 30 ? 'text-red-300 font-bold' : 'text-[#e5be6d]'}>
                {timeLeft}s
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#16181d] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${100 - progress}%`,
                  backgroundColor: timeLeft > 30 ? '#b5892e' : '#9b2c37',
                }}
              />
            </div>
          </div>

          <button className="btn-ghost w-full text-sm" onClick={generate} disabled={loading}>
            Régénérer
          </button>
        </div>
      )}

      {error && <p className="text-red-300 text-sm">{error}</p>}
    </div>
  )
}
