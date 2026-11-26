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
  // Potential targets: other survivors
  const eligibleTargets = useMemo(() => {
    const others = survivors.filter(s => s.id !== activeResponsable.id)
    return others.length > 0 ? others : survivors
  }, [survivors, activeResponsable])

  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    return eligibleTargets[0]?.id || activeResponsable.id
  })

  useEffect(() => {
    if (!eligibleTargets.some(t => t.id === selectedTargetId)) {
      setSelectedTargetId(eligibleTargets[0]?.id || activeResponsable.id)
    }
  }, [eligibleTargets, selectedTargetId, activeResponsable.id])

  // Format content with player names
  const formattedContent = useMemo(() => {
    let text = card.content
    const target = survivors.find(s => s.id === selectedTargetId) || activeResponsable
    text = text.replace(/{p1}/g, activeResponsable.name)
    text = text.replace(/{p2}/g, target.name)
    text = text.replace(/{sips}/g, `${card.sips || 2}`)
    return text
  }, [card, activeResponsable, selectedTargetId, survivors])

  const isDebuffCard = card.category === 'regle'
  const isAttackCard = card.category === 'attaque'

  const handleApply = () => {

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
    <div className="flex-1 flex flex-col justify-between p-4 max-w-lg mx-auto w-full animate-fade-in">
      {/* Active Responsable Banner */}
      <div className="bg-[#161922] border border-[#8c2d38] rounded-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{activeResponsable.avatar || '👮'}</span>
          <div>
            <div className="text-[10px] text-red-400 font-mono uppercase font-bold">
              Responsable Actif au Rapport
            </div>
            <div className="font-display font-black text-white text-base leading-none">
              {activeResponsable.name}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400 font-mono">Perte Actuelle</div>
          <div className="font-mono text-sm font-bold text-red-400">
            {activeResponsable.lossPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Main Crisis Action Card */}
      <div className="my-auto py-4">
        <div className="bg-[#161922] border border-red-900/60 rounded-2xl p-6 sm:p-7 space-y-5">
          {/* Category Tag */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                isAttackCard
                  ? 'bg-red-950/80 text-red-300 border-red-700/60'
                  : isDebuffCard
                  ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
              }`}
            >
              {isAttackCard ? '💥 Attaque Ciblée' : isDebuffCard ? '⚠️ Malus Permanent' : '⚖️ Inspection & Dilemme'}
            </span>
            <span className="text-[11px] font-mono text-gray-500">Tour #{roundNumber}</span>
          </div>

          {/* Title */}
          <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide leading-tight">
            {card.title}
          </h2>

          {/* Body Content */}
          <p className="font-display text-base sm:text-lg text-gray-200 leading-relaxed font-medium">
            {formattedContent}
          </p>

          {/* Loss impact preview */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-red-400 font-bold">
              <span>📉 Perte J+S :</span>
              <span>+{card.loss_percent.toFixed(1)}%</span>
            </div>
            {card.sips > 0 && (
              <div className="text-amber-400 font-bold">
                🍺 {card.sips} gorgée{card.sips > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Target Selector */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block">
              🎯 Choisir le Responsable Cible :
            </label>
            <div className="grid grid-cols-2 gap-2">
              {eligibleTargets.map(target => {
                const isSelected = selectedTargetId === target.id
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#2b171b] border-[#8c2d38] text-[#f3f4f6]'
                        : 'bg-[#0d1016] border-[#2a2f3d] text-slate-300 hover:border-[#8c2d38]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">{target.avatar || '👮'}</span>
                      <span className="font-bold text-xs truncate">{target.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-red-400 font-semibold shrink-0">
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
          onClick={handleApply}
          className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-black text-base rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <span>🚨</span>
          <span>APPLIQUER LA PERTE J+S</span>
        </button>
      </div>
    </div>
  )
}
