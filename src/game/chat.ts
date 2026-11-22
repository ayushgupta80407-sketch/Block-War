export type ChatChannel = 'global' | 'dm';
export type ChatMediaType = 'image' | 'video';

export interface ChatMessage {
  id: string;
  threadId: string;
  channel: ChatChannel;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  senderAvatarIcon?: string;
  recipientId?: string;
  recipientUsername?: string;
  text: string;
  mediaType?: ChatMediaType;
  mediaDataUrl?: string;
  mediaFileName?: string;
  mediaSizeKb?: number;
  mediaDurationSec?: number;
  createdAt: string;
  deletedByUser?: boolean;
  deletedAt?: string;
  deletedByAccountId?: string;
  hiddenForAccountIds?: string[];
}

export interface ChatPeerSummary {
  accountId: string;
  username: string;
  playerName: string;
  avatarUrl?: string;
  avatarIcon?: string;
  level: number;
  chatMuted?: boolean;
  banned?: boolean;
}

export interface ChatThreadSummary {
  threadId: string;
  channel: ChatChannel;
  label: string;
  participantIds: string[];
  participantNames: string[];
  totalMessages: number;
  mediaMessages: number;
  deletedMessages: number;
  lastMessageAt: string;
}

export const MASTER_CHAT_HISTORY_KEY = 'bw_master_chat_history';
export const MAX_CHAT_IMAGE_WIDTH = 640;
export const MAX_CHAT_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_CHAT_VIDEO_DURATION_SEC = 30; // 30 seconds

export function makeDmThreadId(accountA: string, accountB: string): string {
  const [first, second] = [accountA.trim(), accountB.trim()].sort();
  return `dm:${first}__${second}`;
}

export function formatChatTimestamp(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatShortClock(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function estimateBytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  if (idx === -1) return dataUrl.length;
  return Math.floor(((dataUrl.length - idx - 1) * 3) / 4);
}

function compressImageToDataUrl(
  source: CanvasImageSource,
  srcW: number,
  srcH: number
): { dataUrl: string; sizeKb: number } {
  const scale = srcW > MAX_CHAT_IMAGE_WIDTH ? MAX_CHAT_IMAGE_WIDTH / srcW : 1;
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to process image.');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetW, targetH);

  // Prefer WebP when supported, fall back to JPEG
  let dataUrl = canvas.toDataURL('image/webp', 0.82);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  }
  const sizeKb = Math.max(1, Math.round((estimateBytes(dataUrl) / 1024) * 10) / 10);
  return { dataUrl, sizeKb };
}

function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(objectUrl);
      resolve(dur);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Please select a valid MP4 or WebM video file.'));
    };
    video.src = objectUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read media file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read media file.'));
    reader.readAsDataURL(file);
  });
}

export async function processChatMediaFile(file: File): Promise<{
  mediaType: ChatMediaType;
  mediaDataUrl: string;
  mediaFileName: string;
  mediaSizeKb: number;
  mediaDurationSec?: number;
}> {
  if (!file) throw new Error('No file selected.');
  const mime = (file.type || '').toLowerCase();
  const nameLower = (file.name || '').toLowerCase();

  const isVideo =
    mime.startsWith('video/') ||
    nameLower.endsWith('.mp4') ||
    nameLower.endsWith('.webm') ||
    nameLower.endsWith('.mov');
  const isImage =
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif|avif)$/i.test(nameLower);

  if (!isImage && !isVideo) {
    throw new Error('Please choose a valid Image or short Video (MP4 / WebM) file.');
  }

  if (isVideo) {
    if (file.size > MAX_CHAT_VIDEO_BYTES) {
      throw new Error('Video exceeds the 10 MB limit. Please pick a shorter or smaller clip.');
    }
    const duration = await probeVideoDuration(file);
    if (duration > MAX_CHAT_VIDEO_DURATION_SEC + 0.5) {
      throw new Error(
        `Video is ${Math.ceil(duration)}s long. Max allowed length is ${MAX_CHAT_VIDEO_DURATION_SEC} seconds.`
      );
    }
    const dataUrl = await readFileAsDataUrl(file);
    const sizeKb = Math.max(1, Math.round((file.size / 1024) * 10) / 10);
    return {
      mediaType: 'video',
      mediaDataUrl: dataUrl,
      mediaFileName: file.name || 'clip.mp4',
      mediaSizeKb: sizeKb,
      mediaDurationSec: Math.max(1, Math.round(duration)),
    };
  }

  // Image path (resize max 640px width, WebP/JPEG)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image exceeds 15 MB limit.');
  }
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const { dataUrl, sizeKb } = compressImageToDataUrl(bitmap, bitmap.width, bitmap.height);
        return {
          mediaType: 'image',
          mediaDataUrl: dataUrl,
          mediaFileName: file.name || 'photo.webp',
          mediaSizeKb: sizeKb,
        };
      } finally {
        bitmap.close?.();
      }
    } catch {
      // Fallback below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Please select a valid photo file.'));
      el.src = objectUrl;
    });
    const { dataUrl, sizeKb } = compressImageToDataUrl(img, img.naturalWidth, img.naturalHeight);
    return {
      mediaType: 'image',
      mediaDataUrl: dataUrl,
      mediaFileName: file.name || 'photo.jpg',
      mediaSizeKb: sizeKb,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/* -------------------------------------------------------------------------- */
/* Local Master Chat History Store (bw_master_chat_history)                   */
/* Never deletes player messages permanently except via Admin Purge           */
/* -------------------------------------------------------------------------- */
let inMemoryMasterChat: ChatMessage[] | null = null;

export function getMasterChatHistoryLocal(): ChatMessage[] {
  if (inMemoryMasterChat) return [...inMemoryMasterChat];
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(MASTER_CHAT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryMasterChat = parsed as ChatMessage[];
      return [...inMemoryMasterChat];
    }
  } catch {
    // Ignore storage read error
  }
  return [];
}

