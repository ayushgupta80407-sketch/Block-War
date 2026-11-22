import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert, X } from 'lucide-react';
import { LiveConfigVersionEntry, LiveGameConfig } from '../game/liveConfig';

import {
  getLiveConfigRecordLocal,
  setAdminMasterKeyLocal,
  verifyAdminKeyLocal,
} from '../game/adminPersistence';

export interface AdminUnlockPayload {
  token: string;
  config: LiveGameConfig;
  version: string;
  history: LiveConfigVersionEntry[];
}

interface AdminLockModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: (payload: AdminUnlockPayload) => void;
}

export const AdminLockModal: React.FC<AdminLockModalProps> = ({
  open,
  onClose,
  onUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setError(null);
      setBusy(false);
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = window.setInterval(() => {
      setLockSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [lockSeconds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const isFormatValid = /^[A-Za-z0-9]{12}$/.test(password.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockSeconds > 0 || busy) return;
    const clean = password.trim();
    if (!/^[A-Za-z0-9]{12}$/.test(clean)) {
      setError('Enter an exact 12-character alphanumeric access key (A-Z, a-z, 0-9).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean }),
      });
      if (res.status === 404 || res.status >= 500) {
        throw new Error('Backend unavailable');
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const secs = Math.max(1, Number(data.retryAfterSeconds || 60));
        setLockSeconds(secs);
        setError(data.error || `Locked for ${secs}s after repeated failed attempts.`);
        return;
      }
      if (!res.ok || !data.token) {
        if (verifyAdminKeyLocal(clean) && !res.ok && res.status !== 401 && res.status !== 403) {
          throw new Error('Fallback to local key');
        }
        setError(data.error || 'Access denied.');
        return;
      }
      setAdminMasterKeyLocal(clean);
      setPassword('');
      onUnlocked({
        token: data.token,
        config: data.config,
        version: data.version || 'v1.00',
        history: Array.isArray(data.history) ? data.history : [],
      });
    } catch {
      if (verifyAdminKeyLocal(clean)) {
        const localRec = getLiveConfigRecordLocal();
        setPassword('');
        onUnlocked({
          token: 'local-admin-token',
          config: localRec.config,
          version: localRec.version,
          history: localRec.history,
        });
      } else {
        setError('Invalid 12-character access key.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Master Admin Lock
              </h2>
              <p className="text-xs text-slate-400">
                12-character alphanumeric authorization required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-400"
            aria-label="Close Master Admin Lock"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-300">
              <label htmlFor="admin-master-key" className="font-semibold">
                Access Key
              </label>
              <span className="font-mono text-slate-400 tabular-nums">
                {password.length} / 12
              </span>
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-master-key"
                type={showPassword ? 'text' : 'password'}
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
                disabled={lockSeconds > 0 || busy}
                value={password}
                onChange={(e) => {
                  const stripped = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
                  setPassword(stripped);
                  if (error) setError(null);
                }}
                placeholder="Enter 12-character key"
                className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 pr-11 font-mono text-sm tracking-widest text-white placeholder:tracking-normal placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label={showPassword ? 'Hide key' : 'Show key'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="space-y-0.5">
                <p className="font-medium">{error}</p>
                {lockSeconds > 0 && (
                  <p className="font-mono text-rose-300 tabular-nums">
                    Cooldown remaining: {lockSeconds}s
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || lockSeconds > 0 || !isFormatValid}
              className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap shrink-0"
            >
              {busy
                ? 'Verifying...'
                : lockSeconds > 0
                  ? `Locked (${lockSeconds}s)`
                  : 'Unlock Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
