/**
 * services/api.ts
 * Toutes les communications avec le backend FastAPI.
 */
import type {
  VerifyResponse,
  BootstrapResponse,
  InviteResponse,
  GenerateInviteResponse,
  FeedbackPayload,
  ReportPayload,
} from '../types'

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // PRIORITÉ ABSOLUE : Si on est sur une IP locale ou localhost, TOUJOURS utiliser l'IP sur le port 8000
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      !host.endsWith('scoutgame.ch')
    ) {
      return `http://${host}:8000`
    }
  }
  return import.meta.env.VITE_API_URL || 'https://api.scoutgame.ch'
}

const API = getApiBaseUrl()

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  // 204 No Content
  if (res.status === 204) return {} as T
  return res.json()
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function apiBootstrap(token: string): Promise<BootstrapResponse> {
  return post('/api/auth/bootstrap', { bootstrap_token: token })
}

export async function apiVerify(devicePass: string): Promise<VerifyResponse> {
  return post('/api/auth/verify', { device_pass: devicePass })
}

export async function apiConsumeInvite(token: string): Promise<InviteResponse> {
  return post('/api/invite/consume', { invite_token: token })
}

export async function apiGenerateInvite(devicePass: string): Promise<GenerateInviteResponse> {
  return post('/api/invite/generate', {}, { Authorization: `Bearer ${devicePass}` })
}

// ── Reports ─────────────────────────────────────────────────────────────────

