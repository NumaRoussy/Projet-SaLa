import { useState, useEffect, useCallback } from 'react'
import {
  getApiBaseUrl,
  apiAdminCheckKey,
  apiAdminGetBlackout,
  apiAdminSetBlackout,
  apiAdminSetBlackoutDates,
  apiAdminSetBlackoutMessage,
  apiAdminGetReports,
  apiAdminReviewReport,
  apiAdminPruneBranch,
  apiAdminGetCampaigns,
  apiAdminCreateCampaign,
  apiAdminDeactivateCampaign,
  apiAdminGetTree,
  apiAdminGetStats,
  apiAdminGetCards,
  apiAdminCreateCard,
  apiAdminUpdateCard,
  apiAdminDeleteCard,
  apiAdminUploadCardsCsv,
  apiAdminGetFeedback,
  apiAdminReviewFeedback,
  type AdminBlackoutStatus,
  type AdminReport,
  type AdminCampaign,
  type AdminTreeResponse,
  type AdminTreeNode,
  type AdminStatsResponse,
  type AdminCard,
  type AdminFeedback,
} from '../../services/api'
import { copyToClipboard } from '../../services/clipboard'
import { PrintSheetModal } from './PrintSheetModal'

function getExtraFieldConfig(game: string, category: string) {
  const normCategory = (category || '').toLowerCase().trim()
  if (game === 'carnotzet' && normCategory === 'regle') {
    return {
      label: 'Durée de la règle cumulative',
      placeholder: 'durée:3 tours',
      help: 'Cette règle reste affichée et se cumule avec les autres cartes pendant X tours, ex: durée:3 tours',
    }
  }
  if (game === 'carnotzet' && normCategory === 'pub') {
    return {
      label: 'Choix du dilemme (ex: A: Option 1 | B: Option 2)',
      placeholder: 'A: Option 1 | B: Option 2',
      help: 'Choix du dilemme (ex: A: Option 1 | B: Option 2)',
    }
  }
  if (game === 'infiltre') {
    return {
      label: "Mot secret de l'Infiltré (différent du mot des Éclés)",
      placeholder: "Mot secret de l'infiltré",
      help: "Mot secret de l'Infiltré (différent du mot des Éclés).",
    }
  }
  if (game === 'chrono') {
    return {
      label: 'Mots interdits à la Manche 1 (séparés par des virgules)',
      placeholder: 'mot1, mot2, mot3',
      help: 'Mots interdits à la Manche 1 (séparés par des virgules).',
    }
  }
  if (game === 'debout' && normCategory === 'chrono') {
    return {
      label: 'Durée cible (ex: duree:10s)',
      placeholder: 'duree:10s',
      help: 'Durée cible (ex: duree:10s).',
    }
  }
  if (game === 'debrief') {
    return {
      label: 'Sous-texte / Pénalité (ex: Avoue ou prends {sips} gorgées)',
      placeholder: 'Avoue ou prends {sips} gorgées',
      help: 'Sous-texte / Pénalité (ex: Avoue ou prends {sips} gorgées).',
    }
  }
  return {
    label: 'Champ Extra (optionnel)',
    placeholder: 'Optionnel — laisser vide pour ce type de carte',
    help: 'Optionnel — laisser vide pour ce type de carte.',
  }
}

interface Props {
  onClose: () => void
}

type TabType = 'blackout' | 'tree' | 'stats' | 'cards' | 'campaigns' | 'reports'

