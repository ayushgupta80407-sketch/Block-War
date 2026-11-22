import React, { useEffect, useState } from 'react';
import {
  LogIn,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID, presetIdToAvatarUrl } from '../game/avatars';
import {
  listSavedUserSummaries,
  loadGuestProgress,
  loginLocalAccount,
  persistAuthenticatedAccount,
  registerLocalAccount,
  SavedAccountSummary,
} from '../game/progression';
import { PlayerProgress } from '../game/types';
import { PlayerAvatar } from './ProfilePhotoModal';

export interface AvatarOption {
  id: string;
  label: string;
  accent: string;
}

export const AVATAR_ICON_OPTIONS: AvatarOption[] = AVATAR_PRESETS.map((p) => ({
  id: p.id,
  label: p.name,
  accent: 'from-cyan-400 to-blue-600',
}));

export const AvatarBadge: React.FC<{
  iconId?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  className?: string;
}> = ({ iconId = DEFAULT_AVATAR_PRESET_ID, avatarUrl, size = 'md', shape = 'circle', className }) => {
  return (
    <PlayerAvatar
      avatarUrl={avatarUrl}
      avatarIcon={iconId}
      size={size}
      shape={shape}
      className={className}
    />
  );
};

interface AccountAuthModalProps {
  open: boolean;
  canClose: boolean;
  activeUsername?: string;
  isGuest?: boolean;
  onAuthenticated: (account: PlayerProgress) => void;
  onPlayAsGuest: (guestAccount: PlayerProgress) => void;
  onClose: () => void;
}

export const AccountAuthModal: React.FC<AccountAuthModalProps> = ({
  open,
  canClose,
  activeUsername,
  isGuest,
  onAuthenticated,
  onPlayAsGuest,
  onClose,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarIcon, setAvatarIcon] = useState(DEFAULT_AVATAR_PRESET_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountSummary[]>([]);

  useEffect(() => {
    if (open) {
      setSavedAccounts(listSavedUserSummaries());
      setError(null);
      setPassword('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    if (trimmedUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (tab === 'register') {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: trimmedUser,
              password,
              avatarIcon,
              avatarUrl: presetIdToAvatarUrl(avatarIcon),
            }),
          });
          const data = await res.json();
          if (res.ok && data.account) {
            const saved = persistAuthenticatedAccount(data.account, password);
            onAuthenticated(saved);
            return;
          }
          if (res.status >= 400 && res.status < 500) {
            setError(data.error || 'Could not create account.');
            return;
          }
        } catch {
          // Server unreachable — fall back to local device registration
        }

        const localRes = registerLocalAccount({ username: trimmedUser, password, avatarIcon });
        if (localRes.ok && localRes.account) {
          onAuthenticated(localRes.account);
        } else {
          setError(localRes.error || 'Could not create account.');
        }
      } else {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: trimmedUser, password }),
          });
          const data = await res.json();
          if (res.ok && data.account) {
            const saved = persistAuthenticatedAccount(data.account, password);
            onAuthenticated(saved);
            return;
          }
          if (res.status === 403 && data.banned) {
            setError(
              `ACCOUNT BANNED BY ADMIN — Reason: ${data.banReason || 'Cheating / Rule Violation'}`
            );
            return;
          }
          if (res.status === 401 || res.status === 400) {
            setError(data.error || 'Incorrect username or password.');
            return;
          }
          // If 404 on server (e.g. fresh server memory), check local device account first
          if (res.status === 404) {
            const localRes = loginLocalAccount({ username: trimmedUser, password });
            if (localRes.ok && localRes.account) {
              fetch('/api/account/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account: localRes.account }),
              }).catch(() => {});
              onAuthenticated(localRes.account);
              return;
            }
            setError(data.error || localRes.error || 'Account not found.');
            return;
          }
        } catch {
          // Server offline — check local device storage
        }

        const localRes = loginLocalAccount({ username: trimmedUser, password });
        if (localRes.ok && localRes.account) {
          onAuthenticated(localRes.account);
        } else {
          setError(localRes.error || 'Login failed.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              BLOCK WAR PLAYER ACCOUNT
            </div>
            <h2 className="text-xl font-black text-white">
              {tab === 'login' ? 'Log In to Save Progress' : 'Create Fighter Account'}
            </h2>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {activeUsername && !isGuest && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            <UserCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Signed in as <b className="text-white">{activeUsername}</b>
            </span>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition ${
              tab === 'login' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" /> Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition ${
              tab === 'register' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" /> Create Account
          </button>
        </div>

        {/* Saved device accounts quick-fill */}
        {tab === 'login' && savedAccounts.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Saved on this device
            </div>
            <div className="flex flex-wrap gap-1.5">
              {savedAccounts.slice(0, 4).map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => setUsername(acc.username)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition ${
                    username.toLowerCase() === acc.username
                      ? 'border-cyan-400 bg-cyan-500/20 text-white'
                      : 'border-white/10 bg-slate-950/70 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <AvatarBadge iconId={acc.avatarIcon} avatarUrl={acc.avatarUrl} size="sm" />
                  <span>{acc.username}</span>
                  <span className="text-[10px] text-cyan-300">Lv.{acc.level}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. SkyStriker99"
              maxLength={18}
              autoComplete="username"
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 4 characters"
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                Choose Starter Warrior Avatar (16 Presets)
              </label>
              <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                {AVATAR_PRESETS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAvatarIcon(opt.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                      avatarIcon === opt.id
                        ? 'border-cyan-400 bg-cyan-500/15 text-white'
                        : 'border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/25'
                    }`}
                  >
                    <AvatarBadge iconId={opt.id} size="sm" />
                    <span className="w-full truncate text-center text-[9px] font-bold">
                      {opt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-60"
          >
            {busy
              ? 'Please wait...'
              : tab === 'login'
                ? 'Log In & Load Progress'
                : 'Create Account & Start'}
          </button>
        </form>

        <div className="mt-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => onPlayAsGuest(loadGuestProgress())}
            className="w-full rounded-xl border border-white/15 bg-slate-800/80 py-2.5 text-xs font-black uppercase text-slate-200 hover:bg-slate-700"
          >
            Play as Guest (Saves Locally)
          </button>
        </div>
      </div>
    </div>
  );
};
