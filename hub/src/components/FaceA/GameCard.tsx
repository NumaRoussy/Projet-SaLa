/**
 * components/FaceA/GameCard.tsx
 * Carte de jeu Face A — renvoie vers un sous-domaine scoutgame.ch
 */
import type { GameInfo } from '../../types'

interface Props {
  game: GameInfo
}

export function GameCard({ game }: Props) {
  return (
    <a
      href={game.url}
      className="game-link group"
      aria-label={`Jouer à ${game.name}`}
    >
      <div className="glass-card p-5 h-full flex flex-col gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110"
          style={{ background: `${game.color}20`, border: `1px solid ${game.color}30` }}
        >
          {game.icon}
        </div>

        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-white text-lg leading-tight">{game.name}</h3>
          {game.badge && (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${game.color}20`, color: game.color }}>
              {game.badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm leading-relaxed flex-1">{game.description}</p>

        {/* CTA */}
        <div className="flex items-center gap-1.5 text-sm font-semibold mt-auto pt-1"
          style={{ color: game.color }}>
          <span>Jouer</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </a>
  )
}
