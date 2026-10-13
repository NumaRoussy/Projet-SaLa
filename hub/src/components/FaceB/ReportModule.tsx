/**
 * components/FaceB/ReportModule.tsx
 * Formulaire de signalement terrain → POST /api/reports (section 2.3).
 */
import { useState } from 'react'
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
    setForm({ target_device_id: '', reason: '', reporter_name: '', reporter_group: '' })
  }

  return (
    <div className="glass-card p-5 space-y-4 border border-red-900/20">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚨</span>
        <div>
          <h3 className="font-display font-bold text-white">Signaler un appareil</h3>
          <p className="text-xs text-gray-400">Scannez ou saisissez l'ID de l'appareil à signaler</p>
        </div>
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
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              ID de l'appareil cible <span className="text-red-400">*</span>
            </label>
            <input
              required
              className="input-scout font-mono text-sm"
              placeholder="UUID de l'appareil…"
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
              placeholder="Décrivez comment et où vous avez constaté l'accès illégitime…"
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
