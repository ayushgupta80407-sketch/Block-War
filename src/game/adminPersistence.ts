import {
  AIRPLANE_CATALOG,
  ARENA_CATALOG,
  EMOTE_CATALOG,
  GRENADE_CATALOG,
  GUN_CATALOG,
  KNIFE_CATALOG,
  PARACHUTE_CATALOG,
  SKIN_CATALOG,
} from './catalog';
import {
  DEFAULT_LIVE_GAME_CONFIG,
  LiveConfigPatch,
  LiveConfigVersionEntry,
  LiveGameConfig,
  normalizeLiveGameConfig,
} from './liveConfig';
import {
  loadProgress,
  normalizeLoadedProgress,
  persistAuthenticatedAccount,
  saveProgress,
} from './progression';
import {
  DEFAULT_GAME_POLICY,
  GamePolicyConfig,
  hasAcceptedPolicyVersion,
  normalizeGamePolicy,
  PolicyAcceptanceRecord,
} from './policy';
import { PlayerProgress, ShopCategory } from './types';

export const LIVE_CONFIG_STORAGE_KEY = 'bw_live_config';
export const ADMIN_QR_STORAGE_KEY = 'bw_admin_qr';
export const PLAYERS_DB_STORAGE_KEY = 'bw_players_db';
export const ADMIN_MASTER_KEY_STORAGE_KEY = 'bw_admin_master_key';
export const POLICY_CONFIG_STORAGE_KEY = 'bw_policy_config';
export const POLICY_RECORDS_STORAGE_KEY = 'bw_policy_records';
export const DEFAULT_ADMIN_MASTER_KEY = 'BW9X7K2M4P8Q';

export interface StoredLiveConfigRecord {
  config: LiveGameConfig;
  version: string;
  history: LiveConfigVersionEntry[];
  updatedAt?: string;
}

export interface StoredAdminQrConfig {
  qrImageUrl: string | null;
  upiId: string;
  payeeName: string;
  updatedAt?: string;
  cleared?: boolean;
}

export function getAdminMasterKeyLocal(): string {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_ADMIN_MASTER_KEY;
    const saved = localStorage.getItem(ADMIN_MASTER_KEY_STORAGE_KEY);
    return saved && /^[A-Za-z0-9]{12}$/.test(saved) ? saved : DEFAULT_ADMIN_MASTER_KEY;
  } catch {
    return DEFAULT_ADMIN_MASTER_KEY;
  }
}

export function setAdminMasterKeyLocal(nextKey: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (/^[A-Za-z0-9]{12}$/.test(nextKey)) {
      localStorage.setItem(ADMIN_MASTER_KEY_STORAGE_KEY, nextKey);
    }
  } catch {
    // Ignore storage error
  }
}

export function verifyAdminKeyLocal(password: string): boolean {
  const clean = password.trim();
  return clean === getAdminMasterKeyLocal() || clean === DEFAULT_ADMIN_MASTER_KEY;
}

