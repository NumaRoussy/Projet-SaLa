/**
 * components/FaceB/ReportModule.tsx
 * Formulaire de signalement terrain → POST /api/reports (section 2.3).
 * Intègre un scanner caméra universel (live stream + fallback photo)
 * pour flasher directement le QR code de l'appareil suspect (DeviceQR).
 */
import { useState } from 'react'
import { apiSubmitReport } from '../../services/api'
import { CameraQRScanner } from '../CameraQRScanner'

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
  const [showScanner, setShowScanner] = useState(false)
  const [scanNotice, setScanNotice] = useState('')

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
    setShowScanner(false)
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
    setShowScanner(false)
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
          {/* Bouton d'ouverture du scanner caméra */}
          {!showScanner ? (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="btn-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 border border-scout-amber/40 shadow-lg shadow-black/30"
            >
              <span>📷</span>
              <span>Scanner le QR d'un appareil</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-black/60 border border-red-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <span>📷</span>
                  <span>Scanner l'écran du suspect (Mon QR)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowScanner(false)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/10"
                >
                  ✕ Fermer
                </button>
              </div>

              <CameraQRScanner
                onScan={applyScannedId}
                title=""
                subtitle="Pointez la caméra vers le QR d'identification (onglet Mon QR) ou prenez-le en photo"
                accentColor="red"
                autoStart={true}
              />
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

          <button type="submit" disabled={loading} className="btn-danger w-full py-3 text-sm font-bold shadow-lg shadow-red-950/40">
            {loading ? '⏳ Envoi…' : '🚨 Soumettre le signalement'}
          </button>
        </form>
      )}
    </div>
  )
}
