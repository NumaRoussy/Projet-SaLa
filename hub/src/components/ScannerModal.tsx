/**
 * components/ScannerModal.tsx
 * Modal affiché quand l'appareil n'est pas encore autorisé.
 * Démarre directement la caméra (arrière) avec cadre de visée
 * et fallback photo universel pour débloquer l'accès Maîtrise.
 */
import { useState, useRef } from 'react'
import { apiConsumeInvite, apiBootstrap } from '../services/api'
import { OnboardingModal } from './OnboardingModal'
import { CameraQRScanner } from './CameraQRScanner'

interface Props {
  onAuthorized: (devicePass: string) => void
  onClose: () => void
}

interface ParsedToken {
  type: 'bootstrap' | 'invite'
  token: string
}

function parseScannedInput(raw: string): ParsedToken | null {
  const t = raw.trim()
  if (!t) return null

  // 1. Détection Invitation (URL, paramètre invite= ou code brut inv_...)
  if (t.includes('invite=') || t.startsWith('inv_') || t.includes('/inv_')) {
    let clean = t
    if (clean.includes('invite=')) {
      try {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`)
        const inv = url.searchParams.get('invite')
        if (inv) clean = inv.trim()
      } catch {
        const match = clean.match(/invite=([a-zA-Z0-9_-]+)/)
        if (match) clean = match[1].trim()
      }
    } else if (clean.includes('inv_')) {
      clean = 'inv_' + clean.split('inv_')[1]
    }
    // Nettoyer d'éventuels paramètres ou slashes restants
    clean = clean.split(/[?&#/]/)[0].trim()
    return { type: 'invite', token: clean }
  }

  // 2. Détection Amorce / Bootstrap (URL, paramètre bootstrap= ou code brut)
  let cleanBootstrap = t
  if (cleanBootstrap.includes('bootstrap=')) {
    try {
      const url = new URL(cleanBootstrap.startsWith('http') ? cleanBootstrap : `https://${cleanBootstrap}`)
      const b = url.searchParams.get('bootstrap')
      if (b) cleanBootstrap = b.trim()
    } catch {
      const match = cleanBootstrap.match(/bootstrap=([a-zA-Z0-9_-]+)/)
      if (match) cleanBootstrap = match[1].trim()
    }
  } else if (cleanBootstrap.includes('bootstrap_')) {
    cleanBootstrap = 'bootstrap_' + cleanBootstrap.split('bootstrap_')[1]
  }
  cleanBootstrap = cleanBootstrap.split(/[?&#/]/)[0].trim()
  return { type: 'bootstrap', token: cleanBootstrap }
}

export function ScannerModal({ onAuthorized, onClose }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingToken, setPendingToken] = useState<ParsedToken | null>(null)
  const isConsumingRef = useRef(false)

  function consume(rawInput: string) {
    const parsed = parseScannedInput(rawInput)
    if (!parsed || !parsed.token) return
    setPendingToken(parsed)
  }

  async function executeConsume(parsed: ParsedToken) {
    if (isConsumingRef.current) return
    isConsumingRef.current = true
    setPendingToken(null)
    setLoading(true)
    setError('')
    try {
      if (parsed.type === 'invite') {
        const res = await apiConsumeInvite(parsed.token)
        if (res.device_pass) {
          onAuthorized(res.device_pass)
          return
        }
      } else {
        const res = await apiBootstrap(parsed.token)
        if (res.device_pass) {
          onAuthorized(res.device_pass)
          return
        }
      }
      setError('Code invalide ou expiré.')
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Code invalide ou expiré')
    } finally {
      setLoading(false)
      isConsumingRef.current = false
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    consume(code)
  }

  return (
    <div className="overlay flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#162920] w-full max-w-lg rounded-b-none sm:rounded-3xl rounded-t-3xl p-5 sm:p-6 pb-8 max-h-[92dvh] overflow-y-auto border border-[#2d6a4f]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#2d6a4f] rounded-full mx-auto mb-4" />

        <div className="text-center mb-4 space-y-1">
          <h2 className="font-display font-bold text-white text-lg sm:text-xl flex items-center justify-center gap-2">
            <span>🔑</span>
            <span>Accès Espace Maîtrise</span>
          </h2>
          <p className="text-gray-300 text-xs max-w-xs mx-auto leading-relaxed">
            Scannez le QR code d'un responsable parrain (120s) ou d'une amorce AG, ou saisissez le code.
          </p>
        </div>

        <div className="mb-5">
          <CameraQRScanner
            onScan={consume}
            title=""
            subtitle="Pointez la caméra vers le QR code ou utilisez la photo"
            accentColor="amber"
            autoStart={true}
          />
        </div>

        <form onSubmit={handleManualSubmit} className="flex flex-col gap-2.5 pt-3 border-t border-[#2d6a4f]/50">
          <label className="text-xs font-semibold text-gray-300 text-center">
            Ou collez le code / lien d'invitation :
          </label>
          <input
            className="input-scout font-mono text-center tracking-wider text-xs"
            placeholder="inv_... ou bootstrap_..."
            value={code}
            onChange={e => setCode(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {error && <p className="text-red-300 text-xs text-center font-semibold">{error}</p>}
          <button type="submit" disabled={loading || !code.trim()} className="btn-amber py-2.5 text-xs font-bold">
            {loading ? '⏳ Vérification…' : '🔓 Valider le code manuellement'}
          </button>
        </form>

        <button className="btn-ghost w-full mt-3 text-xs text-gray-300 hover:text-white" onClick={onClose}>
          Annuler
        </button>
      </div>

      {pendingToken && (
        <OnboardingModal
          onConfirm={() => executeConsume(pendingToken)}
          onCancel={() => setPendingToken(null)}
        />
      )}
    </div>
  )
}
