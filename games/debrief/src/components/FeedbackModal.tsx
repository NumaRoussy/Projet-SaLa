import { useState } from 'react'
import { submitFeedback } from '../services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: Props) {
  const [category, setCategory] = useState<'verite' | 'jamais'>('verite')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [extraData, setExtraData] = useState('')
  const [authorAlias, setAuthorAlias] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim().length < 10) {
      setErrorMsg('Le texte de la carte doit faire au moins 10 caractères.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await submitFeedback({
        type: 'PROPOSITION',
        target_game: 'debrief',
        category,
        title: title.trim() || (category === 'verite' ? 'Vérité Débrief' : "Je n'ai jamais"),
        content: content.trim(),
        extra_data: extraData.trim() || undefined,
        author_alias: authorAlias.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
      })
      setSuccessMsg(res.message || 'Proposition enregistrée avec succès ! Merci pour ta créativité.')
      setTitle('')
      setContent('')
      setExtraData('')
      setAuthorAlias('')
      setContactEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’envoi'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg p-6 max-h-[90dvh] overflow-y-auto space-y-4 border border-purple-500/30">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <h3 className="font-display font-bold text-white text-lg">Proposer une carte Débrief</h3>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs">✕ Fermer</button>
        </div>

        {successMsg ? (
          <div className="p-6 text-center space-y-4 animate-fade-in">
            <div className="text-5xl">⚜️</div>
            <h4 className="font-bold text-emerald-400 text-lg">Proposition transmise !</h4>
            <p className="text-sm text-gray-300">{successMsg}</p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSuccessMsg(null)
                  onClose()
                }}
                className="btn-primary w-full py-2.5"
              >
                Retourner à la veillée
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Category toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Type de carte
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('verite')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    category === 'verite'
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-md shadow-purple-600/20'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🤫 Vérité
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('jamais')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    category === 'jamais'
                      ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-md shadow-amber-600/20'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🍻 Je n'ai jamais
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Titre de la carte (optionnel)
              </label>
              <input
                type="text"
                placeholder={category === 'verite' ? 'Ex: Vérité Intendance' : "Ex: Je n'ai jamais en raid"}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input-scout"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Texte de la question ou situation <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder={
                  category === 'verite'
                    ? "Ex: Quel est le pire plat que tu as servi en camp sans jamais assumer l'échec ?"
                    : "Ex: Je n'ai jamais dormi pendant mon propre tour de veille de nuit."
                }
                value={content}
                onChange={e => setContent(e.target.value)}
                className="input-scout"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Minimum 10 caractères
              </span>
            </div>

            {/* Extra data / penalty */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Conséquence / Gorgées (optionnel)
              </label>
              <input
                type="text"
                placeholder={category === 'verite' ? 'Ex: Avoue ou prends {sips} gorgées' : 'Ex: Les coupables boivent {sips}'}
                value={extraData}
                onChange={e => setExtraData(e.target.value)}
                className="input-scout"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Astuce : utilise {'{sips}'} pour le multiplicateur dynamique de gorgées.
              </span>
            </div>

            {/* Author alias */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Totem / Pseudo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Écureuil Curieux"
                  value={authorAlias}
                  onChange={e => setAuthorAlias(e.target.value)}
                  className="input-scout"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  placeholder="responsable@scoutgame.ch"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="input-scout"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1 py-2.5"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-2.5 font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi en cours…' : 'Envoyer la carte ⚜️'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
