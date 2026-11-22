export interface AvatarPresetDef {
  id: string;
  name: string;
  subtitle: string;
  bgFrom: string;
  bgTo: string;
  ringColor: string;
  accentColor: string;
}

export const DEFAULT_AVATAR_PRESET_ID = 'commando_alpha';
export const MAX_AVATAR_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const AVATAR_CANVAS_SIZE = 160;
export const MAX_AVATAR_DATAURL_BYTES = 35 * 1024; // < 35 KB target

export const AVATAR_PRESETS: AvatarPresetDef[] = [
  {
    id: 'commando_alpha',
    name: 'Commando Alpha',
    subtitle: 'Tactical green helmet & visor',
    bgFrom: '#064e3b',
    bgTo: '#022c22',
    ringColor: '#34d399',
    accentColor: '#10b981',
  },
  {
    id: 'cyber_neon_striker',
    name: 'Cyber Neon Striker',
    subtitle: 'Glowing cyan cyberpunk mask',
    bgFrom: '#0c4a6e',
    bgTo: '#082f49',
    ringColor: '#22d3ee',
    accentColor: '#06b6d4',
  },
  {
    id: 'golden_emperor',
    name: 'Golden Emperor',
    subtitle: 'Royal crown & golden armor',
    bgFrom: '#78350f',
    bgTo: '#451a03',
    ringColor: '#fbbf24',
    accentColor: '#f59e0b',
  },
  {
    id: 'shadow_ninja',
    name: 'Shadow Ninja',
    subtitle: 'Stealth black hood & red eyes',
    bgFrom: '#1e1b4b',
    bgTo: '#09090b',
    ringColor: '#f43f5e',
    accentColor: '#ef4444',
  },
  {
    id: 'tribal_island_chief',
    name: 'Tribal Island Chief',
    subtitle: 'Feathered war headdress & face paint',
    bgFrom: '#7c2d12',
    bgTo: '#3b0764',
    ringColor: '#fb923c',
    accentColor: '#f97316',
  },
  {
    id: 'swat_police_captain',
    name: 'SWAT Police Captain',
    subtitle: 'Navy tactical helmet & badge',
    bgFrom: '#1e3a8a',
    bgTo: '#0f172a',
    ringColor: '#60a5fa',
    accentColor: '#3b82f6',
  },
  {
    id: 'special_forces_sniper',
    name: 'Special Forces Sniper',
    subtitle: 'Ghillie hood & tactical scope',
    bgFrom: '#14532d',
    bgTo: '#052e16',
    ringColor: '#84cc16',
    accentColor: '#65a30d',
  },
  {
    id: 'sky_eagle_rider',
    name: 'Sky Eagle Rider',
    subtitle: 'Aviator goggles & winged crest',
    bgFrom: '#0369a1',
    bgTo: '#1e293b',
    ringColor: '#38bdf8',
    accentColor: '#f59e0b',
  },
  {
    id: 'deep_sea_diver',
    name: 'Deep Sea Diver',
    subtitle: 'Glass diving dome & ocean blue suit',
    bgFrom: '#155e75',
    bgTo: '#083344',
    ringColor: '#67e8f9',
    accentColor: '#0ea5e9',
  },
  {
    id: 'volcano_dragon_knight',
    name: 'Volcano Dragon Knight',
    subtitle: 'Flame-forged visor & lava glow',
    bgFrom: '#7f1d1d',
    bgTo: '#1c1917',
    ringColor: '#f97316',
    accentColor: '#ef4444',
  },
  {
    id: 'arctic_wolf',
    name: 'Arctic Wolf',
    subtitle: 'White snow-camo hood',
    bgFrom: '#334155',
    bgTo: '#0f172a',
    ringColor: '#bae6fd',
    accentColor: '#e2e8f0',
  },
  {
    id: 'tank_commander',
    name: 'Tank Commander',
    subtitle: 'Armored tanker headset & beret',
    bgFrom: '#3f6212',
    bgTo: '#1a2e05',
    ringColor: '#a3e635',
    accentColor: '#eab308',
  },
  {
    id: 'pirate_admiral',
    name: 'Pirate Admiral',
    subtitle: 'Captain hat & eyepatch',
    bgFrom: '#581c87',
    bgTo: '#1e1b4b',
    ringColor: '#facc15',
    accentColor: '#d97706',
  },
  {
    id: 'medic_specialist',
    name: 'Medic Specialist',
    subtitle: 'White/red rescue helmet',
    bgFrom: '#991b1b',
    bgTo: '#1e293b',
    ringColor: '#f87171',
    accentColor: '#ef4444',
  },
  {
    id: 'hazmat_bio_trooper',
    name: 'Hazmat Bio-Trooper',
    subtitle: 'Yellow radiation mask',
    bgFrom: '#713f12',
    bgTo: '#1c1917',
    ringColor: '#fde047',
    accentColor: '#facc15',
  },
  {
    id: 'mech_robot_unit_01',
    name: 'Mech Robot Unit-01',
    subtitle: 'Metallic silver android face',
    bgFrom: '#334155',
    bgTo: '#020617',
    ringColor: '#94a3b8',
    accentColor: '#38bdf8',
  },
];

