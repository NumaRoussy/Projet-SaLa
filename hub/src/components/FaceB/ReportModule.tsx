/**
 * components/FaceB/ReportModule.tsx
 * Formulaire de signalement terrain → POST /api/reports.
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
    <div className="bg-[#1f2229] border border-[#9b2c37] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-display font-bold text-[#f3f4f6]">Signaler un appareil</h3>
        <p className="text-xs text-slate-400">Scannez le QR de l'appareil suspect ou saisissez son identifiant</p>
      </div>

      <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-slate-200 space-y-1 leading-relaxed">
        <div className="font-bold text-[#e5be6d]">
          Astuce de protection de l'arbre
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          Pas besoin d'intervenir sur le téléphone du jeune : vous pouvez aussi scanner directement le QR du responsable à l'origine de la fuite pour couper toute sa sous-branche, puis lui redonner un accès neuf par la suite.
        </p>
      </div>

      {success ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-emerald-300 font-semibold text-sm">
            Signalement transmis à l'administrateur
          </p>
          <p className="text-slate-400 text-xs">
            L'accès sera coupé après validation. Merci pour votre vigilance.
          </p>
          <button className="btn-ghost text-sm" onClick={reset}>Nouveau signalement</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {!showScanner ? (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full py-3 px-5 rounded-lg bg-[#16181d] hover:bg-[#262a33] border border-[#9b2c37] text-[#f3f4f6] text-xs font-semibold transition-colors"
            >
              Scanner le QR d'un appareil
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#9b2c37] space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#2e323c]">
                <span className="text-xs font-bold text-[#e88c95]">
                  Scanner l'écran du suspect (Mon QR)
                </span>
                <button
                  type="button"
                  onClick={() => setShowScanner(false)}
                  className="text-slate-300 hover:text-[#f3f4f6] text-xs px-2 py-0.5 rounded bg-[#1f2229] border border-[#2e323c]"
                >
                  Fermer
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
            <div className="p-2.5 rounded-lg bg-[#16181d] border border-[#2e6f56] text-xs text-emerald-300 font-mono truncate">
              {scanNotice}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">
              ID de l'appareil cible <span className="text-red-400">*</span>
            </label>
            <input
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#16181d] border border-[#2e323c] text-[#f3f4f6] placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-[#9b2c37]"
              placeholder="UUID de l'appareil (ex: 90d0aa16-...)"
              value={form.target_device_id}
              onChange={handle('target_device_id')}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">
              Circonstances du constat <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#16181d] border border-[#2e323c] text-[#f3f4f6] placeholder-slate-400 min-h-[80px] resize-none text-sm focus:outline-none focus:border-[#9b2c37]"
              placeholder="Décrivez où et comment vous avez constaté l'accès illégitime…"
              value={form.reason}
              onChange={handle('reason')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Votre nom (opt.)</label>
              <input className="w-full px-3.5 py-2.5 rounded-lg bg-[#16181d] border border-[#2e323c] text-[#f3f4f6] placeholder-slate-400 text-sm focus:outline-none focus:border-[#9b2c37]" placeholder="Prénom Nom" value={form.reporter_name} onChange={handle('reporter_name')} />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Votre groupe (opt.)</label>
              <input className="w-full px-3.5 py-2.5 rounded-lg bg-[#16181d] border border-[#2e323c] text-[#f3f4f6] placeholder-slate-400 text-sm focus:outline-none focus:border-[#9b2c37]" placeholder="Troupe 1" value={form.reporter_group} onChange={handle('reporter_group')} />
            </div>
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-danger w-full">
            {loading ? 'Envoi…' : 'Soumettre le signalement'}
          </button>
        </form>
      )}
    </div>
  )
}
