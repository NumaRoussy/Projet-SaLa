import { useState, useMemo, useEffect } from 'react'
import type { Card, CrisisPlayer } from '../types'

interface Props {
  card: Card
  activeResponsable: CrisisPlayer
  survivors: CrisisPlayer[]
  roundNumber: number
  onExecute: (targetId: string, lossPercent: number, sips: number, isDebuff: boolean, debuffTitle?: string) => void
}

export function ActionCard({
  card,
  activeResponsable,
  survivors,
  roundNumber,
  onExecute,
}: Props) {
  const eligibleTargets = useMemo(() => {
    const others = survivors.filter(s => s.id !== activeResponsable.id)
    return others.length > 0 ? others : survivors
  }, [survivors, activeResponsable])

  const [selectedTargetId, setSelectedTargetId] = useState<string>('')

  // Réinitialise la cible à chaque nouvelle carte / nouveau tour (aucune cible présélectionnée)
  useEffect(() => {
    setSelectedTargetId('')
  }, [roundNumber, card.id, activeResponsable.id])

  // Resynchronisation : réinitialise uniquement si la cible sélectionnée n'est plus éligible
  useEffect(() => {
    if (selectedTargetId && !eligibleTargets.some(t => t.id === selectedTargetId)) {
      setSelectedTargetId('')
    }
  }, [eligibleTargets, selectedTargetId])

  const formattedContent = useMemo(() => {
    let text = card.content
    const target = eligibleTargets.find(s => s.id === selectedTargetId)
    text = text.replace(/{p1}/g, activeResponsable.name)
    text = text.replace(/{p2}/g, target ? target.name : 'la cible')
    text = text.replace(/{sips}/g, `${card.sips || 2}`)
    return text
  }, [card, activeResponsable, selectedTargetId, eligibleTargets])

  const isDebuffCard = card.category === 'regle'
  const isAttackCard = card.category === 'attaque'

  const handleApply = () => {
    if (!selectedTargetId) return
    let debuffTitle = ''
    if (isDebuffCard) {
      if (card.title.toLowerCase().includes('hache') || card.title.toLowerCase().includes('tronçonneuse')) {
        debuffTitle = 'Danger Public (+0.5%)'
      } else if (card.title.toLowerCase().includes('tutelle') || card.title.toLowerCase().includes('secours')) {
        debuffTitle = 'Bobologie (+1 gorgée)'
      } else {
        debuffTitle = card.title
      }
    }

    onExecute(selectedTargetId, card.loss_percent ?? 1.5, card.sips ?? 0, isDebuffCard, debuffTitle)
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full">
      {/* Active Responsable Banner */}
      <div className="bg-[#1f2229] border border-[#9b2c37] rounded-2xl p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-[#e88c95] font-mono uppercase font-bold">
            Responsable Actif au Rapport
          </div>
          <div className="font-display font-black text-[#f3f4f6] text-base leading-none mt-1">
            {activeResponsable.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-mono">Perte Actuelle</div>
          <div className="font-mono text-sm font-bold text-[#e88c95]">
            {activeResponsable.lossPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Main Crisis Action Card */}
      <div className="my-auto py-3">
        <div className="bg-[#1f2229] border border-[#9b2c37] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border bg-[#16181d] ${
                isAttackCard
                  ? 'text-[#e88c95] border-[#9b2c37]'
                  : isDebuffCard
                  ? 'text-slate-200 border-[#9b2c37]'
                  : 'text-[#e5be6d] border-[#b5892e]'
              }`}
            >
              {isAttackCard ? 'Attaque Ciblée' : isDebuffCard ? 'Malus Permanent' : 'Inspection & Dilemme'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">Tour #{roundNumber}</span>
          </div>

          <h2 className="font-display font-black text-xl sm:text-2xl text-[#f3f4f6] tracking-wide leading-tight">
            {card.title}
          </h2>

          <p className="font-display text-base sm:text-lg text-slate-200 leading-relaxed font-medium">
            {formattedContent}
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs font-mono">
            <div className="text-[#e88c95] font-bold">
              Perte J+S : +{card.loss_percent.toFixed(1)}%
            </div>
            {card.sips > 0 && (
              <div className="text-[#e5be6d] font-bold">
                {card.sips} gorgée{card.sips > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-mono font-bold uppercase text-slate-400 block">
              Choisir le Responsable Cible :
            </label>
            <div className="grid grid-cols-2 gap-2">
              {eligibleTargets.map(target => {
                const isSelected = selectedTargetId === target.id
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                      isSelected
                        ? 'border-[#9b2c37] text-[#f3f4f6] ring-1 ring-[#9b2c37]'
                        : 'border-[#2e323c] text-slate-300 hover:border-[#9b2c37]'
                    }`}
                  >
                    <span className="font-bold text-xs truncate">{target.name}</span>
                    <span className="text-[10px] font-mono text-[#e88c95] font-semibold shrink-0 ml-2">
                      {target.lossPercent.toFixed(1)}%
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <div className="pb-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={!selectedTargetId}
          className="btn-primary w-full font-bold"
        >
          {selectedTargetId ? 'APPLIQUER LA PERTE J+S' : 'Sélectionnez une cible ci-dessus'}
        </button>
      </div>
    </div>
  )
}