export function getLiveConfigRecordLocal(): StoredLiveConfigRecord {
  try {
    if (typeof localStorage === 'undefined') {
      return {
        config: normalizeLiveGameConfig(DEFAULT_LIVE_GAME_CONFIG),
        version: 'v1.00',
        history: [],
      };
    }
    const raw = localStorage.getItem(LIVE_CONFIG_STORAGE_KEY);
    if (!raw) {
      return {
        config: normalizeLiveGameConfig(DEFAULT_LIVE_GAME_CONFIG),
        version: 'v1.00',
        history: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredLiveConfigRecord> & Partial<LiveGameConfig>;
    const cfg = parsed.config ? normalizeLiveGameConfig(parsed.config) : normalizeLiveGameConfig(parsed);
    return {
      config: cfg,
      version: typeof parsed.version === 'string' && parsed.version ? parsed.version : 'v1.00',
      history: Array.isArray(parsed.history) ? parsed.history : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    };
  } catch {
    return {
      config: normalizeLiveGameConfig(DEFAULT_LIVE_GAME_CONFIG),
      version: 'v1.00',
      history: [],
    };
  }
}

export function getLiveGameConfig(): LiveGameConfig {
  return getLiveConfigRecordLocal().config;
}

export function saveLiveConfigLocal(opts: {
  config: LiveGameConfig;
  version?: string;
  history?: LiveConfigVersionEntry[];
  patch?: LiveConfigPatch;
  summary?: string;
}): StoredLiveConfigRecord {
  const prev = getLiveConfigRecordLocal();
  const nextConfig = normalizeLiveGameConfig(opts.config);
  const nextVerNum =
    opts.version ||
    (() => {
      const m = prev.version.match(/v?(\d+)\.(\d+)/);
      const major = m ? Number(m[1]) : 1;
      const minor = m ? Number(m[2]) : 0;
      const bumped = minor + 1;
      return `v${major}.${String(bumped).padStart(2, '0')}`;
    })();

  let nextHistory = opts.history ?? prev.history;
  if (!opts.history && opts.summary) {
    const entry: LiveConfigVersionEntry = {
      version: nextVerNum,
      updatedAt: new Date().toISOString(),
      summary: opts.summary,
      patch: opts.patch || {},
      config: nextConfig,
    };
    nextHistory = [entry, ...prev.history].slice(0, 15);
  }

  const record: StoredLiveConfigRecord = {
    config: nextConfig,
    version: nextVerNum,
    history: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LIVE_CONFIG_STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // Ignore quota errors
  }
  return record;
}

export function getAdminQrLocal(): StoredAdminQrConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ADMIN_QR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminQrConfig;
    return {
      qrImageUrl: typeof parsed.qrImageUrl === 'string' && parsed.qrImageUrl ? parsed.qrImageUrl : null,
      upiId: typeof parsed.upiId === 'string' ? parsed.upiId : '',
      payeeName: typeof parsed.payeeName === 'string' ? parsed.payeeName : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
      cleared: Boolean(parsed.cleared),
    };
  } catch {
    return null;
  }
}

export function saveAdminQrLocal(qr: StoredAdminQrConfig): StoredAdminQrConfig {
  const rec: StoredAdminQrConfig = {
    qrImageUrl: typeof qr.qrImageUrl === 'string' && qr.qrImageUrl ? qr.qrImageUrl : null,
    upiId: (qr.upiId || '').trim().slice(0, 80),
    payeeName: (qr.payeeName || '').trim().slice(0, 60),
    updatedAt: qr.updatedAt || new Date().toISOString(),
    cleared: qr.qrImageUrl === null,
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_QR_STORAGE_KEY, JSON.stringify(rec));
    }
  } catch {
    // Ignore quota errors
  }
  return rec;
}

export function getLocalPlayersDb(currentAccount?: PlayerProgress): PlayerProgress[] {
  const map = new Map<string, PlayerProgress>();
  const addAcc = (raw: Partial<PlayerProgress> | null | undefined) => {
    if (!raw || !raw.accountId) return;
    const norm = normalizeLoadedProgress(raw);
    map.set(norm.accountId, norm);
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const rawDb = localStorage.getItem(PLAYERS_DB_STORAGE_KEY);
      if (rawDb) {
        const parsed = JSON.parse(rawDb);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => addAcc(p));
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('blockwar_user_')) {
          try {
            const rec = JSON.parse(localStorage.getItem(k) || '{}');
            if (rec && rec.progress) addAcc(rec.progress);
          } catch {
            // Ignore corrupt entry
          }
        }
      }
      addAcc(loadProgress());
    }
  } catch {
    // Ignore
  }

  if (currentAccount) addAcc(currentAccount);
  return Array.from(map.values()).sort((a, b) => (b.coins || 0) - (a.coins || 0));
}

export function savePlayersDbLocal(players: PlayerProgress[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PLAYERS_DB_STORAGE_KEY, JSON.stringify(players));
  } catch {
    // Ignore
  }
}

