import { useState, useEffect } from 'react'
import { submitFeedback } from '../services/api'
import type { GameMode } from '../types'

interface Props {
  isOpen: boolean
  initialGameMode: GameMode
  onClose: () => void
}

export function ProposeModal({ isOpen, initialGameMode, onClose }: Props) {
  const [mode, setMode] = useState<'passif' | 'actif'>(
    initialGameMode === 'commando' ? 'actif' : 'passif'
  )
  const [content, setContent] = useState('')
  const [sips, setSips] = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(initialGameMode === 'commando' ? 'actif' : 'passif')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialGameMode])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError('Veuillez saisir le texte de la carte.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        type: 'PROPOSITION',
        target_game: 'vachao',
        mode,
        category: 'carte',
        content: trimmed,
        sips,
        min_players: 2,
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
          <h2 className="font-display font-bold text-lg text-[#f3f4f6]">Proposer une carte (Vachao)</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm font-semibold text-emerald-300">
              Carte proposée ! Merci pour ta contribution.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('passif')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    mode === 'passif'
                      ? 'bg-[#262a33] border-[#2d6394] text-[#f3f4f6]'
                      : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                  }`}
                >
                  Pépère (Passif)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('actif')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    mode === 'actif'
                      ? 'bg-[#262a33] border-[#2d6394] text-[#f3f4f6]'
                      : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                  }`}
                >
                  Commando (Actif)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Texte de la carte <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Ex: {p1} doit citer 3 chefs ou boire {sips} gorgées."
                className="input-scout resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Balises disponibles : <code className="text-[#8ec2eb]">{'{p1}'}</code>,{' '}
                <code className="text-[#8ec2eb]">{'{p2}'}</code>,{' '}
                <code className="text-[#e5be6d]">{'{sips}'}</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Gorgées
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSips(val)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                      sips === val
                        ? 'bg-[#2d6394] border-[#2d6394] text-[#f3f4f6]'
                        : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-300 bg-[#2a191c] border border-[#9b2c37] rounded-lg p-2.5">
                {error}
              </p>
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
