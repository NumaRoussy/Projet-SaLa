/**
 * components/BlackoutScreen.tsx
 * Affichage du message officiel pendant la période de camp.
 */
interface Props {
  message: string
  onClose: () => void
}

export function BlackoutScreen({ message, onClose }: Props) {
  return (
    <div className="overlay flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-[#1f2229] border border-[#2e6f56] rounded-2xl max-w-md w-full p-8 text-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display font-bold text-[#f3f4f6] text-xl mb-4">
          Période de camp scoute
        </h2>

        <p className="text-slate-300 leading-relaxed text-sm">
          {message || (
            <>
              Période des camps scouts en cours. L'espace festif est temporairement suspendu.
              <br /><br />
              Nos valeurs imposent une sobriété absolue auprès des jeunes. Bon camp à vos patrouilles, rendez-vous à la rentrée !
            </>
          )}
        </p>

        <div className="mt-8 flex items-center gap-3 justify-center text-slate-400 text-xs">
          <div className="h-px flex-1 bg-[#2e323c]" />
          <span>Service · Honnêteté · Fraternité</span>
          <div className="h-px flex-1 bg-[#2e323c]" />
        </div>

        <button className="btn-ghost mt-6 text-sm" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  )
}
