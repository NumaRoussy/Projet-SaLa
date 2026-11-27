/**
 * components/FaceA/GameCard.tsx
 * Tuile de jeu Face A : aplat #1f2229 avec bordure fine thématique.
 */
import type { GameInfo } from '../../types'

interface Props {
  game: GameInfo
}

const ACCENT_MAP: Record<string, { border: string; text: string }> = {
  infiltre: {
    border: '#2e6f56',
    text: '#7ec4a8',
  },
  couvrefeu: {
    border: '#3b5998',
    text: '#9eb4eb',
  },
  chrono: {
    border: '#9c6631',
    text: '#e0aa75',
  },
}

export function GameCard({ game }: Props) {
  const palette = ACCENT_MAP[game.id] ?? {
    border: game.color,
    text: '#cbd5e1',
  }

  return (
    <a
      href={game.url}
      className="game-link group"
      aria-label={`Jouer à ${game.name}`}
    >
      <div
        className="bg-[#1f2229] rounded-2xl p-5 h-full flex flex-col gap-2.5 border transition-colors hover:bg-[#242830]"
        style={{ borderColor: palette.border }}
      >
        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-[#f3f4f6] text-lg leading-tight">{game.name}</h3>
          {game.badge && (
            <span
              className="shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium border bg-[#16181d]"
              style={{ borderColor: palette.border, color: palette.text }}
            >
              {game.badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm leading-relaxed flex-1">{game.description}</p>

        {/* CTA */}
        <div
          className="flex items-center gap-1.5 text-sm font-semibold mt-auto pt-1"
          style={{ color: palette.text }}
        >
          <span>Jouer</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </a>
  )
}
