import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Award,
  Ban,
  Bot,
  Camera,
  CheckCircle2,
  Coins,
  Crown,
  Gamepad2,
  Globe,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Palette,
  Plane,
  Play,
  Plus,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Siren,
  Smile,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AccountAuthModal, AvatarBadge } from './components/AccountAuthModal';
import { AdBanner } from './components/AdBanner';
import {
  AdminControlPanel,
  AdminSpawnKind,
  AdminTeleportTarget,
} from './components/AdminControlPanel';
import { AdminLockModal } from './components/AdminLockModal';
import { ArenaCoachPanel } from './components/ArenaCoachPanel';
import { CoinStoreModal } from './components/CoinStoreModal';
import { EmoteWheel } from './components/EmoteWheel';
import { GameHud } from './components/GameHud';
import {
  DailyChallengesModal,
  InstructionsModal,
  LeaderboardModal,
  MatchSummaryModal,
  PauseModal,
  SettingsModal,
} from './components/GameModals';
import { JailModal } from './components/JailModal';
import { LockerModal } from './components/LockerModal';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { PlayerChatModal } from './components/PlayerChatModal';
import { PolicyModal } from './components/PolicyModal';
import { PlayerAvatar, ProfilePhotoModal } from './components/ProfilePhotoModal';
import { SatelliteMapModal } from './components/SatelliteMapModal';
import { ShopModal } from './components/ShopModal';
import { ShopPreview3D } from './components/ShopPreview3D';
import { TouchControls } from './components/TouchControls';
import {
  ARENA_CATALOG,
  getAirplaneDef,
  getArenaDef,
  getEmoteDef,
  getGrenadeDef,
  getGunDef,
  getKnifeDef,
  getParachuteDef,
} from './game/catalog';
import { BlockHeadEngine, TouchInputState } from './game/engine';
import {
  clearActiveSessionKey,
  getActiveSessionKey,
  getLevelBonusStats,
  levelUpgradeCost,
  loadLocalLeaderboard,
  loadProgress,
  loadSettings,
  mergeLeaderboards,
  normalizeLoadedProgress,
  offlineApplyMatchRewards,
  offlineBuyItem,
  offlineClaimChallenge,
  offlineEquipItem,
  offlineSpendCoins,
  offlineUpgradeLevel,
  sanitizePlayerTag,
  saveLocalLeaderboardEntry,
  saveProgress,
  saveSettings,
  updateLocalLeaderboardAvatar,
  xpForLevel,
} from './game/progression';
import {
  DEFAULT_LIVE_GAME_CONFIG,
  LiveConfigVersionEntry,
  LiveGameConfig,
  normalizeLiveGameConfig,
} from './game/liveConfig';
import {
  formatPolicyTimestamp,
  GamePolicyConfig,
  hasAcceptedPolicyVersion,
  normalizeGamePolicy,
} from './game/policy';
import {
  getLiveConfigRecordLocal,
  getPolicyConfigLocal,
  recordPolicyAcceptanceLocal,
  saveAdminState,
  savePolicyConfigLocal,
  syncAccountToLocalStores,
} from './game/adminPersistence';
import {
  ChatMessage,
  getMasterChatHistoryLocal,
  markChatMessageDeletedLocal,
  upsertMasterChatMessageLocal,
} from './game/chat';
import { soundEngine } from './game/sound';
import {
  ArenaId,
  CharacterCustomization,
  DailyChallenge,
  EmoteId,
  GameHudState,
  GameMode,
  GameSettings,
  LeaderboardEntry,
  MatchSummary,
  MatchTeamMode,
  PlayerProgress,
  ShopCategory,
  TeamChoice,
} from './game/types';

type ActiveModal =
  | null
  | 'shop'
  | 'locker'
  | 'multiplayer'
  | 'settings'
  | 'instructions'
  | 'leaderboard'
  | 'challenges'
  | 'coach';