export function syncAccountToLocalStores(account: PlayerProgress, activeAccountId?: string): void {
  const norm = normalizeLoadedProgress(account);
  const existing = getLocalPlayersDb(norm);
  const merged = existing.map((p) => (p.accountId === norm.accountId ? norm : p));
  if (!merged.some((p) => p.accountId === norm.accountId)) {
    merged.unshift(norm);
  }
  savePlayersDbLocal(merged);

  if (norm.username && !norm.isGuest) {
    persistAuthenticatedAccount(norm);
  }
  if (!activeAccountId || norm.accountId === activeAccountId) {
    saveProgress(norm);
  }
}

export interface LocalPlayerUpdatePayload {
  coins?: number;
  addCoins?: number;
  level?: number;
  banned?: boolean;
  banReason?: string;
  chatMuted?: boolean;
  chatMutedReason?: string;
  unlockAll?: boolean;
  unlockCategory?: string;
  lockCategory?: string;
  grantItem?: { category: ShopCategory; itemId: string };
  revokeItem?: { category: ShopCategory; itemId: string };
}

export function applyLocalPlayerUpdate(
  accountId: string,
  payload: LocalPlayerUpdatePayload,
  activeAccountId?: string
): PlayerProgress | null {
  const list = getLocalPlayersDb();
  const found = list.find((p) => p.accountId === accountId || p.username === accountId);
  if (!found) return null;

  const acc: PlayerProgress = normalizeLoadedProgress({ ...found });

  if (typeof payload.coins === 'number' && Number.isFinite(payload.coins)) {
    acc.coins = Math.max(0, Math.round(payload.coins));
  }
  if (typeof payload.addCoins === 'number' && Number.isFinite(payload.addCoins)) {
    acc.coins = Math.max(0, Math.round(acc.coins + payload.addCoins));
  }
  if (typeof payload.level === 'number' && Number.isFinite(payload.level)) {
    acc.level = Math.max(1, Math.min(25, Math.round(payload.level)));
  }
  if (typeof payload.banned === 'boolean') {
    acc.banned = payload.banned;
    acc.banReason = payload.banned ? String(payload.banReason || 'Cheating / Rule Violation').slice(0, 120) : '';
  }
  if (typeof payload.chatMuted === 'boolean') {
    acc.chatMuted = payload.chatMuted;
    acc.chatMutedAt = payload.chatMuted ? new Date().toISOString() : '';
    acc.chatMutedReason = payload.chatMuted
      ? String(payload.chatMutedReason || 'Muted by Admin from History Chat').slice(0, 120)
      : '';
  }

  if (payload.unlockAll === true) {
    acc.isVipAllUnlocked = true;
    acc.unlockedArenas = ARENA_CATALOG.map((a) => a.id);
    acc.unlockedGuns = GUN_CATALOG.map((g) => g.id);
    acc.unlockedKnives = KNIFE_CATALOG.map((k) => k.id);
    acc.unlockedGrenades = GRENADE_CATALOG.map((g) => g.id);
    acc.unlockedCharacters = SKIN_CATALOG.map((s) => s.id);
    acc.unlockedAirplanes = AIRPLANE_CATALOG.map((a) => a.id);
    acc.unlockedParachutes = PARACHUTE_CATALOG.map((p) => p.id);
    acc.unlockedEmotes = EMOTE_CATALOG.map((e) => e.id);
  } else if (payload.unlockAll === false) {
    acc.isVipAllUnlocked = false;
  }

  if (payload.unlockCategory === 'maps') acc.unlockedArenas = ARENA_CATALOG.map((a) => a.id);
  if (payload.lockCategory === 'maps') acc.unlockedArenas = ['practice'];
  if (payload.unlockCategory === 'weapons') {
    acc.unlockedGuns = GUN_CATALOG.map((g) => g.id);
    acc.unlockedKnives = KNIFE_CATALOG.map((k) => k.id);
  }
  if (payload.lockCategory === 'weapons') {
    acc.unlockedGuns = ['basic_pistol'];
    acc.unlockedKnives = ['basic_knife'];
  }
  if (payload.unlockCategory === 'vehicles') {
    acc.unlockedAirplanes = AIRPLANE_CATALOG.map((a) => a.id);
    acc.unlockedParachutes = PARACHUTE_CATALOG.map((p) => p.id);
    acc.unlockedGrenades = GRENADE_CATALOG.map((g) => g.id);
  }
  if (payload.lockCategory === 'vehicles') {
    acc.unlockedAirplanes = ['cargo_carrier'];
    acc.unlockedParachutes = ['classic_white'];
    acc.unlockedGrenades = ['frag_grenade'];
  }
  if (payload.unlockCategory === 'skins') acc.unlockedCharacters = SKIN_CATALOG.map((s) => s.id);
  if (payload.lockCategory === 'skins') acc.unlockedCharacters = ['block_soldier'];
  if (payload.unlockCategory === 'emotes') acc.unlockedEmotes = EMOTE_CATALOG.map((e) => e.id);
  if (payload.lockCategory === 'emotes') acc.unlockedEmotes = ['hello_wave'];

  const toggleItem = (grant: boolean, cat: ShopCategory, itemId: string) => {
    const pushUnique = <T extends string>(arr: T[], id: T) => (arr.includes(id) ? arr : [...arr, id]);
    const removeOne = <T extends string>(arr: T[], id: T, fallback: T) => {
      const filtered = arr.filter((x) => x !== id);
      return filtered.length > 0 ? filtered : [fallback];
    };
    if (cat === 'backgrounds') {
      acc.unlockedArenas = grant
        ? pushUnique(acc.unlockedArenas, itemId as never)
        : removeOne(acc.unlockedArenas, itemId as never, 'practice');
    } else if (cat === 'guns') {
      acc.unlockedGuns = grant
        ? pushUnique(acc.unlockedGuns, itemId as never)
        : removeOne(acc.unlockedGuns, itemId as never, 'basic_pistol');
    } else if (cat === 'knives') {
      acc.unlockedKnives = grant
        ? pushUnique(acc.unlockedKnives, itemId as never)
        : removeOne(acc.unlockedKnives, itemId as never, 'basic_knife');
    } else if (cat === 'skins') {
      acc.unlockedCharacters = grant
        ? pushUnique(acc.unlockedCharacters, itemId)
        : removeOne(acc.unlockedCharacters, itemId, 'block_soldier');
    } else if (cat === 'airplanes') {
      acc.unlockedAirplanes = grant
        ? pushUnique(acc.unlockedAirplanes ?? [], itemId as never)
        : removeOne(acc.unlockedAirplanes ?? [], itemId as never, 'cargo_carrier');
    } else if (cat === 'parachutes') {
      acc.unlockedParachutes = grant
        ? pushUnique(acc.unlockedParachutes ?? [], itemId as never)
        : removeOne(acc.unlockedParachutes ?? [], itemId as never, 'classic_white');
    } else if (cat === 'emotes') {
      acc.unlockedEmotes = grant
        ? pushUnique(acc.unlockedEmotes ?? [], itemId as never)
        : removeOne(acc.unlockedEmotes ?? [], itemId as never, 'hello_wave');
    }
  };

  if (payload.grantItem) toggleItem(true, payload.grantItem.category, payload.grantItem.itemId);
  if (payload.revokeItem) toggleItem(false, payload.revokeItem.category, payload.revokeItem.itemId);

  syncAccountToLocalStores(acc, activeAccountId);
  return acc;
}

