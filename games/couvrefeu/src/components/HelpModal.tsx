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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col bg-[#172036] border border-[#34497a] rounded-2xl overflow-hidden text-[#f3f4f6]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#34497a] bg-[#101626]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-base font-bold text-[#f3f4f6] font-display">
                Guide du Meneur — Couvre-feu
              </h2>
              <p className="text-xs text-slate-400">Règles, rôles secrets et pouvoirs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#172036] border border-[#34497a] hover:bg-[#1e2a45] text-slate-300 hover:text-[#f3f4f6] transition-colors"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-[#34497a] bg-[#101626] text-xs font-semibold px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedTab('roles')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              selectedTab === 'roles'
                ? 'border-[#5473bd] text-[#f3f4f6]'
                : 'border-transparent text-slate-400 hover:text-[#f3f4f6]'
            }`}
          >
            🎭 Les 9 Rôles
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('order')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              selectedTab === 'order'
                ? 'border-[#5473bd] text-[#f3f4f6]'
                : 'border-transparent text-slate-400 hover:text-[#f3f4f6]'
            }`}
          >
            🌙 Ordre de Nuit
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('rules')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              selectedTab === 'rules'
                ? 'border-[#5473bd] text-[#f3f4f6]'
                : 'border-transparent text-slate-400 hover:text-[#f3f4f6]'
            }`}
          >
            🏆 Victoire &amp; Camp
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {selectedTab === 'roles' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-red-300">
                    Camp de la Maîtrise
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {maitriseRoles.map(role => (
                    <div
                      key={role.type}
                      onClick={() => setSelectedRole(selectedRole === role.type ? null : role.type)}
                      className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        selectedRole === role.type
                          ? 'bg-[#2b171b] border-[#7f2d38]'
                          : 'bg-[#101626] border-[#34497a] hover:bg-[#1e2a45]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-lg bg-[#172036] border border-[#34497a]">
                          {role.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#f3f4f6] text-sm">{role.name}</h4>
                          <p className="text-xs text-slate-400 line-clamp-1">{role.shortDesc}</p>
                        </div>
                      </div>
                      {selectedRole === role.type && (
                        <div className="mt-3 pt-3 border-t border-[#34497a] space-y-2 text-xs text-slate-200">
                          <p>{role.fullDesc}</p>
                          <div className="p-2.5 rounded-lg bg-[#261d12] text-amber-200 border border-[#785127]">
                            <span className="font-semibold">Conseil Meneur : </span>
                            {role.actionDesc}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                    Camp des Tentes (Éclaireurs)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tentesRoles.map(role => (
                    <div
                      key={role.type}
                      onClick={() => setSelectedRole(selectedRole === role.type ? null : role.type)}
                      className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        selectedRole === role.type
                          ? 'bg-[#122620] border-[#2d6a4f]'
                          : 'bg-[#101626] border-[#34497a] hover:bg-[#1e2a45]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-lg bg-[#172036] border border-[#34497a]">
                          {role.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#f3f4f6] text-sm">{role.name}</h4>
                          <p className="text-xs text-slate-400 line-clamp-1">{role.shortDesc}</p>
                        </div>
                      </div>
                      {selectedRole === role.type && (
                        <div className="mt-3 pt-3 border-t border-[#34497a] space-y-2 text-xs text-slate-200">
                          <p>{role.fullDesc}</p>
                          <div className="p-2.5 rounded-lg bg-[#122620] text-emerald-200 border border-[#2d6a4f]">
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
              <p className="text-slate-300">
                La nuit est articulée automatiquement par l'assistant. Voici le rappel de la chronologie officielle des réveils :
              </p>
              <div className="space-y-2">
                {[
                  {
                    icon: '💘',
                    title: '1. Le Ragoteur (Nuit 1 uniquement)',
                    desc: 'Désigne 2 Inséparables. Le meneur les rendort et les touche discrètement pour qu\'ils ouvrent les yeux et se reconnaissent.',
                  },
                  {
                    icon: '🍲',
                    title: '2. Le Cuisto',
                    desc: 'Prépare un casse-croûte protecteur pour un joueur. Interdiction formelle de protéger la même personne 2 nuits de suite.',
                  },
                  {
                    icon: '🚰',
                    title: '3. Le Pisseur',
                    desc: 'En route pour les feuillées, il pointe un joueur. L\'écran dévoile son identité au meneur qui la lui communique silencieusement.',
                  },
                  {
                    icon: '🔦',
                    title: '4. La Maîtrise (Responsables + Pico)',
                    desc: 'Se réveillent ensemble en silence et s\'accordent par gestes sur une victime à éliminer.',
                  },
                  {
                    icon: '🗡️',
                    title: '5. Le Pico (Nuits paires : 2, 4, 6...)',
                    desc: 'Le rebelle peut poignarder discrètement un Responsable dans le dos (action optionnelle).',
                  },
                  {
                    icon: '🩹',
                    title: '6. Resp. Pharmacie',
                    desc: 'Découvre la victime de la nuit (si non protégée par le Cuisto). Peut appliquer l\'Arnica (sauver) et/ou donner le Foie de morue (empoisonner). 1 seule utilisation chacune par partie.',
                  },
                ].map(item => (
                  <div key={item.title} className="p-3 rounded-xl bg-[#101626] border border-[#34497a] flex items-start gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <h4 className="font-bold text-[#f3f4f6]">{item.title}</h4>
                      <p className="text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'rules' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-xl bg-[#101626] border border-[#34497a] space-y-2">
                <h4 className="font-bold text-[#f3f4f6] flex items-center gap-2">
                  <span>⭐</span> Chef de Camp (Élu au Jour 1)
                </h4>
                <p>
                  Élu à main levée lors du premier rassemblement du matin. En cas d'égalité lors des
                  votes de condamnation, le vote du Chef de Camp fait foi. À sa mort, il désigne son
                  successeur.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101626] border border-[#34497a] space-y-2">
                <h4 className="font-bold text-[#f3f4f6] flex items-center gap-2">
                  <span>⚡</span> Effets en cascade immédiats
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>
                    <strong className="text-[#f3f4f6]">Mort du CP :</strong> Tire sa fusée et emporte immédiatement une cible dans sa tombe.
                  </li>
                  <li>
                    <strong className="text-[#f3f4f6]">Mort d'un Inséparable :</strong> Le partenaire meurt instantanément de chagrin, son rôle est révélé.
                  </li>
                  <li>
                    <strong className="text-[#f3f4f6]">Mort du Chef de Camp :</strong> Transmission du titre à un vivant avant de continuer.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101626] border border-[#34497a] space-y-2">
                <h4 className="font-bold text-[#f3f4f6] flex items-center gap-2">
                  <span>🏆</span> Conditions de Victoire
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-emerald-300">Éclaireurs (Tentes) :</strong> Tous les Responsables et le Pico sont éliminés.
                  </li>
                  <li>
                    <strong className="text-red-300">Maîtrise :</strong> Les Responsables atteignent la parité numérique avec les survivants (sans opposition de Pico ou d'Inséparables mixtes).
                  </li>
                  <li>
                    <strong className="text-purple-300">Le Pico :</strong> Termine unique survivant du campement.
                  </li>
                  <li>
                    <strong className="text-pink-300">Les Inséparables :</strong> S'ils formaient une alliance mixte (Maîtrise + Éclaireur) et restent les 2 derniers survivants.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#34497a] bg-[#101626] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-[#415b99] border border-[#34497a] hover:bg-[#4d6bb3] text-[#f3f4f6] transition-colors"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  )
}
