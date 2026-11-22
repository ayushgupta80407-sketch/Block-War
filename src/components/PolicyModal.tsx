import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileCheck2,
  ScrollText,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  formatPolicyTimestamp,
  GamePolicyConfig,
} from '../game/policy';

interface PolicyModalProps {
  open: boolean;
  mode: 'gate' | 'viewer';
  policy: GamePolicyConfig;
  isAcceptedCurrentVersion: boolean;
  acceptedVersion?: string;
  acceptedAt?: string;
  busy?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  open,
  mode,
  policy,
  isAcceptedCurrentVersion,
  acceptedVersion,
  acceptedAt,
  busy = false,
  onConfirm,
  onClose,
}) => {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (open) {
      setChecked(false);
    }
  }, [open, policy.version, mode]);

  useEffect(() => {
    if (!open || mode !== 'viewer') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mode, onClose]);

  if (!open) return null;

  const needsReconfirmation =
    !isAcceptedCurrentVersion &&
    Boolean(acceptedVersion) &&
    acceptedVersion !== policy.version;

  const showAcceptControls = mode === 'gate' || !isAcceptedCurrentVersion;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/88 p-3 sm:p-5 backdrop-blur-md"
      onMouseDown={(e) => {
        if (mode === 'viewer' && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-cyan-400/35 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-cyan-300">
                  Policy {policy.version}
                </span>
                {isAcceptedCurrentVersion ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    ACCEPTED ({policy.version})
                  </span>
                ) : needsReconfirmation ? (
                  <span className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                    UPDATED POLICY — RE-CONFIRMATION REQUIRED
                  </span>
                ) : (
                  <span className="rounded-md border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-rose-300">
                    ACTION REQUIRED BEFORE PLAY
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-base sm:text-lg font-black tracking-tight text-white">
                {policy.title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {policy.subtitle}
              </p>
            </div>
          </div>

          {mode === 'viewer' && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="Close Game Rules and Policy"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Accepted Status Strip (Viewer Mode) */}
        {isAcceptedCurrentVersion && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/25 bg-emerald-500/10 px-5 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-200">
              <FileCheck2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                You confirmed BLOCK WAR Policy <span className="font-mono">{acceptedVersion || policy.version}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatPolicyTimestamp(acceptedAt)}</span>
            </div>
          </div>
        )}

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {policy.sections.map((section) => (
            <section
              key={section.id}
              className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 space-y-1.5"
            >
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-cyan-300">
                {section.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {/* Footer Controls */}
        <div className="border-t border-white/10 bg-slate-950/90 px-5 py-4 space-y-3">
          {showAcceptControls ? (
            <>
              <label className="flex items-start gap-3 rounded-2xl border border-white/15 bg-slate-900/90 p-3 cursor-pointer transition hover:border-cyan-400/50">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-cyan-400"
                />
                <span className="text-xs font-bold leading-snug text-slate-100">
                  I have read and agree to the BLOCK WAR Game Rules, Fair Play &amp; Privacy Policy
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Confirmation is logged with timestamp for {policy.version}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {mode === 'viewer' && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-white/15 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      Close
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!checked || busy}
                    onClick={onConfirm}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                      checked && !busy
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-[0.98]'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{busy ? 'Confirming...' : 'CONFIRM & ENTER GAME'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                Last policy update: <span className="font-mono text-slate-300">{formatPolicyTimestamp(policy.updatedAt)}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-black uppercase text-slate-950 hover:bg-cyan-400"
              >
                Close Reader
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
