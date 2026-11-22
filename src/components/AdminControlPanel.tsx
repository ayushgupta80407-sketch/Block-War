import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  Cpu,
  Eye,
  FileCheck2,
  Film,
  Globe,
  HeartPulse,
  History,
  Image as ImageIcon,
  ImagePlus,
  KeyRound,
  Lock,
  Maximize2,
  MessageSquare,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import {
  ARENA_CATALOG,
  AIRPLANE_CATALOG,
  EMOTE_CATALOG,
  GRENADE_CATALOG,
  GUN_CATALOG,
  KNIFE_CATALOG,
  PARACHUTE_CATALOG,
  SKIN_CATALOG,
} from '../game/catalog';
import {
  applyConfigPatch,
  computeConfigDiff,
  DEFAULT_LIVE_GAME_CONFIG,
  LiveConfigPatch,
  LiveConfigVersionEntry,
  LiveGameConfig,
  normalizeLiveGameConfig,
  parseNaturalLanguageGamePatch,
  TimeOfDay,
} from '../game/liveConfig';
import {
  bumpPolicyVersion,
  DEFAULT_GAME_POLICY,
  formatPolicyTimestamp,
  GamePolicyConfig,
  normalizeGamePolicy,
  PolicyAcceptanceRecord,
} from '../game/policy';
import {
  applyLocalPlayerUpdate,
  getAdminQrLocal,
  getLiveConfigRecordLocal,
  getLocalPlayersDb,
  getLocalPolicyAuditRecords,
  saveAdminQrLocal,
  saveAdminState,
  savePlayersDbLocal,
  savePolicyConfigLocal,
  setAdminMasterKeyLocal,
} from '../game/adminPersistence';
import {
  buildChatThreadSummaries,
  ChatMessage,
  ChatThreadSummary,
  formatChatTimestamp,
  getMasterChatHistoryLocal,
  purgeMasterChatMessageLocal,
  saveMasterChatHistoryLocal,
} from '../game/chat';
import { PlayerProgress, ShopCategory } from '../game/types';
import { PlayerAvatar } from './ProfilePhotoModal';

type AdminTab = 'ai' | 'players' | 'live' | 'payments' | 'policy' | 'history_chat' | 'security';

