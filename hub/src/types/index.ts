// ── Auth ────────────────────────────────────────────────────────────────────
export type AuthState = 'unknown' | 'authorized' | 'unauthorized' | 'blackout'

export interface VerifyResponse {
  valid: boolean
  blackout?: boolean
  reason?: string
}

export interface BootstrapResponse {
  device_pass?: string
  status?: string
}

export interface InviteResponse {
  device_pass?: string
  status?: string
}

export interface GenerateInviteResponse {
  invite_token: string
  expires_in: number
}

// ── Players ──────────────────────────────────────────────────────────────────
export interface Player {
  id: string
  name: string
}

// ── Games ────────────────────────────────────────────────────────────────────
export interface GameInfo {
  id: string
  name: string
  description: string
  icon: string
  url: string
  color: string
  badge?: string
  face: 'A' | 'B'
}

// ── Feedback ─────────────────────────────────────────────────────────────────
export interface FeedbackPayload {
  type: 'PROPOSITION' | 'CONTACT_LEGAL'
  target_game?: string
  category?: string
  title?: string
  content: string
  extra_data?: string
  author_alias?: string
  contact_email?: string
}

// ── Report ───────────────────────────────────────────────────────────────────
export interface ReportPayload {
  target_device_id: string
  reason: string
  reporter_name?: string
  reporter_group?: string
}
