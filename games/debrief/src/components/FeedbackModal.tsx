import { useState } from 'react'
import { submitFeedback } from '../services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type FeedbackCategory = 'dossiers' | 'jamais' | 'prefere'

const CATEGORY_META: Record<
  FeedbackCategory,
  {
    label: string
    icon: string
    defaultTitle: string
    titlePlaceholder: string
    contentPlaceholder: string
    extraPlaceholder: string
    activeClass: string
  }
> = {
  dossiers: {
    label: 'Dossiers de camp',
    icon: '📁',
    defaultTitle: 'Dossier de camp',
    titlePlaceholder: 'Ex: La boulette au local matos',
    contentPlaceholder: 'Ex: {p1}, raconte le pire plat servi aux jeunes en faisant croire que c’était voulu.',
    extraPlaceholder: 'Ex: Avoue le dossier ou bois {sips} gorgées.',
    activeClass: 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-md shadow-purple-600/20',
  },
  jamais: {
    label: "Je n'ai jamais",
    icon: '🙈',
    defaultTitle: "Je n'ai jamais",
    titlePlaceholder: "Ex: Je n'ai jamais",
    contentPlaceholder: "Ex: Je n'ai jamais dormi pendant mon propre tour de veille de nuit.",
    extraPlaceholder: 'Ex: Si tu as déjà, tu bois {sips} gorgées.',
    activeClass: 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-md shadow-amber-600/20',
  },
  prefere: {
    label: 'Tu préfères',
    icon: '⚖️',
    defaultTitle: 'Dilemme de maîtrise',
    titlePlaceholder: 'Ex: Galère de campement',
    contentPlaceholder: 'Ex: Tu préfères monter un Sarasani sous la roille ou talquer 15 carrés militaires ?',
    extraPlaceholder: 'Ex: A: Sarasani sous la roille | B: Talquer 15 carrés',
    activeClass: 'bg-rose-600/30 text-rose-300 border-rose-500 shadow-md shadow-rose-600/20',
  },
}

export function FeedbackModal({ isOpen, onClose }: Props) {
  const [category, setCategory] = useState<FeedbackCategory>('dossiers')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [extraData, setExtraData] = useState('')
  const [authorAlias, setAuthorAlias] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const meta = CATEGORY_META[category]

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
        title: title.trim() || meta.defaultTitle,
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
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_META) as FeedbackCategory[]).map(catKey => {
                  const cat = CATEGORY_META[catKey]
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        category === catKey
                          ? cat.activeClass
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Titre de la carte (optionnel)
              </label>
              <input
                type="text"
                placeholder={meta.titlePlaceholder}
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
                placeholder={meta.contentPlaceholder}
                value={content}
                onChange={e => setContent(e.target.value)}
                className="input-scout"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Minimum 10 caractères
              </span>
            </div>

            {/* Extra data / options */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {category === 'prefere' ? 'Options A et B (optionnel)' : 'Conséquence / Gorgées (optionnel)'}
              </label>
              <input
                type="text"
                placeholder={meta.extraPlaceholder}
                value={extraData}
                onChange={e => setExtraData(e.target.value)}
                className="input-scout"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                {category === 'prefere'
                  ? 'Format recommandé : A: Option 1 | B: Option 2'
                  : "Astuce : utilise '{sips}' pour le multiplicateur dynamique de gorgées."}
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
