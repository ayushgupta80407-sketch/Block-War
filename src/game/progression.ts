import {
  AIRPLANE_CATALOG,
  ARENA_CATALOG,
  COIN_REWARDS,
  EMOTE_CATALOG,
  GRENADE_CATALOG,
  GUN_CATALOG,
  KNIFE_CATALOG,
  PARACHUTE_CATALOG,
  SKIN_CATALOG,
} from './catalog';
import {
  AchievementDef,
  AirplaneId,
  ArenaId,
  DailyChallenge,
  EmoteId,
  GameSettings,
  GrenadeId,
  GunId,
  KnifeId,
  LeaderboardEntry,
  MatchSummary,
  ParachuteId,
  PlayerProgress,
  ShopCategory,
} from './types';

export const CHARACTER_PRESETS = SKIN_CATALOG;
export const ARENA_DEFINITIONS = ARENA_CATALOG;

export const COLOR_SWATCHES = [
  { name: 'Cobalt', hex: '#2563eb' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Crimson', hex: '#dc2626' },
  { name: 'Emerald', hex: '#16a34a' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Coral', hex: '#f43f5e' },
  { name: 'Obsidian', hex: '#18181b' },
  { name: 'Snow', hex: '#e2e8f0' },
  { name: 'Gold', hex: '#eab308' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    title: 'First Elimination',
    description: 'Score your first KO in any island match.',
    rewardCoins: 50,
  },
  {
    id: 'victor',
    title: 'Island Victor',
    description: 'Win a Single Player, Team, Multiplayer, or Tournament match.',
    rewardCoins: 100,
  },
  {
    id: 'coin_hoarder',
    title: 'Gold Collector',
    description: 'Collect 50 arena pickup coins across matches.',
    rewardCoins: 80,
  },
  {
    id: 'survivor_5',
    title: 'Wave Breaker',
    description: 'Reach Wave 5 in Survival Mode.',
    rewardCoins: 150,
  },
  {
    id: 'champion',
    title: 'Block Champion',
    description: 'Win a full 3-round Tournament bracket.',
    rewardCoins: 250,
  },
  {
    id: 'brawler_25',
    title: 'Heavy Hitter',
    description: 'Score 25 total eliminations across all modes.',
    rewardCoins: 180,
  },
];

const STORAGE_PROGRESS_KEY = 'block_head_account_v2';
const STORAGE_SETTINGS_KEY = 'block_head_settings_v1';
const STORAGE_LEADERBOARD_KEY = 'block_head_leaderboard_v1';
const STORAGE_USER_PREFIX = 'blockwar_user_';
const STORAGE_ACTIVE_SESSION_KEY = 'blockwar_active_session_v1';
const STORAGE_USER_INDEX_KEY = 'blockwar_user_index_v1';

export interface SavedAccountSummary {
  username: string;
  avatarIcon: string;
  avatarUrl?: string;
  level: number;
  coins: number;
  battleRoyaleWins: number;
}

interface StoredUserRecord {
  username: string;
  passwordHash: string;
  avatarIcon: string;
  avatarUrl?: string;
  progress: PlayerProgress;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 18);
}

export function hashPasswordLocal(password: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < password.length; i++) {
    const ch = password.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}`;
}

export function xpForLevel(level: number): number {
  return Math.floor(120 * Math.pow(level, 1.35));
}

export function levelUpgradeCost(level: number): number {
  return 250 + Math.max(0, level - 1) * 180;
}

export function getLevelBonusStats(level: number): {
  maxHp: number;
  speedMult: number;
  maxMatchFighters: number;
} {
  const safeLv = Math.max(1, Math.min(25, Math.floor(level || 1)));
  const maxHp = 100 + Math.min(80, (safeLv - 1) * 8);
  const speedMult = Math.min(1.32, 1 + (safeLv - 1) * 0.025);
  const maxMatchFighters = Math.min(16, 10 + Math.min(3, safeLv - 1) * 2);
  return { maxHp, speedMult, maxMatchFighters };
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function generateDailyChallenges(dateKey: string): DailyChallenge[] {
  return [
    {
      id: `dc_kos_${dateKey}`,
      title: 'Island Striker',
      description: 'Score 5 Eliminations in any match.',
      type: 'kos',
      target: 5,
      progress: 0,
      rewardCoins: COIN_REWARDS.DAILY_CHALLENGE,
      rewardXp: 100,
      claimed: false,
    },
    {
      id: `dc_coins_${dateKey}`,
      title: 'Treasure Dash',
      description: 'Collect 10 Arena Pickups inside matches.',
      type: 'coins',
      target: 10,
      progress: 0,
      rewardCoins: COIN_REWARDS.DAILY_CHALLENGE,
      rewardXp: 80,
      claimed: false,
    },
    {
      id: `dc_win_${dateKey}`,
      title: 'Crown Claimer',
      description: 'Win 1 Match or reach Survival Wave 4.',
      type: 'wins',
      target: 1,
      progress: 0,
      rewardCoins: COIN_REWARDS.DAILY_CHALLENGE,
      rewardXp: 160,
      claimed: false,
    },
  ];
}

function makeClientId(): string {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultTag(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function sanitizePlayerTag(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  return cleaned || makeDefaultTag();
}

export function getDefaultProgress(overrides?: {
  username?: string;
  displayName?: string;
  avatarIcon?: string;
  avatarUrl?: string;
  isGuest?: boolean;
}): PlayerProgress {
  const today = getTodayKey();
  const cleanUser = overrides?.username ? normalizeUsername(overrides.username) : undefined;
  const resolvedIcon = overrides?.avatarIcon || 'commando_alpha';
  return {
    accountId: cleanUser ? `user_${cleanUser}` : makeClientId(),
    sessionToken: makeClientId(),
    username: cleanUser,
    avatarIcon: resolvedIcon,
    avatarUrl: overrides?.avatarUrl || `preset:${resolvedIcon}`,
    isGuest: overrides?.isGuest ?? !cleanUser,
    playerName: (overrides?.displayName || cleanUser || 'BlockPlayer').slice(0, 14),
    playerTag: makeDefaultTag(),
    coins: 500,
    xp: 0,
    level: 1,
    unlockedArenas: ['practice'],
    unlockedGuns: ['basic_pistol'],
    unlockedKnives: ['basic_knife'],
    unlockedGrenades: ['frag_grenade'],
    unlockedCharacters: ['cubix', 'volt'],
    unlockedAirplanes: ['cargo_carrier'],
    unlockedParachutes: ['classic_white'],
    unlockedEmotes: ['hello_wave'],
    equippedEmotes: ['hello_wave'],
    unlockedAchievements: [],
    equipped: {
      arenaId: 'practice',
      gunId: 'basic_pistol',
      knifeId: 'basic_knife',
      grenadeId: 'frag_grenade',
      characterId: 'cubix',
      airplaneId: 'cargo_carrier',
      parachuteId: 'classic_white',
    },
    customization: {
      characterId: 'cubix',
      primaryColor: '#2563eb',
      secondaryColor: '#f59e0b',
      visorColor: '#38bdf8',
      headgear: 'visor_cap',
    },
    totalWins: 0,
    battleRoyaleWins: 0,
    totalMatches: 0,
    totalKOs: 0,
    totalCoinsCollected: 0,
    bestSurvivalWave: 0,
    tournamentWins: 0,
    animalsHunted: 0,
    shipsBoarded: 0,
    dailyDate: today,
    dailyChallenges: generateDailyChallenges(today),
    policyAccepted: false,
    policyAcceptedVersion: '',
    policyAcceptedAt: '',
  };
}

export function normalizeLoadedProgress(parsed: Partial<PlayerProgress>): PlayerProgress {
  const def = getDefaultProgress({
    username: parsed.username,
    displayName: parsed.playerName,
    avatarIcon: parsed.avatarIcon,
    avatarUrl: parsed.avatarUrl,
    isGuest: parsed.isGuest,
  });
  const today = getTodayKey();
  const dailyChallenges =
    parsed.dailyDate === today && Array.isArray(parsed.dailyChallenges)
      ? parsed.dailyChallenges
      : generateDailyChallenges(today);

  const unlockedGrenades = Array.isArray(parsed.unlockedGrenades)
    ? Array.from(new Set([...parsed.unlockedGrenades, 'frag_grenade' as GrenadeId]))
    : ['frag_grenade' as GrenadeId];

  const unlockedAirplanes = Array.isArray(parsed.unlockedAirplanes)
    ? Array.from(new Set([...parsed.unlockedAirplanes, 'cargo_carrier' as AirplaneId]))
    : ['cargo_carrier' as AirplaneId];

  const unlockedParachutes = Array.isArray(parsed.unlockedParachutes)
    ? Array.from(new Set([...parsed.unlockedParachutes, 'classic_white' as ParachuteId]))
    : ['classic_white' as ParachuteId];

  const unlockedEmotes = Array.isArray(parsed.unlockedEmotes)
    ? Array.from(new Set([...parsed.unlockedEmotes, 'hello_wave' as EmoteId]))
    : ['hello_wave' as EmoteId];

  const equippedEmotesRaw = Array.isArray(parsed.equippedEmotes)
    ? parsed.equippedEmotes.filter((e) => unlockedEmotes.includes(e)).slice(0, 6)
    : ['hello_wave' as EmoteId];
  const equippedEmotes = equippedEmotesRaw.length > 0 ? equippedEmotesRaw : ['hello_wave' as EmoteId];

  const isVipAllUnlocked = Boolean(parsed.isVipAllUnlocked);

  const normalizedArenas = isVipAllUnlocked
    ? ARENA_CATALOG.map((a) => a.id)
    : Array.isArray(parsed.unlockedArenas) && parsed.unlockedArenas.length > 0
      ? parsed.unlockedArenas
      : (['practice'] as ArenaId[]);

  const normalizedGuns = isVipAllUnlocked
    ? GUN_CATALOG.map((g) => g.id)
    : Array.isArray(parsed.unlockedGuns) && parsed.unlockedGuns.length > 0
      ? parsed.unlockedGuns
      : (['basic_pistol'] as GunId[]);

  const normalizedKnives = isVipAllUnlocked
    ? KNIFE_CATALOG.map((k) => k.id)
    : Array.isArray(parsed.unlockedKnives) && parsed.unlockedKnives.length > 0
      ? parsed.unlockedKnives
      : (['basic_knife'] as KnifeId[]);

  const normalizedGrenades = isVipAllUnlocked
    ? GRENADE_CATALOG.map((g) => g.id)
    : unlockedGrenades;

  const normalizedAirplanes = isVipAllUnlocked
    ? AIRPLANE_CATALOG.map((a) => a.id)
    : unlockedAirplanes;

  const normalizedParachutes = isVipAllUnlocked
    ? PARACHUTE_CATALOG.map((p) => p.id)
    : unlockedParachutes;

  const normalizedEmotes = isVipAllUnlocked
    ? EMOTE_CATALOG.map((e) => e.id)
    : unlockedEmotes;

  const normalizedCharacters = isVipAllUnlocked
    ? SKIN_CATALOG.map((s) => s.id)
    : Array.isArray(parsed.unlockedCharacters) && parsed.unlockedCharacters.length > 0
      ? parsed.unlockedCharacters
      : ['cubix', 'volt'];

  return {
    ...def,
    ...parsed,
    accountId: parsed.accountId || def.accountId,
    sessionToken: parsed.sessionToken || def.sessionToken,
    username: parsed.username ? normalizeUsername(parsed.username) : def.username,
    avatarIcon: parsed.avatarIcon || def.avatarIcon,
    avatarUrl:
      typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim()
        ? parsed.avatarUrl.trim()
        : def.avatarUrl,
    isGuest: parsed.isGuest ?? !parsed.username,
    playerTag: parsed.playerTag ? sanitizePlayerTag(parsed.playerTag) : def.playerTag,
    battleRoyaleWins: Number(parsed.battleRoyaleWins || 0),
    animalsHunted: Number(parsed.animalsHunted || 0),
    shipsBoarded: Number(parsed.shipsBoarded || 0),
    unlockedArenas: normalizedArenas,
    unlockedGuns: normalizedGuns,
    unlockedKnives: normalizedKnives,
    unlockedGrenades: normalizedGrenades,
    unlockedAirplanes: normalizedAirplanes,
    unlockedParachutes: normalizedParachutes,
    unlockedEmotes: normalizedEmotes,
    equippedEmotes,
    unlockedCharacters: normalizedCharacters,
    equipped: {
      ...def.equipped,
      ...(parsed.equipped || {}),
      grenadeId: parsed.equipped?.grenadeId ?? 'frag_grenade',
      airplaneId: parsed.equipped?.airplaneId ?? 'cargo_carrier',
      parachuteId: parsed.equipped?.parachuteId ?? 'classic_white',
    },
    customization: {
      ...def.customization,
      ...(parsed.customization || {}),
    },
    dailyDate: today,
    dailyChallenges,
    banned: Boolean(parsed.banned),
    banReason: typeof parsed.banReason === 'string' ? parsed.banReason : '',
    chatMuted: Boolean(parsed.chatMuted),
    chatMutedAt: typeof parsed.chatMutedAt === 'string' ? parsed.chatMutedAt : '',
    chatMutedReason: typeof parsed.chatMutedReason === 'string' ? parsed.chatMutedReason : '',
    isVipAllUnlocked,
    role: parsed.role === 'admin' ? 'admin' : 'player',
    policyAccepted: Boolean(parsed.policyAccepted),
    policyAcceptedVersion:
      typeof parsed.policyAcceptedVersion === 'string' ? parsed.policyAcceptedVersion : '',
    policyAcceptedAt: typeof parsed.policyAcceptedAt === 'string' ? parsed.policyAcceptedAt : '',
  };
}

export function grantAllCatalogToProgress(current: PlayerProgress): PlayerProgress {
  return normalizeLoadedProgress({
    ...current,
    isVipAllUnlocked: true,
    unlockedArenas: ARENA_CATALOG.map((a) => a.id),
    unlockedGuns: GUN_CATALOG.map((g) => g.id),
    unlockedKnives: KNIFE_CATALOG.map((k) => k.id),
    unlockedGrenades: GRENADE_CATALOG.map((g) => g.id),
    unlockedCharacters: SKIN_CATALOG.map((s) => s.id),
    unlockedAirplanes: AIRPLANE_CATALOG.map((a) => a.id),
    unlockedParachutes: PARACHUTE_CATALOG.map((p) => p.id),
    unlockedEmotes: EMOTE_CATALOG.map((e) => e.id),
  });
}

export function loadProgress(): PlayerProgress {
  try {
    if (typeof localStorage === 'undefined') return getDefaultProgress({ isGuest: true });
    const session = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
    if (session && session !== '__guest__') {
      const userRaw = localStorage.getItem(`${STORAGE_USER_PREFIX}${session}`);
      if (userRaw) {
        const rec = JSON.parse(userRaw) as StoredUserRecord;
        if (rec?.progress) {
          return normalizeLoadedProgress({
            ...rec.progress,
            username: rec.username,
            avatarIcon: rec.progress.avatarIcon || rec.avatarIcon,
            avatarUrl: rec.progress.avatarUrl || rec.avatarUrl,
            isGuest: false,
          });
        }
      }
    }
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    if (!raw) return getDefaultProgress({ isGuest: true });
    return normalizeLoadedProgress({ ...(JSON.parse(raw) as Partial<PlayerProgress>), isGuest: true });
  } catch {
    return getDefaultProgress({ isGuest: true });
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (progress.avatarUrl) {
      localStorage.setItem('bw_user_avatar_url', progress.avatarUrl);
    }
    if (progress.username && !progress.isGuest) {
      const uname = normalizeUsername(progress.username);
      const key = `${STORAGE_USER_PREFIX}${uname}`;
      const existingRaw = localStorage.getItem(key);
      let passwordHash = '';
      if (existingRaw) {
        try {
          passwordHash = (JSON.parse(existingRaw) as StoredUserRecord).passwordHash || '';
        } catch {
          passwordHash = '';
        }
      }
      const rec: StoredUserRecord = {
        username: uname,
        passwordHash,
        avatarIcon: progress.avatarIcon || 'commando_alpha',
        avatarUrl: progress.avatarUrl,
        progress: { ...progress, username: uname, isGuest: false },
      };
      localStorage.setItem(key, JSON.stringify(rec));
      upsertUserIndex(rec.progress);
    } else {
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    }
  } catch {
    // Ignore storage quota issues
  }
}

function upsertUserIndex(progress: PlayerProgress): void {
  try {
    if (typeof localStorage === 'undefined' || !progress.username) return;
    const list = listSavedUserSummaries();
    const summary: SavedAccountSummary = {
      username: progress.username,
      avatarIcon: progress.avatarIcon || 'commando_alpha',
      avatarUrl: progress.avatarUrl,
      level: progress.level,
      coins: progress.coins,
      battleRoyaleWins: progress.battleRoyaleWins ?? 0,
    };
    const next = [summary, ...list.filter((item) => item.username !== progress.username)].slice(0, 12);
    localStorage.setItem(STORAGE_USER_INDEX_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
}

export function listSavedUserSummaries(): SavedAccountSummary[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_USER_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getActiveSessionKey(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionKey(sessionKey: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, sessionKey);
  } catch {
    // Ignore
  }
}

export function clearActiveSessionKey(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
  } catch {
    // Ignore
  }
}

export function loadGuestProgress(): PlayerProgress {
  try {
    if (typeof localStorage === 'undefined') return getDefaultProgress({ isGuest: true });
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    const prog = raw
      ? normalizeLoadedProgress({ ...(JSON.parse(raw) as Partial<PlayerProgress>), isGuest: true })
      : getDefaultProgress({ isGuest: true });
    setActiveSessionKey('__guest__');
    saveProgress(prog);
    return prog;
  } catch {
    return getDefaultProgress({ isGuest: true });
  }
}

export function registerLocalAccount(opts: {
  username: string;
  password: string;
  avatarIcon: string;
}): { ok: boolean; error?: string; account?: PlayerProgress } {
  const uname = normalizeUsername(opts.username);
  if (uname.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters (letters/numbers).' };
  }
  if (opts.password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }
  try {
    const key = `${STORAGE_USER_PREFIX}${uname}`;
    if (localStorage.getItem(key)) {
      return { ok: false, error: `Username "${uname}" already exists on this device. Please log in instead.` };
    }
    const displayName = opts.username.trim().slice(0, 14) || uname;
    const account = getDefaultProgress({
      username: uname,
      displayName,
      avatarIcon: opts.avatarIcon || 'commando_alpha',
      avatarUrl: `preset:${opts.avatarIcon || 'commando_alpha'}`,
      isGuest: false,
    });
    const rec: StoredUserRecord = {
      username: uname,
      passwordHash: hashPasswordLocal(opts.password),
      avatarIcon: account.avatarIcon || 'commando_alpha',
      avatarUrl: account.avatarUrl,
      progress: account,
    };
    localStorage.setItem(key, JSON.stringify(rec));
    setActiveSessionKey(uname);
    upsertUserIndex(account);
    return { ok: true, account };
  } catch {
    return { ok: false, error: 'Could not save account locally.' };
  }
}

export function loginLocalAccount(opts: {
  username: string;
  password: string;
}): { ok: boolean; error?: string; account?: PlayerProgress } {
  const uname = normalizeUsername(opts.username);
  if (!uname) return { ok: false, error: 'Enter your username.' };
  try {
    const key = `${STORAGE_USER_PREFIX}${uname}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { ok: false, error: `Account "${uname}" not found. Create an account or try Guest mode.` };
    }
    const rec = JSON.parse(raw) as StoredUserRecord;
    if (rec.passwordHash && rec.passwordHash !== hashPasswordLocal(opts.password)) {
      return { ok: false, error: 'Incorrect password.' };
    }
    const account = normalizeLoadedProgress({
      ...rec.progress,
      username: uname,
      avatarIcon: rec.progress.avatarIcon || rec.avatarIcon,
      avatarUrl: rec.progress.avatarUrl || rec.avatarUrl,
      isGuest: false,
    });
    setActiveSessionKey(uname);
    upsertUserIndex(account);
    return { ok: true, account };
  } catch {
    return { ok: false, error: 'Unable to load account.' };
  }
}

