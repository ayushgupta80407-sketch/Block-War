import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { EMOTE_CATALOG, getEmoteDef } from '../game/catalog';
import { EmoteId } from '../game/types';

interface EmoteWheelProps {
  open: boolean;
  equippedEmotes: EmoteId[];
  onSelect: (emoteId: EmoteId) => void;
  onClose: () => void;
}

export const EmoteWheel: React.FC<EmoteWheelProps> = ({
  open,
  equippedEmotes,
  onSelect,
  onClose,
}) => {
  const slots: EmoteId[] =
    equippedEmotes && equippedEmotes.length > 0
      ? equippedEmotes.slice(0, 6)
      : [EMOTE_CATALOG[0].id];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyB') {
        e.preventDefault();
        onClose();
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= slots.length) {
        e.preventDefault();
        onSelect(slots[num - 1]);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, slots, onSelect, onClose]);

  if (!open) return null;

  const radius = 112;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[320px] w-[320px] items-center justify-center">
        {/* Outer Ring Guide */}
        <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-dashed border-amber-400/35 bg-slate-950/55 shadow-2xl" />

        {/* 6 Radial Slots */}
        {slots.map((id, idx) => {
          const def = getEmoteDef(id);
          const angle = (idx / Math.max(1, slots.length)) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                borderColor: def.accentColor,
              }}
              className="group absolute flex h-20 w-24 flex-col items-center justify-center rounded-2xl border-2 bg-slate-900/95 px-2 text-center shadow-xl transition hover:scale-105 hover:bg-slate-800 active:scale-95"
            >
              <span className="text-[10px] font-mono font-black text-amber-300">[{idx + 1}]</span>
              <Sparkles className="my-0.5 h-4 w-4 text-white group-hover:scale-110 transition" style={{ color: def.accentColor }} />
              <span className="text-[11px] font-black leading-tight text-white line-clamp-2">
                {def.name}
              </span>
            </button>
          );
        })}

        {/* Center Cancel Button */}
        <button
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-white/25 bg-slate-900 text-xs font-black text-slate-200 shadow-2xl hover:bg-slate-800"
        >
          <X className="h-5 w-5 text-rose-400" />
          <span className="mt-0.5 text-[10px] uppercase tracking-wider">Cancel</span>
        </button>

        <div className="pointer-events-none absolute -bottom-7 rounded-full border border-white/15 bg-slate-950/90 px-3 py-1 text-[10px] font-bold text-slate-300 whitespace-nowrap">
          Tap slot or press [1–{slots.length}] · Unlock more in Shop &gt; Emotes
        </div>
      </div>
    </div>
  );
};
