/**
 * components/FaceB/index.tsx
 * Volet secret Face B (Espace Maîtrise) : fond noir anthracite (#16181d), accent rouge sobre (#9b2c37).
 */
import { useState } from 'react'
import { SponsorModule } from './SponsorModule'
import { DeviceQR } from './DeviceQR'
import { ReportModule } from './ReportModule'
import { WelcomeGuideModal } from './WelcomeGuideModal'
import { getGameUrl } from '../../services/navigation'
import type { GameInfo } from '../../types'

const FACE_B_GAMES: GameInfo[] = [
  {
    id: 'vachao',
    name: 'Vachao',
    description:
      "Jeu d'ambiance type Picolo réunissant questions passives, intendance et mini-jeux tactiles/défis actifs sur écran.",
    icon: '',
    url: 'https://vachao.scoutgame.ch',
    color: '#2d6394',
    badge: '2-12 joueurs',
    face: 'B',
  },
  {
    id: 'crise',
    name: 'Cellule de crise',
    description:
      "Battle Royale des responsables de camp : survivez à l'audit J+S ! Élimination fatale dès 10.0% de perte.",
    icon: '',
    url: 'https://crise.scoutgame.ch',
    color: '#9b2c37',
    badge: '3-12 joueurs',
    face: 'B',
  },
  {
    id: 'debrief',
    name: 'Débrief',
    description:
      "Vérités de camp, « Je n'ai jamais », « Tu préfères » et confidences d'après-camp entre responsables majeurs.",
    icon: '',
    url: 'https://debrief.scoutgame.ch',
    color: '#b5892e',
    badge: '3-15 joueurs',
    face: 'B',
  },
]

const FACEB_ACCENTS: Record<string, { border: string; text: string }> = {
  vachao: { border: '#2d6394', text: '#8ec2eb' },
  crise: { border: '#9b2c37', text: '#e88c95' },
  debrief: { border: '#b5892e', text: '#e5be6d' },
}

type Tab = 'games' | 'sponsor' | 'device' | 'report'

interface Props {
  devicePass: string
  onClose: () => void
  onLogout: () => void
}

export function FaceB({ devicePass, onClose, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('games')
  const [showGuideModal, setShowGuideModal] = useState(() => {
    try {
      return localStorage.getItem('scout_faceb_guide_seen') !== 'true'
    } catch {
      return true
    }
  })
  const [showReminder, setShowReminder] = useState(() => {
    try {
      return sessionStorage.getItem('faceb_reminder_dismissed') !== 'true'
    } catch {
      return true
    }
  })

  function dismissReminder() {
    try {
      sessionStorage.setItem('faceb_reminder_dismissed', 'true')
    } catch {
      // Safari Private Browsing
    }
    setShowReminder(false)
  }

  const tabs = [
    { id: 'games', label: 'Jeux' },
    { id: 'sponsor', label: 'Parrainer' },
    { id: 'device', label: 'Mon QR' },
    { id: 'report', label: 'Signaler' },
  ] as const

  return (
    <div className="app-container bg-[#16181d] text-[#f3f4f6]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#1f2229] border-b border-[#9b2c37]">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div>
            <h1 className="font-display font-bold text-[#f3f4f6] text-base leading-none">
              Espace Maîtrise
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Réservé aux responsables</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="py-1.5 px-2.5 text-xs rounded-lg text-slate-200 border border-[#2e323c] bg-[#16181d] hover:border-[#9b2c37] transition-colors"
              title="Ouvrir le guide et la charte de fonctionnement"
            >
              <span className="hidden sm:inline">Fonctionnement &amp; Charte</span>
              <span className="sm:hidden">Charte</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 text-xs font-semibold rounded-lg text-slate-200 hover:text-[#f3f4f6] border border-[#2e323c] bg-[#16181d] hover:bg-[#262a33]"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 overflow-x-auto pb-0 max-w-lg mx-auto">
          {tabs.map(t => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-[#f3f4f6] border-[#9b2c37] bg-[#16181d]'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-8 flex-1 w-full">
        {showReminder && (
          <div className="p-4 rounded-2xl bg-[#1f2229] border border-[#9b2c37] text-slate-200 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[#e88c95] font-bold text-xs uppercase tracking-wide">
                18+ &amp; Hors responsabilité de jeunes
              </div>
              <button
                type="button"
                onClick={dismissReminder}
                className="text-slate-300 hover:text-[#f3f4f6] text-xs px-2 py-0.5 rounded bg-[#16181d] border border-[#2e323c]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Espace réservé aux responsables majeurs en cadre privé (jamais en public, attention à l'image scoute). Prenez soin de votre santé, de votre consommation et veillez les uns sur les autres.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={dismissReminder}
                className="btn-danger py-1.5 px-4 text-xs font-semibold"
              >
                Compris
              </button>
            </div>
          </div>
        )}

        {tab === 'games' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-secret">Maîtrise uniquement</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {FACE_B_GAMES.map(game => {
                const pal = FACEB_ACCENTS[game.id] ?? {
                  border: game.color,
                  text: '#e88c95',
                }
                return (
                  <a
                    key={game.id}
                    href={getGameUrl(game.id, game.url)}
                    className="game-link group"
                    aria-label={`Jouer à ${game.name}`}
                  >
                    <div
                      className="bg-[#1f2229] rounded-2xl p-5 flex flex-col gap-2.5 border transition-colors hover:bg-[#242830]"
                      style={{ borderColor: pal.border }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display font-bold text-[#f3f4f6] text-lg leading-tight">{game.name}</h3>
                        {game.badge && (
                          <span
                            className="shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-medium bg-[#16181d]"
                            style={{ borderColor: pal.border, color: pal.text }}
                          >
                            {game.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{game.description}</p>
                      <p
                        className="text-xs mt-1 font-semibold flex items-center gap-1"
                        style={{ color: pal.text }}
                      >
                        Jouer <span className="transition-transform group-hover:translate-x-1">→</span>
                      </p>
                    </div>
                  </a>
                )
              })}
            </div>
          </>
        )}

        {tab === 'sponsor' && <SponsorModule devicePass={devicePass} />}
        {tab === 'device' && <DeviceQR devicePass={devicePass} />}
        {tab === 'report' && <ReportModule />}
      </main>

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      <footer className="mt-auto px-4 py-6 border-t border-[#2e323c] bg-[#1f2229]">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost w-full text-sm text-slate-300 hover:text-[#f3f4f6] hover:border-[#2e323c]"
          >
            ← Revenir à la vitrine publique
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-red-300 transition-colors py-1"
          >
            Réinitialiser cet appareil
          </button>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed mt-2 border-t border-[#2e323c] pt-3">
            Projet 100 % indépendant créé pour le fun par des particuliers. Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
          </p>
        </div>
      </footer>

      {showGuideModal && (
        <WelcomeGuideModal onClose={() => setShowGuideModal(false)} />
      )}
    </div>
  )
}
