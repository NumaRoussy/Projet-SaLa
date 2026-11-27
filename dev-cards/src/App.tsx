import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FolderKanban,
  Layers,
  LogOut,
  PlusCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ActiveTab, DevCardDraft, DevStats } from './types';
import { FILTER_GAMES, getGameMeta } from './config/games';
import {
  buildWsUrl,
  createCard,
  fetchDevStats,
  getOrCreateSessionId,
  getStoredDevKey,
  getStoredDevLabel,
  setStoredDevKey,
  setStoredDevLabel,
  syncFromProd,
} from './services/api';
import { LoginScreen } from './components/LoginScreen';
import { ReviewView } from './components/ReviewView';
import { CatalogView } from './components/CatalogView';
import { CardEditorForm } from './components/CardEditorForm';
import { SyncView } from './components/SyncView';

const EMPTY_STATS: DevStats = {
  pending: 0,
  review_later: 0,
  validated: 0,
  rejected: 0,
  total: 0,
};

export function App() {
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const [devKey, setDevKey] = useState<string>(() => getStoredDevKey());
  const [devLabel, setDevLabel] = useState<string>(() => getStoredDevLabel());

  const [activeTab, setActiveTab] = useState<ActiveTab>('review');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [stats, setStats] = useState<DevStats>(EMPTY_STATS);
  const [activeDevs, setActiveDevs] = useState<number>(1);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsTick, setWsTick] = useState<number>(0);

  const [createToast, setCreateToast] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [createResetKey, setCreateResetKey] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  const handleAuthenticated = (code: string, label: string) => {
    setStoredDevKey(code);
    setStoredDevLabel(label);
    setDevKey(code);
    setDevLabel(label);
  };

  const handleLogout = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStoredDevKey('');
    setDevKey('');
    setWsConnected(false);
    setStats(EMPTY_STATS);
  };

  const handleStatsUpdate = (nextStats: DevStats, nextDevs?: number) => {
    setStats(nextStats);
    if (typeof nextDevs === 'number') {
      setActiveDevs(nextDevs);
    }
  };

  // WebSocket temps réel + polling de secours toutes les 4s si WS coupé
  useEffect(() => {
    if (!devKey) return;

    let stopped = false;
    let reconnectTimer: number | undefined;
    let pingTimer: number | undefined;

    const connectWs = () => {
      if (stopped) return;
      try {
        const ws = new WebSocket(buildWsUrl(devKey, sessionId, devLabel));
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          pingTimer = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.stats) {
              setStats(msg.stats);
            }
            if (typeof msg.active_devs === 'number') {
              setActiveDevs(msg.active_devs);
            }
            if (msg.type === 'state_updated') {
              setWsTick((t) => t + 1);
            }
          } catch {
            // ignore malformed message
          }
        };

        ws.onclose = (ev) => {
          setWsConnected(false);
          if (pingTimer) window.clearInterval(pingTimer);
          if (ev.code === 4003) {
            handleLogout();
            return;
          }
          if (!stopped) {
            reconnectTimer = window.setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();

    const pollTimer = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      void fetchDevStats(devKey)
        .then((res) => {
          setStats(res.stats);
          setActiveDevs(res.active_devs);
        })
        .catch((err: Error & { status?: number }) => {
          if (err.status === 403) handleLogout();
        });
    }, 4000);

    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      window.clearInterval(pollTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [devKey, sessionId, devLabel]);

  const availableModes = useMemo(() => {
    if (gameFilter === 'all') return [];
    return getGameMeta(gameFilter).modes.filter(Boolean);
  }, [gameFilter]);

  const handleSelectGame = (gid: string) => {
    setGameFilter(gid);
    setModeFilter('all');
  };

  const handleQuickSyncFromProd = async () => {
    const res = await syncFromProd(devKey, 'append', devLabel);
    setStats(res.stats);
    setWsTick((t) => t + 1);
  };

  const initialCreateDraft: DevCardDraft = useMemo(() => {
    const targetGame = gameFilter !== 'all' ? gameFilter : 'vachao';
    const meta = getGameMeta(targetGame);
    return {
      game: targetGame,
      mode: modeFilter !== 'all' ? modeFilter : meta.defaultMode,
      category: meta.defaultCategory,
      title: '',
      content: '',
      extra: '',
      sips: targetGame === 'infiltre' || targetGame === 'chrono' ? 0 : 2,
      loss_percent: targetGame === 'crise' ? 1.0 : 0.0,
      min_players: targetGame === 'chrono' ? 4 : 2,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createResetKey, gameFilter, modeFilter]);

  const handleCreateCard = async (draft: DevCardDraft, validateAfter: boolean) => {
    setCreating(true);
    setCreateToast('');
    try {
      const res = await createCard(devKey, {
        ...draft,
        validate: validateAfter,
        status: validateAfter ? 'VALIDATED' : 'PENDING',
        actor: devLabel,
      });
      setStats(res.stats);
      setCreateResetKey((k) => k + 1);
      setCreateToast(
        validateAfter
          ? `Carte #${res.card.id} créée et validée.`
          : `Carte #${res.card.id} ajoutée à la file « À traiter ».`
      );
    } finally {
      setCreating(false);
    }
  };

  if (!devKey) {
    return (
      <LoginScreen initialLabel={devLabel} onAuthenticated={handleAuthenticated} />
    );
  }

  return (
    <div className="app-shell">
      {/* En-tête compact fixe */}
      <header className="sticky top-0 z-30 bg-[#121316] border-b border-white/10">
        <div className="mx-auto max-w-2xl px-3 pt-2.5 pb-2 space-y-2">
          {/* Ligne 1 : Titre + État WS + Déconnexion */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold tracking-tight text-white truncate">
                dev.scoutgame.ch
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                  wsConnected
                    ? 'bg-[#2e6f56]/20 border-[#2e6f56]/60 text-[#8ee3be]'
                    : 'bg-[#b5892e]/20 border-[#b5892e]/60 text-[#f3c669]'
                }`}
              >
                {wsConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {wsConnected ? `${activeDevs} en ligne` : 'Sync 4s'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                {devLabel}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Se déconnecter"
                className="inline-flex items-center gap-1 rounded-lg bg-[#18191d] border border-white/10 px-2.5 py-1.5 text-[11px] text-gray-300 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quitter</span>
              </button>
            </div>
          </div>

          {/* Ligne 2 : Compteur global temps réel */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-300">
            <span>
              Validées <strong className="text-[#8ee3be]">{stats.validated}</strong>
            </span>
            <span className="text-gray-600">·</span>
            <span>
              À traiter <strong className="text-white">{stats.pending}</strong>
            </span>
            <span className="text-gray-600">·</span>
            <span>
              À revoir <strong className="text-[#f3c669]">{stats.review_later}</strong>
            </span>
            <span className="text-gray-600">·</span>
            <span>
              Rejetées <strong className="text-red-300">{stats.rejected}</strong>
            </span>
          </div>

          {/* Ligne 3 : Filtres rapides par jeu (hors + Créer et Sync) */}
          {(activeTab === 'review' || activeTab === 'catalog') && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {FILTER_GAMES.map((g) => {
                  const active = gameFilter === g.id;
                  const meta = g.id === 'all' ? null : getGameMeta(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectGame(g.id)}
                      style={
                        active && meta
                          ? { borderColor: meta.accent }
                          : undefined
                      }
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-[#252830] border-white/30 text-white'
                          : 'bg-[#18191d] border-white/10 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {availableModes.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setModeFilter('all')}
                    className={`shrink-0 rounded-md px-2.5 py-0.5 text-[11px] border ${
                      modeFilter === 'all'
                        ? 'bg-[#252830] border-white/25 text-white'
                        : 'bg-[#18191d] border-white/10 text-gray-400'
                    }`}
                  >
                    Tous modes
                  </button>
                  {availableModes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModeFilter(m)}
                      className={`shrink-0 rounded-md px-2.5 py-0.5 text-[11px] border ${
                        modeFilter === m
                          ? 'bg-[#252830] border-white/25 text-white'
                          : 'bg-[#18191d] border-white/10 text-gray-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-3 pt-3 pb-24">
        {activeTab === 'review' && (
          <ReviewView
            devKey={devKey}
            sessionId={sessionId}
            devLabel={devLabel}
            gameFilter={gameFilter}
            modeFilter={modeFilter}
            stats={stats}
            wsTick={wsTick}
            onStatsUpdate={handleStatsUpdate}
            onGoToSync={() => setActiveTab('sync')}
            onQuickSyncFromProd={handleQuickSyncFromProd}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogView
            devKey={devKey}
            sessionId={sessionId}
            devLabel={devLabel}
            gameFilter={gameFilter}
            modeFilter={modeFilter}
            stats={stats}
            wsTick={wsTick}
            onStatsUpdate={handleStatsUpdate}
          />
        )}

        {activeTab === 'create' && (
          <div className="rounded-xl card-surface p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Créer une nouvelle carte
              </h2>
              <p className="text-xs text-gray-400">
                Enregistrée dans <code className="text-gray-300">dev_cards.db</code> avec alerte syntaxe en direct.
              </p>
            </div>

            {createToast && (
              <div className="flex items-center gap-2 rounded-lg bg-[#2e6f56]/20 border border-[#2e6f56] px-3 py-2 text-xs text-[#8ee3be]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{createToast}</span>
              </div>
            )}

            <CardEditorForm
              key={createResetKey}
              initialDraft={initialCreateDraft}
              saving={creating}
              onSave={handleCreateCard}
            />
          </div>
        )}

        {activeTab === 'sync' && (
          <SyncView
            devKey={devKey}
            devLabel={devLabel}
            stats={stats}
            onStatsUpdate={handleStatsUpdate}
          />
        )}
      </main>

      {/* Navigation basse fixe (4 onglets au pouce) */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-30 bg-[#121316] border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-2xl grid grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === 'review' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Revue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === 'catalog' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Catalogue</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateToast('');
              setActiveTab('create');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === 'create' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Créer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === 'sync' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Sync &amp; CSV</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
