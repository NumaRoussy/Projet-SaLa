import { useState } from 'react'
import type { AssignedPlayer, NightStep } from '../types'
import { ROLES_DATA } from '../data/roles'
import { getNightSteps } from '../utils/gameLogic'

export interface NightActions {
  inseparables: [string, string] | null
  cuistoProtectedId: string | null
  maitriseTargetId: string | null
  picoTargetId: string | null
  pharmacieSavedTarget: boolean
  pharmacieKillTargetId: string | null
}

interface NightPhaseProps {
  nightNumber: number
  players: AssignedPlayer[]
  lastCuistoProtectedId: string | null
  pharmacieUsedSave: boolean
  pharmacieUsedKill: boolean
  onCompleteNight: (actions: NightActions) => void
  onOpenHelp: () => void
}

export function NightPhase({
  nightNumber,
  players,
  lastCuistoProtectedId,
  pharmacieUsedSave,
  pharmacieUsedKill,
  onCompleteNight,
}: NightPhaseProps) {
  const steps = getNightSteps(nightNumber, players, {
    usedSave: pharmacieUsedSave,
    usedKill: pharmacieUsedKill,
  })

  const [currentStepIdx, setCurrentStepIdx] = useState(0)

  const [inseparables, setInseparables] = useState<[string, string] | null>(null)
  const [cuistoProtectedId, setCuistoProtectedId] = useState<string | null>(null)
  const [pisseurTargetId, setPisseurTargetId] = useState<string | null>(null)
  const [maitriseTargetId, setMaitriseTargetId] = useState<string | null>(null)
  const [picoTargetId, setPicoTargetId] = useState<string | null>(null)
  const [pharmacieSavedTarget, setPharmacieSavedTarget] = useState(false)
  const [pharmacieKillTargetId, setPharmacieKillTargetId] = useState<string | null>(null)

  const alivePlayers = players.filter(p => p.isAlive)
  const currentStep: NightStep | undefined = steps[currentStepIdx]

  if (!currentStep || steps.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full p-6 text-center space-y-5">
        <h2 className="text-xl font-bold text-[#f3f4f6]">Nuit {nightNumber} : Aucun rôle actif</h2>
        <p className="text-xs text-slate-300">
          Aucun rôle spécial ne peut agir cette nuit. Passez directement au rassemblement du matin.
        </p>
        <button
          type="button"
          onClick={() =>
            onCompleteNight({
              inseparables,
              cuistoProtectedId,
              maitriseTargetId,
              picoTargetId,
              pharmacieSavedTarget,
              pharmacieKillTargetId,
            })
          }
          className="btn-primary"
        >
          Réveiller le campement
        </button>
      </div>
    )
  }

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1)
    } else {
      onCompleteNight({
        inseparables,
        cuistoProtectedId,
        maitriseTargetId,
        picoTargetId,
        pharmacieSavedTarget,
        pharmacieKillTargetId,
      })
    }
  }

  const isMaitriseTargetSavedByCuisto =
    maitriseTargetId !== null && maitriseTargetId === cuistoProtectedId

  return (
    <div className="flex-1 flex flex-col max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5">
      {/* En-tête de la phase de nuit */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-[#f3f4f6] font-display">
          Nuit {nightNumber} : Guidage du Meneur
        </h2>
        <p className="text-xs text-slate-400">
          Étape {currentStepIdx + 1} sur {steps.length}
        </p>
      </div>

      {/* Barre de progression */}
      <div className="flex gap-1.5 w-full">
        {steps.map((s, idx) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              idx === currentStepIdx
                ? 'bg-[#3b5998]'
                : idx < currentStepIdx
                ? 'bg-[#2e6f56]'
                : 'bg-[#1f2229]'
            }`}
          />
        ))}
      </div>

      {/* 1. LE RAGOTEUR */}
      {currentStep === 'ragoteur' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-[#3b5998]">
          <div>
            <span className="text-[10px] font-bold text-[#9eb4eb] uppercase tracking-wider">
              Nuit 1 Uniquement
            </span>
            <h3 className="text-lg font-bold text-[#f3f4f6] font-display">
              L'Appel du Ragoteur (Cupidon)
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <span className="text-[11px] font-bold text-[#e5be6d] uppercase tracking-wider block">
              À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « La nuit est tombée sur le campement. Tous les scouts s'endorment dans leurs
              tentes... J'appelle le Ragoteur ! Ragoteur, réveille-toi et désigne deux
              Inséparables... »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Sélectionnez les 2 Inséparables : ({inseparables ? inseparables.filter(Boolean).length : 0} / 2)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isSelected = inseparables?.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setInseparables(
                          inseparables ? (inseparables.filter(id => id !== p.id) as [string, string]) : null
                        )
                      } else {
                        if (!inseparables || !inseparables[0]) {
                          setInseparables([p.id, ''])
                        } else if (!inseparables[1]) {
                          setInseparables([inseparables[0], p.id])
                        } else {
                          setInseparables([inseparables[0], p.id])
                        }
                      }
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                      isSelected
                        ? 'border-[#3b5998] text-[#9eb4eb]'
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

          <div className="p-3 rounded-xl bg-[#16181d] border border-[#3b5998] text-xs text-slate-200 leading-relaxed">
            <strong className="block mb-0.5">Consigne pour le meneur :</strong>
            Rendors le Ragoteur : « Ragoteur, rendors-toi ! ». Touche ensuite discrètement les deux
            Inséparables sur l'épaule pour qu'ils ouvrent les yeux, se reconnaissent en silence,
            puis se rendorment.
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!inseparables || inseparables.length < 2 || !inseparables[1]}
            className="btn-primary w-full"
          >
            Valider les Inséparables
          </button>
        </div>
      )}

      {/* 2. LE CUISTO */}
      {currentStep === 'cuisto' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-[#3b5998]">
          <div>
            <span className="text-[10px] font-bold text-[#e5be6d] uppercase tracking-wider">
              Protection Nocturne
            </span>
            <h3 className="text-lg font-bold text-[#f3f4f6] font-display">
              L'Appel du Cuisto (Salvateur)
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <span className="text-[11px] font-bold text-[#e5be6d] uppercase tracking-wider block">
              À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « J'appelle le Cuisto ! Réveille-toi et prépare un remontant pour protéger un scout
              des rondes de la Maîtrise cette nuit... »
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Joueur à protéger cette nuit :
              </label>
              {lastCuistoProtectedId && (
                <span className="text-[10px] text-slate-400">
                  (Interdit de protéger la même cible 2 nuits de suite)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isForbidden = p.id === lastCuistoProtectedId
                const isSelected = cuistoProtectedId === p.id

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isForbidden}
                    onClick={() => setCuistoProtectedId(p.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                      isSelected
                        ? 'border-[#3b5998] text-[#9eb4eb]'
                        : isForbidden
                        ? 'border-[#2e323c] text-slate-500 opacity-55 cursor-not-allowed'
                        : 'border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>✓</span>}
                    {isForbidden && <span className="text-[9px] text-[#e5be6d] font-normal">Hier</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-slate-300">
            <strong>Consigne meneur :</strong> Garde ce choix secret. Rendors le Cuisto : « Cuisto,
            rendors-toi ! ».
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!cuistoProtectedId}
            className="btn-primary w-full"
          >
            Valider la protection
          </button>
        </div>
      )}

      {/* 3. LE PISSEUR */}
      {currentStep === 'pisseur' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-[#3b5998]">
          <div>
            <span className="text-[10px] font-bold text-[#9eb4eb] uppercase tracking-wider">
              Auscultation Secrète
            </span>
            <h3 className="text-lg font-bold text-[#f3f4f6] font-display">
              L'Appel du Pisseur (Voyante)
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <span className="text-[11px] font-bold text-[#e5be6d] uppercase tracking-wider block">
              À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « J'appelle le Pisseur ! Réveille-toi, va aux feuillées et ausculte la tente d'un
              scout... »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Scout ausculté cette nuit :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isSelected = pisseurTargetId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPisseurTargetId(p.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                      isSelected
                        ? 'border-[#3b5998] text-[#9eb4eb]'
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

          {pisseurTargetId && (
            <div className="p-4 rounded-xl bg-[#16181d] border border-[#3b5998] space-y-2">
              <span className="text-[11px] font-bold text-[#9eb4eb] uppercase tracking-wider block">
                Identité secrète révélée :
              </span>
              {(() => {
                const target = players.find(p => p.id === pisseurTargetId)
                if (!target) return null
                const rDef = ROLES_DATA[target.role]
                return (
                  <div className="bg-[#1f2229] p-3 rounded-lg border border-[#2e323c]">
                    <h4 className="font-bold text-[#f3f4f6] text-sm">
                      {target.name} est : {rDef.name}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Camp :{' '}
                      <strong className={rDef.camp === 'maitrise' ? 'text-[#e88c95]' : 'text-emerald-300'}>
                        {rDef.campLabel}
                      </strong>
                    </p>
                  </div>
                )
              })()}
              <p className="text-[11px] text-slate-300 italic pt-1">
                Fais un signe discret ou mime le rôle au Pisseur, puis rendors-le : « Pisseur,
                rendors-toi ! ».
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!pisseurTargetId}
            className="btn-primary w-full"
          >
            Rendormir le Pisseur
          </button>
        </div>
      )}

      {/* 4. LA MAÎTRISE */}
      {currentStep === 'maitrise' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-[#9b2c37]">
          <div>
            <span className="text-[10px] font-bold text-[#e88c95] uppercase tracking-wider">
              Ronde Nocturne
            </span>
            <h3 className="text-lg font-bold text-[#f3f4f6] font-display">
              L'Appel de la Maîtrise (Chefs &amp; Pico)
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <span className="text-[11px] font-bold text-[#e5be6d] uppercase tracking-wider block">
              À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « J'appelle la Maîtrise ! Responsables et Pico, réveillez-vous en silence,
              reconnaissez-vous et désignez votre victime à coincer hors du lit... »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Victime désignée par les chefs :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {alivePlayers.map(p => {
                const isSelected = maitriseTargetId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMaitriseTargetId(p.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
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

          <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-slate-300">
            <strong>Consigne meneur :</strong> Prends note du choix des chefs. Rendors la Maîtrise :
            « Maîtrise, rendormez-vous ! ».
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!maitriseTargetId}
            className="btn-primary w-full"
          >
            Valider la cible de la Maîtrise
          </button>
        </div>
      )}

      {/* 5. LE PICO */}
      {currentStep === 'pico' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-[#3b5998]">
          <div>
            <span className="text-[10px] font-bold text-[#e5be6d] uppercase tracking-wider">
              Action Solitaire (1 nuit sur 2)
            </span>
            <h3 className="text-lg font-bold text-[#f3f4f6] font-display">
              L'Appel du Pico (Le Rebelle)
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <span className="text-[11px] font-bold text-[#e5be6d] uppercase tracking-wider block">
              À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « J'appelle le Pico ! Si c'est ton tour d'agir cette nuit, réveille-toi discrètement...
              Souhaites-tu éliminer un Responsable en douce ? »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Cible du Pico parmi les Responsables vivants :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPicoTargetId(null)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                  picoTargetId === null
                    ? 'border-[#2e6f56] text-emerald-300'
                    : 'border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                }`}
              >
                <span>Ne pas attaquer</span>
                {picoTargetId === null && <span>✓</span>}
              </button>

              {alivePlayers
                .filter(p => p.role === 'responsable')
                .map(p => {
                  const isSelected = picoTargetId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPicoTargetId(p.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#16181d] ${
                        isSelected
                          ? 'border-[#9b2c37] text-[#e88c95]'
                          : 'border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                      }`}
                    >
                      <span className="truncate">{p.name} (Chef)</span>
                      {isSelected && <span>✓</span>}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-slate-300">
            <strong>Consigne meneur :</strong> Le Pico n'est pas obligé d'attaquer. Rendors le Pico :
            « Pico, rendors-toi ! ».
          </div>

          <button type="button" onClick={handleNextStep} className="btn-primary w-full">
            Valider l'action du Pico
          </button>
        </div>
      )}

      {/* 6. RESP. PHARMACIE */}
      {currentStep === 'pharmacie' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-[#2e6f56]">
          <div>
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              Trousse de Secours
            </span>
            <h3 className="text-lg font-bold text-[#f3f4f6] font-display">
              L'Appel du Resp. Pharmacie (Sorcière)
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-1.5">
            <span className="text-[11px] font-bold text-[#e5be6d] uppercase tracking-wider block">
              À réciter à voix haute :
            </span>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              « J'appelle le Responsable Pharmacie ! Réveille-toi et inspecte la trousse de
              secours... »
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-3">
            <h4 className="text-xs font-bold text-[#f3f4f6] uppercase tracking-wider">
              1. Potion de Sauvetage : Arnica
            </h4>

            {isMaitriseTargetSavedByCuisto ? (
              <div className="p-3 rounded-lg bg-[#1f2229] border border-[#2e6f56] text-xs text-emerald-300">
                La cible de la Maîtrise a été mise à l'abri par le Cuisto ! Personne n'est en
                danger mortel.
              </div>
            ) : maitriseTargetId ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1f2229] border border-[#9b2c37] text-xs">
                <div>
                  <span className="text-[#e88c95]">Victime de la Maîtrise :</span>{' '}
                  <strong className="text-[#f3f4f6] font-bold">
                    {players.find(p => p.id === maitriseTargetId)?.name}
                  </strong>
                </div>

                {!pharmacieUsedSave ? (
                  <button
                    type="button"
                    onClick={() => setPharmacieSavedTarget(!pharmacieSavedTarget)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                      pharmacieSavedTarget
                        ? 'bg-[#2e6f56] text-[#f3f4f6] border-[#2e6f56]'
                        : 'bg-[#16181d] border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                    }`}
                  >
                    {pharmacieSavedTarget ? '✓ Arnica appliquée' : 'Appliquer Arnica'}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Arnica déjà utilisée</span>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400">Aucune victime cette nuit.</div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#16181d] border border-[#2e323c] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#f3f4f6] uppercase tracking-wider">
                2. Potion d'Élimination : Huile de Foie de morue
              </h4>
              {pharmacieUsedKill && (
                <span className="text-[11px] text-slate-400">Déjà utilisée</span>
              )}
            </div>

            {!pharmacieUsedKill ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setPharmacieKillTargetId(null)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#1f2229] ${
                    pharmacieKillTargetId === null
                      ? 'border-[#2e6f56] text-emerald-300'
                      : 'border-[#2e323c] text-slate-200 hover:border-[#3b5998]'
                  }`}
                >
                  <span>Ne pas donner</span>
                  {pharmacieKillTargetId === null && <span>✓</span>}
                </button>

                {alivePlayers.map(p => {
                  const isSelected = pharmacieKillTargetId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPharmacieKillTargetId(p.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left flex items-center justify-between transition-colors bg-[#1f2229] ${
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
            ) : (
              <p className="text-xs text-slate-400 italic">
                Le Resp. Pharmacie a déjà administré son unique dose d'huile de foie de morue.
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c] text-xs text-slate-300">
            <strong>Consigne meneur :</strong> Rendors le Responsable Pharmacie : « Pharmacie,
            rendors-toi ! ».
          </div>

          <button type="button" onClick={handleNextStep} className="btn-primary w-full">
            Terminer la nuit et réveiller le campement
          </button>
        </div>
      )}
    </div>
  )
}