export function saveMasterChatHistoryLocal(messages: ChatMessage[]): void {
  const dedupMap = new Map<string, ChatMessage>();
  for (const m of messages) {
    if (m && m.id) dedupMap.set(m.id, m);
  }
  const sorted = Array.from(dedupMap.values())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-500);
  inMemoryMasterChat = sorted;

  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MASTER_CHAT_HISTORY_KEY, JSON.stringify(sorted));
  } catch {
    // If large video payloads exceed browser ~5MB localStorage quota, persist compact copy
    // while keeping full video buffers in inMemoryMasterChat and server data/db.json
    try {
      const compact = sorted.map((m) =>
        m.mediaType === 'video' && (m.mediaDataUrl?.length || 0) > 650_000
          ? { ...m, mediaDataUrl: '' }
          : m
      );
      localStorage.setItem(MASTER_CHAT_HISTORY_KEY, JSON.stringify(compact.slice(-250)));
    } catch {
      // Ignore quota exceeded
    }
  }
}

export function upsertMasterChatMessageLocal(msg: ChatMessage): ChatMessage[] {
  const list = getMasterChatHistoryLocal();
  const idx = list.findIndex((m) => m.id === msg.id);
  const next = idx >= 0 ? list.map((m, i) => (i === idx ? { ...m, ...msg } : m)) : [...list, msg];
  saveMasterChatHistoryLocal(next);
  return next;
}

export function markChatMessageDeletedLocal(
  messageId: string,
  accountId: string,
  deletedAt = new Date().toISOString()
): ChatMessage[] {
  const list = getMasterChatHistoryLocal();
  const next = list.map((m) =>
    m.id === messageId
      ? {
          ...m,
          deletedByUser: true,
          deletedAt,
          deletedByAccountId: accountId,
        }
      : m
  );
  saveMasterChatHistoryLocal(next);
  return next;
}

export function markThreadClearedForUserLocal(threadId: string, accountId: string): ChatMessage[] {
  const now = new Date().toISOString();
  const list = getMasterChatHistoryLocal();
  const next = list.map((m) => {
    if (m.threadId !== threadId) return m;
    const hidden = Array.from(new Set([...(m.hiddenForAccountIds || []), accountId]));
    const isOwn = m.senderId === accountId;
    return {
      ...m,
      hiddenForAccountIds: hidden,
      ...(isOwn && !m.deletedByUser
        ? { deletedByUser: true, deletedAt: now, deletedByAccountId: accountId }
        : {}),
    };
  });
  saveMasterChatHistoryLocal(next);
  return next;
}

export function purgeMasterChatMessageLocal(messageId: string): ChatMessage[] {
  const next = getMasterChatHistoryLocal().filter((m) => m.id !== messageId);
  saveMasterChatHistoryLocal(next);
  return next;
}

export function isVisibleToPlayer(msg: ChatMessage, accountId: string): boolean {
  if (msg.deletedByUser) return false;
  if (Array.isArray(msg.hiddenForAccountIds) && msg.hiddenForAccountIds.includes(accountId)) {
    return false;
  }
  return true;
}

export function buildChatThreadSummaries(messages: ChatMessage[]): ChatThreadSummary[] {
  const map = new Map<string, ChatThreadSummary>();
  for (const m of messages) {
    const existing = map.get(m.threadId);
    const hasMedia = Boolean(m.mediaType && m.mediaDataUrl);
    const isDeleted = Boolean(m.deletedByUser);
    if (!existing) {
      const participantIds = Array.from(
        new Set([m.senderId, ...(m.recipientId ? [m.recipientId] : [])].filter(Boolean))
      );
      const participantNames = Array.from(
        new Set([m.senderUsername, ...(m.recipientUsername ? [m.recipientUsername] : [])].filter(Boolean))
      );
      const label =
        m.channel === 'global'
          ? 'Global Lobby Chat'
          : participantNames.length >= 2
            ? `${participantNames[0]} ↔ ${participantNames[1]}`
            : `DM: ${participantNames[0] || m.threadId}`;
      map.set(m.threadId, {
        threadId: m.threadId,
        channel: m.channel,
        label,
        participantIds,
        participantNames,
        totalMessages: 1,
        mediaMessages: hasMedia ? 1 : 0,
        deletedMessages: isDeleted ? 1 : 0,
        lastMessageAt: m.createdAt,
      });
    } else {
      existing.totalMessages += 1;
      if (hasMedia) existing.mediaMessages += 1;
      if (isDeleted) existing.deletedMessages += 1;
      if (m.createdAt > existing.lastMessageAt) existing.lastMessageAt = m.createdAt;
      if (m.senderUsername && !existing.participantNames.includes(m.senderUsername)) {
        existing.participantNames.push(m.senderUsername);
      }
      if (m.recipientUsername && !existing.participantNames.includes(m.recipientUsername)) {
        existing.participantNames.push(m.recipientUsername);
      }
      if (existing.channel === 'dm' && existing.participantNames.length >= 2) {
        existing.label = `${existing.participantNames[0]} ↔ ${existing.participantNames[1]}`;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.channel === 'global' && b.channel !== 'global') return -1;
    if (b.channel === 'global' && a.channel !== 'global') return 1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });
}
