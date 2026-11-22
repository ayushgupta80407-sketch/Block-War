import React, { useEffect, useState } from 'react';
import { Crosshair, Flame, Rocket, X } from 'lucide-react';

interface SatelliteMapModalProps {
  open: boolean;
  playerX: number;
  playerZ: number;
  onLaunch: (targetX: number, targetZ: number) => void;
  onClose: () => void;
}

const WORLD_MIN_X = -640;
const WORLD_MAX_X = 640;
const WORLD_MIN_Z = -480;
const WORLD_MAX_Z = 480;

export const SatelliteMapModal: React.FC<SatelliteMapModalProps> = ({
  open,
  playerX,
  playerZ,
  onLaunch,
  onClose,
}) => {
  const [target, setTarget] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const toPct = (wx: number, wz: number) => ({
    leftPct: ((wx - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * 100,
    topPct: ((wz - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z)) * 100,
  });

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const x = Math.round(WORLD_MIN_X + u * (WORLD_MAX_X - WORLD_MIN_X));
    const z = Math.round(WORLD_MIN_Z + v * (WORLD_MAX_Z - WORLD_MIN_Z));
    setTarget({ x, z });
  };

  const targetPos = toPct(target.x, target.z);
  const playerPos = toPct(playerX, playerZ);
  const airportPos = toPct(-475, 25);
  const mainPos = toPct(0, 0);
  const tribalPos = toPct(365, -25);
  const titanicPos = toPct(-145, -180);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 p-3 sm:p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-rose-500/45 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/85 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Rocket className="h-5 w-5 text-rose-400" />
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                MILITARY BUNKER · SATELLITE TARGETING CONSOLE
              </h2>
              <p className="text-[11px] font-semibold text-rose-300">
                Click any coordinates across the 3 islands to lock ballistic warhead (+5★ Wanted)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Interactive Satellite Ocean & 3-Island Map */}
        <div className="p-4 space-y-3">
          <div
            onClick={handleMapClick}
            className="relative h-72 sm:h-96 w-full cursor-crosshair overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-[radial-gradient(circle_at_center,_#0369a1_0%,_#0c4a6e_65%,_#082f49_100%)] shadow-inner select-none"
          >
            {/* Grid Lines */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '10% 12.5%',
              }}
            />

            {/* Airport Island */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-amber-300/60 bg-slate-700/80 shadow-lg"
              style={{ left: `${airportPos.leftPct}%`, top: `${airportPos.topPct}%`, width: '24%', height: '34%' }}
            >
              <div className="absolute inset-x-3 top-1/2 h-2.5 -translate-y-1/2 rounded bg-slate-950/90 border border-amber-300/40" />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-amber-200">
                AIRPORT BASE
              </span>
            </div>

            {/* Sea Bridge */}
            <div
              className="pointer-events-none absolute h-2 bg-slate-300/85 border border-cyan-300/60"
              style={{
                left: `${toPct(-300, 32).leftPct}%`,
                top: `${toPct(-240, 32).topPct}%`,
                width: '10%',
              }}
            />

            {/* Main Island */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-300/60 bg-emerald-700/70 shadow-lg"
              style={{ left: `${mainPos.leftPct}%`, top: `${mainPos.topPct}%`, width: '28%', height: '42%' }}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-black text-white drop-shadow">
                MAIN ISLAND
              </span>
            </div>

            {/* Titanic */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-slate-100 border border-amber-400 px-1.5 py-0.5 text-[9px] font-black text-slate-900"
              style={{ left: `${titanicPos.leftPct}%`, top: `${titanicPos.topPct}%` }}
            >
              TITANIC
            </div>

            {/* 5x Tribal & Volcanic Island */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-400/70 bg-green-800/75 shadow-lg"
              style={{ left: `${tribalPos.leftPct}%`, top: `${tribalPos.topPct}%`, width: '29%', height: '50%' }}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap text-[10px] font-black text-orange-200">
                <Flame className="h-3 w-3 text-orange-400" /> TRIBAL VOLCANO
              </span>
            </div>

            {/* Quick Target Presets */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-cyan-300 border-2 border-white shadow"
              style={{ left: `${playerPos.leftPct}%`, top: `${playerPos.topPct}%` }}
              title="Your Position"
            />

            {/* Target Crosshair */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ left: `${targetPos.leftPct}%`, top: `${targetPos.topPct}%` }}
            >
              <div className="h-12 w-12 rounded-full border-2 border-rose-500 bg-rose-500/20 animate-ping absolute" />
              <Crosshair className="h-8 w-8 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 font-mono font-bold text-rose-300">
                TARGET X: {target.x} · Z: {target.z}
              </span>
              <button
                type="button"
                onClick={() => setTarget({ x: -460, z: 48 })}
                className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
              >
                Lock Runway
              </button>
              <button
                type="button"
                onClick={() => setTarget({ x: 0, z: 0 })}
                className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
              >
                Lock Main Center
              </button>
              <button
                type="button"
                onClick={() => setTarget({ x: 365, z: -25 })}
                className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
              >
                Lock Tribal Camp
              </button>
            </div>

            <button
              type="button"
              onClick={() => onLaunch(target.x, target.z)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-500/30 hover:brightness-110"
            >
              <Rocket className="h-4 w-4" />
              <span>LAUNCH MISSILE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
