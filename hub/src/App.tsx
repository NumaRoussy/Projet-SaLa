/**
 * App.tsx
 * Orchestrateur principal de l'application Hub Scout Game.
 *
 * Responsabilités :
 * 1. Interception silencieuse des paramètres ?bootstrap= et ?invite= (section 7.3)
 * 2. Easter egg (triple-tap footer ©) → appel /api/auth/verify
 * 3. Affichage conditionnel : FaceA | BlackoutScreen | ScannerModal | FaceB
 */
import { useEffect, useState, useRef } from 'react'
import { FaceA } from './components/FaceA'
import { FaceB } from './components/FaceB'
import { BlackoutScreen } from './components/BlackoutScreen'
import { ScannerModal } from './components/ScannerModal'
import { AdminConsole } from './components/Admin'
import { OnboardingModal } from './components/OnboardingModal'
import { useDeviceAuth } from './hooks/useDeviceAuth'
import { useEasterEgg } from './hooks/useEasterEgg'
import { apiBootstrap, apiConsumeInvite } from './services/api'

type UIState = 'face-a' | 'verifying' | 'blackout' | 'scanner' | 'face-b' | 'admin'

export default function App() {
  const { saveDevicePass, devicePass, verify, blackoutMessage, logout } = useDeviceAuth()
  const [uiState, setUiState] = useState<UIState>('face-a')
  const [pendingAccess, setPendingAccess] = useState<{ type: 'bootstrap' | 'invite'; token: string } | null>(null)
  const isConsumingRef = useRef(false)

  // ── Section 7.3 — Interception silencieuse & Admin ───────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === '1') {
      setUiState('admin')
      return
    }

    const bootstrapToken = params.get('bootstrap')
    const inviteToken = params.get('invite')

    if (!bootstrapToken && !inviteToken) return

    // Nettoyer l'URL immédiatement (avant même la réponse API)
    window.history.replaceState({}, document.title, window.location.pathname)

    if (inviteToken) {
      setPendingAccess({ type: 'invite', token: inviteToken.trim() })
    } else if (bootstrapToken) {
      setPendingAccess({ type: 'bootstrap', token: bootstrapToken.trim() })
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [uiState])

  const [accessError, setAccessError] = useState<string | null>(null)

  async function handleConfirmAge() {
    if (!pendingAccess || isConsumingRef.current) return
    isConsumingRef.current = true
    const { type, token } = pendingAccess
    setPendingAccess(null)
    setUiState('verifying')
    setAccessError(null)

    try {
      if (type === 'bootstrap') {
        let clean = token.trim()
        if (clean.includes('bootstrap=')) {
          clean = clean.split('bootstrap=')[1].split('&')[0].trim()
        }
        const data = await apiBootstrap(clean)
        if (data.device_pass) {
          saveDevicePass(data.device_pass)
          try {
            localStorage.setItem('scout_faceb_guide_seen', 'true')
          } catch {}
          setUiState('face-b')
        } else {
          setAccessError("Ce lien d'amorce est expiré, a déjà été utilisé ou est invalide.")
          setUiState('face-a')
        }
      } else {
        let clean = token.trim()
        if (clean.includes('invite=')) {
          clean = clean.split('invite=')[1].split('&')[0].trim()
        }
        if (clean.includes('inv_')) {
          clean = 'inv_' + clean.split('inv_')[1].split(/[?&#/]/)[0].trim()
        }
        const data = await apiConsumeInvite(clean)
        if (data.device_pass) {
          saveDevicePass(data.device_pass)
          try {
            localStorage.setItem('scout_faceb_guide_seen', 'true')
          } catch {}
          setUiState('face-b')
        } else {
          setAccessError("Ce QR code d'invitation est expiré (> 120s) ou a déjà été utilisé.")
          setUiState('face-a')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'activation de l'accès."
      setAccessError(
        msg.includes('403') || msg.toLowerCase().includes('invalide') || msg.toLowerCase().includes('expire')
          ? "Accès refusé : ce jeton est expiré, déjà consommé ou non reconnu."
          : `Erreur d'accès : ${msg}`
      )
      setUiState('face-a')
    } finally {
      isConsumingRef.current = false
    }
  }

  // ── Easter egg handler ────────────────────────────────────────────────────
  async function triggerEasterEgg() {
    setUiState('verifying')
    const state = await verify()
    if (state === 'blackout') {
      setUiState('blackout')
    } else if (state === 'authorized') {
      setUiState('face-b')
    } else {
      setUiState('scanner')
    }
  }

  const { footerProps } = useEasterEgg(triggerEasterEgg)

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleAuthorized(pass: string) {
    saveDevicePass(pass)
    try {
      localStorage.setItem('scout_faceb_guide_seen', 'true')
    } catch {}
    setUiState('face-b')
  }

  function handleLogout() {
    logout()
    setUiState('face-a')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Verifying overlay (brief) */}
      {uiState === 'verifying' && (
        <div className="overlay flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-scout-sage">
            <div className="w-8 h-8 border-2 border-scout-sage/30 border-t-scout-sage rounded-full animate-spin" />
            <span className="text-sm">Vérification…</span>
          </div>
        </div>
      )}

      {/* Main View: Full-page Face B when unlocked, otherwise Face A */}
      {uiState === 'face-b' && devicePass() ? (
        <FaceB
          devicePass={devicePass()!}
          onClose={() => setUiState('face-a')}
          onLogout={handleLogout}
        />
      ) : (
        <FaceA footerProps={footerProps} />
      )}

      {/* Conditional overlays */}
      {uiState === 'blackout' && (
        <BlackoutScreen
          message={blackoutMessage}
          onClose={() => setUiState('face-a')}
        />
      )}

      {uiState === 'scanner' && (
        <ScannerModal
          onAuthorized={handleAuthorized}
          onClose={() => setUiState('face-a')}
        />
      )}

      {uiState === 'admin' && (
        <AdminConsole onClose={() => setUiState('face-a')} />
      )}

      {pendingAccess && (
        <OnboardingModal
          onConfirm={handleConfirmAge}
          onCancel={() => setPendingAccess(null)}
        />
      )}

      {accessError && (
        <div className="overlay flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 text-center border border-red-500/40 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center text-2xl">
              ❌
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-white text-base">Accès non autorisé</h3>
              <p className="text-xs text-gray-300 leading-relaxed">{accessError}</p>
            </div>
            <button
              onClick={() => setAccessError(null)}
              className="btn-ghost w-full py-2 text-xs border border-white/20 text-white font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
