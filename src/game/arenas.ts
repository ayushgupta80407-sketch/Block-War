import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BoatSpawnPoint,
  buildCoastalEnvironment,
  InteractiveBench,
} from './coastalProps';
import {
  buildWorldExpansion,
  CampfireZone,
  FruitKind,
  getInlandPonds,
  getTribalIslandCoastRadius,
  getTribalIslandTerrainHeight,
  HarvestableFruitNode,
  LavaZone,
  PondDef,
  SEA_CAVES,
  TITANIC_CENTER,
  TRIBAL_ISLAND_CENTER,
  VOLCANO_CENTER,
  WaspNestNode,
  WorldExpansionResult,
} from './worldExpansion';
import {
  AIRPORT_ISLAND_CENTER,
  AirportGuardSpawn,
  buildAirportIsland,
  DestructibleStructure,
  getAirportIslandCoastRadius,
  getAirportIslandTerrainHeight,
} from './airportIsland';
import { ArenaId, RadarBuilding, VehicleKind } from './types';

export type { BoatSpawnPoint, CampfireZone, DestructibleStructure, AirportGuardSpawn, FruitKind, HarvestableFruitNode, InteractiveBench, LavaZone, PondDef, WaspNestNode };

export interface ArenaBoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  kind: 'wall' | 'floor' | 'ramp' | 'glass' | 'door' | 'trunk';
  slopeAxis?: 'x' | 'z';
  slopeDir?: 1 | -1;
  doorId?: string;
}

export interface InteractiveDoor {
  id: string;
  pivot: THREE.Group;
  hingeX: number;
  hingeZ: number;
  closedAngle: number;
  openAngle: number;
  isOpen: boolean;
  openAlpha: number;
  collider: ArenaBoxCollider;
  triggerX: number;
  triggerY: number;
  triggerZ: number;
}

export interface BouncePad {
  x: number;
  y: number;
  z: number;
  radius: number;
  impulse: number;
  mesh: THREE.Mesh;
}

export interface ArenaBuildResult {
  group: THREE.Group;
  halfSize: number;
  islandRadius: number;
  waterLevel: number;
  colliders: ArenaBoxCollider[];
  queryColliders: (minX: number, maxX: number, minZ: number, maxZ: number) => ArenaBoxCollider[];
  doors: InteractiveDoor[];
  benches: InteractiveBench[];
  bouncePads: BouncePad[];
  spawnPoints: THREE.Vector3[];
  vehicleSpawnPoints: Array<{ x: number; y: number; z: number; yaw: number; kind: VehicleKind }>;
  boatSpawnPoints: BoatSpawnPoint[];
  marineMountSpawns: WorldExpansionResult['marineMountSpawns'];
  pickupSpawnPoints: THREE.Vector3[];
  conchSpawnPoints: THREE.Vector3[];
  shellSpawnPoints: WorldExpansionResult['shellSpawnPoints'];
  campfires: CampfireZone[];
  lavaZones: LavaZone[];
  tribalCampfireCenter: { x: number; y: number; z: number };
  ponds: PondDef[];
  villagerCenters: WorldExpansionResult['villagerCenters'];
  fruitNodes: HarvestableFruitNode[];
  updateFruitVisual: (idx: number) => void;
  waspNests: WaspNestNode[];
  destructibleStructures: DestructibleStructure[];
  guardSpawns: AirportGuardSpawn[];
  tribalIslandCenter: { x: number; z: number };
  airportIslandCenter: { x: number; z: number };
  titanicCenter: { x: number; z: number };
  radarBuildings: RadarBuilding[];
  getGroundHeightAt: (x: number, z: number) => number;
  update: (time: number, dt: number) => void;
  dispose: () => void;
}

export const WATER_LEVEL = -0.35;

export function getIslandCoastRadius(arenaId: ArenaId, angle: number): number {
  const base = arenaId === 'city' ? 188 : arenaId === 'sky_island' ? 180 : 192;
  return base + Math.sin(angle * 4) * 8.5 + Math.cos(angle * 3 + 0.6) * 6.5;
}

export function getIslandTerrainHeight(arenaId: ArenaId, x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const coastR = getIslandCoastRadius(arenaId, angle);

  // Outer Tribal & Volcanic Island check first
  const tribalH = getTribalIslandTerrainHeight(arenaId, x, z);
  if (tribalH !== null) {
    return tribalH;
  }

  // Third Island: High-Security Airport & Military Base Island (West coast across Sea Bridge)
  const airportH = getAirportIslandTerrainHeight(arenaId, x, z);
  if (airportH !== null) {
    return airportH;
  }

  // Deep ocean seabed (-5.4m allows crisp 3D diving!) + carved underwater Sea Cave basins (-6.8m)
  if (dist > coastR + 20) {
    for (let i = 0; i < SEA_CAVES.length; i++) {
      const cd = Math.hypot(x - SEA_CAVES[i].x, z - SEA_CAVES[i].z);
      if (cd < SEA_CAVES[i].radius) {
        const ct = 1 - cd / SEA_CAVES[i].radius;
        return -5.4 - ct * 1.4;
      }
    }
    return -5.4;
  }

  // Smooth beach slope from +0.25 down into -5.4m seabed
  if (dist > coastR - 18) {
    const t = (dist - (coastR - 18)) / 38; // 0 .. 1
    const smooth = t * t * (3 - 2 * t);
    return 0.25 * (1 - smooth) + -5.4 * smooth;
  }

  // Main Island inland height + carve 5 Inland Pond basins
  let baseH = 0;
  if (dist >= 48) {
    const roadCross = Math.min(Math.abs(x), Math.abs(z));
    const ringRoad = Math.abs(dist - 108);
    if (roadCross < 11 || ringRoad < 10) {
      baseH = 0.04;
    } else {
      const hillMask =
        Math.max(0, Math.min(1, (dist - 55) / 55)) *
        Math.max(0, Math.min(1, (coastR - 22 - dist) / 28));
      const hills =
        (Math.sin(x * 0.042 + 0.4) * Math.cos(z * 0.038 - 0.2) * 1.65 +
          Math.sin((x + z) * 0.028) * 0.85) *
        hillMask;
      baseH = Math.max(0, hills);
    }
  }

  const ponds = getInlandPonds(arenaId);
  for (let i = 0; i < ponds.length; i++) {
    const p = ponds[i];
    const pd = Math.hypot(x - p.x, z - p.z);
    if (pd < p.radius + 3.5) {
      const pt = Math.max(0, Math.min(1, (p.radius + 3.5 - pd) / 5.5));
      const smooth = pt * pt * (3 - 2 * pt);
      return THREE.MathUtils.lerp(baseH, p.surfaceY - 1.35, smooth);
    }
  }

  return baseH;
}

