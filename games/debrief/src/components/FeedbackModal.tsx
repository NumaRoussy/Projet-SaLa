import { useState, useEffect } from 'react'
import { submitFeedback } from '../services/api'
import type { DebriefMode } from '../types'

interface Props {
  isOpen: boolean
  initialCategory?: DebriefMode
  onClose: () => void
}

const CATEGORY_META: Record<
  DebriefMode,
  {
    label: string
    defaultTitle: string
  }
> = {
  dossiers: {
    label: 'Dossiers de camp',
    defaultTitle: 'Dossier de camp',
  },
  jamais: {
    label: "Je n'ai jamais",
    defaultTitle: "Je n'ai jamais",
  },
  prefere: {
    label: 'Tu préfères',
    defaultTitle: 'Dilemme de maîtrise',
  },
}

export function FeedbackModal({ isOpen, initialCategory = 'dossiers', onClose }: Props) {
  const [category, setCategory] = useState<DebriefMode>(initialCategory)
  const [content, setContent] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [sips, setSips] = useState(2)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory)
      setErrorMsg(null)
      setSuccessMsg(null)
      if (initialCategory === 'jamais') {
        setContent("Je n'ai jamais ")
      } else {
        setContent('')
      }
      setOptionA('')
      setOptionB('')
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const handleSelectCategory = (nextCat: DebriefMode) => {
    setCategory(nextCat)
    setErrorMsg(null)
    if (nextCat === 'jamais' && !content.trim()) {
      setContent("Je n'ai jamais ")
    } else if (nextCat === 'dossiers' && content.trim() === "Je n'ai jamais") {
      setContent('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    let finalContent = content.trim()
    let finalExtra = ''

    if (category === 'prefere') {
      const a = optionA.trim()
      const b = optionB.trim()
      if (!a || !b) {
        setErrorMsg('Veuillez renseigner les deux options A et B.')
        return
      }
      finalContent = `Tu préfères ${a} ou ${b} ?`
      finalExtra = `A: ${a} | B: ${b}`
    } else if (category === 'jamais') {
      if (finalContent.length < 18 || finalContent.toLowerCase() === "je n'ai jamais") {
        setErrorMsg("Veuillez compléter l'affirmation « Je n'ai jamais... ».")
        return
      }
      finalExtra = 'Si tu as déjà, tu bois {sips} gorgées.'
    } else {
      if (finalContent.length < 8) {
        setErrorMsg('La question / confession doit faire au moins 8 caractères.')
        return
      }
      finalExtra = 'Avoue le dossier ou bois {sips} gorgées.'
    }

    setIsSubmitting(true)
    try {
      const res = await submitFeedback({
        type: 'PROPOSITION',
        target_game: 'debrief',
        mode: 'debrief',
        category,
        title: CATEGORY_META[category].defaultTitle,
        content: finalContent,
        extra: finalExtra,
        extra_data: finalExtra,
        sips,
        min_players: 2,
        author_alias: null,
      })
      setSuccessMsg(res.message || 'Proposition enregistrée ! Merci pour ta créativité.')
      setContent('')
      setOptionA('')
      setOptionB('')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1f2229] border border-[#2e323c] rounded-2xl w-full max-w-lg p-5 max-h-[90dvh] overflow-y-auto space-y-4 text-[#f3f4f6]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2e323c]">
          <h3 className="font-display font-bold text-[#f3f4f6] text-lg">Proposer une carte (Débrief)</h3>
          <button type="button" onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>

        {successMsg ? (
          <div className="p-6 text-center space-y-4">
            <h4 className="font-bold text-emerald-300 text-base">Proposition transmise !</h4>
            <p className="text-sm text-slate-300">{successMsg}</p>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg(null)
                onClose()
              }}
              className="btn-primary w-full"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#2a191c] border border-[#9b2c37] text-[#e88c95] text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_META) as DebriefMode[]).map(catKey => {
                  const cat = CATEGORY_META[catKey]
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => handleSelectCategory(catKey)}
                      className={`py-2.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                        category === catKey
                          ? 'bg-[#262a33] border-[#b5892e] text-[#f3f4f6]'
                          : 'bg-[#16181d] text-slate-400 border-[#2e323c] hover:text-[#f3f4f6]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {category === 'dossiers' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question / Confession <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: {p1}, raconte le pire plat servi aux jeunes en faisant croire que c'était voulu."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input-scout resize-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Astuce : utilise <code className="text-[#e5be6d]">{'{p1}'}</code> pour cibler un responsable.
                </span>
              </div>
            )}

            {category === 'jamais' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Affirmation <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Je n'ai jamais dormi pendant mon propre tour de veille de nuit."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input-scout resize-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Complète la phrase commençant par « Je n'ai jamais… »
                </span>
              </div>
            )}

            {category === 'prefere' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Option A <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Monter un Sarasani sous la roille"
                    value={optionA}
                    onChange={e => setOptionA(e.target.value)}
                    className="input-scout"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Option B <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Talquer 15 carrés militaires moisis"
                    value={optionB}
                    onChange={e => setOptionB(e.target.value)}
                    className="input-scout"
                  />
                </div>
              </div>
            )}

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
                        ? 'bg-[#b5892e] border-[#b5892e] text-[#16181d]'
                        : 'bg-[#16181d] border-[#2e323c] text-slate-400 hover:text-[#f3f4f6]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
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
                className="btn-primary flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
