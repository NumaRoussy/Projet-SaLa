/**
 * components/FaceA/index.tsx
 * Vitrine publique — Face A — Fond vert forêt foncé uni (#0f1f18).
 */
import { useState } from 'react'
import { GameCard } from './GameCard'
import { FeedbackModal } from './FeedbackModal'
import { PlayersManager } from './PlayersManager'
import { getGameUrl } from '../../services/navigation'
import type { GameInfo } from '../../types'

const FACE_A_GAMES: GameInfo[] = [
  {
    id: 'infiltre',
    name: "L'Infiltré",
    description:
      "Jeu de rôle et de déduction : identifiez les agents ennemis infiltrés dans votre patrouille avant qu'ils ne sabotent la mission.",
    icon: '🕵️',
    url: 'https://infiltre.scoutgame.ch',
    color: '#2d6a4f',
    badge: 'À partir de 3 joueurs',
    face: 'A',
  },
  {
    id: 'couvrefeu',
    name: 'Couvre-feu',
    description:
      "Jeu de déduction et de rôles secrets au camp scout : démasquez les Responsables qui rôdent après l'extinction des feux avant qu'ils ne vident les tentes !",
    icon: '⛺',
    url: 'https://couvrefeu.scoutgame.ch',
    color: '#3b4f8c',
    badge: '8–20 joueurs',
    face: 'A',
  },
  {
    id: 'chrono',
    name: 'Chrono',
    description:
      'Série de défis chronométrés à relever en équipe. Rapidité, précision et coordination seront vos meilleures armes.',
    icon: '⏱️',
    url: 'https://chrono.scoutgame.ch',
    color: '#855a2b',
    badge: '4–12 joueurs',
    face: 'A',
  },
]

interface Props {
  footerProps: Record<string, unknown>
}

export function FaceA({ footerProps }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="app-container bg-[#0f1f18]">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="pt-8 pb-6 px-5 text-center">
        <div className="inline-block mb-5">
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center
                       bg-[#162920] border border-[#2d6a4f] select-none"
          >
            <span className="text-4xl select-none">⚜️</span>
          </div>
        </div>

        <h1 className="font-display font-extrabold text-3xl text-[#f3f4f6] mb-2 tracking-tight">
          Scout Game
        </h1>
        <p className="text-[#a3c9b4] text-base max-w-xs mx-auto leading-relaxed">
          Jeux d'animation scoute — séances, réunions &amp; camps
        </p>

        {/* Players manager */}
        <div className="mt-5 flex justify-center">
          <div className="max-w-xs w-full text-left">
            <PlayersManager />
          </div>
        </div>
      </header>

      {/* ── Games grid ─────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 pb-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xs font-semibold text-[#8bb39d] uppercase tracking-widest mb-4 px-1">
            Jeux disponibles
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {FACE_A_GAMES.map(game => (
              <GameCard
                key={game.id}
                game={{ ...game, url: getGameUrl(game.id, game.url) }}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-5 py-6 text-center border-t border-[#1e3a2d]">
        <div className="max-w-lg mx-auto space-y-3">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="text-xs text-[#9cb8a8] hover:text-white transition-colors"
          >
            💡 Proposer une carte ou signalement légal
          </button>
          <p className="text-[11px] text-[#83a190] leading-relaxed px-4">
            Projet 100 % indépendant créé pour le fun par des particuliers — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
          </p>
          <p
            className="text-xs text-[#6e8c7b] select-none pt-1"
            {...footerProps}
            title=""
          >
            © {new Date().getFullYear()} Scout Game — scoutgame.ch
          </p>
        </div>
      </footer>

      {/* ── Feedback modal ─────────────────────────────────────────────────── */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}
