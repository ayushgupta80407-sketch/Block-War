import React, { useRef, useState } from 'react';
import {
  Armchair,
  ArrowDown,
  ArrowLeftRight,
  Bomb,
  Camera,
  Car,
  Crosshair,
  DoorOpen,
  Feather,
  Fish,
  HeartHandshake,
  Leaf,
  PawPrint,
  Repeat,
  Rocket,
  RotateCw,
  Ship,
  Smile,
  Upload,
  Zap,
} from 'lucide-react';
import { TouchInputState } from '../game/engine';
import { MountType, WeaponSlot } from '../game/types';
import {
  isBoatKind,
  isFlyingMountKind,
  isHelicopterKind,
  isLandAnimalKind,
  isMarineMountKind,
} from '../game/vehiclesAndWildlife';

interface TouchControlsProps {
  visible: boolean;
  activeSlot: WeaponSlot;
  ammoInMag: number;
  magSize: number;
  grenadeCount: number;
  nearDoorPrompt: string | null;
  nearBenchPrompt?: string | null;
  nearFruitPrompt?: string | null;
  nearLootPrompt?: string | null;
  nearConsolePrompt?: string | null;
  nearMountPrompt: string | null;
  mountedKind: MountType | null;
  isSwimming?: boolean;
  isCrouching?: boolean;
  isSitting?: boolean;
  brPhase?: 'plane' | 'freefall' | 'parachute' | 'ground';
  tribalCapturePhase?: 'none' | 'struggle' | 'suspended';
  reviveTargetName?: string | null;
  isKnockedDown?: boolean;
  onTouchUpdate: (state: Partial<TouchInputState>) => void;
  onReplaceLoot?: () => void;
  onOpenConsole?: () => void;
  onOpenEmoteWheel?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  visible,
  activeSlot,
  ammoInMag,
  magSize,
  grenadeCount,
  nearDoorPrompt,
  nearBenchPrompt,
  nearFruitPrompt,
  nearLootPrompt,
  nearConsolePrompt,
  nearMountPrompt,
  mountedKind,
  isSwimming = false,
  isCrouching = false,
  isSitting = false,
  brPhase = 'ground',
  tribalCapturePhase = 'none',
  reviveTargetName,
  isKnockedDown,
  onTouchUpdate,
  onReplaceLoot,
  onOpenConsole,
  onOpenEmoteWheel,
}) => {
  const joyPointerId = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number }>({ x: 64, y: 240 });
  const [joyActive, setJoyActive] = useState(false);
  const [joyPos, setJoyPos] = useState<{ x: number; y: number }>({ x: 64, y: 240 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const lookPointerId = useRef<number | null>(null);
  const lastLook = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!visible) return null;

  const maxJoyDist = 34;

  // Floating 360 Virtual Joystick on left edge
  const handleLeftDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerId.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setJoyPos({ x: e.clientX, y: e.clientY });
    setJoyActive(true);
    setKnobOffset({ x: 0, y: 0 });
    onTouchUpdate({ moveX: 0, moveY: 0 });
  };

  const handleLeftMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    const dx = e.clientX - joyOrigin.current.x;
    const dy = e.clientY - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxJoyDist, dist);
    const nx = dist > 0.1 ? (dx / dist) * clamped : 0;
    const ny = dist > 0.1 ? (dy / dist) * clamped : 0;
    setKnobOffset({ x: nx, y: ny });
    onTouchUpdate({ moveX: nx / maxJoyDist, moveY: ny / maxJoyDist });
  };

  const handleLeftUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    joyPointerId.current = null;
    setJoyActive(false);
    setKnobOffset({ x: 0, y: 0 });
    onTouchUpdate({ moveX: 0, moveY: 0 });
  };

  // Right-half open camera drag zone
  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    lookPointerId.current = e.pointerId;
    lastLook.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== e.pointerId) return;
    const dx = e.clientX - lastLook.current.x;
    const dy = e.clientY - lastLook.current.y;
    lastLook.current = { x: e.clientX, y: e.clientY };
    onTouchUpdate({ lookDeltaX: dx * 1.45, lookDeltaY: dy * 1.45 });
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== e.pointerId) return;
    lookPointerId.current = null;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none touch-none">
      {/* Left Edge Compact Floating Virtual Joystick Zone */}
      <div
        className="pointer-events-auto fixed left-0 top-20 bottom-0 w-[38vw]"
        onPointerDown={handleLeftDown}
        onPointerMove={handleLeftMove}
        onPointerUp={handleLeftUp}
        onPointerCancel={handleLeftUp}
      >
        <div
          className={`pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 rounded-full border transition-opacity ${
            joyActive
              ? 'border-cyan-400/80 bg-slate-950/65 opacity-85 shadow-md shadow-cyan-500/20'
              : 'border-white/25 bg-slate-950/55 opacity-70'
          } flex items-center justify-center`}
          style={{
            width: 84,
            height: 84,
            left: joyActive ? joyPos.x : 56,
            top: joyActive ? joyPos.y : undefined,
            bottom: joyActive ? undefined : 16,
          }}
        >
          <div
            className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border border-white/80 shadow"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Half Open Touch Aiming Zone */}
      <div
        className="pointer-events-auto fixed right-0 top-20 bottom-0 w-[62vw]"
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
      />

      {/* Bottom-Right Compact Phone-Style Dark Glass Button Cluster */}
      <div className="pointer-events-auto fixed right-2.5 bottom-2.5 flex flex-col items-end gap-1.5">
        {/* Contextual Mount / Exit, Revive, Struggle, Eat Fruit & Door Row */}
        <div className="flex items-center gap-1.5">
          {tribalCapturePhase === 'struggle' && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTouchUpdate({ jumpPressed: true });
              }}
              className="flex h-12 items-center gap-1.5 rounded-xl border-2 border-amber-300 bg-amber-500 px-3.5 text-xs font-black text-slate-950 shadow-xl animate-pulse active:scale-95"
            >
              <Zap className="h-4 w-4" />
              STRUGGLE!
            </button>
          )}
          {reviveTargetName && !isKnockedDown && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTouchUpdate({ reviveHeld: true });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onTouchUpdate({ reviveHeld: false });
              }}
              onPointerCancel={() => onTouchUpdate({ reviveHeld: false })}
              className="flex h-10 items-center gap-1 rounded-xl border border-emerald-300/75 bg-emerald-500/80 px-2.5 text-[10px] font-black text-slate-950 shadow active:scale-95"
            >
              <HeartHandshake className="h-3.5 w-3.5" />
              REVIVE
            </button>
          )}
          {nearLootPrompt && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onReplaceLoot?.();
              }}
              className="flex h-10 items-center gap-1 rounded-xl border border-amber-300/85 bg-amber-500/90 px-2.5 text-[10px] font-black text-slate-950 shadow-lg active:scale-95"
            >
              <Repeat className="h-3.5 w-3.5" />
              REPLACE
            </button>
          )}
          {nearConsolePrompt && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onOpenConsole?.();
              }}
              className="flex h-10 items-center gap-1 rounded-xl border border-rose-300/85 bg-rose-500/90 px-2.5 text-[10px] font-black text-white shadow-lg active:scale-95"
            >
              <Rocket className="h-3.5 w-3.5" />
              CONSOLE
            </button>
          )}
          {nearFruitPrompt && !nearDoorPrompt && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTouchUpdate({ interactPressed: true });
              }}
              className="flex h-10 items-center gap-1 rounded-xl border border-lime-300/75 bg-lime-500/85 px-2.5 text-[10px] font-black text-slate-950 shadow active:scale-95"
            >
              <Leaf className="h-3.5 w-3.5" />
              EAT FRUIT
            </button>
          )}
          {nearDoorPrompt && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTouchUpdate({ interactPressed: true });
              }}
              className="flex h-10 items-center gap-1 rounded-xl border border-amber-300/70 bg-amber-500/80 px-2.5 text-[10px] font-black text-slate-950 shadow active:scale-95"
            >
              <DoorOpen className="h-3.5 w-3.5" />
              DOOR
            </button>
          )}
          {(nearBenchPrompt || isSitting) && !nearDoorPrompt && !nearFruitPrompt && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTouchUpdate({ interactPressed: true });
              }}
              className={`flex h-10 items-center gap-1 rounded-xl border px-2.5 text-[10px] font-black shadow active:scale-95 ${
                isSitting
                  ? 'border-cyan-300/75 bg-cyan-500/85 text-slate-950'
                  : 'border-emerald-300/70 bg-teal-500/85 text-slate-950'
              }`}
            >
              <Armchair className="h-3.5 w-3.5" />
              {isSitting ? 'STAND' : 'SIT / REST'}
            </button>
          )}
          {(nearMountPrompt || mountedKind) && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onTouchUpdate({ mountPressed: true });
              }}
              className={`flex h-10 items-center gap-1 rounded-xl border px-2.5 text-[10px] font-black shadow active:scale-95 ${
                mountedKind
                  ? 'border-rose-300/75 bg-rose-600/80 text-white'
                  : 'border-emerald-300/75 bg-emerald-500/80 text-slate-950'
              }`}
            >
              {(mountedKind && isFlyingMountKind(mountedKind)) ||
              (nearMountPrompt && /Eagle|Pterodactyl|Griffin|Ride & Fly/i.test(nearMountPrompt)) ? (
                <Feather className="h-3.5 w-3.5" />
              ) : (mountedKind && isMarineMountKind(mountedKind)) ||
                (nearMountPrompt && /Shark|Whale|Sailfish|Turtle|Manta/i.test(nearMountPrompt)) ? (
                <Fish className="h-3.5 w-3.5" />
              ) : (mountedKind && isLandAnimalKind(mountedKind)) ||
                (nearMountPrompt && /Horse|Mustang|Stallion|Gorilla|Rhino|Cheetah/i.test(nearMountPrompt)) ? (
                <PawPrint className="h-3.5 w-3.5" />
              ) : (mountedKind && isBoatKind(mountedKind)) || nearMountPrompt?.includes('Board') ? (
                <Ship className="h-3.5 w-3.5" />
              ) : (
                <Car className="h-3.5 w-3.5" />
              )}
              {mountedKind
                ? 'EXIT'
                : nearMountPrompt?.includes('Ride & Fly')
                  ? 'FLY'
                  : nearMountPrompt?.includes('Board')
                    ? 'BOARD'
                    : 'RIDE'}
            </button>
          )}
        </div>

        {/* Utility Row (44px compact dark-glass icons, opacity ~0.72) */}
        <div className="flex items-center gap-1.5">
          {onOpenEmoteWheel && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onOpenEmoteWheel();
              }}
              className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-amber-400/40 bg-slate-950/75 opacity-80 text-amber-300 shadow active:scale-95"
              aria-label="Emote Wheel"
            >
              <Smile className="h-3.5 w-3.5" />
              <span className="text-[8px] font-bold leading-none mt-0.5">EMOTE</span>
            </button>
          )}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ cycleCameraPressed: true });
            }}
            className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/20 bg-slate-950/75 opacity-75 text-cyan-300 shadow active:scale-95"
            aria-label="Camera View"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="text-[8px] font-bold leading-none mt-0.5">CAM</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ switchWeaponPressed: true });
            }}
            className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/20 bg-slate-950/75 opacity-75 text-amber-300 shadow active:scale-95"
            aria-label="Switch Weapon"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span className="text-[8px] font-bold leading-none mt-0.5">
              {activeSlot === 'gun' ? 'KNIFE' : 'GUN'}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ reloadPressed: true });
            }}
            className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/20 bg-slate-950/75 opacity-75 text-sky-300 shadow active:scale-95"
            aria-label="Reload"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="text-[8px] font-mono font-bold leading-none mt-0.5 tabular-nums">
              {ammoInMag}/{magSize}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ grenadePressed: true });
            }}
            className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-emerald-400/45 bg-slate-950/75 opacity-75 text-emerald-300 shadow active:scale-95"
            aria-label="Throw Grenade"
          >
            <Bomb className="h-3.5 w-3.5" />
            <span className="text-[8px] font-mono font-bold leading-none mt-0.5 tabular-nums">
              x{grenadeCount}
            </span>
          </button>
        </div>

        {/* Primary Action Row: Crouch/Fly-Down (44px) + Jump/Fly-Up/Chute (46px) + Fire (56px) */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ crouchPressed: true, diveHeld: true });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onTouchUpdate({ diveHeld: false });
            }}
            onPointerCancel={() => onTouchUpdate({ diveHeld: false })}
            className={`flex h-11 w-11 flex-col items-center justify-center rounded-full border opacity-80 shadow active:scale-95 ${
              isCrouching
                ? 'border-cyan-300 bg-cyan-500/80 text-slate-950'
                : 'border-white/25 bg-slate-950/75 text-slate-200'
            }`}
            aria-label="Crouch or Dive"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span className="text-[7px] font-black leading-none mt-0.5">
              {mountedKind && (isFlyingMountKind(mountedKind) || isHelicopterKind(mountedKind))
                ? 'FLY DN'
                : isSwimming || (mountedKind && isMarineMountKind(mountedKind))
                  ? 'DIVE'
                  : 'CROUCH'}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ jumpPressed: true, jumpHeld: true });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onTouchUpdate({ jumpHeld: false });
            }}
            onPointerCancel={() => onTouchUpdate({ jumpHeld: false })}
            className="flex h-[46px] w-[46px] flex-col items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-600/75 opacity-80 text-white font-black shadow active:scale-95"
            aria-label="Jump or Fly Up"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[7px] leading-none mt-0.5">
              {brPhase === 'freefall'
                ? 'CHUTE'
                : mountedKind && (isFlyingMountKind(mountedKind) || isHelicopterKind(mountedKind))
                  ? 'FLY UP'
                  : isSwimming || (mountedKind && isMarineMountKind(mountedKind))
                    ? 'UP'
                    : mountedKind && isLandAnimalKind(mountedKind)
                      ? 'LEAP'
                      : 'JUMP'}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchUpdate({ fireHeld: true });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onTouchUpdate({ fireHeld: false });
            }}
            onPointerCancel={() => onTouchUpdate({ fireHeld: false })}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-rose-200/80 bg-gradient-to-br from-rose-500/85 to-orange-600/85 opacity-85 text-white font-black shadow-lg shadow-rose-500/25 active:scale-95"
            aria-label="Fire"
          >
            <Crosshair className="h-5 w-5" />
            <span className="text-[9px] font-black leading-none mt-0.5 tracking-wide">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
