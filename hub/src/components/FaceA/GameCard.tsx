/**
 * components/FaceA/GameCard.tsx
 * Tuile de jeu Face A — aplat #162920 avec bordure fine thématique.
 */
import type { GameInfo } from '../../types'

interface Props {
  game: GameInfo
}

const ACCENT_MAP: Record<string, { border: string; iconBg: string; badgeBg: string; text: string }> = {
  infiltre: {
    border: '#2d6a4f',
    iconBg: '#1d3c2e',
    badgeBg: '#1d3c2e',
    text: '#8fd4b0',
  },
  couvrefeu: {
    border: '#3b4f8c',
    iconBg: '#1d2b45',
    badgeBg: '#1d2b45',
    text: '#9eb4eb',
  },
  chrono: {
    border: '#855a2b',
    iconBg: '#2c2217',
    badgeBg: '#2c2217',
    text: '#deb07a',
  },
}

export function GameCard({ game }: Props) {
  const palette = ACCENT_MAP[game.id] ?? {
    border: game.color,
    iconBg: '#1d352a',
    badgeBg: '#1d352a',
    text: '#a3c9b4',
  }

  return (
    <a
      href={game.url}
      className="game-link group"
      aria-label={`Jouer à ${game.name}`}
    >
      <div
        className="bg-[#162920] rounded-2xl p-5 h-full flex flex-col gap-3 border transition-colors"
        style={{ borderColor: palette.border }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
          style={{ backgroundColor: palette.iconBg, borderColor: palette.border }}
        >
          {game.icon}
        </div>

        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-[#f3f4f6] text-lg leading-tight">{game.name}</h3>
          {game.badge && (
            <span
              className="shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium border"
              style={{ backgroundColor: palette.badgeBg, borderColor: palette.border, color: palette.text }}
            >
              {game.badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-[#b3c5ba] text-sm leading-relaxed flex-1">{game.description}</p>

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
