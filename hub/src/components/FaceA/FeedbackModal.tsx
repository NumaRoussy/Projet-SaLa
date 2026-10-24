/**
 * components/FaceA/FeedbackModal.tsx
 * Modale de proposition de cartes / contact légal → POST /api/feedback
 */
import { useState } from 'react'
import { apiSubmitFeedback } from '../../services/api'
import type { FeedbackPayload } from '../../types'

const GAMES = ['carnotzet', 'debout', 'debrief', 'infiltre', 'couvrefeu', 'chrono']

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
    author_alias: '',
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
        type,
        content: form.content,
        ...(form.target_game && { target_game: form.target_game }),
        ...(form.category && { category: form.category }),
        ...(form.title && { title: form.title }),
        ...(form.author_alias && { author_alias: form.author_alias }),
        ...(form.contact_email && { contact_email: form.contact_email }),
      }
      await apiSubmitFeedback(payload)
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-display font-bold text-white text-lg">
              {type === 'PROPOSITION' ? '💡 Proposer une carte' : '✉️ Contact / Légal'}
            </h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">✕</button>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 px-5">
              <div className="text-5xl">✅</div>
              <p className="text-scout-sage font-semibold text-center">
                Merci pour votre retour !<br />
                <span className="text-gray-400 font-normal text-sm">Votre message a bien été reçu.</span>
              </p>
              <button className="btn-primary" onClick={onClose}>Fermer</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border border-white/10 bg-scout-dark">
                {(['PROPOSITION', 'CONTACT_LEGAL'] as const).map(t => (
                  <button
                    key={t} type="button"
                    className={`flex-1 py-2.5 text-sm font-semibold transition-all ${type === t ? 'bg-scout-mid text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setType(t)}
                  >
                    {t === 'PROPOSITION' ? '💡 Proposition' : '✉️ Contact'}
                  </button>
                ))}
              </div>

              {type === 'PROPOSITION' && (
                <>
                  <select className="input-scout" value={form.target_game} onChange={handle('target_game')}>
                    <option value="">Jeu concerné (optionnel)</option>
                    {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input className="input-scout" placeholder="Titre de la carte (optionnel)" value={form.title} onChange={handle('title')} />
                </>
              )}

              <textarea
                required
                className="input-scout min-h-[120px] resize-none"
                placeholder={type === 'PROPOSITION' ? 'Décrivez votre idée de carte...' : 'Votre message...'}
                value={form.content}
                onChange={handle('content')}
              />

              <input className="input-scout" placeholder="Votre pseudo (optionnel)" value={form.author_alias} onChange={handle('author_alias')} />
              {type === 'CONTACT_LEGAL' && (
                <input className="input-scout" type="email" placeholder="Votre email (optionnel)" value={form.contact_email} onChange={handle('contact_email')} />
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <p className="text-[11px] text-gray-400 text-center leading-relaxed px-1">
                Projet 100 % indépendant créé pour le fun par des particuliers — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
              </p>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '⏳ Envoi en cours…' : '📨 Envoyer'}
              </button>
            </form>
          )}
      </div>
    </div>
  )
}
