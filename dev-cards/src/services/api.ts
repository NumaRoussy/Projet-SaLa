import type { DevCard, DevCardDraft, DevStats } from '../types';

const DEV_KEY_STORAGE = 'scoutgame_dev_access_key';
const DEV_LABEL_STORAGE = 'scoutgame_dev_label';
const DEV_SESSION_STORAGE = 'scoutgame_dev_session_id';

export function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(DEV_SESSION_STORAGE);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(DEV_SESSION_STORAGE, id);
    }
    return id;
  } catch {
    return `dev-${Date.now().toString(36)}`;
  }
}

export function getStoredDevKey(): string {
  try {
    return sessionStorage.getItem(DEV_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredDevKey(key: string): void {
  try {
    if (key) {
      sessionStorage.setItem(DEV_KEY_STORAGE, key);
    } else {
      sessionStorage.removeItem(DEV_KEY_STORAGE);
    }
  } catch {
    // ignore storage failures
  }
}

export function getStoredDevLabel(): string {
  try {
    return sessionStorage.getItem(DEV_LABEL_STORAGE) || 'Dev';
  } catch {
    return 'Dev';
  }
}

export function setStoredDevLabel(label: string): void {
  try {
    sessionStorage.setItem(DEV_LABEL_STORAGE, label.trim() || 'Dev');
  } catch {
    // ignore
  }
}

async function apiFetch<T>(
  path: string,
  devKey: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (devKey) {
    headers.set('X-Dev-Key', devKey);
  }
  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let detail = `Erreur HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = String(data.detail);
    } catch {
      // ignore non-json
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function authenticateDev(code: string): Promise<boolean> {
  const res = await fetch('/api/dev/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return res.ok;
}

export function buildWsUrl(devKey: string, sessionId: string, label: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({
    token: devKey,
    session_id: sessionId,
    label: label || 'Dev',
  });
  return `${proto}//${window.location.host}/ws/dev?${params.toString()}`;
}

export interface ClaimNextResponse {
  card: DevCard | null;
  stats: DevStats;
  active_devs: number;
}

export async function claimNextCard(
  devKey: string,
  params: {
    session_id: string;
    game?: string;
    mode?: string;
    queue?: 'pending' | 'review_later';
    skip_id?: number;
  }
): Promise<ClaimNextResponse> {
  return apiFetch<ClaimNextResponse>('/api/dev/cards/claim-next', devKey, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function sendCardHeartbeat(
  devKey: string,
  cardId: number,
  sessionId: string
): Promise<void> {
  await apiFetch(`/api/dev/cards/${cardId}/heartbeat`, devKey, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function performCardAction(
  devKey: string,
  cardId: number,
  payload: {
    session_id: string;
    action: 'validate' | 'review_later' | 'reject' | 'restore';
    note?: string;
    actor?: string;
  }
): Promise<{ card: DevCard; stats: DevStats }> {
  return apiFetch(`/api/dev/cards/${cardId}/action`, devKey, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCard(
  devKey: string,
  cardId: number,
  payload: DevCardDraft & { validate?: boolean; session_id?: string; actor?: string }
): Promise<{ card: DevCard; stats: DevStats }> {
  return apiFetch(`/api/dev/cards/${cardId}`, devKey, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createCard(
  devKey: string,
  payload: DevCardDraft & { status?: 'PENDING' | 'VALIDATED'; validate?: boolean; actor?: string }
): Promise<{ card: DevCard; stats: DevStats }> {
  return apiFetch('/api/dev/cards', devKey, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listCards(
  devKey: string,
  filters: {
    game?: string;
    mode?: string;
    status?: string;
    search?: string;
  }
): Promise<{ cards: DevCard[]; stats: DevStats; active_devs: number }> {
  const params = new URLSearchParams();
  if (filters.game && filters.game !== 'all') params.set('game', filters.game);
  if (filters.mode && filters.mode !== 'all') params.set('mode', filters.mode);
  if (filters.status) params.set('status', filters.status);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  const qs = params.toString();
  return apiFetch(`/api/dev/cards${qs ? `?${qs}` : ''}`, devKey);
}

export async function fetchDevStats(
  devKey: string
): Promise<{ stats: DevStats; active_devs: number }> {
  return apiFetch('/api/dev/stats', devKey);
}

export async function syncFromProd(
  devKey: string,
  strategy: 'replace' | 'append',
  actor?: string
): Promise<{ imported: number; skipped: number; stats: DevStats }> {
  return apiFetch('/api/dev/sync/from-prod', devKey, {
    method: 'POST',
    body: JSON.stringify({ strategy, actor }),
  });
}

export async function uploadCsvFile(
  devKey: string,
  file: File,
  strategy: 'replace' | 'append',
  actor?: string
): Promise<{ imported: number; skipped: number; stats: DevStats }> {
  const form = new FormData();
  form.append('file', file);
  form.append('strategy', strategy);
  if (actor) form.append('actor', actor);
  return apiFetch(`/api/dev/sync/upload-csv?strategy=${strategy}`, devKey, {
    method: 'POST',
    body: form,
  });
}

export async function uploadCsvText(
  devKey: string,
  csvContent: string,
  strategy: 'replace' | 'append',
  actor?: string
): Promise<{ imported: number; skipped: number; stats: DevStats }> {
  return apiFetch(`/api/dev/sync/upload-csv?strategy=${strategy}`, devKey, {
    method: 'POST',
    body: JSON.stringify({ csv_content: csvContent, strategy, actor }),
  });
}

export async function downloadValidatedCsv(devKey: string): Promise<void> {
  const res = await fetch('/api/dev/sync/export-csv', {
    headers: { 'X-Dev-Key': devKey },
  });
  if (!res.ok) {
    throw new Error(`Erreur export CSV (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content_validated.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function pushToProd(
  devKey: string,
  actor?: string
): Promise<{ pushed_count: number; csv_path: string; backup_path: string | null; stats: DevStats }> {
  return apiFetch('/api/dev/sync/push-to-prod', devKey, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}
