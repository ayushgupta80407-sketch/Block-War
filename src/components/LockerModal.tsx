import React, { useState } from 'react';
import { Download, Palette, Sparkles, User, Wand2, X } from 'lucide-react';
import { SKIN_CATALOG } from '../game/catalog';
import { COLOR_SWATCHES } from '../game/progression';
import { CharacterCustomization, HeadgearType, PlayerProgress } from '../game/types';
import { ShopPreview3D } from './ShopPreview3D';

interface LockerModalProps {
  open: boolean;
  progress: PlayerProgress;
  onClose: () => void;
  onUpdateCustomization: (custom: CharacterCustomization) => void;
  onSavePoster: (url: string) => void;
}

const HEADGEAR_OPTIONS: Array<{ id: HeadgearType; label: string }> = [
  { id: 'visor_cap', label: 'Visor Cap' },
  { id: 'crown', label: 'Gold Crown' },
  { id: 'horns', label: 'Horns' },
  { id: 'antenna', label: 'Antenna' },
  { id: 'halo', label: 'Halo Ring' },
  { id: 'headband', label: 'Headband' },
  { id: 'none', label: 'None' },
];

export const LockerModal: React.FC<LockerModalProps> = ({
  open,
  progress,
  onClose,
  onUpdateCustomization,
  onSavePoster,
}) => {
  const [posterPrompt, setPosterPrompt] = useState(
    'Block-style voxel island warrior riding a turbo sports car past ocean waves and palm trees, dynamic comic poster'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string>(progress.customPosterUrl || '');

  if (!open) return null;

  const custom = progress.customization;

  const handleGeneratePoster = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: posterPrompt,
          imageSize,
          aspectRatio: '16:9',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate artwork');
      }
      setGeneratedUrl(data.imageUrl);
      onSavePoster(data.imageUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate artwork right now.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">BLOCK WAR LOCKER & POSTER STUDIO</h2>
              <p className="text-xs text-slate-400">
                Customize your block colors, headgear & create custom BLOCK WAR posters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          {/* Left: Character Look Customization */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-300">
              <User className="h-4 w-4" /> Block Character Appearance
            </div>

            <ShopPreview3D category="skins" itemId={custom.characterId} heightClass="h-40" />

            <div>
              <div className="mb-1.5 text-xs font-bold text-slate-300">Owned Skins</div>
              <div className="flex flex-wrap gap-1.5">
                {SKIN_CATALOG.filter(
                  (s) => Boolean(progress.isVipAllUnlocked) || progress.unlockedCharacters.includes(s.id)
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      onUpdateCustomization({
                        characterId: s.id,
                        primaryColor: s.primaryColor,
                        secondaryColor: s.secondaryColor,
                        visorColor: s.visorColor,
                        headgear: s.defaultHeadgear,
                      })
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      custom.characterId === s.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold text-slate-300">Primary Color</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((sw) => (
                  <button
                    key={`p_${sw.hex}`}
                    type="button"
                    onClick={() => onUpdateCustomization({ ...custom, primaryColor: sw.hex })}
                    className={`h-7 w-7 rounded-lg border-2 ${
                      custom.primaryColor === sw.hex ? 'border-white scale-110' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                    title={sw.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold text-slate-300">Accent / Trim Color</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((sw) => (
                  <button
                    key={`s_${sw.hex}`}
                    type="button"
                    onClick={() => onUpdateCustomization({ ...custom, secondaryColor: sw.hex })}
                    className={`h-7 w-7 rounded-lg border-2 ${
                      custom.secondaryColor === sw.hex ? 'border-white scale-110' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                    title={sw.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold text-slate-300">Headgear</div>
              <div className="flex flex-wrap gap-1.5">
                {HEADGEAR_OPTIONS.map((hg) => (
                  <button
                    key={hg.id}
                    type="button"
                    onClick={() => onUpdateCustomization({ ...custom, headgear: hg.id })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      custom.headgear === hg.id
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {hg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Arena Poster Generator (Updated to valid gemini-nano-banana-2.1 model) */}
          <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-4 w-4" /> BLOCK WAR Poster Studio
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  gemini-nano-banana-2.1
                </span>
              </div>

              <textarea
                value={posterPrompt}
                onChange={(e) => setPosterPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                placeholder="Describe your BLOCK WAR poster..."
              />

              <div className="flex items-center gap-2">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setImageSize(sz)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-black ${
                      imageSize === sz
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={generating}
                onClick={handleGeneratePoster}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-xs font-black uppercase text-slate-950 hover:brightness-110 disabled:opacity-60"
              >
                <Wand2 className="h-4 w-4" />
                {generating ? `Generating (${imageSize})...` : `Generate ${imageSize} Artwork`}
              </button>

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-2.5 text-xs text-rose-200">
                  {errorMsg}
                </div>
              )}
            </div>

            {generatedUrl ? (
              <div className="space-y-2">
                <img
                  src={generatedUrl}
                  alt="Generated Island Poster"
                  className="h-40 w-full rounded-xl border border-white/15 object-cover"
                />
                <a
                  href={generatedUrl}
                  download={`blockwar_poster_${imageSize}.png`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/25"
                >
                  <Download className="h-4 w-4" /> Download Poster PNG
                </a>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-500">
                Your generated island artwork appears here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