export function persistAuthenticatedAccount(
  account: PlayerProgress,
  password?: string
): PlayerProgress {
  const normalized = normalizeLoadedProgress({ ...account, isGuest: false });
  if (normalized.username && typeof localStorage !== 'undefined') {
    const key = `${STORAGE_USER_PREFIX}${normalized.username}`;
    const existingRaw = localStorage.getItem(key);
    let passwordHash = password ? hashPasswordLocal(password) : '';
    if (!passwordHash && existingRaw) {
      try {
        passwordHash = (JSON.parse(existingRaw) as StoredUserRecord).passwordHash || '';
      } catch {
        passwordHash = '';
      }
    }
    const rec: StoredUserRecord = {
      username: normalized.username,
      passwordHash,
      avatarIcon: normalized.avatarIcon || 'commando_alpha',
      avatarUrl: normalized.avatarUrl,
      progress: normalized,
    };
    try {
      localStorage.setItem(key, JSON.stringify(rec));
      setActiveSessionKey(normalized.username);
      upsertUserIndex(normalized);
    } catch {
      // Ignore
    }
  }
  return normalized;
}

export function getDefaultSettings(): GameSettings {
  return {
    musicVolume: 0.45,
    sfxVolume: 0.75,
    muted: false,
    graphicsQuality: 'high',
    cameraSensitivity: 1.0,
    invertY: false,
    showTouchControls: 'auto',
  };
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(raw) };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadLocalLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>): void {
  try {
    const nextEntry: LeaderboardEntry = {
      ...entry,
      id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const existing = loadLocalLeaderboard();
    const updated = [...existing, nextEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function updateLocalLeaderboardAvatar(
  playerName: string,
  playerTag: string | undefined,
  avatarUrl: string,
  avatarIcon: string
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = loadLocalLeaderboard();
    let changed = false;
    const updated = existing.map((entry) => {
      if (entry.playerName === playerName && (!entry.playerTag || entry.playerTag === playerTag)) {
        changed = true;
        return { ...entry, avatarUrl, avatarIcon };
      }
      return entry;
    });
    if (changed) {
      localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }
}

export function mergeLeaderboards(
  remote: LeaderboardEntry[],
  local: LeaderboardEntry[]
): LeaderboardEntry[] {
  const seen = new Set<string>();
  const combined: LeaderboardEntry[] = [];
  for (const item of [...remote, ...local]) {
    const sig = `${item.playerName}|${item.mode}|${item.arena}|${item.score}|${item.kos}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      combined.push(item);
    }
  }
  return combined.sort((a, b) => b.score - a.score).slice(0, 30);
}

export function offlineUpgradeLevel(
  current: PlayerProgress
): { ok: boolean; error?: string; account?: PlayerProgress } {
  if (current.level >= 25) {
    return { ok: false, error: 'Maximum Level (Lv. 25) already reached!' };
  }
  const cost = levelUpgradeCost(current.level);
  if (current.coins < cost) {
    return {
      ok: false,
      error: `Need ${(cost - current.coins).toLocaleString()} more coins to upgrade to Lv.${current.level + 1}.`,
    };
  }
  const next: PlayerProgress = {
    ...current,
    coins: current.coins - cost,
    level: current.level + 1,
    xp: 0,
  };
  saveProgress(next);
  return { ok: true, account: next };
}

export function offlineBuyItem(
  current: PlayerProgress,
  category: ShopCategory,
  itemId: string
): { ok: boolean; error?: string; account?: PlayerProgress } {
  let price = -1;
  let alreadyUnlocked = false;

  if (category === 'backgrounds') {
    const item = ARENA_CATALOG.find((a) => a.id === itemId);
    if (!item) return { ok: false, error: 'Unknown background map.' };
    price = item.price;
    alreadyUnlocked = current.unlockedArenas.includes(item.id);
  } else if (category === 'guns') {
    const item = GUN_CATALOG.find((g) => g.id === itemId);
    if (!item) return { ok: false, error: 'Unknown gun.' };
    price = item.price;
    alreadyUnlocked = current.unlockedGuns.includes(item.id);
  } else if (category === 'knives') {
    const item = KNIFE_CATALOG.find((k) => k.id === itemId);
    if (!item) return { ok: false, error: 'Unknown knife.' };
    price = item.price;
    alreadyUnlocked = current.unlockedKnives.includes(item.id);
  } else if (category === 'grenades') {
    const item = GRENADE_CATALOG.find((g) => g.id === itemId);
    if (!item) return { ok: false, error: 'Unknown grenade.' };
    price = item.price;
    alreadyUnlocked = (current.unlockedGrenades ?? []).includes(item.id);
  } else if (category === 'skins') {
    const item = SKIN_CATALOG.find((s) => s.id === itemId);
    if (!item) return { ok: false, error: 'Unknown character skin.' };
    price = item.unlockCost;
    alreadyUnlocked = current.unlockedCharacters.includes(item.id);
  } else if (category === 'airplanes') {
    const item = AIRPLANE_CATALOG.find((a) => a.id === itemId);
    if (!item) return { ok: false, error: 'Unknown airplane.' };
    price = item.price;
    alreadyUnlocked = (current.unlockedAirplanes ?? ['cargo_carrier']).includes(item.id);
  } else if (category === 'parachutes') {
    const item = PARACHUTE_CATALOG.find((p) => p.id === itemId);
    if (!item) return { ok: false, error: 'Unknown parachute.' };
    price = item.price;
    alreadyUnlocked = (current.unlockedParachutes ?? ['classic_white']).includes(item.id);
  } else if (category === 'emotes') {
    const item = EMOTE_CATALOG.find((e) => e.id === itemId);
    if (!item) return { ok: false, error: 'Unknown emote.' };
    price = item.price;
    alreadyUnlocked = (current.unlockedEmotes ?? ['hello_wave']).includes(item.id);
  }

  if (alreadyUnlocked) {
    return { ok: false, error: 'You already own this item.' };
  }
  const effectivePrice = current.isVipAllUnlocked ? 0 : price;
  if (current.coins < effectivePrice) {
    return {
      ok: false,
      error: `Insufficient coins! You need ${(effectivePrice - current.coins).toLocaleString()} more coins.`,
    };
  }

  const next: PlayerProgress = {
    ...current,
    coins: current.coins - effectivePrice,
    unlockedArenas: [...current.unlockedArenas],
    unlockedGuns: [...current.unlockedGuns],
    unlockedKnives: [...current.unlockedKnives],
    unlockedGrenades: [...(current.unlockedGrenades ?? ['frag_grenade'])],
    unlockedCharacters: [...current.unlockedCharacters],
    unlockedAirplanes: [...(current.unlockedAirplanes ?? ['cargo_carrier'])],
    unlockedParachutes: [...(current.unlockedParachutes ?? ['classic_white'])],
    unlockedEmotes: [...(current.unlockedEmotes ?? ['hello_wave'])],
    equippedEmotes: [...(current.equippedEmotes ?? ['hello_wave'])],
    equipped: { ...current.equipped },
    customization: { ...current.customization },
  };

  if (category === 'backgrounds') {
    next.unlockedArenas.push(itemId as ArenaId);
    next.equipped.arenaId = itemId as ArenaId;
  } else if (category === 'guns') {
    next.unlockedGuns.push(itemId as GunId);
    next.equipped.gunId = itemId as GunId;
  } else if (category === 'knives') {
    next.unlockedKnives.push(itemId as KnifeId);
    next.equipped.knifeId = itemId as KnifeId;
  } else if (category === 'grenades') {
    next.unlockedGrenades.push(itemId as GrenadeId);
    next.equipped.grenadeId = itemId as GrenadeId;
  } else if (category === 'airplanes') {
    next.unlockedAirplanes.push(itemId as AirplaneId);
    next.equipped.airplaneId = itemId as AirplaneId;
  } else if (category === 'parachutes') {
    next.unlockedParachutes.push(itemId as ParachuteId);
    next.equipped.parachuteId = itemId as ParachuteId;
  } else if (category === 'emotes') {
    const eId = itemId as EmoteId;
    next.unlockedEmotes!.push(eId);
    const wheel = next.equippedEmotes!;
    if (!wheel.includes(eId)) {
      if (wheel.length < 6) wheel.push(eId);
      else wheel[wheel.length - 1] = eId;
    }
  } else if (category === 'skins') {
    next.unlockedCharacters.push(itemId);
    next.equipped.characterId = itemId;
    const preset = SKIN_CATALOG.find((s) => s.id === itemId);
    if (preset) {
      next.customization = {
        characterId: preset.id,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        visorColor: preset.visorColor,
        headgear: preset.defaultHeadgear,
      };
    }
  }

  saveProgress(next);
  return { ok: true, account: next };
}

export function offlineEquipItem(
  current: PlayerProgress,
  category: ShopCategory,
  itemId: string
): { ok: boolean; error?: string; account?: PlayerProgress } {
  const next: PlayerProgress = {
    ...current,
    equippedEmotes: [...(current.equippedEmotes ?? ['hello_wave'])],
    equipped: { ...current.equipped },
    customization: { ...current.customization },
  };

  if (category === 'backgrounds') {
    if (!current.unlockedArenas.includes(itemId as ArenaId)) {
      return { ok: false, error: 'Unlock this background first before equipping it.' };
    }
    next.equipped.arenaId = itemId as ArenaId;
  } else if (category === 'guns') {
    if (!current.unlockedGuns.includes(itemId as GunId)) {
      return { ok: false, error: 'Unlock this gun first before equipping it.' };
    }
    next.equipped.gunId = itemId as GunId;
  } else if (category === 'knives') {
    if (!current.unlockedKnives.includes(itemId as KnifeId)) {
      return { ok: false, error: 'Unlock this knife first before equipping it.' };
    }
    next.equipped.knifeId = itemId as KnifeId;
  } else if (category === 'grenades') {
    if (!(current.unlockedGrenades ?? []).includes(itemId as GrenadeId)) {
      return { ok: false, error: 'Unlock this grenade first before equipping it.' };
    }
    next.equipped.grenadeId = itemId as GrenadeId;
  } else if (category === 'airplanes') {
    if (!(current.unlockedAirplanes ?? ['cargo_carrier']).includes(itemId as AirplaneId)) {
      return { ok: false, error: 'Unlock this airplane first before equipping it.' };
    }
    next.equipped.airplaneId = itemId as AirplaneId;
  } else if (category === 'parachutes') {
    if (!(current.unlockedParachutes ?? ['classic_white']).includes(itemId as ParachuteId)) {
      return { ok: false, error: 'Unlock this parachute first before equipping it.' };
    }
    next.equipped.parachuteId = itemId as ParachuteId;
  } else if (category === 'emotes') {
    const owned = current.unlockedEmotes ?? ['hello_wave'];
    const eId = itemId as EmoteId;
    if (!owned.includes(eId)) {
      return { ok: false, error: 'Unlock this emote first before equipping it.' };
    }
    const wheel = next.equippedEmotes!;
    const idx = wheel.indexOf(eId);
    if (idx >= 0) {
      if (wheel.length > 1) {
        wheel.splice(idx, 1);
      }
    } else if (wheel.length < 6) {
      wheel.push(eId);
    } else {
      wheel.shift();
      wheel.push(eId);
    }
  } else if (category === 'skins') {
    if (!current.unlockedCharacters.includes(itemId)) {
      return { ok: false, error: 'Unlock this character skin first before equipping it.' };
    }
    next.equipped.characterId = itemId;
    const preset = SKIN_CATALOG.find((s) => s.id === itemId);
    if (preset) {
      next.customization = {
        characterId: preset.id,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        visorColor: preset.visorColor,
        headgear: preset.defaultHeadgear,
      };
    }
  }

  saveProgress(next);
  return { ok: true, account: next };
}

export function offlineSpendCoins(
  current: PlayerProgress,
  amount: number
): { ok: boolean; error?: string; account?: PlayerProgress } {
  const safeCost = Math.max(0, Math.round(amount));
  if (current.coins < safeCost) {
    return {
      ok: false,
      error: `Need ${safeCost.toLocaleString()} coins (you have ${current.coins.toLocaleString()}).`,
    };
  }
  const next: PlayerProgress = {
    ...current,
    coins: current.coins - safeCost,
  };
  saveProgress(next);
  return { ok: true, account: next };
}

export function offlineApplyMatchRewards(
  current: PlayerProgress,
  raw: Omit<
    MatchSummary,
    | 'xpEarned'
    | 'coinsEarned'
    | 'coinBreakdown'
    | 'leveledUp'
    | 'newLevel'
    | 'newlyUnlockedAchievements'
  >,
  coinRewardMultiplier = 1
): { account: PlayerProgress; summary: MatchSummary } {
  const safeMult = Math.max(0.1, Math.min(20, Number(coinRewardMultiplier) || 1));
  const isPractice = raw.mode === 'practice';
  const safeKos = Math.max(0, Math.min(isPractice ? 0 : 49, Math.round(raw.kos || 0)));
  const safeCoinsCollected = Math.max(0, Math.min(40, Math.round(raw.coinsCollected || 0)));

  const eliminationCoins = Math.round(safeKos * COIN_REWARDS.PER_ELIMINATION * safeMult);
  const isBR = raw.mode === 'battle_royale';
  const victoryBonus = !isPractice && !isBR && raw.victory ? Math.round(COIN_REWARDS.MATCH_VICTORY * safeMult) : 0;
  const battleRoyaleBonus = isBR && raw.victory ? Math.round(COIN_REWARDS.BATTLE_ROYALE_VICTORY * safeMult) : 0;
  const completionBonus = Math.round(COIN_REWARDS.MATCH_COMPLETION * safeMult);
  const teamBonus =
    !isPractice && (raw.mode === 'team' || isBR) && raw.teamVictory
      ? Math.round(COIN_REWARDS.TEAM_VICTORY_BONUS * safeMult)
      : 0;

  const shoreTreasures = Math.max(0, Math.min(25000, Math.round((raw.bonusCoinsEarned || 0) * safeMult)));

  let coinsEarned = eliminationCoins + victoryBonus + battleRoyaleBonus + completionBonus + teamBonus + shoreTreasures;
  const xpEarned =
    (isPractice ? 25 : 40) +
    safeKos * 25 +
    (raw.victory && !isPractice ? (isBR ? 150 : 90) : 0) +
    (raw.mode === 'survival' ? raw.waveReached * 22 : 0);

  const today = getTodayKey();
  const baseChallenges =
    current.dailyDate === today ? current.dailyChallenges : generateDailyChallenges(today);

  const nextChallenges = baseChallenges.map((ch) => {
    if (ch.claimed) return ch;
    let nextProg = ch.progress;
    if (ch.type === 'kos') nextProg = Math.min(ch.target, ch.progress + safeKos);
    else if (ch.type === 'coins') nextProg = Math.min(ch.target, ch.progress + safeCoinsCollected);
    else if (ch.type === 'wins') {
      const won =
        (!isPractice && raw.victory) || (raw.mode === 'survival' && raw.waveReached >= 4);
      if (won) nextProg = Math.min(ch.target, ch.progress + 1);
    }
    return { ...ch, progress: nextProg };
  });

  const safeHunts = Math.max(0, Math.min(80, Math.round(raw.animalsHunted || 0)));
  const safeShips = Math.max(0, Math.min(25, Math.round(raw.shipsBoarded || 0)));

  const next: PlayerProgress = {
    ...current,
    totalMatches: current.totalMatches + 1,
    totalKOs: current.totalKOs + safeKos,
    totalCoinsCollected: current.totalCoinsCollected + safeCoinsCollected,
    totalWins: current.totalWins + (raw.victory && !isPractice ? 1 : 0),
    battleRoyaleWins: (current.battleRoyaleWins ?? 0) + (isBR && raw.victory ? 1 : 0),
    animalsHunted: (current.animalsHunted ?? 0) + safeHunts,
    shipsBoarded: (current.shipsBoarded ?? 0) + safeShips,
    bestSurvivalWave:
      raw.mode === 'survival'
        ? Math.max(current.bestSurvivalWave, raw.waveReached || 1)
        : current.bestSurvivalWave,
    tournamentWins:
      raw.mode === 'tournament' && raw.victory && raw.tournamentRound >= 3
        ? current.tournamentWins + 1
        : current.tournamentWins,
    unlockedAchievements: [...current.unlockedAchievements],
    dailyDate: today,
    dailyChallenges: nextChallenges,
  };

  const newlyUnlockedAchievements: AchievementDef[] = [];
  const checkAch = (id: string, cond: boolean) => {
    if (cond && !next.unlockedAchievements.includes(id)) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        next.unlockedAchievements.push(id);
        newlyUnlockedAchievements.push(def);
        coinsEarned += def.rewardCoins;
      }
    }
  };

  checkAch('first_blood', next.totalKOs >= 1);
  checkAch('victor', next.totalWins >= 1);
  checkAch('coin_hoarder', next.totalCoinsCollected >= 50);
  checkAch('survivor_5', next.bestSurvivalWave >= 5);
  checkAch('champion', next.tournamentWins >= 1);
  checkAch('brawler_25', next.totalKOs >= 25);

  let xp = next.xp + xpEarned;
  let level = next.level;
  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
    coinsEarned += 50;
  }

  next.xp = xp;
  next.level = level;
  next.coins = current.coins + coinsEarned;
  saveProgress(next);

  return {
    account: next,
    summary: {
      ...raw,
      kos: safeKos,
      coinsCollected: safeCoinsCollected,
      animalsHunted: safeHunts,
      shipsBoarded: safeShips,
      xpEarned,
      coinsEarned,
      bonusCoinsEarned: shoreTreasures,
      coinBreakdown: {
        eliminations: eliminationCoins,
        victoryBonus,
        completionBonus,
        teamBonus,
        battleRoyaleBonus,
        shoreTreasures,
      },
      leveledUp,
      newLevel: level,
      newlyUnlockedAchievements,
    },
  };
}

export function offlineClaimChallenge(
  current: PlayerProgress,
  challengeId: string
): PlayerProgress | null {
  const target = current.dailyChallenges.find((c) => c.id === challengeId);
  if (!target || target.claimed || target.progress < target.target) return null;

  let coinsEarned = COIN_REWARDS.DAILY_CHALLENGE;
  let xp = current.xp + target.rewardXp;
  let level = current.level;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    coinsEarned += 50;
  }

  const next: PlayerProgress = {
    ...current,
    coins: current.coins + coinsEarned,
    xp,
    level,
    dailyChallenges: current.dailyChallenges.map((c) =>
      c.id === challengeId ? { ...c, claimed: true } : c
    ),
  };
  saveProgress(next);
  return next;
}
