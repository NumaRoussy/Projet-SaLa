import { useState, useEffect } from 'react'
import { submitFeedback } from '../services/api'
import type { CrisisCategory } from '../types'

interface Props {
  isOpen: boolean
  initialCategory: CrisisCategory
  onClose: () => void
}

const LOSS_OPTIONS = [0.0, 0.5, 1.0, 1.5, 2.0]

export function ProposeModal({ isOpen, initialCategory, onClose }: Props) {
  const [category, setCategory] = useState<CrisisCategory>(initialCategory)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [lossPercent, setLossPercent] = useState<number>(1.0)
  const [sips, setSips] = useState<number>(3)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    const c = content.trim()
    if (!t || !c) {
      setError("Veuillez saisir le titre et la description de l'incident.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        type: 'PROPOSITION',
        target_game: 'crise',
        mode: 'crise',
        category,
        title: t,
        content: c,
        loss_percent: lossPercent,
        sips,
        min_players: 2,
        author_alias: null,
      })
      setSuccess(true)
      setTitle('')
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
          <h2 className="font-display font-bold text-lg text-[#f3f4f6]">Proposer une carte (Crise)</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm font-semibold text-emerald-300">
              Incident transmis ! Merci pour ta contribution.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Type d'incident
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'attaque', label: 'Attaque' },
                    { id: 'dilemme', label: 'Dilemme' },
                    { id: 'regle', label: 'Malus' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                      category === item.id
                        ? 'bg-[#262a33] border-[#9b2c37] text-[#f3f4f6]'
                        : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Titre de l'incident <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Bidon d'eau sous les pneus"
                className="input-scout"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Ex: {p1} accuse {p2} d'avoir perdu la caisse de matos. {p2} prend +1.0% et boit {sips} gorgées."
                className="input-scout resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Balises disponibles : <code className="text-[#e88c95]">{'{p1}'}</code>,{' '}
                <code className="text-[#e88c95]">{'{p2}'}</code>,{' '}
                <code className="text-[#e5be6d]">{'{sips}'}</code>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perte % J+S
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {LOSS_OPTIONS.map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLossPercent(val)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        lossPercent === val
                          ? 'bg-[#9b2c37] border-[#9b2c37] text-[#f3f4f6]'
                          : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                      }`}
                    >
                      {val.toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gorgées
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSips(val)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        sips === val
                          ? 'bg-[#9b2c37] border-[#9b2c37] text-[#f3f4f6]'
                          : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
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
