/**
 * components/FaceB/ReportModule.tsx
 * Formulaire de signalement terrain → POST /api/reports (section 2.3).
 * Intègre un scanner caméra pour flasher directement le QR code de l'appareil suspect (DeviceQR).
 */
import { useState, useRef, useEffect } from 'react'
import { apiSubmitReport } from '../../services/api'

export function ReportModule() {
  const [form, setForm] = useState({
    target_device_id: '',
    reason: '',
    reporter_name: '',
    reporter_group: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [scanNotice, setScanNotice] = useState('')

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

  function applyScannedId(rawVal: string) {
    let cleanId = rawVal.trim()
    if (cleanId.includes('/')) {
      cleanId = cleanId.split('/').pop() || cleanId
    }
    if (cleanId.includes('=')) {
      cleanId = cleanId.split('=').pop() || cleanId
    }
    setForm(f => ({ ...f, target_device_id: cleanId }))
    setScanNotice(`Appareil flashé : ${cleanId}`)
    stopCamera()
  }

  async function startCamera() {
    setError('')
    setScanNotice('')
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

        // @ts-expect-error BarcodeDetector
        if (typeof window.BarcodeDetector !== 'undefined') {
          // @ts-expect-error BarcodeDetector
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                applyScannedId(barcodes[0].rawValue)
              }
            } catch {
              // ignore frame error
            }
          }, 300)
        }
      }, 100)
    } catch {
      setError("Accès caméra indisponible ou refusé. Vous pouvez saisir l'ID manuellement.")
      setCameraActive(false)
    }
  }

  const handle = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.target_device_id.trim() || !form.reason.trim()) return
    setLoading(true)
    setError('')
    try {
      await apiSubmitReport({
        target_device_id: form.target_device_id.trim(),
        reason: form.reason.trim(),
        reporter_name: form.reporter_name.trim() || undefined,
        reporter_group: form.reporter_group.trim() || undefined,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSuccess(false)
    setScanNotice('')
    setForm({ target_device_id: '', reason: '', reporter_name: '', reporter_group: '' })
  }

  return (
    <div className="glass-card p-5 space-y-4 border border-red-900/20">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚨</span>
        <div>
          <h3 className="font-display font-bold text-white">Signaler un appareil</h3>
          <p className="text-xs text-gray-400">Scannez le QR de l'appareil suspect ou saisissez son identifiant</p>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 space-y-1 leading-relaxed">
        <div className="font-bold text-amber-400 flex items-center gap-1.5">
          <span>💡</span>
          <span>Astuce de protection de l'arbre</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-300">
          Pas besoin d'intervenir sur le téléphone du jeune : vous pouvez aussi scanner directement le QR du responsable à l'origine de la fuite pour couper toute sa sous-branche, puis lui redonner un accès neuf par la suite.
        </p>
      </div>

      {success ? (
        <div className="text-center py-4 space-y-3">
          <div className="text-4xl">📨</div>
          <p className="text-scout-sage font-semibold text-sm">
            Signalement transmis à l'administrateur
          </p>
          <p className="text-gray-500 text-xs">
            L'accès sera coupé après validation. Merci pour votre vigilance.
          </p>
          <button className="btn-ghost text-sm" onClick={reset}>Nouveau signalement</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Scanner view */}
          {cameraActive ? (
            <div className="space-y-2 p-3 bg-black/40 rounded-2xl border border-red-500/30">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-xs mx-auto border-2 border-red-400/60 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-4 border-2 border-red-400/80 rounded-lg pointer-events-none animate-pulse" />
              </div>
              <p className="text-xs text-center text-gray-400">
                Visez le QR code affiché sur l'appareil à signaler (onglet Mon QR)
              </p>
              <button
                type="button"
                className="btn-ghost w-full text-xs text-gray-400"
                onClick={stopCamera}
              >
                Arrêter le scanner
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-scout-dark/60 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>📷</span>
                <span>Flasher l'écran du suspect</span>
              </div>
              {typeof navigator !== 'undefined' && navigator.mediaDevices && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  Ouvrir le scanner
                </button>
              )}
            </div>
          )}

          {scanNotice && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-scout-green/20 border border-scout-mid/40 text-xs text-scout-sage">
              <span>✅</span>
              <span className="font-mono truncate">{scanNotice}</span>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              ID de l'appareil cible <span className="text-red-400">*</span>
            </label>
            <input
              required
              className="input-scout font-mono text-sm"
              placeholder="UUID de l'appareil (ex: 90d0aa16-...)"
              value={form.target_device_id}
              onChange={handle('target_device_id')}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Circonstances du constat <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              className="input-scout min-h-[80px] resize-none text-sm"
              placeholder="Décrivez où et comment vous avez constaté l'accès illégitime…"
              value={form.reason}
              onChange={handle('reason')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Votre nom (opt.)</label>
              <input className="input-scout text-sm" placeholder="Prénom Nom" value={form.reporter_name} onChange={handle('reporter_name')} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Votre groupe (opt.)</label>
              <input className="input-scout text-sm" placeholder="Troupe 1" value={form.reporter_group} onChange={handle('reporter_group')} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-danger w-full">
            {loading ? '⏳ Envoi…' : '🚨 Soumettre le signalement'}
          </button>
        </form>
      )}
    </div>
  )
}
