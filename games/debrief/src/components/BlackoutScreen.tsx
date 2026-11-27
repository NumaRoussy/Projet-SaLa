import { getHubUrl } from '../services/cookies'

interface Props {
  message: string
}

export function BlackoutScreen({ message }: Props) {
  const hubUrl = getHubUrl()
  return (
    <div className="fixed inset-0 z-50 bg-[#16181d] flex items-center justify-center p-6 text-center">
      <div className="glass-card max-w-md w-full p-8 space-y-5 border border-[#b5892e]">
        <h2 className="font-display font-bold text-[#f3f4f6] text-xl">
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
        <div className="pt-4">
          <a href={hubUrl} className="btn-primary w-full block text-sm font-semibold text-center">
            Retour au portail public
          </a>
        </div>
      </div>
    </div>
  )
}