// ── Composant récursif pour l'Arbre Visuel des Responsables ─────────────────
function TreeNodeItem({
  node,
  depth,
  onPrune,
}: {
  node: AdminTreeNode
  depth: number
  onPrune: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="space-y-1">
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
          node.is_revoked
            ? 'bg-red-950/20 border-red-500/30 text-red-300'
            : 'bg-white/5 border-white/10 text-gray-200 hover:border-scout-amber/40'
        }`}
        style={{ marginLeft: `${Math.min(depth * 16, 96)}px` }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {hasChildren && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-white px-1 font-mono text-[11px]"
              title={collapsed ? 'Déplier' : 'Replier'}
            >
              {collapsed ? '▶' : '▼'}
            </button>
          )}
          <span className="text-base">{node.is_revoked ? '🛑' : depth === 0 ? '👑' : '📱'}</span>
          <span className="font-mono text-scout-amber font-semibold">
            {node.id.slice(0, 8)}…{node.id.slice(-4)}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              node.is_revoked
                ? 'bg-red-900/60 text-red-200 border border-red-500/40'
                : 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40'
            }`}
          >
            {node.is_revoked ? 'RÉVOQUÉ' : 'ACTIF'}
          </span>
          {node.descendant_count > 0 && (
            <span className="text-[10px] bg-blue-900/40 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
              👥 {node.descendant_count} filleul{node.descendant_count > 1 ? 's' : ''}
            </span>
          )}
          {node.revocation_reason && (
            <span className="text-[10px] text-red-400 italic">
              « {node.revocation_reason} »
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <span className="text-[10px] text-gray-500 font-mono">
            {node.last_seen_at ? `Vu ${node.last_seen_at.slice(0, 16)}` : 'Jamais connecté'}
          </span>
          {!node.is_revoked && (
            <button
              onClick={() => onPrune(node.id)}
              className="btn-danger py-1 px-2.5 text-[11px] font-bold"
              title="Scier cette branche et tous ses descendants"
            >
              🪓 Scier
            </button>
          )}
        </div>
      </div>

      {!collapsed && hasChildren && (
        <div className="space-y-1">
          {node.children.map(child => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} onPrune={onPrune} />
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminConsole({ onClose }: Props) {
  const [adminKey, setAdminKey] = useState<string>(() => sessionStorage.getItem('scout_admin_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // ── Navigation & Feedback
  const [activeTab, setActiveTab] = useState<TabType>('blackout')
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Tab 1: Blackout State
  const [blackout, setBlackout] = useState<AdminBlackoutStatus | null>(null)
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const [blackoutMessageInput, setBlackoutMessageInput] = useState('')

  // ── Tab 2: Tree State
  const [treeData, setTreeData] = useState<AdminTreeResponse | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)

  // ── Tab 3: Stats State
  const [statsData, setStatsData] = useState<AdminStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // ── Tab 4: Cards & CSV State
  const [cards, setCards] = useState<AdminCard[]>([])
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all')
  const [cardsLoading, setCardsLoading] = useState(false)
  const [feedbackList, setFeedbackList] = useState<AdminFeedback[]>([])
  const [cardsSubTab, setCardsSubTab] = useState<'catalog' | 'feedback'>('catalog')
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [copiedCampaignId, setCopiedCampaignId] = useState<string | null>(null)
  const [newCardForm, setNewCardForm] = useState({
    game: 'carnotzet',
    category: 'duel',
    title: '',
    content: '',
    extra: '',
    sips: 2,
    min_players: 2,
  })

  // ── Tab 5: Campaigns State
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([])
  const [campName, setCampName] = useState('')
  const [campId, setCampId] = useState('')
  const [campToken, setCampToken] = useState('')
  const [campHours, setCampHours] = useState('24')
  const [printCampaign, setPrintCampaign] = useState<{ name: string; token: string } | null>(null)

  // ── Tab 6: Reports State
  const [reports, setReports] = useState<AdminReport[]>([])
  const [manualDeviceId, setManualDeviceId] = useState('')
  const [manualReason, setManualReason] = useState('')

  // ── Initial Refresh
  const refreshCoreData = useCallback(async (key: string) => {
    try {
      const [bo, reps, camps] = await Promise.all([
        apiAdminGetBlackout(key),
        apiAdminGetReports(key),
        apiAdminGetCampaigns(key),
      ])
      setBlackout(bo)
      setStartDateInput(bo.camp_blackout_start || '')
      setEndDateInput(bo.camp_blackout_end || '')
      setBlackoutMessageInput(bo.camp_blackout_message || '')
      setReports(reps)
      setCampaigns(camps)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur chargement'
      setActionMsg({ type: 'error', text: msg })
    }
  }, [])

  const loadTree = useCallback(async (key: string) => {
    setTreeLoading(true)
    try {
      const res = await apiAdminGetTree(key)
      setTreeData(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur arbre'
      setActionMsg({ type: 'error', text: msg })
    } finally {
      setTreeLoading(false)
    }
  }, [])

  const loadStats = useCallback(async (key: string) => {
    setStatsLoading(true)
    try {
      const res = await apiAdminGetStats(key)
      setStatsData(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur stats'
      setActionMsg({ type: 'error', text: msg })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadCardsAndFeedback = useCallback(async (key: string) => {
    setCardsLoading(true)
    try {
      const [allCards, fb] = await Promise.all([
        apiAdminGetCards(key),
        apiAdminGetFeedback(key),
      ])
      setCards(allCards)
      setFeedbackList(fb)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur cartes'
      setActionMsg({ type: 'error', text: msg })
    } finally {
      setCardsLoading(false)
    }
  }, [])

  // Check auth on mount
  useEffect(() => {
    if (adminKey) {
      apiAdminCheckKey(adminKey)
        .then(() => {
          setIsAuthenticated(true)
          refreshCoreData(adminKey)
        })
        .catch(() => {
          setIsAuthenticated(false)
          sessionStorage.removeItem('scout_admin_key')
        })
    }
  }, [adminKey, refreshCoreData])

  // Lazy tab loaders
  useEffect(() => {
    if (!isAuthenticated || !adminKey) return
    if (activeTab === 'tree') loadTree(adminKey)
    else if (activeTab === 'stats') loadStats(adminKey)
    else if (activeTab === 'cards') loadCardsAndFeedback(adminKey)
  }, [activeTab, isAuthenticated, adminKey, loadTree, loadStats, loadCardsAndFeedback])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    const trimmed = keyInput.trim()
    if (!trimmed) return

    try {
      await apiAdminCheckKey(trimmed)
      sessionStorage.setItem('scout_admin_key', trimmed)
      setAdminKey(trimmed)
      setIsAuthenticated(true)
      refreshCoreData(trimmed)
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Clé invalide')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('scout_admin_key')
    setAdminKey('')
    setIsAuthenticated(false)
  }

  // ── Actions Blackout
  const toggleManualBlackout = async () => {
    if (!blackout) return
    try {
      const updated = await apiAdminSetBlackout(adminKey, !blackout.camp_blackout_active)
      setBlackout(updated)
      setActionMsg({
        type: 'success',
        text: updated.camp_blackout_active
          ? '🛑 Coupe-circuit manuel ACTIVÉ avec succès !'
          : '🔓 Coupe-circuit manuel LEVÉ avec succès !',
      })
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    }
  }

  const saveBlackoutDates = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updated = await apiAdminSetBlackoutDates(
        adminKey,
        startDateInput || null,
        endDateInput || null,
      )
      setBlackout(updated)
      setActionMsg({ type: 'success', text: 'Plage de dates programmée mise à jour.' })
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    }
  }

  const saveBlackoutMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updated = await apiAdminSetBlackoutMessage(adminKey, blackoutMessageInput || null)
      setBlackout(updated)
      setActionMsg({ type: 'success', text: 'Message de blackout personnalisé enregistré.' })
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    }
  }

  const restoreDefaultBlackoutMessage = async () => {
    try {
      const updated = await apiAdminSetBlackoutMessage(adminKey, null)
      setBlackout(updated)
      setBlackoutMessageInput(updated.default_blackout_message || '')
      setActionMsg({ type: 'success', text: 'Message officiel des camps restauré.' })
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    }
  }

  // ── Actions Prune
  const handlePruneNode = async (deviceId: string) => {
    const reason = window.prompt(
      `Confirmez le sciage de la branche ${deviceId.slice(0, 8)}…\nIndiquez le motif de révocation :`,
      'Suspicion de fuite / Révocation admin',
    )
    if (!reason) return

    try {
      const res = await apiAdminPruneBranch(adminKey, deviceId, reason)
      setActionMsg({ type: 'success', text: `Branche sciée : ${res.revoked_count} appareil(s) révoqué(s).` })
      loadTree(adminKey)
      refreshCoreData(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur sciage' })
    }
  }

  const handleManualPruneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualDeviceId.trim() || !manualReason.trim()) return

    try {
      const res = await apiAdminPruneBranch(adminKey, manualDeviceId.trim(), manualReason.trim())
      setActionMsg({ type: 'success', text: `Branche sciée : ${res.revoked_count} appareil(s) révoqué(s).` })
      setManualDeviceId('')
      setManualReason('')
      refreshCoreData(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur sciage' })
    }
  }

  const handleReviewReport = async (reportId: number, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await apiAdminReviewReport(adminKey, reportId, action)
      setActionMsg({
        type: 'success',
        text: action === 'APPROVED'
          ? `Signalement validé ! ${res.revoked_count} appareil(s) révoqué(s).`
          : 'Signalement rejeté sans modification.',
      })
      refreshCoreData(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur validation' })
    }
  }

  // ── Actions Campaigns
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campName.trim() || !campId.trim() || !campToken.trim()) return

    let expiresAt: string | undefined
    const hours = parseInt(campHours, 10)
    if (!isNaN(hours) && hours > 0) {
      const exp = new Date(Date.now() + hours * 3600 * 1000)
      expiresAt = exp.toISOString().slice(0, 19).replace('T', ' ')
    }

    try {
      await apiAdminCreateCampaign(adminKey, {
        id: campId.trim(),
        name: campName.trim(),
        token: campToken.trim(),
        expires_at: expiresAt,
      })
      setActionMsg({ type: 'success', text: `Campagne « ${campName} » créée.` })
      setCampName('')
      setCampId('')
      setCampToken('')
      refreshCoreData(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur création' })
    }
  }

  const handleDeactivateCampaign = async (id: string) => {
    if (!window.confirm(`Désactiver la campagne amorce « ${id} » ?`)) return
    try {
      await apiAdminDeactivateCampaign(adminKey, id)
      setActionMsg({ type: 'success', text: `Campagne ${id} désactivée.` })
      refreshCoreData(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    }
  }

  // ── Actions Cards & CSV (Point 5)
  const handleExportCsv = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/cards/export-csv`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Erreur lors de l\'export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'scoutgame_content.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setActionMsg({ type: 'success', text: 'Fichier scoutgame_content.csv téléchargé avec succès !' })
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur export' })
    }
  }

  const handleUploadCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = ev.target?.result as string
      if (!content) return
      try {
        const res = await apiAdminUploadCardsCsv(adminKey, content)
        setActionMsg({
          type: 'success',
          text: `CSV importé avec succès : ${res.imported_count} cartes enregistrées en base !`,
        })
        loadCardsAndFeedback(adminKey)
      } catch (err: unknown) {
        setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur import' })
      }
    }
    reader.readAsText(file)
  }

  const handleOpenAddCardModal = () => {
    setEditingCardId(null)
    setNewCardForm({
      game: 'carnotzet',
      category: 'duel',
      title: '',
      content: '',
      extra: '',
      sips: 2,
      min_players: 2,
    })
    setShowAddCardModal(true)
  }

  const handleStartEditCard = (card: AdminCard) => {
    setEditingCardId(card.id)
    setNewCardForm({
      game: card.game,
      category: card.category,
      title: card.title || '',
      content: card.content,
      extra: card.extra || '',
      sips: card.sips,
      min_players: card.min_players,
    })
    setShowAddCardModal(true)
  }

  const handleCopyCampaignUrl = async (campaignId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scoutgame.ch'
    const url = `${origin}/?bootstrap=${encodeURIComponent(campaignId)}`
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopiedCampaignId(campaignId)
      setTimeout(() => setCopiedCampaignId(null), 2500)
    } else {
      setActionMsg({ type: 'error', text: 'Impossible de copier automatiquement le lien' })
    }
  }

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCardForm.content.trim()) return

    try {
      if (editingCardId !== null) {
        await apiAdminUpdateCard(adminKey, editingCardId, {
          game: newCardForm.game,
          category: newCardForm.category.trim(),
          title: newCardForm.title.trim() || undefined,
          content: newCardForm.content.trim(),
          extra: newCardForm.extra.trim() || undefined,
          sips: Number(newCardForm.sips),
          min_players: Number(newCardForm.min_players),
        })
        setActionMsg({ type: 'success', text: `Carte #${editingCardId} mise à jour et content.csv synchronisé !` })
      } else {
        await apiAdminCreateCard(adminKey, {
          game: newCardForm.game,
          category: newCardForm.category.trim(),
          title: newCardForm.title.trim() || undefined,
          content: newCardForm.content.trim(),
          extra: newCardForm.extra.trim() || undefined,
          sips: Number(newCardForm.sips),
          min_players: Number(newCardForm.min_players),
        })
        setActionMsg({ type: 'success', text: 'Nouvelle carte ajoutée et synchronisée dans content.csv !' })
      }
      setShowAddCardModal(false)
      setEditingCardId(null)
      setNewCardForm({
        game: 'carnotzet',
        category: 'duel',
        title: '',
        content: '',
        extra: '',
        sips: 2,
        min_players: 2,
      })
      loadCardsAndFeedback(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur sauvegarde carte' })
    }
  }

  const handleDeleteCard = async (id: number) => {
    if (!window.confirm(`Supprimer définitivement la carte #${id} ?`)) return
    try {
      await apiAdminDeleteCard(adminKey, id)
      setActionMsg({ type: 'success', text: `Carte #${id} supprimée et content.csv synchronisé.` })
      loadCardsAndFeedback(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur suppression' })
    }
  }

  const handleReviewFeedback = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    try {
      await apiAdminReviewFeedback(adminKey, id, action)
      setActionMsg({
        type: 'success',
        text: action === 'APPROVED'
          ? 'Proposition validée et intégrée dans le catalogue de cartes !'
          : 'Proposition marquée comme rejetée.',
      })
      loadCardsAndFeedback(adminKey)
    } catch (err: unknown) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur feedback' })
    }
  }

  // ── Render: Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-[#060913] flex items-center justify-center p-4">
        <div className="glass-card max-w-sm w-full p-6 text-center space-y-4 border border-scout-amber/30 animate-fade-in shadow-2xl">
          <div className="text-4xl">🔐</div>
          <h2 className="font-display font-bold text-lg text-white">Console d'Administration V2</h2>
          <p className="text-xs text-gray-400">Entrez la clé maîtresse X-Admin-Key</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              placeholder="Clé secrète admin…"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="input-scout font-mono text-center text-sm"
              autoFocus
            />
            {authError && <p className="text-xs text-red-400 font-semibold">{authError}</p>}
            <button type="submit" className="btn-amber w-full py-2.5 text-sm font-bold">
              Se connecter
            </button>
          </form>
          <button onClick={onClose} className="btn-ghost w-full py-2 text-xs">
            Retour au site
          </button>
        </div>
      </div>
    )
  }

  const filteredCards = selectedGameFilter === 'all'
    ? cards
    : cards.filter(c => c.game === selectedGameFilter)

  // ── Render: Full Dashboard
  return (
    <div className="min-h-dvh bg-[#070b14] text-white flex flex-col animate-fade-in">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-[#0d1424] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚜️</span>
          <div>
            <h1 className="font-display font-bold text-sm sm:text-base leading-tight">
              Scout Game — Console d'Administration V2
            </h1>
            <p className="text-[10px] text-gray-400">
              Inspiré du scoutisme vaudois · Projet 100% indépendant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshCoreData(adminKey)}
            className="btn-ghost py-1.5 px-3 text-xs border border-white/10 flex items-center gap-1"
            title="Rafraîchir"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button onClick={handleLogout} className="btn-ghost py-1.5 px-3 text-xs text-red-400 hover:text-red-300">
            Déconnexion
          </button>
          <button onClick={onClose} className="btn-primary py-1.5 px-3 text-xs font-bold">
            ✕ Quitter
          </button>
        </div>
      </header>

      {/* ── Notifications Bar ─────────────────────────────────────────────── */}
      {actionMsg && (
        <div
          className={`shrink-0 px-4 py-2.5 text-xs font-semibold flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/80 border-b border-red-500/30 text-red-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#0a0f1d] border-b border-white/5 flex px-4 gap-1 overflow-x-auto sticky top-[57px] z-10">
        <button
          onClick={() => setActiveTab('blackout')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'blackout'
              ? 'border-scout-amber text-scout-amber bg-scout-amber/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🛑</span>
          <span>Blackout & Message</span>
        </button>

        <button
          onClick={() => setActiveTab('tree')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tree'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🌳</span>
          <span>Arbre des Responsables</span>
          {treeData && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700 text-white font-mono">
              {treeData.active_devices}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'stats'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>📊</span>
          <span>Statistiques</span>
        </button>

        <button
          onClick={() => setActiveTab('cards')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'cards'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🃏</span>
          <span>Cartes & CSV</span>
          {cards.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-700 text-white font-mono">
              {cards.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'campaigns'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🎫</span>
          <span>Campagnes AG / QR</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'reports'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>🪓</span>
          <span>Signalements</span>
          {reports.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono">
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Content Area ───────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* ── TAB 1: BLACKOUT ──────────────────────────────────────────────── */}
        {activeTab === 'blackout' && (
          <div className="space-y-6">
            {/* Status Card */}
            <div
              className={`p-5 rounded-2xl border ${
                blackout?.effective_blackout
                  ? 'bg-red-950/40 border-red-500/40 text-red-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{blackout?.effective_blackout ? '🚨' : '🛡️'}</span>
                    <h3 className="font-bold text-base text-white">
                      Statut effectif : {blackout?.effective_blackout ? 'COUPE-CIRCUIT ACTIF' : 'ACCÈS NORMAL AUTORISÉ'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    {blackout?.effective_blackout
                      ? 'L’espace Face B est actuellement verrouillé. Tous les responsables voient le message officiel de sobriété des camps.'
                      : 'Les terminaux autorisés peuvent jouer aux jeux Face B en toute discrétion.'}
                  </p>
                </div>

                <button
                  onClick={toggleManualBlackout}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 border transition-all ${
                    blackout?.camp_blackout_active
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-white'
                      : 'bg-red-600 hover:bg-red-500 border-red-400/40 text-white'
                  }`}
                >
                  {blackout?.camp_blackout_active ? '🔓 Lever le Blackout manuel' : '🛑 Déclencher le Blackout d’urgence'}
                </button>
              </div>
            </div>

            {/* Message de Blackout Personnalisable (Point 2) */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>💬</span>
                  <span>Message Officiel de Blackout (Personnalisable)</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Affiché aux responsables sur le Hub et les 3 jeux Face B lorsque le blackout est actif.
                </p>
              </div>

              <form onSubmit={saveBlackoutMessage} className="space-y-3">
                <textarea
                  rows={3}
                  value={blackoutMessageInput}
                  onChange={e => setBlackoutMessageInput(e.target.value)}
                  placeholder="Texte officiel de sobriété des camps scouts…"
                  className="input-scout text-xs leading-relaxed"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn-amber py-2 px-4 text-xs font-bold">
                    💾 Sauvegarder le message
                  </button>
                  <button
                    type="button"
                    onClick={restoreDefaultBlackoutMessage}
                    className="btn-ghost py-2 px-3 text-xs border border-white/10"
                  >
                    🔄 Restaurer le message officiel des camps
                  </button>
                </div>
              </form>
            </div>

            {/* Scheduled Dates Card */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>📅</span>
                  <span>Plage de Dates Programmée (Camps d'Été / Hiver)</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Verrouille automatiquement la Face B entre ces deux dates (incluses).
                </p>
              </div>

              <form onSubmit={saveBlackoutDates} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Date de début (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={e => setStartDateInput(e.target.value)}
                    className="input-scout text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Date de fin (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={e => setEndDateInput(e.target.value)}
                    className="input-scout text-xs"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2 pt-1">
                  <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold">
                    Enregistrer les dates
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateInput('')
                      setEndDateInput('')
                      apiAdminSetBlackoutDates(adminKey, null, null).then(b => setBlackout(b))
                    }}
                    className="btn-ghost py-2 px-3 text-xs border border-white/10"
                  >
                    Effacer la programmation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 2: TREE OF RESPONSIBLES (Point 3) ───────────────────────── */}
        {activeTab === 'tree' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <span>🌳</span>
                  <span>Arbre Généalogique des Responsables (P2P Trust Chain)</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Visualisation hiérarchique : Campagne AG ➔ Responsable Racine ➔ Filleuls ➔ Sous-filleuls
                </p>
              </div>
              <button
                onClick={() => loadTree(adminKey)}
                disabled={treeLoading}
                className="btn-ghost py-1.5 px-3 text-xs border border-white/10 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>🔄</span>
                <span>{treeLoading ? 'Chargement…' : 'Rafraîchir l\'arbre'}</span>
              </button>
            </div>

            {/* Tree Summary Stats */}
            {treeData && (
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Terminaux</p>
                  <p className="text-2xl font-bold font-mono text-white mt-1">{treeData.total_devices}</p>
                </div>
                <div className="glass-card p-3 text-center border-emerald-500/30">
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Actifs</p>
                  <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{treeData.active_devices}</p>
                </div>
                <div className="glass-card p-3 text-center border-red-500/30">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold">Sciés / Révoqués</p>
                  <p className="text-2xl font-bold font-mono text-red-400 mt-1">{treeData.revoked_devices}</p>
                </div>
              </div>
            )}

            {/* Tree Hierarchies by Campaign */}
            {treeLoading ? (
              <div className="p-8 text-center text-gray-400 text-xs italic">
                Chargement de la hiérarchie P2P…
              </div>
            ) : !treeData || treeData.campaigns.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs italic bg-white/5 rounded-xl">
                Aucune campagne ni appareil enregistré dans la base.
              </div>
            ) : (
              <div className="space-y-6">
                {treeData.campaigns.map(camp => (
                  <div key={camp.id} className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎫</span>
                        <div>
                          <h3 className="font-bold text-sm text-white">{camp.name}</h3>
                          <span className="text-[10px] font-mono text-gray-400">ID: {camp.id}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        camp.is_active ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {camp.is_active ? 'Campagne Active' : 'Expirée / Inactive'}
                      </span>
                    </div>

                    {camp.devices.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">
                        Aucun responsable racine n'a encore scanné cette amorce.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {camp.devices.map(rootDev => (
                          <TreeNodeItem
                            key={rootDev.id}
                            node={rootDev}
                            depth={0}
                            onPrune={handlePruneNode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: STATS (Point 4) ───────────────────────────────────────── */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <span>📊</span>
                  <span>Métriques & Statistiques d'Utilisation</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Mesures agrégées anonymisées depuis telemetry_events et devices.
                </p>
              </div>
              <button
                onClick={() => loadStats(adminKey)}
                disabled={statsLoading}
                className="btn-ghost py-1.5 px-3 text-xs border border-white/10 flex items-center gap-1"
              >
                <span>🔄</span>
                <span>{statsLoading ? 'Chargement…' : 'Rafraîchir'}</span>
              </button>
            </div>

            {statsLoading ? (
              <div className="p-8 text-center text-gray-400 text-xs italic">
                Calcul des statistiques…
              </div>
            ) : statsData ? (
              <>
                {/* Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Parties Jouées</p>
                    <p className="text-3xl font-black font-mono text-cyan-400 mt-1">
                      {statsData.summary.total_plays}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Temps Cumulé</p>
                    <p className="text-3xl font-black font-mono text-purple-400 mt-1">
                      {Math.round(statsData.summary.total_play_time_seconds / 60)} min
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Actifs (7 jours)</p>
                    <p className="text-3xl font-black font-mono text-emerald-400 mt-1">
                      {statsData.devices.active_7d}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Actifs (30 jours)</p>
                    <p className="text-3xl font-black font-mono text-scout-amber mt-1">
                      {statsData.devices.active_30d}
                    </p>
                  </div>
                </div>

                {/* Per Game Breakdown */}
                <div className="glass-card p-5 space-y-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>🎮</span>
                    <span>Fréquentation par Jeu</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {statsData.games.map(g => (
                      <div key={g.game_id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-scout-amber capitalize">
                            {g.game_id}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-gray-300">
                            {g.play_count} partie{g.play_count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center justify-between">
                          <span>Temps total :</span>
                          <span className="font-mono text-white font-semibold">
                            {Math.round(g.total_duration_seconds / 60)} min
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center justify-between">
                          <span>Durée moyenne :</span>
                          <span className="font-mono text-white font-semibold">
                            {g.avg_duration_seconds}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── TAB 4: CARDS & CSV (Point 5) ─────────────────────────────────── */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <span>🃏</span>
                  <span>Gestionnaire Complet des Cartes & CSV</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Export, import, ajouts/suppressions et validation directe des propositions joueurs.
                </p>
              </div>

              {/* Actions Export / Import / Ajout */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportCsv}
                  className="btn-ghost py-2 px-3 text-xs border border-white/10 hover:border-scout-amber/50 flex items-center gap-1.5"
                  title="Télécharger le fichier data/content.csv actuel"
                >
                  <span>📥</span>
                  <span>Exporter CSV</span>
                </button>

                <label className="btn-ghost py-2 px-3 text-xs border border-white/10 hover:border-purple-400/50 flex items-center gap-1.5 cursor-pointer">
                  <span>📤</span>
                  <span>Importer CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleUploadCsvFile}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleOpenAddCardModal}
                  className="btn-amber py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <span>➕</span>
                  <span>Ajouter une carte</span>
                </button>
              </div>
            </div>

            {/* Sub-tabs: Catalogue vs Propositions */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setCardsSubTab('catalog')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  cardsSubTab === 'catalog'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white bg-white/5'
                }`}
              >
                Catalogue Actuel ({cards.length})
              </button>
              <button
                onClick={() => setCardsSubTab('feedback')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  cardsSubTab === 'feedback'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white bg-white/5'
                }`}
              >
                <span>Propositions Joueurs</span>
                {feedbackList.filter(f => f.status === 'PENDING').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                    {feedbackList.filter(f => f.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-view: Catalog Table */}
            {cardsSubTab === 'catalog' && (
              <div className="glass-card p-4 space-y-4">
                {/* Game filter pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['all', 'infiltre', 'rondedenuit', 'chrono', 'carnotzet', 'debout', 'debrief'].map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGameFilter(g)}
                      className={`px-3 py-1.5 rounded-full capitalize font-semibold transition-all shrink-0 ${
                        selectedGameFilter === g
                          ? 'bg-scout-amber text-black'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {g === 'all' ? 'Tous les jeux' : g}
                    </button>
                  ))}
                </div>

                {cardsLoading ? (
                  <div className="p-8 text-center text-gray-400 text-xs italic">
                    Chargement des cartes…
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs italic">
                    Aucune carte trouvée pour ce filtre.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {filteredCards.map(c => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 font-bold font-mono text-[10px]">
                              {c.game}
                            </span>
                            <span className="text-gray-400 text-[10px] font-mono">
                              {c.category}
                            </span>
                            {c.title && (
                              <span className="font-bold text-white">
                                {c.title}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-200 leading-relaxed">
                            {c.content}
                          </p>
                          {c.extra && (
                            <p className="text-[11px] text-scout-amber font-mono">
                              ℹ️ {c.extra}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {c.sips > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 font-bold border border-amber-500/30">
                              🍺 {c.sips}
                            </span>
                          )}
                          <button
                            onClick={() => handleStartEditCard(c)}
                            className="text-xs text-scout-amber hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1"
                            title="Modifier cette carte"
                          >
                            <span>✏️</span>
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCard(c.id)}
                            className="text-gray-500 hover:text-red-400 px-2 py-1"
                            title="Supprimer cette carte"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: Player Feedback Proposals */}
            {cardsSubTab === 'feedback' && (
              <div className="glass-card p-4 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>📬</span>
                  <span>Propositions Soumises par les Joueurs</span>
                </h3>

                {feedbackList.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs italic bg-white/5 rounded-xl">
                    Aucune proposition reçue pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedbackList.map(fb => (
                      <div
                        key={fb.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-scout-amber">
                              {fb.target_game || 'Général'} · {fb.category || 'Idée'}
                            </span>
                            {fb.author_alias && (
                              <span className="text-gray-400 font-mono text-[10px]">
                                par {fb.author_alias}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              fb.status === 'APPROVED'
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : fb.status === 'REJECTED'
                                ? 'bg-red-900/60 text-red-300'
                                : 'bg-amber-900/60 text-amber-300'
                            }`}
                          >
                            {fb.status}
                          </span>
                        </div>

                        {fb.title && <h4 className="font-bold text-white">{fb.title}</h4>}
                        <p className="text-gray-200 leading-relaxed">{fb.content}</p>

                        {fb.status === 'PENDING' && (
                          <div className="pt-2 flex gap-2">
                            <button
                              onClick={() => handleReviewFeedback(fb.id, 'APPROVED')}
                              className="btn-primary py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30"
                            >
                              ✅ Valider & intégrer au catalogue
                            </button>
                            <button
                              onClick={() => handleReviewFeedback(fb.id, 'REJECTED')}
                              className="btn-ghost py-1.5 px-3 text-xs text-red-400 border border-white/10 hover:bg-red-950/40"
                            >
                              ❌ Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: CAMPAIGNS ─────────────────────────────────────────────── */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Create Campaign Form */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>➕</span>
                  <span>Créer une Campagne d'Amorçage (AG / Comité)</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Génère une amorce pour une assemblée ou un rassemblement de responsables.
                </p>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Identifiant unique (slug)
                    </label>
                    <input
                      placeholder="ag-2026-froideville"
                      value={campId}
                      onChange={e => setCampId(e.target.value)}
                      className="input-scout font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Nom affiché
                    </label>
                    <input
                      placeholder="AG Cantonale 2026"
                      value={campName}
                      onChange={e => setCampName(e.target.value)}
                      className="input-scout text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Jeton secret en clair (hashé en SHA-256 à l'enregistrement)
                    </label>
                    <input
                      placeholder="secret_token_ag2026"
                      value={campToken}
                      onChange={e => setCampToken(e.target.value)}
                      className="input-scout font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Durée de validité (heures)
                    </label>
                    <input
                      type="number"
                      value={campHours}
                      onChange={e => setCampHours(e.target.value)}
                      className="input-scout text-xs"
                      min="1"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary py-2 px-4 text-xs font-bold">
                  Créer la campagne
                </button>
              </form>
            </div>

            {/* Campaign List */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>🎫</span>
                <span>Campagnes Existantes</span>
              </h3>

              <div className="space-y-3">
                {campaigns.map(c => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scoutgame.ch'
                  const bootstrapUrl = `${origin}/?bootstrap=${encodeURIComponent(c.id)}`
                  const isCopied = copiedCampaignId === c.id

                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{c.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              c.is_active ? 'bg-emerald-950/60 text-emerald-300' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-gray-400 font-mono text-[10px] mt-0.5">
                            ID: {c.id} · Créée le {c.created_at} · Expire: {c.expires_at || 'Jamais'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCampaignUrl(c.id)}
                            className={`py-1 px-3 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                              isCopied
                                ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                                : 'btn-primary'
                            }`}
                          >
                            <span>{isCopied ? '✅' : '📋'}</span>
                            <span>{isCopied ? 'Copié !' : 'Copier le lien'}</span>
                          </button>
                          <button
                            onClick={() => setPrintCampaign({ name: c.name, token: c.id })}
                            className="btn-ghost py-1 px-3 text-xs border border-white/10 hover:border-scout-amber/40"
                          >
                            🖨️ Fiche QR
                          </button>
                          {c.is_active && (
                            <button
                              onClick={() => handleDeactivateCampaign(c.id)}
                              className="btn-ghost py-1 px-3 text-xs text-red-400 border border-white/10 hover:bg-red-950/30"
                            >
                              Désactiver
                            </button>
                          )}
                        </div>
                      </div>

                      {/* URL complète affichée en clair */}
                      <div className="bg-black/40 border border-white/10 rounded-lg p-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-gray-300 truncate select-all">
                          {bootstrapUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCampaignUrl(c.id)}
                          className="shrink-0 text-[10px] text-scout-amber hover:underline font-mono"
                        >
                          {isCopied ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 6: REPORTS & PRUNING ─────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Manual Pruning Form */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>🪓</span>
                  <span>Sciage Manuel d'Urgence</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Révoque immédiatement un appareil suspect et toute sa descendance de manière irréversible.
                </p>
              </div>

              <form onSubmit={handleManualPruneSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ID Appareil Cible (UUID)
                  </label>
                  <input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={manualDeviceId}
                    onChange={e => setManualDeviceId(e.target.value)}
                    className="input-scout font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Motif de révocation
                  </label>
                  <input
                    placeholder="Fuite constatée / Appareil de mineur…"
                    value={manualReason}
                    onChange={e => setManualReason(e.target.value)}
                    className="input-scout text-xs"
                    required
                  />
                </div>
                <div className="sm:col-span-2 pt-1">
                  <button type="submit" className="btn-danger py-2 px-4 text-xs font-bold">
                    🪓 Scier immédiatement cette branche
                  </button>
                </div>
              </form>
            </div>

            {/* Pending Reports List */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>🚨</span>
                  <span>Signalements de Terrain en Attente ({reports.length})</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Soumis par les responsables lors de suspicions de fuites.
                </p>
              </div>

              {reports.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs italic bg-white/5 rounded-xl">
                  Aucun signalement en attente. L'arbre de confiance est sain ! ⚜️
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(rep => (
                    <div
                      key={rep.id}
                      className="p-4 rounded-xl bg-scout-dark border border-red-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 font-bold text-xs uppercase tracking-wider">
                            Rapport #{rep.id}
                          </span>
                          <span className="text-gray-400 text-xs font-mono">{rep.created_at}</span>
                        </div>
                        <p className="text-sm text-white font-medium">{rep.reason}</p>
                        <div className="text-xs text-gray-400 flex flex-wrap gap-3 font-mono">
                          <span>Cible: {rep.target_device_id}</span>
                          {rep.reporter_name && <span>Par: {rep.reporter_name} ({rep.reporter_group})</span>}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => handleReviewReport(rep.id, 'APPROVED')}
                          className="btn-danger py-1.5 px-3 text-xs font-bold"
                        >
                          🪓 Scier la branche
                        </button>
                        <button
                          onClick={() => handleReviewReport(rep.id, 'REJECTED')}
                          className="btn-ghost py-1.5 px-3 text-xs border border-white/10"
                        >
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Modal Add Card ─────────────────────────────────────────────────── */}
      {showAddCardModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddCardModal(false)}
        >
          <div
            className="glass-card max-w-lg w-full p-6 space-y-4 border border-scout-amber/40 shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>{editingCardId !== null ? '✏️' : '➕'}</span>
                <span>{editingCardId !== null ? `Modifier la Carte #${editingCardId}` : 'Ajouter une Carte au Catalogue'}</span>
              </h3>
              <button onClick={() => setShowAddCardModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Jeu</label>
                  <select
                    value={newCardForm.game}
                    onChange={e => setNewCardForm({ ...newCardForm, game: e.target.value })}
                    className="input-scout text-xs"
                  >
                    <option value="infiltre">infiltre</option>
                    <option value="rondedenuit">rondedenuit</option>
                    <option value="chrono">chrono</option>
                    <option value="carnotzet">carnotzet</option>
                    <option value="debout">debout</option>
                    <option value="debrief">debrief</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Catégorie</label>
                  <input
                    value={newCardForm.category}
                    onChange={e => setNewCardForm({ ...newCardForm, category: e.target.value })}
                    placeholder="duel, vote, pub, regle, etc."
                    className="input-scout text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Titre (optionnel)</label>
                <input
                  value={newCardForm.title}
                  onChange={e => setNewCardForm({ ...newCardForm, title: e.target.value })}
                  placeholder="Bras de Fer de Froideville"
                  className="input-scout text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Contenu de la carte</label>
                <textarea
                  rows={3}
                  value={newCardForm.content}
                  onChange={e => setNewCardForm({ ...newCardForm, content: e.target.value })}
                  placeholder="Texte de la carte (variables autorisées : {p1}, {p2}, {sips})…"
                  className="input-scout text-xs"
                  required
                />
              </div>

              {/* Dynamic Extra Field Config */}
              {(() => {
                const extraConfig = getExtraFieldConfig(newCardForm.game, newCardForm.category)
                return (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-300">
                      {extraConfig.label}
                    </label>
                    <input
                      value={newCardForm.extra}
                      onChange={e => setNewCardForm({ ...newCardForm, extra: e.target.value })}
                      placeholder={extraConfig.placeholder}
                      className="input-scout text-xs"
                    />
                    <p className="text-[11px] text-gray-400 italic">
                      💡 {extraConfig.help}
                    </p>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Gorgées (sips)</label>
                  <input
                    type="number"
                    value={newCardForm.sips}
                    onChange={e => setNewCardForm({ ...newCardForm, sips: parseInt(e.target.value, 10) || 0 })}
                    className="input-scout text-xs"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Min joueurs</label>
                  <input
                    type="number"
                    value={newCardForm.min_players}
                    onChange={e => setNewCardForm({ ...newCardForm, min_players: parseInt(e.target.value, 10) || 2 })}
                    className="input-scout text-xs"
                    min="2"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="btn-ghost flex-1 py-2 text-xs"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-amber flex-1 py-2 text-xs font-bold">
                  {editingCardId !== null ? 'Enregistrer les modifications' : 'Enregistrer la carte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Print Sheet Modal ──────────────────────────────────────────────── */}
      {printCampaign && (
        <PrintSheetModal
          campaignName={printCampaign.name}
          token={printCampaign.token}
          onClose={() => setPrintCampaign(null)}
        />
      )}
    </div>
  )
}
