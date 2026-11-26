import { getHubUrl } from '../services/cookies'

interface Props {
  message: string
}

export function BlackoutScreen({ message }: Props) {
  const hubUrl = getHubUrl()
  return (
    <div className="fixed inset-0 z-50 bg-[#0e0a0c] flex items-center justify-center p-6 text-center">
      <div className="glass-card max-w-md w-full p-8 space-y-5 border border-[#8a5629]">
        <div className="text-6xl">⛺</div>
        <h2 className="font-display font-bold text-white text-xl">
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
        <div className="pt-4">
          <a href={hubUrl} className="btn-primary w-full block text-sm font-bold text-center">
            Retour au portail public
          </a>
        </div>
      </div>
    </div>
  )
}
