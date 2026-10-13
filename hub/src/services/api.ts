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

const API = import.meta.env.VITE_API_URL || ''

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
