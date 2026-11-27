/**
 * components/FaceA/FeedbackModal.tsx
 * Modale de proposition de cartes / contact légal → POST /api/feedback
 */
import { useState } from 'react'
import { apiSubmitFeedback } from '../../services/api'
import type { FeedbackPayload } from '../../types'

const GAMES = [
  { id: 'infiltre', label: "L'Infiltré" },
  { id: 'couvrefeu', label: 'Couvre-feu' },
  { id: 'chrono', label: 'Chrono' },
  { id: 'vachao', label: 'Vachao' },
  { id: 'crise', label: 'Cellule de crise' },
  { id: 'debrief', label: 'Débrief' },
]

interface Props {
  onClose: () => void
}

export function FeedbackModal({ onClose }: Props) {
  const [type, setType] = useState<'PROPOSITION' | 'CONTACT_LEGAL'>('PROPOSITION')
  const [form, setForm] = useState({
    target_game: '',
    category: '',
    title: '',
    content: '',
    contact_email: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return
    setLoading(true)
    setError('')
    try {
      const payload: FeedbackPayload = {
        type: type === 'PROPOSITION' && form.target_game === 'couvrefeu' ? 'SUGGESTION' : type,
        content: form.content.trim(),
        author_alias: null,
        ...(form.target_game && { target_game: form.target_game }),
        ...(form.category && { category: form.category.trim() }),
        ...(form.title && { title: form.title.trim() }),
        ...(type === 'CONTACT_LEGAL' && form.contact_email && { contact_email: form.contact_email.trim() }),
      }
      await apiSubmitFeedback(payload)
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as Error).message ?? "Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#1f2229] border border-[#2e323c] rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e323c]">
          <h2 className="font-display font-bold text-[#f3f4f6] text-lg">
            {type === 'PROPOSITION' ? '💡 Proposer une carte' : 'Contact / Légal'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5 rounded-lg">✕</button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-5 py-8">
            <p className="text-emerald-300 font-semibold text-center">
              Merci pour votre retour !<br />
              <span className="text-slate-300 font-normal text-sm">Votre message a bien été reçu.</span>
            </p>
            <button type="button" className="btn-primary" onClick={onClose}>Fermer</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
            <div className="flex rounded-lg overflow-hidden border border-[#2e323c] bg-[#16181d]">
              {(['PROPOSITION', 'CONTACT_LEGAL'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === t ? 'bg-[#2e6f56] text-[#f3f4f6]' : 'text-slate-300 hover:text-[#f3f4f6]'}`}
                  onClick={() => setType(t)}
                >
                  {t === 'PROPOSITION' ? '💡 Proposition' : 'Contact'}
                </button>
              ))}
            </div>

            {type === 'PROPOSITION' && (
              <>
                <select className="input-scout" value={form.target_game} onChange={handle('target_game')}>
                  <option value="">Jeu concerné (optionnel)</option>
                  {GAMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
                <input className="input-scout" placeholder="Titre de la carte (optionnel)" value={form.title} onChange={handle('title')} />
              </>
            )}

            <textarea
              required
              className="input-scout min-h-[120px] resize-none"
              placeholder={type === 'PROPOSITION' ? 'Décrivez votre idée de carte ou suggestion...' : 'Votre message...'}
              value={form.content}
              onChange={handle('content')}
            />

            {type === 'CONTACT_LEGAL' && (
              <input className="input-scout" type="email" placeholder="Votre email (optionnel)" value={form.contact_email} onChange={handle('contact_email')} />
            )}

            {error && <p className="text-red-300 text-sm">{error}</p>}

            <p className="text-[11px] text-slate-400 text-center leading-relaxed px-1">
              Projet indépendant. Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
            </p>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Envoi en cours…' : 'Envoyer'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
