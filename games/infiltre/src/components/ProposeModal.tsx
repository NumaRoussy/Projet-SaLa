import { useState, useEffect } from 'react'
import { submitFeedback } from '../services/api'
import type { GameTheme } from '../types'

interface Props {
  isOpen: boolean
  initialTheme: GameTheme
  onClose: () => void
}

export function ProposeModal({ isOpen, initialTheme, onClose }: Props) {
  const [mode, setMode] = useState<'scout' | 'moldu'>(initialTheme === 'moldu' ? 'moldu' : 'scout')
  const [civilWord, setCivilWord] = useState('')
  const [infiltreWord, setInfiltreWord] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(initialTheme === 'moldu' ? 'moldu' : 'scout')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialTheme])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cWord = civilWord.trim()
    const iWord = infiltreWord.trim()
    if (!cWord || !iWord) {
      setError('Veuillez saisir les deux mots.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        type: 'PROPOSITION',
        target_game: 'infiltre',
        mode,
        category: 'defi',
        content: cWord,
        extra: iWord,
        min_players: 3,
        author_alias: null,
      })
      setSuccess(true)
      setCivilWord('')
      setInfiltreWord('')
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
          <h2 className="font-display font-bold text-lg text-[#f3f4f6]">Proposer une paire (L'Infiltré)</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm font-semibold text-emerald-300">
              Proposition envoyée ! Merci pour ta contribution.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Thème
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'scout', label: 'Scout' },
                    { id: 'moldu', label: 'Moldu' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      mode === item.id
                        ? 'bg-[#262a33] border-[#2e6f56] text-[#f3f4f6]'
                        : 'bg-[#16181d] border-[#2e323c] text-slate-300 hover:text-[#f3f4f6]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Mot des Joueurs ordinaires <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={civilWord}
                onChange={e => setCivilWord(e.target.value)}
                placeholder="Ex: Sarasani"
                className="input-scout"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Mot de L'Infiltré <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={infiltreWord}
                onChange={e => setInfiltreWord(e.target.value)}
                placeholder="Ex: Spatz"
                className="input-scout"
              />
            </div>

            {error && (
              <p className="text-xs text-red-200 bg-[#2a191c] border border-[#9b2c37] rounded-lg p-2.5">{error}</p>
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
