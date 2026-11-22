export type GameMode =
  | 'practice'
  | 'single'
  | 'team'
  | 'multiplayer'
  | 'survival'
  | 'tournament'
  | 'battle_royale';

export type ArenaId = 'practice' | 'city' | 'snowy' | 'desert' | 'sky_island';

export type GunId =
  | 'basic_pistol'
  | 'mini_smg'
  | 'assault_rifle'
  | 'combat_shotgun'
  | 'sniper'
  | 'laser_blaster';

export type KnifeId =
  | 'basic_knife'
  | 'shadow_karambit'
  | 'butterfly_blade'
  | 'dragon_blade'
  | 'pixel_blade';

export type GrenadeId = 'frag_grenade' | 'flash_cube' | 'plasma_cluster';

export type AirplaneId =
  | 'cargo_carrier'
  | 'royal_gold_jet'
  | 'stealth_cyber_striker'
  | 'dragon_fire_bomber';

export type ParachuteId =
  | 'classic_white'
  | 'tiger_camo'
  | 'galaxy_neon'
  | 'phoenix_flame';

export type WeaponSlot = 'gun' | 'knife' | 'grenade';

export type CameraViewMode = 'first' | 'close' | 'far';

export type VehicleKind =
  | 'car'
  | 'buggy'
  | 'bike'
  | 'sedan'
  | 'truck'
  | 'tank'
  | 'helicopter'
  | 'police_car'
  | 'swat_tank'
  | 'police_heli';

export type EmoteId =
  | 'hello_wave'
  | 'lol_laugh'
  | 'booyah_dance'
  | 'dab_flex'
  | 'chicken_taunt'
  | 'kung_fu'
  | 'push_ups'
  | 'moonwalk'
  | 'money_rain'
  | 'pirate_throne';

export type BoatKind = 'speedboat' | 'jetski' | 'fishing_boat' | 'pirate_boat' | 'battleship';

export type MarineMountKind =
  | 'shark_mount'
  | 'whale_mount'
  | 'sailfish_mount'
  | 'turtle_mount'
  | 'manta_mount';

export type FlyingMountKind = 'golden_eagle' | 'pterodactyl' | 'sky_griffin';

export type LandAnimalMountKind = 'gorilla' | 'rhino' | 'cheetah';

export type MountType =
  | VehicleKind
  | BoatKind
  | MarineMountKind
  | FlyingMountKind
  | LandAnimalMountKind
  | 'horse';

export type TeamChoice = 'blue' | 'red';
export type MatchTeamMode = 'ffa' | 'team';

export type ItemSize = 'Small' | 'Medium' | 'Large';

export type ShopCategory =
  | 'backgrounds'
  | 'guns'
  | 'knives'
  | 'grenades'
  | 'skins'
  | 'airplanes'
  | 'parachutes'
  | 'emotes';

export type HeadgearType = 'none' | 'crown' | 'horns' | 'antenna' | 'halo' | 'headband' | 'visor_cap';

export type CharacterAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'swim'
  | 'diving'
  | 'ride'
  | 'crawl'
  | 'crouch'
  | 'sit'
  | 'attack'
  | 'slash'
  | 'reload'
  | 'throw'
  | 'win'
  | 'defeat'
  | 'emote_wave'
  | 'emote_laugh'
  | 'emote_booyah'
  | 'emote_dab'
  | 'emote_chicken'
  | 'emote_kungfu'
  | 'emote_pushups'
  | 'emote_moonwalk'
  | 'emote_money'
  | 'emote_throne';

export interface GunDef {
  id: GunId;
  name: string;
  size: ItemSize;
  price: number;
  description: string;
  primaryColor: string;
  accentColor: string;
  damage: number;
  fireRate: number; // shots per second
  range: number;
  pellets: number;
  spread: number; // radians
  projectileSpeed: number;
  knockback: number;
  tracerColor: string;
  magSize: number;
  reserveMax: number; // -1 = unlimited
  reloadTime: number; // seconds
}

export interface KnifeDef {
  id: KnifeId;
  name: string;
  size: ItemSize;
  price: number;
  description: string;
  bladeColor: string;
  accentColor: string;
  damage: number;
  cooldown: number;
  range: number;
  knockback: number;
  trailColor: string;
}

export interface GrenadeDef {
  id: GrenadeId;
  name: string;
  price: number;
  description: string;
  damage: number;
  radius: number;
  fuseTime: number;
  color: string;
  accentColor: string;
  effectType: 'explosive' | 'flash' | 'cluster';
}

export interface CharacterPreset {
  id: string;
  name: string;
  title: string;
  description: string;
  unlockCost: number;
  unlockLevel: number;
  primaryColor: string;
  secondaryColor: string;
  visorColor: string;
  defaultHeadgear: HeadgearType;
  speedBonus: number;
  powerBonus: number;
  jumpBonus: number;
}

export interface CharacterCustomization {
  characterId: string;
  primaryColor: string;
  secondaryColor: string;
  visorColor: string;
  headgear: HeadgearType;
}