export function saveAdminState(opts: {
  liveConfig?: LiveGameConfig;
  version?: string;
  history?: LiveConfigVersionEntry[];
  patch?: LiveConfigPatch;
  summary?: string;
  qrConfig?: StoredAdminQrConfig;
  players?: PlayerProgress[];
}): {
  liveRecord?: StoredLiveConfigRecord;
  qrRecord?: StoredAdminQrConfig;
} {
  const out: { liveRecord?: StoredLiveConfigRecord; qrRecord?: StoredAdminQrConfig } = {};
  if (opts.liveConfig) {
    out.liveRecord = saveLiveConfigLocal({
      config: opts.liveConfig,
      version: opts.version,
      history: opts.history,
      patch: opts.patch,
      summary: opts.summary,
    });
  }
  if (opts.qrConfig) {
    out.qrRecord = saveAdminQrLocal(opts.qrConfig);
  }
  if (opts.players) {
    savePlayersDbLocal(opts.players);
  }
  return out;
}

export function getPolicyConfigLocal(): GamePolicyConfig {
  try {
    if (typeof localStorage === 'undefined') return normalizeGamePolicy(DEFAULT_GAME_POLICY);
    const raw = localStorage.getItem(POLICY_CONFIG_STORAGE_KEY);
    if (!raw) return normalizeGamePolicy(DEFAULT_GAME_POLICY);
    return normalizeGamePolicy(JSON.parse(raw));
  } catch {
    return normalizeGamePolicy(DEFAULT_GAME_POLICY);
  }
}

