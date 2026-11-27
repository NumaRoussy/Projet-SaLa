import { useState, useEffect } from 'react'
import { submitFeedback } from '../services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ProposeModal({ isOpen, onClose }: Props) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError('Veuillez saisir votre suggestion.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        type: 'SUGGESTION',
        target_game: 'couvrefeu',
        content: trimmed,
        author_alias: null,
      })
      setSuccess(true)
      setContent('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1f2229] border border-[#2e323c] rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4 text-[#f3f4f6]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2e323c]">
          <h2 className="font-display font-bold text-lg text-[#f3f4f6]">Proposer une idée (Couvre-feu)</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm font-semibold text-emerald-300">
              Suggestion transmise ! Merci pour ton retour.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Propose une idée, un nouveau rôle ou une amélioration pour Couvre-feu <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Décris ton idée de rôle, de mécanique ou d'amélioration..."
                className="input-scout resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-300 bg-[#2a191c] border border-[#9b2c37] rounded-lg p-2.5">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={isSubmitting}>
                Annuler
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
