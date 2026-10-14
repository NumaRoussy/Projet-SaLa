/**
 * components/ScannerModal.tsx
 * Modal affiché quand l'appareil n'est pas encore autorisé.
 * Permet de saisir un code d'invitation reçu d'un responsable parrain.
 * (Section 2.2 — P2P Ephemeral QR Code)
 */
import { useState, useRef, useEffect } from 'react'
import { apiConsumeInvite } from '../services/api'
import { AgeConfirmationModal } from './AgeConfirmationModal'

interface Props {
  onAuthorized: (devicePass: string) => void
  onClose: () => void
}

function extractToken(raw: string): string {
  let t = raw.trim()
  if (t.includes('invite=')) {
    try {
      const url = new URL(t.startsWith('http') ? t : `https://${t}`)
      t = url.searchParams.get('invite') || t
    } catch {
      const match = t.match(/invite=([a-zA-Z0-9_-]+)/)
      if (match) t = match[1]
    }
  }
  return t
}

export function ScannerModal({ onAuthorized, onClose }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  function consume(rawInput: string) {
    const token = extractToken(rawInput)
    if (!token) return
    stopCamera()
    setPendingToken(token)
  }

  async function executeConsume(token: string) {
    setPendingToken(null)
    setLoading(true)
    setError('')
    try {
      const res = await apiConsumeInvite(token)
      if (res.device_pass) {
        onAuthorized(res.device_pass)
      } else {
        setError('Code invalide ou expiré.')
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Code invalide ou expiré (>120s)')
    } finally {
      setLoading(false)
    }
  }

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setCameraActive(true)

      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch {
            // autoplays allowed
          }
        }

        // @ts-expect-error BarcodeDetector can exist on window in Chromium
        if (typeof window.BarcodeDetector !== 'undefined') {
          // @ts-expect-error BarcodeDetector
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                stopCamera()
                consume(barcodes[0].rawValue)
              }
            } catch {
              // frame detection error
            }
          }, 300)
        }
      }, 100)
    } catch {
      setError('Accès caméra indisponible. Utilisez la saisie de code ci-dessous.')
      setCameraActive(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    consume(code)
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  return (
    <div className="overlay flex items-end justify-center p-0" onClick={handleClose}>
      <div
        className="glass-card w-full max-w-lg rounded-b-none rounded-t-3xl p-6 pb-10 animate-slide-up max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <h2 className="font-display font-bold text-white text-xl mb-1 text-center">
          🔑 Accès Maîtrise
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Scannez le QR code éphémère d'un responsable parrain ou saisissez le code.
        </p>

        {/* Camera stream view */}
        {cameraActive ? (
          <div className="mb-5 space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto border-2 border-scout-amber/50 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan target overlay */}
              <div className="absolute inset-8 border-2 border-scout-amber/80 rounded-xl pointer-events-none animate-pulse" />
            </div>
            <p className="text-xs text-center text-gray-400">
              Pointez la caméra vers le QR code d'un responsable parrain
            </p>
            <button className="btn-ghost w-full text-xs text-gray-400" onClick={stopCamera}>
              Arrêter la caméra
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-4">
            {/* Visual illustration */}
            <div className="flex items-center justify-center gap-4 text-3xl">
              <div className="text-center">
                <div className="text-3xl mb-1">📱</div>
                <div className="text-xs text-gray-500">Responsable parrain</div>
              </div>
              <div className="text-gray-600 text-xl">→</div>
              <div className="text-center">
                <div className="text-3xl mb-1">🔗</div>
                <div className="text-xs text-gray-500">QR 120s</div>
              </div>
              <div className="text-gray-600 text-xl">→</div>
              <div className="text-center">
                <div className="text-3xl mb-1">✅</div>
                <div className="text-xs text-gray-500">Accès accordé</div>
              </div>
            </div>

            {typeof navigator !== 'undefined' && navigator.mediaDevices && (
              <button
                type="button"
                onClick={startCamera}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <span>📷</span>
                <span>Ouvrir l'appareil photo</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
          <input
            className="input-scout font-mono text-center tracking-widest text-sm"
            placeholder="Ou collez le code / URL d'invitation…"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus={!cameraActive}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading || !code.trim()} className="btn-amber">
            {loading ? '⏳ Vérification…' : '🔓 Valider le code'}
          </button>
        </form>

        <button className="btn-ghost w-full mt-3 text-sm" onClick={handleClose}>
          Annuler
        </button>
      </div>

      {pendingToken && (
        <AgeConfirmationModal
          onConfirm={() => executeConsume(pendingToken)}
          onCancel={() => setPendingToken(null)}
        />
      )}
    </div>
  )
}
