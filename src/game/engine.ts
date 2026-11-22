import * as THREE from 'three';
import {
  ArenaBuildResult,
  ArenaBoxCollider,
  buildArena,
  HarvestableFruitNode,
  InteractiveBench,
  WaspNestNode,
  WATER_LEVEL,
} from './arenas';
import {
  getArenaDef,
  getGrenadeDef,
  getGunDef,
  getKnifeDef,
  SKIN_CATALOG,
} from './catalog';
import {
  createAirdropCrateModel,
  createAirplaneModel,
  createParachuteModel,
} from './battleRoyaleModels';
import { ActorRelation, animateCharacterRig, CharacterRig, createBlockCharacterRig } from './characters';
import {
  DEFAULT_LIVE_GAME_CONFIG,
  LiveGameConfig,
  normalizeLiveGameConfig,
} from './liveConfig';
import { getLiveGameConfig } from './adminPersistence';
import { getLevelBonusStats } from './progression';
import { soundEngine } from './sound';
import {
  AirplaneId,
  ArenaId,
  CameraViewMode,
  CharacterAnimState,
  CharacterCustomization,
  DamagePopupHud,
  GameHudState,
  GameMode,
  GameSettings,
  GrenadeId,
  GunId,
  KillFeedItem,
  KnifeId,
  MatchSummary,
  MatchTeamMode,
  MountType,
  NetworkPickupSnapshot,
  NetworkPlayerSnapshot,
  NetworkProjectileSnapshot,
  ParachuteId,
  PickupKind,
  TeamChoice,
  VehicleKind,
  WeaponSlot,
} from './types';
import {
  createBoatEntity,
  createFlyingBirdMountEntity,
  createHorseEntity,
  createLandAnimalMountEntity,
  createOceanFish,
  createVehicleEntity,
  createWildAnimal,
  isBoatKind,
  isFlyingMountKind,
  isHelicopterKind,
  isLandAnimalKind,
  isLivingMountKind,
  isMarineMountKind,
  isPoliceVehicleKind,
  isTankKind,
  MountEntity,
  OceanFishEntity,
  WildAnimalEntity,
} from './vehiclesAndWildlife';
import {
  createInstancedFishSchool,
  createMarineMountEntity,
  createMermaidEntity,
  createPondCreatureEntity,
  createWildEcosystemEntity,
  InstancedFishSchool,
  MermaidEntity,
  PondCreatureEntity,
  WildEcosystemEntity,
  WildSpecies,
} from './ecosystem';
import { getEmoteDef } from './catalog';
import { EmoteId } from './types';
import { SEA_CAVES, TITANIC_CENTER, TRIBAL_ISLAND_CENTER, TRIBAL_SWAMP_CENTER, VOLCANO_CENTER } from './worldExpansion';
import {
  AIRPORT_ISLAND_CENTER,
  DestructibleStructure,
  JAIL_CELL_POS,
  JAIL_RELEASE_POS,
  MISSILE_CONSOLE_POS,
  setDestructibleStage,
  updateConstructionCrewVisual,
} from './airportIsland';
import { createGrenadeModel, createGunModel, WeaponModelHandle } from './weapons';

export interface TouchInputState {
  moveX: number;
  moveY: number;
  lookDeltaX: number;
  lookDeltaY: number;
  fireHeld: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
  reloadPressed: boolean;
  grenadePressed: boolean;
  switchWeaponPressed: boolean;
  interactPressed: boolean;
  reviveHeld: boolean;
  mountPressed: boolean;
  cycleCameraPressed: boolean;
  crouchPressed: boolean;
  diveHeld: boolean;
}

export interface EngineLaunchConfig {
  mode: GameMode;
  teamMode: MatchTeamMode;
  playerTeam: TeamChoice;
  arenaId: ArenaId;
  gunId: GunId;
  knifeId: KnifeId;
  grenadeId: GrenadeId | null;
  airplaneId?: AirplaneId;
  parachuteId?: ParachuteId;
  playerName: string;
  playerTag: string;
  playerLevel: number;
  fighterCount: number;
  customization: CharacterCustomization;
  settings: GameSettings;
  networkSocket: WebSocket | null;
  localNetworkId: string | null;
  liveConfig?: LiveGameConfig;
}

interface ActorEntity {
  id: string;
  name: string;
  playerTag?: string;
  level: number;
  team?: TeamChoice;
  isLocal: boolean;
  isBot: boolean;
  customization: CharacterCustomization;
  gunId: GunId;
  knifeId: KnifeId;
  grenadeId: GrenadeId | null;
  activeSlot: WeaponSlot;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  grounded: boolean;
  isSwimming: boolean;
  isUnderwater: boolean;
  diveDepthOffset: number;
  isCrouching: boolean;
  isSitting: boolean;
  sittingBenchId: string | null;
  sittingHealAccum: number;
  jumpsLeft: number;
  hp: number;
  maxHp: number;
  hearts: number;
  maxHearts: number;
  stamina: number;
  score: number;
  kos: number;
  deaths: number;
  coinsInMatch: number;
  alive: boolean;
  respawnTimer: number;
  invulnTimer: number;
  dashCooldown: number;
  dashTime: number;
  fireCooldown: number;
  knifeCooldown: number;
  ammoInMag: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  grenadeCount: number;
  grenadeCooldown: number;
  attackTimer: number;
  activeAnimOverride: 'attack' | 'slash' | 'throw' | null;
  hitFlash: number;
  blindTimer: number;
  speedBoostTimer: number;
  powerBoostTimer: number;
  mountedId: string | null;
  anim: CharacterAnimState;
  lastDamageBy: string | null;
  lastDamageTime: number;
  botTargetId: string | null;
  botDecisionTimer: number;
  botAiTimer: number;
  botDriveThrottle: number;
  botDriveSteer: number;
  botStrafeDir: number;
  botJumpTimer: number;
  botWantMountTimer: number;
  splashAccum: number;
  // Battle Royale properties
  brState: 'plane' | 'freefall' | 'parachute' | 'ground';
  parachuteId: ParachuteId;
  parachuteHandle: (WeaponModelHandle & { canopyGroup: THREE.Group }) | null;
  armorHp: number;
  armorMaxHp: number;
  armorLevel: 0 | 1 | 2 | 3;
  knockedDown: boolean;
  bleedoutTimer: number;
  reviveProgress: number;
  botJumpPlaneT: number;
  fruitSpeedBoostTimer: number;
  guardRole?: 'police' | 'army' | 'pursuit_police';
  guardHomeX?: number;
  guardHomeY?: number;
  guardHomeZ?: number;
  guardOnWatchtower?: boolean;
  activeEmoteAnim?: CharacterAnimState | null;
  activeEmoteTimer?: number;
}

interface DroppedWeaponLoot {
  id: string;
  gunId: GunId;
  x: number;
  y: number;
  z: number;
  mesh: THREE.Group;
  ttl: number;
  dispose: () => void;
}

interface BallisticMissileEntity {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetZ: number;
  vy: number;
  mesh: THREE.Group;
  ownerId: string;
}

interface WildProjectile {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  life: number;
  isVenom: boolean;
}

interface ProjectileEntity {
  id: string;
  ownerId: string;
  team?: TeamChoice;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  knockback: number;
  life: number;
  color: string;
  splashRadius?: number;
  isHeavyBlast?: boolean;
  isHoming?: boolean;
}

interface ActiveGrenade {
  id: string;
  ownerId: string;
  team?: TeamChoice;
  grenadeId: GrenadeId;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuse: number;
  dispose: () => void;
}

interface PickupEntity {
  id: string;
  kind: PickupKind;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  active: boolean;
  respawnTimer: number;
  baseY: number;
  gunUpgrade?: GunId;
  dispose?: () => void;
}

interface ActiveAirdrop {
  id: string;
  x: number;
  y: number;
  z: number;
  landed: boolean;
  opened: boolean;
  model: ReturnType<typeof createAirdropCrateModel>;
}

interface ParticleBurst {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  expandRate?: number;
  spinVx?: number;
  spinVz?: number;
}

interface WorldDamagePopup {
  id: string;
  x: number;
  y: number;
  z: number;
  text: string;
  isCrit: boolean;
  isVehicle: boolean;
  life: number;
  maxLife: number;
}

interface ObstacleHit {
  dist: number;
  hx: number;
  hy: number;
  hz: number;
  nx: number;
  ny: number;
  nz: number;
  isMetallic: boolean;
}

const BOT_NAMES = [
  'VoltBot', 'BloxKnight', 'CyberCube', 'PixelRex', 'NovaBlock',
  'BrickFury', 'VoxelAce', 'TitanBot', 'AquaRunner', 'IslandHawk',
  'TurboCub', 'ShadowBox', 'CoralRanger', 'ApexCube', 'StormBrick',
  'CobaltFox', 'ReefViper', 'FrostCore', 'DuneStriker', 'NeonWarden',
  'SkyRaider', 'IronBrick', 'PulseWolf', 'SandPhantom', 'DriftKing',
  'TideHunter', 'SparkUnit', 'MagmaCube', 'ZeroBrick', 'VectorNine',
  'CanyonGhost', 'SolarByte', 'BoltBaron', 'RidgeRunner', 'PrismShot',
  'AeroCub', 'CliffSniper', 'DeltaVoxel', 'EchoBlock', 'FlareScout',
  'GaleForce', 'HexKnight', 'IonBreaker', 'JetLag', 'KiloBox',
  'LunarEdge', 'MetroCub', 'NitroBlock', 'OmegaBrick',
];

const _instDummy = new THREE.Object3D();
const _instColor = new THREE.Color();
const _instCamQuat = new THREE.Quaternion();
const INSTANCED_BOT_CAP = 64;
const DETAIL_RIG_DIST_SQ = 38 * 38;
const SHADOW_CAST_DIST_SQ = 30 * 30;

const ALL_GUNS: GunId[] = ['basic_pistol', 'mini_smg', 'assault_rifle', 'combat_shotgun', 'sniper', 'laser_blaster'];
const ALL_KNIVES: KnifeId[] = ['basic_knife', 'shadow_karambit', 'butterfly_blade', 'dragon_blade', 'pixel_blade'];

const _vOrigin = new THREE.Vector3();
const _vDir = new THREE.Vector3();
const _vDesiredCam = new THREE.Vector3();
const _vCamPivot = new THREE.Vector3();
const _vCamRay = new THREE.Vector3();
const _vTarget = new THREE.Vector3();
const _vMuzzle = new THREE.Vector3();
const _vProj = new THREE.Vector3();
const _vDecalLook = new THREE.Vector3();
const _vShellRight = new THREE.Vector3();
const _vTmpVec = new THREE.Vector3();

function worldToBoatLocalXZ(
  wx: number,
  wz: number,
  mount: MountEntity
): { lx: number; lz: number } {
  const dx = wx - mount.x;
  const dz = wz - mount.z;
  const c = Math.cos(mount.yaw);
  const s = Math.sin(mount.yaw);
  return {
    lx: dx * c - dz * s,
    lz: dx * s + dz * c,
  };
}

function boatLocalToWorld(
  lx: number,
  ly: number,
  lz: number,
  mount: MountEntity
): { x: number; y: number; z: number } {
  const c = Math.cos(mount.yaw);
  const s = Math.sin(mount.yaw);
  return {
    x: mount.x + lx * c + lz * s,
    y: mount.y + ly,
    z: mount.z - lx * s + lz * c,
  };
}

function rayIntersectBoatDeckBoxes(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  mount: MountEntity
): number | null {
  if (!mount.deckBoxes) return null;
  const c = Math.cos(mount.yaw);
  const s = Math.sin(mount.yaw);
  const rx = ox - mount.x;
  const rz = oz - mount.z;
  const lox = rx * c - rz * s;
  const loy = oy - mount.y;
  const loz = rx * s + rz * c;
  const ldx = dx * c - dz * s;
  const ldy = dy;
  const ldz = dx * s + dz * c;

  let bestT: number | null = null;
  for (let i = 0; i < mount.deckBoxes.length; i++) {
    const b = mount.deckBoxes[i];
    if (b.kind === 'ramp') continue;
    const hit = rayIntersectAABB(lox, loy, loz, ldx, ldy, ldz, bestT ?? maxDist, b as unknown as ArenaBoxCollider);
    if (hit !== null && (bestT === null || hit < bestT)) {
      bestT = hit;
    }
  }
  return bestT;
}

let cachedBulletHoleTex: THREE.CanvasTexture | null = null;
function getBulletHoleTexture(): THREE.CanvasTexture {
  if (cachedBulletHoleTex) return cachedBulletHoleTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 28);
  grad.addColorStop(0, 'rgba(10, 12, 16, 0.96)');
  grad.addColorStop(0.35, 'rgba(24, 28, 36, 0.85)');
  grad.addColorStop(0.65, 'rgba(60, 65, 75, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedBulletHoleTex = tex;
  return tex;
}

const _sharedDecalGeo = new THREE.PlaneGeometry(0.28, 0.28);
const _sharedShellGeo = new THREE.BoxGeometry(0.055, 0.04, 0.13);
const _sharedShellMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  metalness: 0.85,
  roughness: 0.22,
});
const _sharedFlashGeo = new THREE.OctahedronGeometry(0.24, 0);
const _sharedFlashMat = new THREE.MeshBasicMaterial({
  color: 0xfef08a,
  transparent: true,
  opacity: 0.92,
});

function rayIntersectAABBNormal(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  box: ArenaBoxCollider
): { t: number; nx: number; ny: number; nz: number } | null {
  let tmin = 0;
  let tmax = maxDist;
  let nx = 0;
  let ny = 0;
  let nz = 0;

  if (Math.abs(dx) < 1e-6) {
    if (ox < box.minX || ox > box.maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (box.minX - ox) * inv;
    let t2 = (box.maxX - ox) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = sign;
      ny = 0;
      nz = 0;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-6) {
    if (oy < box.minY || oy > box.maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (box.minY - oy) * inv;
    let t2 = (box.maxY - oy) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = 0;
      ny = sign;
      nz = 0;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dz) < 1e-6) {
    if (oz < box.minZ || oz > box.maxZ) return null;
  } else {
    const inv = 1 / dz;
    let t1 = (box.minZ - oz) * inv;
    let t2 = (box.maxZ - oz) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = 0;
      ny = 0;
      nz = sign;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (tmin >= 0 && tmin <= maxDist) {
    if (nx === 0 && ny === 0 && nz === 0) ny = 1;
    return { t: tmin, nx, ny, nz };
  }
  return null;
}

function rayIntersectAABB(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  box: ArenaBoxCollider
): number | null {
  const res = rayIntersectAABBNormal(ox, oy, oz, dx, dy, dz, maxDist, box);
  return res ? res.t : null;
}

function segmentIntersectSphere(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  cx: number,
  cy: number,
  cz: number,
  radius: number
): number | null {
  const fx = ox - cx;
  const fy = oy - cy;
  const fz = oz - cz;
  const b = fx * dx + fy * dy + fz * dz;
  const c = fx * fx + fy * fy + fz * fz - radius * radius;
  if (c <= 0) return 0;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 && t <= maxDist ? t : null;
}

function segmentIntersectActorColumn(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  cx: number,
  baseY: number,
  topY: number,
  cz: number,
  radius: number
): number | null {
  const fx = ox - cx;
  const fz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-6) {
    if (fx * fx + fz * fz > radius * radius) return null;
    if (Math.abs(dy) < 1e-6) {
      return oy >= baseY && oy <= topY ? 0 : null;
    }
    const t1 = (baseY - oy) / dy;
    const t2 = (topY - oy) / dy;
    const tEnter = Math.max(0, Math.min(t1, t2));
    const tExit = Math.min(maxDist, Math.max(t1, t2));
    return tEnter <= tExit ? tEnter : null;
  }
  const b = fx * dx + fz * dz;
  const c = fx * fx + fz * fz - radius * radius;
  const disc = b * b - a * c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t0 = (-b - sqrtD) / a;
  const t1 = (-b + sqrtD) / a;
  if (t1 < 0 || t0 > maxDist) return null;
  const tHit = Math.max(0, t0);
  const hy = oy + dy * tHit;
  if (hy >= baseY - 0.15 && hy <= topY + 0.15) return tHit;
  const tMid = Math.max(0, Math.min(maxDist, (t0 + t1) * 0.5));
  const midY = oy + dy * tMid;
  if (midY >= baseY && midY <= topY) return tMid;
  return null;
}

export class BlockHeadEngine {
  private container: HTMLElement;
  private config: EngineLaunchConfig;
  private onHudUpdate: (hud: GameHudState) => void;
  private onMatchEnd: (summary: MatchSummary) => void;
  private onPauseChange?: (paused: boolean) => void;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private arena: ArenaBuildResult;

  private actors: Map<string, ActorEntity> = new Map();
  private mounts: Map<string, MountEntity> = new Map();
  private oceanFish: OceanFishEntity[] = [];
  private wildAnimals: WildAnimalEntity[] = [];
  private mermaids: MermaidEntity[] = [];
  private pondCreatures: PondCreatureEntity[] = [];
  private instancedFishSchool: InstancedFishSchool | null = null;
  private wildEcosystem: WildEcosystemEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private wildProjectiles: WildProjectile[] = [];
  private activeGrenades: ActiveGrenade[] = [];
  private pickups: PickupEntity[] = [];
  private particles: ParticleBurst[] = [];
  private impactDecals: THREE.Mesh[] = [];
  private damagePopups: WorldDamagePopup[] = [];

  private laserLine: THREE.Line;
  private laserDot: THREE.Mesh;
  private grenadeArcLine: THREE.Line;
  private grenadeArcPoints: THREE.Vector3[] = [];

  private networkProjectiles: Map<string, THREE.Mesh> = new Map();
  private networkPickups: Map<string, THREE.Group> = new Map();

  // InstancedMesh pool for distant 50-player BR bots (keeps draw calls low at 60 FPS)
  private instHead: THREE.InstancedMesh | null = null;
  private instTorso: THREE.InstancedMesh | null = null;
  private instArmL: THREE.InstancedMesh | null = null;
  private instArmR: THREE.InstancedMesh | null = null;
  private instLegL: THREE.InstancedMesh | null = null;
  private instLegR: THREE.InstancedMesh | null = null;
  private instHpBg: THREE.InstancedMesh | null = null;
  private instHpFill: THREE.InstancedMesh | null = null;

  // Battle Royale state & visuals
  private brPlaneHandle: WeaponModelHandle | null = null;
  private brPlaneStart = new THREE.Vector3(-215, 86, 0);
  private brPlaneEnd = new THREE.Vector3(215, 86, 0);
  private brPlanePos = new THREE.Vector3(-215, 86, 0);
  private brPlaneProgress = 0;
  private brZoneWall: THREE.Mesh | null = null;
  private brZoneGroundRing: THREE.Mesh | null = null;
  private brZoneStage = 1;
  private brZonePhase: 'hold' | 'shrink' = 'hold';
  private brZoneTimer = 42;
  private brZoneStageDuration = 42;
  private brZoneCenterX = 0;
  private brZoneCenterZ = 0;
  private brZoneRadius = 205;
  private brStartZoneCenterX = 0;
  private brStartZoneCenterZ = 0;
  private brStartZoneRadius = 205;
  private brNextZoneCenterX = 0;
  private brNextZoneCenterZ = 0;
  private brNextZoneRadius = 140;
  private brAirdrops: ActiveAirdrop[] = [];
  private brAirdropTimer = 45;
  private brWindSfxAccum = 0;
  private brFireworkBurstTimer = 0;
  private brCelebrateTimer = 0;

  private keys: Set<string> = new Set();
  private touchState: TouchInputState = {
    moveX: 0,
    moveY: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    fireHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    dashPressed: false,
    reloadPressed: false,
    grenadePressed: false,
    switchWeaponPressed: false,
    interactPressed: false,
    reviveHeld: false,
    mountPressed: false,
    cycleCameraPressed: false,
    crouchPressed: false,
    diveHeld: false,
  };

  private camYaw = 0;
  private camPitch = 0.14;
  private camZoom = 11.4;
  private cameraView: CameraViewMode = 'close';
  private isPointerLocked = false;
  private wasPointerLocked = false;
  private isMouseDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private fireHeldMouse = false;
  private screenShake = 0;

  private hitMarkerTime = 0;
  private allyShieldTime = 0;
  private damageIndicatorAngle = 0;
  private damageIndicatorTime = 0;
  private blindFlashAlpha = 0;

  private timeRemaining = 120;
  private wave = 1;
  private tournamentRound = 1;
  private elapsed = 0;
  private hudEmitAccum = 0;
  private netSendAccum = 0;
  private botWaveCooldown = 0;
  private bonusCoinsInMatch = 0;
  private animalsHuntedInMatch = 0;
  private boardedShipIds = new Set<string>();
  private killFeed: Array<KillFeedItem & { ttl: number }> = [];
  private coastalAmbienceTimer = 7.5;
  private villagerAggroTimer = 0;
  private tribalEnteredWarningDone = false;
  private poisonAlpha = 0;
  private nearFruitPrompt: string | null = null;
  private tribalCapturePhase: 'none' | 'struggle' | 'suspended' = 'none';
  private struggleProgress = 0;
  private struggleTimer = 0;
  private captureCutsceneTimer = 0;
  private captureDrumAccum = 0;
  private captureCamAngle = 0;
  private capturePropsGroup: THREE.Group | null = null;
  private captureDancers: THREE.Group[] = [];
  private captureRopeMeshes: THREE.Mesh[] = [];
  private wasTouchFireHeld = false;
  private bubbleSfxAccum = 0;
  private campfireTickAccum = 0;
  private lavaSfxAccum = 0;
  private divingAnnounced = false;
  private nearCampfire = false;
  private inLavaZone = false;
  private droppedWeapons: DroppedWeaponLoot[] = [];
  private ballisticMissiles: BallisticMissileEntity[] = [];
  private wantedLevel = 0;
  private wantedDecayTimer = 0;
  private policeSirenAccum = 0;
  private policeSpawnTimer = 2.0;
  private inJail = false;
  private jailTimeLeft = 0;
  private jailFinePaid = 0;
  private policeBoxInTimer = 0;
  private missileRoomOpen = false;
  private nearLootPrompt: string | null = null;
  private nearConsolePrompt: string | null = null;
  private activeEmote: EmoteId | null = null;
  private onEmoteWheelToggle?: () => void;
  private onPoliceArrest?: (requestedFine: number) => number | void;
  private isCameraUnderwater = false;
  private baseFogColor = 0x38bdf8;
  private baseSkyColor = 0x38bdf8;
  private baseFogDensity = 0.0014;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private moonMesh: THREE.Mesh | null = null;
  private liveConfig: LiveGameConfig;
  private pauseShortcutsBlocked = false;
  private customSpawnCounter = 0;
  private adminExtraTankIds: string[] = [];
  private adminExtraHeliIds: string[] = [];
  private adminExtraSharkIds: string[] = [];
  private adminExtraLionIds: string[] = [];

  private announcement: string | null = null;
  private announcementTimer = 0;
  private isPaused = false;
  private matchEnded = false;
  private disposed = false;
  private animFrameId = 0;
  private lastFrameMs = performance.now();

  constructor(
    container: HTMLElement,
    config: EngineLaunchConfig,
    callbacks: {
      onHudUpdate: (hud: GameHudState) => void;
      onMatchEnd: (summary: MatchSummary) => void;
      onPauseChange?: (paused: boolean) => void;
      onPoliceArrest?: (requestedFine: number) => number | void;
    }
  ) {
    this.container = container;
    this.config = config;
    this.onHudUpdate = callbacks.onHudUpdate;
    this.onMatchEnd = callbacks.onMatchEnd;
    this.onPauseChange = callbacks.onPauseChange;
    this.onPoliceArrest = callbacks.onPoliceArrest;

    this.liveConfig = normalizeLiveGameConfig(config.liveConfig ?? getLiveGameConfig());
    const arenaDef = getArenaDef(config.arenaId);
    this.baseSkyColor = new THREE.Color(arenaDef.skyColor).getHex();
    this.baseFogColor = new THREE.Color(arenaDef.fogColor).getHex();
    this.baseFogDensity = config.arenaId === 'city' ? 0.0019 : 0.0014;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.baseSkyColor);
    this.scene.fog = new THREE.FogExp2(this.baseFogColor, this.baseFogDensity);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.25, 1900);

    this.renderer = new THREE.WebGLRenderer({
      antialias: config.settings.graphicsQuality === 'high',
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, config.settings.graphicsQuality === 'high' ? 2 : 1.35)
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.95);
    this.hemiLight = hemi;
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sun.position.set(110, 165, 95);
    sun.castShadow = true;
    sun.shadow.mapSize.set(
      config.settings.graphicsQuality === 'high' ? 2048 : 1024,
      config.settings.graphicsQuality === 'high' ? 2048 : 1024
    );
    const sc = 240;
    sun.shadow.camera.left = -sc;
    sun.shadow.camera.right = sc;
    sun.shadow.camera.top = sc;
    sun.shadow.camera.bottom = -sc;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 560;
    this.sunLight = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);

    this.arena = buildArena(config.arenaId);
    this.scene.add(this.arena.group);

    // Gun Laser Pointer & Dot
    const gunColor = getGunDef(config.gunId).tracerColor;
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -10),
    ]);
    const laserMat = new THREE.LineBasicMaterial({
      color: gunColor,
      transparent: true,
      opacity: 0.78,
    });
    this.laserLine = new THREE.Line(laserGeo, laserMat);
    this.laserLine.frustumCulled = false;
    this.scene.add(this.laserLine);

    this.laserDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color: gunColor })
    );
    this.scene.add(this.laserDot);

    // Grenade Trajectory Arc Preview
    for (let i = 0; i < 24; i++) {
      this.grenadeArcPoints.push(new THREE.Vector3());
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(this.grenadeArcPoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0xfacc15,
      dashSize: 0.65,
      gapSize: 0.35,
      transparent: true,
      opacity: 0.9,
    });
    this.grenadeArcLine = new THREE.Line(arcGeo, arcMat);
    this.grenadeArcLine.visible = false;
    this.grenadeArcLine.frustumCulled = false;
    this.scene.add(this.grenadeArcLine);

    // Spawn Vehicles, Horses, Wild Animals, Ocean Fish, Fighters & Pickups
    this.initInstancedBotPool();
    this.spawnVehiclesAndHorses();
    this.spawnOceanFishAndWildlife();
    this.setupMatchEntities();
    this.applyLiveGameConfig(this.liveConfig);
    this.bindEvents();

    soundEngine.unlock();
    soundEngine.startMusic('battle');

    this.lastFrameMs = performance.now();
    this.loop();
  }

  private initInstancedBotPool(): void {
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.18 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.1 });
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x090d16, transparent: true, opacity: 0.85, depthWrite: false });
    const hpFillMat = new THREE.MeshBasicMaterial({ color: 0xef4444, depthWrite: false });

    const makeInst = (geo: THREE.BufferGeometry, mat: THREE.Material, colored: boolean) => {
      const m = new THREE.InstancedMesh(geo, mat, INSTANCED_BOT_CAP);
      m.count = 0;
      m.frustumCulled = false;
      if (colored) {
        m.setColorAt(0, _instColor.setHex(0xffffff));
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      this.scene.add(m);
      return m;
    };

    this.instHead = makeInst(new THREE.BoxGeometry(0.84, 0.8, 0.82), bodyMat, true);
    this.instTorso = makeInst(new THREE.BoxGeometry(0.76, 0.72, 0.54), bodyMat, true);
    this.instArmL = makeInst(new THREE.BoxGeometry(0.22, 0.54, 0.22), bodyMat, true);
    this.instArmR = makeInst(new THREE.BoxGeometry(0.22, 0.54, 0.22), bodyMat, true);
    this.instLegL = makeInst(new THREE.BoxGeometry(0.26, 0.44, 0.28), legMat, false);
    this.instLegR = makeInst(new THREE.BoxGeometry(0.26, 0.44, 0.28), legMat, false);
    this.instHpBg = makeInst(new THREE.PlaneGeometry(1.52, 0.2), hpBgMat, false);
    this.instHpFill = makeInst(new THREE.PlaneGeometry(1.46, 0.14), hpFillMat, true);
  }

  private spawnVehiclesAndHorses(): void {
    this.arena.vehicleSpawnPoints.forEach((vp, i) => {
      const v = createVehicleEntity(`veh_${i}`, vp.kind, vp.x, vp.y, vp.z, vp.yaw, i);
      this.scene.add(v.root);
      this.mounts.set(v.id, v);
    });

    // Spawn Coastal Fleet: Speedboats, Fishing Boats, Jet Skis, Pirate Boats & Naval Battleships
    this.arena.boatSpawnPoints.forEach((bp, i) => {
      const b = createBoatEntity(`boat_${i}`, bp.kind, bp.x, bp.y, bp.z, bp.yaw, i);
      this.scene.add(b.root);
      this.mounts.set(b.id, b);
    });

    // Spawn Rideable Marine Creatures: Sharks, Whales & Giant Sailfish
    this.arena.marineMountSpawns.forEach((mp, i) => {
      const mm = createMarineMountEntity(`marine_${i}`, mp.kind, mp.x, WATER_LEVEL, mp.z, mp.yaw);
      this.scene.add(mm.root);
      this.mounts.set(mm.id, mm);
    });

    // Spawn 7 Rideable Horses across Main Island & Outer Tribal Island meadows
    const horseSpots: Array<[number, number, number]> = [
      [34, 84, 0.4],
      [-52, 92, 1.7],
      [88, -38, 2.5],
      [-88, 36, -0.8],
      [124, 92, 2.1],
      [-122, -72, 0.9],
      [TRIBAL_ISLAND_CENTER.x - 160, TRIBAL_ISLAND_CENTER.z + 18, 0.4],
    ];
    horseSpots.forEach(([hx, hz, hyaw], i) => {
      const hy = Math.max(0.1, this.arena.getGroundHeightAt(hx, hz));
      const h = createHorseEntity(`horse_${i}`, hx, hy, hz, hyaw, i);
      this.scene.add(h.root);
      this.mounts.set(h.id, h);
    });

    // Spawn 7 Giant Rideable Flying Birds across cliffs, beaches, harbor overlooks, Volcano Peak & Sky/Snowy peaks
    const isSnowOrSky = this.config.arenaId === 'snowy' || this.config.arenaId === 'sky_island';
    const birdSpots: Array<{ kind: 'golden_eagle' | 'pterodactyl' | 'sky_griffin'; x: number; z: number; yaw: number; extraLift: number }> = [
      { kind: isSnowOrSky ? 'sky_griffin' : 'golden_eagle', x: 24, z: -38, yaw: 0.6, extraLift: 1.1 },
      { kind: 'golden_eagle', x: 162, z: 54, yaw: -1.1, extraLift: 1.4 },
      { kind: 'sky_griffin', x: -158, z: -44, yaw: 1.3, extraLift: 1.4 },
      { kind: isSnowOrSky ? 'sky_griffin' : 'golden_eagle', x: -18, z: -206, yaw: 0.2, extraLift: 1.6 },
      { kind: 'pterodactyl', x: TRIBAL_ISLAND_CENTER.x - 165, z: TRIBAL_ISLAND_CENTER.z - 26, yaw: 1.5, extraLift: 1.4 },
      { kind: 'pterodactyl', x: VOLCANO_CENTER.x - 24, z: VOLCANO_CENTER.z + 18, yaw: -0.9, extraLift: 1.5 },
      { kind: 'sky_griffin', x: TRIBAL_ISLAND_CENTER.x + 26, z: TRIBAL_ISLAND_CENTER.z + 128, yaw: 2.6, extraLift: 1.4 },
    ];
    birdSpots.forEach((bp, i) => {
      const baseSurface = Math.max(
        WATER_LEVEL + 0.9,
        this.getWalkableSurfaceY(bp.x, 36, bp.z, 1.35)
      );
      const by = baseSurface + bp.extraLift;
      const bird = createFlyingBirdMountEntity(`bird_mount_${i}`, bp.kind, bp.x, by, bp.z, bp.yaw);
      this.scene.add(bird.root);
      this.mounts.set(bird.id, bird);
    });

    // Spawn Rideable Land Animals: Jungle Gorillas (850 HP), Armored Rhinos (1,100 HP) & Swift Cheetahs (650 HP)
    const landAnimalSpots: Array<{ kind: 'gorilla' | 'rhino' | 'cheetah'; x: number; z: number; yaw: number }> = [
      { kind: 'gorilla', x: 78, z: 118, yaw: 2.4 },
      { kind: 'gorilla', x: -116, z: 92, yaw: 0.8 },
      { kind: 'gorilla', x: TRIBAL_ISLAND_CENTER.x - 114, z: TRIBAL_ISLAND_CENTER.z + 74, yaw: -0.6 },
      { kind: 'rhino', x: -102, z: -108, yaw: 0.5 },
      { kind: 'rhino', x: 114, z: -92, yaw: -2.2 },
      { kind: 'rhino', x: TRIBAL_ISLAND_CENTER.x + 114, z: TRIBAL_ISLAND_CENTER.z - 12, yaw: 1.7 },
      { kind: 'cheetah', x: 136, z: 14, yaw: -1.4 },
      { kind: 'cheetah', x: -134, z: 24, yaw: 1.2 },
      { kind: 'cheetah', x: TRIBAL_ISLAND_CENTER.x - 142, z: TRIBAL_ISLAND_CENTER.z - 72, yaw: 0.3 },
    ];
    landAnimalSpots.forEach((ap, i) => {
      const ay = Math.max(0.1, this.arena.getGroundHeightAt(ap.x, ap.z));
      const animal = createLandAnimalMountEntity(`land_mount_${i}`, ap.kind, ap.x, ay, ap.z, ap.yaw);
      this.scene.add(animal.root);
      this.mounts.set(animal.id, animal);
    });
  }

  private spawnOceanFishAndWildlife(): void {
    for (let i = 0; i < 42; i++) {
      const fish = createOceanFish(i);
      fish.orbitRadius += (i % 3) * 28;
      this.scene.add(fish.root);
      this.oceanFish.push(fish);
    }

    // Instanced Tropical Reef & Sea Cave Fish School (160 animated fish in 1 draw call)
    this.instancedFishSchool = createInstancedFishSchool(160);
    this.scene.add(this.instancedFishSchool.mesh);

    // 4 Glowing Mermaids (Jalpari) swimming near Sea Caves & Coral Reefs
    SEA_CAVES.forEach((cave, idx) => {
      const mermaid = createMermaidEntity(idx, cave.x, cave.z);
      this.scene.add(mermaid.root);
      this.mermaids.push(mermaid);
    });

    // Freshwater Pond Life across all 5 Inland Ponds (Koi, Frogs, Ducks, Shore Crabs)
    let pondIdx = 0;
    for (const pond of this.arena.ponds) {
      for (const k of ['koi', 'koi', 'frog', 'frog', 'duck', 'crab'] as const) {
        const pc = createPondCreatureEntity(k, pond, pondIdx++);
        this.scene.add(pc.root);
        this.pondCreatures.push(pc);
      }
    }

    // Coastal Seagulls
    for (let i = 0; i < 14; i++) {
      const bird = createWildAnimal('bird', i);
      this.scene.add(bird.root);
      this.wildAnimals.push(bird);
    }

    // 10-Species Dynamic Land Wildlife + Tribal Villagers
    const spawns: Array<{ species: WildSpecies; x: number; z: number; center: { x: number; z: number; maxRadius: number } }> = [
      // Main Island & Pond Regions
      { species: 'deer', x: 58, z: 48, center: { x: 0, z: 0, maxRadius: 155 } },
      { species: 'deer', x: -64, z: -38, center: { x: 0, z: 0, maxRadius: 155 } },
      { species: 'deer', x: 26, z: -116, center: { x: 0, z: 0, maxRadius: 155 } },
      { species: 'zebra', x: -112, z: 62, center: { x: -80, z: 50, maxRadius: 95 } },
      { species: 'zebra', x: 118, z: -64, center: { x: 95, z: -55, maxRadius: 95 } },
      { species: 'zebra', x: -24, z: 128, center: { x: 0, z: 110, maxRadius: 80 } },
      { species: 'tortoise', x: 88, z: 74, center: { x: 72, z: 72, maxRadius: 28 } },
      { species: 'tortoise', x: -88, z: -74, center: { x: -72, z: -72, maxRadius: 28 } },
      { species: 'tortoise', x: 148, z: 96, center: { x: 135, z: 85, maxRadius: 38 } },
      { species: 'crocodile', x: 58, z: 74, center: { x: 72, z: 72, maxRadius: 24 } },
      { species: 'crocodile', x: -60, z: 66, center: { x: -74, z: 66, maxRadius: 24 } },
      { species: 'crocodile', x: 14, z: 148, center: { x: 0, z: 148, maxRadius: 24 } },
      { species: 'lion', x: -135, z: -32, center: { x: -110, z: -25, maxRadius: 75 } },
      { species: 'lion', x: 132, z: 32, center: { x: 110, z: 25, maxRadius: 75 } },
      { species: 'tiger', x: -82, z: -118, center: { x: -70, z: -95, maxRadius: 75 } },
      { species: 'tiger', x: 84, z: 118, center: { x: 70, z: 95, maxRadius: 75 } },
      { species: 'wolf', x: -128, z: 18, center: { x: -105, z: 18, maxRadius: 75 } },
      { species: 'wolf', x: 122, z: -102, center: { x: 100, z: -90, maxRadius: 75 } },
      { species: 'bear', x: -32, z: -136, center: { x: -20, z: -115, maxRadius: 70 } },
      { species: 'boar', x: 64, z: -124, center: { x: 55, z: -105, maxRadius: 70 } },
      { species: 'boar', x: -142, z: -88, center: { x: -115, z: -75, maxRadius: 65 } },
      { species: 'mammoth', x: 108, z: 104, center: { x: 95, z: 90, maxRadius: 65 } },
      // 5x Outer Tribal & Volcanic Island Wild Jungle Ecosystem
      { species: 'cobra', x: TRIBAL_ISLAND_CENTER.x - 95, z: TRIBAL_ISLAND_CENTER.z + 45, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'cobra', x: TRIBAL_ISLAND_CENTER.x + 88, z: TRIBAL_ISLAND_CENTER.z - 88, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'viper', x: TRIBAL_ISLAND_CENTER.x - 110, z: TRIBAL_ISLAND_CENTER.z - 62, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'viper', x: TRIBAL_ISLAND_CENTER.x + 64, z: TRIBAL_ISLAND_CENTER.z + 96, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'komodo', x: TRIBAL_ISLAND_CENTER.x + 115, z: TRIBAL_ISLAND_CENTER.z + 42, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'komodo', x: TRIBAL_ISLAND_CENTER.x - 72, z: TRIBAL_ISLAND_CENTER.z - 112, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'chameleon', x: TRIBAL_ISLAND_CENTER.x - 132, z: TRIBAL_ISLAND_CENTER.z + 12, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'chameleon', x: TRIBAL_ISLAND_CENTER.x + 28, z: TRIBAL_ISLAND_CENTER.z - 128, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'scorpion', x: TRIBAL_ISLAND_CENTER.x + 128, z: TRIBAL_ISLAND_CENTER.z - 22, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'scorpion', x: TRIBAL_ISLAND_CENTER.x - 62, z: TRIBAL_ISLAND_CENTER.z + 118, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'crocodile', x: TRIBAL_SWAMP_CENTER.x - 8, z: TRIBAL_SWAMP_CENTER.z + 6, center: { x: TRIBAL_SWAMP_CENTER.x, z: TRIBAL_SWAMP_CENTER.z, maxRadius: 28 } },
      { species: 'crocodile', x: TRIBAL_SWAMP_CENTER.x + 10, z: TRIBAL_SWAMP_CENTER.z - 8, center: { x: TRIBAL_SWAMP_CENTER.x, z: TRIBAL_SWAMP_CENTER.z, maxRadius: 28 } },
      { species: 'mammoth', x: TRIBAL_ISLAND_CENTER.x - 125, z: TRIBAL_ISLAND_CENTER.z - 42, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'bear', x: TRIBAL_ISLAND_CENTER.x - 85, z: TRIBAL_ISLAND_CENTER.z - 95, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'lion', x: TRIBAL_ISLAND_CENTER.x + 95, z: TRIBAL_ISLAND_CENTER.z + 65, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'tiger', x: TRIBAL_ISLAND_CENTER.x + 105, z: TRIBAL_ISLAND_CENTER.z - 45, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'wolf', x: TRIBAL_ISLAND_CENTER.x - 140, z: TRIBAL_ISLAND_CENTER.z - 12, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'boar', x: TRIBAL_ISLAND_CENTER.x - 45, z: TRIBAL_ISLAND_CENTER.z + 105, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
      { species: 'deer', x: TRIBAL_ISLAND_CENTER.x - 155, z: TRIBAL_ISLAND_CENTER.z + 25, center: { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z, maxRadius: 155 } },
    ];

    spawns.forEach((sp, i) => {
      const gy = Math.max(0.1, this.arena.getGroundHeightAt(sp.x, sp.z));
      const ent = createWildEcosystemEntity(`wild_${i}`, sp.species, sp.x, gy, sp.z, this.config.arenaId, sp.center);
      this.scene.add(ent.root);
      this.wildEcosystem.push(ent);
    });

    // Hostile Tribal Warriors patrolling Central Palisade Village & Watchtowers
    this.arena.villagerCenters.forEach((vc, i) => {
      const gy = Math.max(0.8, this.arena.getGroundHeightAt(vc.x, vc.z));
      const vill = createWildEcosystemEntity(`villager_${i}`, 'villager', vc.x, gy, vc.z, this.config.arenaId, {
        x: TRIBAL_ISLAND_CENTER.x,
        z: TRIBAL_ISLAND_CENTER.z,
        maxRadius: 96,
      });
      this.scene.add(vill.root);
      this.wildEcosystem.push(vill);
    });
  }

  private setupMatchEntities(): void {
    const isBR = this.config.mode === 'battle_royale';
    this.timeRemaining =
      this.config.mode === 'practice'
        ? 300
        : isBR
          ? 360
          : this.config.mode === 'survival'
            ? 240
            : this.config.mode === 'tournament'
              ? 90
              : 160;

    const lvStats = getLevelBonusStats(this.config.playerLevel);
    const localMaxHp = Math.round(
      this.liveConfig.playerMaxHp + Math.max(0, lvStats.maxHp - DEFAULT_LIVE_GAME_CONFIG.playerMaxHp)
    );
    const isTeam = this.config.teamMode === 'team';

    if (isBR) {
      this.setupBattleRoyaleWorld();
    }

    // Spawn Local Player
    const sp0 = this.arena.spawnPoints[0] ?? new THREE.Vector3(0, 0.2, 14);
    const localGunDef = getGunDef(this.config.gunId);
    const localActor = this.createActor({
      id: this.config.localNetworkId || 'local_player',
      name: this.config.playerName || 'Player',
      playerTag: this.config.playerTag,
      level: this.config.playerLevel,
      team: isTeam ? this.config.playerTeam : undefined,
      isLocal: true,
      isBot: false,
      customization: this.config.customization,
      gunId: this.config.gunId,
      knifeId: this.config.knifeId,
      grenadeId: this.config.grenadeId || 'frag_grenade',
      parachuteId: this.config.parachuteId || 'classic_white',
      brState: isBR ? 'plane' : 'ground',
      x: isBR ? this.brPlaneStart.x : sp0.x,
      y: isBR ? this.brPlaneStart.y - 1.5 : sp0.y,
      z: isBR ? this.brPlaneStart.z : sp0.z,
      maxHp: localMaxHp,
      maxHearts: isBR ? 1 : 3,
      ammoInMag: localGunDef.magSize,
      reserveAmmo: localGunDef.reserveMax,
      grenadeCount: this.config.grenadeId ? 3 : 2,
    });
    this.actors.set(localActor.id, localActor);

    // Spawn Fighters: Configurable up to 50 in Battle Royale (1 human + up to 49 bots), 10 to 16 in Arena Modes
    if (this.config.mode !== 'multiplayer') {
      const targetTotal = isBR
        ? 1 + Math.max(2, Math.min(49, this.liveConfig.lobbyBotCount || 49))
        : Math.max(10, Math.min(16, this.config.fighterCount || lvStats.maxMatchFighters));
      const botCount = isBR
        ? Math.max(2, Math.min(49, this.liveConfig.lobbyBotCount || 49))
        : this.config.mode === 'practice'
          ? 9
          : this.config.mode === 'survival'
            ? 10
            : this.config.mode === 'tournament'
              ? 9
              : targetTotal - 1;

      const parachuteIds: ParachuteId[] = ['classic_white', 'tiger_camo', 'galaxy_neon', 'phoenix_flame'];
      for (let i = 0; i < botCount; i++) {
        const sp = this.arena.spawnPoints[(i + 1) % this.arena.spawnPoints.length];
        const preset = SKIN_CATALOG[(i + 1) % SKIN_CATALOG.length];
        const botGun = ALL_GUNS[(i + 1) % ALL_GUNS.length];
        const botKnife = ALL_KNIVES[i % ALL_KNIVES.length];
        const botTeam: TeamChoice | undefined = isTeam
          ? i % 2 === 0
            ? this.config.playerTeam === 'blue'
              ? 'red'
              : 'blue'
            : this.config.playerTeam
          : undefined;

        const bot = this.createActor({
          id: `bot_${i}`,
          name: BOT_NAMES[i % BOT_NAMES.length],
          playerTag: `${1100 + i * 137}`,
          level: Math.max(1, Math.min(12, this.config.playerLevel + (i % 3) - 1)),
          team: botTeam,
          isLocal: false,
          isBot: true,
          customization: {
            characterId: preset.id,
            primaryColor:
              botTeam === 'blue' ? '#2563eb' : botTeam === 'red' ? '#dc2626' : preset.primaryColor,
            secondaryColor: preset.secondaryColor,
            visorColor: preset.visorColor,
            headgear: preset.defaultHeadgear,
          },
          gunId: isBR ? 'basic_pistol' : botGun,
          knifeId: botKnife,
          grenadeId: 'frag_grenade',
          parachuteId: parachuteIds[i % parachuteIds.length],
          brState: isBR ? 'plane' : 'ground',
          x: isBR ? this.brPlaneStart.x : sp.x,
          y: isBR ? this.brPlaneStart.y - 1.5 : sp.y,
          z: isBR ? this.brPlaneStart.z : sp.z,
          maxHp: this.liveConfig.enemyBotHp,
          maxHearts: isBR ? 1 : 3,
          ammoInMag: getGunDef(isBR ? 'basic_pistol' : botGun).magSize,
          reserveAmmo: isBR ? 90 : 999,
          grenadeCount: isBR ? 1 : 2,
          castShadow: false,
        });
        bot.botJumpPlaneT = 0.14 + (i / Math.max(1, botCount)) * 0.7 + (Math.random() - 0.5) * 0.06;
        bot.botAiTimer = (i % 9) * (0.15 / 9);
        this.actors.set(bot.id, bot);
      }
    }

    // Spawn Airport Police Officers (85 HP) & Army Soldiers (100 HP) across Watchtowers, Terminal, Hangars, Bunker & Police Station
    this.arena.guardSpawns.forEach((gs, gi) => {
      const isPolice = gs.role === 'police';
      const gGunDef = getGunDef(gs.gunId);
      const guard = this.createActor({
        id: `guard_${gi}`,
        name: isPolice ? `Police Guard ${gi + 1}` : `Army Trooper ${gi + 1}`,
        playerTag: isPolice ? 'PD' : 'ARMY',
        level: isPolice ? 4 : 6,
        team: undefined,
        isLocal: false,
        isBot: true,
        customization: {
          characterId: isPolice ? 'cyber_knight' : 'jungle_ranger',
          primaryColor: isPolice ? '#1e3a8a' : '#3f6212',
          secondaryColor: isPolice ? '#0f172a' : '#1a2e05',
          visorColor: isPolice ? '#38bdf8' : '#facc15',
          headgear: isPolice ? 'crown' : 'visor_cap',
        },
        gunId: gs.gunId,
        knifeId: 'basic_knife',
        grenadeId: 'frag_grenade',
        brState: 'ground',
        x: gs.x,
        y: gs.y,
        z: gs.z,
        maxHp: isPolice ? 85 : 100,
        maxHearts: 1,
        ammoInMag: gGunDef.magSize,
        reserveAmmo: 999,
        grenadeCount: 1,
        castShadow: false,
      });
      guard.yaw = gs.yaw;
      guard.guardRole = gs.role;
      guard.guardHomeX = gs.x;
      guard.guardHomeY = gs.y;
      guard.guardHomeZ = gs.z;
      guard.guardOnWatchtower = gs.onWatchtower;
      guard.botAiTimer = (gi % 6) * 0.05;
      this.actors.set(guard.id, guard);
    });

    // Spawn Pickups across Island & Rooftops (Battle Royale spawns Medkits, Armor, Repair Kits & Guns!)
    if (isBR) {
      const brKinds: PickupKind[] = [
        'medkit',
        'armor1',
        'ammo',
        'repair',
        'armor2',
        'grenade',
        'medkit',
        'armor3',
        'power',
        'coin',
      ];
      this.arena.pickupSpawnPoints.forEach((pt, idx) => {
        const kind = brKinds[idx % brKinds.length];
        const gunUp: GunId | undefined =
          kind === 'power'
            ? (['mini_smg', 'assault_rifle', 'combat_shotgun', 'sniper'] as GunId[])[idx % 4]
            : undefined;
        this.spawnPickup(`pk_${idx}`, kind, pt.x, pt.y, pt.z, gunUp);
      });
      this.showAnnouncement('BATTLE ROYALE · PRESS [SPACE] TO JUMP FROM AIRPLANE!', 4.0);
    } else {
      const pickupKinds: PickupKind[] = ['coin', 'heart', 'ammo', 'grenade', 'speed', 'power'];
      this.arena.pickupSpawnPoints.forEach((pt, idx) => {
        const kind = pickupKinds[idx % pickupKinds.length];
        this.spawnPickup(`pk_${idx}`, kind, pt.x, pt.y, pt.z);
      });

      this.showAnnouncement(
        isTeam
          ? `TEAM BATTLE · ${this.config.playerTeam.toUpperCase()} SQUAD — 3 HEARTS!`
          : `${getArenaDef(this.config.arenaId).name.toUpperCase()} — 3 HEARTS SURVIVAL!`,
        3.5
      );
    }

    // Spawn Tactical Loot Crates on Pirate Boat & Naval Battleship Decks
    let shipLootIdx = 0;
    for (const mount of this.mounts.values()) {
      if (mount.kind === 'pirate_boat') {
        const fore = boatLocalToWorld(0, 1.48, 4.4, mount);
        this.spawnPickup(
          `ship_pk_${shipLootIdx++}`,
          isBR ? 'medkit' : 'ammo',
          fore.x,
          fore.y,
          fore.z
        );
      } else if (mount.kind === 'battleship') {
        const fore = boatLocalToWorld(0, 2.25, 5.4, mount);
        const bridge = boatLocalToWorld(0, 4.92, -2.5, mount);
        this.spawnPickup(
          `ship_pk_${shipLootIdx++}`,
          isBR ? 'armor2' : 'power',
          fore.x,
          fore.y,
          fore.z
        );
        this.spawnPickup(
          `ship_pk_${shipLootIdx++}`,
          'power',
          bridge.x,
          bridge.y,
          bridge.z,
          isBR ? 'sniper' : undefined
        );
      }
    }

    // Spawn 10 Glowing Golden Conch Collectibles along the sandy coves
    this.arena.conchSpawnPoints.forEach((pt, idx) => {
      this.spawnPickup(`conch_${idx}`, 'conch', pt.x, pt.y, pt.z);
    });

    // Spawn Beach Seashells (+5 Coins), Starfish (+5 Coins) & Underwater Sea Cave Pearls (+10 Coins + 25 HP)
    this.arena.shellSpawnPoints.forEach((sp, idx) => {
      this.spawnPickup(`exp_shell_${idx}`, sp.kind, sp.x, sp.y, sp.z);
    });

    // Spawn Active Volcano Rim Supply Crates
    this.spawnPickup('volcano_crate_0', 'volcano_crate', VOLCANO_CENTER.x - 11.5, 26.8, VOLCANO_CENTER.z, isBR ? 'sniper' : undefined);
    this.spawnPickup('volcano_crate_1', 'volcano_crate', VOLCANO_CENTER.x + 11.0, 26.8, VOLCANO_CENTER.z + 2, isBR ? 'laser_blaster' : undefined);
  }

  private setupBattleRoyaleWorld(): void {
    const theta = Math.random() * Math.PI * 2;
    const dist = 480;
    this.brPlaneStart.set(160 - Math.cos(theta) * dist, 96, -35 - Math.sin(theta) * dist);
    this.brPlaneEnd.set(160 + Math.cos(theta) * dist, 96, -35 + Math.sin(theta) * dist);
    this.brPlanePos.copy(this.brPlaneStart);
    this.brPlaneProgress = 0;

    this.brPlaneHandle = createAirplaneModel(this.config.airplaneId || 'cargo_carrier');
    this.brPlaneHandle.group.position.copy(this.brPlanePos);
    const flightYaw = Math.atan2(
      this.brPlaneEnd.x - this.brPlaneStart.x,
      this.brPlaneEnd.z - this.brPlaneStart.z
    );
    this.brPlaneHandle.group.rotation.y = flightYaw;
    this.scene.add(this.brPlaneHandle.group);

    // Align initial camera behind airplane
    this.camYaw = flightYaw + Math.PI;
    this.camPitch = 0.24;

    // Shrinking Safe Zone 3D Energy Storm Cylinder & Ground Ring covering Main Island, Titanic Bay & 5x Tribal Island
    this.brZoneStage = 1;
    this.brZonePhase = 'hold';
    this.brZoneTimer = 42;
    this.brZoneStageDuration = 42;
    this.brZoneCenterX = 160;
    this.brZoneCenterZ = -35;
    this.brZoneRadius = 460;
    this.brStartZoneCenterX = 160;
    this.brStartZoneCenterZ = -35;
    this.brStartZoneRadius = 460;
    this.pickNextZoneTarget(285);

    const wallGeo = new THREE.CylinderGeometry(1, 1, 130, 48, 1, true);
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.brZoneWall = new THREE.Mesh(wallGeo, wallMat);
    this.brZoneWall.position.set(this.brZoneCenterX, 32, this.brZoneCenterZ);
    this.brZoneWall.scale.set(this.brZoneRadius, 1, this.brZoneRadius);
    this.scene.add(this.brZoneWall);

    const ringGeo = new THREE.RingGeometry(0.985, 1.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.brZoneGroundRing = new THREE.Mesh(ringGeo, ringMat);
    this.brZoneGroundRing.rotation.x = -Math.PI / 2;
    this.brZoneGroundRing.position.set(this.brZoneCenterX, 0.35, this.brZoneCenterZ);
    this.brZoneGroundRing.scale.set(this.brZoneRadius, this.brZoneRadius, 1);
    this.scene.add(this.brZoneGroundRing);

    this.brAirdropTimer = 45;
  }

  private pickNextZoneTarget(nextRadius: number): void {
    // Allow dynamic safe zones to pull toward Main Island, Titanic Bay, or 5x Tribal & Volcanic Island
    if (this.brZoneStage === 1) {
      const anchors = [
        { x: 0, z: 0 },
        { x: 0, z: -220 }, // Titanic Harbor & North Beaches
        { x: TRIBAL_ISLAND_CENTER.x, z: TRIBAL_ISLAND_CENTER.z }, // 5x Tribal & Volcanic Island
        { x: AIRPORT_ISLAND_CENTER.x, z: AIRPORT_ISLAND_CENTER.z }, // Airport & Military Island
        { x: 140, z: 30 },
      ];
      const pick = anchors[Math.floor(Math.random() * anchors.length)];
      this.brNextZoneCenterX = pick.x + (Math.random() - 0.5) * 40;
      this.brNextZoneCenterZ = pick.z + (Math.random() - 0.5) * 40;
      this.brNextZoneRadius = nextRadius;
      return;
    }
    const maxShift = Math.max(0, Math.min(135, this.brZoneRadius - nextRadius));
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * maxShift * 0.65;
    this.brNextZoneCenterX = Math.max(-560, Math.min(620, this.brZoneCenterX + Math.cos(a) * r));
    this.brNextZoneCenterZ = Math.max(-260, Math.min(190, this.brZoneCenterZ + Math.sin(a) * r));
    this.brNextZoneRadius = nextRadius;
  }

  private createActor(opts: {
    id: string;
    name: string;
    playerTag?: string;
    level: number;
    team?: TeamChoice;
    isLocal: boolean;
    isBot: boolean;
    customization: CharacterCustomization;
    gunId: GunId;
    knifeId: KnifeId;
    grenadeId: GrenadeId | null;
    parachuteId?: ParachuteId;
    brState?: 'plane' | 'freefall' | 'parachute' | 'ground';
    x: number;
    y: number;
    z: number;
    maxHp: number;
    maxHearts?: number;
    ammoInMag: number;
    reserveAmmo: number;
    grenadeCount: number;
    castShadow?: boolean;
  }): ActorEntity {
    const rig = createBlockCharacterRig(
      opts.customization,
      opts.castShadow ?? !opts.isBot,
      opts.gunId,
      opts.knifeId,
      opts.grenadeId
    );
    rig.root.position.set(opts.x, opts.y, opts.z);
    rig.setNameplate(opts.name, opts.playerTag, opts.level, opts.team);
    if (opts.isLocal) {
      rig.nameplateSprite.visible = false;
    }
    this.scene.add(rig.root);

    const mh = opts.maxHearts ?? 3;
    return {
      ...opts,
      activeSlot: 'gun',
      rig,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      grounded: opts.brState === 'ground' || !opts.brState,
      isSwimming: false,
      isUnderwater: false,
      diveDepthOffset: 0,
      isCrouching: false,
      isSitting: false,
      sittingBenchId: null,
      sittingHealAccum: 0,
      jumpsLeft: 2,
      hp: opts.maxHp,
      hearts: mh,
      maxHearts: mh,
      stamina: 100,
      score: 0,
      kos: 0,
      deaths: 0,
      coinsInMatch: 0,
      alive: true,
      respawnTimer: 0,
      invulnTimer: opts.brState && opts.brState !== 'ground' ? 0.4 : 1.5,
      dashCooldown: 0,
      dashTime: 0,
      fireCooldown: 0,
      knifeCooldown: 0,
      isReloading: false,
      reloadTimer: 0,
      grenadeCooldown: 0,
      attackTimer: 0,
      activeAnimOverride: null,
      hitFlash: 0,
      blindTimer: 0,
      speedBoostTimer: 0,
      powerBoostTimer: 0,
      mountedId: null,
      anim: 'idle',
      lastDamageBy: null,
      lastDamageTime: 0,
      botTargetId: null,
      botDecisionTimer: 0.2,
      botAiTimer: 0,
      botDriveThrottle: 0,
      botDriveSteer: 0,
      botStrafeDir: Math.random() > 0.5 ? 1 : -1,
      botJumpTimer: 1 + Math.random() * 2,
      botWantMountTimer: 2 + Math.random() * 4,
      splashAccum: 0,
      brState: opts.brState ?? 'ground',
      parachuteId: opts.parachuteId ?? 'classic_white',
      parachuteHandle: null,
      armorHp: 0,
      armorMaxHp: 0,
      armorLevel: 0,
      knockedDown: false,
      bleedoutTimer: 0,
      reviveProgress: 0,
      botJumpPlaneT: 0.45,
      fruitSpeedBoostTimer: 0,
    };
  }

  private spawnPickup(
    id: string,
    kind: PickupKind,
    x: number,
    y: number,
    z: number,
    gunUpgrade?: GunId
  ): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const colorMap: Record<PickupKind, number> = {
      coin: 0xfacc15,
      heart: 0xf43f5e,
      speed: 0x22d3ee,
      power: 0xf97316,
      ammo: 0x38bdf8,
      grenade: 0x22c55e,
      medkit: 0x10b981,
      repair: 0xf59e0b,
      armor1: 0x60a5fa,
      armor2: 0x06b6d4,
      armor3: 0xfacc15,
      airdrop: 0xfbbf24,
      conch: 0xf59e0b,
      shell: 0xfda4af,
      starfish: 0xfb923c,
      pearl: 0x67e8f9,
      meat: 0xef4444,
      volcano_crate: 0xff5500,
    };

    if (kind === 'conch') {
      const shellMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.72,
        roughness: 0.22,
        metalness: 0.85,
      });
      const pearlMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfde047,
        emissiveIntensity: 0.85,
        roughness: 0.15,
      });
      const spiral = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.92, 7), shellMat);
      spiral.rotation.z = 0.78;
      spiral.rotation.x = 0.28;
      spiral.position.y = 0.16;
      const whorl = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.12, 6, 10), pearlMat);
      whorl.rotation.x = Math.PI / 2;
      whorl.position.set(-0.1, 0.08, 0);
      g.add(spiral, whorl);
    } else if (kind === 'shell' || kind === 'starfish') {
      const mat = new THREE.MeshStandardMaterial({
        color: colorMap[kind],
        emissive: colorMap[kind],
        emissiveIntensity: 0.45,
        roughness: 0.3,
      });
      if (kind === 'shell') {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.22, 0.24, 7), mat);
        fan.rotation.x = 0.35;
        g.add(fan);
      } else {
        const armA = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.22), mat);
        const armB = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.95), mat);
        armB.rotation.y = 0.4;
        g.add(armA, armB);
      }
    } else if (kind === 'pearl') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.95,
        roughness: 0.12,
        metalness: 0.4,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), mat);
      orb.position.y = 0.12;
      g.add(orb);
    } else if (kind === 'meat') {
      const meatMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d, emissiveIntensity: 0.35 });
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7 });
      const roast = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.44, 0.45), meatMat);
      const bone = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.16), boneMat);
      bone.position.x = 0.42;
      g.add(roast, bone);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: colorMap[kind],
        emissive: colorMap[kind],
        emissiveIntensity: kind === 'volcano_crate' ? 0.85 : 0.65,
        roughness: 0.25,
        metalness: 0.5,
      });
      const geo =
        kind === 'coin'
          ? new THREE.CylinderGeometry(0.55, 0.55, 0.16, 12)
          : kind === 'armor1' || kind === 'armor2' || kind === 'armor3'
            ? new THREE.BoxGeometry(0.85, 0.9, 0.45)
            : kind === 'medkit' || kind === 'volcano_crate'
              ? new THREE.BoxGeometry(0.92, 0.68, 0.68)
              : new THREE.BoxGeometry(0.72, 0.72, 0.72);
      const mesh = new THREE.Mesh(geo, mat);
      if (kind === 'coin') mesh.rotation.x = Math.PI / 2;
      g.add(mesh);

      if (kind === 'medkit') {
        const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.68), crossMat);
        const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.68), crossMat);
        g.add(crossA, crossB);
      }
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(kind === 'conch' || kind === 'pearl' ? 0.75 : 0.65, kind === 'conch' || kind === 'pearl' ? 1.05 : 0.88, 16),
      new THREE.MeshBasicMaterial({
        color: colorMap[kind],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: kind === 'conch' || kind === 'pearl' ? 0.82 : 0.55,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.35;
    g.add(ring);

    this.scene.add(g);
    this.pickups.push({
      id,
      kind,
      mesh: g,
      x,
      y,
      z,
      active: true,
      respawnTimer: 0,
      baseY: y,
      gunUpgrade,
    });
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  private handleContextMenu = (e: MouseEvent) => e.preventDefault();

  private handlePointerLockChange = () => {
    const locked = document.pointerLockElement === this.renderer.domElement;
    this.isPointerLocked = locked;
    if (locked) {
      this.wasPointerLocked = true;
    } else if (this.wasPointerLocked && !this.isPaused && !this.matchEnded) {
      this.setPaused(true);
    }
  };

  public lockPointer(): void {
    if (this.isPaused || this.matchEnded || this.disposed) return;
    try {
      const promise = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    } catch {
      // Sandbox fallback uses drag-look
    }
  }

  public unlockPointer(): void {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore
    }
    this.wasPointerLocked = false;
    this.isPointerLocked = false;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disposed || this.pauseShortcutsBlocked) return;
    const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      return;
    }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
      e.preventDefault();
    }
    this.keys.add(e.code);

    if (e.code === 'Escape') {
      if (!this.matchEnded) {
        this.setPaused(!this.isPaused);
      }
      return;
    }

    if (this.isPaused || this.matchEnded) return;
    const local = this.getLocalActor();
    if (!local) return;

    if (this.tribalCapturePhase === 'struggle') {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyJ') {
        this.advanceRopeStruggle(local);
      }
      return;
    }
    if (this.tribalCapturePhase === 'suspended') {
      return;
    }

    if (e.code === 'Digit1') this.switchWeaponSlot(local, 'gun');
    else if (e.code === 'Digit2') this.switchWeaponSlot(local, 'knife');
    else if (e.code === 'Digit3') this.switchWeaponSlot(local, 'grenade');
    else if (e.code === 'KeyQ') {
      this.switchWeaponSlot(local, local.activeSlot === 'gun' ? 'knife' : 'gun');
    } else if (e.code === 'KeyR') {
      this.startReload(local);
    } else if (e.code === 'KeyG') {
      this.throwGrenade(local);
    } else if (e.code === 'KeyE') {
      if (
        !this.tryOpenMissileConsole(local) &&
        !this.tryReplaceWithDroppedWeapon(local) &&
        !this.tryToggleNearestDoor(local) &&
        !this.tryConsumeNearestFruit(local)
      ) {
        this.tryToggleSitBench(local);
      }
    } else if (e.code === 'KeyB') {
      this.onEmoteWheelToggle?.();
    } else if (e.code === 'KeyF') {
      this.tryToggleMount(local);
    } else if (e.code === 'KeyV') {
      this.cycleCameraView();
    } else if (e.code === 'BracketLeft') {
      this.camZoom = Math.max(6.5, this.camZoom - 1.5);
    } else if (e.code === 'BracketRight') {
      this.camZoom = Math.min(20, this.camZoom + 1.5);
    } else if (e.code === 'KeyJ') {
      this.performPrimaryAttack(local);
    } else if (e.code === 'KeyK') {
      this.performKnifeSlash(local);
    } else if (e.code === 'Space') {
      this.tryJump(local);
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.tryDash(local);
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      this.toggleCrouch(local);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.isPaused || this.matchEnded || this.tribalCapturePhase !== 'none') return;
    const local = this.getLocalActor();
    if (!local) return;
    if (Math.abs(e.deltaY) > 4) {
      this.switchWeaponSlot(local, local.activeSlot === 'gun' ? 'knife' : 'gun');
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.isPaused || this.matchEnded) return;
    soundEngine.unlock();
    if (this.tribalCapturePhase === 'struggle') {
      const local = this.getLocalActor();
      if (local && e.button === 0) {
        this.advanceRopeStruggle(local);
      }
      return;
    }
    if (this.tribalCapturePhase === 'suspended') return;
    if (e.button === 0) {
      if (!this.isPointerLocked) {
        this.lockPointer();
      }
      this.fireHeldMouse = true;
      this.isMouseDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 2) {
      this.isMouseDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPaused || this.matchEnded) return;
    const sens = 0.0024 * (this.config.settings.cameraSensitivity || 1);
    const ySign = this.config.settings.invertY ? -1 : 1;

    if (this.isPointerLocked) {
      this.camYaw -= e.movementX * sens;
      this.camPitch = this.clampPitch(this.camPitch + e.movementY * sens * ySign);
    } else if (this.isMouseDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.camYaw -= dx * sens * 1.4;
      this.camPitch = this.clampPitch(this.camPitch + dy * sens * 1.4 * ySign);
    }
  };

  private handleMouseUp = () => {
    this.fireHeldMouse = false;
    this.isMouseDragging = false;
  };

  private clampPitch(p: number): number {
    if (this.cameraView === 'first') {
      return Math.max(-1.12, Math.min(1.12, p));
    }
    return Math.max(-0.72, Math.min(0.88, p));
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public updateSettings(settings: GameSettings): void {
    this.config.settings = settings;
    soundEngine.configure(settings.musicVolume, settings.sfxVolume, settings.muted);
  }

  public setTouchInput(next: Partial<TouchInputState>): void {
    Object.assign(this.touchState, next);
  }

  public setPauseShortcutsBlocked(blocked: boolean): void {
    this.pauseShortcutsBlocked = blocked;
    if (blocked) {
      this.keys.clear();
      this.fireHeldMouse = false;
      this.isMouseDragging = false;
      this.unlockPointer();
    }
  }

  public applyLiveGameConfig(nextConfig: LiveGameConfig): void {
    const next = normalizeLiveGameConfig(nextConfig);
    this.liveConfig = next;

    // 1. Update Local Player & Bots HP cleanly
    const lvStats = getLevelBonusStats(this.config.playerLevel);
    const targetLocalMaxHp = Math.max(
      25,
      Math.round(next.playerMaxHp + Math.max(0, lvStats.maxHp - DEFAULT_LIVE_GAME_CONFIG.playerMaxHp))
    );
    for (const actor of this.actors.values()) {
      if (actor.isLocal) {
        const ratio = actor.hp / Math.max(1, actor.maxHp);
        actor.maxHp = targetLocalMaxHp;
        if (actor.alive && !actor.knockedDown) {
          actor.hp = Math.max(1, Math.min(actor.maxHp, Math.round(ratio * actor.maxHp)));
        }
      } else {
        const ratio = actor.hp / Math.max(1, actor.maxHp);
        actor.maxHp = next.enemyBotHp;
        if (actor.alive && !actor.knockedDown) {
          actor.hp = Math.max(1, Math.min(actor.maxHp, Math.round(ratio * actor.maxHp)));
        }
      }
    }

    // 2. Update Vehicle, Horse & Marine Mount HP caps (honoring vehicleHpMultiplier)
    const vMult = Math.max(0.25, next.vehicleHpMultiplier || 1);
    for (const mount of this.mounts.values()) {
      let desiredMax = mount.maxHp;
      if (mount.kind === 'buggy') {
        desiredMax =
          next.jeepHp !== DEFAULT_LIVE_GAME_CONFIG.jeepHp
            ? next.jeepHp
            : Math.round(DEFAULT_LIVE_GAME_CONFIG.jeepHp * vMult);
      } else if (mount.kind === 'car') {
        desiredMax =
          next.carHp !== DEFAULT_LIVE_GAME_CONFIG.carHp
            ? next.carHp
            : Math.round(DEFAULT_LIVE_GAME_CONFIG.carHp * vMult);
      } else if (mount.kind === 'bike') {
        desiredMax =
          next.bikeHp !== DEFAULT_LIVE_GAME_CONFIG.bikeHp
            ? next.bikeHp
            : Math.round(DEFAULT_LIVE_GAME_CONFIG.bikeHp * vMult);
      } else if (mount.kind === 'tank' || mount.kind === 'swat_tank') {
        desiredMax = Math.round(1800 * vMult);
      } else if (mount.kind === 'helicopter' || mount.kind === 'police_heli') {
        desiredMax = Math.round(1400 * vMult);
      } else if (mount.kind === 'police_car' || mount.kind === 'sedan' || mount.kind === 'truck') {
        desiredMax = Math.round(1100 * vMult);
      } else if (mount.kind === 'horse') {
        desiredMax = next.horseHp;
      } else if (mount.isMarineMount) {
        desiredMax = next.sharkWhaleHp;
      }

      if (desiredMax !== mount.maxHp) {
        const ratio = mount.hp / Math.max(1, mount.maxHp);
        mount.maxHp = desiredMax;
        mount.hp = mount.alive ? Math.max(1, Math.min(desiredMax, Math.round(ratio * desiredMax))) : 0;
        const pct = Math.max(0.01, mount.hp / Math.max(1, mount.maxHp));
        mount.hpBarFill.scale.x = pct;
        mount.hpBarFill.position.x = -(1 - pct) * 0.99;
      }
    }

    // 3. Reconcile Tribal Warrior & Wildlife stats + dynamic animal spawn counts
    const speciesKeyMap: Partial<Record<WildSpecies, keyof LiveGameConfig['animalSpawnCounts']>> = {
      lion: 'lions',
      tiger: 'tigers',
      wolf: 'wolves',
      crocodile: 'crocodiles',
      bear: 'bears',
      boar: 'boars',
      deer: 'deer',
      mammoth: 'mammoths',
      tortoise: 'tortoises',
      cobra: 'snakes',
      viper: 'snakes',
      komodo: 'snakes',
    };

    const speciesCounter: Record<string, number> = {};
    for (const w of this.wildEcosystem) {
      if (w.species === 'villager') {
        const ratio = w.hp / Math.max(1, w.maxHp);
        w.maxHp = next.tribalWarriorHp;
        w.damage = next.tribalArrowDamage;
        if (w.alive) {
          w.hp = Math.max(1, Math.min(w.maxHp, Math.round(ratio * w.maxHp)));
        }
      } else {
        const key = speciesKeyMap[w.species];
        if (key) {
          const cap = next.animalSpawnCounts[key];
          const seen = (speciesCounter[key] || 0) + 1;
          speciesCounter[key] = seen;
          const shouldExist = seen <= cap;
          w.root.visible = w.alive && shouldExist;
        }
      }
    }

    // Spawn extra predators/wildlife on demand if admin increased count above initial spawns
    const extraSpawnCheck: Array<{ key: keyof LiveGameConfig['animalSpawnCounts']; species: WildSpecies; cx: number; cz: number }> = [
      { key: 'lions', species: 'lion', cx: 110, cz: 32 },
      { key: 'tigers', species: 'tiger', cx: 70, cz: 95 },
      { key: 'wolves', species: 'wolf', cx: -105, cz: 18 },
      { key: 'crocodiles', species: 'crocodile', cx: 72, cz: 72 },
      { key: 'bears', species: 'bear', cx: -20, cz: -115 },
      { key: 'boars', species: 'boar', cx: 55, cz: -105 },
      { key: 'deer', species: 'deer', cx: 45, cz: 45 },
      { key: 'mammoths', species: 'mammoth', cx: 95, cz: 90 },
      { key: 'tortoises', species: 'tortoise', cx: 72, cz: 72 },
      { key: 'snakes', species: 'cobra', cx: TRIBAL_ISLAND_CENTER.x - 45, cz: TRIBAL_ISLAND_CENTER.z + 35 },
    ];
    for (const item of extraSpawnCheck) {
      const targetCount = next.animalSpawnCounts[item.key];
      const currentCount = speciesCounter[item.key] || 0;
      for (let k = currentCount; k < targetCount; k++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 28;
        const sx = item.cx + Math.cos(ang) * dist;
        const sz = item.cz + Math.sin(ang) * dist;
        const sy = Math.max(0.1, this.arena.getGroundHeightAt(sx, sz));
        const extra = createWildEcosystemEntity(
          `wild_admin_${item.key}_${++this.customSpawnCounter}`,
          item.species,
          sx,
          sy,
          sz,
          this.config.arenaId,
          { x: item.cx, z: item.cz, maxRadius: 85 }
        );
        this.scene.add(extra.root);
        this.wildEcosystem.push(extra);
      }
    }

    // Reconcile Mermaids & Rideable Sharks visibility/spawns
    const mermaidCap = next.animalSpawnCounts.mermaids;
    this.mermaids.forEach((mr, idx) => {
      mr.root.visible = idx < mermaidCap;
    });
    let marineCount = 0;
    for (const m of this.mounts.values()) {
      if (m.kind === 'shark_mount') {
        marineCount += 1;
        if (!m.riderId) {
          m.root.visible = m.alive && marineCount <= next.animalSpawnCounts.sharks;
        }
      }
    }
    while (marineCount < next.animalSpawnCounts.sharks) {
      marineCount += 1;
      const sx = -195 + (marineCount % 5) * 32;
      const sz = -210 + Math.floor(marineCount / 5) * 40;
      const extraShark = createMarineMountEntity(
        `marine_admin_${++this.customSpawnCounter}`,
        'shark_mount',
        sx,
        WATER_LEVEL,
        sz,
        Math.random() * Math.PI * 2
      );
      extraShark.maxHp = next.sharkWhaleHp;
      extraShark.hp = next.sharkWhaleHp;
      this.scene.add(extraShark.root);
      this.mounts.set(extraShark.id, extraShark);
    }

    // 3b. Reconcile Admin Custom Spawns (Tanks, Helicopters, Sharks, Lions)
    const localActor = this.getLocalActor();
    const baseX = localActor ? localActor.x : 0;
    const baseZ = localActor ? localActor.z : 0;
    const desiredSpawns = next.customSpawns || { tanks: 0, helicopters: 0, sharks: 0, lions: 0 };

    // Extra Tanks
    while (this.adminExtraTankIds.length > (desiredSpawns.tanks || 0)) {
      const id = this.adminExtraTankIds.pop()!;
      const m = this.mounts.get(id);
      if (m) {
        if (m.riderId) {
          const r = this.actors.get(m.riderId);
          if (r) this.dismountActor(r, false);
        }
        this.scene.remove(m.root);
        m.dispose();
        this.mounts.delete(id);
      }
    }
    while (this.adminExtraTankIds.length < (desiredSpawns.tanks || 0)) {
      const idx = this.adminExtraTankIds.length;
      const ang = (idx / Math.max(1, desiredSpawns.tanks)) * Math.PI * 2;
      const sx = baseX + Math.cos(ang) * (20 + (idx % 4) * 9);
      const sz = baseZ + Math.sin(ang) * (20 + (idx % 4) * 9);
      const sy = Math.max(WATER_LEVEL + 0.3, this.arena.getGroundHeightAt(sx, sz) + 0.2);
      const id = `admin_custom_tank_${++this.customSpawnCounter}`;
      const tank = createVehicleEntity(id, 'tank', sx, sy, sz, ang + Math.PI, idx);
      tank.maxHp = Math.round(1800 * vMult);
      tank.hp = tank.maxHp;
      this.scene.add(tank.root);
      this.mounts.set(id, tank);
      this.adminExtraTankIds.push(id);
    }

    // Extra Helicopters
    while (this.adminExtraHeliIds.length > (desiredSpawns.helicopters || 0)) {
      const id = this.adminExtraHeliIds.pop()!;
      const m = this.mounts.get(id);
      if (m) {
        if (m.riderId) {
          const r = this.actors.get(m.riderId);
          if (r) this.dismountActor(r, false);
        }
        this.scene.remove(m.root);
        m.dispose();
        this.mounts.delete(id);
      }
    }
    while (this.adminExtraHeliIds.length < (desiredSpawns.helicopters || 0)) {
      const idx = this.adminExtraHeliIds.length;
      const ang = (idx / Math.max(1, desiredSpawns.helicopters)) * Math.PI * 2 + 0.4;
      const sx = baseX + Math.cos(ang) * (26 + (idx % 3) * 11);
      const sz = baseZ + Math.sin(ang) * (26 + (idx % 3) * 11);
      const sy = Math.max(WATER_LEVEL + 0.5, this.arena.getGroundHeightAt(sx, sz) + 0.4);
      const id = `admin_custom_heli_${++this.customSpawnCounter}`;
      const heli = createVehicleEntity(id, 'helicopter', sx, sy, sz, ang, idx);
      heli.maxHp = Math.round(1400 * vMult);
      heli.hp = heli.maxHp;
      this.scene.add(heli.root);
      this.mounts.set(id, heli);
      this.adminExtraHeliIds.push(id);
    }

    // Extra Custom Sharks
    while (this.adminExtraSharkIds.length > (desiredSpawns.sharks || 0)) {
      const id = this.adminExtraSharkIds.pop()!;
      const m = this.mounts.get(id);
      if (m) {
        if (m.riderId) {
          const r = this.actors.get(m.riderId);
          if (r) this.dismountActor(r, false);
        }
        this.scene.remove(m.root);
        m.dispose();
        this.mounts.delete(id);
      }
    }
    while (this.adminExtraSharkIds.length < (desiredSpawns.sharks || 0)) {
      const idx = this.adminExtraSharkIds.length;
      const ang = (idx / Math.max(1, desiredSpawns.sharks)) * Math.PI * 2;
      const sx = -180 + Math.cos(ang) * (40 + (idx % 5) * 18);
      const sz = -170 + Math.sin(ang) * (40 + (idx % 5) * 18);
      const id = `admin_custom_shark_${++this.customSpawnCounter}`;
      const sh = createMarineMountEntity(id, 'shark_mount', sx, WATER_LEVEL, sz, ang);
      sh.maxHp = next.sharkWhaleHp;
      sh.hp = sh.maxHp;
      this.scene.add(sh.root);
      this.mounts.set(id, sh);
      this.adminExtraSharkIds.push(id);
    }

    // Extra Custom Lions
    while (this.adminExtraLionIds.length > (desiredSpawns.lions || 0)) {
      const id = this.adminExtraLionIds.pop()!;
      const idx = this.wildEcosystem.findIndex((w) => w.id === id);
      if (idx >= 0) {
        const w = this.wildEcosystem[idx];
        this.scene.remove(w.root);
        w.dispose();
        this.wildEcosystem.splice(idx, 1);
      }
    }
    while (this.adminExtraLionIds.length < (desiredSpawns.lions || 0)) {
      const idx = this.adminExtraLionIds.length;
      const ang = (idx / Math.max(1, desiredSpawns.lions)) * Math.PI * 2;
      const sx = baseX + Math.cos(ang) * (32 + (idx % 4) * 12);
      const sz = baseZ + Math.sin(ang) * (32 + (idx % 4) * 12);
      const sy = Math.max(0.1, this.arena.getGroundHeightAt(sx, sz));
      const id = `admin_custom_lion_${++this.customSpawnCounter}`;
      const lion = createWildEcosystemEntity(
        id,
        'lion',
        sx,
        sy,
        sz,
        this.config.arenaId,
        { x: sx, z: sz, maxRadius: 85 }
      );
      this.scene.add(lion.root);
      this.wildEcosystem.push(lion);
      this.adminExtraLionIds.push(id);
    }

    // 4. Time of Day Sky, Fog, Sun & Moon Lighting
    this.applyTimeOfDayLighting(next.timeOfDay);
  }

  private applyTimeOfDayLighting(tod: LiveGameConfig['timeOfDay']): void {
    let skyHex = this.baseSkyColor;
    let fogHex = this.baseFogColor;
    let fogDens = this.config.arenaId === 'city' ? 0.0019 : 0.0014;
    let sunHex = 0xfffbeb;
    let sunInt = 1.4;
    let hemiSky = 0xe0f2fe;
    let hemiGround = 0x334155;
    let hemiInt = 0.95;
    let exposure = 1.08;

    if (tod === 'sunset') {
      skyHex = 0xf97316;
      fogHex = 0xfb923c;
      fogDens = 0.0022;
      sunHex = 0xfdba74;
      sunInt = 1.35;
      hemiSky = 0xfed7aa;
      hemiGround = 0x431407;
      hemiInt = 0.85;
      exposure = 1.02;
    } else if (tod === 'night') {
      skyHex = 0x091124;
      fogHex = 0x0f172a;
      fogDens = 0.0028;
      sunHex = 0x93c5fd;
      sunInt = 0.65;
      hemiSky = 0x3b82f6;
      hemiGround = 0x0f172a;
      hemiInt = 0.62;
      exposure = 0.92;
    } else if (tod === 'blood_moon') {
      skyHex = 0x2a0710;
      fogHex = 0x450a0a;
      fogDens = 0.0026;
      sunHex = 0xf87171;
      sunInt = 0.92;
      hemiSky = 0xfca5a5;
      hemiGround = 0x1c0609;
      hemiInt = 0.68;
      exposure = 0.96;
    }

    this.baseFogColor = fogHex;
    this.baseFogDensity = fogDens;
    this.scene.background = new THREE.Color(skyHex);
    if (!this.isCameraUnderwater) {
      this.scene.fog = new THREE.FogExp2(fogHex, fogDens);
    }
    this.sunLight.color.setHex(sunHex);
    this.sunLight.intensity = sunInt;
    this.hemiLight.color.setHex(hemiSky);
    this.hemiLight.groundColor.setHex(hemiGround);
    this.hemiLight.intensity = hemiInt;
    this.renderer.toneMappingExposure = exposure;

    if (tod === 'night' || tod === 'blood_moon') {
      if (!this.moonMesh) {
        const mGeo = new THREE.SphereGeometry(22, 18, 16);
        const mMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
        this.moonMesh = new THREE.Mesh(mGeo, mMat);
        this.scene.add(this.moonMesh);
      }
      this.moonMesh.visible = true;
      (this.moonMesh.material as THREE.MeshBasicMaterial).color.setHex(
        tod === 'blood_moon' ? 0xef4444 : 0xe2e8f0
      );
    } else if (this.moonMesh) {
      this.moonMesh.visible = false;
    }
  }

  public adminHealSelf(): void {
    const local = this.getLocalActor();
    if (!local) return;
    local.alive = true;
    local.knockedDown = false;
    local.hp = local.maxHp;
    local.hearts = local.maxHearts;
    local.stamina = 100;
    local.armorLevel = 3;
    local.armorMaxHp = 115;
    local.armorHp = 115;
    soundEngine.playPowerup();
    this.showAnnouncement('ADMIN HEAL: FULL HP + LV.3 ARMOR RESTORED!', 2.2);
  }

  public adminTeleport(
    target: 'titanic' | 'sea_cave' | 'tribal_village' | 'volcano' | 'main_island'
  ): void {
    const local = this.getLocalActor();
    if (!local) return;
    if (local.brState !== 'ground') {
      this.closeParachute(local);
      local.brState = 'ground';
      local.rig.root.visible = true;
    }
    if (local.mountedId) {
      this.dismountActor(local, false);
    }
    let tx = 0;
    let tz = 14;
    let label = 'MAIN ISLAND';
    if (target === 'titanic') {
      tx = TITANIC_CENTER.x;
      tz = TITANIC_CENTER.z + 18;
      label = 'GRAND TITANIC';
    } else if (target === 'sea_cave') {
      const cave = SEA_CAVES[0];
      tx = cave ? cave.x : -180;
      tz = cave ? cave.z : -140;
      label = 'CORAL SEA CAVE';
    } else if (target === 'tribal_village') {
      tx = TRIBAL_ISLAND_CENTER.x - 16;
      tz = TRIBAL_ISLAND_CENTER.z + 18;
      label = 'TRIBAL VILLAGE';
    } else if (target === 'volcano') {
      tx = VOLCANO_CENTER.x - 18;
      tz = VOLCANO_CENTER.z + 18;
      label = 'VOLCANO PEAK';
    }
    const ty = Math.max(WATER_LEVEL + 0.5, this.arena.getGroundHeightAt(tx, tz) + 1.5);
    local.x = tx;
    local.y = ty;
    local.z = tz;
    local.vx = 0;
    local.vy = 0;
    local.vz = 0;
    soundEngine.playDash();
    this.showAnnouncement(`ADMIN TELEPORT -> ${label}`, 2.0);
  }

  public adminSpawnEntity(
    kind:
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
      | 'lion'
  ): void {
    const local = this.getLocalActor();
    if (!local) return;
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);
    const sx = local.x + fx * 6.5;
    const sz = local.z + fz * 6.5;
    const sy = Math.max(WATER_LEVEL + 0.25, this.arena.getGroundHeightAt(sx, sz) + 0.35);
    const idNum = ++this.customSpawnCounter;

    if (kind === 'buggy' || kind === 'car' || kind === 'bike') {
      const v = createVehicleEntity(`admin_veh_${idNum}`, kind, sx, sy, sz, this.camYaw, idNum);
      v.maxHp =
        kind === 'buggy'
          ? this.liveConfig.jeepHp
          : kind === 'car'
            ? this.liveConfig.carHp
            : this.liveConfig.bikeHp;
      v.hp = v.maxHp;
      this.scene.add(v.root);
      this.mounts.set(v.id, v);
      this.showAnnouncement(`SPAWNED ${v.name.toUpperCase()}`, 1.8);
    } else if (kind === 'horse') {
      const h = createHorseEntity(`admin_horse_${idNum}`, sx, sy, sz, this.camYaw, idNum);
      h.maxHp = this.liveConfig.horseHp;
      h.hp = h.maxHp;
      this.scene.add(h.root);
      this.mounts.set(h.id, h);
      this.showAnnouncement('SPAWNED RIDEABLE HORSE', 1.8);
    } else if (kind === 'shark_mount' || kind === 'turtle_mount' || kind === 'manta_mount') {
      const mm = createMarineMountEntity(`admin_marine_${idNum}`, kind, sx, WATER_LEVEL, sz, this.camYaw);
      if (kind === 'shark_mount') {
        mm.maxHp = this.liveConfig.sharkWhaleHp;
        mm.hp = mm.maxHp;
      }
      this.scene.add(mm.root);
      this.mounts.set(mm.id, mm);
      this.showAnnouncement(`SPAWNED ${mm.name.toUpperCase()}`, 1.8);
    } else if (kind === 'golden_eagle' || kind === 'pterodactyl' || kind === 'sky_griffin') {
      const birdY = Math.max(local.y + 0.6, sy + 0.8);
      const bird = createFlyingBirdMountEntity(`admin_bird_${idNum}`, kind, sx, birdY, sz, this.camYaw);
      this.scene.add(bird.root);
      this.mounts.set(bird.id, bird);
      this.showAnnouncement(`SPAWNED ${bird.name.toUpperCase()} — PRESS [F] TO FLY!`, 2.0);
    } else if (kind === 'gorilla' || kind === 'rhino' || kind === 'cheetah') {
      const animal = createLandAnimalMountEntity(`admin_animal_${idNum}`, kind, sx, sy, sz, this.camYaw);
      this.scene.add(animal.root);
      this.mounts.set(animal.id, animal);
      this.showAnnouncement(`SPAWNED ${animal.name.toUpperCase()}`, 1.8);
    } else if (kind === 'lion') {
      const lion = createWildEcosystemEntity(
        `admin_lion_${idNum}`,
        'lion',
        sx,
        sy,
        sz,
        this.config.arenaId,
        { x: sx, z: sz, maxRadius: 75 }
      );
      this.scene.add(lion.root);
      this.wildEcosystem.push(lion);
      this.showAnnouncement('SPAWNED WILD LION', 1.8);
    }
    soundEngine.playPowerup();
  }

  public cycleCameraView(): void {
    const order: CameraViewMode[] = ['close', 'far', 'first'];
    const idx = order.indexOf(this.cameraView);
    this.cameraView = order[(idx + 1) % order.length];
    const local = this.getLocalActor();
    if (local) {
      local.rig.setFirstPersonMode(this.cameraView === 'first');
    }
    this.camPitch = this.clampPitch(this.camPitch);
    soundEngine.playClick();
    const label =
      this.cameraView === 'first'
        ? '1ST PERSON EYES'
        : this.cameraView === 'close'
          ? 'CLOSE 3RD PERSON'
          : 'FAR 3RD PERSON';
    this.showAnnouncement(`CAMERA: ${label}`, 1.2);
  }

  public setPaused(paused: boolean): void {
    if (this.matchEnded) return;
    this.isPaused = paused;
    if (paused) {
      this.unlockPointer();
      soundEngine.updateEngineSound(false);
    }
    this.onPauseChange?.(paused);
    this.emitHud();
  }

  private showAnnouncement(text: string, duration = 2.4): void {
    this.announcement = text;
    this.announcementTimer = duration;
  }

  private getLocalActor(): ActorEntity | undefined {
    return this.actors.get(this.config.localNetworkId || 'local_player');
  }

  public selectWeaponSlot(slot: WeaponSlot): void {
    const local = this.getLocalActor();
    if (!local || this.isPaused || this.matchEnded) return;
    this.switchWeaponSlot(local, slot);
  }

  private switchWeaponSlot(actor: ActorEntity, slot: WeaponSlot): void {
    if (actor.activeSlot === slot) return;
    actor.activeSlot = slot;
    actor.rig.setActiveSlot(slot, actor.grenadeId || 'frag_grenade');
    if (actor.isLocal) soundEngine.playWeaponSwitch();
  }

  private toggleCrouch(actor: ActorEntity): void {
    if (actor.isSitting) {
      this.standUpFromBench(actor);
    }
    if (!actor.alive || actor.knockedDown || actor.brState !== 'ground') {
      actor.isCrouching = false;
      return;
    }
    if (actor.mountedId) {
      const m = this.mounts.get(actor.mountedId);
      if (m && m.isFlyingMount) {
        actor.isCrouching = false;
        return;
      }
      if (m && m.isMarineMount) {
        m.vy = m.vy < -1.5 ? 0 : -3.4;
        if (actor.isLocal) soundEngine.playBubbleDive();
      }
      actor.isCrouching = false;
      return;
    }
    if (actor.isSwimming) {
      actor.isCrouching = false;
      actor.diveDepthOffset = actor.diveDepthOffset < 1.5 ? 3.8 : 0;
      if (actor.isLocal) soundEngine.playBubbleDive();
      return;
    }
    actor.isCrouching = !actor.isCrouching;
    if (actor.isLocal) soundEngine.playClick();
  }

  private startReload(actor: ActorEntity): void {
    if (actor.isReloading) return;
    const gun = getGunDef(actor.gunId);
    if (actor.ammoInMag >= gun.magSize) return;
    if (actor.reserveAmmo === 0) return;
    actor.isReloading = true;
    actor.reloadTimer = gun.reloadTime;
    if (actor.isLocal) soundEngine.playReload();
  }

  private tryJump(actor: ActorEntity): void {
    if (!actor.alive || this.isPaused || actor.knockedDown) return;

    if (actor.isSitting) {
      this.standUpFromBench(actor);
      return;
    }

    if (actor.brState === 'plane') {
      this.ejectFromPlane(actor);
      return;
    }
    if (actor.brState === 'freefall') {
      this.openParachute(actor);
      return;
    }
    if (actor.brState === 'parachute') {
      return;
    }

    // Mounted flying bird climb burst, animal leap, or marine mount surface!
    if (actor.mountedId) {
      const mount = this.mounts.get(actor.mountedId);
      if (mount && mount.isFlyingMount) {
        mount.vy = Math.max(mount.vy, 11.5);
        if (actor.isLocal) soundEngine.playWingFlap(false);
      } else if (mount && mount.isMarineMount) {
        mount.vy = 0;
        if (actor.isLocal) soundEngine.playSplash();
      } else if (mount && isLandAnimalKind(mount.kind) && Math.abs(mount.vy) < 0.45) {
        mount.vy =
          mount.kind === 'gorilla'
            ? 23.8
            : mount.kind === 'horse'
              ? 18.5
              : mount.kind === 'cheetah'
                ? 16.5
                : 13.5;
        if (actor.isLocal) soundEngine.playJump(mount.kind === 'gorilla');
      }
      return;
    }

    if (actor.isSwimming) {
      if (actor.isUnderwater || actor.diveDepthOffset > 0.6) {
        actor.diveDepthOffset = Math.max(0, actor.diveDepthOffset - 2.2);
        actor.vy = 8.5;
        if (actor.isLocal) soundEngine.playBubbleDive();
      } else {
        actor.diveDepthOffset = 0;
        actor.vy = 11.5;
        actor.grounded = false;
        if (actor.isLocal) soundEngine.playSplash();
      }
      return;
    }

    if (actor.jumpsLeft > 0) {
      actor.isCrouching = false;
      const isDouble = !actor.grounded;
      const jumpScale = actor.isLocal ? this.liveConfig.jumpForce / 15.2 : 1;
      actor.vy = (isDouble ? 13.8 : 15.2) * jumpScale;
      actor.grounded = false;
      actor.jumpsLeft -= 1;
      if (actor.isLocal) soundEngine.playJump(isDouble);
    }
  }

  private tryDash(actor: ActorEntity): void {
    if (actor.isSitting) {
      this.standUpFromBench(actor);
    }
    if (
      !actor.alive ||
      actor.knockedDown ||
      actor.brState !== 'ground' ||
      actor.mountedId ||
      actor.dashCooldown > 0 ||
      actor.stamina < 25
    ) {
      return;
    }
    actor.isCrouching = false;
    actor.dashCooldown = 1.6;
    actor.dashTime = 0.22;
    actor.stamina = Math.max(0, actor.stamina - 25);
    const fx = -Math.sin(actor.yaw);
    const fz = -Math.cos(actor.yaw);
    actor.vx = fx * 30;
    actor.vz = fz * 30;
    if (actor.isLocal) soundEngine.playDash();
  }

  private ejectFromPlane(actor: ActorEntity): void {
    if (actor.brState !== 'plane') return;
    actor.brState = 'freefall';
    actor.x = this.brPlanePos.x + (Math.random() - 0.5) * 4;
    actor.y = this.brPlanePos.y - 3.0;
    actor.z = this.brPlanePos.z + (Math.random() - 0.5) * 4;
    actor.vx = (Math.random() - 0.5) * 4;
    actor.vy = -12;
    actor.vz = (Math.random() - 0.5) * 4;
    actor.invulnTimer = 0.5;
    actor.rig.root.visible = true;
    if (actor.isLocal) {
      soundEngine.playDash();
      this.showAnnouncement('SKYDIVING — PRESS [SPACE] TO OPEN PARACHUTE!', 2.5);
    }
  }

  private openParachute(actor: ActorEntity): void {
    if (actor.brState !== 'freefall') return;
    actor.brState = 'parachute';
    actor.vy = -8.5;
    if (!actor.parachuteHandle) {
      actor.parachuteHandle = createParachuteModel(actor.parachuteId);
      actor.rig.root.add(actor.parachuteHandle.group);
    }
    if (actor.isLocal) {
      soundEngine.playParachuteOpen();
      this.showAnnouncement('PARACHUTE DEPLOYED — GLIDE TO COVER & LOOT!', 2.0);
    }
  }

  private closeParachute(actor: ActorEntity): void {
    if (actor.brState === 'parachute' || actor.brState === 'freefall') {
      actor.brState = 'ground';
    }
    if (actor.parachuteHandle) {
      actor.rig.root.remove(actor.parachuteHandle.group);
      actor.parachuteHandle.dispose();
      actor.parachuteHandle = null;
    }
  }

  private isFriendly(attackerId: string, target: ActorEntity): boolean {
    if (attackerId === target.id) return true;
    const attacker = this.actors.get(attackerId);
    if (!attacker) return false;
    // Airport Police/Army guards never hurt each other
    if (attacker.guardRole && target.guardRole) return true;
    return Boolean(this.config.teamMode === 'team' && attacker.team && target.team && attacker.team === target.team);
  }

  private isMountFriendly(attackerId: string, mount: MountEntity): boolean {
    if (!mount.riderId) return false;
    const rider = this.actors.get(mount.riderId);
    if (!rider) return mount.riderId === attackerId;
    return this.isFriendly(attackerId, rider);
  }

  private isEnclosedMounted(actor: ActorEntity): MountEntity | null {
    if (!actor.mountedId) return null;
    const m = this.mounts.get(actor.mountedId);
    if (
      m &&
      m.alive &&
      (m.kind === 'car' ||
        m.kind === 'buggy' ||
        m.kind === 'sedan' ||
        m.kind === 'truck' ||
        m.kind === 'police_car' ||
        m.kind === 'tank' ||
        m.kind === 'swat_tank')
    ) {
      return m;
    }
    return null;
  }

  private isDrivenLandVehicleMount(mountId: string | null | undefined): MountEntity | null {
    if (!mountId) return null;
    const m = this.mounts.get(mountId);
    if (
      m &&
      !m.isBoat &&
      !m.isMarineMount &&
      !m.isFlyingMount &&
      !m.isLandAnimal &&
      m.kind !== 'horse'
    ) {
      return m;
    }
    return null;
  }

  private raycastObstacles(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number
  ): ObstacleHit | null {
    let bestDist = maxDist;
    let bestHit: ObstacleHit | null = null;

    const minX = Math.min(ox, ox + dx * maxDist) - 1;
    const maxX = Math.max(ox, ox + dx * maxDist) + 1;
    const minZ = Math.min(oz, oz + dz * maxDist) - 1;
    const maxZ = Math.max(oz, oz + dz * maxDist) + 1;
    const cols = this.arena.queryColliders(minX, maxX, minZ, maxZ);

    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c.kind === 'glass') continue;
      const hit = rayIntersectAABBNormal(ox, oy, oz, dx, dy, dz, bestDist, c);
      if (hit && hit.t < bestDist) {
        bestDist = hit.t;
        bestHit = {
          dist: hit.t,
          hx: ox + dx * hit.t,
          hy: oy + dy * hit.t,
          hz: oz + dz * hit.t,
          nx: hit.nx,
          ny: hit.ny,
          nz: hit.nz,
          isMetallic: c.kind === 'door',
        };
      }
    }

    // Terrain ground/hill intersection along segment
    const steps = Math.max(4, Math.min(28, Math.ceil(bestDist / 1.5)));
    const stepLen = bestDist / steps;
    let prevT = 0;
    let prevDiff = oy - this.arena.getGroundHeightAt(ox, oz);
    for (let s = 1; s <= steps; s++) {
      const t = s * stepLen;
      const px = ox + dx * t;
      const py = oy + dy * t;
      const pz = oz + dz * t;
      const gy = this.arena.getGroundHeightAt(px, pz);
      const diff = py - gy;
      if (diff <= 0 && t < bestDist) {
        const frac = prevDiff > 0 ? prevDiff / Math.max(0.001, prevDiff - diff) : 0;
        const hitT = prevT + (t - prevT) * frac;
        bestDist = hitT;
        bestHit = {
          dist: hitT,
          hx: ox + dx * hitT,
          hy: oy + dy * hitT,
          hz: oz + dz * hitT,
          nx: 0,
          ny: 1,
          nz: 0,
          isMetallic: false,
        };
        break;
      }
      prevT = t;
      prevDiff = diff;
    }

    return bestHit;
  }

  private hasLineOfSight(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.1) return true;
    const inv = 1 / dist;
    const hit = this.raycastObstacles(x1, y1, z1, dx * inv, dy * inv, dz * inv, Math.max(0.05, dist - 0.25));
    return hit === null;
  }

  private spawnBulletDecal(hx: number, hy: number, hz: number, nx: number, ny: number, nz: number): void {
    const mat = new THREE.MeshBasicMaterial({
      map: getBulletHoleTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const decal = new THREE.Mesh(_sharedDecalGeo, mat);
    decal.position.set(hx + nx * 0.03, hy + ny * 0.03, hz + nz * 0.03);
    _vDecalLook.set(hx + nx * 2, hy + ny * 2, hz + nz * 2);
    decal.lookAt(_vDecalLook);
    decal.rotateZ(Math.random() * Math.PI * 2);
    this.scene.add(decal);
    this.impactDecals.push(decal);

    if (this.impactDecals.length > 55) {
      const oldest = this.impactDecals.shift()!;
      this.scene.remove(oldest);
      (oldest.material as THREE.Material).dispose();
    }
  }

  private spawnMuzzleAndShell(actor: ActorEntity, muzzlePos: THREE.Vector3): void {
    // Brief bright muzzle flash burst
    const flash = new THREE.Mesh(_sharedFlashGeo, _sharedFlashMat);
    flash.position.copy(muzzlePos);
    flash.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    this.scene.add(flash);
    this.particles.push({
      mesh: flash,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.065,
      maxLife: 0.065,
      gravity: 0,
      expandRate: 4.5,
    });

    // Ejecting spinning brass shell casing to the right
    _vShellRight.set(Math.cos(actor.yaw), 0, -Math.sin(actor.yaw));
    const shell = new THREE.Mesh(_sharedShellGeo, _sharedShellMat);
    shell.position.set(
      muzzlePos.x + _vShellRight.x * 0.25,
      muzzlePos.y + 0.05,
      muzzlePos.z + _vShellRight.z * 0.25
    );
    this.scene.add(shell);
    const sideSp = 2.6 + Math.random() * 1.8;
    this.particles.push({
      mesh: shell,
      vx: _vShellRight.x * sideSp + (Math.random() - 0.5) * 1.2,
      vy: 3.4 + Math.random() * 1.8,
      vz: _vShellRight.z * sideSp + (Math.random() - 0.5) * 1.2,
      life: 0.65,
      maxLife: 0.65,
      gravity: 20,
      spinVx: 14 + Math.random() * 10,
      spinVz: 12 + Math.random() * 10,
    });
  }

  private pushDamagePopup(
    x: number,
    y: number,
    z: number,
    dmg: number,
    isCrit = false,
    isVehicle = false
  ): void {
    const amount = Math.max(1, Math.round(dmg));
    const text = isCrit ? `-${amount} CRIT!` : isVehicle ? `-${amount} ARMOR` : `-${amount}`;
    this.damagePopups.push({
      id: `dp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: x + (Math.random() - 0.5) * 0.45,
      y,
      z: z + (Math.random() - 0.5) * 0.45,
      text,
      isCrit,
      isVehicle,
      life: 0.85,
      maxLife: 0.85,
    });
    if (this.damagePopups.length > 24) {
      this.damagePopups.shift();
    }
  }

  private findNearestEmptyMount(actor: ActorEntity, excludeFlying = false): MountEntity | null {
    let best: MountEntity | null = null;
    let bestDist = 6.4;
    for (const m of this.mounts.values()) {
      if (!m.alive || m.riderId !== null) continue;
      if (excludeFlying && m.isFlyingMount) continue;
      if (m.helmLocalPos) {
        const helmW = boatLocalToWorld(m.helmLocalPos.x, m.helmLocalPos.y, m.helmLocalPos.z, m);
        const d = Math.hypot(helmW.x - actor.x, helmW.z - actor.z);
        if (d < 4.8 && Math.abs(helmW.y - actor.y) < 3.2 && d < bestDist) {
          bestDist = d;
          best = m;
        }
      } else {
        const maxR = m.isFlyingMount ? 6.4 : m.isBoat ? 5.8 : 5.4;
        const maxDy = m.isFlyingMount ? 5.5 : 3.5;
        const d = Math.hypot(m.x - actor.x, m.z - actor.z);
        if (d < maxR && d < bestDist && Math.abs(m.y - actor.y) < maxDy) {
          bestDist = d;
          best = m;
        }
      }
    }
    return best;
  }

  private tryToggleMount(actor: ActorEntity): void {
    if (!actor.alive || actor.knockedDown) return;
    if (actor.isSitting) {
      this.standUpFromBench(actor);
    }
    if (actor.brState === 'plane') {
      this.ejectFromPlane(actor);
      return;
    }
    if (actor.brState !== 'ground') return;
    if (actor.mountedId) {
      this.dismountActor(actor);
      return;
    }
    const target = this.findNearestEmptyMount(actor, actor.isBot);
    if (!target) return;
    actor.isCrouching = false;
    actor.mountedId = target.id;
    target.riderId = actor.id;
    if (target.helmLocalPos) {
      const helmW = boatLocalToWorld(target.helmLocalPos.x, target.helmLocalPos.y, target.helmLocalPos.z, target);
      actor.x = helmW.x;
      actor.y = helmW.y;
      actor.z = helmW.z;
    } else {
      actor.x = target.x;
      actor.y = target.y + target.seatY;
      actor.z = target.z;
    }
    actor.vy = 0;
    if (actor.isLocal) {
      if (isBoatKind(target.kind)) {
        this.boardedShipIds.add(target.id);
      }
      if (isTankKind(target.kind) || isHelicopterKind(target.kind) || isPoliceVehicleKind(target.kind)) {
        this.raiseWantedLevel(2);
      }
      const isHeli = isHelicopterKind(target.kind);
      const isTank = isTankKind(target.kind);
      const isBird = isFlyingMountKind(target.kind);
      const isLiving = isLivingMountKind(target.kind);
      soundEngine.playMount(isLiving, isBird || isHeli);
      const verb = isBoatKind(target.kind) ? 'BOARDED' : 'MOUNTED';
      if (isHeli) {
        this.showAnnouncement(
          `PILOTING ${target.name.toUpperCase()} — WASD FLY · SPACE UP · C DOWN · CLICK FIRE HOMING MISSILES!`,
          3.2
        );
      } else if (isTank) {
        this.showAnnouncement(
          `COMMANDING ${target.name.toUpperCase()} — AIM TURRET + CLICK TO FIRE EXPLOSIVE CANNON!`,
          3.0
        );
      } else if (isBird) {
        this.showAnnouncement(
          `FLYING ${target.name.toUpperCase()} — WASD FLY · SPACE UP · C DOWN · SHIFT SKY DASH!`,
          3.0
        );
      } else if (isMarineMountKind(target.kind)) {
        this.showAnnouncement(
          `${verb} ${target.name.toUpperCase()} — WASD STEER · C DIVE · SPACE SURFACE · SHIFT BOOST!`,
          2.5
        );
      } else if (target.kind === 'gorilla') {
        this.showAnnouncement(
          `${verb} ${target.name.toUpperCase()} — SPACE SUPER LEAP · SHIFT SMASH!`,
          2.4
        );
      } else if (target.kind === 'rhino') {
        this.showAnnouncement(
          `${verb} ${target.name.toUpperCase()} — SHIFT TANK CHARGE SMASHES ENEMIES!`,
          2.4
        );
      } else {
        this.showAnnouncement(
          `${verb} ${target.name.toUpperCase()} — WASD / ARROWS TO STEER, SHIFT BOOST!`,
          2.2
        );
      }
    }
  }

  private dismountActor(actor: ActorEntity, pushSide = true): void {
    if (!actor.mountedId) return;
    const mount = this.mounts.get(actor.mountedId);
    actor.mountedId = null;
    if (mount) {
      mount.riderId = null;
      if (pushSide) {
        if (mount.kind === 'battleship' && mount.helmLocalPos) {
          const deckSpot = boatLocalToWorld(0, 4.48, -2.55, mount);
          actor.x = deckSpot.x;
          actor.y = deckSpot.y;
          actor.z = deckSpot.z;
        } else if (mount.kind === 'pirate_boat' && mount.helmLocalPos) {
          const deckSpot = boatLocalToWorld(1.25, 1.88, -3.1, mount);
          actor.x = deckSpot.x;
          actor.y = deckSpot.y;
          actor.z = deckSpot.z;
        } else if (mount.isFlyingMount || mount.isHelicopter) {
          actor.x = mount.x + Math.cos(mount.yaw) * 2.2;
          actor.z = mount.z - Math.sin(mount.yaw) * 2.2;
          const surfaceY = Math.max(
            WATER_LEVEL - 0.35,
            this.getWalkableSurfaceY(actor.x, mount.y + mount.seatY, actor.z, 0.55)
          );
          const heightAbove = mount.y + mount.seatY - surfaceY;
          if (heightAbove > 7.5) {
            actor.y = mount.y + mount.seatY - 0.5;
            actor.vy = -5;
            actor.brState = 'freefall';
            this.openParachute(actor);
          } else {
            actor.y = Math.max(WATER_LEVEL - 0.45, surfaceY + 0.12);
            actor.vy = 0;
          }
        } else {
          actor.x = mount.x + Math.cos(mount.yaw) * (mount.radius + 1.1);
          actor.z = mount.z - Math.sin(mount.yaw) * (mount.radius + 1.1);
          actor.y = Math.max(
            WATER_LEVEL - 0.55,
            mount.isBoat || mount.isMarineMount
              ? WATER_LEVEL - 0.45
              : Math.max(mount.y + 0.2, this.arena.getGroundHeightAt(actor.x, actor.z) + 0.1)
          );
        }
      }
    }
    if (actor.isLocal) {
      soundEngine.updateEngineSound(false);
    }
  }

  private tryToggleNearestDoor(actor: ActorEntity): boolean {
    for (const door of this.arena.doors) {
      const dist = Math.hypot(door.triggerX - actor.x, door.triggerZ - actor.z);
      if (dist < 4.5 && Math.abs(door.triggerY - actor.y) < 3.5) {
        door.isOpen = !door.isOpen;
        door.collider.minY = door.isOpen ? -999 : door.triggerY;
        door.collider.maxY = door.isOpen ? -998 : door.triggerY + 3.5;
        if (actor.isLocal) soundEngine.playDoorToggle();
        return true;
      }
    }
    return false;
  }

  private findNearestBench(actor: ActorEntity): InteractiveBench | null {
    let best: InteractiveBench | null = null;
    let bestDist = 3.3;
    for (const b of this.arena.benches) {
      const d = Math.hypot(b.x - actor.x, b.z - actor.z);
      if (d < bestDist && Math.abs(b.y - actor.y) < 2.6) {
        bestDist = d;
        best = b;
      }
    }
    return best;
  }

  private tryToggleSitBench(actor: ActorEntity): boolean {
    if (actor.isSitting) {
      this.standUpFromBench(actor);
      return true;
    }
    if (!actor.alive || actor.knockedDown || actor.mountedId || actor.isSwimming || actor.brState !== 'ground') {
      return false;
    }
    const bench = this.findNearestBench(actor);
    if (!bench) return false;
    actor.isCrouching = false;
    actor.isSitting = true;
    actor.sittingBenchId = bench.id;
    actor.sittingHealAccum = 0;
    actor.x = bench.x;
    actor.y = bench.seatY - 0.14;
    actor.z = bench.z;
    actor.vx = 0;
    actor.vy = 0;
    actor.vz = 0;
    actor.yaw = bench.lookYaw;
    actor.grounded = true;
    actor.anim = 'sit';
    if (actor.isLocal) {
      this.camYaw = bench.lookYaw;
      this.camPitch = 0.08;
      soundEngine.playBenchSit();
      this.showAnnouncement('RESTING ON COASTAL BENCH (+5 HP/s) — PRESS [E] OR MOVE TO STAND', 2.4);
    }
    return true;
  }

  private standUpFromBench(actor: ActorEntity): void {
    if (!actor.isSitting) return;
    const bench = this.arena.benches.find((b) => b.id === actor.sittingBenchId);
    actor.isSitting = false;
    actor.sittingBenchId = null;
    if (bench) {
      const fx = -Math.sin(bench.lookYaw);
      const fz = -Math.cos(bench.lookYaw);
      actor.x = bench.x + fx * 1.15;
      actor.z = bench.z + fz * 1.15;
      actor.y = Math.max(bench.y + 0.05, this.getWalkableSurfaceY(actor.x, bench.y + 0.5, actor.z, 0.55));
    }
    actor.anim = 'idle';
  }

  private computeCrosshairAimRay(actor: ActorEntity): { origin: THREE.Vector3; dir: THREE.Vector3; targetPt: THREE.Vector3 } {
    this.camera.getWorldPosition(_vOrigin);
    this.camera.getWorldDirection(_vDir);

    const obs = this.raycastObstacles(_vOrigin.x, _vOrigin.y, _vOrigin.z, _vDir.x, _vDir.y, _vDir.z, 240);
    let hitDist = obs ? obs.dist : 240;

    // Check enemy actors
    for (const other of this.actors.values()) {
      if (other.id === actor.id || !other.alive) continue;
      if (this.isFriendly(actor.id, other)) continue;
      const t = segmentIntersectActorColumn(
        _vOrigin.x,
        _vOrigin.y,
        _vOrigin.z,
        _vDir.x,
        _vDir.y,
        _vDir.z,
        hitDist,
        other.x,
        other.y,
        other.y + 2.25,
        other.z,
        0.95
      );
      if (t !== null && t > 0.5 && t < hitDist) {
        hitDist = t;
      }
    }

    // Check mounts (local deck boxes for multi-deck ships, sphere for smaller mounts)
    for (const m of this.mounts.values()) {
      if (!m.alive || m.id === actor.mountedId) continue;
      const t = m.deckBoxes
        ? rayIntersectBoatDeckBoxes(_vOrigin.x, _vOrigin.y, _vOrigin.z, _vDir.x, _vDir.y, _vDir.z, hitDist, m)
        : segmentIntersectSphere(
            _vOrigin.x,
            _vOrigin.y,
            _vOrigin.z,
            _vDir.x,
            _vDir.y,
            _vDir.z,
            hitDist,
            m.x,
            m.y + 1.1,
            m.z,
            m.radius + 0.25
          );
      if (t !== null && t > 0.5 && t < hitDist) {
        hitDist = t;
      }
    }

    _vTarget.copy(_vOrigin).addScaledVector(_vDir, hitDist);
    return { origin: _vOrigin, dir: _vDir, targetPt: _vTarget };
  }

  private performPrimaryAttack(actor: ActorEntity): void {
    if (!actor.alive || this.isPaused || this.inJail || actor.knockedDown || actor.brState !== 'ground') return;
    actor.activeEmoteAnim = null;
    actor.activeEmoteTimer = 0;
    if (actor.isLocal) this.activeEmote = null;
    if (actor.isSitting) {
      this.standUpFromBench(actor);
      if (actor.isLocal) actor.yaw = this.camYaw;
    }

    // Mounted Tank Cannon Shell or Attack Helicopter Homing Missile!
    if (actor.mountedId) {
      const mount = this.mounts.get(actor.mountedId);
      if (mount && (mount.isTank || mount.isHelicopter)) {
        if ((mount.fireCooldown ?? 0) > 0) return;
        const isTank = Boolean(mount.isTank);
        mount.fireCooldown = isTank ? 1.05 : 0.62;
        const muzzleOrigin = new THREE.Vector3(
          mount.x + Math.sin(actor.yaw + Math.PI) * 3.4,
          mount.y + (isTank ? 2.15 : 1.05),
          mount.z + Math.cos(actor.yaw + Math.PI) * 3.4
        );
        let aimDir: THREE.Vector3;
        if (actor.isLocal) {
          const ray = this.computeCrosshairAimRay(actor);
          aimDir = ray.targetPt.clone().sub(muzzleOrigin).normalize();
          if (isTank) {
            soundEngine.playTankCannon();
            this.screenShake = Math.max(this.screenShake, 0.42);
          } else {
            soundEngine.playMissileLaunch();
            this.screenShake = Math.max(this.screenShake, 0.25);
          }
        } else {
          aimDir = new THREE.Vector3(-Math.sin(actor.yaw), Math.sin(actor.pitch), -Math.cos(actor.yaw)).normalize();
        }
        const shellMesh = new THREE.Mesh(
          new THREE.BoxGeometry(isTank ? 0.36 : 0.28, isTank ? 0.36 : 0.28, isTank ? 1.15 : 1.35),
          new THREE.MeshBasicMaterial({ color: isTank ? 0xf97316 : 0x38bdf8 })
        );
        shellMesh.position.copy(muzzleOrigin);
        _vTmpVec.copy(muzzleOrigin).add(aimDir);
        shellMesh.lookAt(_vTmpVec);
        this.scene.add(shellMesh);
        const speed = isTank ? 96 : 82;
        this.projectiles.push({
          id: `heavy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ownerId: actor.id,
          team: actor.team,
          mesh: shellMesh,
          x: muzzleOrigin.x,
          y: muzzleOrigin.y,
          z: muzzleOrigin.z,
          vx: aimDir.x * speed,
          vy: aimDir.y * speed,
          vz: aimDir.z * speed,
          damage: isTank ? 155 : 115,
          knockback: 18,
          life: isTank ? 2.4 : 3.2,
          color: isTank ? '#f97316' : '#38bdf8',
          splashRadius: isTank ? 11.5 : 9.5,
          isHeavyBlast: true,
          isHoming: !isTank,
        });
        this.spawnExplosionParticles(muzzleOrigin.x, muzzleOrigin.y, muzzleOrigin.z, isTank ? 0xfbbf24 : 0xe0f2fe, 6, 0.8);
        return;
      }
    }

    if (actor.activeSlot === 'knife') {
      this.performKnifeSlash(actor);
      return;
    }
    if (actor.activeSlot === 'grenade') {
      this.throwGrenade(actor);
      return;
    }

    if (actor.isReloading || actor.fireCooldown > 0) return;
    const gun = getGunDef(actor.gunId);
    const infinite = actor.isLocal && this.liveConfig.unlimitedAmmo;
    if (!infinite && actor.ammoInMag <= 0) {
      this.startReload(actor);
      return;
    }

    if (!infinite) {
      actor.ammoInMag -= 1;
    } else {
      actor.ammoInMag = gun.magSize;
    }
    actor.fireCooldown = 1 / gun.fireRate;
    actor.attackTimer = 0.18;
    actor.activeAnimOverride = 'attack';

    const muzzlePos = new THREE.Vector3(actor.x, actor.y + 1.35, actor.z);
    if (actor.rig.gunHandle) {
      _vMuzzle.copy(actor.rig.gunHandle.muzzleLocal);
      actor.rig.gunHandle.group.localToWorld(_vMuzzle);
      muzzlePos.copy(_vMuzzle);
    }

    this.spawnMuzzleAndShell(actor, muzzlePos);

    let aimDir: THREE.Vector3;
    if (actor.isLocal) {
      const ray = this.computeCrosshairAimRay(actor);
      aimDir = ray.targetPt.clone().sub(muzzlePos).normalize();
      soundEngine.playGunshot(actor.gunId);
      this.screenShake = Math.max(this.screenShake, gun.id === 'sniper' || gun.id === 'combat_shotgun' ? 0.24 : 0.08);
    } else {
      aimDir = new THREE.Vector3(-Math.sin(actor.yaw), Math.sin(actor.pitch), -Math.cos(actor.yaw)).normalize();
    }

    const dmgBoost =
      (actor.powerBoostTimer > 0 ? 1.45 : 1.0) *
      (actor.isBot ? this.liveConfig.enemyBotDamage : this.liveConfig.weaponDamageMultiplier);
    const spreadScale = actor.isCrouching ? 0.65 : 1.0;

    for (let p = 0; p < gun.pellets; p++) {
      const dir = aimDir.clone();
      dir.x += (Math.random() - 0.5) * gun.spread * 2 * spreadScale;
      dir.y += (Math.random() - 0.5) * gun.spread * 2 * spreadScale;
      dir.z += (Math.random() - 0.5) * gun.spread * 2 * spreadScale;
      dir.normalize();

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, 0.65),
        new THREE.MeshBasicMaterial({ color: gun.tracerColor })
      );
      mesh.position.copy(muzzlePos);
      _vTmpVec.copy(muzzlePos).add(dir);
      mesh.lookAt(_vTmpVec);
      this.scene.add(mesh);

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ownerId: actor.id,
        team: actor.team,
        mesh,
        x: muzzlePos.x,
        y: muzzlePos.y,
        z: muzzlePos.z,
        vx: dir.x * gun.projectileSpeed,
        vy: dir.y * gun.projectileSpeed,
        vz: dir.z * gun.projectileSpeed,
        damage: gun.damage * dmgBoost,
        knockback: gun.knockback,
        life: gun.range / gun.projectileSpeed,
        color: gun.tracerColor,
      });
    }

    if (!infinite && actor.ammoInMag === 0) {
      this.startReload(actor);
    }
  }

  private performKnifeSlash(actor: ActorEntity): void {
    if (!actor.alive || actor.knockedDown || actor.brState !== 'ground' || actor.knifeCooldown > 0) return;
    const knife = getKnifeDef(actor.knifeId);
    actor.knifeCooldown = knife.cooldown;
    actor.attackTimer = 0.32;
    actor.activeAnimOverride = 'slash';

    if (actor.isLocal) soundEngine.playKnifeSlash(actor.knifeId);

    const fx = -Math.sin(actor.yaw);
    const fz = -Math.cos(actor.yaw);
    const dmgBoost =
      (actor.powerBoostTimer > 0 ? 1.45 : 1.0) *
      (actor.isBot ? this.liveConfig.enemyBotDamage : this.liveConfig.weaponDamageMultiplier);

    for (const target of this.actors.values()) {
      if (target.id === actor.id || !target.alive) continue;
      const dx = target.x - actor.x;
      const dz = target.z - actor.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= knife.range + 0.45 && Math.abs(target.y - actor.y) < 2.6) {
        const dot = (dx * fx + dz * fz) / Math.max(0.01, dist);
        if (dot > 0.15 || dist < 1.5) {
          if (!this.hasLineOfSight(actor.x, actor.y + 1.25, actor.z, target.x, target.y + 1.25, target.z)) {
            continue;
          }
          if (this.isFriendly(actor.id, target)) {
            if (actor.isLocal) {
              this.allyShieldTime = 0.65;
              soundEngine.playAllyBlock();
            }
            continue;
          }
          // Enclosed vehicles shield the rider from direct knife damage
          if (this.isEnclosedMounted(target)) {
            continue;
          }
          const dmg = knife.damage * dmgBoost;
          this.damageActor(target, dmg, actor.id, fx * knife.knockback, fz * knife.knockback);
          if (actor.isLocal) {
            this.hitMarkerTime = 0.2;
            soundEngine.playHitMarker(true);
            this.pushDamagePopup(target.x, target.y + 2.35, target.z, dmg, true, false);
          }
        }
      }
    }

    for (const mount of this.mounts.values()) {
      if (!mount.alive || mount.id === actor.mountedId) continue;
      const d = Math.hypot(mount.x - actor.x, mount.z - actor.z);
      if (d <= knife.range + mount.radius + 0.3) {
        if (!this.hasLineOfSight(actor.x, actor.y + 1.2, actor.z, mount.x, mount.y + 1.1, mount.z)) {
          continue;
        }
        if (this.isMountFriendly(actor.id, mount)) {
          if (actor.isLocal) {
            this.allyShieldTime = 0.65;
            soundEngine.playAllyBlock();
          }
          continue;
        }
        const mDmg = knife.damage * 1.15;
        this.damageMount(mount, mDmg, actor.id);
        this.spawnExplosionParticles(mount.x, mount.y + 1.1, mount.z, 0xfbbf24, 4, 0.45);
        if (actor.isLocal) {
          this.hitMarkerTime = 0.18;
          soundEngine.playHitMarker(false);
          soundEngine.playRicochet(mount.kind !== 'horse');
          this.pushDamagePopup(mount.x, mount.y + 2.2, mount.z, mDmg, false, true);
        }
      }
    }

    for (const w of this.wildEcosystem) {
      if (!w.alive) continue;
      const dx = w.x - actor.x;
      const dz = w.z - actor.z;
      const d = Math.hypot(dx, dz);
      if (d <= knife.range + w.radius + 0.45 && Math.abs(w.y - actor.y) < 3.0) {
        const dot = (dx * fx + dz * fz) / Math.max(0.01, d);
        if (dot > 0.1 || d < 1.8) {
          if (!this.hasLineOfSight(actor.x, actor.y + 1.2, actor.z, w.x, w.y + 0.9, w.z)) {
            continue;
          }
          const wDmg = knife.damage * dmgBoost;
          this.damageWildEntity(w, wDmg, actor.id, fx * knife.knockback, fz * knife.knockback);
          if (actor.isLocal) {
            this.hitMarkerTime = 0.18;
            soundEngine.playHitMarker(false);
            this.pushDamagePopup(w.x, w.y + 2.0, w.z, wDmg, false, false);
          }
        }
      }
    }
  }

  private throwGrenade(actor: ActorEntity): void {
    if (!actor.alive || actor.knockedDown || actor.brState !== 'ground' || actor.grenadeCooldown > 0 || actor.grenadeCount <= 0) return;
    const gId: GrenadeId = actor.grenadeId || 'frag_grenade';
    const def = getGrenadeDef(gId);
    actor.grenadeCount -= 1;
    actor.grenadeCooldown = 0.9;
    actor.attackTimer = 0.28;
    actor.activeAnimOverride = 'throw';

    const dir = actor.isLocal
      ? this.camera.getWorldDirection(new THREE.Vector3())
      : new THREE.Vector3(-Math.sin(actor.yaw), 0.25, -Math.cos(actor.yaw)).normalize();

    const handle = createGrenadeModel(gId);
    handle.group.position.set(actor.x, actor.y + 1.65, actor.z);
    this.scene.add(handle.group);

    this.activeGrenades.push({
      id: `gr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId: actor.id,
      team: actor.team,
      grenadeId: gId,
      mesh: handle.group,
      x: actor.x + dir.x * 0.9,
      y: actor.y + 1.65,
      z: actor.z + dir.z * 0.9,
      vx: dir.x * 23,
      vy: dir.y * 23 + 7.5,
      vz: dir.z * 23,
      fuse: def.fuseTime,
      dispose: handle.dispose,
    });

    if (actor.isLocal) soundEngine.playDash();
  }

  private damageMount(mount: MountEntity, dmg: number, attackerId: string): void {
    if (!mount.alive) return;
    mount.hp = Math.max(0, mount.hp - dmg);
    mount.lastAttackerId = attackerId;

    const ratio = Math.max(0, mount.hp / mount.maxHp);
    mount.hpBarFill.scale.x = Math.max(0.01, ratio);
    mount.hpBarFill.position.x = -(1 - ratio) * 0.99;
    const fillMat = mount.hpBarFill.material as THREE.MeshBasicMaterial;
    fillMat.color.setHex(ratio > 0.55 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444);

    if (mount.hp <= 0) {
      this.detonateMount(mount, attackerId);
    }
  }

  private detonateMount(mount: MountEntity, attackerId: string): void {
    if (!mount.alive) return;
    mount.alive = false;
    mount.respawnTimer = 18;
    mount.root.visible = false;

    const isVehicle = !isLivingMountKind(mount.kind);
    if (isVehicle) {
      soundEngine.playExplosion('vehicle');
      this.spawnExplosionParticles(mount.x, mount.y + 1.2, mount.z, 0xf97316, 36, 1.8);
      this.screenShake = Math.max(this.screenShake, 0.85);
    } else {
      soundEngine.playKO();
      this.spawnExplosionParticles(
        mount.x,
        mount.y + 1.1,
        mount.z,
        mount.isFlyingMount ? 0xfef08a : mount.isMarineMount ? 0x38bdf8 : 0xfde68a,
        16,
        1.0
      );
    }

    // Eliminate rider inside exploding vehicle or parachute-drop flying mount rider!
    if (mount.riderId) {
      const rider = this.actors.get(mount.riderId);
      mount.riderId = null;
      if (rider) {
        rider.mountedId = null;
        if (rider.isLocal) soundEngine.updateEngineSound(false);
        if (isVehicle) {
          this.damageActor(rider, rider.hp + 999, attackerId, 0, 0);
        } else {
          this.damageActor(rider, 25, attackerId, 0, 4);
          if (mount.isFlyingMount && rider.alive && mount.y > 8) {
            rider.brState = 'freefall';
            this.openParachute(rider);
          }
        }
      }
    }

    // Area blast damage for exploding vehicles
    if (isVehicle) {
      const blastR = 11;
      for (const actor of this.actors.values()) {
        if (!actor.alive) continue;
        const dist = Math.hypot(actor.x - mount.x, actor.z - mount.z);
        if (dist < blastR) {
          const factor = 1 - dist / blastR;
          this.damageActor(actor, 90 * factor, attackerId, (actor.x - mount.x) * 1.5, (actor.z - mount.z) * 1.5);
        }
      }
    }
  }

  private damageActor(
    target: ActorEntity,
    dmg: number,
    attackerId: string,
    kx: number,
    kz: number,
    bypassArmor = false
  ): void {
    if (!target.alive) return;
    if (!bypassArmor && target.invulnTimer > 0) return;
    if (target.isLocal && this.tribalCapturePhase !== 'none') return;
    if (attackerId !== 'storm_zone' && this.isFriendly(attackerId, target)) return;

    if (target.isSitting && attackerId !== 'storm_zone') {
      this.standUpFromBench(target);
    }

    let hpDmg = dmg;
    if (!bypassArmor && !target.knockedDown && target.armorHp > 0) {
      const absorb = Math.min(target.armorHp, dmg * 0.68);
      target.armorHp = Math.max(0, target.armorHp - absorb);
      hpDmg = dmg - absorb;
      if (target.armorHp <= 0) {
        target.armorLevel = 0;
        target.armorMaxHp = 0;
      }
    }

    target.hp = Math.max(0, target.hp - hpDmg);
    target.hitFlash = 0.22;
    target.lastDamageBy = attackerId;
    target.lastDamageTime = this.elapsed;
    if (!target.mountedId && !bypassArmor) {
      target.vx += kx;
      target.vz += kz;
    }

    // Attacking Police/Army Guards raises Wanted Level!
    if (target.guardRole && attackerId === this.getLocalActor()?.id) {
      this.raiseWantedLevel(1);
    }

    if (target.isLocal) {
      if (!bypassArmor) {
        soundEngine.playHit(dmg > 35);
        this.screenShake = Math.max(this.screenShake, 0.25);
      }

      const attacker = this.actors.get(attackerId);
      if (attacker && attacker.id !== target.id) {
        const fx = -Math.sin(this.camYaw);
        const fz = -Math.cos(this.camYaw);
        const rx = Math.cos(this.camYaw);
        const rz = -Math.sin(this.camYaw);
        const ax = attacker.x - target.x;
        const az = attacker.z - target.z;
        const fwd = ax * fx + az * fz;
        const right = ax * rx + az * rz;
        this.damageIndicatorAngle = Math.atan2(right, fwd) * (180 / Math.PI);
        this.damageIndicatorTime = 0.85;
      }
    }

    if (target.hp <= 0) {
      this.handleElimination(target, attackerId);
    }
  }

  private handleElimination(victim: ActorEntity, attackerId: string): void {
    if (!victim.alive) return;

    // Airport Police Arrest & Jail Cell Lockup trigger ONLY when caught inside a DRIVEN VEHICLE!
    // On foot, Police fight lethally (player is killed / respawned normally with NO jail arrest).
    const attackerEntity = this.actors.get(attackerId);
    const inDrivenVehicle = Boolean(this.isDrivenLandVehicleMount(victim.mountedId));
    if (
      victim.isLocal &&
      !this.matchEnded &&
      !this.inJail &&
      inDrivenVehicle &&
      (this.wantedLevel > 0 || Boolean(attackerEntity?.guardRole))
    ) {
      this.arrestLocalPlayer(victim);
      return;
    }

    // Hostile Tribe Capture Ending: if Tribal Warriors (or any death while besieged on Tribal Island) knock out local player -> 3s Rope-Break Struggle -> Campfire Cutscene!
    const distToTribal = Math.hypot(victim.x - TRIBAL_ISLAND_CENTER.x, victim.z - TRIBAL_ISLAND_CENTER.z);
    if (
      victim.isLocal &&
      this.tribalCapturePhase === 'none' &&
      !this.matchEnded &&
      (attackerId === 'wild_villager' || (this.villagerAggroTimer > 0 && distToTribal < 200))
    ) {
      this.startTribalRopeStruggle(victim);
      return;
    }

    // Drop glowing lootable weapon ONLY AFTER a Police/Army Guard is defeated!
    if (victim.guardRole) {
      this.spawnDroppedWeapon(victim.x, victim.y, victim.z, victim.gunId);
      if (attackerId === this.getLocalActor()?.id) {
        this.raiseWantedLevel(1);
      }
    }

    const isBR = this.config.mode === 'battle_royale';

    // Squad Battle Royale Knockdown & Revive mechanic!
    if (isBR && this.config.teamMode === 'team' && !victim.knockedDown && attackerId !== 'storm_zone' && !victim.guardRole) {
      const hasStandingTeammate = Array.from(this.actors.values()).some(
        (other) =>
          other.id !== victim.id &&
          !other.guardRole &&
          other.alive &&
          !other.knockedDown &&
          other.team &&
          other.team === victim.team
      );
      if (hasStandingTeammate) {
        if (victim.mountedId) this.dismountActor(victim, true);
        victim.knockedDown = true;
        victim.bleedoutTimer = 20;
        victim.hp = 45;
        victim.invulnTimer = 0.65;
        victim.reviveProgress = 0;
        if (victim.isLocal) {
          soundEngine.playKO();
          this.showAnnouncement('KNOCKED DOWN — CRAWL TO TEAMMATE FOR REVIVE!', 3.0);
        }
        return;
      }
    }

    victim.alive = false;
    victim.knockedDown = false;
    victim.isCrouching = false;
    victim.isSitting = false;
    victim.sittingBenchId = null;
    victim.deaths += 1;
    victim.hearts = victim.guardRole ? 0 : Math.max(0, victim.hearts - 1);
    victim.respawnTimer = !isBR && !victim.guardRole && victim.hearts > 0 ? 1.85 : 999;

    this.closeParachute(victim);
    if (victim.mountedId) {
      this.dismountActor(victim, false);
    }

    this.spawnExplosionParticles(victim.x, victim.y + 1.2, victim.z, 0x38bdf8, 18, 1.0);

    const attacker = this.actors.get(attackerId);
    const killerLabel = attacker
      ? attacker.name
      : attackerId === 'storm_zone'
        ? 'Safe Zone'
        : attackerId.startsWith('wild_')
          ? attackerId.replace('wild_', '').toUpperCase()
          : 'Hazard';
    const weaponLabel = attacker
      ? attacker.activeSlot === 'knife'
        ? getKnifeDef(attacker.knifeId).name
        : attacker.activeSlot === 'grenade'
          ? getGrenadeDef(attacker.grenadeId).name
          : getGunDef(attacker.gunId).name
      : attackerId === 'storm_zone'
        ? 'Storm'
        : 'Tribal Spear';
    this.killFeed.unshift({
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      killer: killerLabel,
      victim: victim.name,
      weapon: weaponLabel,
      killerTeam: attacker?.team,
      victimTeam: victim.team,
      isLocalInvolved: Boolean(attacker?.isLocal || victim.isLocal),
      ttl: 7.0,
    });
    if (this.killFeed.length > 4) this.killFeed.length = 4;

    if (attacker && attacker.id !== victim.id) {
      attacker.kos += 1;
      attacker.score += 100;
      if (attacker.isLocal) {
        soundEngine.playKO();
        this.showAnnouncement(`ELIMINATED ${victim.name.toUpperCase()} (+100)`, 1.6);
      }
    }

    // In Squad BR, if no standing teammate remains, eliminate any knocked squadmates too
    if (isBR && this.config.teamMode === 'team' && victim.team) {
      const anyStanding = Array.from(this.actors.values()).some(
        (a) => a.team === victim.team && a.alive && !a.knockedDown
      );
      if (!anyStanding) {
        for (const ally of this.actors.values()) {
          if (ally.team === victim.team && ally.alive && ally.knockedDown) {
            ally.knockedDown = false;
            ally.alive = false;
            ally.hearts = 0;
            this.spawnExplosionParticles(ally.x, ally.y + 1.0, ally.z, 0x38bdf8, 12, 0.85);
          }
        }
      }
    }

    if (isBR) {
      if (victim.isLocal && !victim.alive) {
        soundEngine.playKO();
        this.showAnnouncement('ELIMINATED FROM BATTLE ROYALE!', 2.6);
        this.finishMatch(false);
        return;
      }
      this.checkBattleRoyaleWin();
      return;
    }

    // 3-Heart Survival Check for Local Player (non-BR modes)
    if (victim.isLocal) {
      soundEngine.playKO();
      if (victim.hearts <= 0) {
        this.showAnnouncement('ALL 3 HEARTS LOST — SURVIVAL RUN ENDED!', 3.0);
        this.finishMatch(false);
      } else {
        this.showAnnouncement(`HEART LOST! ${victim.hearts} HEART${victim.hearts > 1 ? 'S' : ''} LEFT`, 1.8);
      }
    }
  }

  private checkBattleRoyaleWin(): void {
    if (this.config.mode !== 'battle_royale' || this.matchEnded || this.brCelebrateTimer > 0) return;
    const local = this.getLocalActor();
    if (!local || (!local.alive && !this.inJail)) return;

    const aliveActors = Array.from(this.actors.values()).filter((a) => a.alive && !a.guardRole);
    let won = false;
    if (this.config.teamMode === 'team') {
      const aliveTeams = new Set(aliveActors.map((a) => a.team).filter(Boolean));
      won = aliveTeams.size <= 1 && aliveActors.some((a) => a.id === local.id);
    } else {
      won = aliveActors.length <= 1 && aliveActors[0]?.id === local.id;
    }

    if (won) {
      this.brCelebrateTimer = 2.4;
      this.brFireworkBurstTimer = 0;
      soundEngine.playVictory();
      this.showAnnouncement('VICTORY ROYALE! LAST SURVIVOR STANDING!', 4.0);
    }
  }

  private spawnSkyFirework(cx: number, cy: number, cz: number): void {
    const colors = [0xfacc15, 0x38bdf8, 0xf43f5e, 0x4ade80, 0xe879f9];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const fx = cx + (Math.random() - 0.5) * 32;
    const fy = cy + 12 + Math.random() * 14;
    const fz = cz + (Math.random() - 0.5) * 32;
    this.spawnExplosionParticles(fx, fy, fz, col, 22, 1.35);
    soundEngine.playFireworkBurst();
  }

  private spawnExplosionParticles(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    scale = 1
  ): void {
    const geo = new THREE.BoxGeometry(0.38 * scale, 0.38 * scale, 0.38 * scale);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      const sp = (4 + Math.random() * 14) * scale;
      this.particles.push({
        mesh: m,
        vx: Math.cos(a) * sp,
        vy: (3 + Math.random() * 11) * scale,
        vz: Math.sin(a) * sp,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.8,
        gravity: 22,
      });
    }
  }

  private respawnActor(actor: ActorEntity): void {
    const sp = this.arena.spawnPoints[Math.floor(Math.random() * this.arena.spawnPoints.length)];
    actor.x = sp.x;
    actor.y = sp.y + 0.1;
    actor.z = sp.z;
    actor.vx = 0;
    actor.vy = 0;
    actor.vz = 0;
    actor.hp = actor.maxHp;
    actor.alive = true;
    actor.invulnTimer = 2.0;
    actor.isReloading = false;
    actor.ammoInMag = getGunDef(actor.gunId).magSize;
    actor.grenadeCount = Math.max(2, actor.grenadeCount);
    actor.isSitting = false;
    actor.sittingBenchId = null;
    actor.rig.root.visible = true;
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;

    if (!this.isPaused && !this.matchEnded) {
      this.elapsed += dt;
      this.stepSimulation(dt);
    } else if (this.matchEnded) {
      this.elapsed += dt;
      this.stepParticles(dt);
    }

    this.arena.update(this.elapsed, dt);
    this.updateOceanFishAndWildlife(dt);
    this.updateCameraAndLaser(dt);
    this.renderer.render(this.scene, this.camera);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  };

  private stepSimulation(dt: number): void {
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) this.announcement = null;
    }
    this.hitMarkerTime = Math.max(0, this.hitMarkerTime - dt);
    this.allyShieldTime = Math.max(0, this.allyShieldTime - dt);
    this.damageIndicatorTime = Math.max(0, this.damageIndicatorTime - dt);
    this.blindFlashAlpha = Math.max(0, this.blindFlashAlpha - dt * 0.85);
    this.poisonAlpha = Math.max(0, this.poisonAlpha - dt * 0.52);
    this.screenShake = Math.max(0, this.screenShake - dt * 2.2);

    // Tribal Capture Ending State Machine (3s Rope Struggle -> Hung Over Campfire Cutscene)
    if (this.tribalCapturePhase !== 'none') {
      const local = this.getLocalActor();
      if (local) {
        this.stepTribalCaptureSequence(local, dt);
      }
      this.stepParticles(dt);
      return;
    }

    // Victory Royale celebratory fireworks sequence before opening summary
    if (this.brCelebrateTimer > 0) {
      this.brCelebrateTimer -= dt;
      this.brFireworkBurstTimer -= dt;
      const local = this.getLocalActor();
      if (this.brFireworkBurstTimer <= 0 && local) {
        this.brFireworkBurstTimer = 0.35;
        this.spawnSkyFirework(local.x, local.y, local.z);
      }
      if (local) {
        local.anim = 'win';
        animateCharacterRig(local.rig, 'win', this.elapsed, dt, 0, 0);
      }
      this.stepParticles(dt);
      if (this.brCelebrateTimer <= 0) {
        this.finishMatch(true);
      }
      return;
    }

    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const dp = this.damagePopups[i];
      dp.life -= dt;
      dp.y += 1.65 * dt;
      if (dp.life <= 0) {
        this.damagePopups.splice(i, 1);
      }
    }

    for (let i = this.killFeed.length - 1; i >= 0; i--) {
      this.killFeed[i].ttl -= dt;
      if (this.killFeed[i].ttl <= 0) {
        this.killFeed.splice(i, 1);
      }
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    if (this.timeRemaining <= 0) {
      this.handleTimerEnd();
      return;
    }

    this.villagerAggroTimer = Math.max(0, this.villagerAggroTimer - dt);

    if (this.inJail) {
      this.jailTimeLeft = Math.max(0, this.jailTimeLeft - dt);
      if (this.jailTimeLeft <= 0) {
        this.releaseFromJail(false);
      }
    }

    if (this.config.mode === 'battle_royale') {
      this.stepBattleRoyaleSystems(dt);
    }

    const local = this.getLocalActor();
    if (local) {
      if (local.alive && local.brState === 'ground') {
        const distTribal = Math.hypot(local.x - TRIBAL_ISLAND_CENTER.x, local.z - TRIBAL_ISLAND_CENTER.z);
        if (distTribal < 175) {
          this.villagerAggroTimer = Math.max(this.villagerAggroTimer, 10);
          if (!this.tribalEnteredWarningDone) {
            this.tribalEnteredWarningDone = true;
            soundEngine.playVillagerAlert();
            this.showAnnouncement('ENTERING HOSTILE TRIBAL TERRITORY — WARRIORS ON ALERT!', 3.0);
          }
        }
      }
      this.stepLocalInput(local, dt);
    }

    this.stepPoliceFleet(dt);
    this.stepDestructibleBuildings(dt);
    this.stepBallisticMissiles(dt);
    this.stepDroppedWeapons(dt);

    // Bots AI + All Actors Physics
    for (const actor of this.actors.values()) {
      if (!actor.alive) {
        actor.respawnTimer -= dt;
        actor.rig.root.visible = false;
        actor.rig.updateEnemyHpBar(0, false, false, this.camera.position);
        if (this.config.mode !== 'battle_royale' && !actor.guardRole && actor.respawnTimer <= 0 && actor.hearts > 0) {
          this.respawnActor(actor);
        }
        continue;
      }

      if (actor.brState === 'plane') {
        actor.x = this.brPlanePos.x;
        actor.y = this.brPlanePos.y - 1.5;
        actor.z = this.brPlanePos.z;
        actor.rig.root.visible = false;
        actor.rig.updateEnemyHpBar(1, false, false, this.camera.position);
        if (actor.isBot && this.brPlaneProgress >= actor.botJumpPlaneT) {
          this.ejectFromPlane(actor);
        }
        continue;
      }

      actor.invulnTimer = Math.max(0, actor.invulnTimer - dt);
      actor.dashCooldown = Math.max(0, actor.dashCooldown - dt);
      actor.fireCooldown = Math.max(0, actor.fireCooldown - dt);
      actor.knifeCooldown = Math.max(0, actor.knifeCooldown - dt);
      actor.grenadeCooldown = Math.max(0, actor.grenadeCooldown - dt);
      actor.hitFlash = Math.max(0, actor.hitFlash - dt);
      actor.speedBoostTimer = Math.max(0, actor.speedBoostTimer - dt);
      actor.fruitSpeedBoostTimer = Math.max(0, actor.fruitSpeedBoostTimer - dt);
      actor.powerBoostTimer = Math.max(0, actor.powerBoostTimer - dt);
      actor.blindTimer = Math.max(0, actor.blindTimer - dt);
      actor.stamina = Math.min(100, actor.stamina + 18 * dt);
      if (actor.activeEmoteTimer && actor.activeEmoteTimer > 0) {
        actor.activeEmoteTimer = Math.max(0, actor.activeEmoteTimer - dt);
        if (actor.activeEmoteTimer <= 0) {
          actor.activeEmoteAnim = null;
          if (actor.isLocal) this.activeEmote = null;
        }
      }

      if (actor.isSitting) {
        actor.hp = Math.min(actor.maxHp, actor.hp + 5 * dt);
        actor.anim = 'sit';
      }

      // Knocked down bleedout countdown
      if (actor.knockedDown) {
        actor.bleedoutTimer -= dt;
        if (actor.bleedoutTimer <= 0) {
          this.handleElimination(actor, actor.lastDamageBy || 'storm_zone');
          continue;
        }
      }

      if (actor.isReloading && !actor.knockedDown) {
        actor.reloadTimer -= dt;
        if (actor.reloadTimer <= 0) {
          actor.isReloading = false;
          const gun = getGunDef(actor.gunId);
          const needed = gun.magSize - actor.ammoInMag;
          if (actor.reserveAmmo < 0) {
            actor.ammoInMag = gun.magSize;
          } else {
            const take = Math.min(needed, actor.reserveAmmo);
            actor.ammoInMag += take;
            actor.reserveAmmo -= take;
          }
        }
      }

      if (actor.attackTimer > 0) {
        actor.attackTimer -= dt;
        if (actor.attackTimer <= 0) actor.activeAnimOverride = null;
      }

      if (actor.isBot) {
        actor.botAiTimer -= dt;
        if (actor.botAiTimer <= 0) {
          actor.botAiTimer = 0.15;
          this.stepBotAI(actor, 0.15);
        } else if (actor.mountedId) {
          const mount = this.mounts.get(actor.mountedId);
          if (mount) {
            this.driveMount(mount, actor.botDriveThrottle, actor.botDriveSteer, dt, false);
          }
        }
      }

      if (!actor.mountedId && !actor.isSitting) {
        this.stepActorPhysics(actor, dt);
      }

      const dxCam = actor.x - this.camera.position.x;
      const dzCam = actor.z - this.camera.position.z;
      const distSq = dxCam * dxCam + dzCam * dzCam;
      const useInstanced =
        actor.isBot &&
        !actor.mountedId &&
        !actor.knockedDown &&
        actor.brState === 'ground' &&
        distSq > DETAIL_RIG_DIST_SQ;

      if (useInstanced) {
        actor.rig.root.visible = false;
      } else {
        actor.rig.root.visible = true;
        actor.rig.root.position.set(actor.x, actor.y, actor.z);
        actor.rig.root.rotation.y = actor.yaw + Math.PI;
        actor.rig.shieldMesh.visible = !actor.rig.isFirstPerson && actor.invulnTimer > 0;
        actor.rig.setShadowCasting(distSq < SHADOW_CAST_DIST_SQ);

        if (actor.parachuteHandle?.canopyGroup) {
          actor.parachuteHandle.canopyGroup.rotation.z = Math.sin(this.elapsed * 3.2 + actor.x) * 0.08;
          if (actor.parachuteId === 'phoenix_flame' && Math.random() < 0.35) {
            this.spawnExplosionParticles(actor.x, actor.y + 2.6, actor.z, 0xf97316, 1, 0.45);
          } else if (actor.parachuteId === 'galaxy_neon' && Math.random() < 0.3) {
            this.spawnExplosionParticles(actor.x, actor.y + 2.6, actor.z, 0xe879f9, 1, 0.42);
          }
        }

        const isAlly = Boolean(
          !actor.isLocal &&
            local &&
            this.config.teamMode === 'team' &&
            local.team &&
            actor.team &&
            actor.team === local.team
        );
        const relation: ActorRelation = actor.isLocal ? 'neutral' : isAlly ? 'ally' : 'enemy';
        actor.rig.setNameplate(actor.name, actor.playerTag, actor.level, actor.team, relation);
        if (actor.isLocal) {
          actor.rig.nameplateSprite.visible = false;
        }
        const showEnemyHpBar = !actor.isLocal && !isAlly && actor.brState === 'ground';
        actor.rig.updateEnemyHpBar(
          actor.hp / Math.max(1, actor.maxHp),
          actor.hitFlash > 0,
          showEnemyHpBar,
          this.camera.position
        );

        animateCharacterRig(actor.rig, actor.anim, this.elapsed, dt, actor.attackTimer, actor.hitFlash);
      }
    }

    // Tribal Campfire Warmth Healing (+5 HP/s)
    let localNearFire = false;
    if (local && local.alive && !local.knockedDown && local.brState === 'ground') {
      for (const cf of this.arena.campfires) {
        if (Math.hypot(local.x - cf.x, local.z - cf.z) < cf.radius && Math.abs(local.y - cf.y) < 3.2) {
          localNearFire = true;
          local.hp = Math.min(local.maxHp, local.hp + 5 * dt);
          break;
        }
      }
    }
    this.nearCampfire = localNearFire;
    if (localNearFire) {
      this.campfireTickAccum += dt;
      if (this.campfireTickAccum >= 1.25) {
        this.campfireTickAccum = 0;
        soundEngine.playCampfireTick();
      }
    } else {
      this.campfireTickAccum = 0.9;
    }

    // Active Volcano Molten Crater & Flowing Lava Hazard
    let localInLava = false;
    for (const actor of this.actors.values()) {
      if (!actor.alive || actor.brState !== 'ground') continue;
      for (const lz of this.arena.lavaZones) {
        if (Math.hypot(actor.x - lz.x, actor.z - lz.z) < lz.radius && actor.y <= lz.yThreshold) {
          this.damageActor(actor, 32 * dt, 'storm_zone', 0, 0, true);
          if (Math.random() < 0.28) {
            this.spawnExplosionParticles(actor.x, actor.y + 0.45, actor.z, 0xff5500, 1, 0.55);
          }
          if (actor.isLocal) localInLava = true;
          break;
        }
      }
    }
    this.inLavaZone = localInLava;
    if (localInLava) {
      this.lavaSfxAccum += dt;
      if (this.lavaSfxAccum >= 0.42) {
        this.lavaSfxAccum = 0;
        soundEngine.playLavaSizzle();
      }
    } else {
      this.lavaSfxAccum = 0.3;
    }

    this.updateInstancedBots(local);
    this.stepMounts(dt);
    this.stepWildEcosystem(dt);
    this.stepWildProjectiles(dt);
    this.stepFruitAndWaspNests(dt);
    this.stepProjectiles(dt);
    this.stepGrenades(dt);
    this.stepPickups(dt);
    this.stepParticles(dt);
    this.syncNetwork(dt);
  }

  private updateInstancedBots(local: ActorEntity | undefined): void {
    if (
      !this.instHead ||
      !this.instTorso ||
      !this.instArmL ||
      !this.instArmR ||
      !this.instLegL ||
      !this.instLegR ||
      !this.instHpBg ||
      !this.instHpFill
    ) {
      return;
    }

    let count = 0;
    let hpCount = 0;
    _instCamQuat.copy(this.camera.quaternion);

    for (const actor of this.actors.values()) {
      if (count >= INSTANCED_BOT_CAP) break;
      if (
        !actor.alive ||
        !actor.isBot ||
        actor.mountedId ||
        actor.knockedDown ||
        actor.brState !== 'ground' ||
        actor.rig.root.visible
      ) {
        continue;
      }

      const bodyY = actor.y + (actor.anim === 'swim' ? -0.2 : actor.anim === 'crouch' ? -0.32 : 0);
      const yaw = actor.yaw + Math.PI;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const runPhase = actor.anim === 'run' || actor.anim === 'walk' ? Math.sin(this.elapsed * 12 + actor.x) : 0;

      if (actor.hitFlash > 0) {
        _instColor.setHex(0xffffff);
      } else {
        _instColor.set(actor.customization.primaryColor);
      }

      // Torso
      _instDummy.position.set(actor.x, bodyY + 0.78, actor.z);
      _instDummy.rotation.set(0, yaw, 0);
      _instDummy.scale.set(1, 1, 1);
      _instDummy.updateMatrix();
      this.instTorso.setMatrixAt(count, _instDummy.matrix);
      this.instTorso.setColorAt(count, _instColor);

      // Head
      _instDummy.position.set(actor.x, bodyY + 1.62, actor.z);
      _instDummy.updateMatrix();
      this.instHead.setMatrixAt(count, _instDummy.matrix);
      this.instHead.setColorAt(count, _instColor);

      // Arms
      _instDummy.position.set(actor.x - cosY * 0.54, bodyY + 0.78, actor.z + sinY * 0.54);
      _instDummy.rotation.set(-runPhase * 0.6, yaw, 0, 'YXZ');
      _instDummy.updateMatrix();
      this.instArmL.setMatrixAt(count, _instDummy.matrix);
      this.instArmL.setColorAt(count, _instColor);

      _instDummy.position.set(actor.x + cosY * 0.54, bodyY + 0.78, actor.z - sinY * 0.54);
      _instDummy.rotation.set(-0.9 + runPhase * 0.25, yaw, 0, 'YXZ');
      _instDummy.updateMatrix();
      this.instArmR.setMatrixAt(count, _instDummy.matrix);
      this.instArmR.setColorAt(count, _instColor);

      // Legs
      _instDummy.position.set(actor.x - cosY * 0.21, bodyY + 0.24, actor.z + sinY * 0.21);
      _instDummy.rotation.set(runPhase * 0.75, yaw, 0, 'YXZ');
      _instDummy.updateMatrix();
      this.instLegL.setMatrixAt(count, _instDummy.matrix);

      _instDummy.position.set(actor.x + cosY * 0.21, bodyY + 0.24, actor.z - sinY * 0.21);
      _instDummy.rotation.set(-runPhase * 0.75, yaw, 0, 'YXZ');
      _instDummy.updateMatrix();
      this.instLegR.setMatrixAt(count, _instDummy.matrix);

      // Overhead Enemy HP bar for distant hostile bots
      const isAlly = Boolean(
        local &&
          this.config.teamMode === 'team' &&
          local.team &&
          actor.team &&
          actor.team === local.team
      );
      if (!isAlly) {
        const hpRatio = Math.max(0.01, Math.min(1, actor.hp / Math.max(1, actor.maxHp)));
        _instDummy.position.set(actor.x, bodyY + 2.55, actor.z);
        _instDummy.quaternion.copy(_instCamQuat);
        _instDummy.scale.set(1, 1, 1);
        _instDummy.updateMatrix();
        this.instHpBg.setMatrixAt(hpCount, _instDummy.matrix);

        _instDummy.translateX(-(1 - hpRatio) * 0.73);
        _instDummy.translateZ(0.015);
        _instDummy.scale.set(hpRatio, 1, 1);
        _instDummy.updateMatrix();
        this.instHpFill.setMatrixAt(hpCount, _instDummy.matrix);
        _instColor.setHex(actor.hitFlash > 0 ? 0xffffff : 0xef4444);
        this.instHpFill.setColorAt(hpCount, _instColor);
        hpCount += 1;
      }

      count += 1;
    }

    this.instHead.count = count;
    this.instTorso.count = count;
    this.instArmL.count = count;
    this.instArmR.count = count;
    this.instLegL.count = count;
    this.instLegR.count = count;
    this.instHpBg.count = hpCount;
    this.instHpFill.count = hpCount;

    this.instHead.instanceMatrix.needsUpdate = true;
    this.instTorso.instanceMatrix.needsUpdate = true;
    this.instArmL.instanceMatrix.needsUpdate = true;
    this.instArmR.instanceMatrix.needsUpdate = true;
    this.instLegL.instanceMatrix.needsUpdate = true;
    this.instLegR.instanceMatrix.needsUpdate = true;
    this.instHpBg.instanceMatrix.needsUpdate = true;
    this.instHpFill.instanceMatrix.needsUpdate = true;
    if (this.instHead.instanceColor) this.instHead.instanceColor.needsUpdate = true;
    if (this.instTorso.instanceColor) this.instTorso.instanceColor.needsUpdate = true;
    if (this.instArmL.instanceColor) this.instArmL.instanceColor.needsUpdate = true;
    if (this.instArmR.instanceColor) this.instArmR.instanceColor.needsUpdate = true;
    if (this.instHpFill.instanceColor) this.instHpFill.instanceColor.needsUpdate = true;
  }

  private stepBattleRoyaleSystems(dt: number): void {
    // 1. Fly Drop Airplane across Island
    if (this.brPlaneHandle) {
      const flightLen = this.brPlaneStart.distanceTo(this.brPlaneEnd);
      this.brPlaneProgress += (32 * dt) / Math.max(1, flightLen);
      this.brPlanePos.lerpVectors(this.brPlaneStart, this.brPlaneEnd, Math.min(1.3, this.brPlaneProgress));
      this.brPlaneHandle.group.position.copy(this.brPlanePos);
      if (this.brPlaneHandle.animatedPartA) {
        this.brPlaneHandle.animatedPartA.children.forEach((p) => {
          p.rotation.z += dt * 26;
        });
      }
      // Auto-eject remaining passengers at island edge
      if (this.brPlaneProgress >= 0.96) {
        for (const actor of this.actors.values()) {
          if (actor.alive && actor.brState === 'plane') {
            this.ejectFromPlane(actor);
          }
        }
      }
      if (this.brPlaneProgress >= 1.28) {
        this.brPlaneHandle.group.visible = false;
      }
    }

    // 2. Shrinking 4-Stage Safe Zone Timer (Covers Main Island, Titanic Bay & 5x Tribal Island)
    const stageRadii = [460, 285, 160, 74, 18];
    const zoneMult = Math.max(0.25, this.liveConfig.safeZoneSpeedMultiplier || 1);
    const holdDurs = [42 / zoneMult, 28 / zoneMult, 22 / zoneMult, 16 / zoneMult];
    const shrinkDurs = [38 / zoneMult, 34 / zoneMult, 28 / zoneMult, 24 / zoneMult];
    const stageDps = [4, 6, 9, 13];

    this.brZoneTimer -= dt;
    if (this.brZonePhase === 'hold') {
      if (this.brZoneTimer <= 0) {
        this.brZonePhase = 'shrink';
        const dur = shrinkDurs[Math.min(3, this.brZoneStage - 1)];
        this.brZoneTimer = dur;
        this.brZoneStageDuration = dur;
        this.brStartZoneCenterX = this.brZoneCenterX;
        this.brStartZoneCenterZ = this.brZoneCenterZ;
        this.brStartZoneRadius = this.brZoneRadius;
        this.showAnnouncement(`SAFE ZONE STAGE ${this.brZoneStage} SHRINKING!`, 2.8);
      }
    } else {
      const t = Math.max(0, Math.min(1, 1 - this.brZoneTimer / Math.max(1, this.brZoneStageDuration)));
      this.brZoneCenterX = THREE.MathUtils.lerp(this.brStartZoneCenterX, this.brNextZoneCenterX, t);
      this.brZoneCenterZ = THREE.MathUtils.lerp(this.brStartZoneCenterZ, this.brNextZoneCenterZ, t);
      this.brZoneRadius = THREE.MathUtils.lerp(this.brStartZoneRadius, this.brNextZoneRadius, t);

      if (this.brZoneTimer <= 0) {
        if (this.brZoneStage < 4) {
          this.brZoneStage += 1;
          this.brZonePhase = 'hold';
          const dur = holdDurs[Math.min(3, this.brZoneStage - 1)];
          this.brZoneTimer = dur;
          this.brZoneStageDuration = dur;
          this.pickNextZoneTarget(stageRadii[Math.min(4, this.brZoneStage)]);
        } else {
          this.brZonePhase = 'hold';
          this.brZoneTimer = 999;
        }
      }
    }

    if (this.brZoneWall && this.brZoneGroundRing) {
      this.brZoneWall.position.set(this.brZoneCenterX, 32, this.brZoneCenterZ);
      this.brZoneWall.scale.set(this.brZoneRadius, 1, this.brZoneRadius);
      this.brZoneGroundRing.position.set(this.brZoneCenterX, 0.35, this.brZoneCenterZ);
      this.brZoneGroundRing.scale.set(this.brZoneRadius, this.brZoneRadius, 1);
    }

    // Apply steady Storm Zone damage outside circle (skip static Airport Guards until player visits)
    const dps = stageDps[Math.min(3, this.brZoneStage - 1)];
    for (const actor of this.actors.values()) {
      if (!actor.alive || actor.brState === 'plane' || actor.guardRole) continue;
      const dist = Math.hypot(actor.x - this.brZoneCenterX, actor.z - this.brZoneCenterZ);
      if (dist > this.brZoneRadius) {
        this.damageActor(actor, dps * dt, 'storm_zone', 0, 0, true);
      }
    }

    // 3. Golden Airdrop Supply Drops every 60s
    this.brAirdropTimer -= dt;
    if (this.brAirdropTimer <= 0) {
      this.brAirdropTimer = 60;
      this.spawnAirdropCrate();
    }
    this.stepAirdrops(dt);
  }

  private spawnAirdropCrate(): void {
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * Math.max(12, Math.min(220, this.brZoneRadius * 0.55));
    const ax = Math.max(-180, Math.min(660, this.brZoneCenterX + Math.cos(angle) * rad));
    const az = Math.max(-275, Math.min(210, this.brZoneCenterZ + Math.sin(angle) * rad));
    const model = createAirdropCrateModel();
    model.group.position.set(ax, 84, az);
    this.scene.add(model.group);
    this.brAirdrops.push({
      id: `airdrop_${Date.now()}`,
      x: ax,
      y: 84,
      z: az,
      landed: false,
      opened: false,
      model,
    });
    soundEngine.playAirdropChime();
    this.showAnnouncement('GOLDEN SUPPLY AIRDROP INCOMING — FOLLOW THE GOLD BEAM!', 3.2);
  }

  private stepAirdrops(dt: number): void {
    for (let i = this.brAirdrops.length - 1; i >= 0; i--) {
      const drop = this.brAirdrops[i];
      if (drop.opened) continue;
      if (!drop.landed) {
        const targetY = Math.max(WATER_LEVEL + 0.1, this.getWalkableSurfaceY(drop.x, drop.y, drop.z, 1.0));
        drop.y -= 9.5 * dt;
        if (drop.y <= targetY) {
          drop.y = targetY;
          drop.landed = true;
          drop.model.chute.visible = false;
        }
        drop.model.group.position.set(drop.x, drop.y, drop.z);
      } else {
        drop.model.beam.rotation.y += dt * 1.4;
      }

      for (const actor of this.actors.values()) {
        if (!actor.alive || actor.knockedDown || actor.brState !== 'ground') continue;
        if (Math.hypot(actor.x - drop.x, actor.z - drop.z) < 3.0 && Math.abs(actor.y - drop.y) < 3.0) {
          drop.opened = true;
          this.scene.remove(drop.model.group);
          drop.model.dispose();
          this.brAirdrops.splice(i, 1);

          const eliteGuns: GunId[] = ['laser_blaster', 'sniper', 'assault_rifle'];
          const newGun = eliteGuns[Math.floor(Math.random() * eliteGuns.length)];
          actor.gunId = newGun;
          actor.rig.setWeapons(actor.gunId, actor.knifeId, actor.grenadeId);
          const gDef = getGunDef(newGun);
          actor.ammoInMag = gDef.magSize;
          actor.reserveAmmo = gDef.reserveMax < 0 ? -1 : gDef.magSize * 4;
          actor.armorLevel = 3;
          actor.armorMaxHp = 115;
          actor.armorHp = 115;
          actor.hp = Math.min(actor.maxHp, actor.hp + 55);
          actor.grenadeCount = Math.min(5, actor.grenadeCount + 2);
          actor.score += 75;
          if (actor.isLocal) {
            soundEngine.playAirdropChime();
            this.showAnnouncement(`AIRDROP LOOTED: ${gDef.name.toUpperCase()} + LV.3 ARMOR!`, 3.0);
          }
          break;
        }
      }
    }
  }

  private stepLocalInput(local: ActorEntity, dt: number): void {
    // Touch look delta
    if (this.touchState.lookDeltaX !== 0 || this.touchState.lookDeltaY !== 0) {
      const sens = 0.004 * (this.config.settings.cameraSensitivity || 1);
      const ySign = this.config.settings.invertY ? -1 : 1;
      this.camYaw -= this.touchState.lookDeltaX * sens;
      this.camPitch = this.clampPitch(this.camPitch + this.touchState.lookDeltaY * sens * ySign);
      this.touchState.lookDeltaX = 0;
      this.touchState.lookDeltaY = 0;
    }

    // One-shot touch buttons
    if (this.touchState.jumpPressed) {
      this.touchState.jumpPressed = false;
      this.tryJump(local);
    }
    if (this.touchState.dashPressed) {
      this.touchState.dashPressed = false;
      this.tryDash(local);
    }
    if (this.touchState.reloadPressed) {
      this.touchState.reloadPressed = false;
      this.startReload(local);
    }
    if (this.touchState.grenadePressed) {
      this.touchState.grenadePressed = false;
      this.throwGrenade(local);
    }
    if (this.touchState.switchWeaponPressed) {
      this.touchState.switchWeaponPressed = false;
      this.switchWeaponSlot(local, local.activeSlot === 'gun' ? 'knife' : 'gun');
    }
    if (this.touchState.interactPressed) {
      this.touchState.interactPressed = false;
      if (
        !this.tryOpenMissileConsole(local) &&
        !this.tryReplaceWithDroppedWeapon(local) &&
        !this.tryToggleNearestDoor(local) &&
        !this.tryConsumeNearestFruit(local)
      ) {
        this.tryToggleSitBench(local);
      }
    }
    if (this.touchState.mountPressed) {
      this.touchState.mountPressed = false;
      this.tryToggleMount(local);
    }
    if (this.touchState.cycleCameraPressed) {
      this.touchState.cycleCameraPressed = false;
      this.cycleCameraView();
    }
    if (this.touchState.crouchPressed) {
      this.touchState.crouchPressed = false;
      this.toggleCrouch(local);
    }

    if (!local.alive) return;

    // 360-degree aim follows camera yaw even when riding vehicle, boat, or horse!
    if (!local.isSitting) {
      local.yaw = this.camYaw;
    }
    local.pitch = -this.camPitch;

    if (local.brState === 'plane') {
      local.vx = 0;
      local.vy = 0;
      local.vz = 0;
      local.rig.root.visible = false;
      return;
    }

    let forward = 0;
    let strafe = 0;
    if (!this.inJail && !this.missileRoomOpen) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;

      forward += -this.touchState.moveY;
      strafe += this.touchState.moveX;
    }

    if (Math.hypot(forward, strafe) > 0.25 && local.activeEmoteAnim) {
      local.activeEmoteAnim = null;
      local.activeEmoteTimer = 0;
      this.activeEmote = null;
    }

    if (local.brState === 'freefall' || local.brState === 'parachute') {
      const glideSpeed = local.brState === 'freefall' ? 19 : 23;
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      let mx = -sinY * forward + cosY * strafe;
      let mz = -cosY * forward - sinY * strafe;
      const mLen = Math.hypot(mx, mz);
      if (mLen > 0.01) {
        mx = (mx / mLen) * Math.min(1, mLen) * glideSpeed;
        mz = (mz / mLen) * Math.min(1, mLen) * glideSpeed;
      }
      local.vx = THREE.MathUtils.lerp(local.vx, mx, 1 - Math.exp(-8 * dt));
      local.vz = THREE.MathUtils.lerp(local.vz, mz, 1 - Math.exp(-8 * dt));
      local.anim = 'jump';
      if (local.brState === 'freefall') {
        this.brWindSfxAccum += dt;
        if (this.brWindSfxAccum >= 0.45) {
          this.brWindSfxAccum = 0;
          soundEngine.playWindRush();
        }
      }
      return;
    }

    if (local.knockedDown) {
      if (local.mountedId) this.dismountActor(local, false);
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      let mx = -sinY * forward + cosY * strafe;
      let mz = -cosY * forward - sinY * strafe;
      const mLen = Math.hypot(mx, mz);
      if (mLen > 0.01) {
        mx = (mx / mLen) * Math.min(1, mLen) * 3.2;
        mz = (mz / mLen) * Math.min(1, mLen) * 3.2;
      }
      local.vx = THREE.MathUtils.lerp(local.vx, mx, 1 - Math.exp(-10 * dt));
      local.vz = THREE.MathUtils.lerp(local.vz, mz, 1 - Math.exp(-10 * dt));
      local.anim = 'crawl';
      return;
    }

    // Squad Battle Royale teammate revive (hold E or touch REVIVE)
    if (this.config.mode === 'battle_royale' && this.config.teamMode === 'team') {
      let revTarget: ActorEntity | null = null;
      let bestDist = 3.6;
      for (const other of this.actors.values()) {
        if (other.id === local.id || !other.alive || !other.knockedDown) continue;
        if (other.team !== local.team) continue;
        const d = Math.hypot(other.x - local.x, other.z - local.z);
        if (d < bestDist && Math.abs(other.y - local.y) < 3.0) {
          bestDist = d;
          revTarget = other;
        }
      }
      if (revTarget && (this.keys.has('KeyE') || this.touchState.reviveHeld)) {
        revTarget.reviveProgress += dt / 3.0;
        if (revTarget.reviveProgress >= 1) {
          revTarget.knockedDown = false;
          revTarget.hp = Math.min(revTarget.maxHp, 45);
          revTarget.reviveProgress = 0;
          revTarget.bleedoutTimer = 0;
          revTarget.anim = 'idle';
          soundEngine.playReviveComplete();
          this.showAnnouncement(`REVIVED ${revTarget.name.toUpperCase()}!`, 2.0);
        }
      }
    }

    if (local.isSitting) {
      if (Math.abs(forward) > 0.14 || Math.abs(strafe) > 0.14) {
        this.standUpFromBench(local);
        local.yaw = this.camYaw;
      } else {
        local.vx = 0;
        local.vz = 0;
        local.anim = 'sit';
        if (this.fireHeldMouse || this.touchState.fireHeld) {
          this.performPrimaryAttack(local);
        }
        return;
      }
    }

    if (local.mountedId) {
      const mount = this.mounts.get(local.mountedId);
      if (mount) {
        const isAir = Boolean(mount.isFlyingMount || mount.isHelicopter);
        const boostHeld =
          (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
          local.stamina > 2 &&
          (Math.abs(forward) > 0.1 || isAir);
        const brakeHeld = this.keys.has('Space') && !isLivingMountKind(mount.kind) && !mount.isHelicopter;
        if (boostHeld) {
          local.stamina = Math.max(0, local.stamina - 22 * dt);
        }
        if (isAir) {
          const flyUp = this.keys.has('Space') || this.touchState.jumpHeld;
          const flyDown = this.keys.has('KeyC') || this.keys.has('ControlLeft') || this.touchState.diveHeld;
          const targetVy = flyUp ? (boostHeld ? 24 : 18) : flyDown ? (boostHeld ? -26 : -19) : 0;
          mount.vy = THREE.MathUtils.lerp(mount.vy, targetVy, 1 - Math.exp(-6.5 * dt));
          local.isUnderwater = false;
          local.rig.setDivingHelmet(false);
        } else if (mount.isMarineMount) {
          const diveDown = this.keys.has('KeyC') || this.keys.has('ControlLeft') || this.touchState.diveHeld;
          const surfUp = this.keys.has('Space') || this.touchState.jumpHeld;
          if (diveDown) {
            mount.vy = Math.max(-4.2, mount.vy - 4.0 * dt);
          } else if (surfUp) {
            mount.vy = Math.min(0, mount.vy + 4.4 * dt);
          }
          local.isUnderwater = local.y < WATER_LEVEL;
          local.rig.setDivingHelmet(local.isUnderwater);
        } else {
          local.isUnderwater = false;
          local.rig.setDivingHelmet(false);
        }
        this.driveMount(mount, forward, strafe, dt, true, boostHeld, brakeHeld);
      }
      local.anim = local.activeAnimOverride ?? 'ride';
    } else {
      const lvStats = getLevelBonusStats(local.level);
      const baseSpeed =
        this.liveConfig.playerSpeed *
        lvStats.speedMult *
        (local.speedBoostTimer > 0 ? 1.35 : 1) *
        (local.fruitSpeedBoostTimer > 0 ? 1.15 : 1);
      if (local.isSwimming) local.isCrouching = false;
      const speed = local.isSwimming
        ? baseSpeed * 0.62
        : local.isCrouching
          ? baseSpeed * 0.68
          : baseSpeed;

      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      let mx = -sinY * forward + cosY * strafe;
      let mz = -cosY * forward - sinY * strafe;
      const mLen = Math.hypot(mx, mz);
      if (mLen > 0.01) {
        mx = (mx / mLen) * Math.min(1, mLen) * speed;
        mz = (mz / mLen) * Math.min(1, mLen) * speed;
      }

      if (local.dashTime > 0) {
        local.dashTime -= dt;
      } else {
        local.vx = THREE.MathUtils.lerp(local.vx, mx, 1 - Math.exp(-14 * dt));
        local.vz = THREE.MathUtils.lerp(local.vz, mz, 1 - Math.exp(-14 * dt));
      }

      if (local.activeAnimOverride) {
        local.anim = local.activeAnimOverride;
      } else if (local.isReloading) {
        local.anim = 'reload';
      } else if (local.isSwimming) {
        local.anim = local.isUnderwater ? 'diving' : 'swim';
      } else if (!local.grounded) {
        local.anim = 'jump';
      } else if (local.isCrouching) {
        local.anim = 'crouch';
      } else if (mLen > 0.7) {
        local.anim = 'run';
      } else if (mLen > 0.1) {
        local.anim = 'walk';
      } else if (local.activeEmoteAnim) {
        local.anim = local.activeEmoteAnim;
      } else {
        local.anim = 'idle';
      }
    }

    if ((this.fireHeldMouse || this.touchState.fireHeld) && !this.inJail && !this.missileRoomOpen) {
      this.performPrimaryAttack(local);
    }
  }

  private driveMount(
    mount: MountEntity,
    throttle: number,
    steer: number,
    dt: number,
    isLocal: boolean,
    boostHeld = false,
    brakeHeld = false
  ): void {
    const t = Math.max(-1, Math.min(1, throttle));
    const s = Math.max(-1, Math.min(1, steer));
    const isAir = Boolean(mount.isFlyingMount || mount.isHelicopter);
    const boostMult = boostHeld ? (isAir ? 1.52 : 1.38) : 1.0;
    const speedScale = mount.isBoat
      ? this.liveConfig.boatSpeedMultiplier
      : mount.isMarineMount || mount.isLandAnimal || mount.isFlyingMount
        ? this.liveConfig.creatureSpeedMultiplier
        : 1.0;
    const rawTarget =
      t >= 0
        ? t * mount.maxSpeed * boostMult * speedScale
        : t * mount.maxSpeed * (isAir ? 0.35 : 0.45) * speedScale;
    const targetSpeed = brakeHeld ? 0 : rawTarget;
    const accelRate = brakeHeld ? 7.5 : boostHeld ? 6.8 : 4.5;
    mount.speed = THREE.MathUtils.lerp(mount.speed, targetSpeed, 1 - Math.exp(-accelRate * dt));

    const driftTurnMult = brakeHeld && Math.abs(mount.speed) > 4 ? 1.65 : 1.0;
    const turnFactor = isAir
      ? 1.0
      : Math.abs(mount.speed) > 1.2
        ? mount.speed >= 0
          ? 1
          : -1
        : 0.65;
    mount.yaw -= s * mount.turnSpeed * turnFactor * driftTurnMult * dt;

    // Bike lean, Helicopter nose tilt, or Flying Bird bank & dive pitch
    if (mount.kind === 'bike') {
      mount.bodyGroup.rotation.z = THREE.MathUtils.lerp(mount.bodyGroup.rotation.z, s * 0.28, 1 - Math.exp(-8 * dt));
    } else if (mount.isHelicopter) {
      const targetBank = -s * 0.32;
      const targetPitch = THREE.MathUtils.clamp((mount.speed / Math.max(1, mount.maxSpeed)) * 0.22 - mount.vy * 0.015, -0.35, 0.35);
      mount.bodyGroup.rotation.z = THREE.MathUtils.lerp(mount.bodyGroup.rotation.z, targetBank, 1 - Math.exp(-6 * dt));
      mount.bodyGroup.rotation.x = THREE.MathUtils.lerp(mount.bodyGroup.rotation.x, targetPitch, 1 - Math.exp(-6 * dt));
    } else if (mount.isFlyingMount) {
      const targetBank = -s * 0.42;
      const targetPitch = THREE.MathUtils.clamp(-mount.vy * 0.025, -0.42, 0.42);
      mount.bodyGroup.rotation.z = THREE.MathUtils.lerp(mount.bodyGroup.rotation.z, targetBank, 1 - Math.exp(-7 * dt));
      mount.bodyGroup.rotation.x = THREE.MathUtils.lerp(mount.bodyGroup.rotation.x, targetPitch, 1 - Math.exp(-7 * dt));
    }

    // Turbo / drift / sky-swoop particles
    if (boostHeld && (Math.abs(mount.speed) > 8 || (isAir && Math.abs(mount.vy) > 4)) && Math.random() < 0.42) {
      this.spawnExplosionParticles(
        mount.x - Math.sin(mount.yaw) * mount.radius,
        mount.y + (isAir ? 0.65 : 0.45),
        mount.z - Math.cos(mount.yaw) * mount.radius,
        mount.isHelicopter ? 0x38bdf8 : mount.kind === 'sky_griffin' ? 0x7dd3fc : mount.kind === 'pterodactyl' ? 0xfb923c : mount.isFlyingMount ? 0xfef08a : mount.isLandAnimal ? 0xd6d3d1 : 0x38bdf8,
        1,
        0.5
      );
    } else if (brakeHeld && Math.abs(mount.speed) > 6 && Math.abs(s) > 0.2 && Math.random() < 0.4) {
      this.spawnExplosionParticles(mount.x, mount.y + 0.25, mount.z, 0xe2e8f0, 1, 0.55);
    }

    if (isLocal) {
      if (mount.isFlyingMount) {
        soundEngine.updateEngineSound(true, Math.min(1.25, Math.abs(mount.speed) / mount.maxSpeed), mount.kind);
        if (mount.vy > 2.5 || boostHeld || Math.abs(mount.speed) > 10) {
          mount.hoofAccum += dt * (boostHeld ? 3.2 : mount.vy > 2 ? 2.6 : 1.7);
          if (mount.hoofAccum >= 1) {
            mount.hoofAccum = 0;
            soundEngine.playWingFlap(boostHeld);
          }
        }
      } else if (mount.isLandAnimal) {
        soundEngine.updateEngineSound(false);
        if (Math.abs(mount.speed) > 4) {
          mount.hoofAccum += dt * (Math.abs(mount.speed) / 14);
          if (mount.hoofAccum >= 0.42) {
            mount.hoofAccum = 0;
            soundEngine.playHoofbeat();
          }
        }
      } else {
        soundEngine.updateEngineSound(true, Math.min(1.25, Math.abs(mount.speed) / mount.maxSpeed), mount.kind);
      }
    }
  }

  private stepMounts(dt: number): void {
    for (const mount of this.mounts.values()) {
      if (!mount.alive) {
        mount.respawnTimer -= dt;
        if (mount.respawnTimer <= 0) {
          mount.alive = true;
          mount.hp = mount.maxHp;
          mount.x = mount.spawnX;
          mount.y = mount.spawnY;
          mount.z = mount.spawnZ;
          mount.yaw = mount.spawnYaw;
          mount.speed = 0;
          mount.riderId = null;
          mount.root.visible = true;
          mount.hpBarFill.scale.x = 1;
          mount.hpBarFill.position.x = 0;
          (mount.hpBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
        }
        continue;
      }

      if (mount.fireCooldown && mount.fireCooldown > 0) {
        mount.fireCooldown = Math.max(0, mount.fireCooldown - dt);
      }

      // Spin Helicopter Main & Tail Rotors cleanly when occupied or freshly landed
      if (mount.isHelicopter && mount.propsToSpin) {
        const rotorRate = mount.riderId ? 24 : Math.abs(mount.speed) > 1 ? 14 : 2.2;
        if (mount.propsToSpin[0]) mount.propsToSpin[0].rotation.y += dt * rotorRate;
        if (mount.propsToSpin[1]) mount.propsToSpin[1].rotation.x += dt * (rotorRate * 1.4);
      }

      // Flash Police Red/Blue Sirens when active!
      if (mount.isPolice && mount.sirenMeshes && mount.sirenMeshes.length >= 2) {
        const redOn = Math.floor(this.elapsed * 8) % 2 === 0;
        const sirenActive = Boolean(mount.riderId) || this.wantedLevel > 0;
        (mount.sirenMeshes[0].material as THREE.MeshBasicMaterial).color.setHex(
          sirenActive && redOn ? 0xff1e42 : 0x7f1d1d
        );
        (mount.sirenMeshes[1].material as THREE.MeshBasicMaterial).color.setHex(
          sirenActive && !redOn ? 0x38bdf8 : 0x1e3a8a
        );
      }

      // Rotate Tank Turret toward rider aim yaw
      if (mount.isTank && mount.turretPivot && mount.riderId) {
        const rider = this.actors.get(mount.riderId);
        if (rider) {
          const desiredLocalYaw = rider.yaw + Math.PI - mount.yaw;
          mount.turretPivot.rotation.y = desiredLocalYaw;
        }
      }

      // Autonomous gentle wandering for unmounted land animals & safe perched hover for unmounted Giant Birds / Helis
      if (mount.isLandAnimal && !mount.riderId) {
        mount.wanderTimer -= dt;
        if (mount.wanderTimer <= 0) {
          mount.wanderTimer = 2.5 + Math.random() * 3.5;
          mount.wanderAngle = (Math.random() - 0.5) * Math.PI * 2;
        }
        const distMain = Math.hypot(mount.x, mount.z);
        const distTribal = Math.hypot(mount.x - TRIBAL_ISLAND_CENTER.x, mount.z - TRIBAL_ISLAND_CENTER.z);
        if (distMain > 155 && distTribal > 185) {
          mount.wanderAngle = Math.atan2(-mount.z, -mount.x);
        }
        mount.yaw = THREE.MathUtils.lerp(mount.yaw, mount.wanderAngle, 1 - Math.exp(-2 * dt));
        mount.speed = mount.kind === 'cheetah' ? 5.8 : 3.8;
      } else if (mount.isFlyingMount && !mount.riderId) {
        mount.speed = THREE.MathUtils.lerp(mount.speed, 0, 1 - Math.exp(-3.5 * dt));
        const perchGround = Math.max(
          WATER_LEVEL + 0.9,
          this.getWalkableSurfaceY(mount.x, mount.y, mount.z, mount.radius * 0.5)
        );
        const targetPerchY = Math.max(perchGround + 1.2, mount.spawnY);
        mount.vy = (targetPerchY - mount.y) * 1.8;
        mount.bodyGroup.rotation.z = THREE.MathUtils.lerp(mount.bodyGroup.rotation.z, 0, 1 - Math.exp(-5 * dt));
        mount.bodyGroup.rotation.x = THREE.MathUtils.lerp(mount.bodyGroup.rotation.x, 0, 1 - Math.exp(-5 * dt));
      } else if (mount.isHelicopter && !mount.riderId) {
        mount.speed = THREE.MathUtils.lerp(mount.speed, 0, 1 - Math.exp(-4 * dt));
        const landFloor = Math.max(
          WATER_LEVEL + 0.4,
          this.getWalkableSurfaceY(mount.x, mount.y + 1.5, mount.z, mount.radius * 0.55)
        );
        if (mount.y > landFloor + 0.1) {
          mount.vy = Math.max(-10, mount.vy - 18 * dt);
        } else {
          mount.vy = 0;
          mount.y = landFloor;
        }
        mount.bodyGroup.rotation.z = THREE.MathUtils.lerp(mount.bodyGroup.rotation.z, 0, 1 - Math.exp(-5 * dt));
        mount.bodyGroup.rotation.x = THREE.MathUtils.lerp(mount.bodyGroup.rotation.x, 0, 1 - Math.exp(-5 * dt));
      } else if (!mount.riderId) {
        mount.speed = THREE.MathUtils.lerp(mount.speed, 0, 1 - Math.exp(-4 * dt));
        if (mount.isMarineMount) {
          mount.vy = THREE.MathUtils.lerp(mount.vy, 0, 1 - Math.exp(-2 * dt));
        }
      }

      const prevX = mount.x;
      const prevZ = mount.z;
      const sinY = Math.sin(mount.yaw);
      const cosY = Math.cos(mount.yaw);
      const nextX = mount.x + sinY * mount.speed * dt;
      const nextZ = mount.z + cosY * mount.speed * dt;
      const mountBound = this.arena.halfSize - 18;

      if (mount.isFlyingMount || mount.isHelicopter) {
        // Full 3D aerial flight across island, Airport, Sea Bridge, ocean, ships & volcano!
        let blocked = Math.abs(nextX) > mountBound || Math.abs(nextZ) > mountBound;
        if (!blocked && mount.y < 14) {
          const cols = this.arena.queryColliders(
            nextX - mount.radius * 0.65,
            nextX + mount.radius * 0.65,
            nextZ - mount.radius * 0.65,
            nextZ + mount.radius * 0.65
          );
          for (const c of cols) {
            if (c.kind === 'floor' || c.kind === 'ramp') continue;
            if (mount.y + 1.4 > c.minY && mount.y + 0.2 < c.maxY) {
              blocked = true;
              break;
            }
          }
        }
        if (blocked) {
          mount.speed *= -0.15;
        } else {
          mount.x = nextX;
          mount.z = nextZ;
        }

        const minFloor = Math.max(
          WATER_LEVEL + 0.45,
          this.getWalkableSurfaceY(mount.x, mount.y + 1.5, mount.z, mount.radius * 0.5) + (mount.isHelicopter ? 0.05 : 0.35)
        );
        mount.y = THREE.MathUtils.clamp(mount.y + mount.vy * dt, minFloor, 118);
        if (mount.y <= minFloor + 0.05 && mount.vy < 0) {
          mount.vy = 0;
        }
      } else if (mount.isBoat || mount.isMarineMount) {
        // Keep boats & rideable marine creatures in navigable water & away from rocks/map edge
        const groundY = this.arena.getGroundHeightAt(nextX, nextZ);
        const maxAllowedGround =
          mount.isMarineMount || mount.kind === 'jetski' || mount.kind === 'speedboat'
            ? WATER_LEVEL - 0.05
            : WATER_LEVEL - 0.35;
        let blocked = groundY > maxAllowedGround || Math.abs(nextX) > mountBound || Math.abs(nextZ) > mountBound;

        if (!blocked) {
          const checkR = Math.min(3.5, mount.radius * 0.55);
          const cols = this.arena.queryColliders(nextX - checkR, nextX + checkR, nextZ - checkR, nextZ + checkR);
          for (const c of cols) {
            if (c.kind === 'ramp') continue;
            if (mount.y + 1.8 > c.minY && mount.y - 0.3 < c.maxY) {
              blocked = true;
              break;
            }
          }
        }

        if (blocked) {
          mount.speed *= -0.25;
        } else {
          mount.x = nextX;
          mount.z = nextZ;
        }

        if (mount.isMarineMount) {
          const minSeaY = this.arena.getGroundHeightAt(mount.x, mount.z) + 0.65;
          const waveBob = Math.sin(this.elapsed * 2.4 + mount.x * 0.07) * 0.1;
          const desiredY = Math.max(
            minSeaY,
            WATER_LEVEL - mount.seatY + 0.06 + mount.vy + waveBob
          );
          mount.y = THREE.MathUtils.lerp(mount.y, desiredY, 1 - Math.exp(-8 * dt));
          mount.y = Math.max(minSeaY, mount.y);
        } else {
          const waveAmp = mount.kind === 'battleship' ? 0.08 : 0.15;
          mount.y = WATER_LEVEL + Math.sin(this.elapsed * 2.1 + mount.x * 0.07 + mount.z * 0.07) * waveAmp;
          mount.vy = 0;
        }

        const speedPitch = THREE.MathUtils.clamp(-mount.speed * 0.0035, -0.09, 0.05);
        mount.bodyGroup.rotation.x = THREE.MathUtils.lerp(
          mount.bodyGroup.rotation.x,
          speedPitch + Math.sin(this.elapsed * 1.7 + mount.z * 0.08) * 0.025,
          1 - Math.exp(-6 * dt)
        );
        mount.bodyGroup.rotation.z = THREE.MathUtils.lerp(
          mount.bodyGroup.rotation.z,
          Math.cos(this.elapsed * 1.4 + mount.x * 0.08) * 0.028,
          1 - Math.exp(-6 * dt)
        );

        // Propeller, Radar & Marine Tail Wag
        if (mount.propsToSpin) {
          for (const p of mount.propsToSpin) {
            if (mount.isMarineMount) {
              const wag = Math.sin(this.elapsed * (6 + Math.abs(mount.speed) * 0.32)) * 0.44;
              if (mount.kind === 'whale_mount') {
                p.rotation.x = wag * 0.72;
              } else {
                p.rotation.y = wag;
              }
            } else if (mount.kind === 'battleship') {
              p.rotation.y += dt * 1.8;
            } else {
              p.rotation.z += dt * (3 + Math.abs(mount.speed) * 1.8);
            }
          }
        }

        // White foam wake / bubble particles behind moving boats & marine mounts
        if (Math.abs(mount.speed) > 3.2) {
          mount.wakeTimer = (mount.wakeTimer ?? 0) - dt;
          if (mount.wakeTimer <= 0) {
            mount.wakeTimer = mount.kind === 'jetski' || mount.kind === 'speedboat' || mount.isMarineMount ? 0.06 : 0.11;
            const wakeOff = mount.wakeOffsetZ ?? 2.8;
            const wx = mount.x - sinY * wakeOff + (Math.random() - 0.5) * 0.8;
            const wz = mount.z - cosY * wakeOff + (Math.random() - 0.5) * 0.8;
            this.spawnExplosionParticles(
              wx,
              mount.isMarineMount ? mount.y + 0.15 : WATER_LEVEL + 0.06,
              wz,
              mount.isMarineMount ? 0xbae6fd : 0xe0f2fe,
              2,
              mount.kind === 'battleship' ? 1.15 : 0.65
            );
          }
        }
      } else {
        // Keep land vehicles & land animals on island bounds (Main + 5x Tribal Island) & stop at deep sea / walls
        const groundY = this.arena.getGroundHeightAt(nextX, nextZ);
        let blocked = groundY < WATER_LEVEL - 0.7 || Math.abs(nextX) > mountBound || Math.abs(nextZ) > mountBound;

        if (!blocked) {
          const cols = this.arena.queryColliders(nextX - mount.radius, nextX + mount.radius, nextZ - mount.radius, nextZ + mount.radius);
          for (const c of cols) {
            if (c.kind === 'floor' || c.kind === 'ramp') continue;
            if (mount.y + 1.8 > c.minY && mount.y + 0.3 < c.maxY) {
              blocked = true;
              break;
            }
          }
        }

        if (blocked) {
          mount.speed *= -0.25;
          mount.wanderAngle += Math.PI * 0.7;
        } else {
          mount.x = nextX;
          mount.z = nextZ;
        }

        // Gravity + strict terrain ground follow (never sink into hills or volcano slopes)
        const rawTerrain = this.arena.getGroundHeightAt(mount.x, mount.z);
        const targetGround = Math.max(
          rawTerrain,
          WATER_LEVEL - 0.5,
          this.getWalkableSurfaceY(mount.x, mount.y, mount.z, mount.radius * 0.6)
        );
        mount.vy -= 36 * dt;
        mount.y += mount.vy * dt;
        if (mount.y <= targetGround) {
          mount.y = targetGround;
          mount.vy = 0;
        }
      }

      // Rhino & Gorilla Sprint Charge Smash against enemy bots/players
      if (mount.riderId && (mount.kind === 'rhino' || mount.kind === 'gorilla') && Math.abs(mount.speed) > 16) {
        const cds = mount.impactCooldowns ?? {};
        mount.impactCooldowns = cds;
        for (const key of Object.keys(cds)) {
          cds[key] -= dt;
          if (cds[key] <= 0) delete cds[key];
        }
        const hitR = mount.radius + 1.35;
        for (const other of this.actors.values()) {
          if (!other.alive || other.id === mount.riderId || cds[other.id]) continue;
          if (this.isFriendly(mount.riderId, other)) continue;
          const d = Math.hypot(other.x - mount.x, other.z - mount.z);
          if (d < hitR && Math.abs(other.y - mount.y) < 2.8) {
            cds[other.id] = 0.75;
            const dmg = mount.kind === 'rhino' ? 32 : 24;
            const kDirX = (other.x - mount.x) / Math.max(0.2, d);
            const kDirZ = (other.z - mount.z) / Math.max(0.2, d);
            other.vy = Math.max(other.vy, 9.5);
            this.damageActor(other, dmg, mount.riderId, kDirX * 16, kDirZ * 16);
            this.spawnExplosionParticles(other.x, other.y + 1.0, other.z, 0xfef08a, 8, 0.8);
          }
        }
      }

      mount.root.position.set(mount.x, mount.y, mount.z);
      mount.root.rotation.y = mount.yaw;
      mount.hpBarGroup.lookAt(this.camera.position);

      // Carry unmounted fighters standing on walkable ship decks
      if (mount.deckBoxes) {
        const moveDx = mount.x - prevX;
        const moveDz = mount.z - prevZ;
        if (Math.abs(moveDx) > 1e-5 || Math.abs(moveDz) > 1e-5) {
          for (const actor of this.actors.values()) {
            if (!actor.alive || actor.mountedId || actor.isSwimming || actor.brState !== 'ground') continue;
            if (actor.y >= mount.y + 0.6 && Math.hypot(actor.x - mount.x, actor.z - mount.z) <= mount.radius + 1.4) {
              actor.x += moveDx;
              actor.z += moveDz;
            }
          }
        }
      }

      // Animate wheels, legs, marine flippers, and flying bird wings
      for (const w of mount.wheels) {
        w.rotation.x += mount.speed * dt * 1.4;
      }
      if (mount.legs.length === 4) {
        const legAmp = Math.min(0.85, Math.abs(mount.speed) * 0.045);
        mount.legs[0].rotation.x = Math.sin(this.elapsed * 12) * legAmp;
        mount.legs[1].rotation.x = -Math.sin(this.elapsed * 12) * legAmp;
        mount.legs[2].rotation.x = -Math.sin(this.elapsed * 12) * legAmp;
        mount.legs[3].rotation.x = Math.sin(this.elapsed * 12) * legAmp;
      }
      if (mount.wings) {
        if (mount.isFlyingMount) {
          const isGliding = Boolean(mount.riderId && mount.vy < -1.5 && Math.abs(mount.speed) > 16);
          const flapFreq = !mount.riderId ? 3.8 : mount.vy > 2 ? 12.5 : Math.abs(mount.speed) > 22 ? 9.5 : 5.5;
          mount.flapAccum = (mount.flapAccum ?? 0) + dt * flapFreq;
          const flapAmp = isGliding ? 0.1 : !mount.riderId ? 0.38 : mount.vy > 2 ? 0.72 : 0.52;
          const flap = Math.sin(mount.flapAccum) * flapAmp;
          mount.wings[0].rotation.z = flap;
          mount.wings[1].rotation.z = -flap;
          if (mount.tailPivot) {
            mount.tailPivot.rotation.x = THREE.MathUtils.clamp(-mount.vy * 0.02, -0.35, 0.35) + Math.sin(this.elapsed * 4) * 0.08;
          }
          if (mount.kind === 'sky_griffin' && mount.riderId && Math.random() < 0.28) {
            this.spawnExplosionParticles(mount.x, mount.y + 0.6, mount.z, 0x38bdf8, 1, 0.38);
          }
        } else if (mount.isMarineMount) {
          const swimFlap = Math.sin(this.elapsed * (4.5 + Math.abs(mount.speed) * 0.22)) * 0.38;
          mount.wings[0].rotation.z = swimFlap;
          mount.wings[1].rotation.z = -swimFlap;
        }
      }
      if (mount.tailPivot && mount.isLandAnimal) {
        mount.tailPivot.rotation.y = Math.sin(this.elapsed * (5 + Math.abs(mount.speed) * 0.25)) * 0.32;
      }

      // Sync seated rider
      if (mount.riderId) {
        const rider = this.actors.get(mount.riderId);
        if (rider && rider.alive) {
          if (mount.helmLocalPos) {
            const helmW = boatLocalToWorld(mount.helmLocalPos.x, mount.helmLocalPos.y, mount.helmLocalPos.z, mount);
            rider.x = helmW.x;
            rider.y = helmW.y;
            rider.z = helmW.z;
          } else {
            rider.x = mount.x;
            rider.y = mount.y + mount.seatY;
            rider.z = mount.z;
          }
          rider.grounded = true;
        }
      }

      // Smoke & fire particles when mechanical vehicle/boat HP drops (never on living animals/birds)
      if (!isLivingMountKind(mount.kind) && mount.hp < mount.maxHp * 0.55) {
        mount.smokeTimer -= dt;
        if (mount.smokeTimer <= 0) {
          mount.smokeTimer = mount.hp < mount.maxHp * 0.28 ? 0.07 : 0.16;
          const isFire = mount.hp < mount.maxHp * 0.28;
          this.spawnExplosionParticles(
            mount.x,
            mount.y + (mount.kind === 'battleship' ? 3.2 : 1.4),
            mount.z,
            isFire ? 0xf97316 : 0x475569,
            1,
            isFire ? 0.75 : 0.9
          );
        }
      }
    }
  }

  private getWaterSurfaceAt(x: number, z: number): number {
    for (let i = 0; i < this.arena.ponds.length; i++) {
      const p = this.arena.ponds[i];
      if (Math.hypot(x - p.x, z - p.z) <= p.radius + 1.5) {
        return p.surfaceY;
      }
    }
    return WATER_LEVEL;
  }

  private getWalkableSurfaceY(x: number, currentY: number, z: number, radius: number): number {
    let bestY = this.arena.getGroundHeightAt(x, z);
    const cols = this.arena.queryColliders(x - radius, x + radius, z - radius, z + radius);
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (x + radius < c.minX || x - radius > c.maxX || z + radius < c.minZ || z - radius > c.maxZ) continue;
      if (c.kind === 'ramp' && c.slopeAxis && c.slopeDir) {
        const tRaw =
          c.slopeAxis === 'z'
            ? (z - c.minZ) / Math.max(0.1, c.maxZ - c.minZ)
            : (x - c.minX) / Math.max(0.1, c.maxX - c.minX);
        const t = Math.max(0, Math.min(1, c.slopeDir > 0 ? tRaw : 1 - tRaw));
        const rampY = c.minY + 0.3 + t * (c.maxY - (c.minY + 0.3));
        if (rampY <= currentY + 1.65 && rampY > bestY) {
          bestY = rampY;
        }
      } else if (c.kind === 'floor' || c.kind === 'wall') {
        if (c.maxY <= currentY + 1.15 && c.maxY > bestY) {
          bestY = c.maxY;
        }
      }
    }

    // Walkable Multi-Deck Ships (Pirate Boats & Naval Battleships)
    for (const m of this.mounts.values()) {
      if (!m.alive || !m.deckBoxes) continue;
      if (Math.hypot(x - m.x, z - m.z) > m.radius + radius + 3.0) continue;
      const { lx, lz } = worldToBoatLocalXZ(x, z, m);
      const ly = currentY - m.y;
      for (let i = 0; i < m.deckBoxes.length; i++) {
        const c = m.deckBoxes[i];
        if (lx + radius < c.minX || lx - radius > c.maxX || lz + radius < c.minZ || lz - radius > c.maxZ) continue;
        if (c.kind === 'ramp' && c.slopeAxis && c.slopeDir) {
          const tRaw =
            c.slopeAxis === 'z'
              ? (lz - c.minZ) / Math.max(0.1, c.maxZ - c.minZ)
              : (lx - c.minX) / Math.max(0.1, c.maxX - c.minX);
          const t = Math.max(0, Math.min(1, c.slopeDir > 0 ? tRaw : 1 - tRaw));
          const rampLocalY = c.minY + 0.15 + t * (c.maxY - (c.minY + 0.15));
          if (rampLocalY <= ly + 1.65 && m.y + rampLocalY > bestY) {
            bestY = m.y + rampLocalY;
          }
        } else if (c.kind === 'floor' || c.kind === 'wall') {
          if (c.maxY <= ly + 1.15 && m.y + c.maxY > bestY) {
            bestY = m.y + c.maxY;
          }
        }
      }
    }

    return bestY;
  }

  private stepActorPhysics(actor: ActorEntity, dt: number): void {
    if (actor.brState === 'plane') return;

    const rad = 0.55;
    const maxBound = this.arena.halfSize - 8;

    if (actor.brState === 'freefall' || actor.brState === 'parachute') {
      actor.x = Math.max(-maxBound, Math.min(maxBound, actor.x + actor.vx * dt));
      actor.z = Math.max(-maxBound, Math.min(maxBound, actor.z + actor.vz * dt));
      const surfaceY = Math.max(
        WATER_LEVEL - 0.5,
        this.getWalkableSurfaceY(actor.x, actor.y, actor.z, rad)
      );
      if (actor.brState === 'freefall') {
        actor.vy = Math.max(-26, actor.vy - 22 * dt);
        actor.y += actor.vy * dt;
        if (actor.y - surfaceY <= 22) {
          this.openParachute(actor);
        }
      } else {
        actor.vy = -8.5;
        actor.y += actor.vy * dt;
        if (actor.y <= surfaceY + 0.15) {
          actor.y = surfaceY;
          actor.vy = 0;
          actor.grounded = true;
          actor.jumpsLeft = 2;
          this.closeParachute(actor);
        }
      }
      return;
    }

    actor.x += actor.vx * dt;
    this.resolveHorizontalCollisions(actor, rad, 'x');
    actor.z += actor.vz * dt;
    this.resolveHorizontalCollisions(actor, rad, 'z');

    // Keep inside island+ocean play boundary
    actor.x = Math.max(-maxBound, Math.min(maxBound, actor.x));
    actor.z = Math.max(-maxBound, Math.min(maxBound, actor.z));

    const terrainY = this.arena.getGroundHeightAt(actor.x, actor.z);
    const surfaceY = this.getWalkableSurfaceY(actor.x, actor.y, actor.z, rad);
    const localWaterLevel = this.getWaterSurfaceAt(actor.x, actor.z);
    const inDeepWater = terrainY < localWaterLevel - 0.15 && surfaceY < localWaterLevel - 0.15;

    if (inDeepWater && actor.y <= localWaterLevel + 0.08) {
      actor.isSwimming = true;
      actor.jumpsLeft = 1;
      if (actor.isLocal) {
        if (this.keys.has('KeyC') || this.keys.has('ControlLeft')) {
          actor.diveDepthOffset = Math.min(4.8, Math.max(0.24, actor.diveDepthOffset + 4.8 * dt));
        }
        if (this.keys.has('Space') && actor.diveDepthOffset > 0) {
          actor.diveDepthOffset = Math.max(0, actor.diveDepthOffset - 5.4 * dt);
        }
      } else {
        actor.diveDepthOffset = 0;
      }

      const minFloorY = terrainY + 0.5;
      const targetSwimY =
        actor.diveDepthOffset <= 0.05
          ? Math.max(minFloorY, localWaterLevel + 0.02)
          : Math.max(minFloorY, localWaterLevel - 0.12 - actor.diveDepthOffset);
      actor.vy += (targetSwimY - actor.y) * 14 * dt;
      actor.vy *= Math.exp(-5 * dt);
      actor.y = Math.max(minFloorY, actor.y + actor.vy * dt);
      actor.grounded = false;

      const wasUnderwater = actor.isUnderwater;
      actor.isUnderwater = actor.y < localWaterLevel;
      actor.rig.setDivingHelmet(actor.isUnderwater);
      if (actor.isUnderwater) {
        actor.anim = 'diving';
      }

      if (actor.isLocal && actor.isUnderwater) {
        if (!wasUnderwater) {
          soundEngine.playBubbleDive();
          if (!this.divingAnnounced) {
            this.divingAnnounced = true;
            this.showAnnouncement('DIVING HELMET EQUIPPED — INFINITE O₂ · EXPLORE SEA CAVES & PEARLS!', 3.0);
          }
        }
        this.bubbleSfxAccum += dt;
        if (this.bubbleSfxAccum >= 0.45) {
          this.bubbleSfxAccum = 0;
          this.spawnExplosionParticles(actor.x, actor.y + 1.65, actor.z, 0xe0f2fe, 1, 0.28);
        }
      }

      const moveSp = Math.hypot(actor.vx, actor.vz);
      if (!actor.isUnderwater && moveSp > 1.5) {
        actor.splashAccum += dt;
        if (actor.splashAccum > 0.25) {
          actor.splashAccum = 0;
          this.spawnExplosionParticles(actor.x, localWaterLevel + 0.05, actor.z, 0xe0f2fe, 2, 0.55);
          if (actor.isLocal) soundEngine.playSplash();
        }
      }
    } else {
      actor.isSwimming = false;
      actor.diveDepthOffset = 0;
      const gForce = actor.isLocal ? this.liveConfig.gravity : 36;
      actor.vy -= gForce * dt;
      actor.y += actor.vy * dt;
      if (actor.y <= surfaceY) {
        actor.y = surfaceY;
        actor.vy = 0;
        actor.grounded = true;
        actor.jumpsLeft = 2;
      } else {
        actor.grounded = false;
      }
      const underNow = inDeepWater && actor.y < localWaterLevel;
      actor.isUnderwater = underNow;
      actor.rig.setDivingHelmet(underNow);
    }

    // Strict post-step solid terrain / seabed floor enforcement (prevents sinking on slopes, beaches & caves)
    const finalTerrainY = this.arena.getGroundHeightAt(actor.x, actor.z);
    const finalWaterLevel = this.getWaterSurfaceAt(actor.x, actor.z);
    const finalSurfaceY = this.getWalkableSurfaceY(actor.x, actor.y, actor.z, rad);
    if (finalTerrainY >= finalWaterLevel - 0.15) {
      if (actor.y < finalSurfaceY) {
        actor.y = finalSurfaceY;
        if (actor.vy < 0) actor.vy = 0;
        actor.grounded = true;
        actor.jumpsLeft = Math.max(actor.jumpsLeft, 2);
      }
      actor.isUnderwater = false;
      actor.rig.setDivingHelmet(false);
    } else {
      const seabedMinY = finalTerrainY + 0.5;
      if (actor.y < seabedMinY) {
        actor.y = seabedMinY;
        if (actor.vy < 0) actor.vy = 0;
      }
    }

    // Bounce Pads
    for (const bp of this.arena.bouncePads) {
      if (Math.hypot(actor.x - bp.x, actor.z - bp.z) < bp.radius && Math.abs(actor.y - bp.y) < 1.8) {
        actor.vy = bp.impulse;
        actor.grounded = false;
        actor.jumpsLeft = 1;
        if (actor.isLocal) soundEngine.playBouncePad();
      }
    }
  }

  private resolveHorizontalCollisions(actor: ActorEntity, rad: number, axis: 'x' | 'z'): void {
    const cols = this.arena.queryColliders(actor.x - rad - 0.5, actor.x + rad + 0.5, actor.z - rad - 0.5, actor.z + rad + 0.5);
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c.kind === 'ramp') continue;
      if (actor.y + 1.9 <= c.minY || actor.y + 0.7 >= c.maxY) continue;
      if (actor.x + rad > c.minX && actor.x - rad < c.maxX && actor.z + rad > c.minZ && actor.z - rad < c.maxZ) {
        if (axis === 'x') {
          if (actor.vx > 0) actor.x = c.minX - rad - 0.002;
          else if (actor.vx < 0) actor.x = c.maxX + rad + 0.002;
          actor.vx = 0;
        } else {
          if (actor.vz > 0) actor.z = c.minZ - rad - 0.002;
          else if (actor.vz < 0) actor.z = c.maxZ + rad + 0.002;
          actor.vz = 0;
        }
      }
    }

    // Ship deck superstructures & container cover walls
    for (const m of this.mounts.values()) {
      if (!m.alive || !m.deckBoxes) continue;
      if (Math.hypot(actor.x - m.x, actor.z - m.z) > m.radius + rad + 3.0) continue;
      const localXZ = worldToBoatLocalXZ(actor.x, actor.z, m);
      let lx = localXZ.lx;
      let lz = localXZ.lz;
      const ly = actor.y - m.y;
      let pushed = false;
      for (let i = 0; i < m.deckBoxes.length; i++) {
        const c = m.deckBoxes[i];
        if (c.kind !== 'wall') continue;
        if (ly + 1.9 <= c.minY || ly + 0.7 >= c.maxY) continue;
        if (lx + rad > c.minX && lx - rad < c.maxX && lz + rad > c.minZ && lz - rad < c.maxZ) {
          const overlapLeft = lx + rad - c.minX;
          const overlapRight = c.maxX - (lx - rad);
          const overlapFront = lz + rad - c.minZ;
          const overlapBack = c.maxZ - (lz - rad);
          const minOv = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack);
          if (minOv === overlapLeft) lx = c.minX - rad - 0.002;
          else if (minOv === overlapRight) lx = c.maxX + rad + 0.002;
          else if (minOv === overlapFront) lz = c.minZ - rad - 0.002;
          else lz = c.maxZ + rad + 0.002;
          pushed = true;
        }
      }
      if (pushed) {
        const wPos = boatLocalToWorld(lx, ly, lz, m);
        actor.x = wPos.x;
        actor.z = wPos.z;
      }
    }
  }

  private stepBotAI(bot: ActorEntity, dt: number): void {
    if (bot.brState === 'plane') return;

    if (bot.brState === 'freefall') {
      const groundH = Math.max(WATER_LEVEL, this.arena.getGroundHeightAt(bot.x, bot.z));
      const toCenterYaw = Math.atan2(-bot.x, -bot.z);
      bot.yaw = toCenterYaw + Math.PI;
      bot.vx = Math.sin(bot.yaw) * -13;
      bot.vz = Math.cos(bot.yaw) * -13;
      bot.anim = 'jump';
      if (bot.y - groundH <= 25) {
        this.openParachute(bot);
      }
      return;
    }

    if (bot.brState === 'parachute') {
      const tx = this.brNextZoneCenterX;
      const tz = this.brNextZoneCenterZ;
      const dx = tx - bot.x;
      const dz = tz - bot.z;
      const d = Math.max(1, Math.hypot(dx, dz));
      bot.vx = (dx / d) * 16;
      bot.vz = (dz / d) * 16;
      bot.yaw = Math.atan2(-dx, -dz);
      bot.anim = 'jump';
      return;
    }

    if (bot.knockedDown) {
      if (bot.mountedId) this.dismountActor(bot, false);
      let standingAlly: ActorEntity | null = null;
      let allyDist = 9999;
      for (const other of this.actors.values()) {
        if (other.id === bot.id || !other.alive || other.knockedDown || other.team !== bot.team) continue;
        const d = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (d < allyDist) {
          allyDist = d;
          standingAlly = other;
        }
      }
      if (standingAlly && allyDist > 2.2) {
        const dx = standingAlly.x - bot.x;
        const dz = standingAlly.z - bot.z;
        bot.vx = (dx / allyDist) * 2.6;
        bot.vz = (dz / allyDist) * 2.6;
        bot.yaw = Math.atan2(-dx, -dz);
      } else {
        bot.vx = 0;
        bot.vz = 0;
      }
      bot.anim = 'crawl';
      return;
    }

    bot.botDecisionTimer -= dt;
    bot.botJumpTimer -= dt;
    bot.botWantMountTimer -= dt;

    // Squad BR: bots revive nearby knocked allies
    if (this.config.mode === 'battle_royale' && this.config.teamMode === 'team' && !bot.mountedId) {
      let knockedAlly: ActorEntity | null = null;
      let bestAllyD = 18;
      for (const other of this.actors.values()) {
        if (other.id === bot.id || !other.alive || !other.knockedDown || other.team !== bot.team) continue;
        const d = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (d < bestAllyD) {
          bestAllyD = d;
          knockedAlly = other;
        }
      }
      if (knockedAlly) {
        const dx = knockedAlly.x - bot.x;
        const dz = knockedAlly.z - bot.z;
        bot.yaw = Math.atan2(-dx, -dz);
        if (bestAllyD <= 3.3) {
          bot.vx = 0;
          bot.vz = 0;
          bot.anim = 'idle';
          knockedAlly.reviveProgress += dt / 3.0;
          if (knockedAlly.reviveProgress >= 1) {
            knockedAlly.knockedDown = false;
            knockedAlly.hp = Math.min(knockedAlly.maxHp, 45);
            knockedAlly.reviveProgress = 0;
            knockedAlly.bleedoutTimer = 0;
            knockedAlly.anim = 'idle';
          }
          return;
        } else {
          bot.vx = (dx / bestAllyD) * 9.5;
          bot.vz = (dz / bestAllyD) * 9.5;
          bot.anim = bot.grounded ? 'run' : 'jump';
          return;
        }
      }
    }

    // BR Safe Zone priority: run inward if outside or near edge
    if (this.config.mode === 'battle_royale') {
      const zoneDist = Math.hypot(bot.x - this.brZoneCenterX, bot.z - this.brZoneCenterZ);
      if (zoneDist > this.brZoneRadius * 0.85) {
        const dx = this.brNextZoneCenterX - bot.x;
        const dz = this.brNextZoneCenterZ - bot.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        if (bot.mountedId) {
          const mount = this.mounts.get(bot.mountedId);
          if (mount) {
            const desiredAngle = Math.atan2(dx, dz);
            const diff = Math.atan2(Math.sin(desiredAngle - mount.yaw), Math.cos(desiredAngle - mount.yaw));
            bot.botDriveThrottle = 0.9;
            bot.botDriveSteer = Math.max(-1, Math.min(1, diff * -1.4));
            this.driveMount(mount, bot.botDriveThrottle, bot.botDriveSteer, dt, false);
            bot.anim = 'ride';
            return;
          }
        }
        bot.yaw = Math.atan2(-dx, -dz);
        bot.vx = THREE.MathUtils.lerp(bot.vx, (dx / d) * 10.2, 1 - Math.exp(-8 * dt));
        bot.vz = THREE.MathUtils.lerp(bot.vz, (dz / d) * 10.2, 1 - Math.exp(-8 * dt));
        bot.anim = bot.isSwimming ? 'swim' : bot.grounded ? 'run' : 'jump';
        return;
      }
    }

    // Airport Police / Army Guards & Wanted Pursuit Units AI
    if (bot.guardRole) {
      const local = this.getLocalActor();
      if (!local || !local.alive || this.inJail || local.brState !== 'ground') {
        bot.vx = 0;
        bot.vz = 0;
        bot.anim = 'idle';
        return;
      }
      const dLocal = Math.hypot(local.x - bot.x, local.z - bot.z);
      const isPursuit = bot.guardRole === 'pursuit_police';
      const engageRange = isPursuit ? 220 : bot.guardOnWatchtower ? 48 : 34;

      if (bot.mountedId) {
        const mount = this.mounts.get(bot.mountedId);
        if (mount) {
          const desiredAngle = Math.atan2(local.x - mount.x, local.z - mount.z);
          const diff = Math.atan2(Math.sin(desiredAngle - mount.yaw), Math.cos(desiredAngle - mount.yaw));
          if (mount.isHelicopter) {
            const desiredAlt = Math.max(local.y + 16, 22);
            mount.vy = THREE.MathUtils.clamp((desiredAlt - mount.y) * 2.2, -12, 12);
          }
          bot.botDriveThrottle = dLocal > 18 ? 0.85 : 0.15;
          bot.botDriveSteer = Math.max(-1, Math.min(1, diff * -1.4));
          this.driveMount(mount, bot.botDriveThrottle, bot.botDriveSteer, dt, false);
          bot.yaw = Math.atan2(-(local.x - bot.x), -(local.z - bot.z));
          bot.pitch = Math.atan2(local.y + 1.1 - (bot.y + 1.3), Math.max(1, dLocal));
          if (dLocal < 88 && Math.random() < 0.25 && this.hasLineOfSight(bot.x, bot.y + 1.5, bot.z, local.x, local.y + 1.1, local.z)) {
            this.performPrimaryAttack(bot);
          }
          bot.anim = 'ride';
          return;
        }
      }

      const provoked = this.wantedLevel > 0 || bot.hp < bot.maxHp || dLocal < engageRange;
      if (!provoked) {
        bot.vx = 0;
        bot.vz = 0;
        bot.yaw += dt * 0.55;
        bot.anim = 'idle';
        return;
      }

      const dx = local.x - bot.x;
      const dz = local.z - bot.z;
      const dist = Math.max(0.1, dLocal);
      bot.yaw = Math.atan2(-dx, -dz);
      bot.pitch = Math.atan2(local.y + 1.1 - (bot.y + 1.3), dist);
      if (bot.guardOnWatchtower) {
        // Stay atop steel watchtower and snipe!
        bot.vx = 0;
        bot.vz = 0;
        bot.anim = 'idle';
      } else {
        const moveSpd = dist > 18 ? 9.6 : dist < 9 ? -4.5 : 0;
        bot.vx = THREE.MathUtils.lerp(bot.vx, (dx / dist) * moveSpd, 1 - Math.exp(-6 * dt));
        bot.vz = THREE.MathUtils.lerp(bot.vz, (dz / dist) * moveSpd, 1 - Math.exp(-6 * dt));
        bot.anim = Math.abs(moveSpd) > 1 ? 'run' : 'idle';
      }
      if (bot.botDecisionTimer <= 0) {
        bot.botDecisionTimer = 0.35 + Math.random() * 0.35;
        if (dLocal < 82 && this.hasLineOfSight(bot.x, bot.y + 1.35, bot.z, local.x, local.y + 1.1, local.z)) {
          this.performPrimaryAttack(bot);
        }
      }
      return;
    }

    // Pick nearest enemy (prefer standing enemies on ground; ignore airport guards so BR bots focus on BR rivals)
    let target: ActorEntity | null = null;
    let bestD = 9999;
    for (const other of this.actors.values()) {
      if (other.id === bot.id || !other.alive || other.brState !== 'ground' || other.guardRole) continue;
      if (this.isFriendly(bot.id, other)) continue;
      const d = Math.hypot(other.x - bot.x, other.z - bot.z) + (other.knockedDown ? 18 : 0);
      if (d < bestD) {
        bestD = d;
        target = other;
      }
    }

    // Bots automatically seek empty cars, bikes, or horses occasionally (never steal Giant Flying Birds or Helicopters)
    if (!bot.mountedId && bot.botWantMountTimer <= 0) {
      bot.botWantMountTimer = 4 + Math.random() * 5;
      const emptyMount = this.findNearestEmptyMount(bot, true);
      if (emptyMount) {
        this.tryToggleMount(bot);
      }
    }

    if (bot.mountedId) {
      const mount = this.mounts.get(bot.mountedId);
      if (mount) {
        const desiredAngle = target
          ? Math.atan2(target.x - mount.x, target.z - mount.z)
          : Math.atan2(-mount.z, -mount.x);
        const angleDiff = Math.atan2(Math.sin(desiredAngle - mount.yaw), Math.cos(desiredAngle - mount.yaw));
        bot.botDriveThrottle = 0.82;
        bot.botDriveSteer = Math.max(-1, Math.min(1, angleDiff * -1.4));
        this.driveMount(mount, bot.botDriveThrottle, bot.botDriveSteer, dt, false);
        if (target) {
          bot.yaw = Math.atan2(-(target.x - bot.x), -(target.z - bot.z));
          bot.pitch = Math.atan2(target.y + 1.1 - (bot.y + 1.3), Math.max(1, bestD));
          if (
            bestD < 68 &&
            Math.random() < 0.22 &&
            this.hasLineOfSight(bot.x, bot.y + 1.35, bot.z, target.x, target.y + 1.15, target.z)
          ) {
            this.performPrimaryAttack(bot);
          }
        }
        bot.anim = 'ride';
      }
      return;
    }

    // Swim back onto island if in deep water
    if (bot.isSwimming) {
      const toCenterYaw = Math.atan2(-bot.x, -bot.z);
      bot.yaw = toCenterYaw + Math.PI;
      bot.vx = Math.sin(toCenterYaw + Math.PI) * 8;
      bot.vz = Math.cos(toCenterYaw + Math.PI) * 8;
      bot.anim = 'swim';
      return;
    }

    if (!target) {
      bot.vx = 0;
      bot.vz = 0;
      bot.anim = 'idle';
      return;
    }

    const dx = target.x - bot.x;
    const dz = target.z - bot.z;
    const dist = Math.max(0.1, Math.hypot(dx, dz));
    bot.yaw = Math.atan2(-dx, -dz);
    bot.pitch = Math.atan2(target.y + 1.1 - (bot.y + 1.25), dist);

    const desiredRange = 22;
    const moveDir = dist > desiredRange ? 1 : dist < 9 ? -0.6 : 0;
    const speed = 9.2;
    const fx = dx / dist;
    const fz = dz / dist;
    const sx = -fz * bot.botStrafeDir;
    const sz = fx * bot.botStrafeDir;

    bot.vx = THREE.MathUtils.lerp(bot.vx, (fx * moveDir + sx * 0.55) * speed, 1 - Math.exp(-6 * dt));
    bot.vz = THREE.MathUtils.lerp(bot.vz, (fz * moveDir + sz * 0.55) * speed, 1 - Math.exp(-6 * dt));
    bot.anim = bot.activeAnimOverride ?? (bot.grounded ? 'run' : 'jump');

    if (bot.botJumpTimer <= 0) {
      bot.botJumpTimer = 2.5 + Math.random() * 3.5;
      if (bot.grounded && Math.random() < 0.45) {
        this.tryJump(bot);
      }
      bot.botStrafeDir = Math.random() > 0.5 ? 1 : -1;
    }

    if (bot.botDecisionTimer <= 0) {
      bot.botDecisionTimer = 0.25 + Math.random() * 0.35;
      if (this.config.mode !== 'practice') {
        const hasLos = this.hasLineOfSight(bot.x, bot.y + 1.35, bot.z, target.x, target.y + 1.15, target.z);
        if (hasLos) {
          if (dist < 3.4) {
            this.performKnifeSlash(bot);
          } else if (dist < 75) {
            if (Math.random() < 0.06 && dist > 12 && dist < 30 && bot.grenadeCount > 0) {
              this.throwGrenade(bot);
            } else {
              this.performPrimaryAttack(bot);
            }
          }
        }
      }
    }
  }

  private stepProjectiles(dt: number): void {
    const localId = this.getLocalActor()?.id;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      // Homing guidance for Helicopter Air-to-Ground Missiles!
      if (p.isHoming) {
        let bestTgt: { x: number; y: number; z: number } | null = null;
        let bestD = 95;
        for (const a of this.actors.values()) {
          if (!a.alive || a.id === p.ownerId || a.brState !== 'ground') continue;
          if (this.isFriendly(p.ownerId, a)) continue;
          const d = Math.hypot(a.x - p.x, a.y + 1 - p.y, a.z - p.z);
          if (d < bestD) {
            bestD = d;
            bestTgt = { x: a.x, y: a.y + 1.1, z: a.z };
          }
        }
        if (bestTgt) {
          const curSpeed = Math.max(10, Math.hypot(p.vx, p.vy, p.vz));
          const toX = bestTgt.x - p.x;
          const toY = bestTgt.y - p.y;
          const toZ = bestTgt.z - p.z;
          const toLen = Math.max(0.1, Math.hypot(toX, toY, toZ));
          const steer = Math.min(1, 5.5 * dt);
          p.vx = THREE.MathUtils.lerp(p.vx, (toX / toLen) * curSpeed, steer);
          p.vy = THREE.MathUtils.lerp(p.vy, (toY / toLen) * curSpeed, steer);
          p.vz = THREE.MathUtils.lerp(p.vz, (toZ / toLen) * curSpeed, steer);
        }
      }

      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      const nz = p.z + p.vz * dt;

      const sdx = nx - p.x;
      const sdy = ny - p.y;
      const sdz = nz - p.z;
      const segLen = Math.hypot(sdx, sdy, sdz);

      let remove = p.life <= 0;

      if (!remove && segLen > 1e-4) {
        const inv = 1 / segLen;
        const ux = sdx * inv;
        const uy = sdy * inv;
        const uz = sdz * inv;

        // 1. Check solid walls, closed doors, roofs, rocks, tree trunks & terrain hills first!
        const obsHit = this.raycastObstacles(p.x, p.y, p.z, ux, uy, uz, segLen);
        let bestDist = obsHit ? obsHit.dist : segLen;
        let hitKind: 'obstacle' | 'actor' | 'mount' | 'wild' | null = obsHit ? 'obstacle' : null;
        let hitActor: ActorEntity | null = null;
        let hitMount: MountEntity | null = null;
        let hitWild: WildEcosystemEntity | null = null;

        // 2. Check Vehicle / Boat / Horse / Marine Mount hull hits
        for (const mount of this.mounts.values()) {
          if (!mount.alive || mount.riderId === p.ownerId) continue;
          const t = mount.deckBoxes
            ? rayIntersectBoatDeckBoxes(p.x, p.y, p.z, ux, uy, uz, bestDist, mount)
            : segmentIntersectSphere(
                p.x,
                p.y,
                p.z,
                ux,
                uy,
                uz,
                bestDist,
                mount.x,
                mount.y + 1.05,
                mount.z,
                mount.radius + 0.35
              );
          if (t !== null && t < bestDist) {
            bestDist = t;
            hitKind = 'mount';
            hitMount = mount;
            hitActor = null;
            hitWild = null;
          }
        }

        // 3. Check Actor hits along unblocked segment [0, bestDist]
        for (const target of this.actors.values()) {
          if (target.id === p.ownerId || !target.alive) continue;
          if (this.isEnclosedMounted(target)) continue;

          const t = segmentIntersectActorColumn(
            p.x,
            p.y,
            p.z,
            ux,
            uy,
            uz,
            bestDist,
            target.x,
            target.y,
            target.y + 2.25,
            target.z,
            0.85
          );
          if (t !== null && t < bestDist) {
            bestDist = t;
            hitKind = 'actor';
            hitActor = target;
            hitMount = null;
            hitWild = null;
          }
        }

        // 4. Check Wildlife & Tribal Villagers along unblocked segment [0, bestDist]
        for (const w of this.wildEcosystem) {
          if (!w.alive) continue;
          const t = segmentIntersectActorColumn(
            p.x,
            p.y,
            p.z,
            ux,
            uy,
            uz,
            bestDist,
            w.x,
            w.y,
            w.y + Math.max(1.75, w.radius * 1.45),
            w.z,
            Math.max(0.75, w.radius)
          );
          if (t !== null && t < bestDist) {
            bestDist = t;
            hitKind = 'wild';
            hitWild = w;
            hitActor = null;
            hitMount = null;
          }
        }

        // 5. Check Shootable Branch Fruits & Hanging Wasp Nests
        let hitFruit: HarvestableFruitNode | null = null;
        let hitNest: WaspNestNode | null = null;
        for (const fn of this.arena.fruitNodes) {
          if (!fn.active || fn.fallen) continue;
          const t = segmentIntersectSphere(p.x, p.y, p.z, ux, uy, uz, bestDist, fn.x, fn.y, fn.z, 0.7);
          if (t !== null && t < bestDist) {
            bestDist = t;
            hitFruit = fn;
            hitNest = null;
            hitKind = null;
            hitActor = null;
            hitMount = null;
            hitWild = null;
          }
        }
        for (const nest of this.arena.waspNests) {
          if (!nest.active || nest.fallen) continue;
          const t = segmentIntersectSphere(p.x, p.y, p.z, ux, uy, uz, bestDist, nest.x, nest.y, nest.z, 0.8);
          if (t !== null && t < bestDist) {
            bestDist = t;
            hitNest = nest;
            hitFruit = null;
            hitKind = null;
            hitActor = null;
            hitMount = null;
            hitWild = null;
          }
        }

        const hx = p.x + ux * bestDist;
        const hy = p.y + uy * bestDist;
        const hz = p.z + uz * bestDist;

        if (hitFruit) {
          hitFruit.fallen = true;
          hitFruit.y = hitFruit.groundY;
          this.arena.updateFruitVisual(hitFruit.index);
          this.spawnExplosionParticles(hx, hy, hz, 0x84cc16, 4, 0.35);
          if (p.ownerId === localId) {
            this.hitMarkerTime = 0.14;
            soundEngine.playHitMarker(false);
            this.showAnnouncement(`KNOCKED DOWN ${hitFruit.kind.toUpperCase()} — WALK OVER OR [E] TO EAT!`, 2.0);
          }
          remove = true;
        } else if (hitNest) {
          hitNest.fallen = true;
          hitNest.attackerId = p.ownerId;
          this.spawnExplosionParticles(hx, hy, hz, 0xfacc15, 6, 0.45);
          if (p.ownerId === localId) {
            this.hitMarkerTime = 0.16;
            soundEngine.playHitMarker(true);
            this.showAnnouncement('WASP NEST SHOT DOWN — STING SWARM INCOMING!', 2.0);
          }
          remove = true;
        } else if (hitKind === 'actor' && hitActor) {
          if (this.isFriendly(p.ownerId, hitActor)) {
            if (p.ownerId === localId) {
              this.allyShieldTime = 0.65;
              soundEngine.playAllyBlock();
            }
          } else {
            const isCrit = hy >= hitActor.y + 1.5;
            const dmg = p.damage * (isCrit ? 1.35 : 1);
            this.damageActor(hitActor, dmg, p.ownerId, p.vx * 0.04, p.vz * 0.04);
            this.spawnExplosionParticles(hx, hy, hz, isCrit ? 0xfbbf24 : 0xf43f5e, 4, 0.35);
            if (p.ownerId === localId) {
              this.hitMarkerTime = 0.16;
              soundEngine.playHitMarker(isCrit);
              this.pushDamagePopup(hitActor.x, hitActor.y + 2.35, hitActor.z, dmg, isCrit, false);
            }
          }
          remove = true;
        } else if (hitKind === 'wild' && hitWild) {
          this.damageWildEntity(hitWild, p.damage, p.ownerId, p.vx * 0.04, p.vz * 0.04);
          this.spawnExplosionParticles(hx, hy, hz, 0xf97316, 4, 0.38);
          if (p.ownerId === localId) {
            this.hitMarkerTime = 0.15;
            soundEngine.playHitMarker(false);
            this.pushDamagePopup(hitWild.x, hitWild.y + 2.1, hitWild.z, p.damage, false, false);
          }
          remove = true;
        } else if (hitKind === 'mount' && hitMount) {
          if (this.isMountFriendly(p.ownerId, hitMount)) {
            if (p.ownerId === localId) {
              this.allyShieldTime = 0.65;
              soundEngine.playAllyBlock();
            }
          } else {
            const mDmg = p.damage * 1.15;
            this.damageMount(hitMount, mDmg, p.ownerId);
            const isVehicle = hitMount.kind !== 'horse' && !hitMount.isMarineMount;
            this.spawnExplosionParticles(hx, hy, hz, isVehicle ? 0xfbbf24 : 0xf97316, 5, 0.42);
            if (p.ownerId === localId) {
              this.hitMarkerTime = 0.12;
              soundEngine.playHitMarker(false);
              soundEngine.playRicochet(isVehicle);
              this.pushDamagePopup(hx, hy + 0.7, hz, mDmg, false, true);
            }
          }
          remove = true;
        } else if (hitKind === 'obstacle' && obsHit) {
          this.spawnBulletDecal(obsHit.hx, obsHit.hy, obsHit.hz, obsHit.nx, obsHit.ny, obsHit.nz);
          this.spawnExplosionParticles(
            obsHit.hx,
            obsHit.hy,
            obsHit.hz,
            obsHit.isMetallic ? 0xfbbf24 : 0xe2e8f0,
            4,
            0.34
          );
          const dCam = Math.hypot(
            obsHit.hx - this.camera.position.x,
            obsHit.hz - this.camera.position.z
          );
          if (dCam < 42) {
            soundEngine.playRicochet(obsHit.isMetallic);
          }
          remove = true;
        }

        if (remove && p.isHeavyBlast && p.splashRadius) {
          soundEngine.playExplosion('vehicle');
          this.spawnExplosionParticles(hx, hy + 0.35, hz, 0xf97316, 22, 1.5);
          this.triggerBlastImpact(hx, hy, hz, p.splashRadius, p.damage, p.ownerId);
        }
      }

      if (remove) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      } else {
        p.x = nx;
        p.y = ny;
        p.z = nz;
        p.mesh.position.set(nx, ny, nz);
      }
    }
  }

  private stepGrenades(dt: number): void {
    const localId = this.getLocalActor()?.id;

    for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
      const g = this.activeGrenades[i];
      g.fuse -= dt;
      g.vy -= 26 * dt;
      const nx = g.x + g.vx * dt;
      const ny = g.y + g.vy * dt;
      const nz = g.z + g.vz * dt;

      // Wall collision bounce for thrown grenades
      let hitWall = false;
      const cols = this.arena.queryColliders(nx - 0.35, nx + 0.35, nz - 0.35, nz + 0.35);
      for (const c of cols) {
        if (c.kind === 'glass' || c.kind === 'floor' || c.kind === 'ramp') continue;
        if (ny + 0.25 >= c.minY && ny - 0.25 <= c.maxY && nx + 0.22 >= c.minX && nx - 0.22 <= c.maxX && nz + 0.22 >= c.minZ && nz - 0.22 <= c.maxZ) {
          g.vx *= -0.45;
          g.vz *= -0.45;
          hitWall = true;
          soundEngine.playGrenadeBounce();
          break;
        }
      }

      const groundY = Math.max(WATER_LEVEL - 1.5, this.arena.getGroundHeightAt(nx, nz)) + 0.2;
      if (ny <= groundY) {
        g.y = groundY;
        if (Math.abs(g.vy) > 2.2) {
          g.vy = Math.abs(g.vy) * 0.48;
          g.vx *= 0.72;
          g.vz *= 0.72;
          soundEngine.playGrenadeBounce();
        } else {
          g.vy = 0;
          g.vx *= Math.exp(-6 * dt);
          g.vz *= Math.exp(-6 * dt);
        }
      } else if (!hitWall) {
        g.x = nx;
        g.y = ny;
        g.z = nz;
      }

      g.mesh.position.set(g.x, g.y, g.z);
      g.mesh.rotation.x += dt * 7;
      g.mesh.rotation.z += dt * 5;

      if (g.fuse <= 0) {
        const def = getGrenadeDef(g.grenadeId);
        soundEngine.playExplosion(def.effectType);
        this.spawnExplosionParticles(g.x, g.y + 0.4, g.z, def.effectType === 'cluster' ? 0xe879f9 : 0xf97316, 26, 1.4);

        for (const actor of this.actors.values()) {
          if (!actor.alive) continue;
          if (this.isFriendly(g.ownerId, actor)) continue;
          if (this.isEnclosedMounted(actor)) continue;
          const d = Math.hypot(actor.x - g.x, actor.z - g.z);
          if (d < def.radius) {
            const falloff = 1 - d / def.radius;
            if (def.effectType === 'flash' && actor.isLocal) {
              this.blindFlashAlpha = 0.88;
            }
            const blastDmg = def.damage * falloff;
            this.damageActor(actor, blastDmg, g.ownerId, (actor.x - g.x) * 1.4, (actor.z - g.z) * 1.4);
            if (g.ownerId === localId) {
              this.pushDamagePopup(actor.x, actor.y + 2.35, actor.z, blastDmg, false, false);
            }
          }
        }
        for (const mount of this.mounts.values()) {
          if (!mount.alive) continue;
          if (this.isMountFriendly(g.ownerId, mount)) continue;
          const d = Math.hypot(mount.x - g.x, mount.z - g.z);
          if (d < def.radius) {
            const falloff = 1 - d / def.radius;
            const mDmg = def.damage * 1.4 * falloff;
            this.damageMount(mount, mDmg, g.ownerId);
            if (g.ownerId === localId) {
              this.pushDamagePopup(mount.x, mount.y + 2.2, mount.z, mDmg, false, true);
            }
          }
        }
        for (const w of this.wildEcosystem) {
          if (!w.alive) continue;
          const d = Math.hypot(w.x - g.x, w.z - g.z);
          if (d < def.radius) {
            const falloff = 1 - d / def.radius;
            const wDmg = def.damage * falloff;
            this.damageWildEntity(w, wDmg, g.ownerId, (w.x - g.x) * 1.2, (w.z - g.z) * 1.2);
            if (g.ownerId === localId) {
              this.pushDamagePopup(w.x, w.y + 2.0, w.z, wDmg, false, false);
            }
          }
        }
        this.damageBuildingsInRadius(g.x, g.y, g.z, def.radius * 1.4, def.damage * 1.15);

        this.scene.remove(g.mesh);
        g.dispose();
        this.activeGrenades.splice(i, 1);
      }
    }
  }

  private stepPickups(dt: number): void {
    const isBR = this.config.mode === 'battle_royale';
    for (const pk of this.pickups) {
      if (!pk.active) {
        if (!isBR) {
          pk.respawnTimer -= dt;
          if (pk.respawnTimer <= 0) {
            pk.active = true;
            pk.mesh.visible = true;
          }
        }
        continue;
      }
      pk.mesh.rotation.y += dt * 2.2;
      pk.mesh.position.y = pk.baseY + Math.sin(this.elapsed * 3 + pk.x) * 0.25;

      for (const actor of this.actors.values()) {
        if (!actor.alive || actor.knockedDown || actor.brState !== 'ground') continue;
        if (Math.hypot(actor.x - pk.x, actor.z - pk.z) < 2.3 && Math.abs(actor.y + 0.8 - pk.y) < 2.3) {
          pk.active = false;
          pk.mesh.visible = false;
          pk.respawnTimer = isBR ? 99999 : 14;
          if (pk.kind === 'coin') {
            actor.coinsInMatch += 1;
            actor.score += 30;
            if (actor.isLocal) soundEngine.playCoin();
          } else if (pk.kind === 'heart') {
            actor.hp = Math.min(actor.maxHp, actor.hp + 45);
            if (actor.isLocal) soundEngine.playPowerup();
          } else if (pk.kind === 'medkit') {
            actor.hp = Math.min(actor.maxHp, actor.hp + 50);
            if (actor.isLocal) {
              soundEngine.playPowerup();
              this.showAnnouncement('MEDKIT USED (+50 HP)', 1.5);
            }
          } else if (pk.kind === 'repair') {
            let targetMount: MountEntity | null = actor.mountedId
              ? this.mounts.get(actor.mountedId) ?? null
              : null;
            if (!targetMount) {
              let bestD = 7;
              for (const m of this.mounts.values()) {
                if (!m.alive || isLivingMountKind(m.kind)) continue;
                const d = Math.hypot(m.x - actor.x, m.z - actor.z);
                if (d < bestD) {
                  bestD = d;
                  targetMount = m;
                }
              }
            }
            const repairAmt = targetMount ? Math.max(150, Math.round(targetMount.maxHp * 0.3)) : 150;
            if (targetMount) {
              targetMount.hp = Math.min(targetMount.maxHp, targetMount.hp + repairAmt);
              const pct = Math.max(0.01, targetMount.hp / targetMount.maxHp);
              targetMount.hpBarFill.scale.x = pct;
              targetMount.hpBarFill.position.x = -(1 - pct) * 0.99;
              (targetMount.hpBarFill.material as THREE.MeshBasicMaterial).color.setHex(
                pct > 0.55 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444
              );
            }
            if (actor.isLocal) {
              soundEngine.playPowerup();
              this.showAnnouncement(
                targetMount ? `REPAIRED ${targetMount.name.toUpperCase()} (+${repairAmt} HP)` : 'REPAIR KIT COLLECTED',
                1.5
              );
            }
          } else if (pk.kind === 'armor1' || pk.kind === 'armor2' || pk.kind === 'armor3') {
            const lv: 1 | 2 | 3 = pk.kind === 'armor3' ? 3 : pk.kind === 'armor2' ? 2 : 1;
            const cap = lv === 3 ? 115 : lv === 2 ? 75 : 40;
            if (lv >= actor.armorLevel || actor.armorHp < cap) {
              actor.armorLevel = Math.max(actor.armorLevel, lv) as 1 | 2 | 3;
              actor.armorMaxHp = Math.max(actor.armorMaxHp, cap);
              actor.armorHp = Math.max(actor.armorHp, cap);
            }
            if (actor.isLocal) {
              soundEngine.playPowerup();
              this.showAnnouncement(`LV.${lv} ARMOR VEST EQUIPPED (+${cap} SHIELD)`, 1.6);
            }
          } else if (pk.kind === 'speed') {
            actor.speedBoostTimer = 8;
            if (actor.isLocal) soundEngine.playPowerup();
          } else if (pk.kind === 'power') {
            if (pk.gunUpgrade) {
              actor.gunId = pk.gunUpgrade;
              actor.rig.setWeapons(actor.gunId, actor.knifeId, actor.grenadeId);
              const gDef = getGunDef(actor.gunId);
              actor.ammoInMag = gDef.magSize;
              actor.reserveAmmo = gDef.reserveMax < 0 ? -1 : gDef.magSize * 3;
              if (actor.isLocal) {
                soundEngine.playWeaponSwitch();
                this.showAnnouncement(`PICKED UP ${gDef.name.toUpperCase()}!`, 1.8);
              }
            } else {
              actor.powerBoostTimer = 8;
              if (actor.isLocal) soundEngine.playPowerup();
            }
          } else if (pk.kind === 'ammo') {
            const g = getGunDef(actor.gunId);
            if (actor.reserveAmmo >= 0) actor.reserveAmmo += g.magSize * 2;
            actor.ammoInMag = g.magSize;
            if (actor.isLocal) soundEngine.playReload();
          } else if (pk.kind === 'grenade') {
            actor.grenadeCount = Math.min(5, actor.grenadeCount + 1);
            if (actor.isLocal) soundEngine.playPowerup();
          } else if (pk.kind === 'conch') {
            actor.coinsInMatch += 15;
            actor.score += 45;
            actor.stamina = Math.min(100, actor.stamina + 30);
            actor.speedBoostTimer = Math.max(actor.speedBoostTimer, 4.5);
            if (actor.isLocal) {
              this.bonusCoinsInMatch += 15;
              soundEngine.playConchPickup();
              this.showAnnouncement('GOLDEN CONCH FOUND! +15 BONUS COINS + SPEED BOOST!', 2.2);
            }
          } else if (pk.kind === 'shell' || pk.kind === 'starfish') {
            actor.coinsInMatch += 5;
            actor.score += 20;
            actor.stamina = Math.min(100, actor.stamina + 10);
            if (actor.isLocal) {
              this.bonusCoinsInMatch += 5;
              soundEngine.playCoin();
              this.showAnnouncement(
                pk.kind === 'shell' ? 'SEASHELL FOUND (+5 COINS)' : 'STARFISH FOUND (+5 COINS)',
                1.4
              );
            }
          } else if (pk.kind === 'pearl') {
            actor.coinsInMatch += 10;
            actor.score += 35;
            actor.hp = Math.min(actor.maxHp, actor.hp + 25);
            if (actor.isLocal) {
              this.bonusCoinsInMatch += 10;
              soundEngine.playPearlPickup();
              this.showAnnouncement('GLOWING SEA PEARL (+10 COINS · +25 HP)', 1.8);
            }
          } else if (pk.kind === 'meat') {
            actor.hp = Math.min(actor.maxHp, actor.hp + 25);
            actor.stamina = Math.min(100, actor.stamina + 20);
            if (actor.isLocal) {
              soundEngine.playPowerup();
              this.showAnnouncement('WILD ROAST MEAT (+25 HP)', 1.3);
            }
          } else if (pk.kind === 'volcano_crate') {
            actor.powerBoostTimer = Math.max(actor.powerBoostTimer, 10);
            actor.armorLevel = 3;
            actor.armorMaxHp = Math.max(actor.armorMaxHp, 115);
            actor.armorHp = Math.max(actor.armorHp, 115);
            actor.hp = Math.min(actor.maxHp, actor.hp + 45);
            if (pk.gunUpgrade) {
              actor.gunId = pk.gunUpgrade;
              actor.rig.setWeapons(actor.gunId, actor.knifeId, actor.grenadeId);
              const gDef = getGunDef(actor.gunId);
              actor.ammoInMag = gDef.magSize;
              actor.reserveAmmo = gDef.reserveMax < 0 ? -1 : gDef.magSize * 4;
            }
            if (actor.isLocal) {
              soundEngine.playAirdropChime();
              this.showAnnouncement('VOLCANO RIM CRATE! LV.3 ARMOR + POWER BOOST!', 2.2);
            }
          }
          break;
        }
      }
    }
  }

  private damageWildEntity(
    w: WildEcosystemEntity,
    dmg: number,
    attackerId: string,
    kx: number,
    kz: number
  ): void {
    if (!w.alive) return;
    const effectiveDmg = w.species === 'tortoise' ? dmg * 0.5 : dmg;
    w.hp = Math.max(0, w.hp - effectiveDmg);
    w.hitFlash = 0.22;
    w.lastAttackerId = attackerId;
    w.vx += kx * 0.35;
    w.vz += kz * 0.35;
    w.hpBarGroup.visible = true;
    const pct = Math.max(0.01, w.hp / Math.max(1, w.maxHp));
    w.hpBarFill.scale.x = pct;
    w.hpBarFill.position.x = -(1 - pct) * 0.78;

    const attacker = this.actors.get(attackerId);
    if (w.species === 'villager') {
      const firstAlert = this.villagerAggroTimer <= 0;
      this.villagerAggroTimer = 25;
      w.isHostile = true;
      w.hostileTimer = 25;
      if (firstAlert && attacker?.isLocal) {
        soundEngine.playVillagerAlert();
        this.showAnnouncement('TRIBAL VILLAGERS ALERTED — DEFENDING VILLAGE!', 2.4);
      }
    } else if (w.behavior === 'defensive' || w.behavior === 'predator') {
      if (!w.isHostile && attacker?.isLocal) {
        soundEngine.playAnimalRoar();
      }
      w.isHostile = true;
      w.hostileTimer = 18;
    } else {
      w.fleeTimer = 7.0;
    }

    if (w.hp <= 0) {
      w.alive = false;
      w.respawnTimer = 28;
      w.root.visible = false;
      w.hpBarGroup.visible = false;
      this.spawnExplosionParticles(w.x, w.y + 0.85, w.z, 0xf43f5e, 10, 0.72);
      if (attacker) {
        attacker.coinsInMatch += w.rewardCoins;
        attacker.score += 40;
        if (attacker.isLocal) {
          if (w.species !== 'villager') {
            this.animalsHuntedInMatch += 1;
          }
          this.bonusCoinsInMatch += w.rewardCoins;
          soundEngine.playCoin();
          this.showAnnouncement(`HUNTED ${w.name.toUpperCase()} (+${w.rewardCoins} COINS)`, 1.8);
        }
      }
      if (this.pickups.length < 240) {
        this.spawnPickup(`meat_${w.id}_${Date.now()}`, 'meat', w.x, w.y + 0.55, w.z);
      }
    }
  }

  private stepWildEcosystem(dt: number): void {
    const t = this.elapsed;
    for (const w of this.wildEcosystem) {
      if (!w.alive) {
        w.respawnTimer -= dt;
        if (w.respawnTimer <= 0) {
          w.alive = true;
          w.hp = w.maxHp;
          w.x = w.spawnX;
          w.y = w.spawnY;
          w.z = w.spawnZ;
          w.isHostile = w.behavior === 'predator';
          w.hostileTimer = 0;
          w.fleeTimer = 0;
          w.root.visible = true;
          w.hpBarFill.scale.x = 1;
          w.hpBarFill.position.x = 0;
          w.hpBarGroup.visible = false;
        }
        continue;
      }

      w.hitFlash = Math.max(0, w.hitFlash - dt);
      w.attackCooldown = Math.max(0, w.attackCooldown - dt);
      w.fleeTimer = Math.max(0, w.fleeTimer - dt);
      w.hostileTimer = Math.max(0, w.hostileTimer - dt);

      if (w.species === 'villager') {
        w.isHostile = this.villagerAggroTimer > 0;
      } else if (w.behavior === 'defensive' && w.hostileTimer <= 0) {
        // Realistic provocation: cornered/approached wildlife (< 3.4m) also turns defensive & retaliates
        for (const a of this.actors.values()) {
          if (!a.alive || a.brState !== 'ground' || a.knockedDown) continue;
          if (Math.hypot(a.x - w.x, a.z - w.z) < 3.4 && Math.abs(a.y - w.y) < 3.0) {
            w.isHostile = true;
            w.hostileTimer = 10;
            break;
          }
        }
        if (w.hostileTimer <= 0) w.isHostile = false;
      }

      const dCam = Math.hypot(w.x - this.camera.position.x, w.z - this.camera.position.z);
      if (dCam > 145 && !w.isHostile) {
        continue;
      }

      let moveSpeed = w.speed;
      let targetActor: ActorEntity | null = null;
      let bestDist = w.species === 'villager' ? 46 : w.species === 'cobra' || w.species === 'viper' ? 18 : 28;

      if (w.isHostile) {
        for (const a of this.actors.values()) {
          if (!a.alive || a.brState !== 'ground' || a.knockedDown) continue;
          const d = Math.hypot(a.x - w.x, a.z - w.z);
          if (d < bestDist && Math.abs(a.y - w.y) < 12) {
            bestDist = d;
            targetActor = a;
          }
        }
      }

      if (targetActor) {
        w.yaw = Math.atan2(targetActor.x - w.x, targetActor.z - w.z);
        moveSpeed = w.runSpeed;
        if (
          w.species === 'villager' &&
          bestDist > 5.0 &&
          bestDist < 42 &&
          w.attackCooldown <= 0
        ) {
          // Hostile Tribal Warriors launch ranged spears / arrows / blowgun darts
          if (this.hasLineOfSight(w.x, w.y + 1.55, w.z, targetActor.x, targetActor.y + 1.15, targetActor.z)) {
            w.attackCooldown = 1.75 + Math.random() * 0.65;
            moveSpeed = 0;
            this.fireWildTribalProjectile(w, targetActor);
          }
        } else if (bestDist <= w.radius + 1.35) {
          moveSpeed = 0;
          if (w.attackCooldown <= 0) {
            w.attackCooldown = 1.4;
            const kx = ((targetActor.x - w.x) / Math.max(0.1, bestDist)) * 5.5;
            const kz = ((targetActor.z - w.z) / Math.max(0.1, bestDist)) * 5.5;
            this.damageActor(targetActor, w.damage, `wild_${w.species}`, kx, kz);
            if (targetActor.isLocal) {
              if (w.species === 'cobra' || w.species === 'viper' || w.species === 'scorpion') {
                soundEngine.playSnakeHiss();
                this.poisonAlpha = Math.max(this.poisonAlpha, 0.85);
              } else {
                soundEngine.playAnimalRoar();
              }
            }
          }
        }
      } else if (w.fleeTimer > 0 && w.lastAttackerId) {
        const threat = this.actors.get(w.lastAttackerId);
        if (threat) {
          w.yaw = Math.atan2(w.x - threat.x, w.z - threat.z);
          moveSpeed = w.runSpeed;
        }
      } else {
        w.wanderTimer -= dt;
        if (w.wanderTimer <= 0) {
          w.wanderTimer = 2.2 + Math.random() * 3.8;
          w.wanderAngle = Math.random() * Math.PI * 2;
        }
        const dh = Math.hypot(w.x - w.homeCenter.x, w.z - w.homeCenter.z);
        if (dh > w.homeCenter.maxRadius) {
          w.wanderAngle = Math.atan2(w.homeCenter.x - w.x, w.homeCenter.z - w.z);
        }
        w.yaw = THREE.MathUtils.lerp(w.yaw, w.wanderAngle, 1 - Math.exp(-3 * dt));
      }

      w.vx *= Math.exp(-8 * dt);
      w.vz *= Math.exp(-8 * dt);
      const nx = w.x + (Math.sin(w.yaw) * moveSpeed + w.vx) * dt;
      const nz = w.z + (Math.cos(w.yaw) * moveSpeed + w.vz) * dt;
      const gy = this.arena.getGroundHeightAt(nx, nz);
      const minAllowedY = w.species === 'crocodile' ? WATER_LEVEL - 0.55 : WATER_LEVEL - 0.08;
      const nearVolcanoLava = Math.hypot(nx - VOLCANO_CENTER.x, nz - VOLCANO_CENTER.z) < 12.0;
      if (!nearVolcanoLava && gy > minAllowedY && gy < 23.5 && Math.abs(nx) < this.arena.halfSize - 12 && Math.abs(nz) < this.arena.halfSize - 12) {
        w.x = nx;
        w.z = nz;
        w.y = gy;
      } else {
        w.wanderAngle += Math.PI * 0.75;
        w.yaw += Math.PI * 0.5;
      }

      w.root.position.set(w.x, w.y, w.z);
      w.root.rotation.y = w.yaw;
      if (w.hpBarGroup.visible) {
        w.hpBarGroup.lookAt(this.camera.position);
      }
      if (dCam < 95 && moveSpeed > 0.2) {
        const freq = moveSpeed > w.speed * 1.15 ? 11.5 : 7.5;
        for (let l = 0; l < w.legs.length; l++) {
          w.legs[l].rotation.x = Math.sin(t * freq + l * Math.PI) * 0.45;
        }
      }
    }
  }

  private fireWildTribalProjectile(w: WildEcosystemEntity, target: ActorEntity): void {
    const sx = w.x;
    const sy = w.y + 1.55;
    const sz = w.z;
    const dx = target.x - sx;
    const dy = target.y + 1.15 - sy;
    const dz = target.z - sz;
    const dist = Math.max(0.5, Math.hypot(dx, dy, dz));
    const speed = 29;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed + 1.65;
    const vz = (dz / dist) * speed;

    const geo = new THREE.BoxGeometry(0.1, 0.1, 1.35);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sx, sy, sz);
    mesh.lookAt(sx + vx, sy + vy, sz + vz);
    this.scene.add(mesh);

    this.wildProjectiles.push({
      mesh,
      x: sx,
      y: sy,
      z: sz,
      vx,
      vy,
      vz,
      damage: w.damage,
      life: 1.85,
      isVenom: false,
    });

    if (Math.hypot(sx - this.camera.position.x, sz - this.camera.position.z) < 52) {
      soundEngine.playBowOrSpear();
    }
  }

  private stepWildProjectiles(dt: number): void {
    for (let i = this.wildProjectiles.length - 1; i >= 0; i--) {
      const wp = this.wildProjectiles[i];
      wp.life -= dt;
      wp.vy -= 4.2 * dt;
      const nx = wp.x + wp.vx * dt;
      const ny = wp.y + wp.vy * dt;
      const nz = wp.z + wp.vz * dt;
      const segLen = Math.hypot(nx - wp.x, ny - wp.y, nz - wp.z);
      let remove = wp.life <= 0;

      if (!remove && segLen > 1e-4) {
        const ux = (nx - wp.x) / segLen;
        const uy = (ny - wp.y) / segLen;
        const uz = (nz - wp.z) / segLen;
        const obs = this.raycastObstacles(wp.x, wp.y, wp.z, ux, uy, uz, segLen);
        const maxDist = obs ? obs.dist : segLen;

        for (const actor of this.actors.values()) {
          if (!actor.alive || actor.brState !== 'ground' || actor.knockedDown) continue;
          if (this.isEnclosedMounted(actor)) continue;
          const t = segmentIntersectActorColumn(
            wp.x,
            wp.y,
            wp.z,
            ux,
            uy,
            uz,
            maxDist,
            actor.x,
            actor.y,
            actor.y + 2.2,
            actor.z,
            0.85
          );
          if (t !== null) {
            this.damageActor(actor, wp.damage, 'wild_villager', ux * 4.5, uz * 4.5);
            this.spawnExplosionParticles(actor.x, wp.y, actor.z, 0xf59e0b, 4, 0.38);
            remove = true;
            break;
          }
        }
        if (!remove && obs) {
          this.spawnExplosionParticles(obs.hx, obs.hy, obs.hz, 0xd97706, 3, 0.3);
          remove = true;
        }
      }

      if (remove) {
        this.scene.remove(wp.mesh);
        wp.mesh.geometry.dispose();
        (wp.mesh.material as THREE.Material).dispose();
        this.wildProjectiles.splice(i, 1);
      } else {
        wp.x = nx;
        wp.y = ny;
        wp.z = nz;
        wp.mesh.position.set(nx, ny, nz);
        wp.mesh.lookAt(nx + wp.vx, ny + wp.vy, nz + wp.vz);
      }
    }
  }

  private findNearestFruit(actor: ActorEntity): HarvestableFruitNode | null {
    let best: HarvestableFruitNode | null = null;
    let bestDist = 3.1;
    for (let i = 0; i < this.arena.fruitNodes.length; i++) {
      const fn = this.arena.fruitNodes[i];
      if (!fn.active) continue;
      if (!fn.fallen && Math.abs(fn.y - (actor.y + 1.1)) > 2.3) continue;
      const d = Math.hypot(fn.x - actor.x, fn.z - actor.z);
      if (d < bestDist) {
        bestDist = d;
        best = fn;
      }
    }
    return best;
  }

  private consumeFruitNode(actor: ActorEntity, fn: HarvestableFruitNode): void {
    fn.active = false;
    fn.fallen = false;
    fn.respawnTimer = 25;
    this.arena.updateFruitVisual(fn.index);
    const healAmt = this.liveConfig.fruitHealAmount || 15;
    actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
    actor.fruitSpeedBoostTimer = 8;
    actor.stamina = Math.min(100, actor.stamina + 25);
    if (actor.isLocal) {
      soundEngine.playFruitCrunch();
      this.showAnnouncement(`ATE ${fn.kind.toUpperCase()}! +${healAmt} HP & +15% SPEED BOOST (8s)`, 2.0);
    }
  }

  private tryConsumeNearestFruit(actor: ActorEntity): boolean {
    if (!actor.alive || actor.knockedDown || actor.brState !== 'ground') return false;
    const fn = this.findNearestFruit(actor);
    if (!fn) return false;
    this.consumeFruitNode(actor, fn);
    return true;
  }

  private stepFruitAndWaspNests(dt: number): void {
    // Respawn consumed fruits & auto-eat fallen fruits when stepped on
    for (let i = 0; i < this.arena.fruitNodes.length; i++) {
      const fn = this.arena.fruitNodes[i];
      if (!fn.active) {
        fn.respawnTimer -= dt;
        if (fn.respawnTimer <= 0) {
          fn.active = true;
          fn.fallen = fn.kind === 'berry';
          fn.y = fn.baseY;
          this.arena.updateFruitVisual(fn.index);
        }
        continue;
      }
      if (fn.fallen) {
        for (const actor of this.actors.values()) {
          if (!actor.alive || actor.knockedDown || actor.brState !== 'ground') continue;
          if (Math.hypot(actor.x - fn.x, actor.z - fn.z) < 1.35 && Math.abs(actor.y - fn.y) < 2.2) {
            this.consumeFruitNode(actor, fn);
            break;
          }
        }
      }
    }

    // Shootable Wasp Nests falling & AoE sting explosion
    for (let i = 0; i < this.arena.waspNests.length; i++) {
      const nest = this.arena.waspNests[i];
      if (!nest.active) {
        nest.respawnTimer -= dt;
        if (nest.respawnTimer <= 0) {
          nest.active = true;
          nest.fallen = false;
          nest.vy = 0;
          nest.x = nest.baseX;
          nest.y = nest.baseY;
          nest.z = nest.baseZ;
          nest.attackerId = null;
          nest.mesh.visible = true;
          nest.mesh.position.set(nest.x, nest.y, nest.z);
        }
        continue;
      }
      if (nest.fallen) {
        nest.vy += 26 * dt;
        nest.y -= Math.max(12, nest.vy) * dt;
        nest.mesh.position.y = nest.y;
        const groundY = Math.max(0.1, this.arena.getGroundHeightAt(nest.x, nest.z));
        if (nest.y <= groundY + 0.35) {
          nest.active = false;
          nest.fallen = false;
          nest.vy = 0;
          nest.respawnTimer = 35;
          nest.mesh.visible = false;
          this.spawnExplosionParticles(nest.x, groundY + 0.9, nest.z, 0xfacc15, 24, 1.15);
          soundEngine.playWaspSwarm();

          const ownerId = nest.attackerId || 'wasp_swarm';
          const blastRadius = 7.5;
          for (const actor of this.actors.values()) {
            if (!actor.alive || actor.brState !== 'ground') continue;
            if (actor.id === ownerId || this.isFriendly(ownerId, actor)) continue;
            const d = Math.hypot(actor.x - nest.x, actor.z - nest.z);
            if (d < blastRadius && Math.abs(actor.y - groundY) < 4.5) {
              this.damageActor(actor, 45, ownerId, (actor.x - nest.x) * 0.9, (actor.z - nest.z) * 0.9);
              this.pushDamagePopup(actor.x, actor.y + 2.3, actor.z, 45, false, false);
            }
          }
          for (const w of this.wildEcosystem) {
            if (!w.alive) continue;
            const d = Math.hypot(w.x - nest.x, w.z - nest.z);
            if (d < blastRadius && Math.abs(w.y - groundY) < 4.5) {
              this.damageWildEntity(w, 45, ownerId, (w.x - nest.x) * 0.9, (w.z - nest.z) * 0.9);
              this.pushDamagePopup(w.x, w.y + 2.0, w.z, 45, false, false);
            }
          }
        }
      }
    }
  }

  private startTribalRopeStruggle(local: ActorEntity): void {
    const escSecs = Math.max(1.0, this.liveConfig.captureEscapeSeconds || 3.0);
    this.tribalCapturePhase = 'struggle';
    this.struggleProgress = 0;
    this.struggleTimer = escSecs;
    this.wasTouchFireHeld = this.touchState.fireHeld;
    local.alive = true;
    local.hp = 1;
    local.invulnTimer = 4.0;
    local.vx = 0;
    local.vy = 0;
    local.vz = 0;

    // Attach 3D rope bindings around torso & legs
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const bandA = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.62), ropeMat);
    bandA.position.set(0, 1.02, 0);
    const bandB = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.56), ropeMat);
    bandB.position.set(0, 0.52, 0);
    local.rig.root.add(bandA, bandB);
    this.captureRopeMeshes.push(bandA, bandB);

    soundEngine.playVillagerAlert();
    this.showAnnouncement('CAPTURED BY TRIBAL WARRIORS — TAP [SPACE]/[E]/CLICK TO BREAK ROPES!', 3.0);
  }

  private clearCaptureProps(local?: ActorEntity): void {
    for (const m of this.captureRopeMeshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.captureRopeMeshes = [];
    if (this.capturePropsGroup) {
      this.scene.remove(this.capturePropsGroup);
      this.capturePropsGroup.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) mesh.material.forEach((mt) => mt.dispose());
          else mesh.material?.dispose();
        }
      });
      this.capturePropsGroup = null;
    }
    this.captureDancers = [];
    if (local) {
      local.rig.root.rotation.set(0, local.yaw + Math.PI, 0);
    }
  }

  private advanceRopeStruggle(local: ActorEntity): boolean {
    if (this.tribalCapturePhase !== 'struggle') return false;
    const step = local.activeSlot === 'knife' ? 0.25 : 0.16;
    this.struggleProgress = Math.min(1, this.struggleProgress + step);
    soundEngine.playRopeSnap();
    this.spawnExplosionParticles(local.x, local.y + 1.0, local.z, 0xd97706, 4, 0.35);

    if (this.struggleProgress >= 1) {
      this.tribalCapturePhase = 'none';
      this.clearCaptureProps(local);
      local.hp = Math.max(25, Math.min(local.maxHp, 25));
      local.invulnTimer = 2.5;
      local.vy = 6.5;
      soundEngine.playDash();
      this.showAnnouncement('ROPES SNAPPED! ESCAPED WITH 25 HP!', 2.4);
      return true;
    }
    return false;
  }

  private beginTribalSuspendedCutscene(local: ActorEntity): void {
    this.tribalCapturePhase = 'suspended';
    this.captureCutsceneTimer = 4.2;
    this.captureDrumAccum = 0;
    this.captureCamAngle = 0;
    local.invulnTimer = 6.0;

    const cf = this.arena.tribalCampfireCenter;
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });

    // Twin forked wooden Y-stakes flanking the tribal ceremonial campfire
    for (const sx of [-2.4, 2.4]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.6, 8), woodMat);
      stake.position.set(cf.x + sx, cf.y + 1.6, cf.z);
      stake.castShadow = true;
      g.add(stake);
    }
    // Horizontal pole suspending the bound captive
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.4, 8), woodMat);
    pole.rotation.z = Math.PI / 2;
    pole.position.set(cf.x, cf.y + 3.05, cf.z);
    pole.castShadow = true;
    g.add(pole);

    // Rope suspension loops hanging from pole to player
    for (const rx of [-0.65, 0.65]) {
      const loop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.14), ropeMat);
      loop.position.set(cf.x + rx, cf.y + 2.72, cf.z);
      g.add(loop);
    }

    // 6 Dancing Tribal Warriors encircling the campfire
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    this.captureDancers = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const dx = cf.x + Math.cos(a) * 4.5;
      const dz = cf.z + Math.sin(a) * 4.5;
      const gy = this.arena.getGroundHeightAt(dx, dz);
      const dancer = new THREE.Group();
      dancer.position.set(dx, gy, dz);
      dancer.lookAt(cf.x, gy, cf.z);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.86, 0.46), tunicMat);
      torso.position.y = 1.05;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 0.64), skinMat);
      head.position.y = 1.82;
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, 0.16), featherMat);
      crest.position.set(0, 2.28, -0.05);
      const spear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), woodMat);
      spear.position.set(0.55, 1.5, 0.15);
      dancer.add(torso, head, crest, spear);
      g.add(dancer);
      this.captureDancers.push(dancer);
    }

    this.capturePropsGroup = g;
    this.scene.add(g);

    local.x = cf.x;
    local.y = cf.y + 2.38;
    local.z = cf.z;
    local.rig.root.visible = true;
    local.rig.root.position.set(cf.x, cf.y + 2.38, cf.z);
    local.rig.root.rotation.set(0, 0, Math.PI / 2);

    soundEngine.playTribalDrums();
    this.showAnnouncement('CAPTURED! HUNG OVER THE TRIBAL CEREMONIAL FIRE!', 4.2);
  }

  private stepTribalCaptureSequence(local: ActorEntity, dt: number): void {
    if (this.tribalCapturePhase === 'struggle') {
      // Check mobile one-shot tap edges during struggle
      if (this.touchState.jumpPressed || this.touchState.interactPressed) {
        this.touchState.jumpPressed = false;
        this.touchState.interactPressed = false;
        if (this.advanceRopeStruggle(local)) return;
      }
      if (this.touchState.fireHeld && !this.wasTouchFireHeld) {
        if (this.advanceRopeStruggle(local)) return;
      }
      this.wasTouchFireHeld = this.touchState.fireHeld;

      this.struggleTimer -= dt;
      local.rig.root.position.set(
        local.x + (Math.random() - 0.5) * 0.08,
        local.y,
        local.z + (Math.random() - 0.5) * 0.08
      );
      if (this.struggleTimer <= 0) {
        this.beginTribalSuspendedCutscene(local);
      }
      return;
    }

    if (this.tribalCapturePhase === 'suspended') {
      this.captureCutsceneTimer -= dt;
      this.captureDrumAccum += dt;
      if (this.captureDrumAccum >= 0.72) {
        this.captureDrumAccum = 0;
        soundEngine.playTribalDrums();
      }
      const cf = this.arena.tribalCampfireCenter;
      local.rig.root.position.set(cf.x, cf.y + 2.38 + Math.sin(this.elapsed * 5) * 0.05, cf.z);
      for (let i = 0; i < this.captureDancers.length; i++) {
        const d = this.captureDancers[i];
        const a = (i / this.captureDancers.length) * Math.PI * 2 + this.elapsed * 0.85;
        const dx = cf.x + Math.cos(a) * 4.5;
        const dz = cf.z + Math.sin(a) * 4.5;
        const gy = this.arena.getGroundHeightAt(dx, dz);
        d.position.set(dx, gy + Math.abs(Math.sin(this.elapsed * 7 + i)) * 0.48, dz);
        d.lookAt(cf.x, gy, cf.z);
      }
      this.captureCamAngle += dt * 0.55;
      if (this.captureCutsceneTimer <= 0) {
        this.tribalCapturePhase = 'none';
        this.clearCaptureProps(local);
        this.finishMatch(false, true);
      }
    }
  }

  private stepParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.spinVx) p.mesh.rotation.x += p.spinVx * dt;
      if (p.spinVz) p.mesh.rotation.z += p.spinVz * dt;
      if (p.expandRate) {
        p.mesh.scale.addScalar(p.expandRate * dt);
      } else {
        p.mesh.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private updateOceanFishAndWildlife(dt: number): void {
    const t = this.elapsed;
    this.instancedFishSchool?.update(t);

    for (const fish of this.oceanFish) {
      const a = t * fish.orbitSpeed + fish.orbitPhase;
      const r = fish.orbitRadius + Math.sin(t * fish.wobbleFreq + fish.orbitPhase) * fish.wobbleAmp;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      let y = fish.depthY + Math.sin(t * 2 + fish.orbitPhase) * 0.14;
      let pitch = 0;

      if (fish.species === 'dolphin') {
        if (!fish.isLeaping) {
          fish.leapTimer -= dt;
          if (fish.leapTimer <= 0) {
            fish.isLeaping = true;
            fish.leapProgress = 0;
            fish.splashedOut = false;
            fish.splashedIn = false;
          }
        }
        if (fish.isLeaping) {
          fish.leapProgress += dt * 0.85;
          const p = Math.min(1, fish.leapProgress);
          y = fish.depthY + Math.sin(p * Math.PI) * 3.15;
          pitch = -Math.cos(p * Math.PI) * 0.72;
          if (!fish.splashedOut && p >= 0.16) {
            fish.splashedOut = true;
            this.spawnExplosionParticles(x, WATER_LEVEL + 0.08, z, 0xe0f2fe, 5, 0.55);
            if (Math.hypot(x - this.camera.position.x, z - this.camera.position.z) < 75) {
              soundEngine.playDolphinSplash();
            }
          }
          if (!fish.splashedIn && p >= 0.82) {
            fish.splashedIn = true;
            this.spawnExplosionParticles(x, WATER_LEVEL + 0.08, z, 0xe0f2fe, 6, 0.6);
          }
          if (fish.leapProgress >= 1) {
            fish.isLeaping = false;
            fish.leapProgress = -1;
            fish.leapTimer = 4.5 + Math.random() * 6.5;
          }
        }
        fish.tailPivot.rotation.x = Math.sin(t * 10 + fish.orbitPhase) * 0.38;
      } else if (fish.species === 'turtle') {
        const stroke = Math.sin(t * 3.8 + fish.orbitPhase) * 0.45;
        if (fish.wingL) fish.wingL.rotation.y = stroke;
        if (fish.wingR) fish.wingR.rotation.y = -stroke;
      } else if (fish.species === 'manta') {
        const glide = Math.sin(t * 3.4 + fish.orbitPhase) * 0.28;
        if (fish.wingL) fish.wingL.rotation.z = glide;
        if (fish.wingR) fish.wingR.rotation.z = -glide;
      } else if (fish.species === 'jellyfish') {
        const pulse = 1 + Math.sin(t * 3.6 + fish.orbitPhase) * 0.14;
        y = fish.depthY + Math.sin(t * 1.8 + fish.orbitPhase) * 0.28;
        if (fish.bellMesh) {
          fish.bellMesh.scale.set(pulse, 1 / pulse, pulse);
        }
      } else {
        fish.tailPivot.rotation.y = Math.sin(t * (fish.isShark ? 7 : 12) + fish.orbitPhase) * 0.42;
      }

      fish.root.position.set(x, y, z);
      fish.root.rotation.set(pitch, -a + (fish.orbitSpeed > 0 ? 0 : Math.PI), 0, 'YXZ');
    }

    // Orbiting Mermaids (Jalparis) + periodic glowing Pearl drops near sea caves
    for (const m of this.mermaids) {
      const a = t * m.speed + m.phase;
      m.x = m.centerX + Math.cos(a) * m.orbitR;
      m.z = m.centerZ + Math.sin(a) * m.orbitR;
      m.y = WATER_LEVEL - 1.15 + Math.sin(t * 2.1 + m.phase) * 0.35;
      m.root.position.set(m.x, m.y, m.z);
      m.root.rotation.y = -a + (m.speed > 0 ? 0 : Math.PI);
      m.tailPivot.rotation.x = Math.sin(t * 5.2 + m.phase) * 0.45;
      m.armL.rotation.z = 0.2 + Math.sin(t * 3.4 + m.phase) * 0.25;
      m.armR.rotation.z = -0.2 - Math.sin(t * 3.4 + m.phase) * 0.25;

      m.pearlTimer -= dt;
      if (
        m.pearlTimer <= 0 &&
        this.pickups.length < 240 &&
        Math.hypot(m.x - this.camera.position.x, m.z - this.camera.position.z) < 95
      ) {
        m.pearlTimer = 34;
        const floorY = Math.max(WATER_LEVEL - 4.4, this.arena.getGroundHeightAt(m.x, m.z) + 0.65);
        this.spawnPickup(`mpearl_${Date.now()}_${Math.floor(Math.random() * 99)}`, 'pearl', m.x, floorY, m.z);
      }
    }

    // Inland Pond Life (Koi Fish, Ducks, Frogs, Shore Crabs)
    for (const pc of this.pondCreatures) {
      const a = t * pc.speed + pc.phase;
      if (pc.kind === 'koi') {
        const px = pc.pond.x + Math.cos(a) * pc.orbitR;
        const pz = pc.pond.z + Math.sin(a) * pc.orbitR;
        pc.root.position.set(px, pc.pond.surfaceY - 0.35, pz);
        pc.root.rotation.y = -a;
        pc.animPart.rotation.y = Math.sin(t * 10 + pc.phase) * 0.4;
      } else if (pc.kind === 'duck') {
        const px = pc.pond.x + Math.cos(a) * pc.orbitR;
        const pz = pc.pond.z + Math.sin(a) * pc.orbitR;
        pc.root.position.set(px, pc.pond.surfaceY + 0.02 + Math.sin(t * 3 + pc.phase) * 0.04, pz);
        pc.root.rotation.y = -a;
      } else if (pc.kind === 'frog') {
        const px = pc.pond.x + Math.cos(pc.phase) * pc.orbitR;
        const pz = pc.pond.z + Math.sin(pc.phase) * pc.orbitR;
        pc.hopTimer -= dt;
        if (pc.hopTimer <= 0) pc.hopTimer = 3.2;
        const hop = pc.hopTimer > 2.7 ? Math.sin(((3.2 - pc.hopTimer) / 0.5) * Math.PI) * 0.55 : 0;
        pc.root.position.set(px, pc.pond.surfaceY + 0.04 + hop, pz);
        pc.root.rotation.y = pc.phase + Math.PI * 0.5;
      } else {
        const px = pc.pond.x + Math.cos(a) * pc.orbitR;
        const pz = pc.pond.z + Math.sin(a) * pc.orbitR;
        const gy = Math.max(pc.pond.surfaceY + 0.08, this.arena.getGroundHeightAt(px, pz));
        pc.root.position.set(px, gy, pz);
        pc.root.rotation.y = -a + Math.PI / 2;
      }
    }

    const local = this.getLocalActor();
    if (local && !this.isPaused && !this.matchEnded && local.brState === 'ground') {
      if (Math.hypot(local.x, local.z) > 135) {
        this.coastalAmbienceTimer -= dt;
        if (this.coastalAmbienceTimer <= 0) {
          this.coastalAmbienceTimer = 9 + Math.random() * 8;
          soundEngine.playSeagullCry();
        }
      }
    }

    for (const an of this.wildAnimals) {
      if (an.kind === 'bird') {
        const a = t * an.orbitSpeed + an.phase;
        an.x = Math.cos(a) * an.orbitR;
        an.z = Math.sin(a) * an.orbitR;
        an.root.position.set(an.x, an.y + Math.sin(t * 2.5 + an.phase) * 1.4, an.z);
        an.root.rotation.y = -a + (an.orbitSpeed > 0 ? 0 : Math.PI);
        const flap = Math.sin(t * 14 + an.phase) * 0.55;
        if (an.parts[0]) an.parts[0].rotation.z = flap;
        if (an.parts[1]) an.parts[1].rotation.z = -flap;
      } else {
        an.timer -= dt;
        if (an.timer <= 0) {
          an.timer = 2.5 + Math.random() * 4;
          an.yaw = Math.random() * Math.PI * 2;
        }
        const nx = an.x + Math.sin(an.yaw) * an.speed * dt;
        const nz = an.z + Math.cos(an.yaw) * an.speed * dt;
        const gy = this.arena.getGroundHeightAt(nx, nz);
        if (gy > 0 && Math.abs(nx) < this.arena.halfSize - 25 && Math.abs(nz) < this.arena.halfSize - 25) {
          an.x = nx;
          an.z = nz;
          an.y = gy;
        } else {
          an.yaw += Math.PI * 0.8;
        }
        an.root.position.set(an.x, an.y, an.z);
        an.root.rotation.y = an.yaw;
        for (let l = 0; l < an.parts.length; l++) {
          an.parts[l].rotation.x = Math.sin(t * 9 + l * Math.PI) * 0.45;
        }
      }
    }
  }

  private updateCameraAndLaser(dt: number): void {
    const local = this.getLocalActor();
    if (!local) return;

    if (this.tribalCapturePhase === 'suspended') {
      const cf = this.arena.tribalCampfireCenter;
      const dist = 9.5;
      _vDesiredCam.set(
        cf.x + Math.sin(this.captureCamAngle) * dist,
        cf.y + 4.4,
        cf.z + Math.cos(this.captureCamAngle) * dist
      );
      this.camera.position.lerp(_vDesiredCam, 1 - Math.exp(-8 * dt));
      this.camera.lookAt(cf.x, cf.y + 2.0, cf.z);
      this.laserLine.visible = false;
      this.laserDot.visible = false;
      this.grenadeArcLine.visible = false;
      return;
    }

    if (local.brState === 'plane') {
      const cosP = Math.cos(Math.max(0.18, this.camPitch + 0.28));
      const sinP = Math.sin(Math.max(0.18, this.camPitch + 0.28));
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const dist = 24;
      _vDesiredCam.set(
        this.brPlanePos.x + sinY * cosP * dist,
        this.brPlanePos.y + sinP * dist + 2,
        this.brPlanePos.z + cosY * cosP * dist
      );
      this.camera.position.lerp(_vDesiredCam, 1 - Math.exp(-10 * dt));
      this.camera.lookAt(this.brPlanePos);
      this.laserLine.visible = false;
      this.laserDot.visible = false;
      this.grenadeArcLine.visible = false;
      return;
    }

    const crouchDrop = local.isCrouching ? 0.42 : 0;
    const eyeY = local.y + 1.66 - crouchDrop;
    if (this.cameraView === 'first') {
      _vDesiredCam.set(local.x, eyeY, local.z);
      this.camera.position.copy(_vDesiredCam);
      const lookX = local.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * 12;
      const lookY = eyeY - Math.sin(this.camPitch) * 12;
      const lookZ = local.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * 12;
      this.camera.lookAt(lookX, lookY, lookZ);
    } else {
      const mountedBird =
        local.mountedId && this.mounts.get(local.mountedId)?.isFlyingMount ? true : false;
      const targetDist =
        local.brState === 'parachute'
          ? 7.5
          : this.cameraView === 'close'
            ? mountedBird
              ? 8.4
              : local.mountedId
                ? 6.2
                : 4.5
            : mountedBird
              ? this.camZoom + 2.6
              : this.camZoom;
      const shoulderOffset = this.cameraView === 'close' && local.brState === 'ground' ? 0.92 : 0;
      const pivotY = local.y + (local.mountedId ? 1.9 : 1.55 - crouchDrop);

      const cosP = Math.cos(this.camPitch);
      const sinP = Math.sin(this.camPitch);
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);

      _vCamPivot.set(local.x + cosY * shoulderOffset, pivotY, local.z - sinY * shoulderOffset);
      _vCamRay.set(sinY * cosP, sinP, cosY * cosP).normalize();

      // Raycast camera collision against walls/buildings
      let clampedDist = targetDist;
      const cols = this.arena.queryColliders(
        _vCamPivot.x - targetDist,
        _vCamPivot.x + targetDist,
        _vCamPivot.z - targetDist,
        _vCamPivot.z + targetDist
      );
      for (const c of cols) {
        if (c.kind === 'glass') continue;
        const d = rayIntersectAABB(
          _vCamPivot.x,
          _vCamPivot.y,
          _vCamPivot.z,
          _vCamRay.x,
          _vCamRay.y,
          _vCamRay.z,
          clampedDist,
          c
        );
        if (d !== null && d < clampedDist) {
          clampedDist = Math.max(1.2, d - 0.35);
        }
      }

      _vDesiredCam.copy(_vCamPivot).addScaledVector(_vCamRay, clampedDist);
      const groundFloor = this.arena.getGroundHeightAt(_vDesiredCam.x, _vDesiredCam.z) + 0.55;
      if (_vDesiredCam.y < groundFloor) _vDesiredCam.y = groundFloor;

      if (this.screenShake > 0.001) {
        _vDesiredCam.x += (Math.random() - 0.5) * this.screenShake;
        _vDesiredCam.y += (Math.random() - 0.5) * this.screenShake;
      }

      this.camera.position.lerp(_vDesiredCam, 1 - Math.exp(-22 * dt));
      const lookPt = _vCamPivot.clone().add(new THREE.Vector3(-sinY * cosP * 14, -sinP * 14, -cosY * cosP * 14));
      this.camera.lookAt(lookPt);
    }

    // Keep Directional Sun Shadow Frustum centered near player (Main Island, Titanic & Tribal Island)
    this.sunLight.position.set(local.x + 110, 165, local.z + 95);
    this.sunLight.target.position.set(local.x, 0, local.z);
    this.sunLight.target.updateMatrixWorld();
    if (this.moonMesh && this.moonMesh.visible) {
      this.moonMesh.position.set(local.x - 190, 210, local.z - 220);
    }

    // Dynamic Underwater Visibility Fog
    const camUnder = this.camera.position.y < WATER_LEVEL - 0.08;
    if (camUnder !== this.isCameraUnderwater) {
      this.isCameraUnderwater = camUnder;
      this.scene.fog = camUnder
        ? new THREE.FogExp2(0x024e73, 0.016)
        : new THREE.FogExp2(this.baseFogColor, this.baseFogDensity);
    }

    // Gun 3D Laser Sight
    const showLaser =
      local.alive &&
      !local.knockedDown &&
      local.brState === 'ground' &&
      local.activeSlot === 'gun' &&
      !local.isReloading;
    this.laserLine.visible = showLaser;
    this.laserDot.visible = showLaser;
    if (showLaser && local.rig.gunHandle) {
      _vMuzzle.copy(local.rig.gunHandle.muzzleLocal);
      local.rig.gunHandle.group.localToWorld(_vMuzzle);
      const ray = this.computeCrosshairAimRay(local);
      const posAttr = this.laserLine.geometry.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(0, _vMuzzle.x, _vMuzzle.y, _vMuzzle.z);
      posAttr.setXYZ(1, ray.targetPt.x, ray.targetPt.y, ray.targetPt.z);
      posAttr.needsUpdate = true;
      this.laserDot.position.copy(ray.targetPt);
    }

    // Grenade throwing arc preview when slot === 'grenade'
    const showArc =
      local.alive &&
      !local.knockedDown &&
      local.brState === 'ground' &&
      local.activeSlot === 'grenade' &&
      local.grenadeCount > 0;
    this.grenadeArcLine.visible = showArc;
    if (showArc) {
      const dir = this.camera.getWorldDirection(new THREE.Vector3());
      const vx = dir.x * 23;
      const vy = dir.y * 23 + 7.5;
      const vz = dir.z * 23;
      const sx = local.x + dir.x * 0.9;
      const sy = local.y + 1.65;
      const sz = local.z + dir.z * 0.9;
      for (let i = 0; i < 24; i++) {
        const t = i * 0.08;
        this.grenadeArcPoints[i].set(sx + vx * t, sy + vy * t - 13 * t * t, sz + vz * t);
      }
      this.grenadeArcLine.geometry.setFromPoints(this.grenadeArcPoints);
      this.grenadeArcLine.computeLineDistances();
    }
  }

  private syncNetwork(dt: number): void {
    const ws = this.config.networkSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    this.netSendAccum += dt;
    if (this.netSendAccum < 0.05) return;
    this.netSendAccum = 0;
    const local = this.getLocalActor();
    if (!local) return;
    try {
      ws.send(
        JSON.stringify({
          type: 'player_state',
          state: {
            x: local.x,
            y: local.y,
            z: local.z,
            vx: local.vx,
            vy: local.vy,
            vz: local.vz,
            yaw: local.yaw,
            anim: local.anim,
            gunId: local.gunId,
            knifeId: local.knifeId,
            activeSlot: local.activeSlot,
          },
        })
      );
    } catch {
      // Ignore network hiccup
    }
  }

  public applyNetworkSnapshot(
    players: NetworkPlayerSnapshot[],
    projectiles: NetworkProjectileSnapshot[],
    pickups: NetworkPickupSnapshot[],
    timeRemaining: number
  ): void {
    this.timeRemaining = timeRemaining;
    const seenIds = new Set<string>();
    for (const snap of players) {
      seenIds.add(snap.id);
      if (snap.id === this.config.localNetworkId) continue;
      let actor = this.actors.get(snap.id);
      if (!actor) {
        actor = this.createActor({
          id: snap.id,
          name: snap.name,
          playerTag: snap.playerTag,
          level: snap.level || 1,
          team: snap.team,
          isLocal: false,
          isBot: snap.isBot,
          customization: snap.customization,
          gunId: snap.gunId,
          knifeId: snap.knifeId,
          grenadeId: 'frag_grenade',
          x: snap.x,
          y: snap.y,
          z: snap.z,
          maxHp: snap.maxHp,
          ammoInMag: 12,
          reserveAmmo: 99,
          grenadeCount: 2,
        });
        this.actors.set(snap.id, actor);
      }
      actor.x = snap.x;
      actor.y = snap.y;
      actor.z = snap.z;
      actor.yaw = snap.yaw;
      actor.anim = snap.anim;
      actor.hp = snap.hp;
      actor.hearts = snap.hearts ?? actor.hearts;
      actor.score = snap.score;
      actor.kos = snap.kos;
      actor.deaths = snap.deaths;
      actor.alive = snap.alive;
    }

    // Update remote projectile meshes cleanly
    const seenProj = new Set<string>();
    for (const pr of projectiles) {
      seenProj.add(pr.id);
      let m = this.networkProjectiles.get(pr.id);
      if (!m) {
        m = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.5),
          new THREE.MeshBasicMaterial({ color: pr.color })
        );
        this.scene.add(m);
        this.networkProjectiles.set(pr.id, m);
      }
      m.position.set(pr.x, pr.y, pr.z);
    }
    for (const [id, m] of this.networkProjectiles.entries()) {
      if (!seenProj.has(id)) {
        this.scene.remove(m);
        this.networkProjectiles.delete(id);
      }
    }
    void pickups;
  }

  private handleTimerEnd(): void {
    const local = this.getLocalActor();
    if (this.config.mode === 'battle_royale') {
      const sorted = Array.from(this.actors.values()).sort(
        (a, b) => Number(b.alive) - Number(a.alive) || b.score - a.score
      );
      const victory = Boolean(local && local.alive && sorted[0]?.id === local.id);
      this.finishMatch(victory);
      return;
    }
    const sorted = Array.from(this.actors.values()).sort((a, b) => b.score - a.score);
    const victory = local ? sorted[0]?.id === local.id : false;
    this.finishMatch(victory);
  }

  private finishMatch(victory: boolean, capturedByTribe = false): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.unlockPointer();
    soundEngine.updateEngineSound(false);
    if (victory) soundEngine.playVictory();
    else soundEngine.playDefeat();

    const isBR = this.config.mode === 'battle_royale';
    const local = this.getLocalActor();
    const sorted = Array.from(this.actors.values()).sort((a, b) =>
      isBR ? Number(b.alive) - Number(a.alive) || b.score - a.score : b.score - a.score
    );
    const placement = local ? sorted.findIndex((a) => a.id === local.id) + 1 : 1;

    let blueScore = 0;
    let redScore = 0;
    for (const a of this.actors.values()) {
      if (a.team === 'blue') blueScore += a.score;
      if (a.team === 'red') redScore += a.score;
    }
    const teamVictory = isBR
      ? this.config.teamMode === 'team' && victory
      : this.config.teamMode === 'team' &&
        ((this.config.playerTeam === 'blue' && blueScore >= redScore) ||
          (this.config.playerTeam === 'red' && redScore > blueScore));

    this.onMatchEnd({
      mode: this.config.mode,
      arena: this.config.arenaId,
      victory: isBR ? victory : this.config.teamMode === 'team' ? teamVictory : victory,
      teamVictory,
      capturedByTribe,
      placement,
      score: local?.score ?? 0,
      kos: local?.kos ?? 0,
      deaths: local?.deaths ?? 0,
      coinsCollected: local?.coinsInMatch ?? 0,
      animalsHunted: this.animalsHuntedInMatch,
      shipsBoarded: this.boardedShipIds.size,
      waveReached: this.wave,
      tournamentRound: this.tournamentRound,
      xpEarned: 0,
      coinsEarned: 0,
      bonusCoinsEarned: this.bonusCoinsInMatch,
      coinBreakdown: {
        eliminations: 0,
        victoryBonus: 0,
        completionBonus: 0,
        teamBonus: 0,
        shoreTreasures: this.bonusCoinsInMatch,
      },
      leveledUp: false,
      newLevel: this.config.playerLevel,
      newlyUnlockedAchievements: [],
    });
  }

  private emitHud(): void {
    const local = this.getLocalActor();
    if (!local) return;

    const gun = getGunDef(local.gunId);
    let nearDoorPrompt: string | null = null;
    for (const door of this.arena.doors) {
      if (Math.hypot(door.triggerX - local.x, door.triggerZ - local.z) < 4.5 && Math.abs(door.triggerY - local.y) < 3.5) {
        nearDoorPrompt = door.isOpen ? 'Close Door [E]' : 'Open Door [E]';
        break;
      }
    }

    const nearFruit = local.alive && !local.knockedDown && !local.mountedId && !local.isSitting && local.brState === 'ground'
      ? this.findNearestFruit(local)
      : null;
    this.nearFruitPrompt = nearFruit
      ? `Press [E] to Eat ${nearFruit.kind.charAt(0).toUpperCase() + nearFruit.kind.slice(1)} (+${this.liveConfig.fruitHealAmount} HP, +Speed)`
      : null;

    const nearBench = local.isSitting || local.mountedId || local.isSwimming ? null : this.findNearestBench(local);
    const nearBenchPrompt = local.isSitting
      ? 'Resting on Bench (+5 HP/s) · Press [E] or Move to Stand'
      : nearBench
        ? 'Press [E] to Sit & Rest (+5 HP/s)'
        : null;

    const nearMount = local.mountedId ? null : this.findNearestEmptyMount(local);
    const currentMount = local.mountedId ? this.mounts.get(local.mountedId) : null;
    const nearMountPrompt = currentMount
      ? `${
          currentMount.isFlyingMount
            ? 'Flying'
            : isBoatKind(currentMount.kind)
              ? 'Steering'
              : 'Riding'
        } ${currentMount.name} · WASD/Arrows Move · Shift Boost · ${
          currentMount.isFlyingMount
            ? 'Space Fly Up / C Fly Down · [F] Exit (Auto-Chute)'
            : currentMount.isMarineMount
              ? 'C Dive / Space Surface · [F] Exit'
              : `Space ${
                  isLandAnimalKind(currentMount.kind)
                    ? 'Leap'
                    : isBoatKind(currentMount.kind)
                      ? 'Brake'
                      : 'Drift'
                } · [F] Exit`
        }`
      : nearMount
        ? `Press [F] to ${
            nearMount.isFlyingMount
              ? 'Ride & Fly'
              : isBoatKind(nearMount.kind)
                ? 'Board'
                : 'Ride'
          } ${nearMount.name} — WASD or Arrows to Steer`
        : null;

    // Crosshair hover enemy check (only unblocked enemies, never allies)
    let aimOnEnemy = false;
    this.camera.getWorldPosition(_vOrigin);
    this.camera.getWorldDirection(_vDir);
    for (const other of this.actors.values()) {
      if (other.id === local.id || !other.alive) continue;
      if (this.isFriendly(local.id, other)) continue;
      const t = (other.x - _vOrigin.x) * _vDir.x + (other.y + 1.15 - _vOrigin.y) * _vDir.y + (other.z - _vOrigin.z) * _vDir.z;
      if (t > 1 && t < 160) {
        const px = _vOrigin.x + _vDir.x * t - other.x;
        const py = _vOrigin.y + _vDir.y * t - (other.y + 1.15);
        const pz = _vOrigin.z + _vDir.z * t - other.z;
        if (px * px + py * py * 0.55 + pz * pz < 1.1) {
          if (this.hasLineOfSight(_vOrigin.x, _vOrigin.y, _vOrigin.z, other.x, other.y + 1.15, other.z)) {
            aimOnEnemy = true;
            break;
          }
        }
      }
    }

    // Project floating damage numbers to screen percentages
    const projectedPopups: DamagePopupHud[] = [];
    for (let i = 0; i < this.damagePopups.length; i++) {
      const dp = this.damagePopups[i];
      _vProj.set(dp.x, dp.y, dp.z).project(this.camera);
      if (_vProj.z < -1 || _vProj.z > 1) continue;
      const xPct = (_vProj.x * 0.5 + 0.5) * 100;
      const yPct = (-_vProj.y * 0.5 + 0.5) * 100;
      if (xPct < 4 || xPct > 96 || yPct < 4 || yPct > 96) continue;
      projectedPopups.push({
        id: dp.id,
        xPct,
        yPct,
        text: dp.text,
        isCrit: dp.isCrit,
        isVehicle: dp.isVehicle,
        alpha: Math.max(0, Math.min(1, dp.life / dp.maxLife)),
      });
    }

    const sorted = Array.from(this.actors.values()).sort((a, b) => b.score - a.score);
    const topId = sorted[0]?.id;

    let blueScore = 0;
    let redScore = 0;
    for (const a of this.actors.values()) {
      if (a.team === 'blue') blueScore += a.score;
      if (a.team === 'red') redScore += a.score;
    }

    const isBR = this.config.mode === 'battle_royale';
    const allActors = Array.from(this.actors.values()).filter((a) => !a.guardRole);
    const aliveCount = allActors.filter((a) => a.alive).length;
    const playersInPlane = allActors.filter((a) => a.alive && a.brState === 'plane').length;

    const nearLoot = local.alive && !local.knockedDown && !local.mountedId && !this.inJail
      ? this.findNearestDroppedWeapon(local)
      : null;
    this.nearLootPrompt = nearLoot ? `REPLACE · ${getGunDef(nearLoot.gunId).name.toUpperCase()}` : null;

    const distConsole = Math.hypot(local.x - MISSILE_CONSOLE_POS.x, local.z - MISSILE_CONSOLE_POS.z);
    this.nearConsolePrompt =
      local.alive && !local.mountedId && !this.inJail && distConsole < 4.8 && Math.abs(local.y - MISSILE_CONSOLE_POS.y) < 3.5
        ? 'Press [E] to Sit at Missile Control Console'
        : null;
    const outsideZone =
      isBR &&
      local.brState !== 'plane' &&
      Math.hypot(local.x - this.brZoneCenterX, local.z - this.brZoneCenterZ) > this.brZoneRadius;

    let reviveTargetName: string | null = null;
    let reviveProgress = 0;
    if (isBR && this.config.teamMode === 'team' && local.alive && !local.knockedDown && local.brState === 'ground') {
      let bestD = 3.6;
      for (const other of allActors) {
        if (other.id === local.id || !other.alive || !other.knockedDown || other.team !== local.team) continue;
        const d = Math.hypot(other.x - local.x, other.z - local.z);
        if (d < bestD && Math.abs(other.y - local.y) < 3.0) {
          bestD = d;
          reviveTargetName = other.name;
          reviveProgress = other.reviveProgress;
        }
      }
    }

    const groundYHere = Math.max(WATER_LEVEL, this.arena.getGroundHeightAt(local.x, local.z));
    const altitudeMeters = Math.max(0, Math.round(local.y - groundYHere));
    const activeAirdrop = this.brAirdrops.find((d) => !d.opened) ?? null;
    const zoneStatusText =
      this.brZoneTimer >= 900
        ? 'FINAL CIRCLE'
        : this.brZonePhase === 'hold'
          ? `STAGE ${this.brZoneStage} CLOSING IN ${Math.ceil(this.brZoneTimer)}s`
          : `STAGE ${this.brZoneStage} SHRINKING (${Math.ceil(this.brZoneTimer)}s)`;

    this.onHudUpdate({
      mode: this.config.mode,
      teamMode: this.config.teamMode,
      playerTeam: local.team,
      arena: this.config.arenaId,
      gunId: local.gunId,
      knifeId: local.knifeId,
      grenadeId: local.grenadeId,
      activeSlot: local.activeSlot,
      cameraView: this.cameraView,
      isPointerLocked: this.isPointerLocked,
      ammoInMag: local.ammoInMag,
      magSize: gun.magSize,
      reserveAmmo: local.reserveAmmo,
      isReloading: local.isReloading,
      reloadProgress: local.isReloading ? 1 - Math.max(0, local.reloadTimer) / gun.reloadTime : 0,
      grenadeCount: local.grenadeCount,
      aimOnEnemy,
      crosshairSpread: Math.hypot(local.vx, local.vz) * 0.6 + (local.attackTimer > 0 ? 10 : 0),
      hitMarkerTime: this.hitMarkerTime,
      allyShieldTime: this.allyShieldTime,
      damageIndicatorAngle: this.damageIndicatorAngle,
      damageIndicatorTime: this.damageIndicatorTime,
      damagePopups: projectedPopups,
      killFeed: this.killFeed.map(({ ttl: _ttl, ...rest }) => rest),
      nearDoorPrompt,
      nearBenchPrompt,
      nearMountPrompt,
      mountedKind: currentMount ? currentMount.kind : null,
      mountedName: currentMount ? currentMount.name : null,
      mountedHp: currentMount ? currentMount.hp : 0,
      mountedMaxHp: currentMount ? currentMount.maxHp : 100,
      mountedSpeedKmh: currentMount ? Math.round(Math.abs(currentMount.speed) * 3.2) : 0,
      isSwimming: local.isSwimming,
      isCrouching: local.isCrouching,
      isSitting: local.isSitting,
      blindFlashAlpha: this.blindFlashAlpha,
      timeRemaining: this.timeRemaining,
      wave: this.wave,
      tournamentRound: this.tournamentRound,
      localHp: local.hp,
      localMaxHp: local.maxHp,
      localHearts: local.hearts,
      localMaxHearts: local.maxHearts,
      localStamina: local.stamina,
      localScore: local.score,
      localKos: local.kos,
      localCoinsInMatch: local.coinsInMatch,
      dashCooldownRatio: Math.min(1, local.dashCooldown / 1.6),
      fireCooldownRatio: Math.min(1, local.fireCooldown * gun.fireRate),
      knifeCooldownRatio: Math.min(1, local.knifeCooldown / getKnifeDef(local.knifeId).cooldown),
      activePowerup: local.powerBoostTimer > 0 ? 'POWER BOOST' : local.speedBoostTimer > 0 ? 'SPEED BOOST' : null,
      activePowerupTime: Math.max(local.powerBoostTimer, local.speedBoostTimer),
      combatants: sorted.slice(0, 16).map((a) => ({
        id: a.id,
        name: a.name,
        playerTag: a.playerTag,
        level: a.level,
        team: a.team,
        isLocal: a.isLocal,
        isBot: a.isBot,
        color: a.customization.primaryColor,
        hp: a.hp,
        maxHp: a.maxHp,
        hearts: a.hearts,
        score: a.score,
        kos: a.kos,
        deaths: a.deaths,
        alive: a.alive,
        hasCrown: a.id === topId && a.score > 0,
      })),
      blueTeamScore: blueScore,
      redTeamScore: redScore,
      announcement: this.announcement,
      isPaused: this.isPaused,
      matchEnded: this.matchEnded,
      playerX: local.x,
      playerZ: local.z,
      camYaw: this.camYaw,
      radarHalfRange: isBR ? 240 : 165,
      radarBuildings: this.arena.radarBuildings,
      radarActors: sorted.map((a) => ({
        id: a.id,
        x: a.x,
        z: a.z,
        isLocal: a.isLocal,
        team: a.team,
        alive: a.alive,
      })),
      radarPickups: this.pickups
        .filter((pk) => pk.active)
        .map((pk) => ({ x: pk.x, z: pk.z, kind: pk.kind })),
      radarVehicles: Array.from(this.mounts.values())
        .filter((m) => m.alive)
        .map((m) => ({ x: m.x, z: m.z, kind: m.kind, occupied: Boolean(m.riderId) })),
      isUnderwater: local.isUnderwater,
      hasDivingHelmet: local.isUnderwater,
      nearCampfire: this.nearCampfire,
      inLavaZone: this.inLavaZone,
      tribalIslandCenter: this.arena.tribalIslandCenter,
      airportIslandCenter: this.arena.airportIslandCenter,
      titanicCenter: this.arena.titanicCenter,
      isBattleRoyale: isBR,
      brPhase: local.brState,
      playersInPlane,
      totalFighters: allActors.length,
      aliveCount,
      altitudeMeters,
      armorHp: local.armorHp,
      armorMaxHp: local.armorMaxHp,
      armorLevel: local.armorLevel,
      isKnockedDown: local.knockedDown,
      bleedoutRemaining: local.knockedDown ? local.bleedoutTimer : 0,
      reviveTargetName,
      reviveProgress,
      outsideZone,
      zoneStage: this.brZoneStage,
      zoneTimer: this.brZoneTimer,
      zoneStatusText,
      zoneCenterX: this.brZoneCenterX,
      zoneCenterZ: this.brZoneCenterZ,
      zoneRadius: this.brZoneRadius,
      nextZoneCenterX: this.brNextZoneCenterX,
      nextZoneCenterZ: this.brNextZoneCenterZ,
      nextZoneRadius: this.brNextZoneRadius,
      planeFlightStart: { x: this.brPlaneStart.x, z: this.brPlaneStart.z },
      planeFlightEnd: { x: this.brPlaneEnd.x, z: this.brPlaneEnd.z },
      planePos:
        this.brPlaneProgress < 1.25 ? { x: this.brPlanePos.x, z: this.brPlanePos.z } : undefined,
      airdropPos: activeAirdrop ? { x: activeAirdrop.x, z: activeAirdrop.z } : null,
      poisonAlpha: this.poisonAlpha,
      nearFruitPrompt: this.nearFruitPrompt,
      nearLootPrompt: this.nearLootPrompt,
      nearConsolePrompt: this.nearConsolePrompt,
      wantedLevel: this.wantedLevel,
      inJail: this.inJail,
      jailTimeLeft: this.jailTimeLeft,
      jailFinePaid: this.jailFinePaid,
      activeEmote: this.activeEmote,
      missileRoomOpen: this.missileRoomOpen,
      tribalCapturePhase: this.tribalCapturePhase,
      struggleProgress: this.struggleProgress,
      struggleTimeLeft: Math.max(0, this.struggleTimer),
    });
  }

  public setOnEmoteWheelToggle(cb: () => void): void {
    this.onEmoteWheelToggle = cb;
  }

  public triggerEmote(emoteId: EmoteId): void {
    const local = this.getLocalActor();
    if (!local || !local.alive || local.mountedId || local.isSitting || this.inJail) return;
    const def = getEmoteDef(emoteId);
    this.activeEmote = emoteId;
    local.activeEmoteAnim = def.animState;
    local.activeEmoteTimer = 3.6;
    soundEngine.playEmoteChime();
    this.showAnnouncement(`${def.name.toUpperCase()}!`, 1.8);
  }

  public replaceWithNearbyLoot(): void {
    const local = this.getLocalActor();
    if (local) this.tryReplaceWithDroppedWeapon(local);
  }

  public openMissileRoom(): void {
    this.missileRoomOpen = true;
    this.unlockPointer();
    this.emitHud();
  }

  public closeMissileRoom(): void {
    this.missileRoomOpen = false;
    this.emitHud();
  }

  public launchBallisticMissile(targetX: number, targetZ: number): void {
    this.missileRoomOpen = false;
    const local = this.getLocalActor();
    const ownerId = local?.id || 'local_player';

    const missileGrp = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 3.8, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 })
    );
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 1.35, 10),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.5 })
    );
    nose.position.y = -2.45;
    nose.rotation.x = Math.PI;
    const thr = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    thr.position.y = 2.6;
    missileGrp.add(body, nose, thr);
    missileGrp.position.set(targetX, 145, targetZ);
    this.scene.add(missileGrp);

    this.ballisticMissiles.push({
      x: targetX,
      y: 145,
      z: targetZ,
      targetX,
      targetZ,
      vy: -68,
      mesh: missileGrp,
      ownerId,
    });
    this.raiseWantedLevel(5);
    soundEngine.playMissileLaunch();
    this.showAnnouncement('BALLISTIC MISSILE LAUNCHED — IMPACT INCOMING! (WANTED 5★)', 3.6);
    this.emitHud();
  }

  public releaseFromJail(paidBail: boolean): void {
    if (!this.inJail) return;
    this.inJail = false;
    this.jailTimeLeft = 0;
    this.jailFinePaid = 0;
    this.policeBoxInTimer = 0;
    this.wantedLevel = 0;
    const local = this.getLocalActor();
    if (local) {
      local.alive = true;
      local.knockedDown = false;
      local.hp = local.maxHp;
      local.hearts = local.maxHearts;
      local.x = JAIL_RELEASE_POS.x;
      local.y = JAIL_RELEASE_POS.y;
      local.z = JAIL_RELEASE_POS.z;
      local.vx = 0;
      local.vy = 0;
      local.vz = 0;
      local.invulnTimer = 2.5;
      local.rig.root.visible = true;
    }
    soundEngine.playJailBuzzer();
    soundEngine.playBailPaid();
    this.showAnnouncement(
      paidBail ? 'BAIL PAID (1,000 COINS) — RELEASED FROM AIRPORT JAIL!' : 'SENTENCE SERVED — RELEASED FROM AIRPORT JAIL!',
      3.0
    );
    this.emitHud();
  }

  private raiseWantedLevel(addStars: number): void {
    if (this.inJail || this.matchEnded) return;
    const prev = this.wantedLevel;
    this.wantedLevel = Math.min(5, Math.max(prev, prev + addStars));
    this.wantedDecayTimer = 28;
    if (this.wantedLevel > prev) {
      soundEngine.playPoliceSirenBurst();
      this.showAnnouncement(`WANTED LEVEL ${this.wantedLevel} ★ — POLICE UNITS DISPATCHED!`, 2.6);
    }
  }

  private arrestLocalPlayer(local: ActorEntity): void {
    this.inJail = true;
    this.jailTimeLeft = 40;
    this.policeBoxInTimer = 0;
    this.wantedLevel = 0;
    this.missileRoomOpen = false;
    if (local.mountedId) this.dismountActor(local, false);
    this.closeParachute(local);
    local.alive = true;
    local.knockedDown = false;
    local.hp = local.maxHp;
    local.x = JAIL_CELL_POS.x;
    local.y = JAIL_CELL_POS.y;
    local.z = JAIL_CELL_POS.z;
    local.vx = 0;
    local.vy = 0;
    local.vz = 0;
    local.invulnTimer = 42;
    local.rig.root.visible = true;
    this.unlockPointer();

    // Automatic 200 Coins Police Arrest Fine upon vehicle capture
    const deducted = this.onPoliceArrest?.(200);
    this.jailFinePaid = typeof deducted === 'number' ? deducted : 200;

    soundEngine.playPoliceFineSfx();
    soundEngine.playJailLock();
    this.showAnnouncement(
      this.jailFinePaid > 0
        ? `ARRESTED BY POLICE — -${this.jailFinePaid} COINS FINE! PAY 1,000c BAIL OR WAIT 40s!`
        : 'ARRESTED BY AIRPORT POLICE — PAY 1,000c BAIL OR WAIT 40s!',
      4.0
    );
    this.emitHud();
  }

  private spawnDroppedWeapon(x: number, y: number, z: number, gunId: GunId): void {
    const grp = new THREE.Group();
    const gunModel = createGunModel(gunId);
    gunModel.group.scale.setScalar(1.35);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.9, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.35;
    grp.add(gunModel.group, ring);
    grp.position.set(x, y + 0.55, z);
    this.scene.add(grp);
    this.droppedWeapons.push({
      id: `loot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      gunId,
      x,
      y: y + 0.55,
      z,
      mesh: grp,
      ttl: 45,
      dispose: gunModel.dispose,
    });
  }

  private findNearestDroppedWeapon(actor: ActorEntity): DroppedWeaponLoot | null {
    let best: DroppedWeaponLoot | null = null;
    let bestD = 3.6;
    for (const dw of this.droppedWeapons) {
      const d = Math.hypot(dw.x - actor.x, dw.z - actor.z);
      if (d < bestD && Math.abs(dw.y - actor.y) < 3.0) {
        bestD = d;
        best = dw;
      }
    }
    return best;
  }

  private tryReplaceWithDroppedWeapon(actor: ActorEntity): boolean {
    const dw = this.findNearestDroppedWeapon(actor);
    if (!dw) return false;
    actor.gunId = dw.gunId;
    actor.activeSlot = 'gun';
    const def = getGunDef(dw.gunId);
    actor.ammoInMag = def.magSize;
    actor.reserveAmmo = def.reserveMax < 0 ? -1 : def.magSize * 4;
    actor.isReloading = false;
    actor.rig.setWeapons(actor.gunId, actor.knifeId, actor.grenadeId);

    const idx = this.droppedWeapons.indexOf(dw);
    if (idx >= 0) this.droppedWeapons.splice(idx, 1);
    this.scene.remove(dw.mesh);
    dw.dispose();

    if (actor.isLocal) {
      soundEngine.playWeaponSwitch();
      this.showAnnouncement(`REPLACED GUN WITH ${def.name.toUpperCase()} (FULL AMMO)!`, 2.2);
    }
    return true;
  }

  private tryOpenMissileConsole(actor: ActorEntity): boolean {
    if (actor.mountedId || this.inJail) return false;
    const d = Math.hypot(actor.x - MISSILE_CONSOLE_POS.x, actor.z - MISSILE_CONSOLE_POS.z);
    if (d < 4.8 && Math.abs(actor.y - MISSILE_CONSOLE_POS.y) < 3.5) {
      this.openMissileRoom();
      return true;
    }
    return false;
  }

  private stepDroppedWeapons(dt: number): void {
    for (let i = this.droppedWeapons.length - 1; i >= 0; i--) {
      const dw = this.droppedWeapons[i];
      dw.ttl -= dt;
      dw.mesh.rotation.y += dt * 2.1;
      dw.mesh.position.y = dw.y + Math.sin(this.elapsed * 3.5 + i) * 0.14;
      if (dw.ttl <= 0) {
        this.scene.remove(dw.mesh);
        dw.dispose();
        this.droppedWeapons.splice(i, 1);
      }
    }
  }

  private damageBuildingsInRadius(x: number, y: number, z: number, radius: number, maxDmg: number): void {
    for (const s of this.arena.destructibleStructures) {
      const d = Math.hypot(s.x - x, s.z - z) - s.radius * 0.45;
      if (d < radius && Math.abs(s.y - y) < 28) {
        const factor = Math.max(0.2, 1 - Math.max(0, d) / radius);
        const dmg = maxDmg * factor;
        s.hp = Math.max(0, s.hp - dmg);
        if (s.hp <= 0) {
          if (s.stage !== 'destroyed') {
            setDestructibleStage(s, 'destroyed');
            this.spawnExplosionParticles(s.x, s.y + 3, s.z, 0x44403c, 22, 1.8);
            this.showAnnouncement(`${s.name.toUpperCase()} DESTROYED — CONSTRUCTION CREW DISPATCHED!`, 2.6);
          }
        } else if (s.hp < s.maxHp * 0.55 && s.stage === 'intact') {
          setDestructibleStage(s, 'damaged');
        }
        if (s.stage !== 'intact') {
          s.repairState = 'waiting';
          s.waitTimer = 8.0;
          s.repairProgress = 0;
          s.crewGroup.visible = false;
        }
      }
    }
  }

  private triggerBlastImpact(x: number, y: number, z: number, radius: number, maxDmg: number, ownerId: string): void {
    const localId = this.getLocalActor()?.id;
    for (const actor of this.actors.values()) {
      if (!actor.alive) continue;
      if (ownerId !== 'ballistic' && this.isFriendly(ownerId, actor)) continue;
      const d = Math.hypot(actor.x - x, actor.z - z);
      if (d < radius) {
        const factor = 1 - d / radius;
        const dmg = maxDmg * factor;
        this.damageActor(actor, dmg, ownerId, (actor.x - x) * 1.4, (actor.z - z) * 1.4);
        if (ownerId === localId) {
          this.pushDamagePopup(actor.x, actor.y + 2.35, actor.z, dmg, false, false);
        }
      }
    }
    for (const mount of this.mounts.values()) {
      if (!mount.alive) continue;
      if (ownerId !== 'ballistic' && this.isMountFriendly(ownerId, mount)) continue;
      const d = Math.hypot(mount.x - x, mount.z - z);
      if (d < radius) {
        const factor = 1 - d / radius;
        const mDmg = maxDmg * 1.25 * factor;
        this.damageMount(mount, mDmg, ownerId);
      }
    }
    this.damageBuildingsInRadius(x, y, z, radius * 1.35, maxDmg * 2.1);
  }

  private stepBallisticMissiles(dt: number): void {
    for (let i = this.ballisticMissiles.length - 1; i >= 0; i--) {
      const m = this.ballisticMissiles[i];
      m.y += m.vy * dt;
      m.mesh.position.set(m.x, m.y, m.z);
      if (Math.random() < 0.75) {
        this.spawnExplosionParticles(m.x, m.y + 3.0, m.z, 0xf97316, 2, 1.1);
      }
      const groundY = Math.max(WATER_LEVEL, this.arena.getGroundHeightAt(m.x, m.z));
      if (m.y <= groundY + 1.0) {
        soundEngine.playExplosion('vehicle');
        this.screenShake = Math.max(this.screenShake, 1.35);
        this.spawnExplosionParticles(m.x, groundY + 1.2, m.z, 0xf97316, 48, 2.8);
        this.spawnExplosionParticles(m.x, groundY + 2.0, m.z, 0xfef08a, 24, 2.2);
        this.triggerBlastImpact(m.x, groundY, m.z, 30, 240, m.ownerId);
        this.scene.remove(m.mesh);
        this.ballisticMissiles.splice(i, 1);
      }
    }
  }

  private stepDestructibleBuildings(dt: number): void {
    for (const s of this.arena.destructibleStructures) {
      if (s.stage === 'intact') continue;

      if (s.stage === 'damaged' && s.repairState !== 'repairing') {
        s.smokeAccum -= dt;
        if (s.smokeAccum <= 0) {
          s.smokeAccum = 0.25;
          this.spawnExplosionParticles(s.x, s.y + 3.2, s.z, 0x334155, 1, 1.15);
        }
      }

      if (s.repairState === 'waiting') {
        s.waitTimer -= dt;
        if (s.waitTimer <= 0) {
          s.repairState = 'repairing';
          s.repairProgress = 0;
          s.crewGroup.visible = true;
        }
      } else if (s.repairState === 'repairing') {
        s.repairProgress += dt / 15.0;
        updateConstructionCrewVisual(s, this.elapsed, dt);
        if (Math.random() < 0.08 && Math.hypot(s.x - this.camera.position.x, s.z - this.camera.position.z) < 95) {
          soundEngine.playConstructionHammer();
        }
        if (s.repairProgress >= 1) {
          s.hp = s.maxHp;
          s.repairState = 'idle';
          s.repairProgress = 0;
          s.crewGroup.visible = false;
          setDestructibleStage(s, 'intact');
          this.spawnExplosionParticles(s.x, s.y + 3.2, s.z, 0x22c55e, 14, 1.3);
          if (Math.hypot(s.x - this.camera.position.x, s.z - this.camera.position.z) < 120) {
            this.showAnnouncement(`${s.name.toUpperCase()} REPAIRED BY CONSTRUCTION CREW!`, 2.2);
          }
        }
      }
    }
  }

  private stepPoliceFleet(dt: number): void {
    if (this.wantedLevel <= 0 || this.inJail) return;

    this.wantedDecayTimer -= dt;
    if (this.wantedDecayTimer <= 0) {
      this.wantedLevel = Math.max(0, this.wantedLevel - 1);
      this.wantedDecayTimer = 22;
    }

    const local = this.getLocalActor();
    if (!local || !local.alive || local.brState !== 'ground') return;

    const activePursuit = Array.from(this.actors.values()).filter(
      (a) => a.alive && a.guardRole === 'pursuit_police'
    );
    const maxPursuit = Math.min(4, 1 + Math.floor(this.wantedLevel * 0.7));

    if (activePursuit.length > 0) {
      this.policeSirenAccum -= dt;
      if (this.policeSirenAccum <= 0) {
        this.policeSirenAccum = 3.2;
        const nearUnit = activePursuit.some((p) => Math.hypot(p.x - local.x, p.z - local.z) < 95);
        if (nearUnit) soundEngine.playPoliceSirenBurst();
      }
    }

    // Police Vehicle Box-In Arrest: if player is Wanted inside a driven vehicle and Police surround/stop it -> open door & arrest!
    const drivenVeh = this.isDrivenLandVehicleMount(local.mountedId);
    if (drivenVeh) {
      const policeNearVehicle = Array.from(this.actors.values()).some(
        (a) =>
          a.alive &&
          Boolean(a.guardRole) &&
          Math.hypot(a.x - drivenVeh.x, a.z - drivenVeh.z) < 9.5
      );
      if (policeNearVehicle && (!drivenVeh.alive || Math.abs(drivenVeh.speed) < 4.5)) {
        this.policeBoxInTimer += dt;
        if (this.policeBoxInTimer >= 1.15) {
          this.arrestLocalPlayer(local);
          return;
        }
      } else {
        this.policeBoxInTimer = Math.max(0, this.policeBoxInTimer - dt * 2);
      }
    } else {
      this.policeBoxInTimer = 0;
    }

    this.policeSpawnTimer -= dt;
    if (this.policeSpawnTimer <= 0 && activePursuit.length < maxPursuit) {
      this.policeSpawnTimer = 9.0;
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 52 + Math.random() * 24;
      const sx = Math.max(-680, Math.min(680, local.x + Math.cos(angle) * spawnDist));
      const sz = Math.max(-340, Math.min(340, local.z + Math.sin(angle) * spawnDist));
      const groundH = this.arena.getGroundHeightAt(sx, sz);

      const useHeli = this.wantedLevel >= 4 && Math.random() < 0.45;
      const useSwatTank = !useHeli && this.wantedLevel >= 3 && Math.random() < 0.45;
      const vKind: VehicleKind = useHeli ? 'police_heli' : useSwatTank ? 'swat_tank' : 'police_car';

      if (useHeli || groundH > WATER_LEVEL + 0.1) {
        const sy = useHeli ? Math.max(18, groundH + 18) : groundH + 0.1;
        const uid = `${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`;
        const veh = createVehicleEntity(`police_veh_${uid}`, vKind, sx, sy, sz, angle + Math.PI, 0);
        this.scene.add(veh.root);
        this.mounts.set(veh.id, veh);

        const gunId: GunId = useSwatTank ? 'assault_rifle' : 'combat_shotgun';
        const officer = this.createActor({
          id: `police_${uid}`,
          name: useHeli ? 'Sky Police Unit' : useSwatTank ? 'SWAT Enforcer' : 'Police Interceptor',
          playerTag: 'SWAT',
          level: 5 + this.wantedLevel,
          team: undefined,
          isLocal: false,
          isBot: true,
          customization: {
            characterId: 'cyber_knight',
            primaryColor: '#1d4ed8',
            secondaryColor: '#0f172a',
            visorColor: '#ef4444',
            headgear: 'visor_cap',
          },
          gunId,
          knifeId: 'basic_knife',
          grenadeId: 'frag_grenade',
          brState: 'ground',
          x: sx,
          y: sy + veh.seatY,
          z: sz,
          maxHp: useSwatTank ? 105 : 85,
          maxHearts: 1,
          ammoInMag: getGunDef(gunId).magSize,
          reserveAmmo: 999,
          grenadeCount: 1,
          castShadow: false,
        });
        officer.guardRole = 'pursuit_police';
        officer.mountedId = veh.id;
        veh.riderId = officer.id;
        this.actors.set(officer.id, officer);
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.unlockPointer();
    soundEngine.updateEngineSound(false);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);

    for (const dw of this.droppedWeapons) {
      this.scene.remove(dw.mesh);
      dw.dispose();
    }
    this.droppedWeapons = [];
    for (const bm of this.ballisticMissiles) {
      this.scene.remove(bm.mesh);
    }
    this.ballisticMissiles = [];

    for (const actor of this.actors.values()) {
      actor.parachuteHandle?.dispose();
      actor.rig.dispose();
    }
    for (const m of this.mounts.values()) m.dispose();
    for (const f of this.oceanFish) f.dispose();
    for (const w of this.wildAnimals) w.dispose();
    for (const mr of this.mermaids) mr.dispose();
    for (const pc of this.pondCreatures) pc.dispose();
    this.instancedFishSchool?.dispose();
    for (const we of this.wildEcosystem) we.dispose();
    for (const wp of this.wildProjectiles) {
      this.scene.remove(wp.mesh);
      wp.mesh.geometry.dispose();
      (wp.mesh.material as THREE.Material).dispose();
    }
    this.wildProjectiles = [];
    this.clearCaptureProps();
    for (const g of this.activeGrenades) g.dispose();
    for (const d of this.brAirdrops) {
      this.scene.remove(d.model.group);
      d.model.dispose();
    }
    this.brAirdrops = [];
    if (this.brPlaneHandle) {
      this.scene.remove(this.brPlaneHandle.group);
      this.brPlaneHandle.dispose();
      this.brPlaneHandle = null;
    }
    if (this.brZoneWall) {
      this.scene.remove(this.brZoneWall);
      this.brZoneWall.geometry.dispose();
      (this.brZoneWall.material as THREE.Material).dispose();
      this.brZoneWall = null;
    }
    if (this.brZoneGroundRing) {
      this.scene.remove(this.brZoneGroundRing);
      this.brZoneGroundRing.geometry.dispose();
      (this.brZoneGroundRing.material as THREE.Material).dispose();
      this.brZoneGroundRing = null;
    }
    for (const d of this.impactDecals) {
      this.scene.remove(d);
      (d.material as THREE.Material).dispose();
    }
    this.impactDecals = [];

    const instList = [
      this.instHead,
      this.instTorso,
      this.instArmL,
      this.instArmR,
      this.instLegL,
      this.instLegR,
      this.instHpBg,
      this.instHpFill,
    ];
    const disposedMats = new Set<THREE.Material>();
    for (const inst of instList) {
      if (!inst) continue;
      this.scene.remove(inst);
      inst.geometry.dispose();
      const mat = inst.material as THREE.Material;
      if (!disposedMats.has(mat)) {
        disposedMats.add(mat);
        mat.dispose();
      }
      inst.dispose();
    }

    this.arena.dispose();
    this.renderer.dispose();
  }
}
