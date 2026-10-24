/**
 * components/OnboardingModal.tsx
 * Tunnel d'onboarding Face B séquentiel strict en 3 étapes :
 * 1. Vérification de majorité (18+) avec confirmation obligatoire
 * 2. Apprentissage du Geste Secret (triple-tap footer ©) avec animation visuelle
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

  // Sandbox interactive pour l'étape 2 (permet à l'utilisateur de tester le geste)
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
        className="glass-card w-full max-w-lg rounded-b-none sm:rounded-3xl rounded-t-3xl p-5 sm:p-6 pb-7 space-y-4 animate-slide-up max-h-[94dvh] overflow-y-auto border-2 border-scout-amber/40 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden" />

        {/* ── Stepper Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-1 px-1 pt-1 pb-1">
          {/* Step 1 badge */}
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              step >= 1 ? 'text-amber-300' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step > 1
                  ? 'bg-amber-400 text-black'
                  : 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </span>
            <span className="hidden sm:inline">Majorité</span>
          </div>

          <div
            className={`h-0.5 flex-1 mx-1.5 rounded-full transition-colors ${
              step >= 2 ? 'bg-amber-400' : 'bg-white/10'
            }`}
          />

          {/* Step 2 badge */}
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              step >= 2 ? 'text-amber-300' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step > 2
                  ? 'bg-amber-400 text-black'
                  : step === 2
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              {step > 2 ? '✓' : '2'}
            </span>
            <span>Geste Secret</span>
          </div>

          <div
            className={`h-0.5 flex-1 mx-1.5 rounded-full transition-colors ${
              step >= 3 ? 'bg-amber-400' : 'bg-white/10'
            }`}
          />

          {/* Step 3 badge */}
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              step === 3 ? 'text-amber-300' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 3
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline">Charte</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            ÉTAPE 1 — VÉRIFICATION DE MAJORITÉ (18+)
        ══════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
              🔞
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                <span>Étape 1 sur 3 — Majorité requise</span>
              </div>
              <h2 className="font-display font-bold text-white text-xl">
                Vérification de majorité (18+)
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed text-justify px-1 pt-1">
                L'Espace Maîtrise contient des jeux réservés exclusivement aux adultes. En poursuivant, vous attestez avoir <strong>18 ans révolus</strong>, être responsable (ou ancien responsable) scout et utiliser cet espace uniquement en cadre privé, <strong>hors de la présence de jeunes</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/25 text-xs text-amber-200/90 text-left space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                <span>⚜️</span>
                <span>Éthique et exemplarité scoute :</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Cet espace festif et carnotzet est strictement réservé à la maîtrise adulte hors activités scoutes. L'exemplarité face aux mineurs est la priorité absolue.
              </p>
            </div>

            {/* Confirmation obligatoire des 18 ans révolus */}
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-left cursor-pointer hover:border-amber-400/50 transition-colors">
              <input
                type="checkbox"
                id="onboarding-age-confirm"
                checked={isAgeConfirmed}
                onChange={e => setIsAgeConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-amber-500/50 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-black/40 w-4 h-4 cursor-pointer shrink-0"
              />
              <span className="text-xs text-amber-100 font-medium leading-relaxed">
                Je confirme obligatoirement avoir <strong>18 ans révolus</strong> et être responsable scout.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!isAgeConfirmed}
                onClick={() => setStep(2)}
                className="btn-amber flex-1 py-3 text-sm font-bold order-1 sm:order-2 shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <span>Confirmer et continuer</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ÉTAPE 2 — APPRENTISSAGE DU GESTE SECRET (AVANT LA CHARTE)
        ══════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-3.5 animate-fade-in text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
              🤫
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                <span>Étape 2 sur 3 — À retenir impérativement</span>
              </div>
              <h2 className="font-display font-bold text-white text-xl">
                Apprentissage du Geste Secret
              </h2>
            </div>

            {/* Message explicatif percutant */}
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                <span>⚠️</span>
                <span>Aucun bouton de connexion n'existe sur le site</span>
              </div>
              <p className="text-gray-300 leading-relaxed text-xs">
                Pour garantir la discrétion totale vis-à-vis des jeunes, l'accès à l'Espace Maîtrise est invisible.
              </p>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-100 font-medium leading-relaxed text-xs">
                Pour revenir dans l'Espace Maîtrise après avoir fermé le navigateur ou rechargé la page, il faut <strong>taper 3 fois d'affilée sur la mention de copyright (©)</strong> située tout en bas de la page d'accueil (footer).
              </div>
            </div>

            {/* Animation visuelle intégrée (Simulation du bas de page) */}
            <div className="relative rounded-2xl bg-black/60 border border-white/15 p-4 overflow-hidden text-center shadow-inner select-none">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Simulation du bas de page (Footer)</span>
              </div>

              {/* Bloc simulant le bas de page « © scoutgame.ch » */}
              <div
                onClick={handleUserPracticeTap}
                className={`relative py-6 pb-12 px-3 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  userUnlocked
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/25'
                    : 'bg-white/[0.04] border-white/15 hover:border-amber-400/40 active:scale-[0.98]'
                }`}
                title="Tapotez 3 fois sur la mention © pour vous entraîner !"
              >
                {/* Ondes manuelles créées par les clics de l'utilisateur */}
                {ripples.map(r => (
                  <span
                    key={r.id}
                    className="absolute w-12 h-12 rounded-full border-2 border-amber-300 bg-amber-400/30 pointer-events-none animate-ping"
                    style={{ left: r.x - 24, top: r.y - 24 }}
                  />
                ))}

                {/* Mention de bas de page avec la cible copyright © */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10 relative z-10 shadow-md">
                  {/* Cible copyright © avec onde concentrique et doigt */}
                  <div className="relative flex items-center justify-center w-7 h-7">
                    {/* Ondes automatiques en boucle (Ripple effect) */}
                    {userTaps === 0 && !userUnlocked && (
                      <>
                        <div className="absolute w-7 h-7 rounded-full border-2 border-amber-400 pointer-events-none animate-tap-ripple-1" />
                        <div className="absolute w-7 h-7 rounded-full border-2 border-amber-400 pointer-events-none animate-tap-ripple-2" />
                        <div className="absolute w-7 h-7 rounded-full border-2 border-amber-400 pointer-events-none animate-tap-ripple-3" />
                      </>
                    )}
                    <span className="text-amber-400 text-lg font-bold select-none relative z-10">
                      ©
                    </span>

                    {/* Doigt animé (micro-animation venant tapoter 3 fois sur le ©) */}
                    {userTaps === 0 && !userUnlocked && (
                      <div className="absolute top-6 left-1/2 pointer-events-none animate-gesture-finger text-3xl select-none z-20 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        👆
                      </div>
                    )}
                  </div>

                  <span className="font-mono text-xs sm:text-sm text-gray-200 font-bold tracking-wide">
                    {currentYear} Scout Game — scoutgame.ch
                  </span>
                </div>

                {/* Feedback d'entraînement interactif */}
                <div className="mt-4 text-xs font-semibold relative z-10">
                  {userUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40">
                      🎉 Geste réussi ! 3/3 taps validés.
                    </span>
                  ) : userTaps > 0 ? (
                    <span className="text-amber-300 font-mono">
                      Tap {userTaps}/3 — encore !
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[11px]">
                      👆 Touchez ici pour vous entraîner au triple-tap
                    </span>
                  )}
                </div>
              </div>

              {/* Barre de rythme / 3 taps synchronisés */}
              <div className="flex items-center justify-center gap-2 mt-2.5 text-xs font-medium">
                <span className="text-gray-400 text-[11px]">Rythme :</span>
                <span className="font-mono text-xs font-bold animate-tap-badge-1 text-amber-300/60">
                  Tap 1
                </span>
                <span className="text-gray-600">•</span>
                <span className="font-mono text-xs font-bold animate-tap-badge-2 text-amber-300/60">
                  Tap 2
                </span>
                <span className="text-gray-600">•</span>
                <span className="font-mono text-xs font-bold animate-tap-badge-3 text-amber-300/60">
                  Tap 3
                </span>
                <span className="text-gray-500 text-[11px]">=</span>
                <span className="text-emerald-400 text-xs font-bold">Déverrouillé</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-amber flex-1 py-3 text-sm font-bold order-1 sm:order-2 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1"
              >
                <span>C'est retenu !</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ÉTAPE 3 — CHARTE DE FONCTIONNEMENT & DÉVERROUILLAGE
        ══════════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-3.5 animate-fade-in text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
              📜
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                <span>Étape 3 sur 3 — Engagement</span>
              </div>
              <h2 className="font-display font-bold text-white text-xl">
                Charte de responsabilité &amp; Déverrouillage
              </h2>
              <p className="text-xs text-gray-400">
                Veuillez lire et accepter les engagements de la maîtrise
              </p>
            </div>

            {/* Les 3 piliers de la charte */}
            <div className="space-y-2.5 text-xs text-left">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>🍻</span>
                  <span>1. Sobriété en camp &amp; Cadre privé</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  Espace réservé aux moments de détente entre adultes hors activités et hors responsabilité des jeunes. Ne jouez jamais en public ni en uniforme scout.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                <div className="font-bold text-sky-300 flex items-center gap-1.5 text-xs">
                  <span>❤️</span>
                  <span>2. Bienveillance &amp; Respect mutuel</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  Veillez les uns sur les autres, prenez soin de votre santé et respectez toujours les limites et le consentement de chacun.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                <div className="font-bold text-red-300 flex items-center gap-1.5 text-xs">
                  <span>🛡️</span>
                  <span>3. Non-diffusion aux jeunes &amp; Parrainage</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  Ne révélez jamais le geste secret ni les liens d'accès aux mineurs. Vous êtes garant des accès que vous parrainez par QR code.
                </p>
              </div>
            </div>

            {/* Engagement */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/25 border border-amber-500/25 text-xs text-gray-200 cursor-pointer text-left hover:border-amber-400/40 transition-colors">
              <input
                type="checkbox"
                id="onboarding-charter-confirm"
                checked={acceptedCharter}
                onChange={e => setAcceptedCharter(e.target.checked)}
                className="mt-0.5 rounded border-amber-500/40 text-amber-500 focus:ring-amber-400 w-4 h-4 shrink-0"
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
                className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || !acceptedCharter}
                className="btn-amber flex-1 py-3 text-sm font-bold order-1 sm:order-2 shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
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
