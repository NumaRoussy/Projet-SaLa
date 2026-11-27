/**
 * components/OnboardingModal.tsx
 * Tunnel d'onboarding Face B séquentiel strict en 3 étapes :
 * 1. Vérification de majorité (18+) avec confirmation obligatoire
 * 2. Apprentissage du Geste Secret (triple-tap footer ©)
 * 3. Charte de fonctionnement & Déverrouillage final
 */
import { useState, useRef, useEffect } from 'react'

interface Props {
  onConfirm: () => void
  onCancel: () => void
}

export function OnboardingModal({ onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false)
  const [acceptedCharter, setAcceptedCharter] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [userTaps, setUserTaps] = useState(0)
  const [userUnlocked, setUserUnlocked] = useState(false)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const userTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (userTapTimer.current) clearTimeout(userTapTimer.current)
    }
  }, [])

  function handleUserPracticeTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rippleId = Date.now() + Math.random()

    setRipples(prev => [...prev.slice(-4), { id: rippleId, x, y }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId))
    }, 700)

    try {
      navigator.vibrate?.(50)
    } catch {
      // Ignorer si indisponible
    }

    if (userTapTimer.current) clearTimeout(userTapTimer.current)

    const nextCount = userTaps + 1
    if (nextCount >= 3) {
      setUserTaps(3)
      setUserUnlocked(true)
      userTapTimer.current = setTimeout(() => {
        setUserTaps(0)
      }, 2500)
    } else {
      setUserTaps(nextCount)
      userTapTimer.current = setTimeout(() => {
        setUserTaps(0)
      }, 900)
    }
  }

  function handleFinalSubmit() {
    if (isSubmitting || !acceptedCharter) return
    setIsSubmitting(true)
    try {
      localStorage.setItem('scout_faceb_guide_seen', 'true')
    } catch {
      // Safari Private Browsing
    }
    onConfirm()
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="overlay flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div
        className="bg-[#1f2229] w-full max-w-lg rounded-b-none sm:rounded-3xl rounded-t-3xl p-5 sm:p-6 pb-7 space-y-4 max-h-[94dvh] overflow-y-auto border border-[#2e323c]"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-[#2e323c] rounded-full mx-auto sm:hidden" />

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between gap-1 px-1 pt-1 pb-1">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              step >= 1 ? 'text-[#f1f5f9]' : 'text-[#94a3b8]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step > 1
                  ? 'bg-[#9b2c37] text-[#f1f5f9]'
                  : 'bg-[#16181d] text-[#f1f5f9] border border-[#9b2c37]'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span className="hidden sm:inline">Majorité</span>
          </div>

          <div
            className={`h-0.5 flex-1 mx-1.5 rounded-full transition-colors ${
              step >= 2 ? 'bg-[#9b2c37]' : 'bg-[#2e323c]'
            }`}
          />

          <div
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              step >= 2 ? 'text-[#f1f5f9]' : 'text-[#94a3b8]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step > 2
                  ? 'bg-[#9b2c37] text-[#f1f5f9]'
                  : step === 2
                  ? 'bg-[#16181d] text-[#f1f5f9] border border-[#9b2c37]'
                  : 'bg-[#16181d] text-[#94a3b8] border border-[#2e323c]'
              }`}
            >
              {step > 2 ? '✓' : '2'}
            </span>
            <span>Geste Secret</span>
          </div>

          <div
            className={`h-0.5 flex-1 mx-1.5 rounded-full transition-colors ${
              step >= 3 ? 'bg-[#9b2c37]' : 'bg-[#2e323c]'
            }`}
          />

          <div
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              step === 3 ? 'text-[#f1f5f9]' : 'text-[#94a3b8]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 3
                  ? 'bg-[#16181d] text-[#f1f5f9] border border-[#9b2c37]'
                  : 'bg-[#16181d] text-[#94a3b8] border border-[#2e323c]'
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline">Charte</span>
          </div>
        </div>

        {/* ÉTAPE 1 : VÉRIFICATION DE MAJORITÉ (18+) */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16181d] text-[#94a3b8] text-[11px] font-semibold border border-[#2e323c]">
                <span>Étape 1 sur 3 : Majorité requise (18+)</span>
              </div>
              <h2 className="font-display font-bold text-[#f1f5f9] text-xl pb-1 border-b border-[#9b2c37] inline-block px-3">
                Vérification de majorité (18+)
              </h2>
              <p className="text-[#94a3b8] text-xs sm:text-sm leading-relaxed text-justify px-1 pt-1">
                L'Espace Maîtrise contient des jeux réservés exclusivement aux adultes. En poursuivant, vous attestez avoir <strong className="text-[#f1f5f9]">18 ans révolus</strong>, être responsable (ou ancien responsable) scout et utiliser cet espace uniquement en cadre privé, <strong className="text-[#f1f5f9]">hors de la présence de jeunes</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-[#94a3b8] text-left space-y-1">
              <div className="font-semibold text-[#f1f5f9]">
                Éthique et exemplarité scoute :
              </div>
              <p className="text-[11px] leading-relaxed text-[#94a3b8]">
                Cet espace festif et carnotzet est strictement réservé à la maîtrise adulte hors activités scoutes. L'exemplarité face aux mineurs est la priorité absolue.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] text-left cursor-pointer transition-colors">
              <input
                type="checkbox"
                id="onboarding-age-confirm"
                checked={isAgeConfirmed}
                onChange={e => setIsAgeConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-[#2e323c] accent-[#9b2c37] bg-[#16181d] w-4 h-4 cursor-pointer shrink-0"
              />
              <span className="text-xs text-[#f1f5f9] font-medium leading-relaxed">
                Je confirme obligatoirement avoir <strong>18 ans révolus</strong> et être responsable scout.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1 border border-[#2e323c]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!isAgeConfirmed}
                onClick={() => setStep(2)}
                className="btn-danger flex-1 order-1 sm:order-2 flex items-center justify-center gap-1 text-[#f1f5f9]"
              >
                <span>Confirmer et continuer</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : APPRENTISSAGE DU GESTE SECRET */}
        {step === 2 && (
          <div className="space-y-3.5 text-center">
            <div className="space-y-1 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16181d] text-[#94a3b8] text-[11px] font-semibold border border-[#2e323c]">
                <span>Étape 2 sur 3 : À retenir impérativement</span>
              </div>
              <h2 className="font-display font-bold text-[#f1f5f9] text-xl pb-1 border-b border-[#9b2c37] inline-block px-3">
                Apprentissage du Geste Secret
              </h2>
            </div>

            <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] text-left space-y-2 text-xs">
              <div className="text-[#f1f5f9] font-bold text-sm">
                Aucun bouton de connexion n'existe sur le site
              </div>
              <p className="text-[#94a3b8] leading-relaxed text-xs">
                Pour garantir la discrétion totale vis-à-vis des jeunes, l'accès à l'Espace Maîtrise est invisible.
              </p>
              <div className="p-2.5 rounded-lg bg-[#1f2229] border border-[#2e323c] text-[#f1f5f9] font-medium leading-relaxed text-xs">
                Pour revenir dans l'Espace Maîtrise après avoir fermé le navigateur ou rechargé la page, il faut <strong>taper 3 fois d'affilée sur la mention de copyright (©)</strong> située tout en bas de la page d'accueil (footer).
              </div>
            </div>

            <div className="relative rounded-2xl bg-[#16181d] border border-[#2e323c] p-4 overflow-hidden text-center select-none">
              <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-bold mb-2 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                <span>Simulation du bas de page (Footer)</span>
              </div>

              <div
                onClick={handleUserPracticeTap}
                className={`relative py-6 pb-8 px-3 rounded-xl border transition-colors cursor-pointer overflow-hidden ${
                  userUnlocked
                    ? 'bg-[#1f2229] border-[#f1f5f9]'
                    : 'bg-[#1f2229] border-[#2e323c] hover:border-[#94a3b8]'
                }`}
                title="Tapotez 3 fois sur la mention © pour vous entraîner !"
              >
                {ripples.map(r => (
                  <span
                    key={r.id}
                    className="absolute w-12 h-12 rounded-full border-2 border-[#9b2c37] pointer-events-none"
                    style={{ left: r.x - 24, top: r.y - 24 }}
                  />
                ))}

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16181d] border border-[#2e323c] relative z-10">
                  <div className="relative flex items-center justify-center w-7 h-7">
                    <span className="text-[#f1f5f9] text-lg font-bold select-none relative z-10">
                      ©
                    </span>
                  </div>

                  <span className="font-mono text-xs sm:text-sm text-[#f1f5f9] font-bold tracking-wide">
                    {currentYear} Scout Game · scoutgame.ch
                  </span>
                </div>

                <div className="mt-4 text-xs font-semibold relative z-10">
                  {userUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-[#f1f5f9] bg-[#16181d] px-3 py-1 rounded-full border border-[#2e323c]">
                      Geste réussi ! 3/3 taps validés.
                    </span>
                  ) : userTaps > 0 ? (
                    <span className="text-[#f1f5f9] font-mono">
                      Tap {userTaps}/3, encore !
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] text-[11px]">
                      Touchez ici 3 fois rapidement pour vous entraîner
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1 border border-[#2e323c]"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-danger flex-1 order-1 sm:order-2 flex items-center justify-center gap-1 text-[#f1f5f9]"
              >
                <span>C'est retenu !</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : CHARTE DE FONCTIONNEMENT & DÉVERROUILLAGE */}
        {step === 3 && (
          <div className="space-y-3.5 text-center">
            <div className="space-y-1 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16181d] text-[#94a3b8] text-[11px] font-semibold border border-[#2e323c]">
                <span>Étape 3 sur 3 : Engagement</span>
              </div>
              <h2 className="font-display font-bold text-[#f1f5f9] text-xl pb-1 border-b border-[#9b2c37] inline-block px-3">
                Charte de responsabilité &amp; Déverrouillage
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Veuillez lire et accepter les engagements de la maîtrise
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-left">
              <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1">
                <div className="font-bold text-[#f1f5f9] text-xs">
                  1. Sobriété en camp &amp; Cadre privé
                </div>
                <p className="text-[#94a3b8] leading-relaxed text-[11px]">
                  Espace réservé aux moments de détente entre adultes hors activités et hors responsabilité des jeunes. Ne jouez jamais en public ni en uniforme scout.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1">
                <div className="font-bold text-[#f1f5f9] text-xs">
                  2. Bienveillance &amp; Respect mutuel
                </div>
                <p className="text-[#94a3b8] leading-relaxed text-[11px]">
                  Veillez les uns sur les autres, prenez soin de votre santé et respectez toujours les limites et le consentement de chacun.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#16181d] border border-[#9b2c37] space-y-1">
                <div className="font-bold text-[#f1f5f9] text-xs flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#9b2c37] shrink-0" />
                  <span>3. Non-diffusion aux jeunes &amp; Parrainage</span>
                </div>
                <p className="text-[#94a3b8] leading-relaxed text-[11px]">
                  Ne révélez jamais le geste secret ni les liens d'accès aux mineurs. Vous êtes garant des accès que vous parrainez par QR code.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-[#f1f5f9] cursor-pointer text-left">
              <input
                type="checkbox"
                id="onboarding-charter-confirm"
                checked={acceptedCharter}
                onChange={e => setAcceptedCharter(e.target.checked)}
                className="mt-0.5 rounded border-[#2e323c] accent-[#9b2c37] bg-[#16181d] w-4 h-4 shrink-0"
              />
              <span className="text-[11px] leading-snug">
                Je certifie être majeur et m'engage à respecter scrupuleusement cette charte de responsabilité.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1 border border-[#2e323c]"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || !acceptedCharter}
                className="btn-danger flex-1 order-1 sm:order-2 flex items-center justify-center gap-2 text-[#f1f5f9]"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#f1f5f9]/40 border-t-[#f1f5f9] rounded-full animate-spin" />
                    <span>Déverrouillage…</span>
                  </>
                ) : (
                  "J'accepte et j'entre"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
