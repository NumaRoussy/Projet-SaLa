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
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#172036] border-2 border-[#7d3666] text-center space-y-5 text-[#f3f4f6]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#291724] border border-[#7d3666] flex items-center justify-center text-4xl">
            💔
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#291724] text-pink-200 border border-[#7d3666] uppercase tracking-wider">
              Chagrin Inconsolable • Révélation Publique
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
              Mort d'un Inséparable !
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Suite à la mort de <strong className="text-[#f3f4f6]">{cascade.sourcePlayerName}</strong>,{' '}
              son partenaire <strong className="text-pink-300">{partner?.name}</strong> s'effondre de chagrin !
            </p>
          </div>

          {partner && partnerRoleDef && (
            <div
              className={`p-4 rounded-xl border-2 space-y-2 ${
                isMaitrise ? 'bg-[#2b171b] border-[#7f2d38]' : 'bg-[#122620] border-[#2d6a4f]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
                Rôle révélé au campement :
              </span>
              <div className="flex items-center gap-3 text-left">
                <span className="text-4xl p-2 rounded-xl bg-[#101626] border border-[#34497a] shrink-0">
                  {partnerRoleDef.icon}
                </span>
                <div>
                  <h3 className="font-extrabold text-[#f3f4f6] text-base">
                    {partner.name} était : <span className="text-amber-300">{partnerRoleDef.name}</span>
                  </h3>
                  <span className={`text-xs font-bold block ${isMaitrise ? 'text-red-300' : 'text-emerald-300'}`}>
                    {partnerRoleDef.campLabel}
                  </span>
                  <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                    {partnerRoleDef.shortDesc}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button type="button" onClick={() => onResolve()} className="btn-amber w-full py-3.5 text-sm font-bold">
            Confirmer la révélation et continuer ➔
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
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#172036] border-2 border-[#7f2d38] text-center space-y-5 text-[#f3f4f6]">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2b171b] border border-[#7f2d38] flex items-center justify-center text-4xl">
              💥
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2b171b] text-red-200 border border-[#7f2d38] uppercase tracking-wider">
                Impact du Tir Collatéral • Révélation Publique
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#f3f4f6] font-display">
                Victime du Chef de Patrouille !
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                La fusée tirée par <strong className="text-[#f3f4f6]">{cascade.sourcePlayerName}</strong> a touché{' '}
                <strong className="text-red-300">{collateralTarget.name}</strong> qui est éliminé(e) sur-le-champ !
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border-2 space-y-2 ${
                isMaitrise ? 'bg-[#2b171b] border-[#7f2d38]' : 'bg-[#122620] border-[#2d6a4f]'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">
                Rôle révélé au campement :
              </span>
              <div className="flex items-center gap-3 text-left">
                <span className="text-4xl p-2 rounded-xl bg-[#101626] border border-[#34497a] shrink-0">
                  {collateralRoleDef.icon}
                </span>
                <div>
                  <h3 className="font-extrabold text-[#f3f4f6] text-base">
                    {collateralTarget.name} était :{' '}
                    <span className="text-amber-300">{collateralRoleDef.name}</span>
                  </h3>
                  <span className={`text-xs font-bold block ${isMaitrise ? 'text-red-300' : 'text-emerald-300'}`}>
                    {collateralRoleDef.campLabel}
                  </span>
                  <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                    {collateralRoleDef.shortDesc}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onResolve(collateralTarget.id)}
              className="btn-amber w-full py-3.5 text-sm font-bold"
            >
              Confirmer la révélation et continuer ➔
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#172036] border-2 border-[#7f2d38] text-center space-y-5 text-[#f3f4f6]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2b171b] border border-[#7f2d38] flex items-center justify-center text-4xl">
            🚀
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2b171b] text-red-200 border border-[#7f2d38] uppercase tracking-wider">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#2b171b] border-[#7f2d38] text-red-200'
                        : 'bg-[#101626] border-[#34497a] text-slate-200 hover:bg-[#1e2a45]'
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
            type="button"
            onClick={() => {
              if (selectedTargetId) setRevealedCollateralId(selectedTargetId)
            }}
            disabled={!selectedTargetId}
            className="btn-danger w-full py-3.5 text-sm font-bold"
          >
            Tirer la fusée et révéler le rôle ➔
          </button>
        </div>
      </div>
    )
  }

  if (cascade.type === 'chief_succession') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#172036] border-2 border-[#785127] text-center space-y-5 text-[#f3f4f6]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#261d12] border border-[#785127] flex items-center justify-center text-4xl">
            ⭐
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#261d12] text-amber-200 border border-[#785127] uppercase tracking-wider">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#261d12] border-[#966530] text-amber-200'
                        : 'bg-[#101626] border-[#34497a] text-slate-200 hover:bg-[#1e2a45]'
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
            type="button"
            onClick={() => {
              if (selectedTargetId) onResolve(selectedTargetId)
            }}
            disabled={!selectedTargetId}
            className="btn-amber w-full py-3.5 text-sm font-bold"
          >
            Conférer l'insigne de Chef de Camp ➔
          </button>
        </div>
      </div>
    )
  }

  return null
}
