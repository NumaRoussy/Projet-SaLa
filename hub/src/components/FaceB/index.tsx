/**
 * components/FaceB/index.tsx
 * Volet secret Face B — Espace Maîtrise — déployé via l'Easter egg (section 7.4).
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
    id: 'carnotzet',
    name: 'Carnotzet',
    description: 'Duels épiques, votes à main levée et règles festives pour vos week-ends de maîtrise et carnotzets à Froideville.',
    icon: '🍺',
    url: 'https://carnotzet.scoutgame.ch',
    color: '#f4a261',
    badge: '3–12 joueurs',
    face: 'B',
  },
  {
    id: 'debout',
    name: 'Debout',
    description: 'Réflexes, défis chronométrés et duels physiques entre responsables. Le plus lent ou le moins agile… boit !',
    icon: '⚡',
    url: 'https://debout.scoutgame.ch',
    color: '#e9c46a',
    badge: '2–8 joueurs',
    face: 'B',
  },
  {
    id: 'debrief',
    name: 'Débrief',
    description: 'Vérités de camp, « je n\'ai jamais » et confidences d\'après-camp. Pour débriefer entre responsables.',
    icon: '🔥',
    url: 'https://debrief.scoutgame.ch',
    color: '#e76f51',
    badge: '4–15 joueurs',
    face: 'B',
  },
]

type Tab = 'games' | 'sponsor' | 'device' | 'report'

interface Props {
  devicePass: string
  onClose: () => void
  onLogout: () => void
}

export function FaceB({ devicePass, onClose, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('games')
  const [showGuideModal, setShowGuideModal] = useState(() => {
    return localStorage.getItem('scout_faceb_guide_seen') !== 'true'
  })
  const [showReminder, setShowReminder] = useState(() => {
    return sessionStorage.getItem('faceb_reminder_dismissed') !== 'true'
  })

  function dismissReminder() {
    sessionStorage.setItem('faceb_reminder_dismissed', 'true')
    setShowReminder(false)
  }

  const tabs = [
    { id: 'games',   label: '🎲 Jeux',     },
    { id: 'sponsor', label: '🤝 Parrainer' },
    { id: 'device',  label: '📱 Mon QR'    },
    { id: 'report',  label: '🚨 Signaler'  },
  ] as const

  return (
    <div className="app-container bg-faceb-gradient min-h-[100dvh] flex flex-col animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-scout-night/80 border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <div>
              <h1 className="font-display font-bold text-white text-base leading-none">
                Espace Maîtrise
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Réservé aux responsables</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuideModal(true)}
              className="btn-ghost py-1 px-2.5 text-xs text-scout-amber border border-scout-amber/30 hover:bg-scout-amber/10 flex items-center gap-1.5 transition-colors"
              title="Ouvrir le guide et la charte de fonctionnement"
            >
              <span>ℹ️</span>
              <span className="hidden sm:inline">Fonctionnement & Charte</span>
              <span className="sm:hidden">Charte</span>
            </button>
            <button onClick={onClose} className="btn-ghost py-1.5 px-3 text-sm">
              ✕ Fermer
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 overflow-x-auto pb-0 max-w-lg mx-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                tab === t.id
                  ? 'text-scout-amber border-scout-amber bg-scout-amber/5'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-8 flex-1 w-full">
        {/* Rappel à l'entrée de l'Espace Maîtrise (Point 1C) */}
        {showReminder && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2.5 animate-fade-in shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                <span className="text-base">🔞</span>
                <span>18+ & Hors responsabilité de jeunes</span>
              </div>
              <button
                onClick={dismissReminder}
                className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/10"
              >
                ✕
              </button>
            </div>
            <p className="text-xs leading-relaxed text-gray-200">
              Espace réservé aux responsables majeurs en cadre privé (jamais en public, attention à l'image scoute). Prenez soin de votre santé, de votre consommation et veillez les uns sur les autres.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                onClick={dismissReminder}
                className="btn-amber py-1.5 px-4 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                Compris
              </button>
            </div>
          </div>
        )}
        {/* Tab: Jeux B */}
        {tab === 'games' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-secret">⚠️ Maîtrise uniquement</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {FACE_B_GAMES.map(game => (
                <a
                  key={game.id}
                  href={getGameUrl(game.id, game.url)}
                  className="game-link group"
                  aria-label={`Jouer à ${game.name}`}
                >
                  <div className="glass-card p-5 flex gap-4 border border-white/5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${game.color}20`, border: `1px solid ${game.color}30` }}
                    >
                      {game.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-display font-bold text-white">{game.name}</h3>
                        {game.badge && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${game.color}20`, color: game.color }}>
                            {game.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">{game.description}</p>
                      <p className="text-xs mt-2 font-semibold flex items-center gap-1"
                        style={{ color: game.color }}>
                        Jouer <span className="transition-transform group-hover:translate-x-1">→</span>
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* Tab: Parrainer */}
        {tab === 'sponsor' && <SponsorModule devicePass={devicePass} />}

        {/* Tab: Mon QR */}
        {tab === 'device' && <DeviceQR devicePass={devicePass} />}

        {/* Tab: Signaler */}
        {tab === 'report' && <ReportModule />}
      </main>

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      <footer className="mt-auto px-4 py-6 border-t border-white/5 bg-scout-night/60">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <button
            onClick={onClose}
            className="btn-ghost w-full text-sm text-gray-400 hover:text-white"
          >
            ← Revenir à la vitrine publique
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors py-1"
          >
            Réinitialiser cet appareil
          </button>
          <p className="text-[11px] text-gray-500 text-center leading-relaxed mt-2 border-t border-white/5 pt-3">
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
