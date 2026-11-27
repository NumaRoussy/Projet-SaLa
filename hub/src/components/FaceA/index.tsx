/**
 * components/FaceA/index.tsx
 * Vitrine publique Face A : Fond noir anthracite (#16181d), accent vert forêt sobre (#2e6f56).
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
      "Jeu d'enquête à la Mister White : chacun reçoit un mot secret sauf l'intrus, démasquez-le avant qu'il ne vous bluffe.",
    icon: '',
    url: 'https://infiltre.scoutgame.ch',
    color: '#2e6f56',
    badge: 'À partir de 3 joueurs',
    face: 'A',
  },
  {
    id: 'couvrefeu',
    name: 'Couvre-feu',
    description:
      'Un Loup-Garou revisité au campement : survivez aux coups en douce de la maîtrise et démasquez les saboteurs au rassemblement.',
    icon: '',
    url: 'https://couvrefeu.scoutgame.ch',
    color: '#3b5998',
    badge: '8-20 joueurs',
    face: 'A',
  },
  {
    id: 'chrono',
    name: 'Chrono',
    description:
      "Un Time's Up! en trois manches avec le même paquet de mots : décrire librement, un seul mot, puis mimer.",
    icon: '',
    url: 'https://chrono.scoutgame.ch',
    color: '#9c6631',
    badge: '4-12 joueurs',
    face: 'A',
  },
]

interface Props {
  footerProps: Record<string, unknown>
}

export function FaceA({ footerProps }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="app-container bg-[#16181d]">
      {/* Liseré supérieur discret */}
      <div className="h-1 w-full bg-[#2e6f56]" />

      {/* Hero */}
      <header className="pt-8 pb-6 px-5 text-center">
        <div className="inline-block mb-4">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center
                       bg-[#1f2229] border border-[#2e6f56] select-none"
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-9 h-9"
              aria-hidden="true"
            >
              {/* Fleur de lys scoute emblème Scout Game */}
              <path
                d="M32 7C27.5 14 25.5 21.5 28 29.5C29.3 33.5 31 36.5 32 39C33 36.5 34.7 33.5 36 29.5C38.5 21.5 36.5 14 32 7Z"
                fill="#f3f4f6"
              />
              <path
                d="M27.5 36.5C21.5 35.5 15 31.5 13 24.5C11.8 20.5 14 16.5 18 16.5C22 16.5 24 20.5 22.8 24C21.8 26.8 19.5 27.5 18.2 26.8C19.5 29.8 23.2 31.8 28.5 32.5L27.5 36.5Z"
                fill="#7ec4a8"
              />
              <path
                d="M36.5 36.5C42.5 35.5 49 31.5 51 24.5C52.2 20.5 50 16.5 46 16.5C42 16.5 40 20.5 41.2 24C42.2 26.8 44.5 27.5 45.8 26.8C44.5 29.8 40.8 31.8 35.5 32.5L36.5 36.5Z"
                fill="#7ec4a8"
              />
              <rect x="23" y="38.5" width="18" height="4" rx="2" fill="#f3f4f6" />
              <path
                d="M28 43.5H36L34.5 53C33.8 55 32.8 56 32 56C31.2 56 30.2 55 29.5 53L28 43.5Z"
                fill="#7ec4a8"
              />
              <path
                d="M26 44C23.5 47 21 49.5 17.5 50.5C20 52 24 51.5 27.5 47.5L26 44Z"
                fill="#f3f4f6"
              />
              <path
                d="M38 44C40.5 47 43 49.5 46.5 50.5C44 52 40 51.5 36.5 47.5L38 44Z"
                fill="#f3f4f6"
              />
            </svg>
          </div>
        </div>

        <h1 className="font-display font-extrabold text-3xl text-[#f3f4f6] mb-2 tracking-tight">
          Scout Game
        </h1>
        <p className="text-slate-400 text-base max-w-xs mx-auto leading-relaxed">
          Jeux d'animation scoute : séances, réunions &amp; camps
        </p>

        {/* Players manager */}
        <div className="mt-5 flex justify-center">
          <div className="max-w-xs w-full text-left">
            <PlayersManager />
          </div>
        </div>
      </header>

      {/* Games grid */}
      <main className="flex-1 px-4 pb-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 px-1">
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

      {/* Footer */}
      <footer className="px-5 py-6 text-center border-t border-[#2e323c] bg-[#1f2229]">
        <div className="max-w-lg mx-auto space-y-3">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#b5892e] bg-[#16181d] hover:bg-[#262a33] text-xs font-semibold text-[#f3f4f6] transition-colors"
          >
            <span>💡</span>
            <span>Proposer une carte ou signalement légal</span>
          </button>
          <p className="text-[11px] text-slate-400 leading-relaxed px-4">
            Projet 100 % indépendant créé pour le fun par des particuliers. Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
          </p>
          <p
            className="text-xs text-slate-500 select-none pt-1"
            {...footerProps}
            title=""
          >
            © {new Date().getFullYear()} Scout Game · scoutgame.ch
          </p>
        </div>
      </footer>

      {/* Feedback modal */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}
