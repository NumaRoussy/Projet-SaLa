/**
 * components/FaceB/index.tsx
 * Volet secret Face B — Espace Maîtrise — fond bordeaux très foncé uni (#211013).
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
    icon: '🐮',
    url: 'https://vachao.scoutgame.ch',
    color: '#2b5b84',
    badge: '2–12 joueurs',
    face: 'B',
  },
  {
    id: 'crise',
    name: 'Cellule de crise',
    description:
      "Battle Royale des responsables de camp : survivez à l'audit J+S ! Élimination fatale dès 10.0% de perte.",
    icon: '🚨',
    url: 'https://crise.scoutgame.ch',
    color: '#8c2d38',
    badge: '3–12 joueurs',
    face: 'B',
  },
  {
    id: 'debrief',
    name: 'Débrief',
    description:
      "Vérités de camp, « Je n'ai jamais », « Tu préfères » et confidences d'après-camp entre responsables majeurs.",
    icon: '🔥',
    url: 'https://debrief.scoutgame.ch',
    color: '#8a5629',
    badge: '3–15 joueurs',
    face: 'B',
  },
]

const FACEB_ACCENTS: Record<string, { border: string; iconBg: string; text: string }> = {
  vachao: { border: '#2b5b84', iconBg: '#192a3b', text: '#8ec2eb' },
  crise: { border: '#8c2d38', iconBg: '#3a181e', text: '#eb9ba4' },
  debrief: { border: '#8a5629', iconBg: '#332114', text: '#e5b382' },
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
    { id: 'games', label: '🎲 Jeux' },
    { id: 'sponsor', label: '🤝 Parrainer' },
    { id: 'device', label: '📱 Mon QR' },
    { id: 'report', label: '🚨 Signaler' },
  ] as const

  return (
    <div className="app-container bg-[#211013] text-[#f3f4f6]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#1b0d10] border-b border-[#422026]">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <div>
              <h1 className="font-display font-bold text-[#f3f4f6] text-base leading-none">
                Espace Maîtrise
              </h1>
              <p className="text-xs text-[#b89298] mt-0.5">Réservé aux responsables</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="py-1 px-2.5 text-xs rounded-lg text-[#e5b382] border border-[#8a5629] bg-[#2c161a] hover:bg-[#381d22] flex items-center gap-1.5 transition-colors"
              title="Ouvrir le guide et la charte de fonctionnement"
            >
              <span>ℹ️</span>
              <span className="hidden sm:inline">Fonctionnement &amp; Charte</span>
              <span className="sm:hidden">Charte</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 text-sm rounded-lg text-gray-300 hover:text-white border border-[#422026] bg-[#2c161a]"
            >
              ✕ Fermer
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
                  ? 'text-[#e5b382] border-[#8a5629] bg-[#2c161a]'
                  : 'text-[#a38187] border-transparent hover:text-gray-200'
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
          <div className="p-4 rounded-2xl bg-[#2c161a] border border-[#8a5629] text-gray-200 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-[#e5b382] font-bold text-xs uppercase tracking-wide">
                <span className="text-base">🔞</span>
                <span>18+ &amp; Hors responsabilité de jeunes</span>
              </div>
              <button
                type="button"
                onClick={dismissReminder}
                className="text-gray-300 hover:text-white text-xs px-2 py-0.5 rounded bg-[#3a1d22]"
              >
                ✕
              </button>
            </div>
            <p className="text-xs leading-relaxed text-gray-300">
              Espace réservé aux responsables majeurs en cadre privé (jamais en public, attention à l'image scoute). Prenez soin de votre santé, de votre consommation et veillez les uns sur les autres.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={dismissReminder}
                className="btn-amber py-1.5 px-4 text-xs font-bold"
              >
                Compris
              </button>
            </div>
          </div>
        )}

        {tab === 'games' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-secret">⚠️ Maîtrise uniquement</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {FACE_B_GAMES.map(game => {
                const pal = FACEB_ACCENTS[game.id] ?? {
                  border: game.color,
                  iconBg: '#211013',
                  text: '#eb9ba4',
                }
                return (
                  <a
                    key={game.id}
                    href={getGameUrl(game.id, game.url)}
                    className="game-link group"
                    aria-label={`Jouer à ${game.name}`}
                  >
                    <div
                      className="bg-[#2c161a] rounded-2xl p-5 flex gap-4 border transition-colors"
                      style={{ borderColor: pal.border }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
                        style={{ backgroundColor: pal.iconBg, borderColor: pal.border }}
                      >
                        {game.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-display font-bold text-[#f3f4f6]">{game.name}</h3>
                          {game.badge && (
                            <span
                              className="shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium"
                              style={{ backgroundColor: pal.iconBg, borderColor: pal.border, color: pal.text }}
                            >
                              {game.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[#c9b0b4] text-sm leading-relaxed">{game.description}</p>
                        <p
                          className="text-xs mt-2 font-semibold flex items-center gap-1"
                          style={{ color: pal.text }}
                        >
                          Jouer <span className="transition-transform group-hover:translate-x-1">→</span>
                        </p>
                      </div>
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
      <footer className="mt-auto px-4 py-6 border-t border-[#422026] bg-[#1b0d10]">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost w-full text-sm text-gray-300 hover:text-white hover:border-[#422026]"
          >
            ← Revenir à la vitrine publique
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-[#a38187] hover:text-red-300 transition-colors py-1"
          >
            Réinitialiser cet appareil
          </button>
          <p className="text-[11px] text-[#9c7b80] text-center leading-relaxed mt-2 border-t border-[#422026] pt-3">
            Projet 100 % indépendant créé pour le fun par des particuliers — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
          </p>
        </div>
      </footer>

      {showGuideModal && (
        <WelcomeGuideModal onClose={() => setShowGuideModal(false)} />
      )}
    </div>
  )
}
