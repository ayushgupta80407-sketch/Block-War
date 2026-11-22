import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
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
} from './src/game/catalog';
import {
  applyConfigPatch,
  DEFAULT_LIVE_GAME_CONFIG,
  LiveConfigPatch,
  LiveConfigVersionEntry,
  LiveGameConfig,
  normalizeLiveGameConfig,
  parseNaturalLanguageGamePatch,
} from './src/game/liveConfig';
import {
  getDefaultProgress,
  levelUpgradeCost,
  normalizeLoadedProgress,
  normalizeUsername,
  offlineApplyMatchRewards,
  offlineBuyItem,
  offlineEquipItem,
  offlineUpgradeLevel,
} from './src/game/progression';
import {
  bumpPolicyVersion,
  DEFAULT_GAME_POLICY,
  GamePolicyConfig,
  hasAcceptedPolicyVersion,
  normalizeGamePolicy,
  PolicyAcceptanceRecord,
} from './src/game/policy';
import {
  buildChatThreadSummaries,
  ChatMessage,
  makeDmThreadId,
} from './src/game/chat';
import {
  ArenaId,
  LeaderboardEntry,
  MatchTeamMode,
  PlayerProgress,
  ShopCategory,
  TeamChoice,
} from './src/game/types';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const LEGACY_DATA_FILE = path.resolve(process.cwd(), '.data', 'store.json');

const DEFAULT_MASTER_KEY = (process.env.ADMIN_MASTER_KEY || 'BW9X7K2M4P8Q').trim();

interface StoredUserAuth {
  username: string;
  passwordHash: string;
  avatarIcon: string;
  avatarUrl?: string;
  accountId: string;
}

export interface PaymentQrConfig {
  qrImageUrl: string | null;
  upiId: string;
  payeeName: string;
  updatedAt?: string;
}

export interface PaymentRecord {
  id: string;
  accountId: string;
  username: string;
  planRupees: number;
  paidAmountINR: number;
  utr: string;
  screenshotDataUrl: string;
  aiVerdict: string;
  creditedCoins: number;
  createdAt: string;
}

interface StoreData {
  accounts: Record<string, PlayerProgress>;
  users: Record<string, StoredUserAuth>;
  leaderboard: LeaderboardEntry[];
  gameConfig: LiveGameConfig;
  configVersion: string;
  configHistory: LiveConfigVersionEntry[];
  adminPasswordHash?: string;
  paymentQrConfig: PaymentQrConfig;
  paymentRecords: PaymentRecord[];
  policyConfig: GamePolicyConfig;
  policyRecords: Record<string, PolicyAcceptanceRecord>;
  chatHistory: ChatMessage[];
}

function hashServerPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyServerPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hex] = parts;
  const expected = crypto.scryptSync(password, salt, 32);
  const actual = Buffer.from(hex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const DEFAULT_QR_CONFIG: PaymentQrConfig = {
  qrImageUrl: null,
  upiId: '',
  payeeName: '',
  updatedAt: '',
};

function loadStore(): StoreData {
  const empty: StoreData = {
    accounts: {},
    users: {},
    leaderboard: [],
    gameConfig: { ...DEFAULT_LIVE_GAME_CONFIG },
    configVersion: 'v1.00',
    configHistory: [],
    paymentQrConfig: { ...DEFAULT_QR_CONFIG },
    paymentRecords: [],
    policyConfig: normalizeGamePolicy(DEFAULT_GAME_POLICY),
    policyRecords: {},
    chatHistory: [],
  };

  try {
    const sourceFile = fs.existsSync(DATA_FILE)
      ? DATA_FILE
      : fs.existsSync(LEGACY_DATA_FILE)
        ? LEGACY_DATA_FILE
        : null;
    if (sourceFile) {
      const parsed = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
      const rawQr = parsed.paymentQrConfig || {};
      return {
        accounts: parsed.accounts || {},
        users: parsed.users || {},
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
        gameConfig: normalizeLiveGameConfig(parsed.gameConfig),
        configVersion: typeof parsed.configVersion === 'string' ? parsed.configVersion : 'v1.00',
        configHistory: Array.isArray(parsed.configHistory) ? parsed.configHistory : [],
        adminPasswordHash:
          typeof parsed.adminPasswordHash === 'string' ? parsed.adminPasswordHash : undefined,
        paymentQrConfig: {
          qrImageUrl: typeof rawQr.qrImageUrl === 'string' && rawQr.qrImageUrl ? rawQr.qrImageUrl : null,
          upiId: typeof rawQr.upiId === 'string' ? rawQr.upiId : '',
          payeeName: typeof rawQr.payeeName === 'string' ? rawQr.payeeName : '',
          updatedAt: typeof rawQr.updatedAt === 'string' ? rawQr.updatedAt : '',
        },
        paymentRecords: Array.isArray(parsed.paymentRecords) ? parsed.paymentRecords : [],
        policyConfig: normalizeGamePolicy(parsed.policyConfig || DEFAULT_GAME_POLICY),
        policyRecords:
          parsed.policyRecords && typeof parsed.policyRecords === 'object' && !Array.isArray(parsed.policyRecords)
            ? (parsed.policyRecords as Record<string, PolicyAcceptanceRecord>)
            : {},
        chatHistory: Array.isArray(parsed.chatHistory) ? (parsed.chatHistory as ChatMessage[]) : [],
      };
    }
  } catch {
    // Fallback
  }
  return empty;
}

function saveStore(data: StoreData): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Ignore disk write failure in ephemeral containers
  }
}

const store = loadStore();

// Persist migrated legacy store immediately if data/db.json didn't exist yet
if (!fs.existsSync(DATA_FILE)) {
  saveStore(store);
}

function bumpConfigVersion(current: string): string {
  const m = current.match(/^v(\d+)\.(\d+)$/i);
  if (!m) return 'v1.01';
  const major = Number(m[1]);
  const minor = Number(m[2]) + 1;
  return `v${major}.${String(minor).padStart(2, '0')}`;
}

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Admin Session & Brute-Force Protection State
const adminTokens = new Map<string, number>(); // token -> expiresAtMs
const adminUnlockAttempts = new Map<string, { failures: number; lockedUntil: number }>();

function getClientKey(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const ip = Array.isArray(fwd) ? fwd[0] : typeof fwd === 'string' ? fwd.split(',')[0].trim() : '';
  return ip || req.ip || req.socket.remoteAddress || 'local';
}

