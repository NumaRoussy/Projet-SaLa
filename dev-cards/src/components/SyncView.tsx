import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileUp,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import type { DevStats } from '../types';
import {
  downloadValidatedCsv,
  pushToProd,
  syncFromProd,
  uploadCsvFile,
  uploadCsvText,
} from '../services/api';

interface SyncViewProps {
  devKey: string;
  devLabel: string;
  stats: DevStats;
  onStatsUpdate: (stats: DevStats) => void;
}

export const SyncView: React.FC<SyncViewProps> = ({
  devKey,
  devLabel,
  stats,
  onStatsUpdate,
}) => {
  const [busy, setBusy] = useState(false);
  const [csvStrategy, setCsvStrategy] = useState<'append' | 'replace'>('append');
  const [rawCsv, setRawCsv] = useState('');
  const [confirmReplaceProd, setConfirmReplaceProd] = useState(false);
  const [confirmPushProd, setConfirmPushProd] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runTask = async (fn: () => Promise<void>) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erreur inattendue',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFromProd = (strategy: 'append' | 'replace') =>
    runTask(async () => {
      const res = await syncFromProd(devKey, strategy, devLabel);
      onStatsUpdate(res.stats);
      setConfirmReplaceProd(false);
      setFeedback({
        type: 'ok',
        text:
          strategy === 'replace'
            ? `Base dev remplacée : ${res.imported} cartes importées depuis la prod.`
            : `${res.imported} nouvelles cartes ajoutées depuis la prod (${res.skipped} doublons ignorés).`,
      });
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void runTask(async () => {
      const res = await uploadCsvFile(devKey, file, csvStrategy, devLabel);
      onStatsUpdate(res.stats);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFeedback({
        type: 'ok',
        text: `Fichier « ${file.name} » importé : ${res.imported} cartes ajoutées (${res.skipped} ignorées).`,
      });
    });
  };

  const handlePasteImport = () => {
    if (!rawCsv.trim()) return;
    void runTask(async () => {
      const res = await uploadCsvText(devKey, rawCsv, csvStrategy, devLabel);
      onStatsUpdate(res.stats);
      setRawCsv('');
      setFeedback({
        type: 'ok',
        text: `CSV collé importé : ${res.imported} cartes (${res.skipped} doublons ignorés).`,
      });
    });
  };

  const handleExport = () =>
    runTask(async () => {
      await downloadValidatedCsv(devKey);
      setFeedback({
        type: 'ok',
        text: `Export CSV lancé (${stats.validated} cartes validées).`,
      });
    });

  const handlePushToProd = () =>
    runTask(async () => {
      const res = await pushToProd(devKey, devLabel);
      onStatsUpdate(res.stats);
      setConfirmPushProd(false);
      setFeedback({
        type: 'ok',
        text: `Production mise à jour : ${res.pushed_count} cartes publiées dans data/content.csv & scoutgame.db (sauvegarde .bak créée).`,
      });
    });

  return (
    <div className="space-y-4 pb-4">
      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs ${
            feedback.type === 'ok'
              ? 'bg-[#2e6f56]/20 border-[#2e6f56] text-[#a7ecd0]'
              : 'bg-[#9b2c37]/20 border-[#9b2c37] text-red-200'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. Importer depuis la Production */}
      <section className="rounded-xl card-surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Database className="h-4 w-4 text-[#74c69d]" />
          <span>1. Importer depuis la Production (content.csv)</span>
        </div>
        <p className="text-xs text-gray-400">
          Charge le catalogue de production dans la base de revue isolée (<code className="text-gray-300">dev_cards.db</code>).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleFromProd('append')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#252830] border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#2d313b] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Ajouter les manquantes (append)
          </button>

          {!confirmReplaceProd ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmReplaceProd(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#9b2c37]/20 border border-[#9b2c37]/70 px-3.5 py-2.5 text-xs font-semibold text-red-200 disabled:opacity-50"
            >
              Tout remplacer par la prod
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmReplaceProd(false)}
                className="flex-1 rounded-lg bg-[#121316] border border-white/10 py-2.5 text-xs text-gray-300"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleFromProd('replace')}
                className="flex-1 rounded-lg bg-[#9b2c37] py-2.5 text-xs font-semibold text-white"
              >
                Confirmer
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. Importer un lot CSV (ex. lot IA) */}
      <section className="rounded-xl card-surface p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileUp className="h-4 w-4 text-[#f3c669]" />
            <span>2. Importer un lot CSV externe</span>
          </div>

          <select
            value={csvStrategy}
            onChange={(e) => setCsvStrategy(e.target.value as 'append' | 'replace')}
            className="rounded-md bg-[#121316] border border-white/10 px-2 py-1 text-xs text-gray-200"
          >
            <option value="append">Mode : Ajouter (append)</option>
            <option value="replace">Mode : Remplacer (replace)</option>
          </select>
        </div>

        <p className="text-[11px] text-gray-400">
          Colonnes attendues :{' '}
          <code className="text-gray-300">
            game,mode,category,title,content,extra,sips,loss_percent,min_players
          </code>
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={busy}
          className="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border file:border-white/15 file:bg-[#252830] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
        />

        <textarea
          value={rawCsv}
          onChange={(e) => setRawCsv(e.target.value)}
          rows={4}
          placeholder="Ou collez directement le contenu CSV ici..."
          className="w-full rounded-lg bg-[#121316] border border-white/10 p-2.5 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-white/25"
        />
        <button
          type="button"
          disabled={busy || !rawCsv.trim()}
          onClick={handlePasteImport}
          className="w-full rounded-lg bg-[#252830] border border-white/15 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Importer le CSV collé ({csvStrategy})
        </button>
      </section>

      {/* 3. Export & Publication vers la Production */}
      <section className="rounded-xl card-surface p-4 space-y-3 border-[#2e6f56]/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <UploadCloud className="h-4 w-4 text-[#74c69d]" />
          <span>3. Export &amp; Mise en Production</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy || stats.validated === 0}
            onClick={() => void handleExport()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#252830] border border-white/15 px-3.5 py-3 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Exporter CSV validé ({stats.validated})
          </button>

          {!confirmPushProd ? (
            <button
              type="button"
              disabled={busy || stats.validated === 0}
              onClick={() => setConfirmPushProd(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2e6f56] px-3.5 py-3 text-xs font-semibold text-white disabled:opacity-40"
            >
              <UploadCloud className="h-4 w-4" />
              Publier vers la Prod ({stats.validated})
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmPushProd(false)}
                className="flex-1 rounded-lg bg-[#121316] border border-white/10 py-3 text-xs text-gray-300"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePushToProd()}
                className="flex-1 rounded-lg bg-[#2e6f56] py-3 text-xs font-semibold text-white"
              >
                Confirmer Prod
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400">
          La publication crée une sauvegarde <code className="text-gray-300">data/content.csv.bak</code>,
          écrit uniquement les cartes <strong className="text-gray-200">VALIDATED</strong> puis exécute{' '}
          <code className="text-gray-300">import_csv_to_db</code> vers <code className="text-gray-300">scoutgame.db</code>.
        </p>
      </section>
    </div>
  );
};