export interface ArenaDefinition {
  id: ArenaId;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  skyColor: string;
  fogColor: string;
  accentColor: string;
  hazardLabel: string;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  graphicsQuality: 'high' | 'medium';
  cameraSensitivity: number;
  invertY: boolean;
  showTouchControls: 'auto' | 'always' | 'off';
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'kos' | 'coins' | 'wins';
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
}

export interface AirplaneDef {
  id: AirplaneId;
  name: string;
  price: number;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export interface ParachuteDef {
  id: ParachuteId;
  name: string;
  price: number;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export interface EmoteDef {
  id: EmoteId;
  name: string;
  price: number;
  description: string;
  animState: CharacterAnimState;
  duration: number;
  accentColor: string;
}

export interface EquippedLoadout {
  arenaId: ArenaId;
  gunId: GunId;
  knifeId: KnifeId;
  grenadeId: GrenadeId | null;
  characterId: string;
  airplaneId: AirplaneId;
  parachuteId: ParachuteId;
}

export interface PlayerProgress {
  accountId: string;
  sessionToken: string;
  username?: string;
  avatarIcon?: string;
  avatarUrl?: string;
  isGuest?: boolean;
  playerName: string;
  playerTag: string;
  coins: number;
  xp: number;
  level: number;
  unlockedArenas: ArenaId[];
  unlockedGuns: GunId[];
  unlockedKnives: KnifeId[];
  unlockedGrenades: GrenadeId[];
  unlockedCharacters: string[];
  unlockedAirplanes: AirplaneId[];
  unlockedParachutes: ParachuteId[];
  unlockedEmotes?: EmoteId[];
  equippedEmotes?: EmoteId[];
  unlockedAchievements: string[];
  equipped: EquippedLoadout;
  customization: CharacterCustomization;
  totalWins: number;
  battleRoyaleWins?: number;
  totalMatches: number;
  totalKOs: number;
  totalCoinsCollected: number;
  bestSurvivalWave: number;
  tournamentWins: number;
  animalsHunted?: number;
  shipsBoarded?: number;
  dailyDate: string;
  dailyChallenges: DailyChallenge[];
  customPosterUrl?: string;
  banned?: boolean;
  banReason?: string;
  chatMuted?: boolean;
  chatMutedAt?: string;
  chatMutedReason?: string;
  isVipAllUnlocked?: boolean;
  role?: 'player' | 'admin';
  policyAccepted?: boolean;
  policyAcceptedVersion?: string;
  policyAcceptedAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  playerTag?: string;
  avatarUrl?: string;
  avatarIcon?: string;
  characterId: string;
  mode: GameMode;
  arena: ArenaId;
  score: number;
  kos: number;
  wave?: number;
  createdAt: string;
}

export interface CombatantHud {
  id: string;
  name: string;
  playerTag?: string;
  level?: number;
  team?: TeamChoice;
  isLocal: boolean;
  isBot: boolean;
  color: string;
  hp: number;
  maxHp: number;
  hearts: number;
  score: number;
  kos: number;
  deaths: number;
  alive: boolean;
  hasCrown: boolean;
}

export interface RadarBuilding {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
}

export interface RadarActorBlip {
  id: string;
  x: number;
  z: number;
  isLocal: boolean;
  team?: TeamChoice;
  alive: boolean;
}

export type PickupKind =
  | 'coin'
  | 'heart'
  | 'speed'
  | 'power'
  | 'ammo'
  | 'grenade'
  | 'medkit'
  | 'repair'
  | 'armor1'
  | 'armor2'
  | 'armor3'
  | 'airdrop'
  | 'conch'
  | 'shell'
  | 'starfish'
  | 'pearl'
  | 'meat'
  | 'volcano_crate';

export interface RadarPickupBlip {
  x: number;
  z: number;
  kind: PickupKind;
}

export interface RadarVehicleBlip {
  x: number;
  z: number;
  kind: MountType;
  occupied: boolean;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  killerTeam?: TeamChoice;
  victimTeam?: TeamChoice;
  isLocalInvolved: boolean;
}

export interface DamagePopupHud {
  id: string;
  xPct: number;
  yPct: number;
  text: string;
  isCrit: boolean;
  isVehicle: boolean;
  alpha: number;
}

export interface GameHudState {
  mode: GameMode;
  teamMode: MatchTeamMode;
  playerTeam?: TeamChoice;
  arena: ArenaId;
  gunId: GunId;
  knifeId: KnifeId;
  grenadeId: GrenadeId | null;
  activeSlot: WeaponSlot;
  cameraView: CameraViewMode;
  isPointerLocked: boolean;
  ammoInMag: number;
  magSize: number;
  reserveAmmo: number; // -1 = infinity
  isReloading: boolean;
  reloadProgress: number;
  grenadeCount: number;
  aimOnEnemy: boolean;
  crosshairSpread: number;
  hitMarkerTime: number;
  allyShieldTime: number;
  damageIndicatorAngle: number;
  damageIndicatorTime: number;
  damagePopups: DamagePopupHud[];
  killFeed?: KillFeedItem[];
  nearDoorPrompt: string | null;
  nearBenchPrompt?: string | null;
  nearMountPrompt: string | null;
  mountedKind: MountType | null;
  mountedName: string | null;
  mountedHp: number;
  mountedMaxHp: number;
  mountedSpeedKmh: number;
  isSwimming: boolean;
  isUnderwater?: boolean;
  hasDivingHelmet?: boolean;
  nearCampfire?: boolean;
  inLavaZone?: boolean;
  isCrouching?: boolean;
  isSitting?: boolean;
  blindFlashAlpha: number;
  timeRemaining: number;
  wave: number;
  tournamentRound: number;
  localHp: number;
  localMaxHp: number;
  localHearts: number;
  localMaxHearts: number;
  localStamina: number;
  localScore: number;
  localKos: number;
  localCoinsInMatch: number;
  dashCooldownRatio: number;
  fireCooldownRatio: number;
  knifeCooldownRatio: number;
  activePowerup: string | null;
  activePowerupTime: number;
  combatants: CombatantHud[];
  blueTeamScore?: number;
  redTeamScore?: number;
  announcement: string | null;
  isPaused: boolean;
  matchEnded: boolean;
  playerX: number;
  playerZ: number;
  camYaw: number;
  radarHalfRange: number;
  radarBuildings: RadarBuilding[];
  radarActors: RadarActorBlip[];
  radarPickups: RadarPickupBlip[];
  radarVehicles: RadarVehicleBlip[];
  isBattleRoyale?: boolean;
  brPhase?: 'plane' | 'freefall' | 'parachute' | 'ground';
  playersInPlane?: number;
  totalFighters?: number;
  aliveCount?: number;
  altitudeMeters?: number;
  armorHp?: number;
  armorMaxHp?: number;
  armorLevel?: 0 | 1 | 2 | 3;
  isKnockedDown?: boolean;
  bleedoutRemaining?: number;
  reviveTargetName?: string | null;
  reviveProgress?: number;
  outsideZone?: boolean;
  zoneStage?: number;
  zoneTimer?: number;
  zoneStatusText?: string;
  zoneCenterX?: number;
  zoneCenterZ?: number;
  zoneRadius?: number;
  nextZoneCenterX?: number;
  nextZoneCenterZ?: number;
  nextZoneRadius?: number;
  planeFlightStart?: { x: number; z: number };
  planeFlightEnd?: { x: number; z: number };
  planePos?: { x: number; z: number };
  airdropPos?: { x: number; z: number } | null;
  tribalIslandCenter?: { x: number; z: number };
  airportIslandCenter?: { x: number; z: number };
  titanicCenter?: { x: number; z: number };
  poisonAlpha?: number;
  nearFruitPrompt?: string | null;
  nearLootPrompt?: string | null;
  nearConsolePrompt?: string | null;
  wantedLevel?: number;
  inJail?: boolean;
  jailTimeLeft?: number;
  jailFinePaid?: number;
  activeEmote?: EmoteId | null;
  missileRoomOpen?: boolean;
  tribalCapturePhase?: 'none' | 'struggle' | 'suspended';
  struggleProgress?: number;
  struggleTimeLeft?: number;
}

export interface MatchSummary {
  mode: GameMode;
  arena: ArenaId;
  victory: boolean;
  teamVictory: boolean;
  placement: number;
  score: number;
  kos: number;
  deaths: number;
  coinsCollected: number;
  animalsHunted?: number;
  shipsBoarded?: number;
  waveReached: number;
  tournamentRound: number;
  xpEarned: number;
  coinsEarned: number;
  bonusCoinsEarned?: number;
  coinBreakdown: {
    eliminations: number;
    victoryBonus: number;
    completionBonus: number;
    teamBonus: number;
    battleRoyaleBonus?: number;
    shoreTreasures?: number;
  };
  leveledUp: boolean;
  newLevel: number;
  newlyUnlockedAchievements: AchievementDef[];
  capturedByTribe?: boolean;
}

export interface MultiplayerRoomInfo {
  code: string;
  hostName: string;
  arena: ArenaId;
  teamMode?: MatchTeamMode;
  playerCount: number;
  maxPlayers: number;
  fillWithBots: boolean;
  inProgress: boolean;
}

export interface NetworkPlayerSnapshot {
  id: string;
  name: string;
  playerTag?: string;
  level?: number;
  team?: TeamChoice;
  isBot: boolean;
  customization: CharacterCustomization;
  gunId: GunId;
  knifeId: KnifeId;
  activeSlot?: WeaponSlot;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  anim: CharacterAnimState;
  hp: number;
  maxHp: number;
  hearts?: number;
  score: number;
  kos: number;
  deaths: number;
  alive: boolean;
  hasCrown: boolean;
  attackTimer: number;
  hitFlash: number;
}

export interface NetworkProjectileSnapshot {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface NetworkPickupSnapshot {
  id: string;
  kind: 'coin' | 'heart' | 'speed' | 'power' | 'ammo' | 'grenade';
  x: number;
  y: number;
  z: number;
  active: boolean;
}
