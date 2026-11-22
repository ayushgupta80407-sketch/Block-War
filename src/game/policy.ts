import { PlayerProgress } from './types';

export interface PolicySection {
  id: string;
  title: string;
  body: string;
}

export interface GamePolicyConfig {
  version: string;
  title: string;
  subtitle: string;
  sections: PolicySection[];
  updatedAt: string;
}

export interface PolicyAcceptanceRecord {
  accountId: string;
  username: string;
  playerName: string;
  status: 'ACCEPTED' | 'PENDING';
  accepted: boolean;
  policyVersion: string;
  acceptedAt: string | null;
}

export const DEFAULT_POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'fair_play',
    title: '1. Fair Play & Anti-Cheat Policy',
    body: 'BLOCK WAR enforces zero tolerance for hacks, aimbots, wallhacks, speed or fly exploits, map glitch abuse, packet tampering, or unauthorized third-party scripts. Any account caught violating fair play rules faces an immediate and permanent account ban enforced by Administrators.',
  },
  {
    id: 'community',
    title: '2. Community & Respect Guidelines',
    body: 'Keep usernames, player tags, squad communications, and lobby interactions respectful at all times. Harassment, hate speech, offensive names, spamming, or impersonating BLOCK WAR Admins or moderators is strictly prohibited.',
  },
  {
    id: 'virtual_coins',
    title: '3. Virtual Coins & UPI Top-Up Policy (₹1 = 100 Coins)',
    body: 'Virtual Coins, Emotes, Character Skins, Maps, Vehicles, and Weapons are in-game digital items with no real-world cash value. All UPI Coin Top-Ups (₹1 = 100 Coins) require valid 12-digit UTR receipt verification. Players under 18 must obtain explicit parent or legal guardian consent before making any UPI top-up.',
  },
  {
    id: 'account_security',
    title: '4. Account Security & Data Storage',
    body: 'Your player profile, unlocked items, match statistics, leaderboard rankings, and policy confirmation timestamps are securely stored to sync progress across sessions and maintain fair competition. Keep your account credentials private and never share your password.',
  },
  {
    id: 'mechanics_disclaimer',
    title: '5. In-Game Mechanics & Disclaimer',
    body: 'All BLOCK WAR gameplay—including 50-player Battle Royale combat, Airport Police Wanted stars, vehicle arrest fines (200 Coins) and jail bail (1,000 Coins), Tribal Island survival, sea exploration, and aircraft/vehicle stunts—is fictional 3D action entertainment.',
  },
];

export const DEFAULT_GAME_POLICY: GamePolicyConfig = {
  version: 'v1.0',
  title: 'BLOCK WAR — Official Game Rules, Fair Play & Privacy Policy',
  subtitle: 'Please review and confirm the official rules before entering the arena.',
  sections: DEFAULT_POLICY_SECTIONS.map((s) => ({ ...s })),
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function normalizeGamePolicy(raw?: Partial<GamePolicyConfig> | null): GamePolicyConfig {
  const version =
    typeof raw?.version === 'string' && /^v\d+\.\d+$/i.test(raw.version.trim())
      ? raw.version.trim().toLowerCase()
      : DEFAULT_GAME_POLICY.version;

  const title =
    typeof raw?.title === 'string' && raw.title.trim().length > 0
      ? raw.title.trim().slice(0, 140)
      : DEFAULT_GAME_POLICY.title;

  const subtitle =
    typeof raw?.subtitle === 'string' && raw.subtitle.trim().length > 0
      ? raw.subtitle.trim().slice(0, 220)
      : DEFAULT_GAME_POLICY.subtitle;

  const rawSections = Array.isArray(raw?.sections) ? raw.sections : [];
  const cleanedSections: PolicySection[] = rawSections
    .map((s, idx) => ({
      id:
        typeof s?.id === 'string' && s.id.trim()
          ? s.id.trim().slice(0, 40)
          : `section_${idx + 1}`,
      title: typeof s?.title === 'string' ? s.title.trim().slice(0, 120) : '',
      body: typeof s?.body === 'string' ? s.body.trim().slice(0, 1600) : '',
    }))
    .filter((s) => s.title.length > 0 && s.body.length > 0);

  return {
    version,
    title,
    subtitle,
    sections:
      cleanedSections.length > 0
        ? cleanedSections
        : DEFAULT_POLICY_SECTIONS.map((s) => ({ ...s })),
    updatedAt:
      typeof raw?.updatedAt === 'string' && raw.updatedAt
        ? raw.updatedAt
        : DEFAULT_GAME_POLICY.updatedAt,
  };
}

export function bumpPolicyVersion(currentVersion: string): string {
  const match = String(currentVersion || 'v1.0').trim().match(/^v(\d+)\.(\d+)$/i);
  if (!match) return 'v1.1';
  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `v${major}.${minor}`;
}

export function hasAcceptedPolicyVersion(
  progress: Pick<PlayerProgress, 'policyAccepted' | 'policyAcceptedVersion' | 'policyAcceptedAt'>,
  requiredVersion: string
): boolean {
  if (!progress.policyAccepted) return false;
  const acceptedVer = (progress.policyAcceptedVersion || '').trim().toLowerCase();
  const reqVer = (requiredVersion || 'v1.0').trim().toLowerCase();
  return acceptedVer === reqVer && Boolean(progress.policyAcceptedAt);
}

export function formatPolicyTimestamp(iso?: string | null): string {
  if (!iso) return 'Not confirmed yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