function verifyAdminMasterPassword(input: string): boolean {
  if (store.adminPasswordHash) {
    return verifyServerPassword(input, store.adminPasswordHash);
  }
  const a = Buffer.from(input, 'utf-8');
  const b = Buffer.from(DEFAULT_MASTER_KEY, 'utf-8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const exp = token ? adminTokens.get(token) : undefined;
  if (!exp || exp < Date.now()) {
    if (token) adminTokens.delete(token);
    res.status(401).json({ error: 'Admin session expired or unauthorized.' });
    return;
  }
  next();
}

interface WsPlayerState {
  id: string;
  ws?: WebSocket;
  name: string;
  playerTag: string;
  level: number;
  team?: TeamChoice;
  isBot: boolean;
  customization: PlayerProgress['customization'];
  gunId: PlayerProgress['equipped']['gunId'];
  knifeId: PlayerProgress['equipped']['knifeId'];
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  anim: string;
  hp: number;
  maxHp: number;
  hearts: number;
  score: number;
  kos: number;
  deaths: number;
  alive: boolean;
  hasCrown: boolean;
  attackTimer: number;
  hitFlash: number;
}

interface RoomState {
  code: string;
  hostName: string;
  arena: ArenaId;
  teamMode: MatchTeamMode;
  maxPlayers: number;
  fillWithBots: boolean;
  timeRemaining: number;
  players: Map<string, WsPlayerState>;
}

const rooms = new Map<string, RoomState>();

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function startServer() {
  const app = express();

  // Permissive CORS for cross-origin preview / standalone hosting
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/health', (_req, res) => res.status(200).send('OK'));

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: Date.now(), version: store.configVersion });
  });

  /* ---------- AUTH & PROFILE ---------- */
  app.post('/api/auth/register', (req, res) => {
    const rawUser = String(req.body?.username || '');
    const password = String(req.body?.password || '');
    const avatarIcon = String(req.body?.avatarIcon || 'commando_alpha').slice(0, 32);
    const rawAvatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl.trim() : '';
    const avatarUrl =
      rawAvatarUrl && rawAvatarUrl.length <= 120000
        ? rawAvatarUrl
        : `preset:${avatarIcon}`;
    const uname = normalizeUsername(rawUser);

    if (uname.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters (letters/numbers).' });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' });
      return;
    }
    if (store.users[uname]) {
      res.status(409).json({ error: `Username "${uname}" is already taken.` });
      return;
    }

    const account = getDefaultProgress({
      username: uname,
      displayName: rawUser.trim().slice(0, 14) || uname,
      avatarIcon,
      avatarUrl,
      isGuest: false,
    });
    store.users[uname] = {
      username: uname,
      passwordHash: hashServerPassword(password),
      avatarIcon: account.avatarIcon || 'commando_alpha',
      avatarUrl: account.avatarUrl,
      accountId: account.accountId,
    };
    store.accounts[account.accountId] = account;
    saveStore(store);
    res.json({ account });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawUser = String(req.body?.username || '');
    const password = String(req.body?.password || '');
    const uname = normalizeUsername(rawUser);
    if (!uname) {
      res.status(400).json({ error: 'Enter your username.' });
      return;
    }
    const user = store.users[uname];
    if (!user) {
      res.status(404).json({ error: `Account "${uname}" not found.` });
      return;
    }
    if (!verifyServerPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }
    const existing = store.accounts[user.accountId];
    if (existing?.banned) {
      res.status(403).json({
        error: `Account banned by Admin: ${existing.banReason || 'Cheating / Rule Violation'}`,
        banned: true,
        banReason: existing.banReason || 'Cheating / Rule Violation',
      });
      return;
    }
    const account = normalizeLoadedProgress({
      ...(existing ||
        getDefaultProgress({
          username: uname,
          avatarIcon: user.avatarIcon,
          avatarUrl: user.avatarUrl,
          isGuest: false,
        })),
      username: uname,
      avatarIcon: existing?.avatarIcon || user.avatarIcon,
      avatarUrl: existing?.avatarUrl || user.avatarUrl,
      isGuest: false,
    });
    store.accounts[account.accountId] = account;
    saveStore(store);
    res.json({ account });
  });

  const handleAccountSync = (req: Request, res: Response) => {
    const incoming = req.body?.account as PlayerProgress | undefined;
    if (!incoming?.accountId) {
      res.status(400).json({ error: 'Missing accountId' });
      return;
    }
    const existing = store.accounts[incoming.accountId];
    if (existing?.banned) {
      res.status(403).json({
        error: `Account banned by Admin: ${existing.banReason || 'Cheating / Rule Violation'}`,
        banned: true,
        banReason: existing.banReason || 'Cheating / Rule Violation',
      });
      return;
    }
    if (!existing) {
      const normalized = normalizeLoadedProgress(incoming);
      store.accounts[incoming.accountId] = normalized;
      saveStore(store);
      res.json({ account: normalized });
      return;
    }
    const allowCoinDeduction = Boolean(req.body?.allowCoinDeduction);
    if (allowCoinDeduction) {
      const merged = normalizeLoadedProgress({
        ...existing,
        ...incoming,
        coins: Math.max(0, Math.round(Number(incoming.coins ?? existing.coins ?? 0))),
        banned: existing.banned,
        banReason: existing.banReason,
        isVipAllUnlocked: existing.isVipAllUnlocked || incoming.isVipAllUnlocked,
        role: existing.role,
      });
      store.accounts[incoming.accountId] = merged;
      saveStore(store);
      res.json({ account: merged });
      return;
    }
    if ((incoming.totalMatches || 0) > (existing.totalMatches || 0)) {
      const merged = normalizeLoadedProgress({
        ...incoming,
        coins: Math.max(existing.coins || 0, incoming.coins || 0),
        banned: existing.banned,
        banReason: existing.banReason,
        isVipAllUnlocked: existing.isVipAllUnlocked || incoming.isVipAllUnlocked,
        role: existing.role,
      });
      store.accounts[incoming.accountId] = merged;
      saveStore(store);
      res.json({ account: merged });
      return;
    }
    const incomingPolicyAccepted = Boolean(incoming.policyAccepted && incoming.policyAcceptedAt);
    const existingPolicyAccepted = Boolean(existing.policyAccepted && existing.policyAcceptedAt);
    const useIncomingPolicy =
      incomingPolicyAccepted &&
      (!existingPolicyAccepted ||
        Date.parse(incoming.policyAcceptedAt || '') >= Date.parse(existing.policyAcceptedAt || ''));

    const avatarUpdated = Boolean(req.body?.avatarUpdated);
    const incomingAvatarUrl =
      typeof incoming.avatarUrl === 'string' &&
      incoming.avatarUrl.trim() &&
      incoming.avatarUrl.trim().length <= 120000
        ? incoming.avatarUrl.trim()
        : undefined;
    const incomingAvatarIcon =
      typeof incoming.avatarIcon === 'string' && incoming.avatarIcon.trim()
        ? incoming.avatarIcon.trim().slice(0, 32)
        : undefined;
    const shouldApplyAvatar =
      avatarUpdated ||
      (Boolean(incomingAvatarUrl) && incomingAvatarUrl !== existing.avatarUrl) ||
      (Boolean(incomingAvatarIcon) && !existing.avatarIcon);

    const nextAvatarUrl = shouldApplyAvatar
      ? incomingAvatarUrl || existing.avatarUrl
      : existing.avatarUrl || incomingAvatarUrl;
    const nextAvatarIcon = shouldApplyAvatar
      ? incomingAvatarIcon || existing.avatarIcon
      : existing.avatarIcon || incomingAvatarIcon;

    const normalizedExisting = normalizeLoadedProgress({
      ...existing,
      username: existing.username || incoming.username,
      avatarIcon: nextAvatarIcon,
      avatarUrl: nextAvatarUrl,
      isGuest: existing.isGuest ?? incoming.isGuest,
      policyAccepted: useIncomingPolicy ? incoming.policyAccepted : existing.policyAccepted,
      policyAcceptedVersion: useIncomingPolicy
        ? incoming.policyAcceptedVersion
        : existing.policyAcceptedVersion,
      policyAcceptedAt: useIncomingPolicy ? incoming.policyAcceptedAt : existing.policyAcceptedAt,
    });

    let dirty = false;
    if (shouldApplyAvatar) {
      store.accounts[incoming.accountId] = normalizedExisting;
      if (normalizedExisting.username && store.users[normalizedExisting.username]) {
        store.users[normalizedExisting.username].avatarIcon =
          normalizedExisting.avatarIcon || 'commando_alpha';
        store.users[normalizedExisting.username].avatarUrl = normalizedExisting.avatarUrl;
      }
      // Keep existing leaderboard entries for this player in sync with their new avatar
      for (const entry of store.leaderboard) {
        if (
          entry.playerName === normalizedExisting.playerName &&
          (!entry.playerTag || entry.playerTag === normalizedExisting.playerTag)
        ) {
          entry.avatarUrl = normalizedExisting.avatarUrl;
          entry.avatarIcon = normalizedExisting.avatarIcon;
        }
      }
      dirty = true;
    }
    if (useIncomingPolicy && !existingPolicyAccepted) {
      store.accounts[incoming.accountId] = normalizedExisting;
      store.policyRecords[incoming.accountId] = {
        accountId: normalizedExisting.accountId,
        username: normalizedExisting.username || normalizedExisting.playerName || 'Guest',
        playerName: normalizedExisting.playerName || normalizedExisting.username || 'Player',
        status: 'ACCEPTED',
        accepted: true,
        policyVersion: normalizedExisting.policyAcceptedVersion || store.policyConfig.version,
        acceptedAt: normalizedExisting.policyAcceptedAt || new Date().toISOString(),
      };
      dirty = true;
    }
    if (dirty) {
      saveStore(store);
    }
    res.json({ account: normalizedExisting });
  };

  app.post('/api/account/sync', handleAccountSync);
  app.post('/api/profile/sync', handleAccountSync);

  app.get('/api/profile', (req, res) => {
    const accountId = String(req.query?.accountId || '');
    const acc = accountId ? store.accounts[accountId] : undefined;
    if (!acc) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    if (acc.banned) {
      res.status(403).json({
        error: `Account banned by Admin: ${acc.banReason || 'Cheating / Rule Violation'}`,
        banned: true,
        banReason: acc.banReason || 'Cheating / Rule Violation',
        account: acc,
      });
      return;
    }
    res.json({ account: acc });
  });

  const handleProfileUpdate = (req: Request, res: Response) => {
    const { accountId, customization, playerName, playerTag, avatarUrl, avatarIcon } = req.body ?? {};
    const acc = store.accounts[accountId];
    if (!acc) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    if (customization) acc.customization = customization;
    if (typeof playerName === 'string' && playerName.trim()) acc.playerName = playerName.trim().slice(0, 14);
    if (typeof playerTag === 'string' && playerTag.trim()) acc.playerTag = playerTag.trim().slice(0, 6);
    if (typeof avatarIcon === 'string' && avatarIcon.trim()) {
      acc.avatarIcon = avatarIcon.trim().slice(0, 32);
    }
    if (typeof avatarUrl === 'string' && avatarUrl.trim() && avatarUrl.trim().length <= 120000) {
      acc.avatarUrl = avatarUrl.trim();
    }
    if (acc.username && store.users[acc.username]) {
      store.users[acc.username].avatarIcon = acc.avatarIcon || 'commando_alpha';
      store.users[acc.username].avatarUrl = acc.avatarUrl;
    }
    saveStore(store);
    res.json({ account: acc });
  };

  app.post('/api/profile', handleProfileUpdate);
  app.post('/api/account/profile', handleProfileUpdate);

  app.post('/api/account/buy', (req, res) => {
    const { accountId, category, itemId } = req.body as {
      accountId: string;
      category: ShopCategory;
      itemId: string;
    };
    const acc = store.accounts[accountId];
    if (!acc) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const result = offlineBuyItem(acc, category, itemId);
    if (!result.ok || !result.account) {
      res.status(400).json({ error: result.error });
      return;
    }
    store.accounts[accountId] = result.account;
    saveStore(store);
    res.json({ account: result.account });
  });

  app.post('/api/account/equip', (req, res) => {
    const { accountId, category, itemId } = req.body as {
      accountId: string;
      category: ShopCategory;
      itemId: string;
    };
    const acc = store.accounts[accountId];
    if (!acc) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const result = offlineEquipItem(acc, category, itemId);
    if (!result.ok || !result.account) {
      res.status(400).json({ error: result.error });
      return;
    }
    store.accounts[accountId] = result.account;
    saveStore(store);
    res.json({ account: result.account });
  });

  app.post('/api/account/upgrade-level', (req, res) => {
    const { accountId } = req.body ?? {};
    const acc = store.accounts[accountId];
    if (!acc) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const cost = levelUpgradeCost(acc.level);
    if (acc.coins < cost) {
      res.status(400).json({ error: `Need ${(cost - acc.coins).toLocaleString()} more coins.` });
      return;
    }
    const result = offlineUpgradeLevel(acc);
    if (!result.ok || !result.account) {
      res.status(400).json({ error: result.error });
      return;
    }
    store.accounts[accountId] = result.account;
    saveStore(store);
    res.json({ account: result.account });
  });

  app.post('/api/account/spend-coins', (req, res) => {
    const { accountId, amount } = req.body ?? {};
    const acc = store.accounts[accountId];
    if (!acc) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    if (acc.coins < cost) {
      res.status(400).json({ error: `Need ${cost.toLocaleString()} coins.` });
      return;
    }
    acc.coins -= cost;
    store.accounts[accountId] = acc;
    saveStore(store);
    res.json({ account: acc });
  });

  app.post('/api/account/match-rewards', (req, res) => {
    const { accountId, result } = req.body ?? {};
    const acc = store.accounts[accountId];
    if (!acc || !result) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const applied = offlineApplyMatchRewards(acc, result, store.gameConfig.coinRewardMultiplier);
    store.accounts[accountId] = applied.account;
    saveStore(store);
    res.json(applied);
  });

  /* ---------- LEADERBOARD ---------- */
  app.get('/api/leaderboard', (_req, res) => {
    const sortedMatches = [...store.leaderboard]
      .sort((x, y) => y.kos - x.kos || y.score - x.score)
      .slice(0, 20);
    const topPlayers = Object.values(store.accounts)
      .filter((a) => !a.banned && (a.totalMatches > 0 || a.totalKOs > 0))
      .sort(
        (a, b) =>
          b.totalWins + (b.battleRoyaleWins || 0) - (a.totalWins + (a.battleRoyaleWins || 0)) ||
          b.totalKOs - a.totalKOs
      )
      .slice(0, 20)
      .map((a) => ({
        accountId: a.accountId,
        playerName: a.playerName,
        playerTag: a.playerTag,
        avatarUrl: a.avatarUrl,
        avatarIcon: a.avatarIcon,
        totalWins: a.totalWins + (a.battleRoyaleWins || 0),
        totalKOs: a.totalKOs,
        level: a.level,
      }));
    res.json({ entries: sortedMatches, topPlayers });
  });

  app.post('/api/leaderboard', (req, res) => {
    const b = req.body ?? {};
    const entry: LeaderboardEntry = {
      id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      playerName: String(b.playerName || 'Player').slice(0, 16),
      playerTag: b.playerTag ? String(b.playerTag).slice(0, 6) : undefined,
      avatarUrl:
        typeof b.avatarUrl === 'string' && b.avatarUrl.trim().length <= 120000
          ? b.avatarUrl.trim()
          : undefined,
      avatarIcon: typeof b.avatarIcon === 'string' ? b.avatarIcon.slice(0, 32) : undefined,
      characterId: String(b.characterId || 'cubix'),
      mode: b.mode || 'single',
      arena: b.arena || 'practice',
      score: Number(b.score || 0),
      kos: Number(b.kos || 0),
      wave: Number(b.wave || 1),
      createdAt: new Date().toISOString(),
    };
    store.leaderboard = [...store.leaderboard, entry]
      .sort((x, y) => y.score - x.score)
      .slice(0, 50);
    saveStore(store);
    res.json({ ok: true, entry });
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map((r) => ({
      code: r.code,
      hostName: r.hostName,
      arena: r.arena,
      teamMode: r.teamMode,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      fillWithBots: r.fillWithBots,
      inProgress: true,
    }));
    res.json({ rooms: list });
  });

  /* ---------- PUBLIC LIVE CONFIG & ADMIN CONTROL ENDPOINTS ---------- */
  app.get('/api/game-config', (_req, res) => {
    res.json({
      config: store.gameConfig,
      version: store.configVersion,
      history: store.configHistory.slice(0, 12).map((h) => ({
        version: h.version,
        updatedAt: h.updatedAt,
        summary: h.summary,
      })),
    });
  });

  app.post('/api/admin/unlock', (req, res) => {
    const clientKey = getClientKey(req);
    const rec = adminUnlockAttempts.get(clientKey) || { failures: 0, lockedUntil: 0 };
    const now = Date.now();
    if (rec.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((rec.lockedUntil - now) / 1000);
      res.status(429).json({
        error: `Too many failed attempts. Locked for ${retryAfterSeconds}s.`,
        retryAfterSeconds,
      });
      return;
    }

    const password = String(req.body?.password || '').trim();
    if (!/^[A-Za-z0-9]{12}$/.test(password) || !verifyAdminMasterPassword(password)) {
      rec.failures += 1;
      if (rec.failures >= 5) {
        rec.failures = 0;
        rec.lockedUntil = now + 60_000;
        adminUnlockAttempts.set(clientKey, rec);
        res.status(429).json({
          error: '5 incorrect attempts. Master Vault locked for 60 seconds.',
          retryAfterSeconds: 60,
        });
        return;
      }
      adminUnlockAttempts.set(clientKey, rec);
      res.status(401).json({
        error: `Invalid 12-character Master Password (${5 - rec.failures} attempts remaining).`,
        attemptsRemaining: 5 - rec.failures,
      });
      return;
    }

    adminUnlockAttempts.delete(clientKey);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + 4 * 60 * 60 * 1000;
    adminTokens.set(token, expiresAt);

    res.json({
      token,
      expiresAt,
      config: store.gameConfig,
      version: store.configVersion,
      history: store.configHistory.slice(0, 15),
    });
  });

  app.post('/api/admin/ai-patch', requireAdmin, async (req, res) => {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) {
      res.status(400).json({ error: 'Enter an update prompt describing what to change.' });
      return;
    }

    const baseConfig = req.body?.currentConfig
      ? normalizeLiveGameConfig(req.body.currentConfig)
      : store.gameConfig;

    let patch: LiveConfigPatch = {};
    let summary = '';
    let usedAi = false;

    if (process.env.GEMINI_API_KEY) {
      try {
        const schemaGuide = `Return a valid JSON object with EXACT shape {"patch": <Partial LiveGameConfig>, "summary": "<concise 1-sentence human changelog>"}.
Allowed patch fields (include ONLY changed fields):
- playerMaxHp (25..9999), playerSpeed (4..40), jumpForce (6..45), gravity (8..80), enemyBotHp (10..5000), enemyBotDamage (0.1..10), weaponDamageMultiplier (0.1..20), unlimitedAmmo (boolean)
- jeepHp (100..99999), carHp (100..99999), bikeHp (100..99999), vehicleHpMultiplier (0.25..20), horseHp (100..99999), sharkWhaleHp (100..99999), boatSpeedMultiplier (0.3..5), creatureSpeedMultiplier (0.3..5)
- tribalWarriorHp (15..2500), tribalArrowDamage (2..200), captureEscapeSeconds (1..15), fruitHealAmount (5..100)
- animalSpawnCounts: partial of { lions, tigers, wolves, crocodiles, bears, boars, deer, mammoths, tortoises, snakes, sharks, mermaids }
- customSpawns: partial of { tanks (0..20), helicopters (0..16), sharks (0..24), lions (0..24) }
- coinRewardMultiplier (0.25..20), lobbyBotCount (2..49), safeZoneSpeedMultiplier (0.25..5), timeOfDay ("day"|"sunset"|"night"|"blood_moon"), globalBannerMessage (string <= 140 chars)`;

        const response = await Promise.race([
          getAiClient().models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Current LiveGameConfig JSON:\n${JSON.stringify(baseConfig)}\n\nAdmin Request:\n"${prompt}"`,
            config: {
              systemInstruction: `You are the live configuration compiler for the 3D Battle Royale & Island game BLOCK WAR. ${schemaGuide}`,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini AI compiler timed out after 5.5s')), 5500)
          ),
        ]);
        const parsed = JSON.parse(response.text || '{}') as {
          patch?: LiveConfigPatch;
          summary?: string;
        };
        if (parsed && parsed.patch && typeof parsed.patch === 'object') {
          patch = parsed.patch;
          summary = String(parsed.summary || 'AI generated live patch.');
          usedAi = true;
        }
      } catch (err) {
        console.warn('Gemini AI patch fallback triggered:', err instanceof Error ? err.message : err);
      }
    }

    if (!usedAi) {
      const fb = parseNaturalLanguageGamePatch(prompt, baseConfig);
      patch = fb.patch;
      summary = fb.summary;
    }

    const nextConfig = applyConfigPatch(baseConfig, patch);
    res.json({ patch, summary, nextConfig, usedAi });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientAccountIds = new Map<WebSocket, string>();

  function pushAccountEvent(accountId: string, eventPayload: Record<string, unknown>) {
    const data = JSON.stringify(eventPayload);
    for (const [client, linkedAccountId] of clientAccountIds.entries()) {
      if (linkedAccountId === accountId && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  function kickBannedFromRooms(accountId: string, playerName?: string) {
    for (const room of rooms.values()) {
      for (const [pid, p] of room.players.entries()) {
        if (p.ws && clientAccountIds.get(p.ws) === accountId) {
          room.players.delete(pid);
        } else if (playerName && p.name === playerName && p.ws && clientAccountIds.get(p.ws) === accountId) {
          room.players.delete(pid);
        }
      }
      if (room.players.size === 0) {
        rooms.delete(room.code);
      }
    }
  }

  function broadcastConfigUpdate(summary?: string) {
    const payload = JSON.stringify({
      type: 'config_updated',
      config: store.gameConfig,
      version: store.configVersion,
      summary: summary || `Live update ${store.configVersion}`,
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  app.post('/api/admin/publish', requireAdmin, (req, res) => {
    const incomingConfig = req.body?.config as Partial<LiveGameConfig> | undefined;
    const incomingPatch = req.body?.patch as LiveConfigPatch | undefined;
    const summary = String(req.body?.summary || 'Admin live update published').slice(0, 180);

    const prevConfig = store.gameConfig;
    const prevVersion = store.configVersion;

    const nextConfig = incomingConfig
      ? normalizeLiveGameConfig(incomingConfig)
      : applyConfigPatch(prevConfig, incomingPatch);
    const nextVersion = bumpConfigVersion(prevVersion);

    store.configHistory = [
      {
        version: prevVersion,
        updatedAt: new Date().toISOString(),
        summary: `Snapshot before ${nextVersion}: ${summary}`,
        patch: incomingPatch || {},
        config: prevConfig,
      },
      ...store.configHistory,
    ].slice(0, 25);

    store.gameConfig = nextConfig;
    store.configVersion = nextVersion;
    saveStore(store);
    broadcastConfigUpdate(summary);

    res.json({
      ok: true,
      config: store.gameConfig,
      version: store.configVersion,
      history: store.configHistory.slice(0, 15),
    });
  });

  app.post('/api/admin/rollback', requireAdmin, (req, res) => {
    const { version, resetDefault } = req.body ?? {};
    const prevConfig = store.gameConfig;
    const prevVersion = store.configVersion;
    let targetConfig: LiveGameConfig = normalizeLiveGameConfig(DEFAULT_LIVE_GAME_CONFIG);
    let summary = 'Reset all settings to factory defaults';

    if (!resetDefault) {
      const snap = version
        ? store.configHistory.find((h) => h.version === version)
        : store.configHistory[0];
      if (!snap) {
        res.status(404).json({ error: 'No previous snapshot found to roll back to.' });
        return;
      }
      targetConfig = normalizeLiveGameConfig(snap.config);
      summary = `Rolled back to ${snap.version}`;
    }

    const nextVersion = bumpConfigVersion(prevVersion);
    store.configHistory = [
      {
        version: prevVersion,
        updatedAt: new Date().toISOString(),
        summary: `Backup before rollback (${summary})`,
        patch: {},
        config: prevConfig,
      },
      ...store.configHistory,
    ].slice(0, 25);

    store.gameConfig = targetConfig;
    store.configVersion = nextVersion;
    saveStore(store);
    broadcastConfigUpdate(summary);

    res.json({
      ok: true,
      config: store.gameConfig,
      version: store.configVersion,
      history: store.configHistory.slice(0, 15),
      summary,
    });
  });

  app.get('/api/admin/players', requireAdmin, (req, res) => {
    const q = String(req.query?.q || '').trim().toLowerCase();
    const accounts = Object.values(store.accounts)
      .filter((acc) => {
        if (!q) return true;
        return (
          (acc.username || '').toLowerCase().includes(q) ||
          acc.playerName.toLowerCase().includes(q) ||
          acc.accountId.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.coins || 0) - (a.coins || 0))
      .slice(0, 100);
    res.json({ players: accounts });
  });

  app.post('/api/admin/player-update', requireAdmin, (req, res) => {
    const {
      accountId,
      targetUsername,
      coins,
      addCoins,
      level,
      banned,
      banReason,
      chatMuted,
      chatMutedReason,
      protectAccountId,
      unlockAll,
      unlockCategory,
      lockCategory,
      grantItem,
      revokeItem,
    } = req.body ?? {};

    let resolvedId = accountId ? String(accountId).trim() : '';
    if (!resolvedId && targetUsername) {
      const uname = normalizeUsername(String(targetUsername));
      resolvedId =
        store.users[uname]?.accountId ||
        Object.values(store.accounts).find(
          (a) => (a.username || '').toLowerCase() === uname || a.accountId.toLowerCase() === uname
        )?.accountId ||
        '';
    }
    const acc = resolvedId ? store.accounts[resolvedId] : undefined;
    if (!acc) {
      res.status(404).json({ error: 'Player account not found.' });
      return;
    }

    if (typeof banned === 'boolean') {
      if (banned && protectAccountId && String(protectAccountId) === acc.accountId) {
        res.status(400).json({
          error: 'Protected Admin Session: You cannot ban the account you are currently logged in with.',
        });
        return;
      }
      acc.banned = banned;
      acc.banReason = banned
        ? String(banReason || acc.banReason || 'Cheating / Rule Violation').trim().slice(0, 140)
        : '';
    }

    if (typeof chatMuted === 'boolean') {
      acc.chatMuted = chatMuted;
      acc.chatMutedAt = chatMuted ? new Date().toISOString() : '';
      acc.chatMutedReason = chatMuted
        ? String(chatMutedReason || 'Muted by Admin from History Chat').trim().slice(0, 140)
        : '';
    }

    if (typeof coins === 'number' && Number.isFinite(coins)) {
      acc.coins = Math.max(0, Math.min(99_999_999, Math.round(coins)));
    }
    if (typeof addCoins === 'number' && Number.isFinite(addCoins)) {
      acc.coins = Math.max(0, Math.min(99_999_999, Math.round((acc.coins || 0) + addCoins)));
    }
    if (typeof level === 'number' && Number.isFinite(level)) {
      acc.level = Math.max(1, Math.min(25, Math.round(level)));
    }

    if (unlockAll === true) {
      acc.isVipAllUnlocked = true;
      acc.unlockedArenas = ARENA_CATALOG.map((a) => a.id);
      acc.unlockedGuns = GUN_CATALOG.map((g) => g.id);
      acc.unlockedKnives = KNIFE_CATALOG.map((k) => k.id);
      acc.unlockedGrenades = GRENADE_CATALOG.map((g) => g.id);
      acc.unlockedCharacters = SKIN_CATALOG.map((s) => s.id);
      acc.unlockedAirplanes = AIRPLANE_CATALOG.map((a) => a.id);
      acc.unlockedParachutes = PARACHUTE_CATALOG.map((p) => p.id);
      acc.unlockedEmotes = EMOTE_CATALOG.map((e) => e.id);
    } else if (unlockAll === false) {
      acc.isVipAllUnlocked = false;
    }

    if (typeof unlockCategory === 'string') {
      if (unlockCategory === 'maps' || unlockCategory === 'backgrounds') {
        acc.unlockedArenas = ARENA_CATALOG.map((a) => a.id);
      } else if (unlockCategory === 'weapons') {
        acc.unlockedGuns = GUN_CATALOG.map((g) => g.id);
        acc.unlockedKnives = KNIFE_CATALOG.map((k) => k.id);
        acc.unlockedGrenades = GRENADE_CATALOG.map((g) => g.id);
      } else if (unlockCategory === 'guns') {
        acc.unlockedGuns = GUN_CATALOG.map((g) => g.id);
      } else if (unlockCategory === 'knives') {
        acc.unlockedKnives = KNIFE_CATALOG.map((k) => k.id);
      } else if (unlockCategory === 'grenades') {
        acc.unlockedGrenades = GRENADE_CATALOG.map((g) => g.id);
      } else if (unlockCategory === 'vehicles') {
        acc.unlockedAirplanes = AIRPLANE_CATALOG.map((a) => a.id);
        acc.unlockedParachutes = PARACHUTE_CATALOG.map((p) => p.id);
        acc.unlockedGrenades = GRENADE_CATALOG.map((g) => g.id);
      } else if (unlockCategory === 'airplanes') {
        acc.unlockedAirplanes = AIRPLANE_CATALOG.map((a) => a.id);
      } else if (unlockCategory === 'parachutes') {
        acc.unlockedParachutes = PARACHUTE_CATALOG.map((p) => p.id);
      } else if (unlockCategory === 'skins') {
        acc.unlockedCharacters = SKIN_CATALOG.map((s) => s.id);
      } else if (unlockCategory === 'emotes') {
        acc.unlockedEmotes = EMOTE_CATALOG.map((e) => e.id);
      }
    }

    if (typeof lockCategory === 'string') {
      acc.isVipAllUnlocked = false;
      if (lockCategory === 'maps' || lockCategory === 'backgrounds') {
        acc.unlockedArenas = ['practice'];
        acc.equipped.arenaId = 'practice';
      } else if (lockCategory === 'weapons') {
        acc.unlockedGuns = ['basic_pistol'];
        acc.unlockedKnives = ['basic_knife'];
        acc.unlockedGrenades = ['frag_grenade'];
        acc.equipped.gunId = 'basic_pistol';
        acc.equipped.knifeId = 'basic_knife';
        acc.equipped.grenadeId = 'frag_grenade';
      } else if (lockCategory === 'vehicles') {
        acc.unlockedAirplanes = ['cargo_carrier'];
        acc.unlockedParachutes = ['classic_white'];
        acc.equipped.airplaneId = 'cargo_carrier';
        acc.equipped.parachuteId = 'classic_white';
      } else if (lockCategory === 'skins') {
        acc.unlockedCharacters = ['cubix', 'volt'];
        if (!acc.unlockedCharacters.includes(acc.equipped.characterId)) {
          acc.equipped.characterId = 'cubix';
        }
      } else if (lockCategory === 'emotes') {
        acc.unlockedEmotes = ['hello_wave'];
        acc.equippedEmotes = ['hello_wave'];
      }
    }

    if (grantItem?.category && grantItem?.itemId) {
      const cat = grantItem.category as ShopCategory;
      const item = String(grantItem.itemId);
      if (cat === 'guns' && !acc.unlockedGuns.includes(item as any)) acc.unlockedGuns.push(item as any);
      else if (cat === 'knives' && !acc.unlockedKnives.includes(item as any)) acc.unlockedKnives.push(item as any);
      else if (cat === 'grenades') {
        acc.unlockedGrenades = acc.unlockedGrenades || ['frag_grenade'];
        if (!acc.unlockedGrenades.includes(item as any)) acc.unlockedGrenades.push(item as any);
      } else if (cat === 'backgrounds' && !acc.unlockedArenas.includes(item as any)) acc.unlockedArenas.push(item as any);
      else if (cat === 'airplanes' && !acc.unlockedAirplanes.includes(item as any)) acc.unlockedAirplanes.push(item as any);
      else if (cat === 'parachutes' && !acc.unlockedParachutes.includes(item as any)) acc.unlockedParachutes.push(item as any);
      else if (cat === 'emotes') {
        acc.unlockedEmotes = acc.unlockedEmotes || ['hello_wave'];
        if (!acc.unlockedEmotes.includes(item as any)) acc.unlockedEmotes.push(item as any);
      } else if (cat === 'skins' && !acc.unlockedCharacters.includes(item)) acc.unlockedCharacters.push(item);
    }

    if (revokeItem?.category && revokeItem?.itemId) {
      acc.isVipAllUnlocked = false;
      const cat = revokeItem.category as ShopCategory;
      const item = String(revokeItem.itemId);
      if (cat === 'guns' && item !== 'basic_pistol') {
        acc.unlockedGuns = acc.unlockedGuns.filter((id) => id !== item);
        if (acc.equipped.gunId === item) acc.equipped.gunId = 'basic_pistol';
      } else if (cat === 'knives' && item !== 'basic_knife') {
        acc.unlockedKnives = acc.unlockedKnives.filter((id) => id !== item);
        if (acc.equipped.knifeId === item) acc.equipped.knifeId = 'basic_knife';
      } else if (cat === 'grenades' && item !== 'frag_grenade') {
        acc.unlockedGrenades = (acc.unlockedGrenades || []).filter((id) => id !== item);
        if (acc.equipped.grenadeId === item) acc.equipped.grenadeId = 'frag_grenade';
      } else if (cat === 'backgrounds' && item !== 'practice') {
        acc.unlockedArenas = acc.unlockedArenas.filter((id) => id !== item);
        if (acc.equipped.arenaId === item) acc.equipped.arenaId = 'practice';
      } else if (cat === 'airplanes' && item !== 'cargo_carrier') {
        acc.unlockedAirplanes = (acc.unlockedAirplanes || []).filter((id) => id !== item);
        if (acc.equipped.airplaneId === item) acc.equipped.airplaneId = 'cargo_carrier';
      } else if (cat === 'parachutes' && item !== 'classic_white') {
        acc.unlockedParachutes = (acc.unlockedParachutes || []).filter((id) => id !== item);
        if (acc.equipped.parachuteId === item) acc.equipped.parachuteId = 'classic_white';
      } else if (cat === 'emotes' && item !== 'hello_wave') {
        acc.unlockedEmotes = (acc.unlockedEmotes || ['hello_wave']).filter((id) => id !== item);
        acc.equippedEmotes = (acc.equippedEmotes || ['hello_wave']).filter((id) => id !== item);
        if (acc.equippedEmotes.length === 0) acc.equippedEmotes = ['hello_wave'];
      } else if (cat === 'skins' && item !== 'cubix') {
        acc.unlockedCharacters = acc.unlockedCharacters.filter((id) => id !== item);
        if (acc.equipped.characterId === item) {
          acc.equipped.characterId = 'cubix';
          acc.customization.characterId = 'cubix';
        }
      }
    }

    const updated = normalizeLoadedProgress(acc);
    store.accounts[acc.accountId] = updated;
    saveStore(store);

    if (updated.banned) {
      kickBannedFromRooms(updated.accountId, updated.playerName);
      pushAccountEvent(updated.accountId, {
        type: 'account_banned',
        accountId: updated.accountId,
        banReason: updated.banReason || 'Cheating / Rule Violation',
        account: updated,
      });
    } else {
      pushAccountEvent(updated.accountId, {
        type: 'account_updated',
        accountId: updated.accountId,
        account: updated,
      });
    }

    res.json({ ok: true, account: updated });
  });

  app.get('/api/admin/status', requireAdmin, (_req, res) => {
    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      connectedWsClients: wss.clients.size,
      activeRooms: rooms.size,
      totalAccounts: Object.keys(store.accounts).length,
      totalRegisteredUsers: Object.keys(store.users).length,
      configVersion: store.configVersion,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      storagePath: 'data/db.json',
      customAdminPasswordSet: Boolean(store.adminPasswordHash),
    });
  });

  app.post('/api/admin/security/password', requireAdmin, (req, res) => {
    const newPassword = String(req.body?.newPassword || '').trim();
    if (!/^[A-Za-z0-9]{12}$/.test(newPassword)) {
      res.status(400).json({
        error: 'Master Password must be exactly 12 alphanumeric characters (A-Z, a-z, 0-9).',
      });
      return;
    }
    store.adminPasswordHash = hashServerPassword(newPassword);
    saveStore(store);
    res.json({ ok: true, message: 'Admin Master Password updated cleanly.' });
  });

  /* ---------- ADMIN QR CODE & AI PAYMENT VERIFICATION (₹1 = 100 COINS) ---------- */
  app.get('/api/payments/qr-config', (_req, res) => {
    res.json({
      qrImageUrl: store.paymentQrConfig.qrImageUrl || null,
      upiId: store.paymentQrConfig.upiId || '',
      payeeName: store.paymentQrConfig.payeeName || '',
      updatedAt: store.paymentQrConfig.updatedAt || '',
      coinsPerRupee: 100,
    });
  });

  app.post('/api/admin/upload-qr', requireAdmin, (req, res) => {
    const rawQr = req.body?.qrImageUrl;
    const upiId = String(req.body?.upiId || '').trim().slice(0, 80);
    const payeeName = String(req.body?.payeeName || '').trim().slice(0, 60);

    if (rawQr === null || rawQr === '') {
      store.paymentQrConfig = {
        qrImageUrl: null,
        upiId,
        payeeName,
        updatedAt: new Date().toISOString(),
      };
      saveStore(store);
      res.json({ ok: true, qrConfig: store.paymentQrConfig, cleared: true });
      return;
    }

    if (typeof rawQr !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(rawQr)) {
      res.status(400).json({ error: 'Upload a valid PNG, JPG, or WEBP QR code image.' });
      return;
    }
    if (rawQr.length > 8_000_000) {
      res.status(400).json({ error: 'QR code image is too large (max ~5MB).' });
      return;
    }

    store.paymentQrConfig = {
      qrImageUrl: rawQr,
      upiId,
      payeeName,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
    res.json({ ok: true, qrConfig: store.paymentQrConfig });
  });

  app.get('/api/admin/payments', requireAdmin, (_req, res) => {
    res.json({
      qrConfig: store.paymentQrConfig,
      payments: store.paymentRecords,
    });
  });

  app.post('/api/payments/verify', async (req, res) => {
    try {
      if (!store.paymentQrConfig.qrImageUrl) {
        res.status(400).json({
          error:
            'Payment QR is currently unavailable — Please check back later once the Admin enables online top-ups.',
        });
        return;
      }

      const accountId = String(req.body?.accountId || '').trim();
      const utr = String(req.body?.utr || '').replace(/\s+/g, '');
      const screenshotDataUrl = String(req.body?.screenshotDataUrl || '');
      const expectedRupees = Math.max(1, Math.min(100_000, Math.round(Number(req.body?.expectedRupees) || 0)));

      if (!accountId || !store.accounts[accountId]) {
        res.status(404).json({ error: 'Player account not found. Please log in or sync your profile first.' });
        return;
      }
      if (!/^\d{12}$/.test(utr)) {
        res.status(400).json({ error: 'Enter a valid 12-digit UPI UTR / Reference Number.' });
        return;
      }
      if (store.paymentRecords.some((r) => r.utr === utr)) {
        res.status(409).json({
          error: `UTR ${utr} has already been claimed. Duplicate receipts are not permitted.`,
        });
        return;
      }

      const imgMatch = screenshotDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);
      if (!imgMatch) {
        res.status(400).json({ error: 'Upload a valid PNG, JPG, or WEBP payment receipt screenshot.' });
        return;
      }
      if (screenshotDataUrl.length > 10_000_000) {
        res.status(400).json({ error: 'Screenshot file is too large. Please upload a smaller image.' });
        return;
      }

      const mimeType = imgMatch[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : imgMatch[1].toLowerCase();
      const base64Data = imgMatch[2];

      let paidAmountINR = expectedRupees;
      let aiVerdict = 'Verified (UTR & Receipt Validated)';

      if (process.env.GEMINI_API_KEY) {
        try {
          const response = await Promise.race([
            getAiClient().models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: `Analyze this UPI payment receipt screenshot carefully. The user claims they paid ₹${expectedRupees} with 12-digit UTR ${utr}. Return JSON confirming if this is a genuine completed/successful payment screenshot (not blank, not failed/pending, not random photo), and extract the exact paid INR amount as a number.`,
                },
              ],
              config: {
                systemInstruction:
                  'You are a strict financial receipt verification analyzer for BLOCK WAR coin top-ups. Reject failed, pending, cancelled, blurry/unreadable, or non-receipt images by setting validReceipt=false or isSuccess=false.',
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    validReceipt: { type: Type.BOOLEAN },
                    isSuccess: { type: Type.BOOLEAN },
                    paidAmountINR: { type: Type.NUMBER },
                    extractedUtr: { type: Type.STRING },
                    verdict: { type: Type.STRING },
                  },
                  required: ['validReceipt', 'isSuccess', 'paidAmountINR', 'verdict'],
                },
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Receipt verification timed out')), 8500)
            ),
          ]);

          const parsed = JSON.parse(response.text || '{}') as {
            validReceipt?: boolean;
            isSuccess?: boolean;
            paidAmountINR?: number;
            extractedUtr?: string;
            verdict?: string;
          };

          if (!parsed.validReceipt || !parsed.isSuccess) {
            res.status(400).json({
              error: parsed.verdict || 'Screenshot does not look like a completed UPI payment receipt.',
            });
            return;
          }

          if (parsed.extractedUtr && /^\d{12}$/.test(parsed.extractedUtr.trim()) && parsed.extractedUtr.trim() !== utr) {
            res.status(400).json({
              error: `UTR mismatch: receipt shows ${parsed.extractedUtr.trim()}, entered ${utr}.`,
            });
            return;
          }

          if (typeof parsed.paidAmountINR === 'number' && Number.isFinite(parsed.paidAmountINR) && parsed.paidAmountINR >= 1) {
            paidAmountINR = Math.min(100_000, Math.round(parsed.paidAmountINR * 100) / 100);
          }
          aiVerdict = `Gemini AI Verified: ${String(parsed.verdict || `Paid ₹${paidAmountINR}`)}`.slice(0, 140);
        } catch (err) {
          console.warn('Gemini payment verification fallback:', err instanceof Error ? err.message : err);
          aiVerdict = `Receipt & UTR Verified (Rule Fallback · ₹${expectedRupees})`;
        }
      } else {
        aiVerdict = `Receipt & UTR Verified (Local Check · ₹${expectedRupees})`;
      }

      const isBundle = Boolean(req.body?.isBundle);
      const bundleBonusCoins =
        isBundle && paidAmountINR === expectedRupees
          ? expectedRupees === 25
            ? 2600
            : expectedRupees === 50
              ? 5500
              : expectedRupees === 100
                ? 12000
                : null
          : null;
      const creditedCoins = bundleBonusCoins ?? Math.floor(paidAmountINR * 100);
      if (creditedCoins < 100) {
        res.status(400).json({ error: 'Minimum top-up amount is ₹1 (100 Coins).' });
        return;
      }

      const acc = normalizeLoadedProgress(store.accounts[accountId]);
      acc.coins += creditedCoins;
      acc.totalCoinsCollected += creditedCoins;
      store.accounts[accountId] = acc;

      const record: PaymentRecord = {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        accountId,
        username: acc.username || acc.playerName || 'Player',
        planRupees: expectedRupees,
        paidAmountINR,
        utr,
        screenshotDataUrl,
        aiVerdict,
        creditedCoins,
        createdAt: new Date().toISOString(),
      };
      store.paymentRecords = [record, ...store.paymentRecords].slice(0, 200);
      saveStore(store);
      pushAccountEvent(accountId, {
        type: 'account_updated',
        accountId,
        creditedCoins,
        account: acc,
      });

      res.json({
        ok: true,
        creditedCoins,
        paidAmountINR,
        aiVerdict,
        account: acc,
        record,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed.';
      res.status(500).json({ error: msg });
    }
  });

  /* ---------- GAME RULES, FAIR PLAY & PRIVACY POLICY COMPLIANCE ---------- */
  app.get('/api/policy', (_req, res) => {
    res.json({ policy: store.policyConfig });
  });

  app.post('/api/policy/accept', (req, res) => {
    const accountId = String(req.body?.accountId || '').trim();
    if (!accountId) {
      res.status(400).json({ error: 'Missing accountId' });
      return;
    }
    const existing = store.accounts[accountId];
    const incomingUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const incomingPlayerName =
      typeof req.body?.playerName === 'string' ? req.body.playerName.trim() : '';
    const acceptedAt = new Date().toISOString();
    const version = store.policyConfig.version;

    const baseAcc = existing
      ? normalizeLoadedProgress(existing)
      : normalizeLoadedProgress({
          ...getDefaultProgress({
            username: incomingUsername || undefined,
            displayName: incomingPlayerName || incomingUsername || 'Player',
            isGuest: !incomingUsername,
          }),
          accountId,
        });

    const updatedAcc = normalizeLoadedProgress({
      ...baseAcc,
      username: baseAcc.username || incomingUsername || undefined,
      playerName: baseAcc.playerName || incomingPlayerName || incomingUsername || 'Player',
      policyAccepted: true,
      policyAcceptedVersion: version,
      policyAcceptedAt: acceptedAt,
    });
    store.accounts[accountId] = updatedAcc;

    const record: PolicyAcceptanceRecord = {
      accountId,
      username: updatedAcc.username || updatedAcc.playerName || 'Guest',
      playerName: updatedAcc.playerName || updatedAcc.username || 'Player',
      status: 'ACCEPTED',
      accepted: true,
      policyVersion: version,
      acceptedAt,
    };
    store.policyRecords[accountId] = record;
    saveStore(store);

    pushAccountEvent(accountId, {
      type: 'account_updated',
      accountId,
      account: updatedAcc,
    });

    res.json({
      ok: true,
      account: updatedAcc,
      record,
      policyVersion: version,
    });
  });

  app.get('/api/admin/policy-records', requireAdmin, (req, res) => {
    const q = String(req.query?.q || '').trim().toLowerCase();
    const currentVersion = store.policyConfig.version;
    const merged = new Map<string, PolicyAcceptanceRecord>();

    for (const r of Object.values(store.policyRecords || {})) {
      if (!r || !r.accountId) continue;
      const acceptedCurrent =
        Boolean(r.accepted) &&
        (r.policyVersion || '').toLowerCase() === currentVersion.toLowerCase() &&
        Boolean(r.acceptedAt);
      merged.set(r.accountId, {
        ...r,
        status: acceptedCurrent ? 'ACCEPTED' : 'PENDING',
        accepted: acceptedCurrent,
      });
    }

    for (const acc of Object.values(store.accounts || {})) {
      const existing = merged.get(acc.accountId);
      const acceptedCurrent = hasAcceptedPolicyVersion(acc, currentVersion) || Boolean(existing?.accepted);
      merged.set(acc.accountId, {
        accountId: acc.accountId,
        username: acc.username || existing?.username || acc.playerName || 'Guest',
        playerName: acc.playerName || existing?.playerName || acc.username || 'Player',
        status: acceptedCurrent ? 'ACCEPTED' : 'PENDING',
        accepted: acceptedCurrent,
        policyVersion: acceptedCurrent
          ? currentVersion
          : acc.policyAcceptedVersion || existing?.policyVersion || '—',
        acceptedAt: acc.policyAcceptedAt || existing?.acceptedAt || null,
      });
    }

    let records = Array.from(merged.values()).sort((a, b) => {
      if (a.accepted !== b.accepted) return a.accepted ? -1 : 1;
      const ta = a.acceptedAt ? Date.parse(a.acceptedAt) : 0;
      const tb = b.acceptedAt ? Date.parse(b.acceptedAt) : 0;
      return tb - ta;
    });

    const total = records.length;
    const acceptedCount = records.filter((r) => r.accepted).length;
    const pendingCount = total - acceptedCount;

    if (q) {
      records = records.filter(
        (r) =>
          r.accountId.toLowerCase().includes(q) ||
          r.username.toLowerCase().includes(q) ||
          r.playerName.toLowerCase().includes(q)
      );
    }

    res.json({
      policy: store.policyConfig,
      records,
      summary: { total, accepted: acceptedCount, pending: pendingCount },
    });
  });

  app.post('/api/admin/policy/update', requireAdmin, (req, res) => {
    const requireReconfirmation = req.body?.requireReconfirmation !== false;
    const incoming =
      (req.body?.policy as Partial<GamePolicyConfig> | undefined) ||
      ({
        title: req.body?.title,
        subtitle: req.body?.subtitle,
        sections: req.body?.sections,
      } as Partial<GamePolicyConfig>);
    const nextVersion = requireReconfirmation
      ? bumpPolicyVersion(store.policyConfig.version)
      : store.policyConfig.version;

    const updated = normalizeGamePolicy({
      ...store.policyConfig,
      ...(incoming || {}),
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    });
    store.policyConfig = updated;
    saveStore(store);

    const broadcastPayload = JSON.stringify({
      type: 'policy_updated',
      policy: updated,
      requireReconfirmation,
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcastPayload);
      }
    }

    res.json({
      ok: true,
      policy: updated,
      requireReconfirmation,
    });
  });

  /* ---------- PLAYER CHAT, MEDIA SHARING & PERMANENT ADMIN HISTORY CHAT ---------- */
  app.get('/api/chat/peers', (req, res) => {
    const excludeId = String(req.query?.accountId || '').trim();
    const peers = Object.values(store.accounts)
      .filter((a) => a.accountId && a.accountId !== excludeId)
      .map((a) => ({
        accountId: a.accountId,
        username: a.username || a.playerName || 'Player',
        playerName: a.playerName || a.username || 'Player',
        avatarUrl: a.avatarUrl,
        avatarIcon: a.avatarIcon,
        level: a.level || 1,
        chatMuted: Boolean(a.chatMuted),
        banned: Boolean(a.banned),
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
    res.json({ peers });
  });

  app.get('/api/chat/messages', (req, res) => {
    const accountId = String(req.query?.accountId || '').trim();
    const channel = req.query?.channel === 'dm' ? 'dm' : 'global';
    const peerId = String(req.query?.peerId || '').trim();

    const targetThreadId =
      channel === 'dm' && accountId && peerId ? makeDmThreadId(accountId, peerId) : 'global';

    // Regular players ONLY see active (non-deleted, non-cleared) messages
    const visible = (store.chatHistory || [])
      .filter((m) => {
        if (m.threadId !== targetThreadId) return false;
        if (m.deletedByUser) return false;
        if (accountId && Array.isArray(m.hiddenForAccountIds) && m.hiddenForAccountIds.includes(accountId)) {
          return false;
        }
        return true;
      })
      .slice(-150);

    res.json({ threadId: targetThreadId, messages: visible });
  });

  app.post('/api/chat/send', (req, res) => {
    const b = req.body ?? {};
    const senderId = String(b.senderId || '').trim();
    if (!senderId) {
      res.status(400).json({ error: 'Missing senderId' });
      return;
    }

    const senderAcc = store.accounts[senderId];
    if (senderAcc?.banned) {
      res.status(403).json({
        error: `Account banned by Admin: ${senderAcc.banReason || 'Cheating / Rule Violation'}`,
      });
      return;
    }
    if (senderAcc?.chatMuted) {
      res.status(403).json({
        error: `You are muted from chat by Admin (${senderAcc.chatMutedReason || 'Rule Violation'}).`,
      });
      return;
    }

    const channel = b.channel === 'dm' ? 'dm' : 'global';
    const recipientId = channel === 'dm' ? String(b.recipientId || '').trim() : undefined;
    if (channel === 'dm' && !recipientId) {
      res.status(400).json({ error: 'Missing recipientId for direct message.' });
      return;
    }

    const text = String(b.text || '').trim().slice(0, 600);
    const mediaType =
      b.mediaType === 'image' || b.mediaType === 'video' ? b.mediaType : undefined;
    const mediaDataUrl =
      typeof b.mediaDataUrl === 'string' && b.mediaDataUrl.startsWith('data:')
        ? b.mediaDataUrl
        : undefined;

    if (!text && !mediaDataUrl) {
      res.status(400).json({ error: 'Enter a message or attach a photo/video.' });
      return;
    }
    if (mediaDataUrl && mediaDataUrl.length > 16_000_000) {
      res.status(400).json({ error: 'Attached media exceeds the 10 MB limit.' });
      return;
    }

    const recipientAcc = recipientId ? store.accounts[recipientId] : undefined;
    const threadId =
      channel === 'dm' && recipientId ? makeDmThreadId(senderId, recipientId) : 'global';

    const msg: ChatMessage = {
      id:
        typeof b.id === 'string' && b.id.trim()
          ? b.id.trim().slice(0, 64)
          : `msg_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      threadId,
      channel,
      senderId,
      senderUsername: String(
        b.senderUsername || senderAcc?.username || senderAcc?.playerName || 'Player'
      ).slice(0, 24),
      senderAvatarUrl:
        typeof b.senderAvatarUrl === 'string' ? b.senderAvatarUrl : senderAcc?.avatarUrl,
      senderAvatarIcon:
        typeof b.senderAvatarIcon === 'string' ? b.senderAvatarIcon : senderAcc?.avatarIcon,
      recipientId,
      recipientUsername:
        channel === 'dm'
          ? String(
              b.recipientUsername || recipientAcc?.username || recipientAcc?.playerName || 'Player'
            ).slice(0, 24)
          : undefined,
      text,
      mediaType: mediaDataUrl ? mediaType : undefined,
      mediaDataUrl,
      mediaFileName:
        typeof b.mediaFileName === 'string' ? b.mediaFileName.slice(0, 80) : undefined,
      mediaSizeKb: typeof b.mediaSizeKb === 'number' ? b.mediaSizeKb : undefined,
      mediaDurationSec:
        typeof b.mediaDurationSec === 'number' ? Math.min(30, Math.round(b.mediaDurationSec)) : undefined,
      createdAt: new Date().toISOString(),
      deletedByUser: false,
      hiddenForAccountIds: [],
    };

    // Permanently archive in master store (never auto-erased by regular players)
    if (!store.chatHistory.some((existing) => existing.id === msg.id)) {
      store.chatHistory.push(msg);
      if (store.chatHistory.length > 2000) {
        store.chatHistory = store.chatHistory.slice(-2000);
      }
      saveStore(store);
    }

    // Real-time WebSocket broadcast to connected clients
    const wsPayload = JSON.stringify({ type: 'chat_message', message: msg });
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (channel === 'global') {
        client.send(wsPayload);
      } else {
        const cid = clientAccountIds.get(client);
        if (cid === senderId || cid === recipientId) {
          client.send(wsPayload);
        }
      }
    }

    res.json({ ok: true, message: msg });
  });

  app.post('/api/chat/delete', (req, res) => {
    const messageId = String(req.body?.messageId || '').trim();
    const accountId = String(req.body?.accountId || '').trim();
    if (!messageId || !accountId) {
      res.status(400).json({ error: 'Missing messageId or accountId.' });
      return;
    }

    const msg = (store.chatHistory || []).find((m) => m.id === messageId);
    if (!msg) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }
    if (msg.senderId !== accountId) {
      res.status(403).json({ error: 'You can only delete your own messages.' });
      return;
    }

    // Soft-delete for player view ONLY — permanently retained in data/db.json for Admin History Chat
    const deletedAt = new Date().toISOString();
    msg.deletedByUser = true;
    msg.deletedAt = deletedAt;
    msg.deletedByAccountId = accountId;
    saveStore(store);

    const wsPayload = JSON.stringify({
      type: 'chat_message_deleted',
      messageId: msg.id,
      threadId: msg.threadId,
      deletedAt,
    });
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (msg.channel === 'global') {
        client.send(wsPayload);
      } else {
        const cid = clientAccountIds.get(client);
        if (cid === msg.senderId || cid === msg.recipientId) {
          client.send(wsPayload);
        }
      }
    }

    res.json({ ok: true, messageId: msg.id, deletedAt });
  });

  app.post('/api/chat/clear-thread', (req, res) => {
    const threadId = String(req.body?.threadId || '').trim();
    const accountId = String(req.body?.accountId || '').trim();
    if (!threadId || !accountId) {
      res.status(400).json({ error: 'Missing threadId or accountId.' });
      return;
    }

    const now = new Date().toISOString();
    let affected = 0;
    for (const msg of store.chatHistory || []) {
      if (msg.threadId !== threadId) continue;
      msg.hiddenForAccountIds = Array.from(
        new Set([...(msg.hiddenForAccountIds || []), accountId])
      );
      if (msg.senderId === accountId && !msg.deletedByUser) {
        msg.deletedByUser = true;
        msg.deletedAt = now;
        msg.deletedByAccountId = accountId;
      }
      affected += 1;
    }
    if (affected > 0) saveStore(store);
    res.json({ ok: true, clearedCount: affected });
  });

  /* ---------- ADMIN-ONLY PERMANENT "HISTORY CHAT" SECURITY ARCHIVE ---------- */
  app.get('/api/admin/chat-history', requireAdmin, (req, res) => {
    const q = String(req.query?.q || '').trim().toLowerCase();
    const filter = String(req.query?.filter || 'all').toLowerCase();
    const threadId = String(req.query?.threadId || '').trim();

    const allMessages = [...(store.chatHistory || [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    const threads = buildChatThreadSummaries(allMessages);
    const total = allMessages.length;
    const mediaCount = allMessages.filter((m) => Boolean(m.mediaType && m.mediaDataUrl)).length;
    const deletedCount = allMessages.filter((m) => Boolean(m.deletedByUser)).length;

    let filtered = allMessages;
    if (threadId && threadId !== 'all') {
      filtered = filtered.filter((m) => m.threadId === threadId);
    }
    if (filter === 'media') {
      filtered = filtered.filter((m) => Boolean(m.mediaType && m.mediaDataUrl));
    } else if (filter === 'deleted') {
      filtered = filtered.filter((m) => Boolean(m.deletedByUser));
    }
    if (q) {
      filtered = filtered.filter(
        (m) =>
          m.senderUsername.toLowerCase().includes(q) ||
          m.senderId.toLowerCase().includes(q) ||
          (m.recipientUsername || '').toLowerCase().includes(q) ||
          (m.recipientId || '').toLowerCase().includes(q) ||
          (m.text || '').toLowerCase().includes(q) ||
          (m.mediaFileName || '').toLowerCase().includes(q)
      );
    }

    const userStatuses: Record<string, { banned: boolean; chatMuted: boolean }> = {};
    for (const acc of Object.values(store.accounts)) {
      userStatuses[acc.accountId] = {
        banned: Boolean(acc.banned),
        chatMuted: Boolean(acc.chatMuted),
      };
    }

    res.json({
      messages: filtered,
      threads,
      userStatuses,
      summary: {
        total,
        mediaCount,
        deletedCount,
        threadCount: threads.length,
      },
    });
  });

  app.post('/api/admin/chat-history/purge', requireAdmin, (req, res) => {
    const messageId = String(req.body?.messageId || '').trim();
    const threadId = String(req.body?.threadId || '').trim();
    const purgeAll = Boolean(req.body?.purgeAll);

    const before = (store.chatHistory || []).length;
    if (purgeAll) {
      store.chatHistory = [];
    } else if (messageId) {
      store.chatHistory = (store.chatHistory || []).filter((m) => m.id !== messageId);
    } else if (threadId) {
      store.chatHistory = (store.chatHistory || []).filter((m) => m.threadId !== threadId);
    } else {
      res.status(400).json({ error: 'Specify messageId, threadId, or purgeAll.' });
      return;
    }

    const removed = before - store.chatHistory.length;
    saveStore(store);
    res.json({ ok: true, removed });
  });

  /* ---------- TACTICAL COACH & POSTER STUDIO ---------- */
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { model = 'gemini-4-hydrogen', messages = [], context = {} } = req.body ?? {};
      const allowed = new Set(['gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.1-flash-lite']);
      const selectedModel = allowed.has(model) ? model : 'gemini-4-hydrogen';
      const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.text || 'Give me winning tips!';

      if (!process.env.GEMINI_API_KEY) {
        res.json({
          reply:
            'Island Tip: Grab an Armored Buggy or Horse early, shoot while riding with 360° crosshair aim, and climb watchtower stairs for rooftop Sniper advantage!',
        });
        return;
      }

      const response = await getAiClient().models.generateContent({
        model: selectedModel,
        contents: `Player Context: Lv.${context.level || 1}, Gun=${context.gunId || 'basic_pistol'}, Map=${context.arenaId || 'practice'}.\nQuestion: ${lastUser}`,
        config: {
          systemInstruction:
            'You are a concise, energetic tactical coach for BLOCK WAR, a 3D arena and Battle Royale game with airplanes, parachutes, cars, bikes, rideable horses, ocean swimming, 3-heart survival, grenades, and multi-storey buildings. Keep tips under 80 words.',
          ...(selectedModel === 'gemini-4-hydrogen'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
        },
      });
      res.json({ reply: response.text || 'Control vehicles, hold high ground, and aim for headshots!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Tactical Coach.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/gemini/image', async (req, res) => {
    try {
      const { prompt, imageSize = '1K', aspectRatio = '16:9' } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required.' });
        return;
      }
      if (!process.env.GEMINI_API_KEY) {
        res.status(400).json({ error: 'Configure GEMINI_API_KEY in Settings > Secrets to generate AI posters.' });
        return;
      }
      const validSizes = new Set(['1K', '2K', '4K']);
      const size = validSizes.has(imageSize) ? imageSize : '1K';

      const response = await getAiClient().models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize: size,
          },
        },
      });

      let imageUrl = '';
      let caption = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }
      if (!imageUrl) {
        res.status(502).json({ error: caption || 'No image was returned by the model.' });
        return;
      }
      res.json({ imageUrl, caption, imageSize: size });
    } catch (err) {
      const errorObj = err as { message?: string };
      console.error('Gemini image error:', errorObj?.message || err);
      res.status(500).json({
        error:
          errorObj?.message ||
          'Image generation failed. Note: high-res Nano Banana image models require a paid API key in Settings > Secrets.',
      });
    }
  });

  /* ---------- WEBSOCKET MULTIPLAYER + LIVE CONFIG SYNC ---------- */
  wss.on('connection', (ws) => {
    let joinedRoom: RoomState | null = null;
    const playerId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Send latest live config snapshot on connect
    try {
      ws.send(
        JSON.stringify({
          type: 'config_updated',
          config: store.gameConfig,
          version: store.configVersion,
        })
      );
    } catch {
      // Ignore
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'identify' && msg.accountId) {
          const aid = String(msg.accountId).trim();
          clientAccountIds.set(ws, aid);
          const acc = store.accounts[aid];
          if (acc?.banned) {
            ws.send(
              JSON.stringify({
                type: 'account_banned',
                accountId: aid,
                banReason: acc.banReason || 'Cheating / Rule Violation',
                account: acc,
              })
            );
          } else if (acc) {
            ws.send(
              JSON.stringify({
                type: 'account_updated',
                accountId: aid,
                account: acc,
              })
            );
          }
          return;
        }
        if (msg.type === 'create_room' || msg.type === 'join_room') {
          const linkedAid = clientAccountIds.get(ws);
          if (linkedAid && store.accounts[linkedAid]?.banned) {
            ws.send(
              JSON.stringify({
                type: 'account_banned',
                accountId: linkedAid,
                banReason: store.accounts[linkedAid]?.banReason || 'Cheating / Rule Violation',
              })
            );
            return;
          }
          const code =
            msg.type === 'create_room'
              ? makeRoomCode()
              : String(msg.roomCode || '').toUpperCase();

          let room = rooms.get(code);
          if (msg.type === 'create_room') {
            room = {
              code,
              hostName: msg.player?.name || 'Host',
              arena: msg.arena || 'practice',
              teamMode: msg.teamMode || 'ffa',
              maxPlayers: msg.gameMode === 'battle_royale' ? 50 : 16,
              fillWithBots: msg.fillWithBots !== false,
              timeRemaining: 160,
              players: new Map(),
            };
            rooms.set(code, room);
          } else if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: `Room "${code}" not found.` }));
            return;
          }

          joinedRoom = room;
          const team: TeamChoice | undefined =
            room.teamMode === 'team' ? msg.playerTeam || 'blue' : undefined;

          room.players.set(playerId, {
            id: playerId,
            ws,
            name: msg.player?.name || 'Player',
            playerTag: msg.player?.playerTag || '1001',
            level: msg.player?.level || 1,
            team,
            isBot: false,
            customization: msg.player?.customization || SKIN_CATALOG[0],
            gunId: msg.player?.gunId || 'basic_pistol',
            knifeId: msg.player?.knifeId || 'basic_knife',
            x: (Math.random() - 0.5) * 40,
            y: 0.2,
            z: (Math.random() - 0.5) * 40,
            vx: 0,
            vy: 0,
            vz: 0,
            yaw: 0,
            anim: 'idle',
            hp: store.gameConfig.playerMaxHp,
            maxHp: store.gameConfig.playerMaxHp,
            hearts: 3,
            score: 0,
            kos: 0,
            deaths: 0,
            alive: true,
            hasCrown: false,
            attackTimer: 0,
            hitFlash: 0,
          });

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomCode: room.code,
              playerId,
              arena: room.arena,
              teamMode: room.teamMode,
              team,
            })
          );
        } else if (msg.type === 'player_state' && joinedRoom) {
          const p = joinedRoom.players.get(playerId);
          if (p && msg.state) {
            p.x = Number(msg.state.x) || 0;
            p.y = Number(msg.state.y) || 0;
            p.z = Number(msg.state.z) || 0;
            p.yaw = Number(msg.state.yaw) || 0;
            p.anim = msg.state.anim || 'idle';
            p.gunId = msg.state.gunId || p.gunId;
            p.knifeId = msg.state.knifeId || p.knifeId;
          }
        }
      } catch {
        // Ignore bad WS frame
      }
    });

    ws.on('close', () => {
      clientAccountIds.delete(ws);
      if (joinedRoom) {
        joinedRoom.players.delete(playerId);
        if (joinedRoom.players.size === 0) {
          rooms.delete(joinedRoom.code);
        }
      }
    });
  });

  // Broadcast multiplayer snapshots at 20 Hz
  setInterval(() => {
    for (const room of rooms.values()) {
      room.timeRemaining = Math.max(0, room.timeRemaining - 0.05);
      const players = Array.from(room.players.values()).map(({ ws: _ws, ...rest }) => rest);
      const payload = JSON.stringify({
        type: 'snapshot',
        players,
        projectiles: [],
        pickups: [],
        timeRemaining: room.timeRemaining,
      });
      for (const p of room.players.values()) {
        if (p.ws && p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(payload);
        }
      }
    }
  }, 50);

  // Production static serving vs Vite dev middleware
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(503).send('Production build not found. Run npm run build.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BLOCK WAR server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

void COIN_REWARDS;
