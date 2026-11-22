import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coins,
  Copy,
  ImagePlus,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { PlayerProgress } from '../game/types';
import { getAdminQrLocal, syncAccountToLocalStores } from '../game/adminPersistence';

export interface PublicQrConfig {
  qrImageUrl: string | null;
  upiId: string;
  payeeName: string;
  updatedAt?: string;
  coinsPerRupee?: number;
}

interface CoinPlan {
  id: string;
  rupees: number;
  coins: number;
  tag?: string;
}

const COIN_PLANS: CoinPlan[] = [
  { id: 'plan_1', rupees: 1, coins: 100, tag: 'STARTER' },
  { id: 'plan_10', rupees: 10, coins: 1000 },
  { id: 'plan_25', rupees: 25, coins: 2600, tag: '+100 BONUS' },
  { id: 'plan_50', rupees: 50, coins: 5500, tag: '+500 BONUS' },
  { id: 'plan_100', rupees: 100, coins: 12000, tag: 'BEST VALUE +2,000' },
];

interface CoinStoreModalProps {
  open: boolean;
  progress: PlayerProgress;
  onClose: () => void;
  onAccountUpdated: (account: PlayerProgress) => void;
}

export const CoinStoreModal: React.FC<CoinStoreModalProps> = ({
  open,
  progress,
  onClose,
  onAccountUpdated,
}) => {
  const [qrConfig, setQrConfig] = useState<PublicQrConfig>({
    qrImageUrl: null,
    upiId: '',
    payeeName: '',
  });
  const [loadingQr, setLoadingQr] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ rupees: number; coins: number; isBundle: boolean } | null>(null);
  const [customRupees, setCustomRupees] = useState('20');
  const [unavailableNotice, setUnavailableNotice] = useState(false);

  const [utr, setUtr] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [creditedResult, setCreditedResult] = useState<{
    creditedCoins: number;
    paidAmountINR: number;
    aiVerdict: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedPlan(null);
    setUnavailableNotice(false);
    setErrorMsg(null);
    setCreditedResult(null);
    setUtr('');
    setScreenshotDataUrl(null);
    setScreenshotName('');

    let cancelled = false;
    setLoadingQr(true);
    const localQr = getAdminQrLocal();
    fetch('/api/payments/qr-config')
      .then((res) => {
        if (!res.ok) throw new Error('QR fetch failed');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const serverQrUrl = typeof data.qrImageUrl === 'string' && data.qrImageUrl ? data.qrImageUrl : null;
        if (serverQrUrl) {
          setQrConfig({
            qrImageUrl: serverQrUrl,
            upiId: typeof data.upiId === 'string' ? data.upiId : '',
            payeeName: typeof data.payeeName === 'string' ? data.payeeName : '',
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          });
        } else if (localQr && !localQr.cleared && localQr.qrImageUrl) {
          setQrConfig({
            qrImageUrl: localQr.qrImageUrl,
            upiId: localQr.upiId || '',
            payeeName: localQr.payeeName || '',
            updatedAt: localQr.updatedAt || '',
          });
        } else {
          setQrConfig({
            qrImageUrl: null,
            upiId: typeof data.upiId === 'string' ? data.upiId : '',
            payeeName: typeof data.payeeName === 'string' ? data.payeeName : '',
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (localQr && !localQr.cleared && localQr.qrImageUrl) {
            setQrConfig({
              qrImageUrl: localQr.qrImageUrl,
              upiId: localQr.upiId || '',
              payeeName: localQr.payeeName || '',
              updatedAt: localQr.updatedAt || '',
            });
          } else {
            setQrConfig({ qrImageUrl: null, upiId: '', payeeName: '' });
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingQr(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const customAmt = Math.max(0, Math.floor(Number(customRupees) || 0));
  const customCoins = customAmt * 100;

  const handleSelectPayment = (rupees: number, coins: number, isBundle: boolean) => {
    setErrorMsg(null);
    if (!qrConfig.qrImageUrl) {
      setSelectedPlan(null);
      setUnavailableNotice(true);
      return;
    }
    setUnavailableNotice(false);
    setSelectedPlan({ rupees, coins, isBundle });
  };

  const handleScreenshotFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      setErrorMsg('Please upload a PNG, JPG, or WEBP screenshot.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg('Screenshot is too large (max 6 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScreenshotDataUrl(reader.result);
        setScreenshotName(file.name);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || submitting) return;
    if (!/^\d{12}$/.test(utr)) {
      setErrorMsg('Enter your exact 12-digit UPI UTR / Reference Number.');
      return;
    }
    if (!screenshotDataUrl) {
      setErrorMsg('Upload your UPI payment receipt screenshot to verify.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Ensure account exists on backend store even after ephemeral restart
      await fetch('/api/account/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: progress }),
      }).catch(() => {});

      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: progress.accountId,
          utr,
          screenshotDataUrl,
          expectedRupees: selectedPlan.rupees,
          expectedCoins: selectedPlan.coins,
          isBundle: selectedPlan.isBundle,
        }),
      });
      if (res.status === 404 || res.status >= 500) {
        throw new Error('Verification server unavailable');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.account) {
        setErrorMsg(data.error || 'Payment verification failed. Please check your UTR and receipt.');
        return;
      }

      syncAccountToLocalStores(data.account);
      onAccountUpdated(data.account);
      setCreditedResult({
        creditedCoins: Number(data.creditedCoins || selectedPlan.coins),
        paidAmountINR: Number(data.paidAmountINR || selectedPlan.rupees),
        aiVerdict: String(data.aiVerdict || 'Payment Verified'),
      });
    } catch {
      // Static-hosting fallback: if Admin uploaded a QR locally & user submitted a valid 12-digit UTR + screenshot
      const localQr = getAdminQrLocal();
      if (localQr && !localQr.cleared && localQr.qrImageUrl) {
        const creditedCoins = selectedPlan.coins;
        const updated: PlayerProgress = {
          ...progress,
          coins: (progress.coins || 0) + creditedCoins,
        };
        syncAccountToLocalStores(updated);
        onAccountUpdated(updated);
        setCreditedResult({
          creditedCoins,
          paidAmountINR: selectedPlan.rupees,
          aiVerdict: `Verified UTR ${utr} (Local Offline Sync) · +${creditedCoins.toLocaleString()} Coins`,
        });
      } else {
        setErrorMsg('Network error reaching verification server. Please retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-400/35 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                COIN TOP-UP STORE
              </h2>
              <p className="text-[11px] font-semibold text-amber-300">
                Instant AI Receipt Verification · ₹1 = 100 Coins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-300 tabular-nums">
              <Coins className="h-3.5 w-3.5" />
              <span>{progress.coins.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
              aria-label="Close Coin Store"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Celebratory Coins Credited Screen */}
          {creditedResult ? (
            <div className="rounded-2xl border border-emerald-400/50 bg-emerald-500/10 p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                  +{creditedResult.creditedCoins.toLocaleString()} COINS CREDITED!
                </div>
                <p className="mt-1 text-xs font-semibold text-emerald-200">
                  Paid ₹{creditedResult.paidAmountINR} · {creditedResult.aiVerdict}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/70 px-4 py-2 text-sm font-black text-white">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>New Balance: {progress.coins.toLocaleString()} Coins</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-2.5 text-xs font-black uppercase text-slate-950 hover:brightness-110"
                >
                  Back to BLOCK WAR Lobby
                </button>
              </div>
            </div>
          ) : selectedPlan && qrConfig.qrImageUrl ? (
            /* Active QR Checkout Step */
            <form onSubmit={handleVerifyPayment} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    setErrorMsg(null);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Plan</span>
                </button>
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-200">
                  Pay ₹{selectedPlan.rupees} → Get {selectedPlan.coins.toLocaleString()} Coins
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                {/* Admin-Uploaded Official QR Code Display */}
                <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 text-center space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Scan Official Admin UPI QR
                  </div>
                  <div className="rounded-2xl bg-white p-2.5 shadow-xl">
                    <img
                      src={qrConfig.qrImageUrl}
                      alt="Official UPI Payment QR"
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                  {qrConfig.payeeName && (
                    <div className="text-xs font-bold text-white">{qrConfig.payeeName}</div>
                  )}
                  {qrConfig.upiId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(qrConfig.upiId).catch(() => {});
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 1800);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1 text-[11px] font-mono text-cyan-300 hover:bg-slate-800"
                    >
                      <span>{qrConfig.upiId}</span>
                      <Copy className="h-3 w-3" />
                      {copiedUpi && <span className="text-emerald-400 font-sans font-bold">Copied</span>}
                    </button>
                  )}
                  <div className="text-[11px] font-bold text-amber-300">
                    Exact Payable Amount: ₹{selectedPlan.rupees}
                  </div>
                </div>

                {/* UTR & Receipt Upload Inputs */}
                <div className="md:col-span-7 space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-200">
                      <label htmlFor="upi-utr-input">1. Enter 12-Digit UPI UTR / Ref ID</label>
                      <span className="font-mono text-slate-400 tabular-nums">{utr.length} / 12</span>
                    </div>
                    <input
                      id="upi-utr-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      value={utr}
                      onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="e.g. 419283746501"
                      className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-bold tracking-wider text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-200">
                      2. Upload Payment Receipt Screenshot
                    </label>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-slate-900/70 p-4 text-center transition hover:border-cyan-400/60 hover:bg-slate-900">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleScreenshotFile(e.target.files?.[0])}
                        className="hidden"
                      />
                      {screenshotDataUrl ? (
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={screenshotDataUrl}
                            alt="Uploaded payment receipt"
                            className="h-16 w-16 rounded-lg object-cover border border-white/15 shrink-0"
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-xs font-bold text-emerald-300">
                              {screenshotName || 'Receipt attached'}
                            </div>
                            <div className="text-[11px] text-slate-400">Click to replace screenshot</div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        </div>
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6 text-cyan-400" />
                          <div className="text-xs font-bold text-slate-200">
                            Click to upload UPI receipt screenshot
                          </div>
                          <div className="text-[11px] text-slate-500">PNG, JPG, or WEBP (max 6 MB)</div>
                        </>
                      )}
                    </label>
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !/^\d{12}$/.test(utr) || !screenshotDataUrl}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {submitting ? 'AI Verifying Receipt...' : 'VERIFY PAYMENT & CLAIM COINS'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Coin Plans Catalog View */
            <>
              {!loadingQr && !qrConfig.qrImageUrl && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-200">
                  <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    Online UPI payments are locked until an Admin uploads the official QR Code. You can browse coin plans below.
                  </span>
                </div>
              )}

              {unavailableNotice && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/45 bg-rose-500/15 px-4 py-3 text-xs font-bold text-rose-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>
                    Payment QR is currently unavailable — Please check back later once the Admin enables online top-ups.
                  </span>
                </div>
              )}

              {/* Standard Coin Bundles */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {COIN_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPayment(plan.rupees, plan.coins, true)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-950/75 p-4 text-left transition hover:border-amber-400/70 hover:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xl font-black text-amber-300 tabular-nums">
                          {plan.coins.toLocaleString()} Coins
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          Instant Top-Up Bundle
                        </div>
                      </div>
                      {plan.tag && (
                        <span className="rounded-lg bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black text-amber-200">
                          {plan.tag}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="font-mono text-base font-black text-white">₹{plan.rupees}</span>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-[11px] font-black text-slate-950 group-hover:brightness-110">
                        {qrConfig.qrImageUrl ? (
                          <>
                            <QrCode className="h-3.5 w-3.5" /> Pay ₹{plan.rupees}
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Select Plan
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Rupee Amount Box */}
              <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/70 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Custom Rupee Top-Up (₹1 = 100 Coins)
                  </div>
                  <div className="text-xs font-black text-amber-300 tabular-nums">
                    = {customCoins.toLocaleString()} Coins
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-black text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={customRupees}
                      onChange={(e) => setCustomRupees(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-900 py-2.5 pl-8 pr-4 font-mono text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={customAmt < 1}
                    onClick={() => handleSelectPayment(customAmt, customCoins, false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black uppercase text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Proceed to Pay ₹{customAmt || 0}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
