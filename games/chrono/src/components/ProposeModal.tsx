import { useState, useEffect } from 'react'
import { submitFeedback } from '../services/api'
import type { ChronoTheme } from '../types'

interface Props {
  isOpen: boolean
  initialTheme: ChronoTheme
  onClose: () => void
}

export function ProposeModal({ isOpen, initialTheme, onClose }: Props) {
  const [mode, setMode] = useState<ChronoTheme>(initialTheme)
  const [word, setWord] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(initialTheme)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialTheme])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = word.trim()
    if (!trimmed) {
      setError('Veuillez saisir un mot.')
      return
    }
    if (/\s/.test(trimmed)) {
      setError('Chrono accepte uniquement 1 seul mot sans espace.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        type: 'PROPOSITION',
        target_game: 'chrono',
        mode,
        category: mode === 'scout' ? 'campement' : 'objet',
        title: trimmed,
        content: trimmed,
        min_players: 4,
        author_alias: null,
      })
      setSuccess(true)
      setWord('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#261e17] border border-[#785127] rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4 text-[#f3f4f6]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#785127]">
          <h2 className="font-display font-bold text-lg text-[#f3f4f6]">💡 Proposer un mot — Chrono</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-semibold text-[#8fd4b0]">
              Mot proposé ! Merci pour ta contribution.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#deb07a] uppercase tracking-wider mb-1.5">
                Thème
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'scout', label: '🏕️ Scout' },
                    { id: 'moldu', label: '🏙️ Moldu' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      mode === item.id
                        ? 'bg-[#36281c] border-[#966530] text-[#f3f4f6]'
                        : 'bg-[#1c1611] border-[#785127] text-gray-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-200 mb-1">
                Mot unique à faire deviner <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={word}
                onChange={e => setWord(e.target.value)}
                placeholder="Ex: Sarasani"
                className="input-scout"
              />
              <p className="text-[11px] text-[#c9b7a2] mt-1">
                Un seul mot, sans espace.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-200 bg-[#3a1b20] border border-[#8c2d38] rounded-xl p-2.5">{error}</p>
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
