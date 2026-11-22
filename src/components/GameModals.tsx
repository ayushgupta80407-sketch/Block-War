import React from 'react';
import {
  Award,
  Car,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Heart,
  HelpCircle,
  Pause,
  RotateCcw,
  Settings,
  Smartphone,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import { deterministicPresetForName } from '../game/avatars';
import { COIN_REWARDS } from '../game/catalog';
import {
  DailyChallenge,
  GameSettings,
  LeaderboardEntry,
  MatchSummary,
  PlayerProgress,
} from '../game/types';
import { AdBanner } from './AdBanner';
import { PlayerAvatar } from './ProfilePhotoModal';

/* ---------- Settings Modal ---------- */
export const SettingsModal: React.FC<{
  open: boolean;
  settings: GameSettings;
  onClose: () => void;
  onChange: (next: GameSettings) => void;
}> = ({ open, settings, onClose, onChange }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Settings className="h-5 w-5 text-cyan-400" /> SETTINGS
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <span className="flex items-center gap-2 font-bold text-slate-200">
              {settings.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
              Mute All Audio
            </span>
            <input
              type="checkbox"
              checked={settings.muted}
              onChange={(e) => onChange({ ...settings, muted: e.target.checked })}
              className="h-4 w-4 accent-cyan-400"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between font-bold text-slate-300">
              <span>Music Volume</span>
              <span>{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(e) => onChange({ ...settings, musicVolume: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between font-bold text-slate-300">
              <span>SFX & Engine Volume</span>
              <span>{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) => onChange({ ...settings, sfxVolume: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between font-bold text-slate-300">
              <span>Mouse Aim Sensitivity</span>
              <span>{settings.cameraSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) => onChange({ ...settings, cameraSensitivity: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5">
            <span className="font-bold text-slate-200">Invert Mouse Y-Axis</span>
            <input
              type="checkbox"
              checked={settings.invertY}
              onChange={(e) => onChange({ ...settings, invertY: e.target.checked })}
              className="h-4 w-4 accent-cyan-400"
            />
          </div>

          <div>
            <div className="mb-1.5 font-bold text-slate-300">Graphics Quality</div>
            <div className="grid grid-cols-2 gap-2">
              {(['high', 'medium'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChange({ ...settings, graphicsQuality: q })}
                  className={`rounded-xl py-2 font-black uppercase ${
                    settings.graphicsQuality === q
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-bold text-slate-300">Mobile Touch Controls</div>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'always', 'off'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange({ ...settings, showTouchControls: mode })}
                  className={`rounded-xl py-2 font-black uppercase ${
                    settings.showTouchControls === mode
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Instructions Modal ---------- */
export const InstructionsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <HelpCircle className="h-5 w-5 text-cyan-400" /> HOW TO PLAY BLOCK WAR
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5">
            <div className="font-black text-cyan-300 flex items-center gap-1.5">
              <Gamepad2 className="h-4 w-4" /> DESKTOP CONTROLS
            </div>
            <p><b className="text-white">WASD / Arrows:</b> Move or Steer Vehicles, Ships, Horses & Sea Mounts</p>
            <p><b className="text-white">Click Canvas + Mouse:</b> Auto Pointer-Lock Smooth Aim</p>
            <p><b className="text-white">Left Click / J:</b> Shoot Gun or Slash Knife</p>
            <p><b className="text-white">F:</b> Board Ships or Ride Cars, Bikes, Horses, Sharks & Whales</p>
            <p><b className="text-white">C / Ctrl & Space:</b> Crouch / <b>Dive Underwater & Surface</b></p>
            <p><b className="text-white">1 / 2 / 3 or Q:</b> Switch Gun, Knife & Grenades</p>
            <p><b className="text-white">G / R / E / V:</b> Grenade · Reload · Door / Bench · Camera</p>
            <p><b className="text-white">Space / Shift / F11:</b> Jump · Dash / Turbo · Fullscreen</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5">
            <div className="font-black text-emerald-300 flex items-center gap-1.5">
              <Car className="h-4 w-4" /> TITANIC, SEA CAVES, SHIPS & WILDLIFE
            </div>
            <p>Board <b>The Grand Titanic</b>, Naval Battleships, Pirate & Fishing Boats, or tame rideable <b>Great Sharks, Blue Whales & Sailfish</b>!</p>
            <p>Dive underwater with your automatic <b>Infinite-O₂ Diving Helmet</b> to discover Coral Reefs, Mermaids & <b>4 Sea Caves (+10 Coin Pearls)</b>, plus Beach Shells & Starfish (+5 Coins).</p>
            <p className="flex items-center gap-1 text-sky-300">
              <Waves className="h-3.5 w-3.5 shrink-0" /> Cross the bridge to the <b>Tribal & Volcanic Island</b>: warm by campfires (+5 HP/s), loot Volcano Crates & hunt 10 wild animals (+15–75 Coins + Roast Meat)!
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5">
            <div className="font-black text-rose-300 flex items-center gap-1.5">
              <Heart className="h-4 w-4" /> 50-PLAYER BATTLE ROYALE & SURVIVAL
            </div>
            <p><b>Battle Royale:</b> 50 fighters drop from the Airplane (<b>Space / F</b>), open Parachute (<b>Space</b>), loot Medkits, Armor & Airdrops, and stay inside the shrinking Safe Zone!</p>
            <p><b>Squad BR:</b> Crawling knocked allies can be revived by holding <b>E</b> (or mobile <b>REVIVE</b>) for 3 seconds.</p>
            <p><b>Arena Modes:</b> 3 Survival Hearts per match — upgrade your Level in the Lobby for higher HP, Speed & Fighters!</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5">
            <div className="font-black text-amber-300 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" /> MOBILE TOUCH CONTROLS
            </div>
            <p><b>Left Thumb:</b> Compact 84px floating joystick to run or steer vehicles/horses.</p>
            <p><b>Right Screen Drag:</b> Smoothly rotate camera & aim crosshair.</p>
            <p><b>Right Cluster:</b> Ergonomic Fire, Jump/Chute, Crouch, Reload, Grenade, Weapon Switch, Camera & Mount.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Leaderboard Modal ---------- */
export const LeaderboardModal: React.FC<{
  open: boolean;
  entries: LeaderboardEntry[];
  onClose: () => void;
}> = ({ open, entries, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Trophy className="h-5 w-5 text-amber-400" /> BLOCK WAR LEADERBOARD
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400">
              Complete a match to claim your spot on the leaderboard!
            </div>
          ) : (
            entries.map((e, idx) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 font-mono font-black text-amber-300">#{idx + 1}</span>
                  <PlayerAvatar
                    avatarUrl={e.avatarUrl}
                    avatarIcon={e.avatarIcon || deterministicPresetForName(e.playerName)}
                    alt={e.playerName}
                    size="sm"
                    shape="circle"
                  />
                  <div>
                    <div className="font-black text-white">
                      {e.playerName}
                      {e.playerTag ? `#${e.playerTag}` : ''}
                    </div>
                    <div className="text-[11px] uppercase text-slate-400">
                      {e.mode} · {e.arena}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-black text-cyan-300">{e.score} PTS</div>
                  <div className="text-[11px] text-emerald-400">{e.kos} KOs</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Daily Challenges Modal ---------- */
export const DailyChallengesModal: React.FC<{
  open: boolean;
  progress: PlayerProgress;
  onClaim: (challenge: DailyChallenge) => void;
  onClose: () => void;
}> = ({ open, progress, onClaim, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Award className="h-5 w-5 text-emerald-400" /> DAILY ISLAND CHALLENGES
          </h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {progress.dailyChallenges.map((ch) => {
            const done = ch.progress >= ch.target;
            return (
              <div key={ch.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-white">{ch.title}</div>
                    <div className="text-xs text-slate-400">{ch.description}</div>
                  </div>
                  <span className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-300">
                    <Coins className="h-3.5 w-3.5" /> +{COIN_REWARDS.DAILY_CHALLENGE}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {ch.progress}/{ch.target}
                  </span>
                  {ch.claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Claimed
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!done}
                      onClick={() => onClaim(ch)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                        done
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------- Pause Modal ---------- */
export const PauseModal: React.FC<{
  open: boolean;
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}> = ({ open, onResume, onOpenSettings, onRestart, onQuitToMenu }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-slate-900 p-6 text-center shadow-2xl space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300">
          <Pause className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-white">MATCH PAUSED</h2>
        <p className="text-xs text-slate-400">Click Resume to lock cursor back onto the island.</p>

        <button
          type="button"
          onClick={onResume}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 py-3 text-sm font-black uppercase text-white hover:brightness-110"
        >
          Resume Match
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-black uppercase text-slate-200 hover:bg-slate-700"
        >
          Settings & Sensitivity
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-black uppercase text-amber-300 hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" /> Restart Match
        </button>
        <button
          type="button"
          onClick={onQuitToMenu}
          className="w-full rounded-xl border border-rose-500/40 bg-rose-500/15 py-2.5 text-xs font-black uppercase text-rose-300 hover:bg-rose-500/25"
        >
          Return to BLOCK WAR Lobby
        </button>
      </div>
    </div>
  );
};

/* ---------- Match Summary Modal ---------- */
export const MatchSummaryModal: React.FC<{
  summary: MatchSummary | null;
  onPlayAgain: () => void;
  onReturnMenu: () => void;
}> = ({ summary, onPlayAgain, onReturnMenu }) => {
  if (!summary) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="text-center">
          <div
            className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl ${
              summary.capturedByTribe
                ? 'bg-orange-500/20 text-orange-400'
                : summary.victory
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {summary.capturedByTribe ? <Flame className="h-8 w-8" /> : <Crown className="h-8 w-8" />}
          </div>
          <h2 className="text-2xl font-black text-white">
            {summary.capturedByTribe
              ? 'CAPTURED BY THE ISLAND TRIBE!'
              : summary.mode === 'battle_royale' && summary.victory
                ? 'VICTORY ROYALE!'
                : summary.victory
                  ? 'BLOCK WAR VICTORY!'
                  : 'BLOCK WAR MATCH COMPLETE'}
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Placement #{summary.placement} · {summary.kos} Eliminations · {summary.score} PTS
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 space-y-1.5 text-xs">
          <div className="flex justify-between font-black text-amber-300 text-sm">
            <span>TOTAL COINS EARNED</span>
            <span>+{summary.coinsEarned.toLocaleString()} Coins</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Eliminations ({summary.kos} × 50)</span>
            <span>+{summary.coinBreakdown.eliminations}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Match Completion</span>
            <span>+{summary.coinBreakdown.completionBonus}</span>
          </div>
          {summary.coinBreakdown.victoryBonus > 0 && (
            <div className="flex justify-between text-emerald-300">
              <span>Victory Bonus</span>
              <span>+{summary.coinBreakdown.victoryBonus}</span>
            </div>
          )}
          {summary.coinBreakdown.teamBonus > 0 && (
            <div className="flex justify-between text-sky-300">
              <span>Team Victory Bonus</span>
              <span>+{summary.coinBreakdown.teamBonus}</span>
            </div>
          )}
          {(summary.coinBreakdown.battleRoyaleBonus ?? 0) > 0 && (
            <div className="flex justify-between font-black text-amber-300">
              <span>Battle Royale Last Survivor Bonus</span>
              <span>+{summary.coinBreakdown.battleRoyaleBonus}</span>
            </div>
          )}
          {(summary.coinBreakdown.shoreTreasures ?? 0) > 0 && (
            <div className="flex justify-between font-black text-yellow-300">
              <span>Island Treasures &amp; Hunts (Shells, Pearls &amp; Wildlife)</span>
              <span>+{summary.coinBreakdown.shoreTreasures}</span>
            </div>
          )}
          {((summary.animalsHunted ?? 0) > 0 || (summary.shipsBoarded ?? 0) > 0) && (
            <div className="flex justify-between text-emerald-300 font-bold">
              <span>Expedition Log</span>
              <span>
                {summary.animalsHunted ?? 0} Wildlife · {summary.shipsBoarded ?? 0} Ships
              </span>
            </div>
          )}
          <div className="pt-1 border-t border-white/10 flex justify-between font-bold text-cyan-300">
            <span>Experience Gained</span>
            <span>
              +{summary.xpEarned} XP {summary.leveledUp ? `· LEVEL UP → LV.${summary.newLevel}!` : ''}
            </span>
          </div>
        </div>

        <AdBanner compact />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 py-3 text-xs font-black uppercase text-white hover:brightness-110"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onReturnMenu}
            className="rounded-xl bg-slate-800 py-3 text-xs font-black uppercase text-slate-200 hover:bg-slate-700"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
