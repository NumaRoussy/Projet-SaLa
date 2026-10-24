import { useState } from 'react'
import { ROLES_DATA } from '../data/roles'
import type { RoleType } from '../types'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [selectedTab, setSelectedTab] = useState<'roles' | 'rules' | 'order'>('roles')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)

  if (!isOpen) return null

  const rolesList = Object.values(ROLES_DATA)
  const maitriseRoles = rolesList.filter(r => r.camp === 'maitrise')
  const tentesRoles = rolesList.filter(r => r.camp === 'tentes')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-scout-night">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Guide du Meneur — Couvre-feu
              </h2>
              <p className="text-xs text-gray-400">Règles, rôles secrets et pouvoirs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Navigation onglets */}
        <div className="flex border-b border-white/10 bg-white/5 text-xs font-semibold px-4 pt-2 gap-2">
          <button
            onClick={() => setSelectedTab('roles')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              selectedTab === 'roles'
                ? 'border-scout-amber text-scout-amber'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            🎭 Les 9 Rôles
          </button>
          <button
            onClick={() => setSelectedTab('order')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              selectedTab === 'order'
                ? 'border-scout-amber text-scout-amber'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            🌙 Ordre de Nuit
          </button>
          <button
            onClick={() => setSelectedTab('rules')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              selectedTab === 'rules'
                ? 'border-scout-amber text-scout-amber'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            🏆 Victoire & Camp
          </button>
        </div>

        {/* Contenu avec scroll */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {selectedTab === 'roles' && (
            <>
              {/* Camp de la Maîtrise */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-red-300">
                    Camp de la Maîtrise
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {maitriseRoles.map(role => (
                    <div
                      key={role.type}
                      onClick={() =>
                        setSelectedRole(selectedRole === role.type ? null : role.type)
                      }
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedRole === role.type
                          ? 'bg-red-950/40 border-red-500/50 ring-1 ring-red-500/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-lg bg-black/40">
                          {role.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm">{role.name}</h4>
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {role.shortDesc}
                          </p>
                        </div>
                      </div>
                      {selectedRole === role.type && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs text-gray-300 animate-fade-in">
                          <p>{role.fullDesc}</p>
                          <div className="p-2.5 rounded-lg bg-black/40 text-amber-200 border border-amber-500/20">
                            <span className="font-semibold">Conseil Meneur : </span>
                            {role.actionDesc}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Camp des Tentes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                    Camp des Tentes (Éclaireurs)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tentesRoles.map(role => (
                    <div
                      key={role.type}
                      onClick={() =>
                        setSelectedRole(selectedRole === role.type ? null : role.type)
                      }
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedRole === role.type
                          ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-lg bg-black/40">
                          {role.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm">{role.name}</h4>
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {role.shortDesc}
                          </p>
                        </div>
                      </div>
                      {selectedRole === role.type && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs text-gray-300 animate-fade-in">
                          <p>{role.fullDesc}</p>
                          <div className="p-2.5 rounded-lg bg-black/40 text-emerald-200 border border-emerald-500/20">
                            <span className="font-semibold">Conseil Meneur : </span>
                            {role.actionDesc}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {selectedTab === 'order' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <p className="text-gray-300">
                La nuit est articulée automatiquement par l'assistant. Voici le rappel
                de la chronologie officielle des réveils :
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <span className="text-lg">💘</span>
                  <div>
                    <h4 className="font-bold text-white">1. Le Ragoteur (Nuit 1 uniquement)</h4>
                    <p className="text-gray-400">
                      Désigne 2 Inséparables. Le meneur les rendort et les touche discrètement
                      pour qu'ils ouvrent les yeux et se reconnaissent.
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <span className="text-lg">🍲</span>
                  <div>
                    <h4 className="font-bold text-white">2. Le Cuisto</h4>
                    <p className="text-gray-400">
                      Prépare un casse-croûte protecteur pour un joueur. Interdiction formelle
                      de protéger la même personne 2 nuits de suite.
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <span className="text-lg">🚰</span>
                  <div>
                    <h4 className="font-bold text-white">3. Le Pisseur</h4>
                    <p className="text-gray-400">
                      En route pour les feuillées, il pointe un joueur. L'écran dévoile son identité
                      au meneur qui la lui communique silencieusement.
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <span className="text-lg">🔦</span>
                  <div>
                    <h4 className="font-bold text-white">4. La Maîtrise (Responsables + Pico)</h4>
                    <p className="text-gray-400">
                      Se réveillent ensemble en silence et s'accordent par gestes sur une victime à
                      éliminer.
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <span className="text-lg">🗡️</span>
                  <div>
                    <h4 className="font-bold text-white">5. Le Pico (Nuits paires : 2, 4, 6...)</h4>
                    <p className="text-gray-400">
                      Le rebelle peut poignarder discrètement un Responsable dans le dos (action
                      optionnelle).
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <span className="text-lg">🩹</span>
                  <div>
                    <h4 className="font-bold text-white">6. Resp. Pharmacie</h4>
                    <p className="text-gray-400">
                      Découvre la victime de la nuit (si non protégée par le Cuisto). Peut appliquer
                      l'Arnica (sauver) et/ou donner le Foie de morue (empoisonner). 1 seule utilisation
                      chacune par partie.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'rules' && (
            <div className="space-y-4 text-xs leading-relaxed text-gray-300">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>⭐</span> Chef de Camp (Élu au Jour 1)
                </h4>
                <p>
                  Élu à main levée lors du premier rassemblement du matin. En cas d'égalité lors des
                  votes de condamnation, le vote du Chef de Camp fait foi. À sa mort, il désigne son
                  successeur.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>⚡</span> Effets en cascade immédiats
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li>
                    <strong className="text-white">Mort du CP :</strong> Tire sa fusée et emporte
                    immédiatement une cible dans sa tombe.
                  </li>
                  <li>
                    <strong className="text-white">Mort d'un Inséparable :</strong> Le partenaire
                    meurt instantanément de chagrin, son rôle est révélé.
                  </li>
                  <li>
                    <strong className="text-white">Mort du Chef de Camp :</strong> Transmission du
                    titre à un vivant avant de continuer.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span>🏆</span> Conditions de Victoire
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300">
                  <li>
                    <strong className="text-emerald-400">Éclaireurs (Tentes) :</strong> Tous les
                    Responsables et le Pico sont éliminés.
                  </li>
                  <li>
                    <strong className="text-red-400">Maîtrise :</strong> Les Responsables atteignent
                    la parité numérique avec les survivants (sans opposition de Pico ou d'Inséparables
                    mixtes).
                  </li>
                  <li>
                    <strong className="text-purple-400">Le Pico :</strong> Termine unique survivant
                    du campement.
                  </li>
                  <li>
                    <strong className="text-pink-400">Les Inséparables :</strong> S'ils formaient une
                    alliance mixte (Maîtrise + Éclaireur) et restent les 2 derniers survivants.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page modale */}
        <div className="p-4 border-t border-white/10 bg-scout-night flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  )
}
