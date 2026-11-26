/**
 * components/FaceB/WelcomeGuideModal.tsx
 * Guide d'accueil et charte de responsabilité de l'Espace Maîtrise (18+).
 * S'affiche à la première ouverture ou à la demande via le bouton « ℹ️ Fonctionnement & Charte ».
 */
interface Props {
  onClose: () => void
}

export function WelcomeGuideModal({ onClose }: Props) {
  function handleClose() {
    try {
      localStorage.setItem('scout_faceb_guide_seen', 'true')
    } catch {
      // Safari Private Browsing — silently ignore
    }
    onClose()
  }

  return (
    <div
      className="overlay flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-[#2c161a] border border-[#8a5629] w-full max-w-lg rounded-b-none sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 space-y-5 max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-[#52272f] rounded-full mx-auto sm:hidden" />

        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#211013] border border-[#8a5629] text-2xl mb-1">
            🔒
          </div>
          <h2 className="font-display font-bold text-white text-xl sm:text-2xl">
            Bienvenue dans l'Espace Maîtrise <span className="text-[#e5b382] text-sm font-sans font-bold bg-[#211013] px-2 py-0.5 rounded-full border border-[#8a5629]">18+</span>
          </h2>
          <p className="text-xs text-[#c9b0b4]">
            Guide de fonctionnement, de sécurité et charte d'utilisation
          </p>
        </div>

        {/* 4 Points structurés */}
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-[#211013] border border-[#422026] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#8fd4b0] text-sm">
              <span>🎯</span>
              <span>Pour le fun &amp; 100 % indépendant</span>
            </div>
            <p className="text-gray-300">
              Créé par des particuliers, sans aucun lien avec l'ASVd, le MSdS, J+S ou toute autre organisation.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#211013] border border-[#8a5629] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#e5b382] text-sm">
              <span>🍻</span>
              <span>Charte 18+ &amp; Image scoute</span>
            </div>
            <p className="text-gray-300">
              Réservé aux majeurs hors responsabilité de jeunes. Ne jouez jamais en public ni en chemise scoute. Prenez soin de votre santé, de votre consommation et des autres.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#211013] border border-[#2b5b84] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#8ec2eb] text-sm">
              <span>🤝</span>
              <span>Partager l'accès (QR 120s)</span>
            </div>
            <p className="text-gray-300">
              Le partage par QR code de 120 secondes vous évite de devoir prouver votre identité de manière contraignante. En contrepartie, vous êtes responsable des personnes que vous parrainez : en cas d'abus, nous devrons sécuriser l'accès de façon plus stricte ou fermer cette partie du site.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#211013] border border-[#8c2d38] space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#eb9ba4] text-sm">
              <span>🚨</span>
              <span>Couper une fuite (Sciage de branche)</span>
            </div>
            <p className="text-gray-300">
              Si un mineur a obtenu l'accès, vous pouvez scanner le QR de son téléphone ou, plus simplement, <strong className="text-white">scanner directement le nœud de la personne qui a donné l'accès</strong> via « Signaler un appareil ». Cela résiliera récursivement tous les accès qu'elle a distribués (quitte à la re-parrainer ensuite pour lui redonner un accès propre juste pour elle).
            </p>
          </div>

          <details className="group rounded-2xl bg-[#211013] border border-[#8a5629] overflow-hidden" open>
            <summary className="flex items-center justify-between p-3.5 cursor-pointer list-none select-none text-xs font-bold text-[#e5b382]">
              <span className="flex items-center gap-2">
                <span>🤫</span>
                <span>Rappel du geste secret d'accès</span>
              </span>
              <span className="text-[#e5b382] text-[10px] transform group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[#422026]">
              <p className="text-gray-200 text-xs leading-relaxed font-medium">
                Accès Maîtrise : pour les chefs déjà autorisés, touchez 3 fois rapidement le copyright tout en bas du site.
              </p>
            </div>
          </details>
        </div>

        <button
          onClick={handleClose}
          className="btn-amber w-full py-3 text-sm font-bold mt-2"
        >
          J'ai compris, entrer dans l'Espace Maîtrise
        </button>
      </div>
    </div>
  )
}