export function savePolicyConfigLocal(policy: GamePolicyConfig): GamePolicyConfig {
  const norm = normalizeGamePolicy({
    ...policy,
    updatedAt: policy.updatedAt || new Date().toISOString(),
  });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POLICY_CONFIG_STORAGE_KEY, JSON.stringify(norm));
    }
  } catch {
    // Ignore storage quota errors
  }
  return norm;
}

function loadRawPolicyRecordMap(): Record<string, PolicyAcceptanceRecord> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(POLICY_RECORDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, PolicyAcceptanceRecord>;
    }
  } catch {
    // Ignore corrupt cache
  }
  return {};
}

function saveRawPolicyRecordMap(map: Record<string, PolicyAcceptanceRecord>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(POLICY_RECORDS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordPolicyAcceptanceLocal(
  account: PlayerProgress,
  policyVersion: string,
  acceptedAt = new Date().toISOString()
): { account: PlayerProgress; record: PolicyAcceptanceRecord } {
  const updatedAccount = normalizeLoadedProgress({
    ...account,
    policyAccepted: true,
    policyAcceptedVersion: policyVersion,
    policyAcceptedAt: acceptedAt,
  });
  syncAccountToLocalStores(updatedAccount, updatedAccount.accountId);

  const record: PolicyAcceptanceRecord = {
    accountId: updatedAccount.accountId,
    username: updatedAccount.username || updatedAccount.playerName || 'Guest',
    playerName: updatedAccount.playerName || updatedAccount.username || 'Player',
    status: 'ACCEPTED',
    accepted: true,
    policyVersion,
    acceptedAt,
  };
  const map = loadRawPolicyRecordMap();
  map[updatedAccount.accountId] = record;
  saveRawPolicyRecordMap(map);

  return { account: updatedAccount, record };
}

export function getLocalPolicyAuditRecords(currentPolicyVersion: string): PolicyAcceptanceRecord[] {
  const recMap = loadRawPolicyRecordMap();
  const players = getLocalPlayersDb();
  const merged = new Map<string, PolicyAcceptanceRecord>();

  for (const r of Object.values(recMap)) {
    if (!r || !r.accountId) continue;
    const isCurrent =
      Boolean(r.accepted) &&
      (r.policyVersion || '').toLowerCase() === currentPolicyVersion.toLowerCase() &&
      Boolean(r.acceptedAt);
    merged.set(r.accountId, {
      ...r,
      status: isCurrent ? 'ACCEPTED' : 'PENDING',
      accepted: isCurrent,
    });
  }

  for (const p of players) {
    const existing = merged.get(p.accountId);
    const accCurrent = hasAcceptedPolicyVersion(p, currentPolicyVersion);
    const ver = p.policyAcceptedVersion || existing?.policyVersion || '—';
    const ts = p.policyAcceptedAt || existing?.acceptedAt || null;
    const accepted = accCurrent || Boolean(existing?.accepted);
    merged.set(p.accountId, {
      accountId: p.accountId,
      username: p.username || existing?.username || p.playerName || 'Guest',
      playerName: p.playerName || existing?.playerName || p.username || 'Player',
      status: accepted ? 'ACCEPTED' : 'PENDING',
      accepted,
      policyVersion: accepted ? currentPolicyVersion : ver,
      acceptedAt: ts,
    });
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.accepted !== b.accepted) return a.accepted ? -1 : 1;
    const ta = a.acceptedAt ? Date.parse(a.acceptedAt) : 0;
    const tb = b.acceptedAt ? Date.parse(b.acceptedAt) : 0;
    return tb - ta;
  });
}