function createSurfaceTexture(
  baseHex: string,
  lineHex: string,
  accentHex: string,
  style: 'island' | 'city' | 'snowy' | 'desert' | 'sky'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 650; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 14, 6 + Math.random() * 14);
  }

  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;
  const step = style === 'city' ? 64 : 128;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(16, 16, 14, 14);
  ctx.fillRect(482, 482, 14, 14);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function addMergedBox(
  bucket: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rotX = 0,
  rotY = 0,
  rotZ = 0
): void {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (rotX !== 0) g.rotateX(rotX);
  if (rotY !== 0) g.rotateY(rotY);
  if (rotZ !== 0) g.rotateZ(rotZ);
  g.translate(x, y, z);
  bucket.push(g);
}

export function buildArena(arenaId: ArenaId): ArenaBuildResult {
  const group = new THREE.Group();
  const halfSize = 750; // Expanded sea + Titanic Harbor + 5x Massive Tribal & Volcanic Island
  const islandRadius = 192;

  const colliders: ArenaBoxCollider[] = [];
  const doors: InteractiveDoor[] = [];
  const bouncePads: BouncePad[] = [];
  const animatedObjects: Array<(t: number, dt: number) => void> = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const radarBuildings: RadarBuilding[] = [];

  const wallGeos: THREE.BufferGeometry[] = [];
  const floorGeos: THREE.BufferGeometry[] = [];
  const trimGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];
  const rampGeos: THREE.BufferGeometry[] = [];
  const roadGeos: THREE.BufferGeometry[] = [];

  const occupiedFootprints: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
  const isOverlappingFootprint = (x: number, z: number, pad = 6): boolean => {
    for (const f of occupiedFootprints) {
      if (x >= f.minX - pad && x <= f.maxX + pad && z >= f.minZ - pad && z <= f.maxZ + pad) {
        return true;
      }
    }
    return false;
  };

  const getGroundHeightAt = (x: number, z: number) => getIslandTerrainHeight(arenaId, x, z);

  // Arena Theme Palettes
  const themes: Record<
    ArenaId,
    {
      grassHex: string;
      beachHex: string;
      waterHex: number;
      waterEmissive: number;
      lineHex: string;
      accent: number;
      wallColor: number;
      floorColor: number;
      trimColor: number;
      roadColor: number;
      treeTrunk: number;
      treeLeafA: number;
      treeLeafB: number;
      rockColor: number;
      doorColor: number;
      style: 'island' | 'city' | 'snowy' | 'desert' | 'sky';
    }
  > = {
    practice: {
      grassHex: '#2f855a',
      beachHex: '#f3d299',
      waterHex: 0x0284c7,
      waterEmissive: 0x0369a1,
      lineHex: 'rgba(255,255,255,0.08)',
      accent: 0x38bdf8,
      wallColor: 0xe2e8f0,
      floorColor: 0x94a3b8,
      trimColor: 0xf59e0b,
      roadColor: 0x475569,
      treeTrunk: 0x78350f,
      treeLeafA: 0x16a34a,
      treeLeafB: 0x22c55e,
      rockColor: 0x64748b,
      doorColor: 0x0284c7,
      style: 'island',
    },
    city: {
      grassHex: '#334155',
      beachHex: '#cbd5e1',
      waterHex: 0x0f4c81,
      waterEmissive: 0x082f49,
      lineHex: 'rgba(236,72,153,0.14)',
      accent: 0xec4899,
      wallColor: 0x475569,
      floorColor: 0x334155,
      trimColor: 0xec4899,
      roadColor: 0x0f172a,
      treeTrunk: 0x451a03,
      treeLeafA: 0x15803d,
      treeLeafB: 0x22c55e,
      rockColor: 0x475569,
      doorColor: 0xdb2777,
      style: 'city',
    },
    snowy: {
      grassHex: '#e2e8f0',
      beachHex: '#cbd5e1',
      waterHex: 0x0e7490,
      waterEmissive: 0x164e63,
      lineHex: 'rgba(56,189,248,0.16)',
      accent: 0x22d3ee,
      wallColor: 0xf1f5f9,
      floorColor: 0x94a3b8,
      trimColor: 0x0284c7,
      roadColor: 0x64748b,
      treeTrunk: 0x451a03,
      treeLeafA: 0x0f766e,
      treeLeafB: 0x14b8a6,
      rockColor: 0x94a3b8,
      doorColor: 0x0369a1,
      style: 'snowy',
    },
    desert: {
      grassHex: '#d97706',
      beachHex: '#fde68a',
      waterHex: 0x0d9488,
      waterEmissive: 0x115e59,
      lineHex: 'rgba(255,255,255,0.12)',
      accent: 0xf97316,
      wallColor: 0xfde68a,
      floorColor: 0xb45309,
      trimColor: 0xea580c,
      roadColor: 0x92400e,
      treeTrunk: 0x78350f,
      treeLeafA: 0x4d7c0f,
      treeLeafB: 0x65a30d,
      rockColor: 0xa16207,
      doorColor: 0xb45309,
      style: 'desert',
    },
    sky_island: {
      grassHex: '#312e81',
      beachHex: '#c4b5fd',
      waterHex: 0x2563eb,
      waterEmissive: 0x3b0764,
      lineHex: 'rgba(192,132,252,0.18)',
      accent: 0xc084fc,
      wallColor: 0x4c1d95,
      floorColor: 0x3b0764,
      trimColor: 0xc084fc,
      roadColor: 0x1e1b4b,
      treeTrunk: 0x581c87,
      treeLeafA: 0x06b6d4,
      treeLeafB: 0xa855f7,
      rockColor: 0x6d28d9,
      doorColor: 0x9333ea,
      style: 'sky',
    },
  };

  const theme = themes[arenaId];
  const grassTex = createSurfaceTexture(theme.grassHex, theme.lineHex, '#ffffff', theme.style);
  disposables.push(grassTex);

  // 1. Sculpted Dual-Island, Ponds, Swamp, Volcano & Deep Seabed Vertex-Colored Terrain
  const terrainSize = 1600;
  const terrainSegs = 224;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  const colorArr = new Float32Array(posAttr.count * 3);
  const grassCol = new THREE.Color(theme.grassHex);
  const beachCol = new THREE.Color(theme.beachHex);
  const wetBeachCol = beachCol.clone().multiplyScalar(0.74);
  const shallowSeaCol = new THREE.Color(0x0ea5e9);
  const seabedCol = new THREE.Color(0x082f49);
  const hillCol = grassCol.clone().offsetHSL(0, 0.04, 0.06);
  const volcanoBasaltCol = new THREE.Color(arenaId === 'snowy' ? 0x64748b : 0x27272a);
  const volcanoCraterCol = new THREE.Color(0x7c2d12);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getGroundHeightAt(x, z);
    posAttr.setY(i, y);

    const dist = Math.hypot(x, z);
    const coastR = getIslandCoastRadius(arenaId, Math.atan2(z, x));
    const triDist = Math.hypot(x - TRIBAL_ISLAND_CENTER.x, z - TRIBAL_ISLAND_CENTER.z);
    const triCoastR = getTribalIslandCoastRadius(arenaId, Math.atan2(z - TRIBAL_ISLAND_CENTER.z, x - TRIBAL_ISLAND_CENTER.x));
    const airDist = Math.hypot(x - AIRPORT_ISLAND_CENTER.x, z - AIRPORT_ISLAND_CENTER.z);
    const airCoastR = getAirportIslandCoastRadius(arenaId, Math.atan2(z - AIRPORT_ISLAND_CENTER.z, x - AIRPORT_ISLAND_CENTER.x));
    const volcDist = Math.hypot(x - VOLCANO_CENTER.x, z - VOLCANO_CENTER.z);

    if (y < -1.1) {
      tmpCol.copy(seabedCol);
    } else if (y < -0.25) {
      const seaBlend = Math.max(0, Math.min(1, (y + 1.1) / 0.85));
      tmpCol.copy(seabedCol).lerp(shallowSeaCol, seaBlend * 0.6);
    } else if (volcDist < 44 && y > 3.2) {
      const vBlend = Math.min(1, (y - 3.2) / 14);
      tmpCol.copy(grassCol).lerp(volcanoBasaltCol, vBlend);
      if (volcDist < 12) tmpCol.lerp(volcanoCraterCol, 0.55);
    } else if (
      (dist <= coastR + 18 && dist > coastR - 6) ||
      (triDist <= triCoastR + 18 && triDist > triCoastR - 7) ||
      (airDist <= airCoastR + 18 && airDist > airCoastR - 7)
    ) {
      const edgeDist =
        airDist <= airCoastR + 18
          ? airDist - (airCoastR - 7)
          : triDist <= triCoastR + 18
            ? triDist - (triCoastR - 7)
            : dist - (coastR - 6);
      const wetBlend = Math.max(0, Math.min(1, edgeDist / 7));
      tmpCol.copy(beachCol).lerp(wetBeachCol, wetBlend);
    } else if (
      (dist <= coastR + 18 && dist > coastR - 22) ||
      (triDist <= triCoastR + 18 && triDist > triCoastR - 22) ||
      (airDist <= airCoastR + 18 && airDist > airCoastR - 22)
    ) {
      const edgeDist =
        airDist <= airCoastR + 18
          ? airDist - (airCoastR - 22)
          : triDist <= triCoastR + 18
            ? triDist - (triCoastR - 22)
            : dist - (coastR - 22);
      const blend = Math.max(0, Math.min(1, edgeDist / 12));
      tmpCol.copy(grassCol).lerp(beachCol, blend);
    } else if (y > 0.7) {
      tmpCol.copy(grassCol).lerp(hillCol, Math.min(1, y / 2.5));
    } else {
      tmpCol.copy(grassCol);
    }
    colorArr[i * 3] = tmpCol.r;
    colorArr[i * 3 + 1] = tmpCol.g;
    colorArr[i * 3 + 2] = tmpCol.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. Surrounding Animated 3D Blue Ocean Water Plane (Covers expanded 5x continent sea!)
  const oceanGeo = new THREE.PlaneGeometry(2400, 2400, 64, 64);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanPos = oceanGeo.attributes.position;
  const oceanBaseX = new Float32Array(oceanPos.count);
  const oceanBaseZ = new Float32Array(oceanPos.count);
  for (let i = 0; i < oceanPos.count; i++) {
    oceanBaseX[i] = oceanPos.getX(i);
    oceanBaseZ[i] = oceanPos.getZ(i);
  }
  const oceanMat = new THREE.MeshStandardMaterial({
    color: theme.waterHex,
    emissive: theme.waterEmissive,
    emissiveIntensity: 0.25,
    roughness: 0.14,
    metalness: 0.28,
    transparent: true,
    opacity: 0.8,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = WATER_LEVEL;
  oceanMesh.receiveShadow = true;
  group.add(oceanMesh);
  disposables.push(oceanGeo, oceanMat);

  // Double Shoreline Foam Rings washing onto shore
  const foamGeo = new THREE.RingGeometry(176, 189, 72);
  foamGeo.rotateX(-Math.PI / 2);
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const foamRing = new THREE.Mesh(foamGeo, foamMat);
  foamRing.position.y = WATER_LEVEL + 0.06;

  const foamOuterGeo = new THREE.RingGeometry(193, 200, 72);
  foamOuterGeo.rotateX(-Math.PI / 2);
  const foamOuterMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const foamOuterRing = new THREE.Mesh(foamOuterGeo, foamOuterMat);
  foamOuterRing.position.y = WATER_LEVEL + 0.05;
  group.add(foamRing, foamOuterRing);
  disposables.push(foamGeo, foamMat, foamOuterGeo, foamOuterMat);

  let waveNormalAccum = 0;
  animatedObjects.push((t, dt) => {
    for (let i = 0; i < oceanPos.count; i++) {
      const vx = oceanBaseX[i];
      const vz = oceanBaseZ[i];
      const wave =
        Math.sin(vx * 0.045 + t * 2.1) * 0.24 +
        Math.cos(vz * 0.052 + t * 1.65) * 0.22;
      oceanPos.setY(i, wave);
    }
    oceanPos.needsUpdate = true;
    waveNormalAccum += dt;
    if (waveNormalAccum >= 0.05) {
      waveNormalAccum = 0;
      oceanGeo.computeVertexNormals();
    }
    const pulse = 1 + Math.sin(t * 2.2) * 0.016;
    foamRing.scale.set(pulse, 1, pulse);
    foamMat.opacity = 0.36 + Math.sin(t * 2.2) * 0.12;
    const pulseOuter = 1 + Math.sin(t * 2.2 - 1.3) * 0.02;
    foamOuterRing.scale.set(pulseOuter, 1, pulseOuter);
    foamOuterMat.opacity = 0.2 + Math.sin(t * 2.2 - 1.3) * 0.09;
  });

  // Materials for merged architecture
  const wallMat = new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.62, metalness: 0.12 });
  const floorMat = new THREE.MeshStandardMaterial({ color: theme.floorColor, roughness: 0.72, metalness: 0.1 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: theme.trimColor,
    emissive: theme.trimColor,
    emissiveIntensity: arenaId === 'city' || arenaId === 'sky_island' ? 0.5 : 0.18,
    roughness: 0.3,
    metalness: 0.5,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.34,
  });
  const rampMat = new THREE.MeshStandardMaterial({ color: theme.trimColor, roughness: 0.45, metalness: 0.25 });
  const roadMat = new THREE.MeshStandardMaterial({ color: theme.roadColor, roughness: 0.85, metalness: 0.06 });
  const doorMat = new THREE.MeshStandardMaterial({ color: theme.doorColor, roughness: 0.38, metalness: 0.35 });
  disposables.push(wallMat, floorMat, trimMat, glassMat, rampMat, roadMat, doorMat);

  // Island Crossroads & Coastal Ring Road
  addMergedBox(roadGeos, 240, 0.12, 16, 0, 0.06, 0);
  addMergedBox(roadGeos, 16, 0.12, 240, 0, 0.06, 0);
  const ringSegments = 24;
  for (let i = 0; i < ringSegments; i++) {
    const a = (i / ringSegments) * Math.PI * 2;
    const rx = Math.cos(a) * 108;
    const rz = Math.sin(a) * 108;
    addMergedBox(roadGeos, 14, 0.11, 31, rx, 0.05, rz, 0, -a, 0);
  }
  // Center Island Courtyard Plaza Trim
  addMergedBox(trimGeos, 36, 0.16, 36, 0, 0.08, 0);
  addMergedBox(floorGeos, 32, 0.2, 32, 0, 0.1, 0);

  // Helper: Smooth Walkable Sloped Staircase (continuous ramp collider + visual treads!)
  const addWalkableStair = (
    x: number,
    z: number,
    yBottom: number,
    yTop: number,
    runLen: number,
    width: number,
    axis: 'x' | 'z',
    dir: 1 | -1
  ) => {
    const height = yTop - yBottom;
    const midY = (yBottom + yTop) * 0.5;
    const slopeAngle = Math.atan2(height, runLen);

    // Continuous smooth walkable ramp collider
    colliders.push({
      minX: x - (axis === 'x' ? runLen * 0.5 : width * 0.5),
      maxX: x + (axis === 'x' ? runLen * 0.5 : width * 0.5),
      minY: yBottom - 0.3,
      maxY: yTop,
      minZ: z - (axis === 'z' ? runLen * 0.5 : width * 0.5),
      maxZ: z + (axis === 'z' ? runLen * 0.5 : width * 0.5),
      kind: 'ramp',
      slopeAxis: axis,
      slopeDir: dir,
    });

    // Visual stair treads + side stringer beam
    const stepCount = Math.max(6, Math.round(height * 2));
    for (let s = 0; s < stepCount; s++) {
      const f = (s + 0.5) / stepCount - 0.5;
      const offset = f * runLen * dir;
      const stepY = yBottom + ((s + 0.5) / stepCount) * height;
      const sx = axis === 'x' ? x + offset : x;
      const sz = axis === 'z' ? z + offset : z;
      const sw = axis === 'x' ? runLen / stepCount + 0.12 : width;
      const sd = axis === 'z' ? runLen / stepCount + 0.12 : width;
      addMergedBox(rampGeos, sw, 0.32, sd, sx, stepY - 0.16, sz);
    }

    // Sloped underside plank for clean look
    const hyp = Math.hypot(runLen, height);
    if (axis === 'z') {
      addMergedBox(floorGeos, width, 0.25, hyp, x, midY - 0.25, z, dir > 0 ? -slopeAngle : slopeAngle, 0, 0);
    } else {
      addMergedBox(floorGeos, hyp, 0.25, width, x, midY - 0.25, z, 0, 0, dir > 0 ? slopeAngle : -slopeAngle);
    }
  };

  // Multi-Storey Building Builder (2 to 3 storeys with walkable stairs, doors, windows, rooftop parapet)
  let doorSeq = 0;
  const buildIslandBuilding = (
    bx: number,
    bz: number,
    w: number,
    d: number,
    floors: number,
    doorSide: 'N' | 'S' | 'E' | 'W'
  ) => {
    const baseY = Math.max(0, getGroundHeightAt(bx, bz));
    occupiedFootprints.push({ minX: bx - w * 0.5, maxX: bx + w * 0.5, minZ: bz - d * 0.5, maxZ: bz + d * 0.5 });
    radarBuildings.push({ x: bx, z: bz, w, d, floors });

    const floorH = 4.6;
    const totalH = floors * floorH;
    const wallT = 0.65;
    const doorW = 4.0;
    const doorH = 3.5;

    // Foundation slab
    addMergedBox(floorGeos, w + 1.2, baseY + 0.6, d + 1.2, bx, (baseY + 0.3) * 0.5, bz);
    colliders.push({
      minX: bx - w * 0.5 - 0.5,
      maxX: bx + w * 0.5 + 0.5,
      minY: -2,
      maxY: baseY + 0.3,
      minZ: bz - d * 0.5 - 0.5,
      maxZ: bz + d * 0.5 + 0.5,
      kind: 'floor',
    });

    const addWallSegment = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, kind: 'wall' | 'glass' = 'wall') => {
      if (sx <= 0.1 || sy <= 0.1 || sz <= 0.1) return;
      addMergedBox(kind === 'glass' ? glassGeos : wallGeos, sx, sy, sz, cx, cy, cz);
      colliders.push({
        minX: cx - sx * 0.5,
        maxX: cx + sx * 0.5,
        minY: cy - sy * 0.5,
        maxY: cy + sy * 0.5,
        minZ: cz - sz * 0.5,
        maxZ: cz + sz * 0.5,
        kind,
      });
    };

    // Hinged [E] Door helper
    const addDoor = (dx: number, dz: number, alongX: boolean) => {
      const id = `door_${++doorSeq}`;
      const hingeOffset = doorW * 0.5;
      const hingeX = alongX ? dx - hingeOffset : dx;
      const hingeZ = alongX ? dz : dz - hingeOffset;
      const closedAngle = alongX ? 0 : Math.PI / 2;
      const openAngle = closedAngle + Math.PI * 0.48;

      const pivot = new THREE.Group();
      pivot.position.set(hingeX, baseY + 0.3, hingeZ);
      pivot.rotation.y = closedAngle;

      const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.34), doorMat);
      leaf.position.set(doorW * 0.5, doorH * 0.5, 0);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.46), trimMat);
      handle.position.set(doorW * 0.82, doorH * 0.48, 0);
      pivot.add(leaf, handle);
      group.add(pivot);

      const doorCol: ArenaBoxCollider = {
        minX: alongX ? dx - doorW * 0.5 : dx - 0.25,
        maxX: alongX ? dx + doorW * 0.5 : dx + 0.25,
        minY: baseY + 0.3,
        maxY: baseY + 0.3 + doorH,
        minZ: alongX ? dz - 0.25 : dz - doorW * 0.5,
        maxZ: alongX ? dz + 0.25 : dz + doorW * 0.5,
        kind: 'door',
        doorId: id,
      };
      colliders.push(doorCol);
      doors.push({
        id,
        pivot,
        hingeX,
        hingeZ,
        closedAngle,
        openAngle,
        isOpen: false,
        openAlpha: 0,
        collider: doorCol,
        triggerX: dx,
        triggerY: baseY + 0.3,
        triggerZ: dz,
      });
    };

    // Build exterior perimeter per storey
    for (let fl = 0; fl < floors; fl++) {
      const flY = baseY + 0.3 + fl * floorH;
      const midY = flY + floorH * 0.5;
      const trimY = flY + floorH;
      addMergedBox(trimGeos, w + 0.5, 0.28, d + 0.5, bx, trimY, bz);

      const buildFace = (side: 'N' | 'S' | 'E' | 'W') => {
        const alongX = side === 'N' || side === 'S';
        const span = alongX ? w : d;
        const pos =
          side === 'N'
            ? bz - d * 0.5
            : side === 'S'
              ? bz + d * 0.5
              : side === 'E'
                ? bx + w * 0.5
                : bx - w * 0.5;
        const hasDoor = fl === 0 && side === doorSide;
        const winW = Math.min(5.2, span * 0.34);
        const sideWallW = (span - (hasDoor ? doorW : winW)) * 0.5;

        if (hasDoor) {
          // Left & right piers + lintel + hinged door
          if (alongX) {
            addWallSegment(bx - span * 0.5 + sideWallW * 0.5, midY, pos, sideWallW, floorH, wallT);
            addWallSegment(bx + span * 0.5 - sideWallW * 0.5, midY, pos, sideWallW, floorH, wallT);
            addWallSegment(bx, flY + doorH + (floorH - doorH) * 0.5, pos, doorW, floorH - doorH, wallT);
            addDoor(bx, pos, true);
          } else {
            addWallSegment(pos, midY, bz - span * 0.5 + sideWallW * 0.5, wallT, floorH, sideWallW);
            addWallSegment(pos, midY, bz + span * 0.5 - sideWallW * 0.5, wallT, floorH, sideWallW);
            addWallSegment(pos, flY + doorH + (floorH - doorH) * 0.5, bz, wallT, floorH - doorH, doorW);
            addDoor(pos, bz, false);
          }
        } else {
          // Window wall with shoot-through glass
          const winBottom = 1.25;
          const winH = 2.1;
          const topH = floorH - winBottom - winH;
          if (alongX) {
            addWallSegment(bx - span * 0.5 + sideWallW * 0.5, midY, pos, sideWallW, floorH, wallT);
            addWallSegment(bx + span * 0.5 - sideWallW * 0.5, midY, pos, sideWallW, floorH, wallT);
            addWallSegment(bx, flY + winBottom * 0.5, pos, winW, winBottom, wallT);
            addWallSegment(bx, flY + winBottom + winH + topH * 0.5, pos, winW, topH, wallT);
            addWallSegment(bx, flY + winBottom + winH * 0.5, pos, winW, winH, 0.16, 'glass');
          } else {
            addWallSegment(pos, midY, bz - span * 0.5 + sideWallW * 0.5, wallT, floorH, sideWallW);
            addWallSegment(pos, midY, bz + span * 0.5 - sideWallW * 0.5, wallT, floorH, sideWallW);
            addWallSegment(pos, flY + winBottom * 0.5, bz, wallT, winBottom, winW);
            addWallSegment(pos, flY + winBottom + winH + topH * 0.5, bz, wallT, topH, winW);
            addWallSegment(pos, flY + winBottom + winH * 0.5, bz, 0.16, winH, winW, 'glass');
          }
        }
      };

      buildFace('N');
      buildFace('S');
      buildFace('E');
      buildFace('W');

      // Upper floor / Roof deck with stairwell cutout along east/inner edge (width 3.6)
      const upperY = flY + floorH;
      const stairW = 3.5;
      const mainDeckW = w - stairW - 1.2;
      const deckCenterX = bx - stairW * 0.5 - 0.15;
      addMergedBox(floorGeos, mainDeckW, 0.42, d - 0.8, deckCenterX, upperY - 0.21, bz);
      colliders.push({
        minX: deckCenterX - mainDeckW * 0.5,
        maxX: deckCenterX + mainDeckW * 0.5,
        minY: upperY - 0.42,
        maxY: upperY,
        minZ: bz - d * 0.5 + 0.4,
        maxZ: bz + d * 0.5 - 0.4,
        kind: 'floor',
      });

      // Walkable sloped staircase ascending along stairwell
      const stairX = bx + w * 0.5 - stairW * 0.5 - 0.65;
      const stairDir: 1 | -1 = fl % 2 === 0 ? 1 : -1;
      const runLen = Math.max(7.2, d - 3.6);
      addWalkableStair(stairX, bz, flY, upperY, runLen, stairW - 0.2, 'z', stairDir);
    }

    // Rooftop Sniper Parapet
    const roofY = baseY + 0.3 + totalH;
    const pH = 1.15;
    addWallSegment(bx, roofY + pH * 0.5, bz - d * 0.5 + 0.25, w, pH, 0.5);
    addWallSegment(bx, roofY + pH * 0.5, bz + d * 0.5 - 0.25, w, pH, 0.5);
    addWallSegment(bx - w * 0.5 + 0.25, roofY + pH * 0.5, bz, 0.5, pH, d);
  };

  // Place 9 Compact Multi-Storey Buildings, Watchtowers, & Beach Houses
  buildIslandBuilding(-42, -42, 18, 16, 3, 'S');
  buildIslandBuilding(42, -44, 18, 16, 2, 'S');
  buildIslandBuilding(-44, 42, 18, 16, 2, 'N');
  buildIslandBuilding(44, 42, 18, 18, 3, 'N');
  buildIslandBuilding(0, -86, 16, 14, 3, 'S');
  buildIslandBuilding(0, 86, 16, 14, 2, 'N');
  buildIslandBuilding(-96, 0, 14, 18, 3, 'E');
  buildIslandBuilding(96, 0, 14, 18, 2, 'W');
  // Beach House Outpost near south cove
  buildIslandBuilding(68, 128, 15, 13, 2, 'N');

  // Elevated Watchtower Platforms + Bounce Pads
  const addBouncePad = (x: number, z: number, impulse = 25) => {
    const y = Math.max(0, getGroundHeightAt(x, z)) + 0.14;
    const geo = new THREE.CylinderGeometry(2.3, 2.6, 0.35, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: theme.accent,
      emissive: theme.accent,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    disposables.push(geo, mat);
    bouncePads.push({ x, y, z, radius: 2.6, impulse, mesh });
    animatedObjects.push((t) => {
      mesh.scale.y = 1 + Math.sin(t * 5) * 0.15;
    });
  };
  addBouncePad(-24, 0, 26);
  addBouncePad(24, 0, 26);
  addBouncePad(0, -24, 26);
  addBouncePad(0, 24, 26);

  // Merge Static Architecture Geometry
  const flushMerged = (geos: THREE.BufferGeometry[], mat: THREE.Material, castShadow = true) => {
    if (geos.length === 0) return;
    const merged = mergeGeometries(geos, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
      disposables.push(merged);
    }
    geos.forEach((g) => g.dispose());
  };
  flushMerged(wallGeos, wallMat, true);
  flushMerged(floorGeos, floorMat, true);
  flushMerged(trimGeos, trimMat, true);
  flushMerged(glassGeos, glassMat, false);
  flushMerged(rampGeos, rampMat, true);
  flushMerged(roadGeos, roadMat, false);

  // Instanced Trees & Boulders on Dry Island Ground (avoiding roads, buildings & inland ponds)
  const rng = createSeededRng(arenaId.length * 9187 + 1337);
  const ponds = getInlandPonds(arenaId);
  const isNearPond = (x: number, z: number, pad = 4.5): boolean => {
    for (let i = 0; i < ponds.length; i++) {
      if (Math.hypot(x - ponds[i].x, z - ponds[i].z) < ponds[i].radius + pad) return true;
    }
    return false;
  };
  const treePositions: Array<{ x: number; y: number; z: number; scale: number }> = [];
  for (let i = 0; i < 450 && treePositions.length < 135; i++) {
    const r = 34 + rng() * 142;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const roadDist = Math.min(Math.abs(x), Math.abs(z));
    if (roadDist < 12 || Math.abs(r - 108) < 11) continue;
    if (isOverlappingFootprint(x, z, 5) || isNearPond(x, z, 5)) continue;
    const y = getGroundHeightAt(x, z);
    if (y < 0.02) continue;
    treePositions.push({ x, y, z, scale: 0.85 + rng() * 0.55 });
  }

  if (treePositions.length > 0) {
    const trunkGeo = new THREE.BoxGeometry(1.1, 4.4, 1.1);
    const leafAGeo = new THREE.BoxGeometry(4.2, 2.8, 4.2);
    const leafBGeo = new THREE.BoxGeometry(2.8, 2.2, 2.8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: theme.treeTrunk, roughness: 0.9 });
    const leafAMat = new THREE.MeshStandardMaterial({ color: theme.treeLeafA, roughness: 0.78 });
    const leafBMat = new THREE.MeshStandardMaterial({ color: theme.treeLeafB, roughness: 0.72 });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const leavesA = new THREE.InstancedMesh(leafAGeo, leafAMat, treePositions.length);
    const leavesB = new THREE.InstancedMesh(leafBGeo, leafBMat, treePositions.length);
    trunks.castShadow = true;
    leavesA.castShadow = true;
    leavesB.castShadow = true;
    trunks.receiveShadow = true;
    leavesA.receiveShadow = true;

    const dummy = new THREE.Object3D();
    treePositions.forEach((tp, idx) => {
      dummy.position.set(tp.x, tp.y + 2.2 * tp.scale, tp.z);
      dummy.rotation.set(0, (idx * 0.7) % Math.PI, 0);
      dummy.scale.setScalar(tp.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tp.x, tp.y + 5.1 * tp.scale, tp.z);
      dummy.updateMatrix();
      leavesA.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tp.x, tp.y + 7.1 * tp.scale, tp.z);
      dummy.updateMatrix();
      leavesB.setMatrixAt(idx, dummy.matrix);

      colliders.push({
        minX: tp.x - 0.65 * tp.scale,
        maxX: tp.x + 0.65 * tp.scale,
        minY: tp.y,
        maxY: tp.y + 4.4 * tp.scale,
        minZ: tp.z - 0.65 * tp.scale,
        maxZ: tp.z + 0.65 * tp.scale,
        kind: 'trunk',
      });
    });

    trunks.instanceMatrix.needsUpdate = true;
    leavesA.instanceMatrix.needsUpdate = true;
    leavesB.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    leavesA.computeBoundingSphere();
    leavesB.computeBoundingSphere();
    group.add(trunks, leavesA, leavesB);
    disposables.push(trunkGeo, leafAGeo, leafBGeo, trunkMat, leafAMat, leafBMat);
  }

  // Coastal & Island Boulders
  const rockGeo = new THREE.DodecahedronGeometry(1.5, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: theme.rockColor, roughness: 0.9, flatShading: true });
  const rockCount = 65;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const rockDummy = new THREE.Object3D();
  let rockIdx = 0;
  for (let i = 0; i < 200 && rockIdx < rockCount; i++) {
    const r = 38 + rng() * 145;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.min(Math.abs(x), Math.abs(z)) < 11 || Math.abs(r - 108) < 10) continue;
    if (isOverlappingFootprint(x, z, 4) || isNearPond(x, z, 4)) continue;
    const y = getGroundHeightAt(x, z);
    if (y < -0.15) continue;
    const sc = 0.7 + rng() * 1.1;
    rockDummy.position.set(x, y + 0.65 * sc, z);
    rockDummy.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.4);
    rockDummy.scale.set(sc * 1.2, sc * 0.85, sc);
    rockDummy.updateMatrix();
    rocks.setMatrixAt(rockIdx, rockDummy.matrix);
    colliders.push({
      minX: x - 1.2 * sc,
      maxX: x + 1.2 * sc,
      minY: y,
      maxY: y + 1.45 * sc,
      minZ: z - 1.1 * sc,
      maxZ: z + 1.1 * sc,
      kind: 'wall',
    });
    rockIdx += 1;
  }
  rocks.count = rockIdx;
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  group.add(rocks);
  disposables.push(rockGeo, rockMat);

  // Build Extended Piers, Coastal Lighthouse, Interactive Benches, Palms, Beach Props, Coral & Boat/Conch Spawns
  const coastal = buildCoastalEnvironment({
    group,
    arenaId,
    waterLevel: WATER_LEVEL,
    getCoastRadius: (angle) => getIslandCoastRadius(arenaId, angle),
    getGroundHeightAt,
    wallGeos,
    floorGeos,
    trimGeos,
    rampGeos,
    colliders,
    animatedObjects,
    disposables,
    rng,
  });

  // Build World Expansion: Grand Titanic Liner, 4 Sea Caves & Reefs, 5 Inland Ponds & Bridges, Tribal & Volcanic Island
  const expansion = buildWorldExpansion({
    group,
    arenaId,
    waterLevel: WATER_LEVEL,
    getCoastRadius: (angle) => getIslandCoastRadius(arenaId, angle),
    getGroundHeightAt,
    colliders,
    benches: coastal.benches,
    animatedObjects,
    disposables,
    rng,
  });

  // Build Third Island: High-Security Airport & Military Base Island + Multi-Lane Sea Bridge + Watchtowers + Police Station
  const airport = buildAirportIsland({
    group,
    arenaId,
    waterLevel: WATER_LEVEL,
    getGroundHeightAt,
    colliders,
    animatedObjects,
    disposables,
  });
  for (const rb of airport.radarBuildings) {
    radarBuildings.push(rb);
  }

  // Build 2D Spatial Hash Grid for ultra-fast collider lookup
  const CELL_SIZE = 20;
  const grid = new Map<string, ArenaBoxCollider[]>();
  for (const col of colliders) {
    const cMinX = Math.floor(col.minX / CELL_SIZE);
    const cMaxX = Math.floor(col.maxX / CELL_SIZE);
    const cMinZ = Math.floor(col.minZ / CELL_SIZE);
    const cMaxZ = Math.floor(col.maxZ / CELL_SIZE);
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cz = cMinZ; cz <= cMaxZ; cz++) {
        const key = `${cx},${cz}`;
        let list = grid.get(key);
        if (!list) {
          list = [];
          grid.set(key, list);
        }
        list.push(col);
      }
    }
  }
  const seenSet = new Set<ArenaBoxCollider>();
  const queryColliders = (minX: number, maxX: number, minZ: number, maxZ: number): ArenaBoxCollider[] => {
    seenSet.clear();
    const out: ArenaBoxCollider[] = [];
    const cMinX = Math.floor(minX / CELL_SIZE);
    const cMaxX = Math.floor(maxX / CELL_SIZE);
    const cMinZ = Math.floor(minZ / CELL_SIZE);
    const cMaxZ = Math.floor(maxZ / CELL_SIZE);
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cz = cMinZ; cz <= cMaxZ; cz++) {
        const list = grid.get(`${cx},${cz}`);
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!seenSet.has(item)) {
            seenSet.add(item);
            out.push(item);
          }
        }
      }
    }
    return out;
  };

  // Spawn Points (16 well-spaced island fighter spawns on dry land)
  const spawnPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rad = i % 2 === 0 ? 64 : 134;
    let sx = Math.cos(a) * rad;
    let sz = Math.sin(a) * rad;
    if (isOverlappingFootprint(sx, sz, 3)) {
      sx += 14;
    }
    const sy = Math.max(0.2, getGroundHeightAt(sx, sz));
    spawnPoints.push(new THREE.Vector3(sx, sy + 0.1, sz));
  }

  // Vehicle Spawn Points along roads, bridges & airport (Civilian Sedans, Trucks, Buggy, Bikes, Police, Tanks, Helicopters)
  const rawVehicleSpawns: ArenaBuildResult['vehicleSpawnPoints'] = [
    { x: 14, y: 0.15, z: 0, yaw: 0, kind: 'car' },
    { x: -16, y: 0.15, z: 4, yaw: Math.PI, kind: 'bike' },
    { x: 0, y: 0.15, z: 62, yaw: Math.PI / 2, kind: 'buggy' },
    { x: 0, y: 0.15, z: -62, yaw: -Math.PI / 2, kind: 'sedan' },
    { x: 108, y: 0.15, z: 12, yaw: 0, kind: 'bike' },
    { x: -108, y: 0.15, z: -12, yaw: Math.PI, kind: 'buggy' },
    { x: 76, y: 0.15, z: -76, yaw: -Math.PI / 4, kind: 'sedan' },
    { x: -76, y: 0.15, z: 76, yaw: (3 * Math.PI) / 4, kind: 'bike' },
    { x: -76, y: 0.15, z: -76, yaw: Math.PI / 4, kind: 'truck' },
    { x: 148, y: 0.15, z: 42, yaw: Math.PI / 2, kind: 'sedan' },
    { x: -158, y: 0.15, z: 32, yaw: -Math.PI / 2, kind: 'police_car' },
    { x: 34, y: 0.15, z: -108, yaw: 0, kind: 'truck' },
  ];
  const vehicleSpawnPoints: ArenaBuildResult['vehicleSpawnPoints'] = [
    ...rawVehicleSpawns.map((v) => ({
      ...v,
      y: Math.max(0.1, getGroundHeightAt(v.x, v.z)),
    })),
    ...airport.vehicleSpawns,
  ];

  // Pickup Spawns across courtyard, rooftops, roads, piers, lighthouse & airport
  const pickupSpawnPoints: THREE.Vector3[] = [];
  const rawPickups: Array<[number, number, number]> = [
    [0, 0.4, 0],
    [16, 0.4, 16],
    [-16, 0.4, 16],
    [16, 0.4, -16],
    [-16, 0.4, -16],
    [-42, 14.3, -42], // Rooftop
    [44, 14.3, 42],   // Rooftop
    [0, 14.3, -86],   // Watchtower top
    [-96, 14.3, 0],   // Watchtower top
    [0, 0.4, 110],
    [110, 0.4, 0],
    [-110, 0.4, 0],
    [0, 0.4, -110],
    [68, 0.4, 142],
    [-145, 0.4, -35],
    [145, 0.4, -40],
    [-65, 0.4, 130],
    [90, 0.4, -115],
  ];
  for (const [px, py, pz] of rawPickups) {
    const gy = py > 5 ? py : Math.max(0.3, getGroundHeightAt(px, pz) + 0.4);
    pickupSpawnPoints.push(new THREE.Vector3(px, gy, pz));
  }
  for (const ep of coastal.extraPickupPoints) {
    pickupSpawnPoints.push(ep);
  }
  for (const ep of expansion.extraPickupPoints) {
    pickupSpawnPoints.push(ep);
  }
  for (const ap of airport.pickupPoints) {
    pickupSpawnPoints.push(ap);
  }

  return {
    group,
    halfSize,
    islandRadius,
    waterLevel: WATER_LEVEL,
    colliders,
    queryColliders,
    doors,
    benches: coastal.benches,
    bouncePads,
    spawnPoints,
    vehicleSpawnPoints,
    boatSpawnPoints: coastal.boatSpawnPoints,
    marineMountSpawns: expansion.marineMountSpawns,
    pickupSpawnPoints,
    conchSpawnPoints: coastal.conchSpawnPoints,
    shellSpawnPoints: expansion.shellSpawnPoints,
    campfires: expansion.campfires,
    lavaZones: expansion.lavaZones,
    tribalCampfireCenter: expansion.tribalCampfireCenter,
    ponds,
    villagerCenters: expansion.villagerCenters,
    fruitNodes: expansion.fruitNodes,
    updateFruitVisual: expansion.updateFruitVisual,
    waspNests: expansion.waspNests,
    destructibleStructures: airport.destructibleStructures,
    guardSpawns: airport.guardSpawns,
    tribalIslandCenter: TRIBAL_ISLAND_CENTER,
    airportIslandCenter: AIRPORT_ISLAND_CENTER,
    titanicCenter: TITANIC_CENTER,
    radarBuildings,
    getGroundHeightAt,
    update: (time, dt) => {
      for (const fn of animatedObjects) fn(time, dt);
      for (const door of doors) {
        const target = door.isOpen ? 1 : 0;
        if (Math.abs(door.openAlpha - target) > 0.002) {
          door.openAlpha = THREE.MathUtils.lerp(door.openAlpha, target, 1 - Math.exp(-10 * dt));
          door.pivot.rotation.y = THREE.MathUtils.lerp(door.closedAngle, door.openAngle, door.openAlpha);
        }
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
