import type { Card, FeedbackPayload, VerifyResult } from '../types'

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
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

export async function verifyDevice(pass: string): Promise<VerifyResult> {
  const res = await fetch(`${API}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_pass: pass }),
  })
  if (!res.ok) {
    return { valid: false, reason: `HTTP ${res.status}` }
  }
  return res.json()
}

export async function fetchDebriefCards(mode?: string): Promise<Card[]> {
  const url = mode ? `${API}/api/cards/debrief?mode=${mode}` : `${API}/api/cards/debrief`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Erreur lors du chargement des cartes (${res.status})`)
  }
  return res.json()
}

export async function sendTelemetry(durationSeconds: number): Promise<void> {
  try {
    await fetch(`${API}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: 'debrief',
        duration_seconds: Math.round(durationSeconds),
      }),
    })
  } catch {
    // Non-bloquant
  }
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Erreur serveur (${res.status})`)
  }
  return res.json()
}
