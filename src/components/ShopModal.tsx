import React, { useState } from 'react';
import {
  Bomb,
  Check,
  Coins,
  Lock,
  MapPin,
  Plane,
  Shield,
  ShoppingBag,
  Smile,
  Sparkles,
  Sword,
  Target,
  Wind,
  X,
} from 'lucide-react';
import {
  AIRPLANE_CATALOG,
  ARENA_CATALOG,
  EMOTE_CATALOG,
  GRENADE_CATALOG,
  GUN_CATALOG,
  KNIFE_CATALOG,
  PARACHUTE_CATALOG,
  SKIN_CATALOG,
} from '../game/catalog';
import { PlayerProgress, ShopCategory } from '../game/types';
import { ShopPreview3D } from './ShopPreview3D';

interface ShopModalProps {
  open: boolean;
  progress: PlayerProgress;
  busy: boolean;
  feedback: { type: 'ok' | 'err'; text: string } | null;
  onClose: () => void;
  onBuy: (category: ShopCategory, itemId: string) => void;
  onEquip: (category: ShopCategory, itemId: string) => void;
}

const TABS: Array<{ id: ShopCategory; label: string; icon: React.ReactNode }> = [
  { id: 'backgrounds', label: 'Island Maps', icon: <MapPin className="h-4 w-4" /> },
  { id: 'guns', label: 'Guns', icon: <Target className="h-4 w-4" /> },
  { id: 'knives', label: 'Knives', icon: <Sword className="h-4 w-4" /> },
  { id: 'grenades', label: 'Grenades', icon: <Bomb className="h-4 w-4" /> },
  { id: 'airplanes', label: 'Airplanes', icon: <Plane className="h-4 w-4" /> },
  { id: 'parachutes', label: 'Parachutes', icon: <Wind className="h-4 w-4" /> },
  { id: 'skins', label: 'Skins', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'emotes', label: 'Emotes', icon: <Smile className="h-4 w-4" /> },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  open,
  progress,
  busy,
  feedback,
  onClose,
  onBuy,
  onEquip,
}) => {
  const [tab, setTab] = useState<ShopCategory>('guns');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">ISLAND ARMORY & SHOP</h2>
              <p className="text-xs text-slate-400">
                Unlock islands, firearms, blades, grenades & character skins with earned coins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {progress.isVipAllUnlocked && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-black uppercase text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> ALL UNLOCKED · FREE / EQUIP
              </span>
            )}
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-1.5 text-sm font-black text-amber-300 tabular-nums">
              <Coins className="h-4 w-4" />
              <span>{progress.coins.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 bg-slate-900/90 px-5 py-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mx-5 mt-3 rounded-xl border px-4 py-2 text-xs font-bold ${
              feedback.type === 'ok'
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                : 'border-rose-400/40 bg-rose-500/15 text-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Item Grid */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
          {tab === 'backgrounds' &&
            ARENA_CATALOG.map((item) => {
              const unlocked = Boolean(progress.isVipAllUnlocked) || progress.unlockedArenas.includes(item.id);
              const equipped = progress.equipped.arenaId === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="backgrounds"
                  itemId={item.id}
                  title={item.name}
                  subtitle={item.subtitle}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('backgrounds', item.id)}
                  onEquip={() => onEquip('backgrounds', item.id)}
                />
              );
            })}

          {tab === 'guns' &&
            GUN_CATALOG.map((item) => {
              const unlocked = Boolean(progress.isVipAllUnlocked) || progress.unlockedGuns.includes(item.id);
              const equipped = progress.equipped.gunId === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="guns"
                  itemId={item.id}
                  title={item.name}
                  subtitle={`${item.size} · ${item.magSize} Mag · ${item.damage} DMG`}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('guns', item.id)}
                  onEquip={() => onEquip('guns', item.id)}
                />
              );
            })}

          {tab === 'knives' &&
            KNIFE_CATALOG.map((item) => {
              const unlocked = Boolean(progress.isVipAllUnlocked) || progress.unlockedKnives.includes(item.id);
              const equipped = progress.equipped.knifeId === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="knives"
                  itemId={item.id}
                  title={item.name}
                  subtitle={`${item.size} · ${item.damage} Slash DMG`}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('knives', item.id)}
                  onEquip={() => onEquip('knives', item.id)}
                />
              );
            })}

          {tab === 'grenades' &&
            GRENADE_CATALOG.map((item) => {
              const unlocked = Boolean(progress.isVipAllUnlocked) || (progress.unlockedGrenades ?? []).includes(item.id);
              const equipped = progress.equipped.grenadeId === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="grenades"
                  itemId={item.id}
                  title={item.name}
                  subtitle={`${item.damage} Blast DMG · ${item.radius}m Radius`}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('grenades', item.id)}
                  onEquip={() => onEquip('grenades', item.id)}
                />
              );
            })}

          {tab === 'airplanes' &&
            AIRPLANE_CATALOG.map((item) => {
              const unlocked =
                Boolean(progress.isVipAllUnlocked) ||
                (progress.unlockedAirplanes ?? ['cargo_carrier']).includes(item.id);
              const equipped = (progress.equipped.airplaneId ?? 'cargo_carrier') === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="airplanes"
                  itemId={item.id}
                  title={item.name}
                  subtitle={effectivePrice === 0 ? 'Standard / VIP Drop Plane' : 'Custom Drop Plane'}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('airplanes', item.id)}
                  onEquip={() => onEquip('airplanes', item.id)}
                />
              );
            })}

          {tab === 'parachutes' &&
            PARACHUTE_CATALOG.map((item) => {
              const unlocked =
                Boolean(progress.isVipAllUnlocked) ||
                (progress.unlockedParachutes ?? ['classic_white']).includes(item.id);
              const equipped = (progress.equipped.parachuteId ?? 'classic_white') === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="parachutes"
                  itemId={item.id}
                  title={item.name}
                  subtitle={effectivePrice === 0 ? 'Standard / VIP Skydive Chute' : 'Custom Skydive Chute'}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('parachutes', item.id)}
                  onEquip={() => onEquip('parachutes', item.id)}
                />
              );
            })}

          {tab === 'skins' &&
            SKIN_CATALOG.map((item) => {
              const unlocked = Boolean(progress.isVipAllUnlocked) || progress.unlockedCharacters.includes(item.id);
              const equipped = progress.equipped.characterId === item.id;
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.unlockCost;
              return (
                <ShopCard
                  key={item.id}
                  category="skins"
                  itemId={item.id}
                  title={item.name}
                  subtitle={`${item.title} · SPD ${Math.round(item.speedBonus * 100)}%`}
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('skins', item.id)}
                  onEquip={() => onEquip('skins', item.id)}
                />
              );
            })}

          {tab === 'emotes' &&
            EMOTE_CATALOG.map((item) => {
              const unlocked =
                Boolean(progress.isVipAllUnlocked) ||
                (progress.unlockedEmotes ?? ['hello_wave']).includes(item.id);
              const equipped = (progress.equippedEmotes ?? ['hello_wave']).includes(item.id);
              const effectivePrice = progress.isVipAllUnlocked ? 0 : item.price;
              return (
                <ShopCard
                  key={item.id}
                  category="emotes"
                  itemId={item.id}
                  title={item.name}
                  subtitle={
                    effectivePrice === 0
                      ? 'FREE Emote · 6-Slot Wheel'
                      : `${item.duration.toFixed(1)}s Action · 6-Slot Wheel`
                  }
                  description={item.description}
                  price={effectivePrice}
                  unlocked={unlocked}
                  equipped={equipped}
                  busy={busy}
                  canAfford={progress.coins >= effectivePrice}
                  onBuy={() => onBuy('emotes', item.id)}
                  onEquip={() => onEquip('emotes', item.id)}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
};

interface ShopCardProps {
  category: ShopCategory;
  itemId: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  unlocked: boolean;
  equipped: boolean;
  busy: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

const ShopCard: React.FC<ShopCardProps> = ({
  category,
  itemId,
  title,
  subtitle,
  description,
  price,
  unlocked,
  equipped,
  busy,
  canAfford,
  onBuy,
  onEquip,
}) => (
  <div
    className={`flex flex-col justify-between rounded-2xl border p-3.5 transition ${
      equipped
        ? 'border-cyan-400 bg-cyan-950/25 shadow-lg shadow-cyan-500/10'
        : 'border-white/10 bg-slate-800/60 hover:border-white/25'
    }`}
  >
    <div>
      <ShopPreview3D category={category} itemId={itemId} heightClass="h-32" />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          <p className="text-[11px] font-bold text-cyan-300">{subtitle}</p>
        </div>
        {equipped ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300 border border-cyan-400/40">
            <Check className="h-3 w-3" /> EQUIPPED
          </span>
        ) : unlocked ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
            <Shield className="h-3 w-3" /> FREE / UNLOCKED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
            <Lock className="h-3 w-3" /> {price === 0 ? 'FREE' : `${price.toLocaleString()}c`}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{description}</p>
    </div>

    <div className="mt-3 pt-2 border-t border-white/10">
      {equipped ? (
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-slate-700/60 py-2 text-xs font-black uppercase text-slate-300"
        >
          Equipped in Loadout
        </button>
      ) : unlocked ? (
        <button
          type="button"
          disabled={busy}
          onClick={onEquip}
          className="w-full rounded-xl bg-cyan-500 py-2 text-xs font-black uppercase text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          UNLOCKED / EQUIP
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || !canAfford}
          onClick={onBuy}
          className={`w-full rounded-xl py-2 text-xs font-black uppercase transition ${
            canAfford
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {canAfford ? `Buy · ${price === 0 ? 'FREE (0c)' : `${price.toLocaleString()} Coins`}` : `Need ${price.toLocaleString()} Coins`}
        </button>
      )}
    </div>
  </div>
);