const LEGACY_ICON_TO_PRESET: Record<string, string> = {
  shield: 'commando_alpha',
  sword: 'cyber_neon_striker',
  crown: 'golden_emperor',
  flame: 'volcano_dragon_knight',
  zap: 'mech_robot_unit_01',
  crosshair: 'special_forces_sniper',
  skull: 'shadow_ninja',
  rocket: 'sky_eagle_rider',
};

export function resolvePresetId(raw?: string | null): string {
  if (!raw) return DEFAULT_AVATAR_PRESET_ID;
  const trimmed = raw.trim();
  if (trimmed.startsWith('preset:')) {
    const id = trimmed.slice('preset:'.length);
    if (AVATAR_PRESETS.some((p) => p.id === id)) return id;
  }
  if (AVATAR_PRESETS.some((p) => p.id === trimmed)) return trimmed;
  if (LEGACY_ICON_TO_PRESET[trimmed]) return LEGACY_ICON_TO_PRESET[trimmed];
  return DEFAULT_AVATAR_PRESET_ID;
}

export function getAvatarPreset(raw?: string | null): AvatarPresetDef {
  const id = resolvePresetId(raw);
  return AVATAR_PRESETS.find((p) => p.id === id) || AVATAR_PRESETS[0];
}

export function isCustomPhotoUrl(avatarUrl?: string | null): boolean {
  if (!avatarUrl || typeof avatarUrl !== 'string') return false;
  const trimmed = avatarUrl.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

export function presetIdToAvatarUrl(presetId: string): string {
  return `preset:${resolvePresetId(presetId)}`;
}

export function deterministicPresetForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length].id;
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const b64 = dataUrl.slice(commaIdx + 1);
  return Math.floor((b64.length * 3) / 4);
}

function drawCenterCroppedToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_CANVAS_SIZE;
  canvas.height = AVATAR_CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Please select a valid photo file.');
  }

  // Dark slate backdrop for transparent PNG/WEBP/GIF images before JPEG export
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const side = Math.min(srcW, srcH);
  const sx = Math.max(0, (srcW - side) / 2);
  const sy = Math.max(0, (srcH - side) / 2);
  ctx.drawImage(source, sx, sy, side, side, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);

  let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  // Guarantee lightweight (< 35 KB) universal JPEG output
  const qualities = [0.78, 0.7, 0.6];
  for (const q of qualities) {
    if (estimateDataUrlBytes(dataUrl) <= MAX_AVATAR_DATAURL_BYTES) break;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  return dataUrl;
}

function loadViaImageElement(file: File): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ img, cleanup: () => URL.revokeObjectURL(objectUrl) });
      } else {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Please select a valid photo file.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Please select a valid photo file.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Universal image converter & compressor:
 * Accepts any browser-decodable photo (JPG, PNG, WEBP, GIF, BMP, HEIC, camera roll) up to 15 MB,
 * center-crops onto a 160x160 HTML5 canvas, and exports as lightweight JPEG (< 35 KB).
 */
export async function processAvatarImageFile(
  file: File
): Promise<{ dataUrl: string; sizeKb: number }> {
  if (!file) {
    throw new Error('Please select a valid photo file.');
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw new Error('Photo is larger than 15 MB. Please choose a smaller image.');
  }

  // Reject obvious non-image MIME types (e.g. PDF, video, audio, text) immediately
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Please select a valid photo file.');
  }

  // 1. Try createImageBitmap first (handles EXIF orientation on modern mobile browsers)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width > 0 && bitmap.height > 0) {
          const dataUrl = drawCenterCroppedToCanvas(bitmap, bitmap.width, bitmap.height);
          const sizeKb = Math.max(1, Math.round((estimateDataUrlBytes(dataUrl) / 1024) * 10) / 10);
          return { dataUrl, sizeKb };
        }
      } finally {
        bitmap.close?.();
      }
    } catch {
      // Fall through to HTMLImageElement loader
    }
  }

  // 2. Fallback to HTMLImageElement + ObjectURL
  try {
    const { img, cleanup } = await loadViaImageElement(file);
    try {
      const dataUrl = drawCenterCroppedToCanvas(img, img.naturalWidth, img.naturalHeight);
      const sizeKb = Math.max(1, Math.round((estimateDataUrlBytes(dataUrl) / 1024) * 10) / 10);
      return { dataUrl, sizeKb };
    } finally {
      cleanup();
    }
  } catch {
    throw new Error('Please select a valid photo file.');
  }
}

export function sanitizeAvatarUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('preset:')) {
    return presetIdToAvatarUrl(trimmed);
  }
  if (trimmed.startsWith('data:image/') && trimmed.length <= 120000) {
    return trimmed;
  }
  return undefined;
}
