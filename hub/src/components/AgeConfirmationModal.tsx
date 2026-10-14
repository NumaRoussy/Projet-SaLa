/**
 * components/AgeConfirmationModal.tsx
 * Modale de responsabilisation et confirmation d'âge 18+ (Point 1A).
 */
interface Props {
  onConfirm: () => void
  onCancel: () => void
}

import { useState } from 'react'

export function AgeConfirmationModal({ onConfirm, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false)

  function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    onConfirm()
  }

  return (
    <div className="overlay flex items-center justify-center p-6 z-50">
      <div
        className="glass-card max-w-md w-full p-6 text-center space-y-5 animate-fade-in border-2 border-amber-500/40 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-3xl">
          🔞
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-bold text-white text-lg tracking-wide">
            Confirmation d'âge (18+)
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed text-justify px-1">
            En activant cet accès, je confirme avoir <strong>18 ans révolus</strong>, être responsable scout et utiliser cet espace uniquement en cadre privé, <strong>hors présence de jeunes</strong>.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 text-left space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-300">
            <span>⚜️</span>
            <span>Éthique et exemplarité scoute :</span>
          </div>
          <p className="text-[11px] leading-snug">
            Cet espace de détente et carnotzet est strictement réservé à la maîtrise adulte hors activités scoutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="btn-ghost flex-1 py-3 text-sm order-2 sm:order-1"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn-amber flex-1 py-3 text-sm font-bold order-1 sm:order-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {submitting ? '⏳ Activation…' : "J'ai 18 ans, activer"}
          </button>
        </div>
      </div>
    </div>
  )
}