export async function apiSubmitReport(payload: ReportPayload): Promise<{ status: string }> {
  return post('/api/reports', payload)
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export async function apiSubmitFeedback(payload: FeedbackPayload): Promise<{ status: string }> {
  return post('/api/feedback', payload)
}

// ── Admin ───────────────────────────────────────────────────────────────────

export interface AdminBlackoutStatus {
  camp_blackout_active: boolean
  camp_blackout_start: string | null
  camp_blackout_end: string | null
  date_active: boolean
  effective_blackout: boolean
  camp_blackout_message?: string
  default_blackout_message?: string
  reason: string
}

export interface AdminReport {
  id: number
  target_device_id: string
  reason: string
  reporter_name: string | null
  reporter_group: string | null
  created_at: string
}

export interface AdminCampaign {
  id: string
  name: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export interface AdminTreeNode {
  id: string
  parent_device_id: string | null
  bootstrap_campaign_id: string | null
  is_revoked: boolean
  revocation_reason: string | null
  created_at: string
  last_seen_at: string | null
  descendant_count: number
  children: AdminTreeNode[]
}

export interface AdminCampaignTree {
  id: string
  name: string
  is_active: boolean
  created_at: string
  expires_at: string | null
  devices: AdminTreeNode[]
}

export interface AdminTreeResponse {
  campaigns: AdminCampaignTree[]
  orphans: AdminTreeNode[]
  total_devices: number
  active_devices: number
  revoked_devices: number
}

export interface AdminGameStats {
  game_id: string
  play_count: number
  total_duration_seconds: number
  avg_duration_seconds: number
}

export interface AdminStatsResponse {
  devices: {
    total: number
    active: number
    revoked: number
    active_7d: number
    active_30d: number
  }
  games: AdminGameStats[]
  summary: {
    total_plays: number
    total_play_time_seconds: number
    events_7d: number
    duration_7d: number
    events_30d: number
    duration_30d: number
  }
}

export interface AdminCard {
  id: number
  game: string
  category: string
  title: string | null
  content: string
  extra: string | null
  sips: number
  min_players: number
}

export interface AdminFeedback {
  id: number
  type: string
  target_game: string | null
  category: string | null
  title: string | null
  content: string
  extra_data: string | null
  author_alias: string | null
  contact_email: string | null
  status: string
  created_at: string
}

async function adminGet<T>(path: string, adminKey: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function adminPost<T>(path: string, body: unknown, adminKey: string): Promise<T> {
  return post<T>(path, body, { 'X-Admin-Key': adminKey })
}

export async function apiAdminCheckKey(adminKey: string): Promise<{ valid: boolean }> {
  return adminGet('/api/admin/check-key', adminKey)
}

export async function apiAdminGetBlackout(adminKey: string): Promise<AdminBlackoutStatus> {
  return adminGet('/api/admin/blackout', adminKey)
}

export async function apiAdminSetBlackout(adminKey: string, active: boolean): Promise<AdminBlackoutStatus> {
  return adminPost('/api/admin/blackout', { active }, adminKey)
}

export async function apiAdminSetBlackoutDates(
  adminKey: string,
  startDate: string | null,
  endDate: string | null,
): Promise<AdminBlackoutStatus> {
  return adminPost('/api/admin/blackout-dates', { start_date: startDate, end_date: endDate }, adminKey)
}

export async function apiAdminSetBlackoutMessage(
  adminKey: string,
  message: string | null,
): Promise<AdminBlackoutStatus> {
  return adminPost('/api/admin/blackout-message', { message }, adminKey)
}

export async function apiAdminGetReports(adminKey: string): Promise<AdminReport[]> {
  return adminGet('/api/admin/reports', adminKey)
}

export async function apiAdminReviewReport(
  adminKey: string,
  reportId: number,
  action: 'APPROVED' | 'REJECTED',
): Promise<{ report_id: number; action: string; revoked_count: number }> {
  return adminPost(`/api/admin/reports/${reportId}/review`, { report_id: reportId, action }, adminKey)
}

export async function apiAdminPruneBranch(
  adminKey: string,
  targetDeviceId: string,
  reason: string,
): Promise<{ revoked_count: number; status: string }> {
  return adminPost('/api/admin/prune-branch', { target_device_id: targetDeviceId, reason }, adminKey)
}

export async function apiAdminGetCampaigns(adminKey: string): Promise<AdminCampaign[]> {
  return adminGet('/api/admin/campaigns', adminKey)
}

export async function apiAdminCreateCampaign(
  adminKey: string,
  payload: { id: string; name: string; token: string; expires_at?: string },
): Promise<{ id: string; status: string }> {
  return adminPost('/api/admin/campaigns', payload, adminKey)
}

export async function apiAdminDeactivateCampaign(
  adminKey: string,
  campaignId: string,
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API}/api/admin/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) {
    throw new Error(`Erreur lors de la désactivation (${res.status})`)
  }
  return res.json()
}

export async function apiAdminImportCsv(
  adminKey: string,
  csvContent?: string,
): Promise<{ status: string; imported_count: number; message: string }> {
  return adminPost('/api/admin/import-csv', { csv_content: csvContent || null }, adminKey)
}

export async function apiAdminGetTree(adminKey: string): Promise<AdminTreeResponse> {
  return adminGet('/api/admin/tree', adminKey)
}

export async function apiAdminGetStats(adminKey: string): Promise<AdminStatsResponse> {
  return adminGet('/api/admin/stats', adminKey)
}

export async function apiAdminGetCards(adminKey: string, game?: string): Promise<AdminCard[]> {
  const q = game ? `?game=${encodeURIComponent(game)}` : ''
  return adminGet(`/api/admin/cards${q}`, adminKey)
}

export async function apiAdminCreateCard(
  adminKey: string,
  card: { game: string; category: string; title?: string; content: string; extra?: string; sips?: number; min_players?: number },
): Promise<{ id: number; status: string }> {
  return adminPost('/api/admin/cards', card, adminKey)
}

export async function apiAdminDeleteCard(
  adminKey: string,
  cardId: number,
): Promise<{ id: number; status: string }> {
  const res = await fetch(`${API}/api/admin/cards/${cardId}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) {
    throw new Error(`Erreur lors de la suppression (${res.status})`)
  }
  return res.json()
}

export async function apiAdminUpdateCard(
  adminKey: string,
  cardId: number,
  card: { game: string; category: string; title?: string; content: string; extra?: string; sips?: number; min_players?: number },
): Promise<{ id: number; status: string }> {
  const res = await fetch(`${API}/api/admin/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify(card),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function apiAdminUploadCardsCsv(
  adminKey: string,
  csvContent: string,
): Promise<{ status: string; imported_count: number }> {
  return adminPost('/api/admin/cards/upload-csv', { csv_content: csvContent }, adminKey)
}

export async function apiAdminGetFeedback(adminKey: string, status?: string): Promise<AdminFeedback[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return adminGet(`/api/admin/feedback${q}`, adminKey)
}

export async function apiAdminReviewFeedback(
  adminKey: string,
  feedbackId: number,
  action: 'APPROVED' | 'REJECTED',
): Promise<{ id: number; status: string }> {
  return adminPost(`/api/admin/feedback/${feedbackId}/status`, { action }, adminKey)
}