interface AdminPaymentRecord {
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

export type AdminTeleportTarget =
  | 'titanic'
  | 'sea_cave'
  | 'tribal_village'
  | 'volcano'
  | 'main_island';

export type AdminSpawnKind =
  | 'buggy'
  | 'car'
  | 'bike'
  | 'horse'
  | 'shark_mount'
  | 'turtle_mount'
  | 'manta_mount'
  | 'golden_eagle'
  | 'pterodactyl'
  | 'sky_griffin'
  | 'gorilla'
  | 'rhino'
  | 'cheetah'
  | 'lion';

interface ServerStatusData {
  ok: boolean;
  uptimeSeconds: number;
  memoryMb: number;
  connectedWsClients: number;
  activeRooms: number;
  totalAccounts: number;
  totalRegisteredUsers: number;
  configVersion: string;
  geminiConfigured: boolean;
  storagePath: string;
  customAdminPasswordSet: boolean;
}

interface AdminControlPanelProps {
  open: boolean;
  token: string;
  currentConfig: LiveGameConfig;
  draftConfig: LiveGameConfig;
  configVersion: string;
  history: LiveConfigVersionEntry[];
  inMatch: boolean;
  currentAccountId: string;
  onClose: () => void;
  onDraftChange: (cfg: LiveGameConfig) => void;
  onPlaytestLocally: (cfg: LiveGameConfig) => void;
  onPublished: (payload: {
    config: LiveGameConfig;
    version: string;
    history: LiveConfigVersionEntry[];
    summary?: string;
  }) => void;
  onHealSelf: () => void;
  onAddCoins: () => void;
  onTeleport: (target: AdminTeleportTarget) => void;
  onSpawnEntity: (kind: AdminSpawnKind) => void;
  onCurrentAccountUpdated?: (account: PlayerProgress) => void;
  currentPolicy: GamePolicyConfig;
  onPolicyUpdated: (policy: GamePolicyConfig) => void;
}

const PROMPT_PRESETS = [
  'Make all cars, bikes, and jeeps indestructible with 9999 HP',
  'Switch to Blood Moon night lighting and double sharks',
  'Enable unlimited ammo and moon gravity with high jump',
  'Set 2x coin rewards and clear global banner',
];

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  open,
  token,
  currentConfig,
  draftConfig,
  configVersion,
  history,
  inMatch,
  currentAccountId,
  onClose,
  onDraftChange,
  onPlaytestLocally,
  onPublished,
  onHealSelf,
  onAddCoins,
  onTeleport,
  onSpawnEntity,
  onCurrentAccountUpdated,
  currentPolicy,
  onPolicyUpdated,
}) => {
  const [tab, setTab] = useState<AdminTab>('ai');
  const [prompt, setPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [lastPatch, setLastPatch] = useState<LiveConfigPatch | null>(null);
  const [lastSummary, setLastSummary] = useState<string>('');
  const [aiSourceTag, setAiSourceTag] = useState<'ai' | 'rules' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showQuickTune, setShowQuickTune] = useState(true);

  // Player Manager State
  const [playerQuery, setPlayerQuery] = useState('');
  const [players, setPlayers] = useState<PlayerProgress[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerBusyId, setPlayerBusyId] = useState<string | null>(null);
  const [levelInputs, setLevelInputs] = useState<Record<string, string>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(currentAccountId);
  const [banReasonDraft, setBanReasonDraft] = useState<string>('Cheating / Rule Violation');
  const [coinGrantAmount, setCoinGrantAmount] = useState<string>('5000');
  const [inspectPlayerId, setInspectPlayerId] = useState<string | null>(null);

  // Security & Status State
  const [serverStatus, setServerStatus] = useState<ServerStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Payments & QR Upload State
  const [qrImageDraft, setQrImageDraft] = useState<string | null>(null);
  const [upiIdDraft, setUpiIdDraft] = useState('');
  const [payeeNameDraft, setPayeeNameDraft] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<AdminPaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [qrSaveBusy, setQrSaveBusy] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Policy & Compliance State
  const [policyRecords, setPolicyRecords] = useState<PolicyAcceptanceRecord[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyQuery, setPolicyQuery] = useState('');
  const [policyFilter, setPolicyFilter] = useState<'all' | 'ACCEPTED' | 'PENDING'>('all');
  const [policyDraft, setPolicyDraft] = useState<GamePolicyConfig>(() =>
    normalizeGamePolicy(currentPolicy)
  );
  const [policySaveBusy, setPolicySaveBusy] = useState(false);

  // History Chat (Permanent Security Audit Archive) State
  const [chatArchive, setChatArchive] = useState<ChatMessage[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThreadSummary[]>([]);
  const [chatUserStatuses, setChatUserStatuses] = useState<
    Record<string, { banned: boolean; chatMuted: boolean }>
  >({});
  const [chatLoading, setChatLoading] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'media' | 'deleted'>('all');
  const [chatSelectedThread, setChatSelectedThread] = useState<string>('all');
  const [chatBusyId, setChatBusyId] = useState<string | null>(null);
  const [chatLightboxUrl, setChatLightboxUrl] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const diffs = useMemo(
    () => computeConfigDiff(currentConfig, draftConfig),
    [currentConfig, draftConfig]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const fetchPlayers = useCallback(
    async (q = '') => {
      if (!token) return;
      setPlayersLoading(true);
      const term = q.trim().toLowerCase();
      const localList = getLocalPlayersDb().filter(
        (p) =>
          !term ||
          p.accountId.toLowerCase().includes(term) ||
          (p.username || '').toLowerCase().includes(term) ||
          (p.playerName || '').toLowerCase().includes(term)
      );
      try {
        const res = await fetch(
          `/api/admin/players?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Players fetch failed');
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.players)) {
          const map = new Map<string, PlayerProgress>();
          for (const lp of localList) map.set(lp.accountId, lp);
          for (const sp of data.players as PlayerProgress[]) map.set(sp.accountId, sp);
          const merged = Array.from(map.values());
          savePlayersDbLocal(merged);
          setPlayers(merged);
          const lvMap: Record<string, string> = {};
          for (const p of merged) {
            lvMap[p.accountId] = String(p.level);
          }
          setLevelInputs(lvMap);
        } else {
          setPlayers(localList);
        }
      } catch {
        setPlayers(localList);
        const lvMap: Record<string, string> = {};
        for (const p of localList) {
          lvMap[p.accountId] = String(p.level);
        }
        setLevelInputs(lvMap);
      } finally {
        setPlayersLoading(false);
      }
    },
    [token]
  );

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setServerStatus(data as ServerStatusData);
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

  const fetchPayments = useCallback(async () => {
    if (!token) return;
    setPaymentsLoading(true);
    const localQr = getAdminQrLocal();
    if (localQr) {
      setQrImageDraft(localQr.cleared ? null : localQr.qrImageUrl);
      setUpiIdDraft(localQr.upiId || '');
      setPayeeNameDraft(localQr.payeeName || '');
    }
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Payments fetch failed');
      const data = await res.json().catch(() => ({}));
      if (data.qrConfig) {
        const srvQr = data.qrConfig.qrImageUrl || null;
        if (srvQr) {
          setQrImageDraft(srvQr);
          setUpiIdDraft(data.qrConfig.upiId || '');
          setPayeeNameDraft(data.qrConfig.payeeName || '');
        } else if (localQr && !localQr.cleared && localQr.qrImageUrl) {
          setQrImageDraft(localQr.qrImageUrl);
          setUpiIdDraft(localQr.upiId || '');
          setPayeeNameDraft(localQr.payeeName || '');
        } else {
          setQrImageDraft(null);
          setUpiIdDraft(data.qrConfig.upiId || '');
          setPayeeNameDraft(data.qrConfig.payeeName || '');
        }
      }
      if (Array.isArray(data.payments)) {
        setPaymentHistory(data.payments);
      }
    } catch {
      // Keep localStorage QR draft
    } finally {
      setPaymentsLoading(false);
    }
  }, [token]);

  const fetchPolicyRecords = useCallback(
    async (q = '', versionOverride?: string) => {
      if (!token) return;
      setPolicyLoading(true);
      const activeVersion = versionOverride || currentPolicy.version;
      const term = q.trim().toLowerCase();
      const localList = getLocalPolicyAuditRecords(activeVersion).filter(
        (r) =>
          !term ||
          r.accountId.toLowerCase().includes(term) ||
          (r.username || '').toLowerCase().includes(term) ||
          (r.playerName || '').toLowerCase().includes(term)
      );
      try {
        const res = await fetch(
          `/api/admin/policy-records?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Policy records fetch failed');
        const data = await res.json().catch(() => ({}));
        const srvVersion = data.policy?.version ? String(data.policy.version) : activeVersion;
        if (Array.isArray(data.records)) {
          const map = new Map<string, PolicyAcceptanceRecord>();
          for (const lr of localList) {
            const accepted = Boolean(lr.acceptedAt) && lr.policyVersion === srvVersion;
            map.set(lr.accountId, {
              ...lr,
              status: accepted ? 'ACCEPTED' : 'PENDING',
            });
          }
          for (const sr of data.records as PolicyAcceptanceRecord[]) {
            const existing = map.get(sr.accountId);
            const serverAccepted = sr.status === 'ACCEPTED' && sr.policyVersion === srvVersion;
            const localAccepted =
              existing && existing.status === 'ACCEPTED' && existing.policyVersion === srvVersion;
            if (serverAccepted || !localAccepted) {
              map.set(sr.accountId, sr);
            }
          }
          const merged = Array.from(map.values()).sort((a, b) => {
            if (a.status !== b.status) return a.status === 'ACCEPTED' ? -1 : 1;
            return (b.acceptedAt || '').localeCompare(a.acceptedAt || '');
          });
          setPolicyRecords(merged);
        } else {
          setPolicyRecords(localList);
        }
      } catch {
        setPolicyRecords(localList);
      } finally {
        setPolicyLoading(false);
      }
    },
    [token, currentPolicy.version]
  );

  const fetchChatArchive = useCallback(async () => {
    if (!token) return;
    setChatLoading(true);

    const buildLocalUserStatuses = (): Record<string, { banned: boolean; chatMuted: boolean }> => {
      const map: Record<string, { banned: boolean; chatMuted: boolean }> = {};
      for (const p of getLocalPlayersDb()) {
        map[p.accountId] = {
          banned: Boolean(p.banned),
          chatMuted: Boolean(p.chatMuted),
        };
      }
      return map;
    };

    const localMsgs = getMasterChatHistoryLocal();
    const localStatuses = buildLocalUserStatuses();

    try {
      const res = await fetch('/api/admin/chat-history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Chat history fetch failed');
      const data = await res.json().catch(() => ({}));
      const serverMsgs: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      const mergedMap = new Map<string, ChatMessage>();
      for (const m of localMsgs) mergedMap.set(m.id, m);
      for (const m of serverMsgs) {
        const prev = mergedMap.get(m.id);
        mergedMap.set(m.id, prev ? { ...prev, ...m } : m);
      }
      const merged = Array.from(mergedMap.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      saveMasterChatHistoryLocal(merged);
      setChatArchive(merged);
      setChatThreads(buildChatThreadSummaries(merged));
      setChatUserStatuses({
        ...localStatuses,
        ...(data.userStatuses || {}),
      });
    } catch {
      const sorted = [...localMsgs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setChatArchive(sorted);
      setChatThreads(buildChatThreadSummaries(sorted));
      setChatUserStatuses(localStatuses);
    } finally {
      setChatLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      setPolicyDraft(normalizeGamePolicy(currentPolicy));
    }
  }, [open, currentPolicy]);

  useEffect(() => {
    if (!open) return;
    if (tab === 'players') fetchPlayers(playerQuery);
    if (tab === 'payments') fetchPayments();
    if (tab === 'policy') fetchPolicyRecords(policyQuery);
    if (tab === 'history_chat') fetchChatArchive();
    if (tab === 'security') fetchStatus();
  }, [
    open,
    tab,
    fetchPlayers,
    fetchPayments,
    fetchPolicyRecords,
    fetchChatArchive,
    fetchStatus,
    playerQuery,
    policyQuery,
  ]);

  if (!open) return null;

  const handleGenerateAiPatch = async () => {
    if (!prompt.trim() || aiBusy) return;
    setAiBusy(true);
    setFeedback(null);
    const applyClientParserFallback = (reasonNote?: string) => {
      const fb = parseNaturalLanguageGamePatch(prompt.trim(), draftConfig);
      const next = applyConfigPatch(draftConfig, fb.patch);
      onDraftChange(next);
      setLastPatch(fb.patch);
      setLastSummary(fb.summary);
      setAiSourceTag('rules');
      setFeedback({
        type: 'ok',
        text: reasonNote || 'Rule engine compiled changes into staged preview. Click APPLY & TEST LIVE or PUBLISH UPDATE.',
      });
    };

    try {
      const res = await fetch('/api/admin/ai-patch', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ prompt: prompt.trim(), currentConfig: draftConfig }),
      });
      if (res.status === 404 || res.status >= 500 || !res.ok) {
        applyClientParserFallback();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!data.nextConfig) {
        applyClientParserFallback();
        return;
      }
      onDraftChange(normalizeLiveGameConfig(data.nextConfig));
      setLastPatch(data.patch || {});
      setLastSummary(String(data.summary || 'Patch staged in draft preview.'));
      setAiSourceTag(data.usedAi ? 'ai' : 'rules');
      setFeedback({
        type: 'ok',
        text: data.usedAi
          ? 'AI update compiled. Review sliders below, then click APPLY & TEST LIVE or PUBLISH UPDATE.'
          : 'Rule engine update compiled. Review sliders below, then click APPLY & TEST LIVE or PUBLISH UPDATE.',
      });
    } catch {
      applyClientParserFallback();
    } finally {
      setAiBusy(false);
    }
  };

  const handlePublish = async () => {
    if (publishBusy) return;
    setPublishBusy(true);
    setFeedback(null);

    // 1. Immediate Local Persistence FIRST (works on static hosting & live server)
    const prevRec = getLiveConfigRecordLocal();
    const nextVerNum = Math.max(101, Math.round(Number((prevRec.version || 'v1.00').replace(/[^0-9.]/g, '')) * 100) + 1);
    const nextLocalVersion = `v${(nextVerNum / 100).toFixed(2)}`;
    const localSaved = saveAdminState({
      liveConfig: draftConfig,
      version: nextLocalVersion,
      summary: lastSummary || 'Live game configuration update',
      patch: lastPatch || {},
    });
    const localRecord = localSaved.liveRecord || getLiveConfigRecordLocal();

    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          config: draftConfig,
          patch: lastPatch || {},
          summary: lastSummary || 'Live game configuration update',
        }),
      });
      if (!res.ok) throw new Error('Server publish unavailable');
      const data = await res.json().catch(() => ({}));
      if (!data.config) throw new Error('Invalid server publish response');

      saveAdminState({
        liveConfig: data.config,
        version: data.version,
        history: data.history || localRecord.history,
        summary: lastSummary || `Published ${data.version}`,
      });
      onPublished({
        config: data.config,
        version: data.version,
        history: data.history || [],
        summary: lastSummary || `Published ${data.version}`,
      });
      setLastPatch(null);
      setFeedback({
        type: 'ok',
        text: `UPDATE APPLIED & SAVED! (${data.version}) Click PLAY to test.`,
      });
    } catch {
      // Static hosting / offline fallback already saved to localStorage above!
      onPublished({
        config: localRecord.config,
        version: localRecord.version,
        history: localRecord.history,
        summary: lastSummary || `Published ${localRecord.version}`,
      });
      setLastPatch(null);
      setFeedback({
        type: 'ok',
        text: `UPDATE APPLIED & SAVED! (${localRecord.version}) Click PLAY to test.`,
      });
    } finally {
      setPublishBusy(false);
    }
  };

  const handleRollback = async (opts: { version?: string; resetDefault?: boolean }) => {
    if (publishBusy) return;
    setPublishBusy(true);
    setFeedback(null);

    const localRec = getLiveConfigRecordLocal();
    const targetCfg = opts.resetDefault
      ? DEFAULT_LIVE_GAME_CONFIG
      : localRec.history.find((h) => h.version === opts.version)?.config || DEFAULT_LIVE_GAME_CONFIG;
    const rollbackSummary = opts.resetDefault
      ? 'Restored all game settings to factory defaults'
      : `Rolled back to ${opts.version}`;

    saveAdminState({
      liveConfig: targetCfg,
      summary: rollbackSummary,
    });

    try {
      const res = await fetch('/api/admin/rollback', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error('Rollback endpoint unavailable');
      const data = await res.json().catch(() => ({}));
      if (!data.config) throw new Error('Invalid rollback response');

      saveAdminState({
        liveConfig: data.config,
        version: data.version,
        history: data.history || [],
        summary: data.summary,
      });
      onPublished({
        config: data.config,
        version: data.version,
        history: data.history || [],
        summary: data.summary,
      });
      setLastPatch(null);
      setLastSummary(data.summary || '');
      setFeedback({
        type: 'ok',
        text: `${data.summary || 'Restored configuration'} (${data.version}).`,
      });
    } catch {
      const afterLocal = getLiveConfigRecordLocal();
      onPublished({
        config: afterLocal.config,
        version: afterLocal.version,
        history: afterLocal.history,
        summary: rollbackSummary,
      });
      setLastPatch(null);
      setLastSummary(rollbackSummary);
      setFeedback({
        type: 'ok',
        text: `${rollbackSummary} (${afterLocal.version}) — Saved locally.`,
      });
    } finally {
      setPublishBusy(false);
    }
  };

  const handlePlayerUpdate = async (
    accountId: string,
    payload: {
      coins?: number;
      addCoins?: number;
      level?: number;
      banned?: boolean;
      banReason?: string;
      unlockAll?: boolean;
      unlockCategory?: string;
      lockCategory?: string;
      grantItem?: { category: ShopCategory; itemId: string };
      revokeItem?: { category: ShopCategory; itemId: string };
    }
  ) => {
    setPlayerBusyId(accountId);
    setFeedback(null);

    // 1. Immediate Local Persistence FIRST
    const localUpdated = applyLocalPlayerUpdate(accountId, payload, currentAccountId);
    if (localUpdated) {
      setPlayers((prev) => {
        const exists = prev.some((p) => p.accountId === accountId);
        return exists
          ? prev.map((p) => (p.accountId === accountId ? localUpdated : p))
          : [localUpdated, ...prev];
      });
      setLevelInputs((prev) => ({ ...prev, [accountId]: String(localUpdated.level) }));
      if (accountId === currentAccountId && onCurrentAccountUpdated) {
        onCurrentAccountUpdated(localUpdated);
      }
    }

    // 2. Background Server Sync
    try {
      const res = await fetch('/api/admin/player-update', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          accountId,
          protectAccountId: currentAccountId,
          ...payload,
        }),
      });
      if (!res.ok) throw new Error('Server player-update unavailable');
      const data = await res.json().catch(() => ({}));
      if (data.account) {
        setPlayers((prev) => {
          const exists = prev.some((p) => p.accountId === accountId);
          return exists
            ? prev.map((p) => (p.accountId === accountId ? data.account : p))
            : [data.account, ...prev];
        });
        setLevelInputs((prev) => ({ ...prev, [accountId]: String(data.account.level) }));
        if (accountId === currentAccountId && onCurrentAccountUpdated) {
          onCurrentAccountUpdated(data.account);
        }
      }
      const acc = data.account || localUpdated;
      setFeedback({
        type: 'ok',
        text: payload.unlockAll
          ? `Unlocked ALL 5 Maps, Weapons, Vehicles, Skins & 10 Emotes FREE for ${acc?.username || acc?.playerName || accountId}!`
          : payload.banned === true
            ? `Banned ${acc?.username || acc?.playerName || accountId}: ${acc?.banReason || payload.banReason}`
            : payload.banned === false
              ? `Unbanned ${acc?.username || acc?.playerName || accountId}.`
              : `Updated ${acc?.username || acc?.playerName || accountId} cleanly.`,
      });
    } catch {
      if (localUpdated) {
        setFeedback({
          type: 'ok',
          text: payload.unlockAll
            ? `Unlocked ALL 5 Maps, Weapons, Vehicles, Skins & 10 Emotes FREE for ${localUpdated.username || localUpdated.playerName} (Saved locally)!`
            : payload.banned === true
              ? `Banned ${localUpdated.username || localUpdated.playerName} (Saved locally).`
              : payload.banned === false
                ? `Unbanned ${localUpdated.username || localUpdated.playerName} (Saved locally).`
                : `Updated ${localUpdated.username || localUpdated.playerName} (Saved locally).`,
        });
      } else {
        setFeedback({ type: 'err', text: 'Account not found locally or on server.' });
      }
    } finally {
      setPlayerBusyId(null);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordBusy) return;
    if (!/^[A-Za-z0-9]{12}$/.test(newPassword)) {
      setFeedback({
        type: 'err',
        text: 'New password must be exactly 12 alphanumeric characters (A-Z, a-z, 0-9).',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'err', text: 'Password confirmation does not match.' });
      return;
    }

    setPasswordBusy(true);
    setFeedback(null);
    setAdminMasterKeyLocal(newPassword);
    try {
      const res = await fetch('/api/admin/security/password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error('Password endpoint unavailable');
      const data = await res.json().catch(() => ({}));
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'ok', text: data.message || 'Admin Master Password updated.' });
      fetchStatus();
    } catch {
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'ok', text: 'Admin Master Password updated locally.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleQrFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      setFeedback({ type: 'err', text: 'Please select a PNG, JPG, or WEBP QR code image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'err', text: 'QR image must be under 5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setQrImageDraft(reader.result);
        setFeedback(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQrConfig = async (clearQr = false) => {
    if (qrSaveBusy) return;
    setQrSaveBusy(true);
    setFeedback(null);
    const payload = clearQr
      ? { qrImageUrl: null, upiId: upiIdDraft.trim(), payeeName: payeeNameDraft.trim() }
      : { qrImageUrl: qrImageDraft, upiId: upiIdDraft.trim(), payeeName: payeeNameDraft.trim() };

    // 1. Immediate Local Persistence FIRST
    saveAdminQrLocal({
      qrImageUrl: payload.qrImageUrl,
      upiId: payload.upiId,
      payeeName: payload.payeeName,
      cleared: clearQr,
    });
    if (clearQr) {
      setQrImageDraft(null);
    }

    // 2. Background Server Sync
    try {
      const res = await fetch('/api/admin/upload-qr', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server upload unavailable');
      setFeedback({
        type: 'ok',
        text: clearQr
          ? 'Payment QR cleared. Online coin purchases are now locked until a new QR is uploaded.'
          : 'Official UPI QR Code saved! Players can now pay and verify receipts in + BUY COINS.',
      });
    } catch {
      setFeedback({
        type: 'ok',
        text: clearQr
          ? 'Payment QR cleared locally.'
          : 'Official UPI QR Code saved locally! Players can scan it in + BUY COINS.',
      });
    } finally {
      setQrSaveBusy(false);
    }
  };

  const handleSavePolicy = async (requireReconfirmation: boolean) => {
    if (policySaveBusy) return;
    const cleanedSections = policyDraft.sections
      .map((s, idx) => ({
        id: s.id || `sec_${idx + 1}`,
        title: s.title.trim(),
        body: s.body.trim(),
      }))
      .filter((s) => s.title.length > 0 && s.body.length > 0);
    if (cleanedSections.length === 0) {
      setFeedback({ type: 'err', text: 'Add at least one policy section with a title and description.' });
      return;
    }

    setPolicySaveBusy(true);
    setFeedback(null);

    const nextVersion = requireReconfirmation
      ? bumpPolicyVersion(currentPolicy.version)
      : currentPolicy.version;
    const localPolicy = normalizeGamePolicy({
      version: nextVersion,
      title: policyDraft.title.trim() || DEFAULT_GAME_POLICY.title,
      subtitle: policyDraft.subtitle.trim() || DEFAULT_GAME_POLICY.subtitle,
      sections: cleanedSections,
      updatedAt: new Date().toISOString(),
    });

    // 1. Immediate Local Persistence FIRST
    savePolicyConfigLocal(localPolicy);
    setPolicyDraft(localPolicy);
    onPolicyUpdated(localPolicy);

    // 2. Background Server Sync
    try {
      const res = await fetch('/api/admin/policy/update', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: localPolicy.title,
          subtitle: localPolicy.subtitle,
          sections: localPolicy.sections,
          requireReconfirmation,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.policy) {
        const srvPolicy = normalizeGamePolicy(data.policy);
        savePolicyConfigLocal(srvPolicy);
        setPolicyDraft(srvPolicy);
        onPolicyUpdated(srvPolicy);
        await fetchPolicyRecords(policyQuery, srvPolicy.version);
        setFeedback({
          type: 'ok',
          text: requireReconfirmation
            ? `Policy updated to ${srvPolicy.version} & broadcast live! All players must re-confirm before entering their next match.`
            : `Policy text saved under ${srvPolicy.version} without requiring re-confirmation.`,
        });
      } else {
        await fetchPolicyRecords(policyQuery, localPolicy.version);
        setFeedback({
          type: 'ok',
          text: requireReconfirmation
            ? `Policy updated to ${localPolicy.version} locally! Players must re-confirm before their next match.`
            : `Policy text saved locally under ${localPolicy.version}.`,
        });
      }
    } catch {
      await fetchPolicyRecords(policyQuery, localPolicy.version);
      setFeedback({
        type: 'ok',
        text: requireReconfirmation
          ? `Policy updated to ${localPolicy.version} locally! Players must re-confirm before their next match.`
          : `Policy text saved locally under ${localPolicy.version}.`,
      });
    } finally {
      setPolicySaveBusy(false);
    }
  };

  const updateDraftField = <K extends keyof LiveGameConfig>(key: K, value: LiveGameConfig[K]) => {
    onDraftChange(normalizeLiveGameConfig({ ...draftConfig, [key]: value }));
  };

  const handleChatToggleMute = async (
    accountId: string,
    username: string,
    currentlyMuted: boolean
  ) => {
    if (chatBusyId) return;
    setChatBusyId(`mute:${accountId}`);
    setFeedback(null);
    const nextMuted = !currentlyMuted;

    const localUpdated = applyLocalPlayerUpdate(accountId, {
      chatMuted: nextMuted,
      chatMutedReason: nextMuted ? 'Muted by Admin from History Chat audit' : '',
    });
    if (localUpdated && localUpdated.accountId === currentAccountId) {
      onCurrentAccountUpdated?.(localUpdated);
    }
    setChatUserStatuses((prev) => ({
      ...prev,
      [accountId]: {
        banned: prev[accountId]?.banned ?? false,
        chatMuted: nextMuted,
      },
    }));

    try {
      const res = await fetch('/api/admin/player-update', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          accountId,
          chatMuted: nextMuted,
          chatMutedReason: nextMuted ? 'Muted by Admin from History Chat audit' : '',
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.account && data.account.accountId === currentAccountId) {
          onCurrentAccountUpdated?.(data.account);
        }
      }
      setFeedback({
        type: 'ok',
        text: nextMuted
          ? `${username} (${accountId}) has been MUTED in player chat.`
          : `${username} (${accountId}) has been UNMUTED in player chat.`,
      });
    } catch {
      setFeedback({
        type: 'ok',
        text: nextMuted
          ? `${username} muted locally in player chat.`
          : `${username} unmuted locally in player chat.`,
      });
    } finally {
      setChatBusyId(null);
    }
  };

  const handleChatToggleBan = async (
    accountId: string,
    username: string,
    currentlyBanned: boolean
  ) => {
    if (chatBusyId) return;
    if (accountId === currentAccountId && !currentlyBanned) {
      setFeedback({
        type: 'err',
        text: 'Safety guard: You cannot ban your own active Admin account.',
      });
      return;
    }
    setChatBusyId(`ban:${accountId}`);
    setFeedback(null);
    const nextBanned = !currentlyBanned;

    const localUpdated = applyLocalPlayerUpdate(accountId, {
      banned: nextBanned,
      banReason: nextBanned ? 'Chat Policy / Harassment Violation' : '',
    });
    if (localUpdated && localUpdated.accountId === currentAccountId) {
      onCurrentAccountUpdated?.(localUpdated);
    }
    setChatUserStatuses((prev) => ({
      ...prev,
      [accountId]: {
        chatMuted: prev[accountId]?.chatMuted ?? false,
        banned: nextBanned,
      },
    }));

    try {
      const res = await fetch('/api/admin/player-update', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          accountId,
          banned: nextBanned,
          banReason: nextBanned ? 'Chat Policy / Harassment Violation' : '',
          protectAccountId: currentAccountId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          setFeedback({ type: 'err', text: String(errData.error) });
          setChatBusyId(null);
          return;
        }
      }
      setFeedback({
        type: 'ok',
        text: nextBanned
          ? `${username} (${accountId}) has been BANNED from BLOCK WAR.`
          : `${username} (${accountId}) has been UNBANNED.`,
      });
    } catch {
      setFeedback({
        type: 'ok',
        text: nextBanned ? `${username} banned locally.` : `${username} unbanned locally.`,
      });
    } finally {
      setChatBusyId(null);
    }
  };

  const handlePurgeChatRecord = async (messageId: string) => {
    if (chatBusyId) return;
    setChatBusyId(`purge:${messageId}`);
    setFeedback(null);

    const remainingLocal = purgeMasterChatMessageLocal(messageId);
    setChatArchive(remainingLocal);
    setChatThreads(buildChatThreadSummaries(remainingLocal));

    try {
      const res = await fetch('/api/admin/chat-history/purge', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        setFeedback({
          type: 'ok',
          text: `Record ${messageId} permanently purged from master database.`,
        });
      } else {
        setFeedback({
          type: 'ok',
          text: `Record ${messageId} purged from local archive.`,
        });
      }
    } catch {
      setFeedback({
        type: 'ok',
        text: `Record ${messageId} purged from local archive.`,
      });
    } finally {
      setChatBusyId(null);
    }
  };

  const filteredPolicyRecords = policyRecords.filter((rec) =>
    policyFilter === 'all' ? true : rec.status === policyFilter
  );
  const policyAcceptedCount = policyRecords.filter((r) => r.status === 'ACCEPTED').length;
  const policyPendingCount = policyRecords.filter((r) => r.status === 'PENDING').length;

  const chatTotalMediaCount = chatArchive.filter((m) => Boolean(m.mediaType)).length;
  const chatTotalDeletedCount = chatArchive.filter((m) => Boolean(m.deletedByUser)).length;
  const filteredChatMessages = chatArchive.filter((m) => {
    if (chatSelectedThread !== 'all' && m.threadId !== chatSelectedThread) return false;
    if (chatFilter === 'media' && !m.mediaType) return false;
    if (chatFilter === 'deleted' && !m.deletedByUser) return false;
    const q = chatQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.senderUsername.toLowerCase().includes(q) ||
      m.senderId.toLowerCase().includes(q) ||
      (m.recipientUsername || '').toLowerCase().includes(q) ||
      (m.recipientId || '').toLowerCase().includes(q) ||
      m.text.toLowerCase().includes(q) ||
      (m.mediaFileName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Top Bar Contract: Breadcrumb / Title — Navigation Tabs — Close */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-950/80 px-5 py-3.5">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
              BLOCK WAR Control Console
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {configVersion}
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-white/10 overflow-x-auto">
            {(
              [
                { id: 'ai', label: 'AI Game Changer', icon: <Wand2 className="h-3.5 w-3.5" /> },
                { id: 'players', label: 'Player Manager', icon: <Users className="h-3.5 w-3.5" /> },
                { id: 'live', label: 'Live Spawner', icon: <Compass className="h-3.5 w-3.5" /> },
                { id: 'payments', label: 'Payments & QR Upload', icon: <QrCode className="h-3.5 w-3.5" /> },
                { id: 'policy', label: 'Policy & Compliance', icon: <ScrollText className="h-3.5 w-3.5" /> },
                { id: 'history_chat', label: 'History Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
                { id: 'security', label: 'Backend & Security', icon: <Server className="h-3.5 w-3.5" /> },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setFeedback(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  tab === item.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </header>

        {/* Global Action Feedback Strip */}
        {feedback && (
          <div
            className={`flex items-center justify-between gap-3 border-b px-5 py-2.5 text-xs font-medium ${
              feedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Ban className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tab Workspace Viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: AI TEXT-TO-UPDATE GAME CHANGER */}
          {tab === 'ai' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="ai-prompt-box" className="text-sm font-semibold text-white">
                        Describe the live game change
                      </label>
                      {aiSourceTag && (
                        <span className="text-xs text-slate-400">
                          Compiled via {aiSourceTag === 'ai' ? 'Server Gemini AI' : 'Deterministic Parser'}
                        </span>
                      )}
                    </div>
                    <textarea
                      id="ai-prompt-box"
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Example: Make all cars and bikes indestructible 9999 HP, set night blood moon, and give 2x coins"
                      className="w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  {/* Quick Prompt Fill Buttons */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-400">Preset instructions</div>
                    <div className="flex flex-wrap gap-2">
                      {PROMPT_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPrompt(p)}
                          className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-left text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={aiBusy || !prompt.trim()}
                      onClick={handleGenerateAiPatch}
                      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{aiBusy ? 'Compiling Patch...' : 'Generate AI Patch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQuickTune((v) => !v)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 whitespace-nowrap shrink-0"
                    >
                      {showQuickTune ? 'Hide Direct Parameters' : 'Edit Parameters Manually'}
                    </button>
                  </div>
                </div>

                {/* Live Diff & Deployment Actions */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-semibold text-white">Staged Diff Preview</span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {diffs.length} {diffs.length === 1 ? 'change' : 'changes'}
                      </span>
                    </div>

                    {lastSummary && (
                      <p className="text-xs text-cyan-200 leading-relaxed">{lastSummary}</p>
                    )}

                    {diffs.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        Draft matches currently published config ({configVersion}). Compile an AI patch or tune values manually to stage edits.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto divide-y divide-white/5 text-xs">
                        {diffs.map((d) => (
                          <div key={d.key} className="flex items-center justify-between gap-2 py-1.5">
                            <span className="font-mono text-slate-300 truncate">{d.key}</span>
                            <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                              <span className="text-slate-500">{String(d.before)}</span>
                              <span className="text-slate-600">-&gt;</span>
                              <span className="font-semibold text-emerald-300">{String(d.after)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        saveAdminState({ liveConfig: draftConfig });
                        onPlaytestLocally(draftConfig);
                        setFeedback({
                          type: 'ok',
                          text: 'UPDATE APPLIED & SAVED! Click PLAY to test.',
                        });
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/15 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/25 whitespace-nowrap"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>APPLY &amp; TEST LIVE</span>
                    </button>

                    <button
                      type="button"
                      disabled={publishBusy}
                      onClick={handlePublish}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{publishBusy ? 'Saving & Publishing...' : 'PUBLISH UPDATE'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={publishBusy}
                      onClick={() => handleRollback({ resetDefault: true })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 whitespace-nowrap"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Rollback / Reset Default</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Manual Quick-Tune Parameter Drawer */}
              {showQuickTune && (
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="text-xs font-semibold text-white">Direct Parameter Tuning</h3>
                    <span className="text-xs text-slate-400">Edits update the staged draft</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Time of Day</span>
                      <select
                        value={draftConfig.timeOfDay}
                        onChange={(e) => updateDraftField('timeOfDay', e.target.value as TimeOfDay)}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 text-white"
                      >
                        <option value="day">Daylight</option>
                        <option value="sunset">Sunset</option>
                        <option value="night">Night</option>
                        <option value="blood_moon">Blood Moon</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Player Max HP</span>
                      <input
                        type="number"
                        min={25}
                        max={9999}
                        value={draftConfig.playerMaxHp}
                        onChange={(e) => updateDraftField('playerMaxHp', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Enemy Bot HP</span>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        value={draftConfig.enemyBotHp}
                        onChange={(e) => updateDraftField('enemyBotHp', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Coin Multiplier</span>
                      <input
                        type="number"
                        min={0.25}
                        max={20}
                        step={0.25}
                        value={draftConfig.coinRewardMultiplier}
                        onChange={(e) => updateDraftField('coinRewardMultiplier', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Armored Jeep HP</span>
                      <input
                        type="number"
                        min={100}
                        max={99999}
                        value={draftConfig.jeepHp}
                        onChange={(e) => updateDraftField('jeepHp', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Turbo Car HP</span>
                      <input
                        type="number"
                        min={100}
                        max={99999}
                        value={draftConfig.carHp}
                        onChange={(e) => updateDraftField('carHp', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Dirt Bike HP</span>
                      <input
                        type="number"
                        min={100}
                        max={99999}
                        value={draftConfig.bikeHp}
                        onChange={(e) => updateDraftField('bikeHp', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Horse HP</span>
                      <input
                        type="number"
                        min={100}
                        max={99999}
                        value={draftConfig.horseHp}
                        onChange={(e) => updateDraftField('horseHp', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="sm:col-span-2 space-y-1">
                      <span className="block text-slate-300 font-medium">Global Announcement Banner</span>
                      <input
                        type="text"
                        maxLength={140}
                        value={draftConfig.globalBannerMessage}
                        onChange={(e) => updateDraftField('globalBannerMessage', e.target.value)}
                        placeholder="Optional message shown across HUD and lobby"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 text-white placeholder:text-slate-500"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-lg border border-white/15 bg-slate-900 px-3 py-2 cursor-pointer">
                      <span className="font-medium text-slate-200">Unlimited Ammo</span>
                      <input
                        type="checkbox"
                        checked={draftConfig.unlimitedAmmo}
                        onChange={(e) => updateDraftField('unlimitedAmmo', e.target.checked)}
                        className="h-4 w-4 accent-cyan-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center justify-between text-slate-300 font-medium">
                        <span>Player Speed</span>
                        <span className="font-mono text-cyan-300">{draftConfig.playerSpeed}</span>
                      </span>
                      <input
                        type="range"
                        min={6}
                        max={36}
                        step={0.5}
                        value={draftConfig.playerSpeed}
                        onChange={(e) => updateDraftField('playerSpeed', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center justify-between text-slate-300 font-medium">
                        <span>Jump Force</span>
                        <span className="font-mono text-cyan-300">{draftConfig.jumpForce}</span>
                      </span>
                      <input
                        type="range"
                        min={8}
                        max={40}
                        step={0.5}
                        value={draftConfig.jumpForce}
                        onChange={(e) => updateDraftField('jumpForce', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center justify-between text-slate-300 font-medium">
                        <span>Weapon Damage</span>
                        <span className="font-mono text-cyan-300">{draftConfig.weaponDamageMultiplier}x</span>
                      </span>
                      <input
                        type="range"
                        min={0.5}
                        max={10}
                        step={0.25}
                        value={draftConfig.weaponDamageMultiplier}
                        onChange={(e) => updateDraftField('weaponDamageMultiplier', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center justify-between text-slate-300 font-medium">
                        <span>Vehicle HP Multiplier</span>
                        <span className="font-mono text-cyan-300">{draftConfig.vehicleHpMultiplier}x</span>
                      </span>
                      <input
                        type="range"
                        min={0.5}
                        max={10}
                        step={0.25}
                        value={draftConfig.vehicleHpMultiplier}
                        onChange={(e) => updateDraftField('vehicleHpMultiplier', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Gravity</span>
                      <input
                        type="number"
                        min={8}
                        max={80}
                        value={draftConfig.gravity}
                        onChange={(e) => updateDraftField('gravity', Number(e.target.value))}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Extra Tanks Spawn</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={draftConfig.customSpawns?.tanks ?? 0}
                        onChange={(e) =>
                          updateDraftField('customSpawns', {
                            ...(draftConfig.customSpawns || { tanks: 0, helicopters: 0, sharks: 0, lions: 0 }),
                            tanks: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Extra Helis Spawn</span>
                      <input
                        type="number"
                        min={0}
                        max={16}
                        value={draftConfig.customSpawns?.helicopters ?? 0}
                        onChange={(e) =>
                          updateDraftField('customSpawns', {
                            ...(draftConfig.customSpawns || { tanks: 0, helicopters: 0, sharks: 0, lions: 0 }),
                            helicopters: Math.max(0, Math.min(16, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Extra Sharks Spawn</span>
                      <input
                        type="number"
                        min={0}
                        max={24}
                        value={draftConfig.customSpawns?.sharks ?? 0}
                        onChange={(e) =>
                          updateDraftField('customSpawns', {
                            ...(draftConfig.customSpawns || { tanks: 0, helicopters: 0, sharks: 0, lions: 0 }),
                            sharks: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-slate-300 font-medium">Extra Lions Spawn</span>
                      <input
                        type="number"
                        min={0}
                        max={24}
                        value={draftConfig.customSpawns?.lions ?? 0}
                        onChange={(e) =>
                          updateDraftField('customSpawns', {
                            ...(draftConfig.customSpawns || { tanks: 0, helicopters: 0, sharks: 0, lions: 0 }),
                            lions: Math.max(0, Math.min(24, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-2 font-mono text-white tabular-nums"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Version Snapshot History */}
              <div className="space-y-2.5 border-t border-white/10 pt-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <History className="h-4 w-4 text-slate-400" />
                  <span>Published Snapshot History</span>
                </div>
                {history.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-5 text-center text-xs text-slate-500">
                    No prior versions saved yet. Publishing an update records a snapshot automatically for instant rollback.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 divide-y divide-white/5">
                    {history.slice(0, 8).map((entry) => (
                      <div
                        key={`${entry.version}_${entry.updatedAt}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-slate-200">
                            <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                              {entry.version}
                            </span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="text-slate-400 font-mono tabular-nums">
                              {new Date(entry.updatedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="truncate text-slate-400 mt-0.5">{entry.summary}</p>
                        </div>
                        <button
                          type="button"
                          disabled={publishBusy}
                          onClick={() => handleRollback({ version: entry.version })}
                          className="rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 whitespace-nowrap shrink-0"
                        >
                          Restore {entry.version}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PLAYER & ACCOUNT MANAGER */}
          {tab === 'players' && (
            <div className="space-y-4">
              {/* 1-Click Master Unlock Everything & Category Control Bar */}
              {(() => {
                const targetPlayer =
                  players.find((p) => p.accountId === selectedPlayerId) ||
                  players.find((p) => p.accountId === currentAccountId) ||
                  players[0];
                const targetId = targetPlayer?.accountId || currentAccountId;
                const targetLabel = targetPlayer
                  ? `${targetPlayer.username ? `@${targetPlayer.username}` : targetPlayer.playerName} (${targetPlayer.accountId.slice(0, 14)})`
                  : `Your Account (${currentAccountId.slice(0, 14)})`;
                const busyTarget = playerBusyId === targetId;

                const mapsFull = targetPlayer
                  ? ARENA_CATALOG.every((a) => targetPlayer.unlockedArenas.includes(a.id))
                  : false;
                const weaponsFull = targetPlayer
                  ? GUN_CATALOG.every((g) => targetPlayer.unlockedGuns.includes(g.id)) &&
                    KNIFE_CATALOG.every((k) => targetPlayer.unlockedKnives.includes(k.id))
                  : false;
                const vehiclesFull = targetPlayer
                  ? AIRPLANE_CATALOG.every((a) => (targetPlayer.unlockedAirplanes ?? []).includes(a.id)) &&
                    PARACHUTE_CATALOG.every((p) => (targetPlayer.unlockedParachutes ?? []).includes(p.id))
                  : false;
                const skinsFull = targetPlayer
                  ? SKIN_CATALOG.every((s) => targetPlayer.unlockedCharacters.includes(s.id))
                  : false;
                const emotesFull = targetPlayer
                  ? EMOTE_CATALOG.every((e) => (targetPlayer.unlockedEmotes ?? []).includes(e.id))
                  : false;

                return (
                  <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          <span>1-Click Unlock &amp; Moderation Controls</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Target Account: <span className="font-mono font-bold text-white">{targetLabel}</span>
                          {targetId === currentAccountId && (
                            <span className="ml-2 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                              YOUR ADMIN SESSION
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busyTarget}
                          onClick={() => handlePlayerUpdate(currentAccountId, { unlockAll: true })}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50 whitespace-nowrap"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Unlock My Account</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyTarget}
                          onClick={() => handlePlayerUpdate(targetId, { unlockAll: true })}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>UNLOCK EVERYTHING (ALL MAPS, WEAPONS, SKINS &amp; EMOTES)</span>
                        </button>
                      </div>
                    </div>

                    {/* Individual Category Unlock / Lock Toggles */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-[11px]">
                      <span className="font-semibold text-slate-400 mr-1">Category Toggles:</span>
                      {(
                        [
                          { id: 'maps', label: 'All 5 Maps', active: mapsFull },
                          { id: 'weapons', label: 'All Guns & Melee', active: weaponsFull },
                          { id: 'vehicles', label: 'All Planes/Chutes/Grenades', active: vehiclesFull },
                          { id: 'skins', label: 'All Skins', active: skinsFull },
                          { id: 'emotes', label: 'All 10 Emotes', active: emotesFull },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={busyTarget}
                          onClick={() =>
                            handlePlayerUpdate(
                              targetId,
                              cat.active ? { lockCategory: cat.id } : { unlockCategory: cat.id }
                            )
                          }
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 font-bold transition ${
                            cat.active
                              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200 hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-200'
                              : 'border-white/15 bg-slate-900 text-slate-300 hover:border-cyan-400/50 hover:text-white'
                          }`}
                          title={cat.active ? 'Click to Lock/Reset to Starter' : 'Click to Unlock All in Category'}
                        >
                          {cat.active ? <CheckCircle2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Global Ban Reason + Quick Coin Grant Controls */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 border-t border-white/10 pt-3 text-xs">
                      <label className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-slate-900/80 px-3 py-1.5">
                        <Ban className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">Ban Reason:</span>
                        <input
                          type="text"
                          maxLength={120}
                          value={banReasonDraft}
                          onChange={(e) => setBanReasonDraft(e.target.value)}
                          placeholder="Cheating / Rule Violation"
                          className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                        />
                      </label>

                      <label className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-slate-900/80 px-3 py-1.5">
                        <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">Coin Grant Amount:</span>
                        <input
                          type="number"
                          min={1}
                          max={10000000}
                          value={coinGrantAmount}
                          onChange={(e) => setCoinGrantAmount(e.target.value)}
                          className="w-28 bg-transparent font-mono text-xs font-bold text-amber-300 focus:outline-none tabular-nums"
                        />
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Search & Refresh Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                    placeholder="Filter by User ID, @username, or player name"
                    className="w-full rounded-xl border border-white/15 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchPlayers(playerQuery)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${playersLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Directory</span>
                </button>
              </div>

              {playersLoading && players.length === 0 ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((row) => (
                    <div
                      key={row}
                      className="h-12 w-full rounded-xl bg-slate-800/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : players.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-10 text-center text-xs text-slate-400">
                  No matching player accounts found. Registered accounts and synced guests appear here automatically.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-slate-950 text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">User ID &amp; Username</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Coins</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Level</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Wins / KOs</th>
                        <th className="px-3 py-2.5 font-semibold">Status Badges</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {players.map((p) => {
                        const busyRow = playerBusyId === p.accountId;
                        const isSelf = p.accountId === currentAccountId;
                        const isSelected = selectedPlayerId === p.accountId;
                        const levelVal = Number(levelInputs[p.accountId] ?? p.level);
                        const grantAmt = Math.max(100, Math.round(Number(coinGrantAmount) || 5000));
                        const allUnlocked =
                          Boolean(p.isVipAllUnlocked) ||
                          (ARENA_CATALOG.every((a) => p.unlockedArenas.includes(a.id)) &&
                            GUN_CATALOG.every((g) => p.unlockedGuns.includes(g.id)) &&
                            SKIN_CATALOG.every((s) => p.unlockedCharacters.includes(s.id)) &&
                            EMOTE_CATALOG.every((e) => (p.unlockedEmotes ?? []).includes(e.id)));

                        return (
                          <React.Fragment key={p.accountId}>
                            <tr
                              onClick={() => setSelectedPlayerId(p.accountId)}
                              className={`cursor-pointer transition ${
                                isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-900/50'
                              }`}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5 font-semibold text-white">
                                  <span>
                                    {p.playerName}
                                    <span className="font-mono text-cyan-400">#{p.playerTag}</span>
                                  </span>
                                  {isSelf && (
                                    <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-black text-cyan-300">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {p.username ? `@${p.username}` : 'Guest'} ·{' '}
                                  <span className="font-mono text-slate-300">{p.accountId}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-300 tabular-nums">
                                {p.coins.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={25}
                                    value={levelInputs[p.accountId] ?? String(p.level)}
                                    onChange={(e) =>
                                      setLevelInputs((prev) => ({
                                        ...prev,
                                        [p.accountId]: e.target.value,
                                      }))
                                    }
                                    className="w-14 rounded border border-white/15 bg-slate-900 px-1.5 py-1 text-right font-mono text-xs text-white tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    disabled={busyRow || !Number.isFinite(levelVal) || levelVal === p.level}
                                    onClick={() =>
                                      handlePlayerUpdate(p.accountId, { level: levelVal })
                                    }
                                    className="rounded border border-white/15 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                                  >
                                    Set
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-300 tabular-nums">
                                {p.totalWins + (p.battleRoyaleWins || 0)}W / {p.totalKOs}K
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  {p.banned ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-rose-500/20 border border-rose-400/40 px-1.5 py-0.5 text-[10px] font-black text-rose-300"
                                      title={p.banReason || 'Suspended by Admin'}
                                    >
                                      <Ban className="h-3 w-3" /> BANNED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                      <CheckCircle2 className="h-3 w-3" /> ACTIVE
                                    </span>
                                  )}
                                  {allUnlocked && (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                                      <Sparkles className="h-3 w-3" /> ALL UNLOCKED
                                    </span>
                                  )}
                                </div>
                                {p.banned && p.banReason && (
                                  <div className="mt-0.5 max-w-[160px] truncate text-[10px] text-rose-300/80">
                                    {p.banReason}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busyRow}
                                    onClick={() =>
                                      handlePlayerUpdate(p.accountId, { addCoins: grantAmt })
                                    }
                                    className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 whitespace-nowrap shrink-0"
                                  >
                                    +{grantAmt.toLocaleString()} Coins
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyRow}
                                    onClick={() =>
                                      handlePlayerUpdate(p.accountId, { unlockAll: true })
                                    }
                                    className="rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-black text-cyan-200 hover:bg-cyan-500/30 whitespace-nowrap shrink-0"
                                  >
                                    UNLOCK ALL FREE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInspectPlayerId((cur) =>
                                        cur === p.accountId ? null : p.accountId
                                      )
                                    }
                                    className="rounded-lg border border-white/15 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                                  >
                                    {inspectPlayerId === p.accountId ? 'Hide Items' : 'Items'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyRow || (isSelf && !p.banned)}
                                    onClick={() =>
                                      handlePlayerUpdate(p.accountId, {
                                        banned: !p.banned,
                                        banReason: !p.banned ? banReasonDraft : '',
                                      })
                                    }
                                    title={
                                      isSelf && !p.banned
                                        ? 'Protected: Cannot ban your own active Admin session'
                                        : p.banned
                                          ? 'Unban this player account'
                                          : 'Ban this player account'
                                    }
                                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase whitespace-nowrap shrink-0 disabled:opacity-40 ${
                                      p.banned
                                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                                        : 'border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                                    }`}
                                  >
                                    {p.banned ? 'UNBAN' : isSelf ? 'PROTECTED' : 'BAN'}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Per-Item Unlock / Revoke Drawer */}
                            {inspectPlayerId === p.accountId && (
                              <tr className="bg-slate-900/90">
                                <td colSpan={6} className="px-4 py-3 space-y-2.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-cyan-300">
                                      Grant or Revoke Individual Items for {p.playerName}
                                    </span>
                                    {p.isVipAllUnlocked && (
                                      <button
                                        type="button"
                                        disabled={busyRow}
                                        onClick={() =>
                                          handlePlayerUpdate(p.accountId, { unlockAll: false })
                                        }
                                        className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/25"
                                      >
                                        Disable VIP Free Mode
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 text-[11px]">
                                    {(
                                      [
                                        {
                                          cat: 'backgrounds' as ShopCategory,
                                          label: 'Maps',
                                          items: ARENA_CATALOG.map((i) => ({ id: i.id, name: i.name })),
                                          owned: p.unlockedArenas,
                                        },
                                        {
                                          cat: 'guns' as ShopCategory,
                                          label: 'Guns',
                                          items: GUN_CATALOG.map((i) => ({ id: i.id, name: i.name })),
                                          owned: p.unlockedGuns,
                                        },
                                        {
                                          cat: 'knives' as ShopCategory,
                                          label: 'Knives',
                                          items: KNIFE_CATALOG.map((i) => ({ id: i.id, name: i.name })),
                                          owned: p.unlockedKnives,
                                        },
                                        {
                                          cat: 'skins' as ShopCategory,
                                          label: 'Skins',
                                          items: SKIN_CATALOG.map((i) => ({ id: i.id, name: i.name })),
                                          owned: p.unlockedCharacters,
                                        },
                                        {
                                          cat: 'airplanes' as ShopCategory,
                                          label: 'Airplanes',
                                          items: AIRPLANE_CATALOG.map((i) => ({ id: i.id, name: i.name })),
                                          owned: p.unlockedAirplanes ?? [],
                                        },
                                        {
                                          cat: 'emotes' as ShopCategory,
                                          label: 'Emotes',
                                          items: EMOTE_CATALOG.map((i) => ({ id: i.id, name: i.name })),
                                          owned: p.unlockedEmotes ?? [],
                                        },
                                      ] as const
                                    ).map((group) => (
                                      <div
                                        key={group.cat}
                                        className="rounded-lg border border-white/10 bg-slate-950/70 p-2 space-y-1.5"
                                      >
                                        <div className="font-bold text-slate-300">{group.label}</div>
                                        <div className="flex flex-wrap gap-1">
                                          {group.items.map((item) => {
                                            const has = group.owned.includes(item.id as never);
                                            return (
                                              <button
                                                key={item.id}
                                                type="button"
                                                disabled={busyRow}
                                                onClick={() =>
                                                  handlePlayerUpdate(
                                                    p.accountId,
                                                    has
                                                      ? { revokeItem: { category: group.cat, itemId: item.id } }
                                                      : { grantItem: { category: group.cat, itemId: item.id } }
                                                  )
                                                }
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                                                  has
                                                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-rose-500/25 hover:text-rose-200'
                                                    : 'bg-slate-800 text-slate-400 border border-white/10 hover:bg-cyan-500/20 hover:text-cyan-200'
                                                }`}
                                                title={has ? 'Click to Revoke / Lock' : 'Click to Grant Free'}
                                              >
                                                {item.name}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE MATCH & WORLD SPAWNER */}
          {tab === 'live' && (
            <div className="space-y-6">
              {!inMatch && (
                <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                  Enter any island match to spawn vehicles, teleport across landmarks, or heal live. (+10,000 Coins still works from the lobby.)
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Player Actions */}
                <div className="space-y-3 border-b border-white/10 pb-5 md:border-b-0 md:border-r md:pr-6 md:pb-0">
                  <h3 className="text-xs font-semibold text-white">Player Vitals &amp; Economy</h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!inMatch}
                      onClick={() => {
                        onHealSelf();
                        setFeedback({ type: 'ok', text: 'Restored 3 hearts, full HP, and Lv.3 armor.' });
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                    >
                      <HeartPulse className="h-4 w-4 shrink-0" />
                      <span>Heal Self + Lv.3 Armor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAddCoins();
                        setFeedback({
                          type: 'ok',
                          text: `Added +10,000 Coins to active profile (${currentAccountId.slice(0, 10)}).`,
                        });
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 whitespace-nowrap"
                    >
                      <Coins className="h-4 w-4 shrink-0" />
                      <span>Add +10,000 Coins</span>
                    </button>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <h3 className="text-xs font-semibold text-white">Instant Map Teleport</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'titanic', label: 'Titanic Liner' },
                          { id: 'sea_cave', label: 'Coral Sea Cave' },
                          { id: 'tribal_village', label: 'Tribal Village' },
                          { id: 'volcano', label: 'Volcano Peak' },
                          { id: 'main_island', label: 'Main Island' },
                        ] as const
                      ).map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          disabled={!inMatch}
                          onClick={() => {
                            onTeleport(loc.id);
                            setFeedback({ type: 'ok', text: `Teleported to ${loc.label}.` });
                          }}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                        >
                          <Compass className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{loc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* World Entity Spawner */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-white">
                    Spawn In Front of Player
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(
                      [
                        { kind: 'golden_eagle', label: 'Giant Golden Eagle' },
                        { kind: 'pterodactyl', label: 'Pterodactyl' },
                        { kind: 'sky_griffin', label: 'Arctic Sky Griffin' },
                        { kind: 'gorilla', label: 'Jungle Gorilla' },
                        { kind: 'rhino', label: 'Armored Rhino' },
                        { kind: 'cheetah', label: 'Swift Cheetah' },
                        { kind: 'turtle_mount', label: 'Giant Sea Turtle' },
                        { kind: 'manta_mount', label: 'Ocean Manta Ray' },
                        { kind: 'shark_mount', label: 'Rideable Shark' },
                        { kind: 'horse', label: 'Rideable Horse' },
                        { kind: 'buggy', label: 'Armored Jeep / 4x4' },
                        { kind: 'car', label: 'Turbo Street Car' },
                        { kind: 'bike', label: 'Neon Dirt Bike' },
                        { kind: 'lion', label: 'Wild Lion' },
                      ] as const
                    ).map((sp) => (
                      <button
                        key={sp.kind}
                        type="button"
                        disabled={!inMatch}
                        onClick={() => {
                          onSpawnEntity(sp.kind);
                          setFeedback({ type: 'ok', text: `Spawned ${sp.label} ahead of you.` });
                        }}
                        className="rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS & QR UPLOAD */}
          {tab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left: QR Code Drag & Drop + Settings */}
                <div className="lg:col-span-5 rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <QrCode className="h-4 w-4 text-amber-400" />
                      <span>Official UPI QR Code Uploader</span>
                    </div>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300">
                      ₹1 = 100 Coins
                    </span>
                  </div>

                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleQrFileSelected(e.dataTransfer.files?.[0]);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-slate-900/70 p-4 text-center transition hover:border-cyan-400/60"
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleQrFileSelected(e.target.files?.[0])}
                      className="hidden"
                    />
                    {qrImageDraft ? (
                      <>
                        <div className="rounded-xl bg-white p-2 shadow-lg">
                          <img
                            src={qrImageDraft}
                            alt="Uploaded UPI QR Preview"
                            className="h-40 w-40 object-contain"
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-cyan-300">
                          Click or drop another image to replace QR
                        </span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-8 w-8 text-cyan-400" />
                        <div className="text-xs font-bold text-white">
                          Drag &amp; drop or choose QR Code Image
                        </div>
                        <div className="text-[11px] text-slate-400">
                          PNG, JPG, or WEBP · Players cannot purchase until uploaded
                        </div>
                      </>
                    )}
                  </label>

                  <div className="space-y-3 text-xs">
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-300">Optional UPI ID</span>
                      <input
                        type="text"
                        value={upiIdDraft}
                        onChange={(e) => setUpiIdDraft(e.target.value)}
                        placeholder="e.g. blockwar@upi"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-300">Optional Payee / Merchant Name</span>
                      <input
                        type="text"
                        value={payeeNameDraft}
                        onChange={(e) => setPayeeNameDraft(e.target.value)}
                        placeholder="e.g. BLOCK WAR Official Store"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={qrSaveBusy || !qrImageDraft}
                      onClick={() => handleSaveQrConfig(false)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{qrSaveBusy ? 'Saving...' : 'Save Active QR'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={qrSaveBusy}
                      onClick={() => handleSaveQrConfig(true)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>REMOVE / CLEAR QR</span>
                    </button>
                  </div>
                </div>

                {/* Right: Live Payment History & Audit Ledger */}
                <div className="lg:col-span-7 rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div>
                      <h3 className="text-xs font-bold text-white">Payment History &amp; Audit Ledger</h3>
                      <p className="text-[11px] text-slate-400">
                        Verified UPI top-ups with unique 12-digit UTR &amp; receipt screenshots
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchPayments}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      <RefreshCw className={`h-3 w-3 ${paymentsLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {(() => {
                    const totalRupees = paymentHistory.reduce((sum, r) => sum + (Number(r.paidAmountINR) || 0), 0);
                    const totalCoinsSold = paymentHistory.reduce((sum, r) => sum + (Number(r.creditedCoins) || 0), 0);
                    const maxOrderRupees = Math.max(1, ...paymentHistory.map((r) => Number(r.paidAmountINR) || 0));
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2.5 text-xs">
                          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2.5">
                            <div className="text-[10px] font-bold uppercase text-emerald-300">Total Revenue</div>
                            <div className="font-mono text-base font-black text-white tabular-nums">
                              ₹{totalRupees.toLocaleString()}
                            </div>
                          </div>
                          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5">
                            <div className="text-[10px] font-bold uppercase text-amber-300">Coins Sold</div>
                            <div className="font-mono text-base font-black text-amber-200 tabular-nums">
                              {totalCoinsSold.toLocaleString()}
                            </div>
                          </div>
                          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2.5">
                            <div className="text-[10px] font-bold uppercase text-cyan-300">Verified Orders</div>
                            <div className="font-mono text-base font-black text-cyan-200 tabular-nums">
                              {paymentHistory.length}
                            </div>
                          </div>
                        </div>

                        {paymentHistory.length > 0 && (
                          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Recent Revenue Graph (₹ per Verified Order)
                            </div>
                            <div className="space-y-1.5">
                              {paymentHistory.slice(0, 5).map((pay) => {
                                const pct = Math.max(8, Math.round(((Number(pay.paidAmountINR) || 0) / maxOrderRupees) * 100));
                                return (
                                  <div key={`bar_${pay.id}`} className="flex items-center gap-2 text-[10px]">
                                    <span className="w-20 truncate font-semibold text-slate-300">
                                      {pay.username}
                                    </span>
                                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="w-24 text-right font-mono font-bold text-emerald-300 tabular-nums">
                                      ₹{pay.paidAmountINR} (+{pay.creditedCoins})
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {paymentHistory.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-12 text-center text-xs text-slate-500">
                      No coin top-up receipts submitted yet. Verified player payments will appear here in real time.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-900/40">
                      {paymentHistory.map((pay) => (
                        <div
                          key={pay.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptUrl(pay.screenshotDataUrl)}
                              className="group relative h-11 w-11 overflow-hidden rounded-lg border border-white/15 bg-slate-950 shrink-0"
                              title="Inspect receipt screenshot"
                            >
                              <img
                                src={pay.screenshotDataUrl}
                                alt={`Receipt ${pay.utr}`}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 group-hover:opacity-100 transition">
                                <Eye className="h-3.5 w-3.5 text-white" />
                              </span>
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <span className="truncate">{pay.username}</span>
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                                  ₹{pay.paidAmountINR} → +{pay.creditedCoins.toLocaleString()}c
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-cyan-300">
                                UTR: {pay.utr} ·{' '}
                                <span className="font-sans text-slate-400">
                                  {new Date(pay.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-slate-400">{pay.aiVerdict}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lightbox Preview for Audit Receipt Screenshot */}
              {previewReceiptUrl && (
                <div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4"
                  onClick={() => setPreviewReceiptUrl(null)}
                >
                  <div className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-3 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptUrl(null)}
                      className="absolute right-3 top-3 rounded-lg bg-slate-950/80 p-1.5 text-white hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img
                      src={previewReceiptUrl}
                      alt="Audit receipt full preview"
                      className="max-h-[78vh] w-auto rounded-xl object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: POLICY & COMPLIANCE (AUDIT TABLE + LIVE POLICY EDITOR) */}
          {tab === 'policy' && (
            <div className="space-y-6">
              {/* Compliance Summary Strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-cyan-500/25 bg-slate-950/80 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Active Policy Version</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xl font-black text-cyan-300 tabular-nums">
                      {currentPolicy.version}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({currentPolicy.sections.length} rules)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-slate-950/80 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Accepted ({currentPolicy.version})
                  </div>
                  <div className="mt-1 font-mono text-xl font-black text-emerald-300 tabular-nums">
                    {policyAcceptedCount}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-slate-950/80 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Pending Confirmation</div>
                  <div className="mt-1 font-mono text-xl font-black text-amber-300 tabular-nums">
                    {policyPendingCount}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Total Audited Players</div>
                  <div className="mt-1 font-mono text-xl font-black text-white tabular-nums">
                    {policyRecords.length}
                  </div>
                </div>
              </div>

              {/* Section 1: Complete Policy Acceptance Audit Table */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <FileCheck2 className="h-4 w-4 text-emerald-400" />
                      Player Policy Acceptance Audit Table
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verified confirmation records persisted in both local storage and backend database.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchPolicyRecords(policyQuery)}
                    disabled={policyLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${policyLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Records</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={policyQuery}
                      onChange={(e) => setPolicyQuery(e.target.value)}
                      placeholder="Filter by User ID or Username..."
                      className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 p-1">
                    {(['all', 'ACCEPTED', 'PENDING'] as const).map((statusOpt) => (
                      <button
                        key={statusOpt}
                        type="button"
                        onClick={() => setPolicyFilter(statusOpt)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                          policyFilter === statusOpt
                            ? statusOpt === 'ACCEPTED'
                              ? 'bg-emerald-500 text-slate-950'
                              : statusOpt === 'PENDING'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {statusOpt === 'all' ? 'All' : statusOpt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">User ID</th>
                        <th className="px-3.5 py-2.5 font-semibold">Username</th>
                        <th className="px-3.5 py-2.5 font-semibold">Policy Status</th>
                        <th className="px-3.5 py-2.5 font-semibold">Policy Version</th>
                        <th className="px-3.5 py-2.5 font-semibold">Exact Confirmation Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-950/60">
                      {filteredPolicyRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                            {policyLoading
                              ? 'Loading policy acceptance records...'
                              : 'No matching player compliance records found.'}
                          </td>
                        </tr>
                      ) : (
                        filteredPolicyRecords.map((rec) => {
                          const isAccepted = rec.status === 'ACCEPTED';
                          return (
                            <tr key={rec.accountId} className="hover:bg-slate-900/50">
                              <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-300">
                                {rec.accountId}
                              </td>
                              <td className="px-3.5 py-2.5 font-semibold text-white">
                                {rec.username || rec.playerName || 'Player'}
                                {rec.accountId === currentAccountId && (
                                  <span className="ml-1.5 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                                    YOU
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5">
                                {isAccepted ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                                    <CheckCircle2 className="h-3 w-3" /> ACCEPTED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
                                    <Clock className="h-3 w-3" /> PENDING
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-[11px] text-cyan-200 tabular-nums">
                                {rec.policyVersion || '—'}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-300 tabular-nums">
                                {rec.acceptedAt ? formatPolicyTimestamp(rec.acceptedAt) : 'Not Confirmed Yet'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Live Policy Text & Version Editor */}
              <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <ScrollText className="h-4 w-4 text-cyan-400" />
                      Live Policy Text &amp; Version Editor
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Edit BLOCK WAR game rules directly. Clicking{' '}
                      <b className="text-emerald-300">UPDATE &amp; REQUIRE RE-CONFIRMATION</b> bumps{' '}
                      <span className="font-mono text-cyan-300">
                        {currentPolicy.version} → {bumpPolicyVersion(currentPolicy.version)}
                      </span>{' '}
                      so every player must confirm the updated policy before their next match.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyDraft((prev) => ({
                          ...prev,
                          sections: [
                            ...prev.sections,
                            {
                              id: `rule_${Date.now()}`,
                              title: `${prev.sections.length + 1}. New Policy Section`,
                              body: 'Enter clear, player-friendly rules or guidelines here.',
                            },
                          ],
                        }));
                      }}
                      className="flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Section
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPolicyDraft(
                          normalizeGamePolicy({
                            ...DEFAULT_GAME_POLICY,
                            version: currentPolicy.version,
                          })
                        )
                      }
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset Default Text
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                      Policy Document Title
                    </label>
                    <input
                      type="text"
                      value={policyDraft.title}
                      onChange={(e) => setPolicyDraft((p) => ({ ...p, title: e.target.value }))}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                      Policy Subtitle / Notice
                    </label>
                    <input
                      type="text"
                      value={policyDraft.subtitle}
                      onChange={(e) => setPolicyDraft((p) => ({ ...p, subtitle: e.target.value }))}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {policyDraft.sections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      className="rounded-xl border border-white/10 bg-slate-900/80 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-500/20 font-mono text-[11px] font-bold text-cyan-300">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) =>
                            setPolicyDraft((prev) => ({
                              ...prev,
                              sections: prev.sections.map((item, i) =>
                                i === idx ? { ...item, title: e.target.value } : item
                              ),
                            }))
                          }
                          placeholder="Section Heading"
                          className="flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
                        />
                        {policyDraft.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPolicyDraft((prev) => ({
                                ...prev,
                                sections: prev.sections.filter((_, i) => i !== idx),
                              }))
                            }
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20"
                            title="Remove section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={sec.body}
                        onChange={(e) =>
                          setPolicyDraft((prev) => ({
                            ...prev,
                            sections: prev.sections.map((item, i) =>
                              i === idx ? { ...item, body: e.target.value } : item
                            ),
                          }))
                        }
                        placeholder="Policy section details..."
                        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-200 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <span className="text-[11px] text-slate-400">
                    Last updated:{' '}
                    <span className="font-mono text-slate-300">
                      {formatPolicyTimestamp(currentPolicy.updatedAt)}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={policySaveBusy}
                      onClick={() => handleSavePolicy(false)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Save Text Only ({currentPolicy.version})
                    </button>
                    <button
                      type="button"
                      disabled={policySaveBusy}
                      onClick={() => handleSavePolicy(true)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      <span>
                        {policySaveBusy
                          ? 'Publishing Policy...'
                          : `UPDATE & REQUIRE RE-CONFIRMATION (${bumpPolicyVersion(currentPolicy.version)})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PERMANENT HISTORY CHAT AUDIT ARCHIVE */}
          {tab === 'history_chat' && (
            <div className="space-y-4">
              {/* Top KPI Summary Strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold text-slate-400">Total Archived Messages</div>
                  <div className="mt-1 text-xl font-black text-white tabular-nums">
                    {chatArchive.length}
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3">
                  <div className="text-[11px] font-semibold text-cyan-200">Images &amp; Videos</div>
                  <div className="mt-1 text-xl font-black text-cyan-300 tabular-nums">
                    {chatTotalMediaCount}
                  </div>
                </div>
                <div className="rounded-xl border border-orange-400/35 bg-orange-500/10 p-3">
                  <div className="text-[11px] font-semibold text-orange-200">Deleted by User (Preserved)</div>
                  <div className="mt-1 text-xl font-black text-orange-300 tabular-nums">
                    {chatTotalDeletedCount}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="text-[11px] font-semibold text-slate-400">Active Threads</div>
                  <div className="mt-1 text-xl font-black text-emerald-300 tabular-nums">
                    {chatThreads.length}
                  </div>
                </div>
              </div>

              {/* Search, Filter & Refresh Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Search by Username, User ID, or keyword..."
                    className="w-full rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'ALL MESSAGES' },
                      { id: 'media', label: 'IMAGES & VIDEOS ONLY' },
                      { id: 'deleted', label: 'DELETED BY USER' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setChatFilter(f.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition whitespace-nowrap ${
                        chatFilter === f.id
                          ? f.id === 'deleted'
                            ? 'bg-orange-500 text-slate-950'
                            : 'bg-cyan-500 text-slate-950'
                          : 'border border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={fetchChatArchive}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${chatLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Main 2-Column Security Audit Layout */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Left Sidebar: Global & Player-to-Player Thread Browser */}
                <aside className="lg:col-span-4 space-y-2 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Conversations ({chatThreads.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">PERMANENT LOG</span>
                  </div>

                  <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setChatSelectedThread('all')}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                        chatSelectedThread === 'all'
                          ? 'border-cyan-400/50 bg-cyan-500/15 text-white'
                          : 'border-white/5 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <History className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        <span className="truncate font-bold">All Conversations</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {chatArchive.length}
                      </span>
                    </button>

                    {chatThreads.map((th) => (
                      <button
                        key={th.threadId}
                        type="button"
                        onClick={() => setChatSelectedThread(th.threadId)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          chatSelectedThread === th.threadId
                            ? 'border-cyan-400/50 bg-cyan-500/15 text-white'
                            : 'border-white/5 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {th.channel === 'global' ? (
                              <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            )}
                            <span className="truncate text-xs font-bold">{th.label}</span>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] text-slate-400 tabular-nums">
                            {th.totalMessages}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                          <span className="truncate font-mono text-slate-400">
                            {formatChatTimestamp(th.lastMessageAt)}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {th.mediaMessages > 0 && (
                              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-bold text-cyan-300">
                                {th.mediaMessages} media
                              </span>
                            )}
                            {th.deletedMessages > 0 && (
                              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-bold text-orange-300">
                                {th.deletedMessages} del
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </aside>

                {/* Right Stream: Permanent Audit Cards */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Showing <strong className="text-white">{filteredChatMessages.length}</strong> archived record
                      {filteredChatMessages.length === 1 ? '' : 's'} (user-deleted messages remain permanently preserved)
                    </span>
                  </div>

                  {filteredChatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-950/60 py-14 text-center">
                      <MessageSquare className="h-8 w-8 text-slate-600" />
                      <div className="mt-2 text-sm font-bold text-slate-300">
                        No archived chat messages match your filter
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Every message, photo, and video sent in Global Lobby Chat or Direct Messages is logged here permanently.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                      {filteredChatMessages.map((msg) => {
                        const status = chatUserStatuses[msg.senderId] || {
                          banned: false,
                          chatMuted: false,
                        };
                        const muteBusy = chatBusyId === `mute:${msg.senderId}`;
                        const banBusy = chatBusyId === `ban:${msg.senderId}`;
                        const purgeBusy = chatBusyId === `purge:${msg.id}`;

                        return (
                          <article
                            key={msg.id}
                            className={`rounded-xl border p-3.5 transition ${
                              msg.deletedByUser
                                ? 'border-orange-500/40 bg-orange-950/20'
                                : 'border-white/10 bg-slate-950/75'
                            }`}
                          >
                            {/* Header Row: Sender, Channel, Status & Deleted Flag */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PlayerAvatar
                                  avatarUrl={msg.senderAvatarUrl}
                                  avatarIcon={msg.senderAvatarIcon}
                                  alt={msg.senderUsername}
                                  size="sm"
                                  shape="circle"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-black text-white">
                                      {msg.senderUsername}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      ({msg.senderId})
                                    </span>
                                    {msg.channel === 'global' ? (
                                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                        GLOBAL CHAT
                                      </span>
                                    ) : (
                                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                        DM &rarr; {msg.recipientUsername || msg.recipientId}
                                      </span>
                                    )}
                                    {status.chatMuted && (
                                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                                        MUTED
                                      </span>
                                    )}
                                    {status.banned && (
                                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-300">
                                        BANNED
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Sent: {formatChatTimestamp(msg.createdAt)}
                                    </span>
                                    {msg.deletedByUser && (
                                      <span className="inline-flex items-center gap-1 rounded border border-orange-400/50 bg-orange-500/20 px-2 py-0.5 text-[10px] font-black text-orange-200">
                                        [DELETED BY USER AT{' '}
                                        {formatChatTimestamp(msg.deletedAt || msg.createdAt)}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Original Text Body */}
                            {msg.text && (
                              <p className="mt-2.5 whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-slate-900/75 px-3 py-2 text-xs leading-relaxed text-slate-100">
                                {msg.text}
                              </p>
                            )}

                            {/* Attached Image or Video (Always Preserved & Inspectable) */}
                            {msg.mediaType === 'image' && msg.mediaDataUrl && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-lg border border-cyan-400/20 bg-slate-900/70 p-2.5">
                                <button
                                  type="button"
                                  onClick={() => setChatLightboxUrl(msg.mediaDataUrl || null)}
                                  className="group relative overflow-hidden rounded-lg border border-white/15"
                                  title="Click to inspect full-size image"
                                >
                                  <img
                                    src={msg.mediaDataUrl}
                                    alt={msg.mediaFileName || 'Archived chat image'}
                                    className="max-h-40 max-w-[240px] object-cover transition group-hover:scale-105"
                                  />
                                  <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                                    <Maximize2 className="h-3 w-3" /> Inspect
                                  </span>
                                </button>
                                <div className="text-[11px] text-slate-400 space-y-0.5">
                                  <div className="flex items-center gap-1 font-bold text-cyan-300">
                                    <ImageIcon className="h-3.5 w-3.5" /> Attached Image
                                  </div>
                                  <div className="font-mono text-[10px]">
                                    {msg.mediaFileName || 'photo.jpg'}
                                    {msg.mediaSizeKb ? ` (${msg.mediaSizeKb} KB)` : ''}
                                  </div>
                                </div>
                              </div>
                            )}

                            {msg.mediaType === 'video' && msg.mediaDataUrl && (
                              <div className="mt-2.5 space-y-1.5 rounded-lg border border-purple-400/25 bg-slate-900/70 p-2.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="flex items-center gap-1 font-bold text-purple-300">
                                    <Film className="h-3.5 w-3.5" /> Attached Video
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {msg.mediaFileName || 'video.mp4'}
                                    {msg.mediaDurationSec ? ` • ${msg.mediaDurationSec}s` : ''}
                                    {msg.mediaSizeKb ? ` • ${msg.mediaSizeKb} KB` : ''}
                                  </span>
                                </div>
                                <video
                                  src={msg.mediaDataUrl}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="max-h-56 w-full rounded-lg border border-white/10 bg-black"
                                />
                              </div>
                            )}

                            {/* Admin Moderation & Record Purge Action Bar */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                              <span className="font-mono text-[10px] text-slate-500">
                                ID: {msg.id}
                              </span>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {msg.mediaType === 'image' && msg.mediaDataUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setChatLightboxUrl(msg.mediaDataUrl || null)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/25"
                                  >
                                    <Eye className="h-3 w-3" /> Full View
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={Boolean(chatBusyId)}
                                  onClick={() =>
                                    handleChatToggleMute(
                                      msg.senderId,
                                      msg.senderUsername,
                                      status.chatMuted
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                    status.chatMuted
                                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                                      : 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                                  }`}
                                >
                                  {status.chatMuted ? (
                                    <Volume2 className="h-3 w-3" />
                                  ) : (
                                    <VolumeX className="h-3 w-3" />
                                  )}
                                  <span>
                                    {muteBusy
                                      ? 'Updating...'
                                      : status.chatMuted
                                        ? 'UNMUTE'
                                        : 'MUTE'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={Boolean(chatBusyId)}
                                  onClick={() =>
                                    handleChatToggleBan(
                                      msg.senderId,
                                      msg.senderUsername,
                                      status.banned
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                    status.banned
                                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                                      : 'border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                                  }`}
                                >
                                  <Ban className="h-3 w-3" />
                                  <span>
                                    {banBusy
                                      ? 'Updating...'
                                      : status.banned
                                        ? 'UNBAN'
                                        : 'BAN PLAYER'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={Boolean(chatBusyId)}
                                  onClick={() => handlePurgeChatRecord(msg.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                                  title="Admin-only permanent erasure from master database"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>{purgeBusy ? 'Purging...' : 'PURGE RECORD'}</span>
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: BACKEND & SECURITY SETTINGS */}
          {tab === 'security' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white">Server Runtime &amp; Storage</h3>
                  <button
                    type="button"
                    onClick={fetchStatus}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3 w-3 ${statusLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {serverStatus ? (
                  <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/60 text-xs">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Server Uptime</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {formatDuration(serverStatus.uptimeSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Memory Usage (RSS)</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {serverStatus.memoryMb} MB
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Connected WebSocket Clients</span>
                      <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                        {serverStatus.connectedWsClients}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Active Multiplayer Rooms</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {serverStatus.activeRooms}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Stored Accounts / Registered</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {serverStatus.totalAccounts} / {serverStatus.totalRegisteredUsers}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Persistence Store</span>
                      <span className="font-mono text-slate-200">{serverStatus.storagePath}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Published Config Version</span>
                      <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                        {serverStatus.configVersion}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-slate-400">Server-Side AI Compiler</span>
                      {serverStatus.geminiConfigured ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                          <Cpu className="h-3.5 w-3.5" /> Server Gemini AI Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
                          <Cpu className="h-3.5 w-3.5" /> Rule-Engine Fallback Mode (configure GEMINI_API_KEY in Settings &gt; Secrets)
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-8 text-center text-xs text-slate-400">
                    Loading live server diagnostics...
                  </div>
                )}
              </div>

              {/* Rotate 12-Character Master Password */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handlePasswordChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-4"
                >
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                    <KeyRound className="h-4 w-4 text-amber-300" />
                    <h3 className="text-xs font-semibold text-white">
                      Update 12-Character Master Key
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Rotates the persistent Admin Vault key saved on the server. Must contain exactly 12 letters or digits.
                  </p>

                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-300">
                      <label htmlFor="sec-new-key">New 12-Char Key</label>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {newPassword.length} / 12
                      </span>
                    </div>
                    <input
                      id="sec-new-key"
                      type="password"
                      maxLength={12}
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12))
                      }
                      placeholder="12 alphanumeric characters"
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="sec-confirm-key" className="mb-1 block text-xs text-slate-300">
                      Confirm Master Key
                    </label>
                    <input
                      id="sec-confirm-key"
                      type="password"
                      maxLength={12}
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12))
                      }
                      placeholder="Re-enter 12-character key"
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      passwordBusy ||
                      !/^[A-Za-z0-9]{12}$/.test(newPassword) ||
                      newPassword !== confirmPassword
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 whitespace-nowrap"
                  >
                    {serverStatus?.customAdminPasswordSet ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    <span>{passwordBusy ? 'Saving Key...' : 'Update Master Key'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Size Lightbox for Archived Chat Images */}
      {chatLightboxUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onMouseDown={() => setChatLightboxUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setChatLightboxUrl(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-slate-900 text-white shadow-lg hover:bg-slate-800"
              aria-label="Close full-size image preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={chatLightboxUrl}
              alt="Archived chat media full preview"
              className="max-h-[85vh] max-w-full rounded-xl border border-white/15 object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
