/**
 * components/FaceA/index.tsx
 * Vitrine publique — Face A — Le Cheval de Troie (section 1.3 & 7).
 * Aucune trace de la Face B, aucun bouton de connexion visible.
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
    description: 'Jeu de rôle et de déduction : identifiez les agents ennemis infiltrés dans votre patrouille avant qu\'ils ne sabotent la mission.',
    icon: '🕵️',
    url: 'https://infiltre.scoutgame.ch',
    color: '#74c69d',
    badge: '3–10 joueurs',
    face: 'A',
  },
  {
    id: 'rondedenuit',
    name: 'Ronde de Nuit',
    description: 'Grand jeu de nuit et mystère autour du campement scout vaudois. Élucidez les énigmes nocturnes sous la voûte céleste entre patrouilles.',
    icon: '🌙',
    url: 'https://rondedenuit.scoutgame.ch',
    color: '#e9c46a',
    badge: '4–12 joueurs',
    face: 'A',
  },
  {
    id: 'chrono',
    name: 'Chrono',
    description: 'Série de défis chronométrés à relever en équipe. Rapidité, précision et coordination seront vos meilleures armes.',
    icon: '⏱️',
    url: 'https://chrono.scoutgame.ch',
    color: '#f4a261',
    badge: '2–8 joueurs',
    face: 'A',
  },
]

interface Props {
  footerProps: Record<string, unknown>
}

export function FaceA({ footerProps }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="app-container bg-scout-gradient">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="pt-8 pb-6 px-5 text-center">
        {/* Logo */}
        <div className="inline-block mb-5">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-scout-mid/10 blur-xl scale-150" />
            {/* Badge circle */}
            <div className="relative w-24 h-24 mx-auto rounded-full flex items-center justify-center
                            bg-gradient-to-br from-scout-forest to-scout-green
                            border-2 border-scout-mid/40 shadow-2xl shadow-black/50">
              <span className="text-4xl select-none">⚜️</span>
            </div>
          </div>
        </div>

        <h1 className="font-display font-extrabold text-3xl text-white mb-2 tracking-tight">
          Scout Game
        </h1>
        <p className="text-scout-sage/80 text-base max-w-xs mx-auto leading-relaxed">
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
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 px-1">
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
      <footer className="px-5 py-6 text-center border-t border-white/5">
        <div className="max-w-lg mx-auto space-y-3">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            💡 Proposer une carte ou signalement légal
          </button>
          <p className="text-[11px] text-gray-500 leading-relaxed px-4">
            Projet 100 % indépendant créé pour le fun par des particuliers — Non affilié à l'ASVd, au MSdS, à J+S ou à toute autre organisation.
          </p>
          <p
            className="text-xs text-gray-600 select-none pt-1"
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
