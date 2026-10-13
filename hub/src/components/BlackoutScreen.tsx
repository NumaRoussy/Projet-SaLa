/**
 * components/BlackoutScreen.tsx
 * Affichage du message officiel pendant la période de camp (section 2.4).
 */
interface Props {
  message: string
  onClose: () => void
}

export function BlackoutScreen({ message, onClose }: Props) {
  return (
    <div className="overlay flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="glass-card max-w-md w-full p-8 text-center animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-6">⛺</div>

        <h2 className="font-display font-bold text-white text-xl mb-4">
          Période de camp scoute
        </h2>

        <p className="text-gray-300 leading-relaxed text-sm">
          {message || (
            <>
              Période des camps scouts en cours. L'espace festif est temporairement suspendu.
              <br /><br />
              Nos valeurs imposent une sobriété absolue auprès des jeunes. Bon camp à vos patrouilles, rendez-vous à la rentrée !
            </>
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-3 justify-center text-scout-sage/60 text-xs">
            <div className="h-px flex-1 bg-scout-sage/10" />
            <span>Valeurs scoutes</span>
            <div className="h-px flex-1 bg-scout-sage/10" />
          </div>
          <div className="flex justify-center gap-6 text-2xl">
            <span title="Service">🤝</span>
            <span title="Honnêteté">🌿</span>
            <span title="Fraternité">⚜️</span>
          </div>
        </div>

        <button className="btn-ghost mt-6 text-sm" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  )
}
