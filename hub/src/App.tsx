/**
 * App.tsx
 * Orchestrateur principal de l'application Hub Scout Game.
 *
 * Responsabilités :
 * 1. Interception silencieuse des paramètres ?bootstrap= et ?invite= (section 7.3)
 * 2. Easter egg (long press logo + triple-tap footer) → appel /api/auth/verify
 * 3. Affichage conditionnel : FaceA | BlackoutScreen | ScannerModal | FaceB
 */
import { useEffect, useState } from 'react'
import { FaceA } from './components/FaceA'
import { FaceB } from './components/FaceB'
import { BlackoutScreen } from './components/BlackoutScreen'
import { ScannerModal } from './components/ScannerModal'
import { useDeviceAuth } from './hooks/useDeviceAuth'
import { useEasterEgg } from './hooks/useEasterEgg'
import { apiBootstrap, apiConsumeInvite } from './services/api'

type UIState = 'face-a' | 'verifying' | 'blackout' | 'scanner' | 'face-b'

export default function App() {
  const { saveDevicePass, devicePass, verify, blackoutMessage, logout } = useDeviceAuth()
  const [uiState, setUiState] = useState<UIState>('face-a')

  // ── Section 7.3 — Interception silencieuse ────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bootstrapToken = params.get('bootstrap')
    const inviteToken = params.get('invite')

    if (!bootstrapToken && !inviteToken) return

    // Nettoyer l'URL immédiatement (avant même la réponse API)
    window.history.replaceState({}, document.title, window.location.pathname)

    if (bootstrapToken) {
      apiBootstrap(bootstrapToken)
        .then(data => {
          if (data.device_pass) {
            saveDevicePass(data.device_pass)
            // Auto-reveal Face B after bootstrap
            triggerEasterEgg()
          }
        })
        .catch(() => { /* silencieux */ })
    } else if (inviteToken) {
      apiConsumeInvite(inviteToken)
        .then(data => {
          if (data.device_pass) {
            saveDevicePass(data.device_pass)
            triggerEasterEgg()
          }
        })
        .catch(() => { /* silencieux */ })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const { logoProps, footerProps } = useEasterEgg(triggerEasterEgg)

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleAuthorized(pass: string) {
    saveDevicePass(pass)
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

      {/* Face A is always rendered in background */}
      <FaceA logoProps={logoProps} footerProps={footerProps} />

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

      {uiState === 'face-b' && devicePass() && (
        <FaceB
          devicePass={devicePass()!}
          onClose={() => setUiState('face-a')}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
