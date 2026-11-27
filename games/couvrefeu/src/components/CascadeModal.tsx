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

  if (cascade.type === 'inseparable_death') {
    const partner = players.find(p => p.id === cascade.targetPlayerId)
    const partnerRoleDef = partner ? ROLES_DATA[partner.role] : null
    const isMaitrise = partnerRoleDef?.camp === 'maitrise'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#1f2229] border-2 border-[#3b5998] text-center space-y-5 text-[#f3f4f6]">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#16181d] text-[#9eb4eb] border border-[#3b5998] uppercase tracking-wider">
              Chagrin Inconsolable • Révélation Publique
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
              Mort d'un Inséparable !
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Suite à la mort de <strong className="text-[#f3f4f6]">{cascade.sourcePlayerName}</strong>,{' '}
              son partenaire <strong className="text-[#9eb4eb]">{partner?.name}</strong> s'effondre de chagrin !
            </p>
          </div>

          {partner && partnerRoleDef && (
            <div
              className={`p-4 rounded-xl border-2 space-y-2 bg-[#16181d] ${
                isMaitrise ? 'border-[#9b2c37]' : 'border-[#2e6f56]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
                Rôle révélé au campement :
              </span>
              <div className="text-left">
                <h3 className="font-extrabold text-[#f3f4f6] text-base">
                  {partner.name} était : <span className="text-[#e5be6d]">{partnerRoleDef.name}</span>
                </h3>
                <span className={`text-xs font-bold block ${isMaitrise ? 'text-[#e88c95]' : 'text-emerald-300'}`}>
                  {partnerRoleDef.campLabel}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                  {partnerRoleDef.shortDesc}
                </p>
              </div>
            </div>
          )}

          <button type="button" onClick={() => onResolve()} className="btn-primary w-full">
            Confirmer la révélation et continuer
          </button>
        </div>
      </div>
    )
  }

  if (cascade.type === 'cp_shot') {
    const collateralTarget = revealedCollateralId
      ? players.find(p => p.id === revealedCollateralId)
      : null
    const collateralRoleDef = collateralTarget ? ROLES_DATA[collateralTarget.role] : null
    const isMaitrise = collateralRoleDef?.camp === 'maitrise'

    if (collateralTarget && collateralRoleDef) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#1f2229] border-2 border-[#9b2c37] text-center space-y-5 text-[#f3f4f6]">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#16181d] text-[#e88c95] border border-[#9b2c37] uppercase tracking-wider">
                Impact du Tir Collatéral • Révélation Publique
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
                Victime du Chef de Patrouille !
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                La fusée tirée par <strong className="text-[#f3f4f6]">{cascade.sourcePlayerName}</strong> a touché{' '}
                <strong className="text-[#e88c95]">{collateralTarget.name}</strong> qui est éliminé(e) sur-le-champ !
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border-2 space-y-2 bg-[#16181d] ${
                isMaitrise ? 'border-[#9b2c37]' : 'border-[#2e6f56]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
                Rôle révélé au campement :
              </span>
              <div className="text-left">
                <h3 className="font-extrabold text-[#f3f4f6] text-base">
                  {collateralTarget.name} était :{' '}
                  <span className="text-[#e5be6d]">{collateralRoleDef.name}</span>
                </h3>
                <span className={`text-xs font-bold block ${isMaitrise ? 'text-[#e88c95]' : 'text-emerald-300'}`}>
                  {collateralRoleDef.campLabel}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                  {collateralRoleDef.shortDesc}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onResolve(collateralTarget.id)}
              className="btn-primary w-full"
            >
              Confirmer la révélation et continuer
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#1f2229] border-2 border-[#9b2c37] text-center space-y-5 text-[#f3f4f6]">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#16181d] text-[#e88c95] border border-[#9b2c37] uppercase tracking-wider">
              Dernier Souffle du CP
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
              Fusée de détresse du CP !
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Le Chef de Patrouille <strong className="text-[#f3f4f6]">{cascade.sourcePlayerName}</strong> a péri.
              Dans son dernier élan, il tire une fusée : sélectionnez sa victime collatérale !
            </p>
          </div>

          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold text-slate-300">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                      isSelected
                        ? 'border-[#9b2c37] text-[#e88c95]'
                        : 'border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedTargetId) setRevealedCollateralId(selectedTargetId)
            }}
            disabled={!selectedTargetId}
            className="btn-danger w-full"
          >
            Tirer la fusée et révéler le rôle
          </button>
        </div>
      </div>
    )
  }

  if (cascade.type === 'chief_succession') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#1f2229] border-2 border-[#b5892e] text-center space-y-5 text-[#f3f4f6]">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#16181d] text-[#e5be6d] border border-[#b5892e] uppercase tracking-wider">
              Succession au Camp
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
              Nouveau Chef de Camp !
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Le Chef de Camp sortant <strong className="text-[#f3f4f6]">{cascade.sourcePlayerName}</strong> a été éliminé.
              Il doit désigner à l'oral son successeur parmi les scouts encore vivants.
            </p>
          </div>

          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold text-slate-300">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                      isSelected
                        ? 'border-[#b5892e] text-[#e5be6d]'
                        : 'border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedTargetId) onResolve(selectedTargetId)
            }}
            disabled={!selectedTargetId}
            className="btn-primary w-full"
          >
            Conférer l'insigne de Chef de Camp
          </button>
        </div>
      </div>
    )
  }

  return null
}
