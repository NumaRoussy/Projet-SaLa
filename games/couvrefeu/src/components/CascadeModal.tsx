import { useState } from 'react'
import type { AssignedPlayer, CascadeEvent } from '../types'
import { ROLES_DATA } from '../data/roles'

interface CascadeModalProps {
  cascade: CascadeEvent
  players: AssignedPlayer[]
  onResolve: (targetPlayerId?: string) => void
}

export function CascadeModal({ cascade, players, onResolve }: CascadeModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [revealedCollateralId, setRevealedCollateralId] = useState<string | null>(null)

  const alivePlayers = players.filter(p => p.isAlive && p.id !== cascade.sourcePlayerId)

  // 1. Mort d'un Inséparable : le partenaire meurt de chagrin
  if (cascade.type === 'inseparable_death') {
    const partner = players.find(p => p.id === cascade.targetPlayerId)
    const partnerRoleDef = partner ? ROLES_DATA[partner.role] : null
    const isMaitrise = partnerRoleDef?.camp === 'maitrise'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#111827] border-2 border-pink-500/50 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-4xl animate-pulse">
            💔
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider">
              Chagrin Inconsolable • Révélation Publique
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              Mort d'un Inséparable !
            </h2>
            <p className="text-xs sm:text-sm text-gray-300">
              Suite à la mort de <strong className="text-white">{cascade.sourcePlayerName}</strong>,{' '}
              son partenaire <strong className="text-pink-300">{partner?.name}</strong> s'effondre de chagrin !
            </p>
          </div>

          {partner && partnerRoleDef && (
            <div
              className={`p-4 rounded-xl border-2 space-y-2 animate-fade-in shadow-xl ${
                isMaitrise
                  ? 'bg-gradient-to-r from-red-950/60 to-black/60 border-red-500/50'
                  : 'bg-gradient-to-r from-emerald-950/60 to-black/60 border-emerald-500/50'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-left">
                Rôle révélé au campement :
              </span>
              <div className="flex items-center gap-3 text-left">
                <span className="text-4xl p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
                  {partnerRoleDef.icon}
                </span>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {partner.name} était : <span className="text-scout-amber">{partnerRoleDef.name}</span>
                  </h3>
                  <span
                    className={`text-xs font-bold block ${
                      isMaitrise ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {partnerRoleDef.campLabel}
                  </span>
                  <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-1">
                    {partnerRoleDef.shortDesc}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => onResolve()}
            className="btn-amber w-full py-3.5 text-sm font-bold shadow-xl shadow-scout-amber/20"
          >
            Confirmer la révélation et continuer ➔
          </button>
        </div>
      </div>
    )
  }

  // 2. Mort du Chef de Patrouille : Tir collatéral obligatoire avec révélation systématique
  if (cascade.type === 'cp_shot') {
    const collateralTarget = revealedCollateralId
      ? players.find(p => p.id === revealedCollateralId)
      : null
    const collateralRoleDef = collateralTarget ? ROLES_DATA[collateralTarget.role] : null
    const isMaitrise = collateralRoleDef?.camp === 'maitrise'

    // Vue 2.B : Révélation immédiate du rôle de la victime collatérale
    if (collateralTarget && collateralRoleDef) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111827] border-2 border-red-500/50 text-center space-y-5 shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-4xl animate-bounce">
              💥
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
                Impact du Tir Collatéral • Révélation Publique
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                Victime du Chef de Patrouille !
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                La fusée tirée par <strong className="text-white">{cascade.sourcePlayerName}</strong> a touché{' '}
                <strong className="text-red-300">{collateralTarget.name}</strong> qui est éliminé(e) sur-le-champ !
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border-2 space-y-2 animate-fade-in shadow-xl ${
                isMaitrise
                  ? 'bg-gradient-to-r from-red-950/60 to-black/60 border-red-500/50'
                  : 'bg-gradient-to-r from-emerald-950/60 to-black/60 border-emerald-500/50'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-left">
                Rôle révélé au campement :
              </span>
              <div className="flex items-center gap-3 text-left">
                <span className="text-4xl p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
                  {collateralRoleDef.icon}
                </span>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {collateralTarget.name} était :{' '}
                    <span className="text-scout-amber">{collateralRoleDef.name}</span>
                  </h3>
                  <span
                    className={`text-xs font-bold block ${
                      isMaitrise ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {collateralRoleDef.campLabel}
                  </span>
                  <p className="text-[11px] text-gray-300 mt-0.5 line-clamp-1">
                    {collateralRoleDef.shortDesc}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onResolve(collateralTarget.id)}
              className="btn-amber w-full py-3.5 text-sm font-bold shadow-xl shadow-scout-amber/20"
            >
              Confirmer la révélation et continuer ➔
            </button>
          </div>
        </div>
      )
    }

    // Vue 2.A : Sélection de la victime collatérale
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#111827] border-2 border-red-500/50 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-4xl animate-bounce">
            🚀
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
              Dernier Souffle du CP
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              Fusée de détresse du CP !
            </h2>
            <p className="text-xs sm:text-sm text-gray-300">
              Le Chef de Patrouille <strong className="text-white">{cascade.sourcePlayerName}</strong> a péri.
              Dans son dernier élan, il tire une fusée : sélectionnez sa victime collatérale !
            </p>
          </div>

          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold text-gray-300">
              Cible collatérale éliminée sur-le-champ :
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isSelected = selectedTargetId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedTargetId(p.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-red-600/40 border-red-400 text-red-200 ring-1 ring-red-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>💥</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => {
              if (selectedTargetId) setRevealedCollateralId(selectedTargetId)
            }}
            disabled={!selectedTargetId}
            className="btn-danger w-full py-3.5 text-sm font-bold disabled:opacity-40"
          >
            Tirer la fusée et révéler le rôle ➔
          </button>
        </div>
      </div>
    )
  }

  // 3. Mort du Chef de Camp : Transmission du titre en journée
  if (cascade.type === 'chief_succession') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#111827] border-2 border-scout-amber/50 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-scout-amber/20 border border-scout-amber/40 flex items-center justify-center text-4xl animate-bounce">
            ⭐
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-scout-amber/20 text-scout-amber border border-scout-amber/30 uppercase tracking-wider">
              Succession au Camp
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              Nouveau Chef de Camp !
            </h2>
            <p className="text-xs sm:text-sm text-gray-300">
              Le Chef de Camp sortant <strong className="text-white">{cascade.sourcePlayerName}</strong> a été éliminé.
              Il doit désigner à l'oral son successeur parmi les scouts encore vivants.
            </p>
          </div>

          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold text-gray-300">
              Choisissez le successeur :
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isSelected = selectedTargetId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedTargetId(p.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-600/40 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>⭐</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => {
              if (selectedTargetId) onResolve(selectedTargetId)
            }}
            disabled={!selectedTargetId}
            className="btn-amber w-full py-3.5 text-sm font-bold disabled:opacity-40"
          >
            Conférer l'insigne de Chef de Camp ➔
          </button>
        </div>
      </div>
    )
  }

  return null
}
