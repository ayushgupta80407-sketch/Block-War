import React from 'react';
import {
  AlertTriangle,
  Armchair,
  Bomb,
  Camera,
  Car,
  Coins,
  Crown,
  DoorOpen,
  Eye,
  Feather,
  Fish,
  Flame,
  Heart,
  Leaf,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Pause,
  PawPrint,
  Plane,
  Repeat,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Siren,
  Smile,
  Star,
  Sword,
  Users,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { deterministicPresetForName } from '../game/avatars';
import { getGrenadeDef, getGunDef, getKnifeDef } from '../game/catalog';
import { GameHudState, WeaponSlot } from '../game/types';
import {
  isBoatKind,
  isFlyingMountKind,
  isHelicopterKind,
  isLandAnimalKind,
  isLivingMountKind,
  isMarineMountKind,
  isTankKind,
} from '../game/vehiclesAndWildlife';
import { PlayerAvatar } from './ProfilePhotoModal';

interface GameHudProps {
  hud: GameHudState | null;
  isFullscreen: boolean;
  globalBannerMessage?: string;
  playerName?: string;
  playerAvatarUrl?: string;
  playerAvatarIcon?: string;
  onPauseClick: () => void;
  onCycleCamera: () => void;
  onToggleFullscreen: () => void;
  onLockPointer: () => void;
  onSelectSlot?: (slot: WeaponSlot) => void;
  onOpenEmotes?: () => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  isFullscreen,
  globalBannerMessage,
  playerName,
  playerAvatarUrl,
  playerAvatarIcon,
  onPauseClick,
  onCycleCamera,
  onToggleFullscreen,
  onLockPointer,
  onSelectSlot,
  onOpenEmotes,
}) => {
  if (!hud) return null;

  const hpPct = Math.max(0, Math.min(100, (hud.localHp / hud.localMaxHp) * 100));
  const stamPct = Math.max(0, Math.min(100, hud.localStamina));
  const gun = getGunDef(hud.gunId);
  const knife = getKnifeDef(hud.knifeId);
  const grenade = getGrenadeDef(hud.grenadeId);

  const spreadGap = 6 + Math.min(16, hud.crosshairSpread);
  const crosshairColor = hud.aimOnEnemy
    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
    : 'bg-white/95 shadow-[0_0_4px_rgba(0,0,0,0.85)]';

  const cameraLabel =
    hud.cameraView === 'first' ? '1st Person' : hud.cameraView === 'close' ? 'Close 3rd' : 'Far 3rd';

  // Mini-Map Radar Transform (rendered in 112x112 SVG viewBox, responsive size via Tailwind)
  const radarSize = 112;
  const radarR = radarSize / 2;
  const scale = radarR / Math.max(50, hud.radarHalfRange || 135);
  const cosYaw = Math.cos(hud.camYaw);
  const sinYaw = Math.sin(hud.camYaw);

  const toRadar = (wx: number, wz: number) => {
    const dx = wx - hud.playerX;
    const dz = wz - hud.playerZ;
    const rx = dx * cosYaw - dz * sinYaw;
    const ry = dx * sinYaw + dz * cosYaw;
    return { x: radarR + rx * scale, y: radarR + ry * scale };
  };

  const clampRadar = (px: number, py: number) => {
    const vx = px - radarR;
    const vy = py - radarR;
    const dist = Math.hypot(vx, vy);
    const maxR = radarR - 6;
    if (dist <= maxR) return { x: px, y: py, clamped: false };
    return { x: radarR + (vx / dist) * maxR, y: radarR + (vy / dist) * maxR, clamped: true };
  };

  const mountPct = Math.max(0, Math.min(100, (hud.mountedHp / Math.max(1, hud.mountedMaxHp)) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Flash Cube Blind Overlay */}
      {hud.blindFlashAlpha > 0.01 && (
        <div
          className="fixed inset-0 bg-white pointer-events-none"
          style={{ opacity: Math.min(0.95, hud.blindFlashAlpha) }}
        />
      )}

      {/* Underwater Auto Diving Helmet Glass Vignette */}
      {hud.isUnderwater && (
        <div className="pointer-events-none fixed inset-0 bg-cyan-950/20 border-[6px] border-cyan-400/35 shadow-[inset_0_0_95px_rgba(34,211,238,0.42)]" />
      )}

      {/* Snake Venom Poison Vignette */}
      {(hud.poisonAlpha ?? 0) > 0.01 && (
        <div
          className="pointer-events-none fixed inset-0 bg-emerald-950/30 border-[6px] border-lime-500/60 shadow-[inset_0_0_95px_rgba(34,197,94,0.65)]"
          style={{ opacity: Math.min(0.9, hud.poisonAlpha ?? 0) }}
        />
      )}

      {/* Battle Royale Outside Safe Zone Red Storm Vignette */}
      {hud.isBattleRoyale && hud.outsideZone && (
        <div className="pointer-events-none fixed inset-0 border-[8px] border-rose-500/75 shadow-[inset_0_0_80px_rgba(244,63,94,0.65)]" />
      )}

      {/* Tribal Capture: 3-Second Rope-Break Struggle Overlay */}
      {hud.tribalCapturePhase === 'struggle' && (
        <div className="pointer-events-none fixed left-1/2 top-[28%] -translate-x-1/2 flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-400 bg-slate-950/92 px-5 py-3 shadow-2xl max-w-[90vw]">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse shrink-0" />
            <span>CAPTURED! BREAK ROPES ({(hud.struggleTimeLeft ?? 0).toFixed(1)}s)</span>
          </div>
          <div className="h-3 w-52 sm:w-64 overflow-hidden rounded-full bg-slate-800 border border-amber-400/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-lime-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round((hud.struggleProgress ?? 0) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] sm:text-xs font-extrabold text-white text-center">
            RAPID-TAP [SPACE] / [E] / CLICK TO SNAP ROPES &amp; ESCAPE!
          </span>
        </div>
      )}

      {/* Tribal Capture: Hung Over Campfire Cutscene Banner */}
      {hud.tribalCapturePhase === 'suspended' && (
        <div className="pointer-events-none fixed left-1/2 top-20 -translate-x-1/2 flex items-center gap-2 rounded-2xl border-2 border-rose-500 bg-slate-950/90 px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300 shadow-2xl">
          <Flame className="h-4 w-4 text-orange-400 animate-pulse shrink-0" />
          <span>CAPTURED BY THE ISLAND TRIBE — HUNG OVER THE FIRE!</span>
        </div>
      )}

      {/* Floating World-Projected Damage Numbers */}
      {hud.damagePopups.map((dp) => (
        <div
          key={dp.id}
          className={`fixed -translate-x-1/2 -translate-y-1/2 font-mono font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${
            dp.isCrit
              ? 'text-base text-amber-300 scale-110'
              : dp.isVehicle
                ? 'text-xs text-orange-300'
                : 'text-sm text-white'
          }`}
          style={{
            left: `${dp.xPct}%`,
            top: `${dp.yPct}%`,
            opacity: dp.alpha,
          }}
        >
          {dp.text}
        </div>
      ))}

      {/* Directional Damage Indicator Arc around Crosshair */}
      {hud.damageIndicatorTime > 0 && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: 132,
            height: 132,
            transform: `translate(-50%, -50%) rotate(${hud.damageIndicatorAngle}deg)`,
            opacity: Math.min(1, hud.damageIndicatorTime * 1.4),
          }}
        >
          <svg width="132" height="132" viewBox="0 0 140 140">
            <path
              d="M 42 18 A 56 56 0 0 1 98 18"
              fill="none"
              stroke="#ef4444"
              strokeWidth="6"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.9))' }}
            />
          </svg>
        </div>
      )}

      {/* Center Dynamic Aiming Crosshair + Hit-Marker + ALLY Shield */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`h-1.5 w-1.5 rounded-full ${
            hud.aimOnEnemy ? 'bg-rose-500 scale-125' : 'bg-cyan-300'
          }`}
        />
        <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 h-2.5 rounded-full ${crosshairColor}`} style={{ bottom: spreadGap }} />
        <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 h-2.5 rounded-full ${crosshairColor}`} style={{ top: spreadGap }} />
        <div className={`absolute top-1/2 -translate-y-1/2 h-0.5 w-2.5 rounded-full ${crosshairColor}`} style={{ right: spreadGap }} />
        <div className={`absolute top-1/2 -translate-y-1/2 h-0.5 w-2.5 rounded-full ${crosshairColor}`} style={{ left: spreadGap }} />

        {hud.hitMarkerTime > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-0.5 rotate-45 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <div className="absolute h-4 w-0.5 -rotate-45 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
          </div>
        )}

        {hud.allyShieldTime > 0 && (
          <div
            className="absolute left-1/2 top-6 -translate-x-1/2 flex items-center gap-1 rounded-full border border-emerald-400/80 bg-slate-950/90 px-2 py-0.5 text-[10px] font-black tracking-wider text-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.65)]"
            style={{ opacity: Math.min(1, hud.allyShieldTime * 2) }}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>ALLY</span>
          </div>
        )}
      </div>

      {/* Reloading Progress Bar above Crosshair */}
      {hud.isReloading && (
        <div className="fixed left-1/2 top-[56%] -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="rounded bg-slate-950/85 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-300 border border-amber-400/40">
            RELOADING...
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-900/90 border border-white/20">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(hud.reloadProgress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Contextual Interaction & Battle Royale Drop Prompts (raised above bottom-center bars) */}
      <div className="fixed left-1/2 bottom-28 sm:bottom-32 -translate-x-1/2 flex flex-col items-center gap-1 max-w-[92vw]">
        {hud.isBattleRoyale && hud.brPhase === 'plane' && (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/80 bg-slate-950/90 px-3 py-1.5 text-[11px] font-black tracking-wide text-amber-200 shadow-2xl whitespace-nowrap">
            <Plane className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              IN PLANE ({hud.playersInPlane ?? 0}/{hud.totalFighters ?? 50}) — [SPACE] OR JUMP TO DROP
            </span>
          </div>
        )}
        {hud.isBattleRoyale && hud.brPhase === 'freefall' && (
          <div className="flex items-center gap-1.5 rounded-xl border border-cyan-400/80 bg-slate-950/90 px-3 py-1.5 text-[11px] font-black tracking-wide text-cyan-200 shadow-2xl whitespace-nowrap">
            <Wind className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>
              ALT {hud.altitudeMeters ?? 0}m — [SPACE] / CHUTE TO PARACHUTE
            </span>
          </div>
        )}
        {hud.isBattleRoyale && hud.brPhase === 'parachute' && (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-400/70 bg-slate-950/85 px-3 py-1 text-[10px] font-black text-emerald-200 shadow-lg whitespace-nowrap">
            <Wind className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>GLIDING ({hud.altitudeMeters ?? 0}m)</span>
          </div>
        )}
        {hud.isBattleRoyale && hud.outsideZone && (
          <div className="flex items-center gap-1.5 rounded-xl border border-rose-400/90 bg-rose-950/90 px-3 py-1 text-[10px] font-black text-rose-200 shadow-lg whitespace-nowrap">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span>OUTSIDE SAFE ZONE — RETURN TO CIRCLE!</span>
          </div>
        )}
        {hud.isBattleRoyale && hud.isKnockedDown && (
          <div className="flex items-center gap-1.5 rounded-xl border border-rose-400/80 bg-slate-950/90 px-3 py-1 text-[10px] font-black text-rose-300 shadow-lg whitespace-nowrap">
            <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>KNOCKED — BLEEDOUT {Math.ceil(hud.bleedoutRemaining ?? 0)}s</span>
          </div>
        )}
        {hud.isBattleRoyale && hud.reviveTargetName && (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-emerald-400/80 bg-slate-950/90 px-3 py-1.5 text-[10px] font-black text-emerald-300 shadow-lg whitespace-nowrap">
            <span>HOLD [E] TO REVIVE {hud.reviveTargetName.toUpperCase()}</span>
            {(hud.reviveProgress ?? 0) > 0 && (
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.round((hud.reviveProgress ?? 0) * 100))}%` }}
                />
              </div>
            )}
          </div>
        )}
        {hud.nearMountPrompt && !hud.mountedName && (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-400/70 bg-slate-950/90 px-3 py-1 text-[10px] font-black text-emerald-300 shadow-lg whitespace-nowrap max-w-full truncate">
            {hud.nearMountPrompt.includes('Board') ? (
              <Ship className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            ) : /Shark|Whale|Sailfish/i.test(hud.nearMountPrompt) ? (
              <Fish className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            ) : (
              <Car className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{hud.nearMountPrompt}</span>
          </div>
        )}
        {hud.nearFruitPrompt && (
          <div className="flex items-center gap-1.5 rounded-xl border border-lime-400/75 bg-slate-950/90 px-3 py-1 text-[10px] font-black text-lime-200 shadow-lg whitespace-nowrap max-w-full truncate">
            <Leaf className="h-3.5 w-3.5 shrink-0 text-lime-400" />
            <span className="truncate">{hud.nearFruitPrompt}</span>
          </div>
        )}
        {hud.nearBenchPrompt && (
          <div className="flex items-center gap-1.5 rounded-xl border border-teal-400/70 bg-slate-950/90 px-3 py-1 text-[10px] font-black text-teal-200 shadow-lg whitespace-nowrap max-w-full truncate">
            <Armchair className="h-3.5 w-3.5 shrink-0 text-teal-300" />
            <span className="truncate">{hud.nearBenchPrompt}</span>
          </div>
        )}
        {hud.nearLootPrompt && (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/85 bg-slate-950/92 px-3 py-1 text-[10px] font-black text-amber-300 shadow-lg whitespace-nowrap">
            <Repeat className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>{hud.nearLootPrompt}</span>
          </div>
        )}
        {hud.nearConsolePrompt && (
          <div className="flex items-center gap-1.5 rounded-xl border border-rose-400/85 bg-slate-950/92 px-3 py-1 text-[10px] font-black text-rose-200 shadow-lg whitespace-nowrap">
            <Rocket className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span>{hud.nearConsolePrompt}</span>
          </div>
        )}
        {hud.nearDoorPrompt && (
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/70 bg-slate-950/90 px-3 py-1 text-[10px] font-black text-amber-300 shadow-lg whitespace-nowrap">
            <DoorOpen className="h-3.5 w-3.5 shrink-0" />
            <span>{hud.nearDoorPrompt}</span>
          </div>
        )}
      </div>

      {/* Pointer Lock Unlock Hint */}
      {!hud.isPointerLocked && !hud.isPaused && !hud.matchEnded && (
        <button
          type="button"
          onClick={onLockPointer}
          className="pointer-events-auto fixed left-1/2 top-16 -translate-x-1/2 hidden md:flex items-center gap-2 rounded-full border border-cyan-400/60 bg-slate-950/85 px-3.5 py-1 text-[11px] font-bold text-cyan-200 shadow-lg hover:bg-slate-900 whitespace-nowrap"
        >
          <MousePointerClick className="h-3.5 w-3.5 text-cyan-400" />
          Click canvas to lock cursor & aim smoothly (ESC pauses)
        </button>
      )}

      {/* TOP BAR (Compact phone proportions, clean 3-corner spacing) */}
      <div className="flex items-start justify-between p-2 sm:p-3 gap-2">
        {/* Top-Left: Compact Hearts / Armor / HP / Stamina (hidden when Jail Panel occupies top-left) */}
        <div className={`flex flex-col gap-1.5 w-40 sm:w-56 ${hud.inJail ? 'invisible' : ''}`}>
          <div className="rounded-xl border border-white/15 bg-slate-950/75 p-2 sm:p-2.5 shadow-lg">
            <div className="mb-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <PlayerAvatar
                  avatarUrl={playerAvatarUrl}
                  avatarIcon={playerAvatarIcon}
                  alt={playerName || 'Player'}
                  size="sm"
                  shape="circle"
                  className="h-7 w-7 border-cyan-400/50"
                />
                {hud.isBattleRoyale ? (
                  <span className="truncate text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">
                    {hud.teamMode === 'team' ? `${(hud.playerTeam || 'blue').toUpperCase()} SQUAD` : 'SOLO BR'}
                  </span>
                ) : (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: hud.localMaxHearts || 3 }).map((_, idx) => {
                      const aliveHeart = idx < hud.localHearts;
                      return (
                        <Heart
                          key={idx}
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all ${
                            aliveHeart
                              ? 'fill-rose-500 text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.7)]'
                              : 'fill-slate-800 text-slate-700'
                          }`}
                        />
                      );
                    })}
                    <span className="ml-0.5 text-[10px] font-black text-rose-300 tabular-nums">
                      {hud.localHearts}/{hud.localMaxHearts}
                    </span>
                  </div>
                )}
              </div>
              <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-mono font-black text-amber-300 tabular-nums shrink-0">
                KO: {hud.localKos}
              </span>
            </div>

            {/* Armor Vest Shield Bar (when equipped) */}
            {(hud.armorMaxHp ?? 0) > 0 && (
              <div className="mb-1.5">
                <div className="mb-0.5 flex items-center justify-between text-[9px] sm:text-[10px] font-extrabold text-sky-300">
                  <span className="flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" /> LV.{hud.armorLevel}
                  </span>
                  <span className="font-mono tabular-nums">
                    {Math.ceil(hud.armorHp ?? 0)}/{hud.armorMaxHp}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-150"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((hud.armorHp ?? 0) / Math.max(1, hud.armorMaxHp ?? 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* HP Bar */}
            <div className="mb-0.5 flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold">
              <span className="text-slate-300">HP</span>
              <span className="font-mono text-white tabular-nums">
                {Math.ceil(hud.localHp)}/{hud.localMaxHp}
              </span>
            </div>
            <div className="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  hpPct > 55
                    ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                    : hpPct > 28
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-400'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>

            {/* Stamina */}
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100"
                style={{ width: `${stamPct}%` }}
              />
            </div>

            {/* Compact Status Flags */}
            {(hud.isSwimming || hud.hasDivingHelmet || hud.nearCampfire || hud.inLavaZone || hud.isCrouching || hud.activePowerup) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {hud.isCrouching && (
                  <span className="inline-flex items-center rounded bg-cyan-500/20 border border-cyan-400/45 px-1.5 py-0.5 text-[9px] font-black text-cyan-200">
                    CROUCH
                  </span>
                )}
                {hud.hasDivingHelmet ? (
                  <span className="inline-flex items-center gap-0.5 rounded bg-cyan-500/25 border border-cyan-300/60 px-1.5 py-0.5 text-[9px] font-black text-cyan-100">
                    <Waves className="h-2.5 w-2.5" /> HELMET · O₂ ∞
                  </span>
                ) : (
                  hud.isSwimming && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/20 border border-sky-400/45 px-1.5 py-0.5 text-[9px] font-black text-sky-200">
                      <Waves className="h-2.5 w-2.5" /> SWIM
                    </span>
                  )
                )}
                {hud.nearCampfire && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-orange-500/25 border border-orange-400/60 px-1.5 py-0.5 text-[9px] font-black text-orange-200">
                    <Flame className="h-2.5 w-2.5" /> WARMTH +5/s
                  </span>
                )}
                {hud.inLavaZone && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-rose-600/35 border border-rose-400/80 px-1.5 py-0.5 text-[9px] font-black text-rose-200 animate-pulse">
                    <Flame className="h-2.5 w-2.5" /> LAVA BURN!
                  </span>
                )}
                {hud.activePowerup && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-400/45 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
                    <Zap className="h-2.5 w-2.5" /> {Math.ceil(hud.activePowerupTime)}s
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Compact Match Timer / Team Score / Safe Zone Status */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-white/15 bg-slate-950/75 px-2.5 py-1.5 sm:px-4 sm:py-1.5 shadow-lg">
            {hud.isBattleRoyale ? (
              <>
                <span className="hidden sm:inline rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  BR
                </span>
                <span className="text-[10px] sm:text-xs font-black font-mono text-slate-100 tabular-nums whitespace-nowrap">
                  {hud.zoneStatusText ?? formatTime(hud.timeRemaining)}
                </span>
              </>
            ) : hud.teamMode === 'team' ? (
              <>
                <span className="text-xs sm:text-sm font-black text-sky-400 tabular-nums">{hud.blueTeamScore ?? 0}</span>
                <span className="text-xs sm:text-base font-black font-mono text-white tabular-nums">{formatTime(hud.timeRemaining)}</span>
                <span className="text-xs sm:text-sm font-black text-rose-400 tabular-nums">{hud.redTeamScore ?? 0}</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  {hud.mode}
                </span>
                <span className="text-xs sm:text-base font-black font-mono text-white tabular-nums">
                  {formatTime(hud.timeRemaining)}
                </span>
                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-amber-300 tabular-nums">
                  <Coins className="h-3 w-3" /> {hud.localCoinsInMatch}
                </span>
              </>
            )}
          </div>

          {globalBannerMessage && (
            <div className="rounded-lg border border-cyan-400/50 bg-slate-950/90 px-3 py-1 text-center text-[10px] sm:text-xs font-bold tracking-wide text-cyan-200 shadow-lg max-w-[60vw] truncate">
              {globalBannerMessage}
            </div>
          )}

          {hud.announcement && (
            <div className="rounded-lg border border-amber-400/50 bg-slate-950/90 px-3 py-1 text-center text-[10px] sm:text-xs font-black tracking-wide text-amber-200 shadow-lg max-w-[55vw] truncate">
              {hud.announcement}
            </div>
          )}
        </div>

        {/* Top-Right: ALIVE: 50 / 50 (BR) + Camera/FS/Pause + Compact Mini-Map */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="pointer-events-auto flex items-center gap-1">
            {onOpenEmotes && (
              <button
                type="button"
                onClick={onOpenEmotes}
                className="flex items-center gap-1 rounded-lg border border-amber-400/40 bg-slate-950/75 px-2 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-slate-800 whitespace-nowrap"
                title="Emote Wheel (B)"
              >
                <Smile className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Emote [B]</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCycleCamera}
              className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-950/75 px-2 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-slate-800 whitespace-nowrap"
              title="Switch Camera View (V)"
            >
              {hud.cameraView === 'first' ? <Eye className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">{cameraLabel} [V]</span>
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-lg border border-white/15 bg-slate-950/75 p-1.5 text-slate-200 hover:bg-slate-800"
              title="Toggle Fullscreen (F11)"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onPauseClick}
              className="rounded-lg border border-white/15 bg-slate-950/75 p-1.5 text-white hover:bg-slate-800"
              title="Pause (ESC)"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Police Wanted Level Stars (1-5★) */}
          {(hud.wantedLevel ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-slate-950/90 px-2.5 py-1 shadow-lg">
              <Siren className="h-3.5 w-3.5 text-sky-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= (hud.wantedLevel ?? 0)
                        ? 'fill-amber-400 text-amber-300'
                        : 'fill-slate-800 text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] font-black text-rose-300">WANTED</span>
            </div>
          )}

          {/* Battle Royale Prominent Top-Right ALIVE Counter (50 / 50) */}
          {hud.isBattleRoyale && (
            <div className="flex items-center gap-1.5 rounded-xl border border-cyan-400/50 bg-slate-950/85 px-2.5 py-1 shadow-lg">
              <Users className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="font-mono text-[11px] sm:text-xs font-black tracking-wide text-white tabular-nums whitespace-nowrap">
                ALIVE: <span className="text-cyan-300">{hud.aliveCount ?? 0}</span> / {hud.totalFighters ?? 50}
              </span>
            </div>
          )}

          {/* Compact Top-Right Kill Feed with Fighter Avatars */}
          {hud.killFeed && hud.killFeed.length > 0 && (
            <div className="hidden sm:flex flex-col items-end gap-1 max-w-[265px]">
              {hud.killFeed.slice(0, 3).map((kf) => {
                const localName = (playerName || '').trim().toLowerCase();
                const killerIsLocal =
                  kf.isLocalInvolved &&
                  Boolean(localName) &&
                  kf.killer.trim().toLowerCase().startsWith(localName);
                const victimIsLocal =
                  kf.isLocalInvolved &&
                  Boolean(localName) &&
                  kf.victim.trim().toLowerCase().startsWith(localName);
                return (
                  <div
                    key={kf.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold shadow ${
                      kf.isLocalInvolved
                        ? 'border-amber-400/60 bg-slate-950/90 text-amber-200'
                        : 'border-white/10 bg-slate-950/75 text-slate-200'
                    }`}
                  >
                    <PlayerAvatar
                      avatarUrl={killerIsLocal ? playerAvatarUrl : undefined}
                      avatarIcon={
                        killerIsLocal
                          ? playerAvatarIcon
                          : deterministicPresetForName(kf.killer)
                      }
                      alt={kf.killer}
                      size="xs"
                      shape="circle"
                      className="h-4 w-4"
                    />
                    <span className="truncate max-w-[74px] font-black text-cyan-300">
                      {kf.killer}
                    </span>
                    <span className="text-[9px] text-slate-400">[{kf.weapon}]</span>
                    <PlayerAvatar
                      avatarUrl={victimIsLocal ? playerAvatarUrl : undefined}
                      avatarIcon={
                        victimIsLocal
                          ? playerAvatarIcon
                          : deterministicPresetForName(kf.victim)
                      }
                      alt={kf.victim}
                      size="xs"
                      shape="circle"
                      className="h-4 w-4"
                    />
                    <span className="truncate max-w-[74px] font-black text-rose-300">
                      {kf.victim}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Open-World Island Mini-Map Radar (Always Visible on Phone & Desktop, Compact) */}
          <div className="flex flex-col items-center rounded-xl border border-cyan-400/35 bg-slate-950/80 p-1 shadow-lg">
            <svg
              viewBox={`0 0 ${radarSize} ${radarSize}`}
              className="h-[84px] w-[84px] sm:h-[112px] sm:w-[112px] rounded-full bg-sky-950/80"
            >
              <circle cx={radarR} cy={radarR} r={radarR - 2} fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
              <path
                d={`M ${radarR} ${radarR} L ${radarR - 18} ${radarR - 36} A 40 40 0 0 1 ${radarR + 18} ${radarR - 36} Z`}
                fill="rgba(56,189,248,0.16)"
              />
              {hud.radarBuildings.map((b, idx) => {
                const p = toRadar(b.x, b.z);
                if (p.x < 0 || p.x > radarSize || p.y < 0 || p.y > radarSize) return null;
                return (
                  <rect
                    key={idx}
                    x={p.x - (b.w * scale) / 2}
                    y={p.y - (b.d * scale) / 2}
                    width={Math.max(2.5, b.w * scale)}
                    height={Math.max(2.5, b.d * scale)}
                    fill="rgba(148,163,184,0.55)"
                    rx="1"
                  />
                );
              })}
              {hud.titanicCenter &&
                (() => {
                  const tp = clampRadar(toRadar(hud.titanicCenter.x, hud.titanicCenter.z).x, toRadar(hud.titanicCenter.x, hud.titanicCenter.z).y);
                  return (
                    <rect
                      x={tp.x - 6}
                      y={tp.y - 2.2}
                      width={12}
                      height={4.4}
                      fill="#f8fafc"
                      stroke="#f59e0b"
                      strokeWidth="0.9"
                      rx="1"
                    />
                  );
                })()}
              {hud.tribalIslandCenter &&
                (() => {
                  const ti = clampRadar(
                    toRadar(hud.tribalIslandCenter.x, hud.tribalIslandCenter.z).x,
                    toRadar(hud.tribalIslandCenter.x, hud.tribalIslandCenter.z).y
                  );
                  return (
                    <circle
                      cx={ti.x}
                      cy={ti.y}
                      r={5.5}
                      fill="rgba(34,197,94,0.38)"
                      stroke="#f97316"
                      strokeWidth="1.2"
                    />
                  );
                })()}
              {hud.airportIslandCenter &&
                (() => {
                  const ai = clampRadar(
                    toRadar(hud.airportIslandCenter.x, hud.airportIslandCenter.z).x,
                    toRadar(hud.airportIslandCenter.x, hud.airportIslandCenter.z).y
                  );
                  return (
                    <rect
                      x={ai.x - 6}
                      y={ai.y - 4.5}
                      width={12}
                      height={9}
                      rx={2}
                      fill="rgba(148,163,184,0.45)"
                      stroke="#facc15"
                      strokeWidth="1.1"
                    />
                  );
                })()}
              {hud.radarVehicles.map((v, idx) => {
                const p = toRadar(v.x, v.z);
                const c = clampRadar(p.x, p.y);
                const boat = isBoatKind(v.kind);
                const marine = isMarineMountKind(v.kind);
                const bird = isFlyingMountKind(v.kind);
                const animal = isLandAnimalKind(v.kind);
                return (
                  <rect
                    key={`v_${idx}`}
                    x={c.x - (boat ? 2.5 : 2)}
                    y={c.y - (boat ? 2.5 : 2)}
                    width={boat ? 5 : 4}
                    height={boat ? 5 : 4}
                    fill={
                      bird
                        ? '#facc15'
                        : animal
                          ? '#d97706'
                          : marine
                            ? '#06b6d4'
                            : boat
                              ? '#38bdf8'
                              : '#34d399'
                    }
                    rx={marine || bird ? '2' : '1'}
                  />
                );
              })}
              {hud.radarPickups.map((pk, idx) => {
                const p = toRadar(pk.x, pk.z);
                if (Math.hypot(p.x - radarR, p.y - radarR) > radarR - 4) return null;
                const pkCol =
                  pk.kind === 'conch'
                    ? '#fbbf24'
                    : pk.kind === 'pearl'
                      ? '#67e8f9'
                      : pk.kind === 'shell' || pk.kind === 'starfish'
                        ? '#fda4af'
                        : pk.kind === 'volcano_crate'
                          ? '#ff5500'
                          : pk.kind === 'meat'
                            ? '#f87171'
                            : pk.kind === 'coin'
                              ? '#facc15'
                              : '#38bdf8';
                return (
                  <circle
                    key={`pk_${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={pk.kind === 'conch' || pk.kind === 'pearl' || pk.kind === 'volcano_crate' ? 2.4 : 1.7}
                    fill={pkCol}
                  />
                );
              })}
              {hud.radarActors.map((a) => {
                if (!a.alive || a.isLocal) return null;
                const p = toRadar(a.x, a.z);
                const c = clampRadar(p.x, p.y);
                const friendly = hud.teamMode === 'team' && a.team === hud.playerTeam;
                return (
                  <circle
                    key={a.id}
                    cx={c.x}
                    cy={c.y}
                    r={c.clamped ? 2.4 : 3.0}
                    fill={friendly ? '#4ade80' : '#f43f5e'}
                  />
                );
              })}
              {hud.isBattleRoyale &&
                (() => {
                  const zc = toRadar(hud.zoneCenterX ?? 0, hud.zoneCenterZ ?? 0);
                  const nc = toRadar(hud.nextZoneCenterX ?? 0, hud.nextZoneCenterZ ?? 0);
                  const fs = hud.planeFlightStart ? toRadar(hud.planeFlightStart.x, hud.planeFlightStart.z) : null;
                  const fe = hud.planeFlightEnd ? toRadar(hud.planeFlightEnd.x, hud.planeFlightEnd.z) : null;
                  const pl = hud.planePos ? clampRadar(toRadar(hud.planePos.x, hud.planePos.z).x, toRadar(hud.planePos.x, hud.planePos.z).y) : null;
                  const ad = hud.airdropPos ? clampRadar(toRadar(hud.airdropPos.x, hud.airdropPos.z).x, toRadar(hud.airdropPos.x, hud.airdropPos.z).y) : null;
                  return (
                    <>
                      <circle
                        cx={zc.x}
                        cy={zc.y}
                        r={Math.max(4, (hud.zoneRadius ?? 180) * scale)}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={nc.x}
                        cy={nc.y}
                        r={Math.max(3, (hud.nextZoneRadius ?? 90) * scale)}
                        fill="none"
                        stroke="#ffffff"
                        strokeDasharray="3 3"
                        strokeWidth="1.1"
                      />
                      {fs && fe && (
                        <line
                          x1={fs.x}
                          y1={fs.y}
                          x2={fe.x}
                          y2={fe.y}
                          stroke="#facc15"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                          opacity={0.75}
                        />
                      )}
                      {pl && <circle cx={pl.x} cy={pl.y} r={3.2} fill="#fde047" stroke="#0f172a" strokeWidth="1" />}
                      {ad && (
                        <polygon
                          points={`${ad.x},${ad.y - 4} ${ad.x + 4},${ad.y} ${ad.x},${ad.y + 4} ${ad.x - 4},${ad.y}`}
                          fill="#f59e0b"
                          stroke="#fef08a"
                          strokeWidth="1"
                        />
                      )}
                    </>
                  );
                })()}
              <circle cx={radarR} cy={radarR} r={3.5} fill="#ffffff" stroke="#22d3ee" strokeWidth="1.5" />
            </svg>
            <div className="mt-0.5 hidden sm:flex items-center gap-2 text-[8px] font-bold text-slate-400">
              <span className="text-rose-400">Enemy</span>
              {hud.teamMode === 'team' && <span className="text-emerald-400">Ally</span>}
              {hud.isBattleRoyale ? (
                <>
                  <span className="text-sky-400">Zone</span>
                  <span className="text-amber-300">Drop</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400">Ride</span>
                  <span className="text-amber-400">Horse</span>
                </>
              )}
            </div>
          </div>

          {/* Compact Desktop Standings */}
          <div className="hidden lg:block w-48 rounded-xl border border-white/10 bg-slate-950/75 p-2 text-[10px]">
            <div className="mb-1 flex items-center justify-between font-black uppercase tracking-wider text-slate-400">
              <span>Standings</span>
              <span className="tabular-nums">{hud.totalFighters ?? hud.combatants.length} Fighters</span>
            </div>
            <div className="space-y-0.5">
              {hud.combatants.slice(0, 4).map((c, idx) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between rounded-md px-1.5 py-0.5 ${
                    c.isLocal ? 'bg-cyan-500/25 border border-cyan-400/40 text-white' : 'bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1 truncate">
                    <span className="font-mono text-slate-400 tabular-nums">{idx + 1}.</span>
                    {c.hasCrown && <Crown className="h-2.5 w-2.5 text-amber-400 shrink-0" />}
                    <span className="truncate font-bold">{c.name}</span>
                  </div>
                  <span className="font-mono font-black text-amber-300 tabular-nums">{c.kos} KO</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Center Mounted Vehicle / Horse Health Bar (Compact, appears while riding) */}
      {hud.mountedName && (
        <div className="fixed bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 w-56 sm:w-64 rounded-xl border border-emerald-400/55 bg-slate-950/85 px-3 py-1.5 shadow-xl">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black">
            <span className="flex items-center gap-1.5 text-emerald-300 truncate">
              {hud.mountedKind && isFlyingMountKind(hud.mountedKind) ? (
                <Feather className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              ) : hud.mountedKind && isHelicopterKind(hud.mountedKind) ? (
                <Rocket className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              ) : hud.mountedKind && isTankKind(hud.mountedKind) ? (
                <Shield className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              ) : hud.mountedKind && isMarineMountKind(hud.mountedKind) ? (
                <Fish className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
              ) : hud.mountedKind && isLandAnimalKind(hud.mountedKind) ? (
                <PawPrint className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              ) : hud.mountedKind && isBoatKind(hud.mountedKind) ? (
                <Ship className="h-3.5 w-3.5 shrink-0 text-sky-300" />
              ) : (
                <Car className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{hud.mountedName.toUpperCase()}</span>
            </span>
            <span className="font-mono text-white tabular-nums shrink-0">
              {Math.ceil(hud.mountedHp)}/{hud.mountedMaxHp} HP · {hud.mountedSpeedKmh} km/h
            </span>
          </div>
          {hud.mountedKind && (isHelicopterKind(hud.mountedKind) || isTankKind(hud.mountedKind)) && (
            <div className="mt-0.5 text-[9px] font-bold text-amber-200/90 text-center truncate">
              {isHelicopterKind(hud.mountedKind)
                ? '[SPACE/C] Fly Up/Dn · [Click] Air-to-Ground Missiles'
                : '[Click] Fire Explosive Cannon · [F] Exit'}
            </div>
          )}
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                mountPct > 55 ? 'bg-emerald-400' : mountPct > 25 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${mountPct}%` }}
            />
          </div>
          {mountPct < 28 && hud.mountedKind && !isLivingMountKind(hud.mountedKind) && (
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-black text-rose-400">
              <ShieldAlert className="h-3 w-3" /> CRITICAL — [F] TO EXIT BEFORE EXPLOSION
            </div>
          )}
          {mountPct < 28 && hud.mountedKind && isLivingMountKind(hud.mountedKind) && (
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-black text-amber-300">
              <ShieldAlert className="h-3 w-3" /> LOW HP — [F] TO DISMOUNT SAFELY
            </div>
          )}
        </div>
      )}

      {/* Bottom-Center Compact Weapon Switcher (Always visible & tappable on phone & desktop) */}
      <div className="pointer-events-auto fixed bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-1.5 rounded-xl border border-white/15 bg-slate-950/80 p-1 shadow-xl">
        <button
          type="button"
          onClick={() => onSelectSlot?.('gun')}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 sm:px-2.5 text-[10px] sm:text-xs font-bold transition ${
            hud.activeSlot === 'gun'
              ? 'bg-cyan-500/25 border border-cyan-400 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="hidden sm:inline rounded bg-slate-800 px-1 py-0.5 text-[9px] font-black text-cyan-300">[1]</span>
          <div className="text-left leading-tight">
            <div className="font-black max-w-[74px] sm:max-w-none truncate">{gun.name}</div>
            <div className="text-[9px] sm:text-[10px] font-mono text-cyan-200 tabular-nums">
              {hud.ammoInMag}/{gun.magSize} ({hud.reserveAmmo < 0 ? '∞' : hud.reserveAmmo})
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectSlot?.('knife')}
          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 sm:px-2.5 text-[10px] sm:text-xs font-bold transition ${
            hud.activeSlot === 'knife'
              ? 'bg-rose-500/25 border border-rose-400 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="hidden sm:inline rounded bg-slate-800 px-1 py-0.5 text-[9px] font-black text-rose-300">[2]</span>
          <Sword className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          <span className="font-black hidden sm:inline">{knife.name}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSlot?.('grenade')}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 sm:px-2.5 text-[10px] sm:text-xs font-bold transition ${
            hud.activeSlot === 'grenade'
              ? 'bg-emerald-500/25 border border-emerald-400 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="hidden sm:inline rounded bg-slate-800 px-1 py-0.5 text-[9px] font-black text-emerald-300">[3]</span>
          <Bomb className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <div className="text-left leading-tight">
            <div className="font-black hidden sm:block">{grenade.name}</div>
            <div className="text-[9px] sm:text-[10px] font-mono text-emerald-200 tabular-nums">x{hud.grenadeCount}</div>
          </div>
        </button>
      </div>
    </div>
  );
};
