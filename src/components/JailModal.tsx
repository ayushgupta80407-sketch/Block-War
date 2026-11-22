import React from 'react';
import { Clock, Coins, Siren } from 'lucide-react';

interface JailModalProps {
  open: boolean;
  timeLeft: number;
  playerCoins: number;
  bailCost?: number;
  finePaid?: number;
  onPayBail: () => void;
}

export const JailModal: React.FC<JailModalProps> = ({
  open,
  timeLeft,
  playerCoins,
  bailCost = 1000,
  finePaid = 200,
  onPayBail,
}) => {
  if (!open) return null;
  const canAfford = playerCoins >= bailCost;
  const secLeft = Math.max(0, Math.ceil(timeLeft));

  return (
    <div className="fixed top-4 left-4 z-40 w-[300px] sm:w-[330px] pointer-events-auto select-none">
      <div className="overflow-hidden rounded-2xl border-2 border-blue-400/70 bg-slate-950/90 shadow-2xl backdrop-blur-md">
        {/* Flashing Red/Blue Police Siren Accent */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/2 bg-rose-500 animate-pulse" />
          <div className="h-full w-1/2 bg-blue-500 animate-pulse" />
        </div>

        <div className="p-3.5 space-y-2.5">
          {/* Header Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <Siren className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-white">
                  BUSTED — IN POLICE JAIL
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-rose-300">
                  {finePaid > 0
                    ? `BUSTED — -${finePaid.toLocaleString()} COINS FINE DEDUCTED`
                    : 'AIRPORT POLICE STATION CELL'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Release Timer */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Auto Release in:</span>
            </div>
            <span className="font-mono text-base font-black text-amber-300 tabular-nums">
              {secLeft}s
            </span>
          </div>

          {/* Primary Bail Button */}
          <button
            type="button"
            disabled={!canAfford}
            onClick={onPayBail}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-[11px] font-black uppercase tracking-wider transition ${
              canAfford
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg hover:brightness-110 active:scale-[0.98]'
                : 'border border-slate-700 bg-slate-900 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Coins className="h-3.5 w-3.5 shrink-0" />
            <span>
              {canAfford
                ? `PAY ${bailCost.toLocaleString()} COINS — GET OUT NOW`
                : `Need ${bailCost.toLocaleString()} Coins (Wait ${secLeft}s)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

