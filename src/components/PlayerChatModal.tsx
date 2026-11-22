import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Eraser,
  Film,
  Globe,
  Image as ImageIcon,
  Maximize2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  ChatChannel,
  ChatMessage,
  ChatPeerSummary,
  formatShortClock,
  getMasterChatHistoryLocal,
  isVisibleToPlayer,
  makeDmThreadId,
  markChatMessageDeletedLocal,
  markThreadClearedForUserLocal,
  processChatMediaFile,
  saveMasterChatHistoryLocal,
  upsertMasterChatMessageLocal,
} from '../game/chat';
import { getLocalPlayersDb } from '../game/adminPersistence';
import { PlayerProgress } from '../game/types';
import { PlayerAvatar } from './ProfilePhotoModal';

interface StagedMedia {
  mediaType: 'image' | 'video';
  mediaDataUrl: string;
  mediaFileName: string;
  mediaSizeKb: number;
  mediaDurationSec?: number;
}

interface PlayerChatModalProps {
  open: boolean;
  progress: PlayerProgress;
  liveMessages: ChatMessage[];
  onLocalMessageSent: (msg: ChatMessage) => void;
  onLocalMessageDeleted: (messageId: string, deletedAt: string) => void;
  onClose: () => void;
}

export const PlayerChatModal: React.FC<PlayerChatModalProps> = ({
  open,
  progress,
  liveMessages,
  onLocalMessageSent,
  onLocalMessageDeleted,
  onClose,
}) => {
  const [channel, setChannel] = useState<ChatChannel>('global');
  const [peers, setPeers] = useState<ChatPeerSummary[]>([]);
  const [peerSearch, setPeerSearch] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<ChatPeerSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [stagedMedia, setStagedMedia] = useState<StagedMedia | null>(null);
  const [mediaProcessing, setMediaProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const activeThreadId = useMemo(() => {
    if (channel === 'dm' && selectedPeer) {
      return makeDmThreadId(progress.accountId, selectedPeer.accountId);
    }
    return 'global';
  }, [channel, selectedPeer, progress.accountId]);

  const fetchPeers = useCallback(async () => {
    const localPeers: ChatPeerSummary[] = getLocalPlayersDb(progress)
      .filter((p) => p.accountId !== progress.accountId)
      .map((p) => ({
        accountId: p.accountId,
        username: p.username || p.playerName || 'Player',
        playerName: p.playerName || p.username || 'Player',
        avatarUrl: p.avatarUrl,
        avatarIcon: p.avatarIcon,
        level: p.level || 1,
        chatMuted: Boolean(p.chatMuted),
        banned: Boolean(p.banned),
      }));

    try {
      const res = await fetch(
        `/api/chat/peers?accountId=${encodeURIComponent(progress.accountId)}`
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.peers)) {
          const map = new Map<string, ChatPeerSummary>();
          for (const lp of localPeers) map.set(lp.accountId, lp);
          for (const sp of data.peers as ChatPeerSummary[]) map.set(sp.accountId, sp);
          setPeers(Array.from(map.values()));
          return;
        }
      }
    } catch {
      // Offline fallback
    }
    setPeers(localPeers);
  }, [progress]);

  const fetchThreadMessages = useCallback(async () => {
    if (channel === 'dm' && !selectedPeer) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const localVisible = getMasterChatHistoryLocal().filter(
      (m) => m.threadId === activeThreadId && isVisibleToPlayer(m, progress.accountId)
    );
    setMessages(localVisible);

    try {
      const qs = new URLSearchParams({
        accountId: progress.accountId,
        channel,
        ...(channel === 'dm' && selectedPeer ? { peerId: selectedPeer.accountId } : {}),
      });
      const res = await fetch(`/api/chat/messages?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.messages)) {
          const serverMsgs = data.messages as ChatMessage[];
          // Keep local master archive merged with server active messages
          const existingMaster = getMasterChatHistoryLocal();
          saveMasterChatHistoryLocal([...existingMaster, ...serverMsgs]);
          setMessages(
            serverMsgs.filter((m) => isVisibleToPlayer(m, progress.accountId))
          );
        }
      }
    } catch {
      // Offline mode already loaded localVisible
    } finally {
      setLoading(false);
    }
  }, [channel, selectedPeer, activeThreadId, progress.accountId]);

  useEffect(() => {
    if (!open) return;
    fetchPeers();
  }, [open, fetchPeers]);

  useEffect(() => {
    if (!open) return;
    fetchThreadMessages();
  }, [open, fetchThreadMessages]);

  // Merge real-time WS messages & deletions cleanly into active view (idempotent by ID)
  useEffect(() => {
    if (!open) return;
    const threadVisible = liveMessages.filter(
      (m) => m.threadId === activeThreadId && isVisibleToPlayer(m, progress.accountId)
    );
    if (threadVisible.length === 0 && messages.length === 0) return;

    setMessages((prev) => {
      const map = new Map<string, ChatMessage>();
      for (const m of prev) {
        if (isVisibleToPlayer(m, progress.accountId)) map.set(m.id, m);
      }
      for (const lm of liveMessages) {
        if (lm.threadId !== activeThreadId) continue;
        if (isVisibleToPlayer(lm, progress.accountId)) {
          map.set(lm.id, lm);
        } else {
          map.delete(lm.id);
        }
      }
      return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, [open, liveMessages, activeThreadId, progress.accountId]);

  useEffect(() => {
    if (!open) return;
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (lightboxImageUrl) {
          setLightboxImageUrl(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, lightboxImageUrl, onClose]);

  if (!open) return null;

  const handleSelectMedia = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setMediaProcessing(true);
    try {
      const processed = await processChatMediaFile(file);
      setStagedMedia(processed);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to attach file. Please choose a valid image or MP4/WebM video.'
      );
    } finally {
      setMediaProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || mediaProcessing) return;
    if (progress.chatMuted) {
      setError(
        `You are muted from chat by Admin (${progress.chatMutedReason || 'Rule Violation'}).`
      );
      return;
    }
    if (channel === 'dm' && !selectedPeer) {
      setError('Select a player from the Direct Messages list first.');
      return;
    }
    const trimmed = textDraft.trim();
    if (!trimmed && !stagedMedia) return;

    setSending(true);
    setError(null);

    const optimisticMsg: ChatMessage = {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      threadId: activeThreadId,
      channel,
      senderId: progress.accountId,
      senderUsername: progress.isGuest
        ? progress.playerName
        : progress.username || progress.playerName,
      senderAvatarUrl: progress.avatarUrl,
      senderAvatarIcon: progress.avatarIcon,
      recipientId: channel === 'dm' ? selectedPeer?.accountId : undefined,
      recipientUsername: channel === 'dm' ? selectedPeer?.username : undefined,
      text: trimmed,
      mediaType: stagedMedia?.mediaType,
      mediaDataUrl: stagedMedia?.mediaDataUrl,
      mediaFileName: stagedMedia?.mediaFileName,
      mediaSizeKb: stagedMedia?.mediaSizeKb,
      mediaDurationSec: stagedMedia?.mediaDurationSec,
      createdAt: new Date().toISOString(),
      deletedByUser: false,
      hiddenForAccountIds: [],
    };

    // 1. Optimistic local display & permanent local archive (bw_master_chat_history)
    upsertMasterChatMessageLocal(optimisticMsg);
    onLocalMessageSent(optimisticMsg);
    setMessages((prev) =>
      prev.some((m) => m.id === optimisticMsg.id) ? prev : [...prev, optimisticMsg]
    );
    setTextDraft('');
    setStagedMedia(null);

    // 2. Persist permanently to server data/db.json & broadcast via WS
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimisticMsg),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setError(data.error || 'You cannot send messages right now.');
          // Roll back optimistic bubble if muted/banned by server
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          upsertMasterChatMessageLocal(data.message as ChatMessage);
        }
      }
    } catch {
      // Offline / static hosting fallback already preserved in bw_master_chat_history
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    const deletedAt = new Date().toISOString();
    // Immediately mark deletedByUser: true in master archive and hide from player's chat view
    markChatMessageDeletedLocal(msg.id, progress.accountId, deletedAt);
    onLocalMessageDeleted(msg.id, deletedAt);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    try {
      await fetch('/api/chat/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msg.id, accountId: progress.accountId }),
      });
    } catch {
      // Offline mode already flagged deletedByUser locally
    }
  };

  const handleClearDmThread = async () => {
    if (channel !== 'dm' || !selectedPeer) return;
    markThreadClearedForUserLocal(activeThreadId, progress.accountId);
    setMessages([]);
    try {
      await fetch('/api/chat/clear-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThreadId, accountId: progress.accountId }),
      });
    } catch {
      // Offline mode already hid thread locally
    }
  };

  const filteredPeers = peers.filter((p) => {
    const q = peerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.username.toLowerCase().includes(q) ||
      p.playerName.toLowerCase().includes(q) ||
      p.accountId.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2.5 sm:p-5 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-900 shadow-2xl">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-md">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                BLOCK WAR COMMS · PHOTO &amp; VIDEO SHARING
              </div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {channel === 'global'
                  ? 'Global Lobby Chat'
                  : selectedPeer
                    ? `Direct Message · ${selectedPeer.username}`
                    : 'Direct Messages (1-on-1)'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setChannel('global');
                setError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                channel === 'global'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Globe className="h-3.5 w-3.5" /> Global Chat
            </button>
            <button
              type="button"
              onClick={() => {
                setChannel('dm');
                setError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                channel === 'dm'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Direct Messages
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
              aria-label="Close Chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body Layout */}
        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          {/* DM Player Directory Sidebar (shown in DM mode) */}
          {channel === 'dm' && (
            <aside className="flex w-full sm:w-64 shrink-0 flex-col border-b sm:border-b-0 sm:border-r border-white/10 bg-slate-950/60 max-h-44 sm:max-h-none">
              <div className="p-2.5 border-b border-white/10 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={peerSearch}
                    onChange={(e) => setPeerSearch(e.target.value)}
                    placeholder="Find player..."
                    className="w-full rounded-lg border border-white/10 bg-slate-900 py-1.5 pl-8 pr-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchPeers}
                  className="rounded-lg border border-white/10 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                  title="Refresh players"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredPeers.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-slate-500">
                    No other players registered yet.
                  </div>
                ) : (
                  filteredPeers.map((peer) => {
                    const active = selectedPeer?.accountId === peer.accountId;
                    return (
                      <button
                        key={peer.accountId}
                        type="button"
                        onClick={() => {
                          setSelectedPeer(peer);
                          setError(null);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                          active
                            ? 'border-cyan-400/60 bg-cyan-500/15 text-white'
                            : 'border-transparent bg-slate-900/50 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <PlayerAvatar
                          avatarUrl={peer.avatarUrl}
                          avatarIcon={peer.avatarIcon}
                          alt={peer.username}
                          size="sm"
                          shape="circle"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-black text-white">
                            {peer.username}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Lv.{peer.level} · {peer.accountId.slice(0, 12)}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* Active Conversation Column */}
          <div className="flex flex-1 min-h-0 flex-col">
            {/* Thread Utility Bar (DM Clear Chat + Refresh) */}
            <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/40 px-4 py-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-400 min-w-0">
                {channel === 'dm' && selectedPeer ? (
                  <>
                    <PlayerAvatar
                      avatarUrl={selectedPeer.avatarUrl}
                      avatarIcon={selectedPeer.avatarIcon}
                      alt={selectedPeer.username}
                      size="xs"
                      shape="circle"
                    />
                    <span className="truncate font-bold text-slate-200">
                      Private Thread with {selectedPeer.username}
                    </span>
                  </>
                ) : channel === 'dm' ? (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-cyan-400" /> Choose a player on the left to start chatting
                  </span>
                ) : (
                  <span>Public BLOCK WAR Lobby · Share strategies, screenshots &amp; short clips</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {channel === 'dm' && selectedPeer && messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDmThread}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-rose-200 hover:bg-rose-500/20"
                  >
                    <Eraser className="h-3 w-3" /> CLEAR CHAT
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchThreadMessages}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {channel === 'dm' && !selectedPeer ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-400 space-y-2">
                  <Users className="h-8 w-8 text-cyan-400/60" />
                  <p className="font-bold text-slate-200">Select a fighter for 1-on-1 Direct Messages</p>
                  <p className="max-w-xs text-[11px] text-slate-500">
                    You can send text, compressed photos, and short MP4/WebM clips up to 30 seconds.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-500 space-y-1.5">
                  <MessageSquare className="h-7 w-7 text-slate-600" />
                  <p>{loading ? 'Loading messages...' : 'No messages yet. Say hello or share a clip!'}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === progress.accountId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <PlayerAvatar
                        avatarUrl={msg.senderAvatarUrl}
                        avatarIcon={msg.senderAvatarIcon}
                        alt={msg.senderUsername}
                        size="sm"
                        shape="circle"
                      />
                      <div
                        className={`group relative max-w-[78%] rounded-2xl border px-3.5 py-2.5 shadow-md space-y-2 ${
                          isOwn
                            ? 'border-cyan-400/40 bg-cyan-500/15 text-white'
                            : 'border-white/10 bg-slate-950/80 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="font-black text-cyan-300">
                            {msg.senderUsername}
                            {isOwn && <span className="ml-1 text-slate-400">(You)</span>}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-500 tabular-nums">
                              {formatShortClock(msg.createdAt)}
                            </span>
                            {isOwn && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg)}
                                className="inline-flex items-center gap-0.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black text-rose-300 transition hover:bg-rose-500/25"
                                title="Delete message from your chat"
                              >
                                <Trash2 className="h-2.5 w-2.5" /> DELETE
                              </button>
                            )}
                          </div>
                        </div>

                        {msg.mediaType === 'image' && msg.mediaDataUrl && (
                          <button
                            type="button"
                            onClick={() => setLightboxImageUrl(msg.mediaDataUrl || null)}
                            className="group/img relative block overflow-hidden rounded-xl border border-white/15 bg-slate-950"
                          >
                            <img
                              src={msg.mediaDataUrl}
                              alt={msg.mediaFileName || 'Shared image'}
                              className="max-h-60 max-w-full object-contain transition group-hover/img:brightness-110"
                            />
                            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-90">
                              <Maximize2 className="h-2.5 w-2.5" /> Full Screen
                            </span>
                          </button>
                        )}

                        {msg.mediaType === 'video' && msg.mediaDataUrl && (
                          <div className="overflow-hidden rounded-xl border border-white/15 bg-black">
                            <video
                              src={msg.mediaDataUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="max-h-64 w-full max-w-[320px]"
                            />
                          </div>
                        )}

                        {msg.text && (
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-100">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollEndRef} />
            </div>

            {/* Muted Banner / Error Banner / Staged Media Preview */}
            {progress.chatMuted && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
                <Ban className="h-4 w-4 shrink-0 text-rose-400" />
                <span>
                  You are muted from chat by Admin ({progress.chatMutedReason || 'Rule Violation'}).
                </span>
              </div>
            )}

            {error && (
              <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200">
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)} className="text-rose-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {stagedMedia && (
              <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-cyan-400/35 bg-slate-950/85 p-2.5">
                {stagedMedia.mediaType === 'image' ? (
                  <img
                    src={stagedMedia.mediaDataUrl}
                    alt="Attachment preview"
                    className="h-14 w-14 rounded-lg border border-white/15 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
                    <Film className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-bold text-white">{stagedMedia.mediaFileName}</div>
                  <div className="text-[11px] text-cyan-300">
                    {stagedMedia.mediaType === 'image'
                      ? `Compressed Image (${stagedMedia.mediaSizeKb} KB)`
                      : `Video Clip · ${stagedMedia.mediaDurationSec || 0}s (${Math.round((stagedMedia.mediaSizeKb / 1024) * 100) / 100} MB)`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStagedMedia(null)}
                  className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                  title="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Message Input & + MEDIA Button */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-white/10 bg-slate-950/90 px-3 py-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleSelectMedia(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                disabled={progress.chatMuted || mediaProcessing || (channel === 'dm' && !selectedPeer)}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                title="Attach Image (max 640px) or Video (MP4/WebM, up to 10 MB / 30s)"
              >
                {mediaProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">+ MEDIA</span>
              </button>

              <input
                type="text"
                disabled={progress.chatMuted || (channel === 'dm' && !selectedPeer)}
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                maxLength={600}
                placeholder={
                  progress.chatMuted
                    ? 'Chat muted by Admin...'
                    : channel === 'dm' && !selectedPeer
                      ? 'Pick a player to message...'
                      : 'Type a message or attach an image/video...'
                }
                className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  progress.chatMuted ||
                  sending ||
                  mediaProcessing ||
                  (channel === 'dm' && !selectedPeer) ||
                  (!textDraft.trim() && !stagedMedia)
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2.5 text-xs font-black uppercase text-slate-950 shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Full-Screen Image Preview Lightbox */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute right-3 top-3 rounded-xl bg-slate-950/85 p-2 text-white hover:bg-slate-800"
              aria-label="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 pb-2 text-xs font-bold text-slate-300">
              <ImageIcon className="h-4 w-4 text-cyan-400" /> Full-Screen Photo Preview
            </div>
            <img
              src={lightboxImageUrl}
              alt="Full-screen chat attachment"
              className="max-h-[82vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