export function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [selectedMode, setSelectedMode] = useState<GameMode>('single');
  const [brFormat, setBrFormat] = useState<'solo' | 'squad'>('solo');
  const [teamChoice, setTeamChoice] = useState<TeamChoice>('blue');
  const [fighterCount, setFighterCount] = useState<number>(12);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [shopBusy, setShopBusy] = useState(false);
  const [shopFeedback, setShopFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [levelMsg, setLevelMsg] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLocalLeaderboard());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Match State
  const [inMatch, setInMatch] = useState(false);
  const [hud, setHud] = useState<GameHudState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [editingTag, setEditingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState(progress.playerTag);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => !getActiveSessionKey());
  const [accountSuspendedNotice, setAccountSuspendedNotice] = useState<string | null>(() =>
    progress.banned ? progress.banReason || 'Cheating / Rule Violation' : null
  );

  // Live Game Config & Secret Admin Vault State (reads bw_live_config immediately for static + server parity)
  const initialLocalCfg = getLiveConfigRecordLocal();
  const [liveConfig, setLiveConfig] = useState<LiveGameConfig>(() =>
    normalizeLiveGameConfig(initialLocalCfg.config || DEFAULT_LIVE_GAME_CONFIG)
  );
  const [draftConfig, setDraftConfig] = useState<LiveGameConfig>(() =>
    normalizeLiveGameConfig(initialLocalCfg.config || DEFAULT_LIVE_GAME_CONFIG)
  );
  const [configVersion, setConfigVersion] = useState<string>(() => initialLocalCfg.version || 'v1.00');
  const [configHistory, setConfigHistory] = useState<LiveConfigVersionEntry[]>(() => initialLocalCfg.history || []);
  const [showAdminLock, setShowAdminLock] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [configToast, setConfigToast] = useState<string | null>(null);
  const [coinAddedToast, setCoinAddedToast] = useState<number | null>(null);
  const [policeFineToast, setPoliceFineToast] = useState<number | null>(null);
  const [displayedCoins, setDisplayedCoins] = useState<number>(() => progress.coins);
  const [showCoinStore, setShowCoinStore] = useState(false);
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [lobbyEmotePreview, setLobbyEmotePreview] = useState<EmoteId | null>(null);
  const [policyConfig, setPolicyConfig] = useState<GamePolicyConfig>(() => getPolicyConfigLocal());
  const [showPolicyReader, setShowPolicyReader] = useState(false);
  const [policyConfirmBusy, setPolicyConfirmBusy] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [avatarSaveBusy, setAvatarSaveBusy] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [liveChatMessages, setLiveChatMessages] = useState<ChatMessage[]>(() =>
    getMasterChatHistoryLocal()
  );
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const versionTapRef = useRef<{ count: number; startedAt: number }>({
    count: 0,
    startedAt: 0,
  });

  const canvasHostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BlockHeadEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const globalWsRef = useRef<WebSocket | null>(null);
  const progressRef = useRef<PlayerProgress>(progress);
  progressRef.current = progress;
  const policyConfigRef = useRef<GamePolicyConfig>(policyConfig);
  policyConfigRef.current = policyConfig;
  const showChatModalRef = useRef<boolean>(showChatModal);
  showChatModalRef.current = showChatModal;
  const pendingLaunchAfterPolicyRef = useRef<boolean>(false);
  const coinToastTimerRef = useRef<number | null>(null);
  const activeLaunchRef = useRef<{
    mode: GameMode;
    teamMode: MatchTeamMode;
    playerTeam: TeamChoice;
    arenaId: ArenaId;
    socket: WebSocket | null;
    localNetworkId: string | null;
  } | null>(null);

  const levelStats = useMemo(() => getLevelBonusStats(progress.level), [progress.level]);
  const nextLevelCost = useMemo(() => levelUpgradeCost(progress.level), [progress.level]);

  useEffect(() => {
    setFighterCount((prev) => Math.min(levelStats.maxMatchFighters, Math.max(10, prev)));
  }, [levelStats.maxMatchFighters]);

  // Configure sound & detect touch device
  useEffect(() => {
    soundEngine.configure(settings.musicVolume, settings.sfxVolume, settings.muted);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const triggerCoinAddedToast = useCallback((delta: number) => {
    if (delta <= 0) return;
    setCoinAddedToast(delta);
    if (coinToastTimerRef.current) window.clearTimeout(coinToastTimerRef.current);
    coinToastTimerRef.current = window.setTimeout(() => {
      setCoinAddedToast(null);
    }, 4500);
  }, []);

  // Animated rolling coin counter
  useEffect(() => {
    const target = progress.coins;
    if (displayedCoins === target) return;
    const start = displayedCoins;
    const diff = target - start;
    const duration = Math.min(700, Math.max(220, Math.abs(diff) > 100 ? 600 : 280));
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedCoins(Math.round(start + diff * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplayedCoins(target);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress.coins, displayedCoins]);

  // Sync account & leaderboard cleanly with backend (silent offline fallback if server absent)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: progress }),
        });
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const reason = String(errData.banReason || 'Cheating / Rule Violation');
          const bannedAcc = normalizeLoadedProgress({ ...progress, banned: true, banReason: reason });
          setProgress(bannedAcc);
          saveProgress(bannedAcc);
          setAccountSuspendedNotice(reason);
        } else if (res.ok) {
          const data = await res.json();
          if (data.account) {
            const norm = normalizeLoadedProgress(data.account);
            setProgress(norm);
            saveProgress(norm);
            setAccountSuspendedNotice(norm.banned ? norm.banReason || 'Cheating / Rule Violation' : null);
          }
        }
      } catch {
        // Offline mode
      }
      try {
        const lbRes = await fetch('/api/leaderboard');
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(mergeLeaderboards(lbData.entries || [], loadLocalLeaderboard()));
        }
      } catch {
        // Offline mode
      }
      try {
        const cfgRes = await fetch('/api/game-config');
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          if (cfgData.config) {
            const norm = normalizeLiveGameConfig(cfgData.config);
            const localRec = getLiveConfigRecordLocal();
            // If user made local edits in static mode (newer updatedAt), preserve local unless server version is different/explicitly updated
            const serverTs = cfgData.updatedAt ? Date.parse(String(cfgData.updatedAt)) : 0;
            const localTs = localRec.updatedAt ? Date.parse(localRec.updatedAt) : 0;
            if (!localTs || serverTs >= localTs) {
              setLiveConfig(norm);
              setDraftConfig(norm);
              if (cfgData.version) setConfigVersion(cfgData.version);
              if (Array.isArray(cfgData.history)) setConfigHistory(cfgData.history);
              saveAdminState({
                liveConfig: norm,
                version: cfgData.version || 'v1.00',
                history: Array.isArray(cfgData.history) ? cfgData.history : [],
              });
            }
          }
        }
      } catch {
        // Offline mode: bw_live_config already initialized state above
      }
      try {
        const polRes = await fetch('/api/policy');
        if (polRes.ok) {
          const polData = await polRes.json();
          if (polData.policy) {
            const srvPolicy = normalizeGamePolicy(polData.policy);
            const localPolicy = getPolicyConfigLocal();
            const srvTs = srvPolicy.updatedAt ? Date.parse(srvPolicy.updatedAt) : 0;
            const locTs = localPolicy.updatedAt ? Date.parse(localPolicy.updatedAt) : 0;
            if (!locTs || srvTs >= locTs || srvPolicy.version !== localPolicy.version) {
              setPolicyConfig(srvPolicy);
              savePolicyConfigLocal(srvPolicy);
            }
          }
        }
      } catch {
        // Offline mode: bw_policy_config already initialized state above
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-identify WebSocket whenever the logged-in accountId changes
  useEffect(() => {
    const ws = globalWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && progress.accountId) {
      ws.send(JSON.stringify({ type: 'identify', accountId: progress.accountId }));
    }
  }, [progress.accountId]);

  // Persistent WebSocket listener for instant global live config, VIP unlocks & ban enforcement
  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let retryTimer: number | null = null;
    let toastTimer: number | null = null;

    const connect = () => {
      if (!active) return;
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${proto}//${window.location.host}/ws`);
        globalWsRef.current = ws;
        ws.onopen = () => {
          const aid = progressRef.current?.accountId;
          if (aid && ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'identify', accountId: aid }));
          }
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'config_updated' && msg.config) {
              const norm = normalizeLiveGameConfig(msg.config);
              setLiveConfig(norm);
              setDraftConfig(norm);
              if (msg.version) setConfigVersion(String(msg.version));
              saveAdminState({
                liveConfig: norm,
                version: msg.version ? String(msg.version) : undefined,
              });
              engineRef.current?.applyLiveGameConfig(norm);
              if (msg.summary) {
                setConfigToast(`${msg.version || 'Live'}: ${msg.summary}`);
                if (toastTimer) window.clearTimeout(toastTimer);
                toastTimer = window.setTimeout(() => setConfigToast(null), 5000);
              }
            } else if (
              msg.type === 'account_banned' &&
              msg.accountId === progressRef.current?.accountId
            ) {
              const reason = String(msg.banReason || 'Cheating / Rule Violation');
              const updated = normalizeLoadedProgress({
                ...(msg.account || progressRef.current),
                banned: true,
                banReason: reason,
              });
              setProgress(updated);
              saveProgress(updated);
              setAccountSuspendedNotice(reason);
              if (engineRef.current) {
                engineRef.current.dispose();
                engineRef.current = null;
              }
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
              setInMatch(false);
              setHud(null);
              setIsPaused(false);
              setShowCoinStore(false);
              setShowEmoteWheel(false);
              soundEngine.startMusic('menu');
            } else if (
              msg.type === 'account_updated' &&
              msg.account &&
              msg.account.accountId === progressRef.current?.accountId
            ) {
              const prevCoins = progressRef.current?.coins ?? 0;
              const nextAcc = normalizeLoadedProgress(msg.account);
              setProgress(nextAcc);
              saveProgress(nextAcc);
              setAccountSuspendedNotice(
                nextAcc.banned ? nextAcc.banReason || 'Cheating / Rule Violation' : null
              );
              const gained =
                typeof msg.creditedCoins === 'number' && msg.creditedCoins > 0
                  ? msg.creditedCoins
                  : nextAcc.coins - prevCoins;
              if (gained > 0) {
                triggerCoinAddedToast(gained);
              }
            } else if (msg.type === 'policy_updated' && msg.policy) {
              const nextPolicy = normalizeGamePolicy(msg.policy);
              setPolicyConfig(nextPolicy);
              savePolicyConfigLocal(nextPolicy);
              if (msg.requireReconfirmation) {
                setConfigToast(
                  `Policy updated to ${nextPolicy.version} — please confirm the updated Game Rules before your next match.`
                );
                if (toastTimer) window.clearTimeout(toastTimer);
                toastTimer = window.setTimeout(() => setConfigToast(null), 6000);
              }
            } else if (msg.type === 'chat_message' && msg.message) {
              const incoming = msg.message as ChatMessage;
              upsertMasterChatMessageLocal(incoming);
              setLiveChatMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) {
                  return prev.map((m) => (m.id === incoming.id ? { ...m, ...incoming } : m));
                }
                return [...prev, incoming];
              });
              const myId = progressRef.current?.accountId;
              const isRelevant =
                incoming.channel === 'global' ||
                incoming.recipientId === myId ||
                incoming.senderId === myId;
              if (isRelevant && !showChatModalRef.current && incoming.senderId !== myId) {
                setUnreadChatCount((c) => Math.min(99, c + 1));
              }
            } else if (msg.type === 'chat_message_deleted' && msg.messageId) {
              const delAt = String(msg.deletedAt || new Date().toISOString());
              markChatMessageDeletedLocal(String(msg.messageId), '', delAt);
              setLiveChatMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.messageId ? { ...m, deletedByUser: true, deletedAt: delAt } : m
                )
              );
            }
          } catch {
            // Ignore malformed WS message
          }
        };
        ws.onclose = () => {
          if (globalWsRef.current === ws) globalWsRef.current = null;
          if (active) {
            retryTimer = window.setTimeout(connect, 4000);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (active) {
          retryTimer = window.setTimeout(connect, 5000);
        }
      }
    };

    connect();
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (toastTimer) window.clearTimeout(toastTimer);
      if (coinToastTimerRef.current) window.clearTimeout(coinToastTimerRef.current);
      ws?.close();
    };
  }, [triggerCoinAddedToast]);

  // Home-Page-Only Secret Ctrl+Alt+Shift hotkey & 7-tap mobile version trigger
  const openSecretAdmin = useCallback(() => {
    if (inMatch) return;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    if (adminToken) {
      setShowAdminPanel(true);
    } else {
      setShowAdminLock(true);
    }
  }, [adminToken, inMatch]);

  const handleSecretVersionTap = useCallback(() => {
    if (inMatch) return;
    const now = Date.now();
    const rec = versionTapRef.current;
    if (now - rec.startedAt > 2500) {
      rec.count = 1;
      rec.startedAt = now;
    } else {
      rec.count += 1;
    }
    if (rec.count >= 7) {
      rec.count = 0;
      rec.startedAt = 0;
      openSecretAdmin();
    }
  }, [openSecretAdmin, inMatch]);

  useEffect(() => {
    const onSecretCombo = (e: KeyboardEvent) => {
      if (e.repeat || inMatch) return;
      if (e.ctrlKey && e.altKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        openSecretAdmin();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        e.code === 'KeyB' &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        !showAdminLock &&
        !showAdminPanel &&
        !showCoinStore &&
        !showAuthModal &&
        !showPolicyReader &&
        !showProfilePhotoModal &&
        !showChatModal &&
        hasAcceptedPolicyVersion(progressRef.current, policyConfigRef.current.version)
      ) {
        e.preventDefault();
        setShowEmoteWheel((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onSecretCombo, true);
    return () => window.removeEventListener('keydown', onSecretCombo, true);
  }, [
    openSecretAdmin,
    inMatch,
    showAdminLock,
    showAdminPanel,
    showCoinStore,
    showAuthModal,
    showPolicyReader,
    showProfilePhotoModal,
    showChatModal,
  ]);

  useEffect(() => {
    const blocking =
      showAdminLock || showAdminPanel || showEmoteWheel || Boolean(hud?.missileRoomOpen);
    engineRef.current?.setPauseShortcutsBlocked(blocking);
    if (blocking && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [showAdminLock, showAdminPanel, showEmoteWheel, hud?.missileRoomOpen, inMatch]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen block
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('keydown', onKey);
    };
  }, [toggleFullscreen]);

  const handleMatchEnd = useCallback(
    async (rawSummary: MatchSummary) => {
      let finalAccount: PlayerProgress;
      let finalSummary: MatchSummary;

      try {
        const res = await fetch('/api/account/match-rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: progress.accountId, result: rawSummary }),
        });
        if (res.ok) {
          const data = await res.json();
          finalAccount = data.account;
          finalSummary = data.summary;
        } else {
          throw new Error('offline');
        }
      } catch {
        const off = offlineApplyMatchRewards(
          progress,
          rawSummary,
          liveConfig.coinRewardMultiplier
        );
        finalAccount = off.account;
        finalSummary = off.summary;
      }

      if (rawSummary.capturedByTribe) {
        finalSummary = { ...finalSummary, capturedByTribe: true };
      }
      setProgress(finalAccount);
      saveProgress(finalAccount);
      setMatchSummary(finalSummary);

      const lbEntry = {
        playerName: finalAccount.playerName,
        playerTag: finalAccount.playerTag,
        avatarUrl: finalAccount.avatarUrl,
        avatarIcon: finalAccount.avatarIcon,
        characterId: finalAccount.equipped.characterId,
        mode: finalSummary.mode,
        arena: finalSummary.arena,
        score: finalSummary.score,
        kos: finalSummary.kos,
        wave: finalSummary.waveReached,
      };
      saveLocalLeaderboardEntry(lbEntry);
      setLeaderboard((prev) => mergeLeaderboards(prev, [
        { ...lbEntry, id: `local_${Date.now()}`, createdAt: new Date().toISOString() },
      ]));

      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lbEntry),
      }).catch(() => {});
    },
    [progress, liveConfig.coinRewardMultiplier]
  );

  const launchMatch = useCallback(
    async (opts: {
      mode: GameMode;
      teamMode: MatchTeamMode;
      playerTeam: TeamChoice;
      arenaId: ArenaId;
      socket: WebSocket | null;
      localNetworkId: string | null;
    }) => {
      if (progressRef.current?.banned) {
        setAccountSuspendedNotice(
          progressRef.current.banReason || 'Cheating / Rule Violation'
        );
        soundEngine.playError();
        return;
      }
      try {
        const profRes = await fetch(
          `/api/profile?accountId=${encodeURIComponent(progressRef.current.accountId)}`
        );
        if (profRes.status === 403) {
          const data = await profRes.json().catch(() => ({}));
          const reason = String(data.banReason || 'Cheating / Rule Violation');
          const bannedAcc = normalizeLoadedProgress({
            ...progressRef.current,
            banned: true,
            banReason: reason,
          });
          setProgress(bannedAcc);
          saveProgress(bannedAcc);
          setAccountSuspendedNotice(reason);
          soundEngine.playError();
          return;
        }
      } catch {
        // Offline check fallback already enforced via progressRef.current.banned
      }

      if (!hasAcceptedPolicyVersion(progressRef.current, policyConfigRef.current.version)) {
        pendingLaunchAfterPolicyRef.current = true;
        soundEngine.playError();
        setShowPolicyReader(true);
        return;
      }

      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      pendingLaunchAfterPolicyRef.current = false;
      activeLaunchRef.current = opts;
      wsRef.current = opts.socket;
      setMatchSummary(null);
      setIsPaused(false);
      setActiveModal(null);
      setShowAdminLock(false);
      setShowAdminPanel(false);
      setShowCoinStore(false);
      setShowEmoteWheel(false);
      setShowChatModal(false);
      setShowProfilePhotoModal(false);
      setInMatch(true);
    },
    []
  );

  const handleQuickPlay = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    const tm: MatchTeamMode =
      selectedMode === 'team' || (selectedMode === 'battle_royale' && brFormat === 'squad')
        ? 'team'
        : 'ffa';
    launchMatch({
      mode: selectedMode,
      teamMode: tm,
      playerTeam: teamChoice,
      arenaId: progressRef.current.equipped.arenaId,
      socket: null,
      localNetworkId: null,
    });
  }, [selectedMode, brFormat, teamChoice, launchMatch]);

  // Mount Three.js engine once canvas container appears
  useEffect(() => {
    if (!inMatch || !canvasHostRef.current || !activeLaunchRef.current) return;
    const launch = activeLaunchRef.current;

    const engine = new BlockHeadEngine(
      canvasHostRef.current,
      {
        mode: launch.mode,
        teamMode: launch.teamMode,
        playerTeam: launch.playerTeam,
        arenaId: launch.arenaId,
        gunId: progress.equipped.gunId,
        knifeId: progress.equipped.knifeId,
        grenadeId: progress.equipped.grenadeId,
        airplaneId: progress.equipped.airplaneId ?? 'cargo_carrier',
        parachuteId: progress.equipped.parachuteId ?? 'classic_white',
        playerName: progress.playerName,
        playerTag: progress.playerTag,
        playerLevel: progress.level,
        fighterCount: launch.mode === 'battle_royale' ? 50 : fighterCount,
        customization: progress.customization,
        settings,
        liveConfig,
        networkSocket: launch.socket,
        localNetworkId: launch.localNetworkId,
      },
      {
        onHudUpdate: (h) => setHud(h),
        onMatchEnd: (s) => handleMatchEnd(s),
        onPauseChange: (p) => setIsPaused(p),
        onPoliceArrest: (requestedFine) => {
          const cur = progressRef.current;
          const fine = Math.min(cur.coins || 0, requestedFine);
          if (fine > 0) {
            const nextAcc = normalizeLoadedProgress({
              ...cur,
              coins: Math.max(0, (cur.coins || 0) - fine),
            });
            setProgress(nextAcc);
            saveProgress(nextAcc);
            syncAccountToLocalStores(nextAcc);
            fetch('/api/profile/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                account: nextAcc,
                allowCoinDeduction: true,
                reason: 'police_fine',
              }),
            }).catch(() => {});
          }
          setPoliceFineToast(fine);
          window.setTimeout(() => {
            setPoliceFineToast((prev) => (prev === fine ? null : prev));
          }, 4200);
          return fine;
        },
      }
    );
    engineRef.current = engine;
    engine.setPauseShortcutsBlocked(false);
    engine.setOnEmoteWheelToggle(() => {
      engine.unlockPointer();
      setShowEmoteWheel((prev) => !prev);
    });

    if (launch.socket) {
      launch.socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'snapshot') {
            engine.applyNetworkSnapshot(
              msg.players || [],
              msg.projectiles || [],
              msg.pickups || [],
              msg.timeRemaining ?? 120
            );
          }
        } catch {
          // Ignore malformed WS message
        }
      };
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inMatch]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyLiveGameConfig(liveConfig);
    }
  }, [liveConfig]);

  const quitMatch = () => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setInMatch(false);
    setHud(null);
    setMatchSummary(null);
    setIsPaused(false);
    setShowEmoteWheel(false);
    soundEngine.startMusic('menu');
  };

  const handlePayJailBail = async () => {
    const bailCost = 1000;
    if (progress.coins < bailCost) {
      soundEngine.playError();
      return;
    }
    const off = offlineSpendCoins(progress, bailCost);
    if (!off.ok || !off.account) {
      soundEngine.playError();
      return;
    }
    const updatedAcc = normalizeLoadedProgress(off.account);
    setProgress(updatedAcc);
    saveProgress(updatedAcc);
    syncAccountToLocalStores(updatedAcc);

    fetch('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: updatedAcc,
        allowCoinDeduction: true,
        reason: 'jail_bail',
      }),
    }).catch(() => {});

    setPoliceFineToast(null);
    engineRef.current?.releaseFromJail(true);
    engineRef.current?.lockPointer();
  };

  const handleSelectEmote = (emoteId: EmoteId) => {
    setShowEmoteWheel(false);
    if (inMatch) {
      engineRef.current?.triggerEmote(emoteId);
      engineRef.current?.lockPointer();
    } else {
      const def = getEmoteDef(emoteId);
      setLobbyEmotePreview(emoteId);
      soundEngine.playEmoteChime();
      window.setTimeout(() => {
        setLobbyEmotePreview((cur) => (cur === emoteId ? null : cur));
      }, Math.round(def.duration * 1000));
    }
  };

  const handleBuy = async (category: ShopCategory, itemId: string) => {
    setShopBusy(true);
    setShopFeedback(null);
    try {
      const res = await fetch('/api/account/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: progress.accountId, category, itemId }),
      });
      const data = await res.json();
      if (res.ok && data.account) {
        setProgress(data.account);
        saveProgress(data.account);
        soundEngine.playPurchase();
        setShopFeedback({ type: 'ok', text: 'Purchased and equipped!' });
      } else {
        throw new Error(data.error || 'offline');
      }
    } catch {
      const off = offlineBuyItem(progress, category, itemId);
      if (off.ok && off.account) {
        setProgress(off.account);
        soundEngine.playPurchase();
        setShopFeedback({ type: 'ok', text: 'Purchased and equipped!' });
      } else {
        soundEngine.playError();
        setShopFeedback({ type: 'err', text: off.error || 'Purchase failed.' });
      }
    } finally {
      setShopBusy(false);
    }
  };

  const handleEquip = async (category: ShopCategory, itemId: string) => {
    setShopBusy(true);
    setShopFeedback(null);
    try {
      const res = await fetch('/api/account/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: progress.accountId, category, itemId }),
      });
      const data = await res.json();
      if (res.ok && data.account) {
        setProgress(data.account);
        saveProgress(data.account);
        soundEngine.playClick();
        setShopFeedback({ type: 'ok', text: 'Equipped to your island loadout!' });
      } else {
        throw new Error('offline');
      }
    } catch {
      const off = offlineEquipItem(progress, category, itemId);
      if (off.ok && off.account) {
        setProgress(off.account);
        soundEngine.playClick();
        setShopFeedback({ type: 'ok', text: 'Equipped to your island loadout!' });
      }
    } finally {
      setShopBusy(false);
    }
  };

  const handleCoinLevelUpgrade = async () => {
    setLevelMsg(null);
    try {
      const res = await fetch('/api/account/upgrade-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: progress.accountId }),
      });
      const data = await res.json();
      if (res.ok && data.account) {
        setProgress(data.account);
        saveProgress(data.account);
        soundEngine.playPurchase();
        setLevelMsg(`Level Up! Now Lv.${data.account.level} (+HP, Speed & Fighters)`);
        return;
      }
      if (res.status >= 400 && res.status < 500 && data.error) {
        soundEngine.playError();
        setLevelMsg(data.error);
        return;
      }
      throw new Error('offline');
    } catch {
      const off = offlineUpgradeLevel(progress);
      if (off.ok && off.account) {
        setProgress(off.account);
        soundEngine.playPurchase();
        setLevelMsg(`Level Up! Now Lv.${off.account.level} (+HP, Speed & Fighters)`);
      } else {
        soundEngine.playError();
        setLevelMsg(off.error || 'Not enough coins.');
      }
    }
  };

  const handleClaimChallenge = (ch: DailyChallenge) => {
    const next = offlineClaimChallenge(progress, ch.id);
    if (next) {
      setProgress(next);
      soundEngine.playPurchase();
    }
  };

  const handleUpdateCustomization = (custom: CharacterCustomization) => {
    const next = {
      ...progress,
      customization: custom,
      equipped: { ...progress.equipped, characterId: custom.characterId },
    };
    setProgress(next);
    saveProgress(next);
    fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: progress.accountId, customization: custom }),
    }).catch(() => {});
  };

  const showTouch =
    inMatch &&
    !isPaused &&
    !matchSummary &&
    (settings.showTouchControls === 'always' ||
      (settings.showTouchControls === 'auto' && isTouchDevice));

  const currentArena = getArenaDef(progress.equipped.arenaId);
  const currentGun = getGunDef(progress.equipped.gunId);
  const currentKnife = getKnifeDef(progress.equipped.knifeId);
  const currentGrenade = getGrenadeDef(progress.equipped.grenadeId);
  const currentAirplane = getAirplaneDef(progress.equipped.airplaneId ?? 'cargo_carrier');
  const currentParachute = getParachuteDef(progress.equipped.parachuteId ?? 'classic_white');

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white select-none">
      {/* ACTIVE MATCH CANVAS VIEWPORT */}
      {inMatch && (
        <>
          <div ref={canvasHostRef} className="fixed inset-0 h-full w-full" />

          <GameHud
            hud={hud}
            isFullscreen={isFullscreen}
            globalBannerMessage={liveConfig.globalBannerMessage}
            playerName={progress.playerName}
            playerAvatarUrl={progress.avatarUrl}
            playerAvatarIcon={progress.avatarIcon}
            onPauseClick={() => engineRef.current?.setPaused(true)}
            onCycleCamera={() => engineRef.current?.cycleCameraView()}
            onToggleFullscreen={toggleFullscreen}
            onLockPointer={() => engineRef.current?.lockPointer()}
            onSelectSlot={(slot) => engineRef.current?.selectWeaponSlot(slot)}
            onOpenEmotes={() => {
              engineRef.current?.unlockPointer();
              setShowEmoteWheel(true);
            }}
          />

          <TouchControls
            visible={showTouch && !hud?.missileRoomOpen && !hud?.inJail && !showEmoteWheel}
            activeSlot={hud?.activeSlot || 'gun'}
            ammoInMag={hud?.ammoInMag ?? currentGun.magSize}
            magSize={hud?.magSize ?? currentGun.magSize}
            grenadeCount={hud?.grenadeCount ?? 2}
            nearDoorPrompt={hud?.nearDoorPrompt ?? null}
            nearBenchPrompt={hud?.nearBenchPrompt ?? null}
            nearFruitPrompt={hud?.nearFruitPrompt ?? null}
            nearLootPrompt={hud?.nearLootPrompt ?? null}
            nearConsolePrompt={hud?.nearConsolePrompt ?? null}
            nearMountPrompt={hud?.nearMountPrompt ?? null}
            mountedKind={hud?.mountedKind ?? null}
            isSwimming={Boolean(hud?.isSwimming)}
            brPhase={hud?.brPhase}
            tribalCapturePhase={hud?.tribalCapturePhase}
            reviveTargetName={hud?.reviveTargetName}
            isKnockedDown={hud?.isKnockedDown}
            isCrouching={Boolean(hud?.isCrouching)}
            isSitting={Boolean(hud?.isSitting)}
            onTouchUpdate={(s: Partial<TouchInputState>) => engineRef.current?.setTouchInput(s)}
            onReplaceLoot={() => engineRef.current?.replaceWithNearbyLoot()}
            onOpenConsole={() => {
              engineRef.current?.unlockPointer();
              engineRef.current?.openMissileRoom();
            }}
            onOpenEmoteWheel={() => {
              engineRef.current?.unlockPointer();
              setShowEmoteWheel(true);
            }}
          />

          <SatelliteMapModal
            open={Boolean(hud?.missileRoomOpen) && !isPaused && !matchSummary}
            playerX={hud?.playerX ?? 0}
            playerZ={hud?.playerZ ?? 0}
            onLaunch={(tx, tz) => {
              engineRef.current?.launchBallisticMissile(tx, tz);
              engineRef.current?.lockPointer();
            }}
            onClose={() => {
              engineRef.current?.closeMissileRoom();
              engineRef.current?.lockPointer();
            }}
          />

          {policeFineToast !== null && (
            <div className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl border-2 border-rose-400/80 bg-rose-950/95 px-4 py-2 text-xs font-black uppercase tracking-wider text-rose-100 shadow-2xl animate-bounce">
              <Siren className="h-4 w-4 text-rose-400" />
              <span>
                {policeFineToast > 0
                  ? `-${policeFineToast.toLocaleString()} COINS (POLICE ARREST FINE)`
                  : 'ARRESTED BY POLICE (0 COINS)'}
              </span>
            </div>
          )}

          <JailModal
            open={Boolean(hud?.inJail) && !isPaused && !matchSummary}
            timeLeft={hud?.jailTimeLeft ?? 40}
            playerCoins={progress.coins}
            bailCost={1000}
            finePaid={hud?.jailFinePaid ?? 200}
            onPayBail={handlePayJailBail}
          />

          <PauseModal
            open={isPaused && !matchSummary}
            onResume={() => {
              engineRef.current?.setPaused(false);
              engineRef.current?.lockPointer();
            }}
            onOpenSettings={() => setActiveModal('settings')}
            onRestart={() => {
              if (activeLaunchRef.current) {
                launchMatch(activeLaunchRef.current);
              }
            }}
            onQuitToMenu={quitMatch}
          />

          <MatchSummaryModal
            summary={matchSummary}
            onPlayAgain={() => {
              if (activeLaunchRef.current) {
                launchMatch(activeLaunchRef.current);
              }
            }}
            onReturnMenu={quitMatch}
          />
        </>
      )}

      {/* MAIN ISLAND MENU & LOBBY */}
      {!inMatch && (
        <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto bg-[radial-gradient(ellipse_at_top,_#0c4a6e_0%,_#0f172a_48%,_#020617_100%)] p-3 sm:p-5">
          {/* Top Header */}
          <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25">
                  <Gamepad2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    BLOCK <span className="text-cyan-400">WAR</span>
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-400">
                    50-Player Battle Royale · Cars & Bikes · Horses · 3-Heart Survival
                  </p>
                </div>
              </div>

              {/* Logged-in Account / Guest Pill + Custom Photo Picker + Logout/Switch */}
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/90 px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowProfilePhotoModal(true);
                  }}
                  className="group relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  title="Change Profile Photo or Warrior Avatar"
                >
                  <AvatarBadge
                    iconId={progress.avatarIcon}
                    avatarUrl={progress.avatarUrl}
                    size="sm"
                    shape="circle"
                    className="transition group-hover:brightness-110"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-slate-950 bg-cyan-400 text-slate-950 shadow">
                    <Camera className="h-2.5 w-2.5" />
                  </span>
                </button>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5 text-xs font-black text-white">
                    <span>{progress.isGuest ? 'Guest' : progress.username || progress.playerName}</span>
                    <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-black text-cyan-300 tabular-nums">
                      Lv.{progress.level}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {progress.isGuest ? 'Local Guest Save' : 'Account Synced'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearActiveSessionKey();
                    setShowAuthModal(true);
                  }}
                  className="ml-1 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-200 hover:bg-slate-700"
                  title="Logout or Switch Account"
                >
                  <LogOut className="h-3 w-3 text-cyan-300" />
                  <span>{progress.isGuest ? 'Log In' : 'Switch'}</span>
                </button>
              </div>
            </div>

            {/* Player Name#Tag + Coins + Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {editingTag ? (
                <div className="flex items-center gap-1 rounded-xl border border-cyan-400/50 bg-slate-900 px-2 py-1">
                  <input
                    value={progress.playerName}
                    onChange={(e) => {
                      const next = { ...progress, playerName: e.target.value.slice(0, 14) || 'Player' };
                      setProgress(next);
                      saveProgress(next);
                    }}
                    className="w-24 bg-transparent text-xs font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">#</span>
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value.toUpperCase().slice(0, 6))}
                    className="w-14 bg-transparent text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = sanitizePlayerTag(tagDraft);
                      const next = { ...progress, playerTag: clean };
                      setProgress(next);
                      saveProgress(next);
                      setTagDraft(clean);
                      setEditingTag(false);
                    }}
                    className="rounded-lg bg-cyan-500 px-2 py-0.5 text-[10px] font-black text-slate-950"
                  >
                    SAVE
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTagDraft(progress.playerTag);
                    setEditingTag(true);
                  }}
                  className="rounded-xl border border-white/15 bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-100 hover:border-cyan-400/50"
                >
                  {progress.playerName}
                  <span className="text-cyan-400 font-mono">#{progress.playerTag}</span>
                </button>
              )}

              <div className="relative flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-300 tabular-nums">
                  <Coins className="h-4 w-4" />
                  <span>{displayedCoins.toLocaleString()}</span>
                </div>
                {coinAddedToast !== null && (
                  <div className="pointer-events-none absolute -bottom-8 left-0 z-30 whitespace-nowrap rounded-lg border border-emerald-400/50 bg-emerald-500 px-2.5 py-0.5 text-[11px] font-black text-slate-950 shadow-lg animate-bounce">
                    +{coinAddedToast.toLocaleString()} COINS ADDED!
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCoinStore(true)}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-black uppercase text-slate-950 shadow-lg shadow-amber-500/30 transition hover:brightness-110 active:scale-95 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>BUY COINS</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleQuickPlay}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110 active:scale-95 whitespace-nowrap"
                title="Click to Start Game & Play Immediately"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>PLAY</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setUnreadChatCount(0);
                  setShowChatModal(true);
                }}
                className="relative flex items-center gap-1.5 rounded-xl border border-cyan-400/45 bg-cyan-500/15 px-3 py-1.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/25 whitespace-nowrap"
                title="Open Global Lobby Chat & Direct Messages"
              >
                <MessageSquare className="h-4 w-4 text-cyan-300" />
                <span>CHAT</span>
                {unreadChatCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, muted: !s.muted }))}
                className="rounded-xl border border-white/15 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
                title="Mute / Unmute"
              >
                {settings.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-xl border border-white/15 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
                title="Fullscreen (F11)"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </header>

          {/* Live Server Banner / Suspended Notice */}
          {(liveConfig.globalBannerMessage || configToast || accountSuspendedNotice || progress.isVipAllUnlocked) && (
            <div className="mx-auto mt-2 w-full max-w-6xl space-y-1.5">
              {accountSuspendedNotice && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-center text-xs font-semibold text-rose-200">
                  ACCOUNT BANNED BY ADMIN — Reason: {accountSuspendedNotice}
                </div>
              )}
              {progress.isVipAllUnlocked && !accountSuspendedNotice && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-1.5 text-center text-xs font-bold text-emerald-200">
                  ALL MAPS, WEAPONS, VEHICLES, SKINS &amp; EMOTES UNLOCKED FREE BY ADMIN!
                </div>
              )}
              {(liveConfig.globalBannerMessage || configToast) && (
                <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-center text-xs font-semibold text-cyan-200">
                  {liveConfig.globalBannerMessage || configToast}
                </div>
              )}
            </div>
          )}

          {/* Main Lobby Grid */}
          <main className="mx-auto my-3 grid w-full max-w-6xl grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left Column: Coin-Powered Level Upgrades & Profile Stats */}
            <section className="lg:col-span-4 space-y-3 rounded-3xl border border-white/10 bg-slate-900/75 p-4 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setShowProfilePhotoModal(true);
                    }}
                    className="group relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    title="Upload Profile Photo or Pick Warrior Avatar"
                  >
                    <PlayerAvatar
                      avatarUrl={progress.avatarUrl}
                      avatarIcon={progress.avatarIcon}
                      alt={progress.playerName}
                      size="lg"
                      shape="circle"
                      className="border-2 border-cyan-400/60 transition group-hover:scale-105"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-cyan-400 text-slate-950 shadow">
                      <Camera className="h-2.5 w-2.5" />
                    </span>
                  </button>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                      Fighter Level
                    </div>
                    <div className="text-2xl font-black text-white leading-none">
                      LV. {progress.level}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setShowProfilePhotoModal(true);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-cyan-200"
                    >
                      <Camera className="h-3 w-3" /> Edit Photo / 16 Avatars
                    </button>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 shrink-0">
                  <div>{progress.xp} / {xpForLevel(progress.level)} XP</div>
                  <div className="font-bold text-rose-300 flex items-center justify-end gap-1">
                    <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-400" /> 3 Survival Hearts
                  </div>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  style={{ width: `${Math.min(100, (progress.xp / xpForLevel(progress.level)) * 100)}%` }}
                />
              </div>

              {/* Active Level Stat Bonuses */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  <div className="text-slate-400">MAX HP</div>
                  <div className="font-black text-emerald-300 tabular-nums">{levelStats.maxHp}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  <div className="text-slate-400">SPEED</div>
                  <div className="font-black text-cyan-300 tabular-nums">{Math.round(levelStats.speedMult * 100)}%</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  <div className="text-slate-400">FIGHTERS</div>
                  <div className="font-black text-amber-300 tabular-nums">Up to {levelStats.maxMatchFighters}</div>
                </div>
              </div>

              {/* Career Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  <div className="text-slate-400">MATCHES</div>
                  <div className="font-black text-white tabular-nums">{progress.totalMatches}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  <div className="text-slate-400">TOTAL KOs</div>
                  <div className="font-black text-rose-300 tabular-nums">{progress.totalKOs}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  <div className="text-slate-400">BOOYAH WINS</div>
                  <div className="font-black text-amber-300 tabular-nums">{progress.battleRoyaleWins ?? 0}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">WILDLIFE HUNTED</span>
                  <span className="font-black text-emerald-300 tabular-nums">{progress.animalsHunted ?? 0}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">SHIPS BOARDED</span>
                  <span className="font-black text-sky-300 tabular-nums">{progress.shipsBoarded ?? 0}</span>
                </div>
              </div>

              {/* Upgrade Level with Coins Button */}
              <button
                type="button"
                disabled={progress.level >= 25 || progress.coins < nextLevelCost}
                onClick={handleCoinLevelUpgrade}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-black uppercase transition ${
                  progress.level < 25 && progress.coins >= nextLevelCost
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 hover:brightness-110 shadow-lg'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" />
                {progress.level >= 25
                  ? 'MAX LEVEL REACHED'
                  : `Upgrade Level → Lv.${progress.level + 1} (${nextLevelCost.toLocaleString()} Coins)`}
              </button>
              {levelMsg && (
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-center text-[11px] font-bold text-cyan-200">
                  {levelMsg}
                </div>
              )}

              {/* Quick Feature Grid + Lobby Emote Hero Trigger */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModal('shop')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/15 py-2.5 text-xs font-black text-amber-300 hover:bg-amber-500/25"
                >
                  <ShoppingBag className="h-4 w-4" /> Shop
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('locker')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 py-2.5 text-xs font-black text-cyan-200 hover:bg-cyan-500/25"
                >
                  <Palette className="h-4 w-4" /> Locker & Art
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('challenges')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 py-2.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Award className="h-4 w-4" /> Challenges
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('leaderboard')}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-800/80 py-2.5 text-xs font-black text-slate-200 hover:bg-slate-700"
                >
                  <Trophy className="h-4 w-4 text-amber-400" /> Leaderboard
                </button>
              </div>

              {/* Lobby Emote Preview & Wheel Trigger */}
              <div className="rounded-2xl border border-amber-400/25 bg-slate-950/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                    {lobbyEmotePreview ? `Playing: ${getEmoteDef(lobbyEmotePreview).name}` : 'Emote Wheel'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmoteWheel(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-400/45 bg-amber-500/20 px-3 py-1 text-[11px] font-black text-amber-200 hover:bg-amber-500/30"
                  >
                    <Smile className="h-3.5 w-3.5" /> Play Emote [B]
                  </button>
                </div>
                {lobbyEmotePreview && (
                  <div className="mt-2">
                    <ShopPreview3D category="emotes" itemId={lobbyEmotePreview} heightClass="h-28" />
                  </div>
                )}
              </div>

              {/* Game Rules & Policy Compliance Card */}
              <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/65 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ScrollText className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate text-[11px] font-black uppercase tracking-wider text-slate-200">
                      Fair Play &amp; Policy
                    </span>
                  </div>
                  {hasAcceptedPolicyVersion(progress, policyConfig.version) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/45 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> ACCEPTED ({progress.policyAcceptedVersion || policyConfig.version})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/45 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300 whitespace-nowrap shrink-0">
                      CONFIRM ({policyConfig.version})
                    </span>
                  )}
                </div>
                {hasAcceptedPolicyVersion(progress, policyConfig.version) && progress.policyAcceptedAt && (
                  <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                    Confirmed: {formatPolicyTimestamp(progress.policyAcceptedAt)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowPolicyReader(true);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-2 text-[11px] font-black uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-500/25"
                >
                  <ScrollText className="h-3.5 w-3.5" /> GAME RULES &amp; POLICY
                </button>
              </div>
            </section>

            {/* Center/Right Column: Island Match Setup & Play CTA */}
            <section className="lg:col-span-8 flex flex-col justify-between space-y-4 rounded-3xl border border-white/10 bg-slate-900/75 p-5 shadow-xl">
              <div className="space-y-4">
                {/* Instant Play Hero Action Strip (Always Visible Above the Fold) */}
                <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-blue-600/15 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                      READY TO DEPLOY · {currentArena.name}
                    </div>
                    <div className="mt-0.5 text-sm font-black text-white">
                      Click PLAY to jump straight into the 3D Arena
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickPlay}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110 active:scale-95"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    <span>PLAY GAME</span>
                  </button>
                </div>

                {/* Active Equipped Summary Strip */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Island Map</div>
                    <div className="mt-0.5 truncate font-black text-cyan-300">{currentArena.name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Equipped Gun</div>
                    <div className="mt-0.5 truncate font-black text-white">{currentGun.name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Equipped Knife</div>
                    <div className="mt-0.5 truncate font-black text-rose-300">{currentKnife.name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Grenade</div>
                    <div className="mt-0.5 truncate font-black text-emerald-300">{currentGrenade.name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Drop Plane</div>
                    <div className="mt-0.5 truncate font-black text-amber-300">{currentAirplane.name}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Parachute</div>
                    <div className="mt-0.5 truncate font-black text-sky-300">{currentParachute.name}</div>
                  </div>
                </div>

                {/* Game Mode Selector */}
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-300">
                    1. Select Game Mode
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {(
                      [
                        { id: 'single', label: 'Single Battle', icon: <Swords className="h-4 w-4" /> },
                        { id: 'team', label: 'Team Battle', icon: <Shield className="h-4 w-4" /> },
                        { id: 'survival', label: '3-Heart Survival', icon: <Heart className="h-4 w-4" /> },
                        { id: 'battle_royale', label: 'Battle Royale', icon: <Plane className="h-4 w-4" /> },
                        { id: 'tournament', label: 'Tournament', icon: <Crown className="h-4 w-4" /> },
                        { id: 'practice', label: 'Practice Island', icon: <Sparkles className="h-4 w-4" /> },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedMode(m.id);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-xs font-black transition ${
                          selectedMode === m.id
                            ? m.id === 'battle_royale'
                              ? 'border-amber-400 bg-amber-500/20 text-white shadow-lg'
                              : 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg'
                            : 'border-white/10 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Island Map + Crowd Scaling Row */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" /> 2. Choose Unlocked Island
                    </div>
                    <select
                      value={progress.equipped.arenaId}
                      onChange={(e) => handleEquip('backgrounds', e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white"
                    >
                      {ARENA_CATALOG.map((a) => {
                        const unlocked =
                          Boolean(progress.isVipAllUnlocked) ||
                          progress.unlockedArenas.includes(a.id);
                        return (
                          <option key={a.id} value={a.id} disabled={!unlocked}>
                            {a.name}{' '}
                            {progress.isVipAllUnlocked
                              ? '(FREE / UNLOCKED)'
                              : !unlocked
                                ? `(Shop: ${a.price.toLocaleString()}c)`
                                : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    {selectedMode === 'battle_royale' ? (
                      <>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-black uppercase text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-amber-400" /> 3. Battle Royale Lobby
                          </span>
                          <span className="text-amber-300 tabular-nums">50 Fighters</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-xs font-black text-amber-200">
                          <span>FIXED 50-PLAYER DROP</span>
                          <span className="text-white tabular-nums">1 Player + 49 Bots</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-black uppercase text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-amber-400" /> 3. Match Fighters (10–16)
                          </span>
                          <span className="text-cyan-300">{fighterCount} Fighters</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[10, 12, 14, 16].map((cnt) => {
                            const unlocked = cnt <= levelStats.maxMatchFighters;
                            return (
                              <button
                                key={cnt}
                                type="button"
                                disabled={!unlocked}
                                onClick={() => setFighterCount(cnt)}
                                className={`rounded-xl py-2 text-xs font-black ${
                                  fighterCount === cnt
                                    ? 'bg-cyan-500 text-slate-950'
                                    : unlocked
                                      ? 'bg-slate-950/70 text-slate-300 border border-white/10'
                                      : 'bg-slate-900/40 text-slate-600 border border-white/5 cursor-not-allowed'
                                }`}
                                title={unlocked ? `${cnt} Active Fighters` : `Reach higher Level to unlock ${cnt} fighters`}
                              >
                                {cnt}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {selectedMode === 'battle_royale' && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs">
                    <span className="px-2 font-black text-amber-300">BR Format:</span>
                    <button
                      type="button"
                      onClick={() => setBrFormat('solo')}
                      className={`rounded-xl px-4 py-2 font-black ${
                        brFormat === 'solo' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      SOLO ROYALE
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrFormat('squad')}
                      className={`rounded-xl px-4 py-2 font-black ${
                        brFormat === 'squad' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      SQUAD ROYALE (REVIVES)
                    </button>
                    {brFormat === 'squad' && (
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTeamChoice('blue')}
                          className={`rounded-xl px-3 py-1.5 font-black ${
                            teamChoice === 'blue' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-300'
                          }`}
                        >
                          BLUE
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamChoice('red')}
                          className={`rounded-xl px-3 py-1.5 font-black ${
                            teamChoice === 'red' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-rose-300'
                          }`}
                        >
                          RED
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedMode === 'team' && (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2">
                    <span className="px-2 text-xs font-bold text-slate-400">Your Squad:</span>
                    <button
                      type="button"
                      onClick={() => setTeamChoice('blue')}
                      className={`flex-1 rounded-xl py-2 text-xs font-black ${
                        teamChoice === 'blue' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-300'
                      }`}
                    >
                      BLUE TEAM
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamChoice('red')}
                      className={`flex-1 rounded-xl py-2 text-xs font-black ${
                        teamChoice === 'red' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-rose-300'
                      }`}
                    >
                      RED TEAM
                    </button>
                  </div>
                )}
              </div>

              {/* Action Play Buttons */}
              <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
                <button
                  type="button"
                  onClick={handleQuickPlay}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-600 py-4 text-base font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-cyan-500/30 transition hover:brightness-110 active:scale-[0.99]"
                >
                  <Play className="h-5 w-5 fill-current" />{' '}
                  {selectedMode === 'battle_royale'
                    ? 'PLAY NOW — BOARD DROP PLANE'
                    : 'PLAY NOW — START GAME'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!hasAcceptedPolicyVersion(progress, policyConfig.version)) {
                      soundEngine.playError();
                      setShowPolicyReader(true);
                      return;
                    }
                    setActiveModal('multiplayer');
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-400/50 bg-indigo-500/20 px-5 py-4 text-xs font-black uppercase text-indigo-200 hover:bg-indigo-500/30"
                >
                  <Globe className="h-4 w-4" /> Online Multiplayer
                </button>
              </div>
            </section>
          </main>

          {/* Footer Utilities & AdSense Banner */}
          <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('instructions')}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 font-bold text-slate-300 hover:bg-slate-800"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-cyan-400" /> Controls & Vehicles
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('settings')}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 font-bold text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="h-3.5 w-3.5 text-cyan-400" /> Settings
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('coach')}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 font-bold text-slate-300 hover:bg-slate-800"
                >
                  <Bot className="h-3.5 w-3.5 text-emerald-400" /> Tactical Coach
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-slate-500">
                  Press [F] in match to drive cars, bikes & ride horses · [V] Camera View · [G] Grenade
                </span>
                <button
                  type="button"
                  onClick={handleSecretVersionTap}
                  className="text-[10px] font-mono text-slate-600 select-none"
                >
                  {configVersion}
                </button>
              </div>
            </div>

            <AdBanner compact />
          </footer>
        </div>
      )}

      {/* MODALS */}
      <ShopModal
        open={activeModal === 'shop'}
        progress={progress}
        busy={shopBusy}
        feedback={shopFeedback}
        onClose={() => setActiveModal(null)}
        onBuy={handleBuy}
        onEquip={handleEquip}
      />

      <LockerModal
        open={activeModal === 'locker'}
        progress={progress}
        onClose={() => setActiveModal(null)}
        onUpdateCustomization={handleUpdateCustomization}
        onSavePoster={(url) => {
          const next = { ...progress, customPosterUrl: url };
          setProgress(next);
          saveProgress(next);
        }}
      />

      <MultiplayerLobbyModal
        open={activeModal === 'multiplayer'}
        progress={progress}
        onClose={() => setActiveModal(null)}
        onStartOnlineMatch={(opts) =>
          launchMatch({
            mode: opts.gameMode === 'battle_royale' ? 'battle_royale' : 'multiplayer',
            teamMode: opts.teamMode,
            playerTeam: opts.playerTeam,
            arenaId: opts.arenaId,
            socket: opts.socket,
            localNetworkId: opts.localPlayerId,
          })
        }
        onStartOfflineSkirmish={(arenaId, tm, team, gm) =>
          launchMatch({
            mode: gm === 'battle_royale' ? 'battle_royale' : 'single',
            teamMode: tm,
            playerTeam: team,
            arenaId,
            socket: null,
            localNetworkId: null,
          })
        }
      />

      <SettingsModal
        open={activeModal === 'settings'}
        settings={settings}
        onClose={() => setActiveModal(null)}
        onChange={setSettings}
      />

      <InstructionsModal open={activeModal === 'instructions'} onClose={() => setActiveModal(null)} />

      <LeaderboardModal
        open={activeModal === 'leaderboard'}
        entries={leaderboard}
        onClose={() => setActiveModal(null)}
      />

      <DailyChallengesModal
        open={activeModal === 'challenges'}
        progress={progress}
        onClaim={handleClaimChallenge}
        onClose={() => setActiveModal(null)}
      />

      <ArenaCoachPanel
        open={activeModal === 'coach'}
        progress={progress}
        onClose={() => setActiveModal(null)}
      />

      <AccountAuthModal
        open={showAuthModal && !inMatch}
        canClose={Boolean(getActiveSessionKey())}
        activeUsername={progress.username}
        isGuest={progress.isGuest}
        onAuthenticated={(account) => {
          const norm = normalizeLoadedProgress(account);
          setProgress(norm);
          setTagDraft(norm.playerTag);
          setAccountSuspendedNotice(norm.banned ? norm.banReason || 'Cheating / Rule Violation' : null);
          setShowAuthModal(false);
          soundEngine.playPurchase();
        }}
        onPlayAsGuest={(guestAccount) => {
          const norm = normalizeLoadedProgress(guestAccount);
          setProgress(norm);
          setTagDraft(norm.playerTag);
          setAccountSuspendedNotice(norm.banned ? norm.banReason || 'Cheating / Rule Violation' : null);
          setShowAuthModal(false);
          soundEngine.playClick();
        }}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Full-Screen Admin Ban Enforcement Overlay (Blocked Until Admin Unbans or Switch Account) */}
      {!inMatch && (progress.banned || accountSuspendedNotice) && !showAuthModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/50 bg-slate-900 p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/20 border border-rose-500/50 text-rose-400">
              <Ban className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-rose-400">
                ACCESS SUSPENDED
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                ACCOUNT BANNED BY ADMIN
              </h2>
              <p className="mt-2 rounded-xl border border-rose-500/30 bg-rose-950/50 px-3 py-2 text-xs font-bold text-rose-200">
                Reason: {accountSuspendedNotice || progress.banReason || 'Cheating / Rule Violation'}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Matchmaking and gameplay are disabled for <b className="text-white">{progress.username || progress.playerName}</b> until an Administrator unbans this account.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/profile?accountId=${encodeURIComponent(progress.accountId)}`
                    );
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.account && !data.account.banned) {
                      const norm = normalizeLoadedProgress(data.account);
                      setProgress(norm);
                      saveProgress(norm);
                      setAccountSuspendedNotice(null);
                      soundEngine.playPurchase();
                    } else if (data.banReason) {
                      setAccountSuspendedNotice(String(data.banReason));
                    }
                  } catch {
                    // Offline
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-800 py-2.5 text-xs font-black text-slate-200 hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Check Unban Status
              </button>
              <button
                type="button"
                onClick={() => {
                  clearActiveSessionKey();
                  setAccountSuspendedNotice(null);
                  setShowAuthModal(true);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-500 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-400"
              >
                <LogOut className="h-3.5 w-3.5" /> Switch Account
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminLockModal
        open={!inMatch && showAdminLock}
        onClose={() => setShowAdminLock(false)}
        onUnlocked={(payload) => {
          setAdminToken(payload.token);
          const norm = normalizeLiveGameConfig(payload.config);
          setLiveConfig(norm);
          setDraftConfig(norm);
          setConfigVersion(payload.version || 'v1.00');
          setConfigHistory(payload.history || []);
          setShowAdminLock(false);
          setShowAdminPanel(true);
        }}
      />

      <AdminControlPanel
        open={!inMatch && showAdminPanel && Boolean(adminToken)}
        token={adminToken}
        currentConfig={liveConfig}
        draftConfig={draftConfig}
        configVersion={configVersion}
        history={configHistory}
        inMatch={inMatch}
        currentAccountId={progress.accountId}
        onClose={() => setShowAdminPanel(false)}
        onDraftChange={setDraftConfig}
        onPlaytestLocally={(cfg) => {
          const norm = normalizeLiveGameConfig(cfg);
          setLiveConfig(norm);
          setDraftConfig(norm);
          engineRef.current?.applyLiveGameConfig(norm);
        }}
        onPublished={(payload) => {
          const norm = normalizeLiveGameConfig(payload.config);
          setLiveConfig(norm);
          setDraftConfig(norm);
          setConfigVersion(payload.version);
          setConfigHistory(payload.history);
          engineRef.current?.applyLiveGameConfig(norm);
        }}
        onHealSelf={() => engineRef.current?.adminHealSelf()}
        onAddCoins={() => {
          const nextCoins = progress.coins + 10000;
          const next = { ...progress, coins: nextCoins };
          setProgress(next);
          saveProgress(next);
          syncAccountToLocalStores(next);
          if (adminToken) {
            fetch('/api/admin/player-update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
              },
              body: JSON.stringify({ accountId: progress.accountId, coins: nextCoins }),
            }).catch(() => {});
          }
        }}
        onTeleport={(target: AdminTeleportTarget) => engineRef.current?.adminTeleport(target)}
        onSpawnEntity={(kind: AdminSpawnKind) => engineRef.current?.adminSpawnEntity(kind)}
        onCurrentAccountUpdated={(acc) => {
          const norm = normalizeLoadedProgress(acc);
          setProgress(norm);
          saveProgress(norm);
          syncAccountToLocalStores(norm);
          setAccountSuspendedNotice(norm.banned ? norm.banReason || 'Cheating / Rule Violation' : null);
        }}
        currentPolicy={policyConfig}
        onPolicyUpdated={(nextPolicy) => {
          const norm = normalizeGamePolicy(nextPolicy);
          setPolicyConfig(norm);
          savePolicyConfigLocal(norm);
        }}
      />

      {/* Mandatory First-Entry / Re-Confirmation Policy Gate & Profile Policy Viewer */}
      <PolicyModal
        open={
          (!inMatch &&
            !showAuthModal &&
            !progress.banned &&
            !accountSuspendedNotice &&
            !hasAcceptedPolicyVersion(progress, policyConfig.version) &&
            !showAdminLock &&
            !showAdminPanel) ||
          (!inMatch && showPolicyReader)
        }
        mode={
          !hasAcceptedPolicyVersion(progress, policyConfig.version)
            ? 'gate'
            : 'viewer'
        }
        policy={policyConfig}
        isAcceptedCurrentVersion={hasAcceptedPolicyVersion(progress, policyConfig.version)}
        acceptedVersion={progress.policyAcceptedVersion}
        acceptedAt={progress.policyAcceptedAt}
        busy={policyConfirmBusy}
        onConfirm={async () => {
          if (policyConfirmBusy) return;
          setPolicyConfirmBusy(true);
          try {
            const { account } = recordPolicyAcceptanceLocal(
              progressRef.current,
              policyConfig.version
            );
            progressRef.current = account;
            setProgress(account);
            saveProgress(account);
            syncAccountToLocalStores(account);
            soundEngine.playPurchase();

            try {
              const res = await fetch('/api/policy/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accountId: account.accountId,
                  username: account.username || account.playerName,
                  playerName: account.playerName,
                  policyVersion: policyConfig.version,
                }),
              });
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.account) {
                  const synced = normalizeLoadedProgress(data.account);
                  progressRef.current = synced;
                  setProgress(synced);
                  saveProgress(synced);
                  syncAccountToLocalStores(synced);
                }
              }
            } catch {
              // Offline / static hosting fallback already saved cleanly
            }
            setShowPolicyReader(false);
            if (pendingLaunchAfterPolicyRef.current) {
              pendingLaunchAfterPolicyRef.current = false;
              handleQuickPlay();
            }
          } finally {
            setPolicyConfirmBusy(false);
          }
        }}
        onClose={() => {
          pendingLaunchAfterPolicyRef.current = false;
          setShowPolicyReader(false);
        }}
      />

      <CoinStoreModal
        open={!inMatch && showCoinStore}
        progress={progress}
        onClose={() => setShowCoinStore(false)}
        onAccountUpdated={(acc) => {
          const prevCoins = progress.coins;
          const norm = normalizeLoadedProgress(acc);
          setProgress(norm);
          saveProgress(norm);
          soundEngine.playPurchase();
          const gained = norm.coins - prevCoins;
          if (gained > 0) {
            triggerCoinAddedToast(gained);
          }
        }}
      />

      <ProfilePhotoModal
        open={!inMatch && showProfilePhotoModal}
        currentAvatarUrl={progress.avatarUrl}
        currentAvatarIcon={progress.avatarIcon}
        playerName={progress.isGuest ? progress.playerName : progress.username || progress.playerName}
        busy={avatarSaveBusy}
        onClose={() => setShowProfilePhotoModal(false)}
        onSave={async ({ avatarUrl, avatarIcon }) => {
          if (avatarSaveBusy) return;
          setAvatarSaveBusy(true);
          try {
            const updated = normalizeLoadedProgress({
              ...progressRef.current,
              avatarUrl,
              avatarIcon,
            });
            // 1. Instant local update & permanent localStorage save
            setProgress(updated);
            saveProgress(updated);
            syncAccountToLocalStores(updated);
            updateLocalLeaderboardAvatar(
              updated.playerName,
              updated.playerTag,
              avatarUrl,
              avatarIcon
            );
            setLeaderboard((prev) =>
              prev.map((entry) =>
                entry.playerName === updated.playerName &&
                (!entry.playerTag || entry.playerTag === updated.playerTag)
                  ? { ...entry, avatarUrl, avatarIcon }
                  : entry
              )
            );
            soundEngine.playPurchase();

            // 2. Sync permanently to data/db.json via POST /api/profile/sync
            try {
              const res = await fetch('/api/profile/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  account: updated,
                  avatarUpdated: true,
                }),
              });
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.account) {
                  const synced = normalizeLoadedProgress(data.account);
                  setProgress(synced);
                  saveProgress(synced);
                  syncAccountToLocalStores(synced);
                }
              }
            } catch {
              // Offline / static hosting already persisted cleanly in localStorage
            }
            setShowProfilePhotoModal(false);
          } finally {
            setAvatarSaveBusy(false);
          }
        }}
      />

      <PlayerChatModal
        open={!inMatch && showChatModal}
        progress={progress}
        liveMessages={liveChatMessages}
        onLocalMessageSent={(msg) => {
          upsertMasterChatMessageLocal(msg);
          setLiveChatMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }}
        onLocalMessageDeleted={(messageId, deletedAt) => {
          markChatMessageDeletedLocal(messageId, progress.accountId, deletedAt);
          setLiveChatMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, deletedByUser: true, deletedAt } : m
            )
          );
        }}
        onClose={() => setShowChatModal(false)}
      />

      <EmoteWheel
        open={showEmoteWheel}
        equippedEmotes={progress.equippedEmotes ?? ['hello_wave']}
        onSelect={handleSelectEmote}
        onClose={() => {
          setShowEmoteWheel(false);
          if (inMatch) engineRef.current?.lockPointer();
        }}
      />
    </div>
  );
}

export default App;
