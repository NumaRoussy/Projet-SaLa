import { useState } from 'react'
import type { AssignedPlayer, NightStep, RoleDefinition } from '../types'
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
  onOpenHelp,
}: NightPhaseProps) {
  const steps = getNightSteps(nightNumber, players, {
    usedSave: pharmacieUsedSave,
    usedKill: pharmacieUsedKill,
  })

  const [currentStepIdx, setCurrentStepIdx] = useState(0)

  // Actions enregistrées pendant la nuit
  const [inseparables, setInseparables] = useState<[string, string] | null>(null)
  const [cuistoProtectedId, setCuistoProtectedId] = useState<string | null>(null)
  const [pisseurTargetId, setPisseurTargetId] = useState<string | null>(null)
  const [maitriseTargetId, setMaitriseTargetId] = useState<string | null>(null)
  const [picoTargetId, setPicoTargetId] = useState<string | null>(null)
  const [pharmacieSavedTarget, setPharmacieSavedTarget] = useState(false)
  const [pharmacieKillTargetId, setPharmacieKillTargetId] = useState<string | null>(null)

  const alivePlayers = players.filter(p => p.isAlive)
  const currentStep: NightStep | undefined = steps[currentStepIdx]

  // Si aucune étape cette nuit (rare)
  if (!currentStep || steps.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full p-6 text-center space-y-5 animate-fade-in">
        <span className="text-5xl">🌙</span>
        <h2 className="text-xl font-bold text-white">Nuit {nightNumber} — Aucun rôle actif</h2>
        <p className="text-xs text-gray-400">
          Aucun rôle spécial ne peut agir cette nuit. Passez directement au rassemblement du matin.
        </p>
        <button
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
          className="btn-amber px-6 py-3"
        >
          ☀️ Réveiller le campement
        </button>
      </div>
    )
  }

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1)
    } else {
      // Fin de la nuit
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

  // Vérifier si la cible Maîtrise a déjà été sauvée par le Cuisto
  const isMaitriseTargetSavedByCuisto =
    maitriseTargetId !== null && maitriseTargetId === cuistoProtectedId

  return (
    <div className="flex-1 flex flex-col max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* En-tête de la phase de nuit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-lg">
            🌙
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white font-display">
              Nuit {nightNumber} — Guidage du Meneur
            </h1>
            <p className="text-xs text-gray-400">
              Étape {currentStepIdx + 1} sur {steps.length}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenHelp}
          className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 text-scout-amber"
        >
          <span>?</span>
          <span>Aide</span>
        </button>
      </div>

      {/* Barre de progression des étapes de la nuit */}
      <div className="flex gap-1.5 w-full">
        {steps.map((s, idx) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              idx === currentStepIdx
                ? 'bg-scout-amber'
                : idx < currentStepIdx
                ? 'bg-emerald-500/80'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* ──────────────── 1. LE RAGOTEUR (NUIT 1) ──────────────── */}
      {currentStep === 'ragoteur' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-pink-500/30 bg-gradient-to-b from-pink-950/30 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-pink-500/10 border border-pink-500/30">
              💘
            </span>
            <div>
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                Nuit 1 Uniquement
              </span>
              <h2 className="text-lg font-bold text-white font-display">
                L'Appel du Ragoteur (Cupidon)
              </h2>
            </div>
          </div>

          {/* Récit oral pour le meneur */}
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « La nuit est tombée sur le campement. Tous les scouts s'endorment dans leurs
              tentes... J'appelle le Ragoteur ! Ragoteur, réveille-toi et désigne deux
              Inséparables... »
            </p>
          </div>

          {/* Sélection des 2 amoureux */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
              Sélectionnez les 2 Inséparables : ({inseparables ? inseparables.length : 0} / 2)
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
                          inseparables ? (inseparables.filter(id => id !== p.id) as any) : null
                        )
                      } else {
                        if (!inseparables) {
                          setInseparables([p.id, ''] as any)
                        } else if (!inseparables[1]) {
                          setInseparables([inseparables[0], p.id])
                        } else {
                          // Remplacement du 2e
                          setInseparables([inseparables[0], p.id])
                        }
                      }
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-pink-600/30 border-pink-400 text-pink-200 ring-1 ring-pink-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>❤️</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Consigne de clôture */}
          <div className="p-3 rounded-xl bg-pink-950/40 border border-pink-500/20 text-xs text-pink-200 leading-relaxed">
            <strong className="block mb-0.5">Consigne pour le meneur :</strong>
            Rendors le Ragoteur : « Ragoteur, rendors-toi ! ». Touche ensuite discrètement les deux
            Inséparables sur l'épaule pour qu'ils ouvrent les yeux, se reconnaissent en silence,
            puis se rendorment.
          </div>

          <button
            onClick={handleNextStep}
            disabled={!inseparables || inseparables.length < 2 || !inseparables[1]}
            className="btn-amber w-full py-3.5 text-sm font-bold"
          >
            Valider les Inséparables ➔
          </button>
        </div>
      )}

      {/* ──────────────── 2. LE CUISTO ──────────────── */}
      {currentStep === 'cuisto' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              🍲
            </span>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Protection Nocturne
              </span>
              <h2 className="text-lg font-bold text-white font-display">
                L'Appel du Cuisto (Salvateur)
              </h2>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « J'appelle le Cuisto ! Réveille-toi et prépare un remontant pour protéger un scout
              des rondes de la Maîtrise cette nuit... »
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-300">
                Joueur à protéger cette nuit :
              </label>
              {lastCuistoProtectedId && (
                <span className="text-[10px] text-gray-400">
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
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                        : isForbidden
                        ? 'bg-white/5 border-white/5 text-gray-500 opacity-40 cursor-not-allowed'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>🛡️</span>}
                    {isForbidden && (
                      <span className="text-[9px] text-amber-400/80 font-normal">Hier</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300">
            <strong>Consigne meneur :</strong> Garde ce choix secret. Rendors le Cuisto : « Cuisto,
            rendors-toi ! ».
          </div>

          <button
            onClick={handleNextStep}
            disabled={!cuistoProtectedId}
            className="btn-amber w-full py-3.5 text-sm font-bold"
          >
            Valider la protection ➔
          </button>
        </div>
      )}

      {/* ──────────────── 3. LE PISSEUR ──────────────── */}
      {currentStep === 'pisseur' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              🚰
            </span>
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                Auscultation Secrète
              </span>
              <h2 className="text-lg font-bold text-white font-display">
                L'Appel du Pisseur (Voyante)
              </h2>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « J'appelle le Pisseur ! Réveille-toi, va aux feuillées et ausculte la tente d'un
              scout... »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
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
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>👀</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Révélation immédiate du rôle au meneur */}
          {pisseurTargetId && (
            <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/40 space-y-2 animate-fade-in">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
                🔍 Identité secrète révélée :
              </span>
              {(() => {
                const target = players.find(p => p.id === pisseurTargetId)
                if (!target) return null
                const rDef = ROLES_DATA[target.role]
                return (
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/10">
                    <span className="text-3xl">{rDef.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {target.name} est : {rDef.name}
                      </h4>
                      <p className="text-xs text-gray-300">
                        Camp :{' '}
                        <strong
                          className={
                            rDef.camp === 'maitrise' ? 'text-red-400' : 'text-emerald-400'
                          }
                        >
                          {rDef.campLabel}
                        </strong>
                      </p>
                    </div>
                  </div>
                )
              })()}
              <p className="text-[11px] text-gray-300 italic pt-1">
                Fais un signe discret ou mime le rôle au Pisseur, puis rendors-le : « Pisseur,
                rendors-toi ! ».
              </p>
            </div>
          )}

          <button
            onClick={handleNextStep}
            disabled={!pisseurTargetId}
            className="btn-amber w-full py-3.5 text-sm font-bold"
          >
            Rendormir le Pisseur ➔
          </button>
        </div>
      )}

      {/* ──────────────── 4. LA MAÎTRISE (RESPONSABLES + PICO) ──────────────── */}
      {currentStep === 'maitrise' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-red-500/30 bg-gradient-to-b from-red-950/30 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-red-500/10 border border-red-500/30">
              🔦
            </span>
            <div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                Ronde Nocturne
              </span>
              <h2 className="text-lg font-bold text-white font-display">
                L'Appel de la Maîtrise (Chefs & Pico)
              </h2>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « J'appelle la Maîtrise ! Responsables et Pico, réveillez-vous en silence,
              reconnaissez-vous et désignez votre victime à coincer hors du lit... »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
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
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-red-600/40 border-red-400 text-red-200 ring-1 ring-red-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isSelected && <span>🎯</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300">
            <strong>Consigne meneur :</strong> Prends note du choix des chefs. Rendors la Maîtrise :
            « Maîtrise, rendormez-vous ! ».
          </div>

          <button
            onClick={handleNextStep}
            disabled={!maitriseTargetId}
            className="btn-amber w-full py-3.5 text-sm font-bold"
          >
            Valider la cible de la Maîtrise ➔
          </button>
        </div>
      )}

      {/* ──────────────── 5. LE PICO (NUITS PAIRES DÈS NUIT 2) ──────────────── */}
      {currentStep === 'pico' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-purple-500/30 bg-gradient-to-b from-purple-950/30 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
              🗡️
            </span>
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                Action Solitaire (1 nuit sur 2)
              </span>
              <h2 className="text-lg font-bold text-white font-display">
                L'Appel du Pico (Le Rebelle)
              </h2>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « J'appelle le Pico ! Si c'est ton tour d'agir cette nuit, réveille-toi discrètement...
              Souhaites-tu éliminer un Responsable en douce ? »
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
              Cible du Pico parmi les Responsables vivants :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPicoTargetId(null)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                  picoTargetId === null
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
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
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-600/40 border-purple-400 text-purple-200 ring-1 ring-purple-400/50'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span className="truncate">{p.name} (Chef)</span>
                      {isSelected && <span>🗡️</span>}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300">
            <strong>Consigne meneur :</strong> Le Pico n'est pas obligé d'attaquer. Rendors le Pico :
            « Pico, rendors-toi ! ».
          </div>

          <button
            onClick={handleNextStep}
            className="btn-amber w-full py-3.5 text-sm font-bold"
          >
            Valider l'action du Pico ➔
          </button>
        </div>
      )}

      {/* ──────────────── 6. RESP. PHARMACIE ──────────────── */}
      {currentStep === 'pharmacie' && (
        <div className="glass-card p-5 sm:p-6 space-y-5 border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              🩹
            </span>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Trousse de Secours
              </span>
              <h2 className="text-lg font-bold text-white font-display">
                L'Appel du Resp. Pharmacie (Sorcière)
              </h2>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
            <span className="text-[11px] font-bold text-scout-amber uppercase tracking-wider flex items-center gap-1.5">
              <span>🗣️</span> À réciter à voix haute :
            </span>
            <p className="text-xs text-gray-200 italic leading-relaxed">
              « J'appelle le Responsable Pharmacie ! Réveille-toi et inspecte la trousse de
              secours... »
            </p>
          </div>

          {/* État de la victime de la nuit */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              1. Potion de Sauvetage : Arnica
            </h4>

            {isMaitriseTargetSavedByCuisto ? (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                🛡️ La cible de la Maîtrise a été mise à l'abri par le Cuisto ! Personne n'est en
                danger mortel.
              </div>
            ) : maitriseTargetId ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs">
                <div>
                  <span className="text-gray-400">Victime de la Maîtrise :</span>{' '}
                  <strong className="text-white font-bold">
                    {players.find(p => p.id === maitriseTargetId)?.name}
                  </strong>
                </div>

                {!pharmacieUsedSave ? (
                  <button
                    type="button"
                    onClick={() => setPharmacieSavedTarget(!pharmacieSavedTarget)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pharmacieSavedTarget
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    {pharmacieSavedTarget ? '✓ Arnica appliquée' : 'Appliquer Arnica'}
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-500">Arnica déjà utilisée</span>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400">Aucune victime cette nuit.</div>
            )}
          </div>

          {/* Potion de poison : Foie de morue */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Potion d'Élimination : Huile de Foie de morue
              </h4>
              {pharmacieUsedKill && (
                <span className="text-[11px] text-gray-500">Déjà utilisée</span>
              )}
            </div>

            {!pharmacieUsedKill ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setPharmacieKillTargetId(null)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      pharmacieKillTargetId === null
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
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
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-600/40 border-red-400 text-red-200 ring-1 ring-red-400/50'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <span>☠️</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Le Resp. Pharmacie a déjà administré son unique dose d'huile de foie de morue.
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300">
            <strong>Consigne meneur :</strong> Rendors le Responsable Pharmacie : « Pharmacie,
            rendors-toi ! ».
          </div>

          <button
            onClick={handleNextStep}
            className="btn-amber w-full py-4 text-sm font-bold shadow-xl shadow-scout-amber/20"
          >
            ☀️ Terminer la nuit et réveiller le campement
          </button>
        </div>
      )}
    </div>
  )
}
