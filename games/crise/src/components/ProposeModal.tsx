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
        className="bg-[#161922] border border-[#2a2f3d] rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4 text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2a2f3d]">
          <h2 className="font-display font-bold text-lg text-white">💡 Proposer une carte — Crise</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-semibold text-emerald-400">
              Incident transmis ! Merci pour ta contribution.
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Type d'incident
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'attaque', label: '💥 Attaque' },
                    { id: 'dilemme', label: '⚖️ Dilemme' },
                    { id: 'regle', label: '⚠️ Malus' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                      category === item.id
                        ? 'bg-red-950/70 border-red-500 text-red-200'
                        : 'bg-[#0d1016] border-[#2a2f3d] text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
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
              <label className="block text-xs font-semibold text-gray-300 mb-1">
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
              <p className="text-[11px] text-gray-400 mt-1">
                Balises disponibles : <code className="text-red-300">{'{p1}'}</code>,{' '}
                <code className="text-red-300">{'{p2}'}</code>,{' '}
                <code className="text-amber-300">{'{sips}'}</code>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
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
                          ? 'bg-red-700 border-red-500 text-white'
                          : 'bg-[#0d1016] border-[#2a2f3d] text-gray-400 hover:text-white'
                      }`}
                    >
                      {val.toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
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
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-[#0d1016] border-[#2a2f3d] text-gray-400 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-xl p-2.5">
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
