import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { authenticateDev } from '../services/api';

interface LoginScreenProps {
  initialLabel: string;
  onAuthenticated: (code: string, label: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialLabel,
  onAuthenticated,
}) => {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState(initialLabel === 'Dev' ? 'Dev 1' : initialLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Veuillez saisir le code d'accès.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const ok = await authenticateDev(trimmed);
      if (ok) {
        onAuthenticated(trimmed, label.trim() || 'Dev');
      } else {
        setError("Code d'accès invalide.");
      }
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-xl card-surface p-6 space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#202228] border border-white/10">
            <ShieldCheck className="h-6 w-6 text-[#74c69d]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Scout Game — Revue Cartes
          </h1>
          <p className="text-sm text-gray-400">
            Accès développeurs isolé (<code className="text-gray-300">dev.scoutgame.ch</code>)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <User className="h-3.5 w-3.5 text-gray-400" />
              Votre libellé (ex. Dev 1 / Dev 2)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Dev 1"
              maxLength={24}
              className="w-full rounded-lg bg-[#121316] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <KeyRound className="h-3.5 w-3.5 text-gray-400" />
              Code d&apos;accès Dev
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full rounded-lg bg-[#121316] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-[#9b2c37]/20 border border-[#9b2c37]/60 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6f56] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#357f63] disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {loading ? 'Vérification...' : 'Accéder à la revue'}
          </button>
        </form>
      </div>
    </div>
  );
};
