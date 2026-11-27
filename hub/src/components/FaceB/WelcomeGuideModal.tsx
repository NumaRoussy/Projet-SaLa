/**
 * components/FaceB/WelcomeGuideModal.tsx
 * Guide d'accueil et charte de responsabilité de l'Espace Maîtrise (18+).
 */
interface Props {
  onClose: () => void
}

export function WelcomeGuideModal({ onClose }: Props) {
  function handleClose() {
    try {
      localStorage.setItem('scout_faceb_guide_seen', 'true')
    } catch {
      // Safari Private Browsing
    }
    onClose()
  }

  return (
    <div
      className="overlay flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-[#1f2229] border border-[#2e323c] w-full max-w-lg rounded-b-none sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 space-y-5 max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-[#2e323c] rounded-full mx-auto sm:hidden" />

        <div className="text-center space-y-2 pb-2 border-b border-[#9b2c37]">
          <h2 className="font-display font-bold text-[#f1f5f9] text-xl sm:text-2xl">
            Bienvenue dans l'Espace Maîtrise{' '}
            <span className="text-[#f1f5f9] text-sm font-sans font-bold bg-[#9b2c37] px-2 py-0.5 rounded-full">
              18+
            </span>
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Guide de fonctionnement, de sécurité et charte d'utilisation
          </p>
        </div>

        {/* 4 Points structurés */}
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#2e323c] space-y-1">
            <div className="font-bold text-[#f1f5f9] text-sm">
              Pour le fun &amp; 100 % indépendant
            </div>
            <p className="text-[#94a3b8]">
              Créé par des particuliers, sans aucun lien avec l'ASVd, le MSdS, J+S ou toute autre organisation.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#2e323c] space-y-1">
            <div className="font-bold text-[#f1f5f9] text-sm">
              Charte 18+ &amp; Image scoute
            </div>
            <p className="text-[#94a3b8]">
              Réservé aux majeurs hors responsabilité de jeunes. Ne jouez jamais en public ni en chemise scoute. Prenez soin de votre santé, de votre consommation et des autres.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#2e323c] space-y-1">
            <div className="font-bold text-[#f1f5f9] text-sm">
              Partager l'accès (QR 120s)
            </div>
            <p className="text-[#94a3b8]">
              Le partage par QR code de 120 secondes vous évite de devoir prouver votre identité de manière contraignante. En contrepartie, vous êtes responsable des personnes que vous parrainez : en cas d'abus, nous devrons sécuriser l'accès de façon plus stricte ou fermer cette partie du site.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#9b2c37] space-y-1">
            <div className="font-bold text-[#f1f5f9] text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#9b2c37] shrink-0" />
              <span>Couper une fuite (Sciage de branche)</span>
            </div>
            <p className="text-[#94a3b8]">
              Si un mineur a obtenu l'accès, vous pouvez scanner le QR de son téléphone ou, plus simplement, <strong className="text-[#f1f5f9]">scanner directement le nœud de la personne qui a donné l'accès</strong> via « Signaler un appareil ». Cela résiliera récursivement tous les accès qu'elle a distribués (quitte à la re-parrainer ensuite pour lui redonner un accès propre juste pour elle).
            </p>
          </div>

          <details className="group rounded-2xl bg-[#16181d] border border-[#2e323c] overflow-hidden" open>
            <summary className="flex items-center justify-between p-3.5 cursor-pointer list-none select-none text-xs font-bold text-[#f1f5f9]">
              <span>Rappel du geste secret d'accès</span>
              <span className="text-[#94a3b8] text-[10px] transform group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[#2e323c]">
              <p className="text-[#94a3b8] text-xs leading-relaxed font-medium">
                Accès Maîtrise : pour les chefs déjà autorisés, touchez 3 fois rapidement le copyright tout en bas du site.
              </p>
            </div>
          </details>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3 px-5 rounded-lg font-semibold text-sm bg-[#9b2c37] hover:bg-[#b03440] text-[#f1f5f9] border border-[#9b2c37] active:scale-[0.98] transition-colors cursor-pointer mt-2"
        >
          J'ai compris, entrer dans l'Espace Maîtrise
        </button>
      </div>
    </div>
  )
}
