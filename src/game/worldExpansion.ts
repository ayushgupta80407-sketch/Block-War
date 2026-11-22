import * as THREE from 'three';
import { ArenaId, MarineMountKind } from './types';
import type { ArenaBoxCollider, InteractiveBench } from './arenas';

export const TRIBAL_ISLAND_CENTER = { x: 495, z: -40 };
export const TRIBAL_ISLAND_RADIUS = 215;
export const VOLCANO_CENTER = { x: 618, z: -105 };
export const TRIBAL_SWAMP_CENTER = { x: 405, z: 58 };
export const TITANIC_CENTER = { x: 0, z: -262 };

export interface PondDef {
  id: string;
  x: number;
  z: number;
  radius: number;
  surfaceY: number;
}

export interface CampfireZone {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface LavaZone {
  x: number;
  z: number;
  radius: number;
  yThreshold: number;
}

export interface SeaCaveDef {
  x: number;
  z: number;
  radius: number;
  yaw: number;
}

export type FruitKind = 'mango' | 'banana' | 'coconut' | 'berry';

export interface HarvestableFruitNode {
  index: number;
  id: string;
  kind: FruitKind;
  x: number;
  y: number;
  z: number;
  baseY: number;
  groundY: number;
  fallen: boolean;
  active: boolean;
  respawnTimer: number;
  radius: number;
  colorHex: number;
}

export interface WaspNestNode {
  id: string;
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  active: boolean;
  fallen: boolean;
  vy: number;
  respawnTimer: number;
  attackerId?: string | null;
  mesh: THREE.Mesh;
}

export const SEA_CAVES: SeaCaveDef[] = [
  { x: 156, z: 162, radius: 13.5, yaw: -Math.PI * 0.75 },
  { x: -176, z: 128, radius: 13.5, yaw: Math.PI * 0.25 },
  { x: -184, z: -118, radius: 13.5, yaw: Math.PI * 0.72 },
  { x: 164, z: -160, radius: 13.5, yaw: -Math.PI * 0.28 },
];

export function getInlandPonds(arenaId: ArenaId): PondDef[] {
  const baseY = arenaId === 'sky_island' ? 0.05 : -0.14;
  return [
    { id: 'pond_ne', x: 72, z: 72, radius: 15.5, surfaceY: baseY },
    { id: 'pond_nw', x: -74, z: 66, radius: 14.5, surfaceY: baseY },
    { id: 'pond_sw', x: -72, z: -72, radius: 15.0, surfaceY: baseY },
    { id: 'pond_se', x: 76, z: -68, radius: 14.0, surfaceY: baseY },
    { id: 'pond_south', x: 0, z: 148, radius: 13.5, surfaceY: baseY },
    { id: 'pond_tribal_swamp', x: TRIBAL_SWAMP_CENTER.x, z: TRIBAL_SWAMP_CENTER.z, radius: 24.5, surfaceY: baseY },
  ];
}

export function getTribalIslandCoastRadius(arenaId: ArenaId, angle: number): number {
  const base = arenaId === 'sky_island' ? 202 : TRIBAL_ISLAND_RADIUS;
  return base + Math.sin(angle * 3 + 0.5) * 11.5 + Math.cos(angle * 5) * 7.5;
}

/**
 * Evaluates terrain elevation delta / height on the 5x Outer Tribal & Volcanic Island.
 * Returns null if outside the tribal island seabed skirt.
 */
export function getTribalIslandTerrainHeight(
  arenaId: ArenaId,
  x: number,
  z: number
): number | null {
  const dx = x - TRIBAL_ISLAND_CENTER.x;
  const dz = z - TRIBAL_ISLAND_CENTER.z;
  const dist = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const coastR = getTribalIslandCoastRadius(arenaId, angle);

  if (dist > coastR + 24) return null;

  // Coastal seabed transition from -5.4m up to +0.55m sandy beach
  if (dist > coastR - 18) {
    const t = Math.max(0, Math.min(1, (dist - (coastR - 18)) / 42));
    const smooth = t * t * (3 - 2 * t);
    return 0.55 * (1 - smooth) + -5.4 * smooth;
  }

  // Rolling lush outer jungle hills & ridges
  let h =
    1.15 +
    Math.sin(x * 0.032 + 0.4) * Math.cos(z * 0.034 - 0.3) * 1.15 +
    Math.cos((x - z) * 0.022) * 0.55;

  // Gentle beach taper near outer rim
  if (dist > coastR - 38) {
    const rimT = Math.max(0, Math.min(1, (dist - (coastR - 38)) / 20));
    h = THREE.MathUtils.lerp(h, 0.55, rimT);
  }

  // Flattened Central Fortified Tribal Village Plaza at heart of the 5x Island
  if (dist < 66) {
    const vt = Math.max(0, Math.min(1, (66 - dist) / 14));
    const smooth = vt * vt * (3 - 2 * vt);
    h = THREE.MathUtils.lerp(h, 2.6, smooth);
  }

  // Carve Outer Mossy Jungle Swamp basin in SW outer ring
  const swDist = Math.hypot(x - TRIBAL_SWAMP_CENTER.x, z - TRIBAL_SWAMP_CENTER.z);
  if (swDist < 27.5) {
    const st = Math.max(0, Math.min(1, (27.5 - swDist) / 6.5));
    const smooth = st * st * (3 - 2 * st);
    const swampFloor = (arenaId === 'sky_island' ? 0.05 : -0.14) - 1.15;
    h = THREE.MathUtils.lerp(h, swampFloor, smooth);
  }

  // Towering Active Volcano cone + hollow molten crater in East/NE wild ring
  const vx = x - VOLCANO_CENTER.x;
  const vz = z - VOLCANO_CENTER.z;
  const vRad = Math.hypot(vx, vz);
  if (vRad < 50) {
    if (vRad < 10.5) {
      const rimH = 26.5;
      const bowlT = vRad / 10.5;
      h = Math.max(h, 19.5 + bowlT * bowlT * (rimH - 19.5));
    } else {
      const slopeT = 1 - (vRad - 10.5) / 39.5;
      const ridge = 1 + Math.sin(Math.atan2(vz, vx) * 6) * 0.06;
      const coneH = 1.2 + Math.pow(slopeT, 1.28) * 25.3 * ridge;
      h = Math.max(h, coneH);
    }
  }

  // Carve subtle lava channel groove running south-west from crater
  if (
    x >= VOLCANO_CENTER.x - 44 &&
    x <= VOLCANO_CENTER.x - 6 &&
    Math.abs(z - (VOLCANO_CENTER.z + 18)) < 6.5
  ) {
    const groove = 1 - Math.abs(z - (VOLCANO_CENTER.z + 18)) / 6.5;
    h = Math.max(0.45, h - groove * 1.15);
  }

  return h;
}

export interface WorldExpansionResult {
  campfires: CampfireZone[];
  lavaZones: LavaZone[];
  tribalCampfireCenter: { x: number; y: number; z: number };
  extraPickupPoints: THREE.Vector3[];
  shellSpawnPoints: Array<{ x: number; y: number; z: number; kind: 'shell' | 'starfish' | 'pearl' }>;
  marineMountSpawns: Array<{ x: number; y: number; z: number; yaw: number; kind: MarineMountKind }>;
  villagerCenters: Array<{ x: number; y: number; z: number }>;
  fruitNodes: HarvestableFruitNode[];
  updateFruitVisual: (idx: number) => void;
  waspNests: WaspNestNode[];
  wildlifeCenters: {
    tribal: { x: number; z: number };
    ponds: PondDef[];
  };
}

export function buildWorldExpansion(opts: {
  group: THREE.Group;
  arenaId: ArenaId;
  waterLevel: number;
  getCoastRadius: (angle: number) => number;
  getGroundHeightAt: (x: number, z: number) => number;
  colliders: ArenaBoxCollider[];
  benches: InteractiveBench[];
  animatedObjects: Array<(t: number, dt: number) => void>;
  disposables: Array<{ dispose: () => void }>;
  rng: () => number;
}): WorldExpansionResult {
  const {
    group,
    arenaId,
    waterLevel,
    getCoastRadius,
    getGroundHeightAt,
    colliders,
    benches,
    animatedObjects,
    disposables,
    rng,
  } = opts;

  const extraPickupPoints: THREE.Vector3[] = [];
  const shellSpawnPoints: WorldExpansionResult['shellSpawnPoints'] = [];
  const campfires: CampfireZone[] = [];
  const lavaZones: LavaZone[] = [];

  const isSnow = arenaId === 'snowy';
  const isDesert = arenaId === 'desert';
  const isSky = arenaId === 'sky_island';

  const addBoxCollider = (
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    kind: ArenaBoxCollider['kind'] = 'wall'
  ) => {
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

  const addRotatedWallBoxes = (
    ox: number,
    oy: number,
    oz: number,
    yaw: number,
    lx: number,
    ly: number,
    lz: number,
    sx: number,
    sy: number,
    sz: number,
    steps = 4,
    kind: ArenaBoxCollider['kind'] = 'wall'
  ) => {
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const alongZ = sz >= sx;
    const segLen = (alongZ ? sz : sx) / steps;
    const segW = Math.max(alongZ ? sx : sz, segLen * 0.85);
    for (let s = 0; s < steps; s++) {
      const offset = -((steps - 1) * 0.5 - s) * segLen;
      const plx = lx + (alongZ ? 0 : offset);
      const plz = lz + (alongZ ? offset : 0);
      const wx = ox + plx * cosY + plz * sinY;
      const wz = oz - plx * sinY + plz * cosY;
      addBoxCollider(wx, oy + ly, wz, segW, sy, segW, kind);
    }
  };

  let expBenchIdx = 200;
  const addLocalBench = (bx: number, by: number, bz: number, lookYaw: number, mat: THREE.Material) => {
    const id = `bench_exp_${++expBenchIdx}`;
    const benchGrp = new THREE.Group();
    benchGrp.position.set(bx, by, bz);
    benchGrp.rotation.y = lookYaw;

    const seatGeo = new THREE.BoxGeometry(2.4, 0.18, 0.85);
    const backGeo = new THREE.BoxGeometry(2.4, 0.58, 0.16);
    const legGeo = new THREE.BoxGeometry(0.22, 0.55, 0.7);
    const seat = new THREE.Mesh(seatGeo, mat);
    seat.position.set(0, 0.55, 0);
    seat.castShadow = true;
    const back = new THREE.Mesh(backGeo, mat);
    back.position.set(0, 0.9, 0.36);
    const l1 = new THREE.Mesh(legGeo, mat);
    l1.position.set(-0.98, 0.27, 0);
    const l2 = new THREE.Mesh(legGeo, mat);
    l2.position.set(0.98, 0.27, 0);
    benchGrp.add(seat, back, l1, l2);
    group.add(benchGrp);
    disposables.push(seatGeo, backGeo, legGeo);

    benches.push({
      id,
      x: bx,
      y: by,
      z: bz,
      seatX: bx,
      seatY: by + 0.36,
      seatZ: bz,
      lookYaw,
    });
  };

  // =========================================================================
  // 1. THE GRAND TITANIC OCEAN LINER (Anchored off Main Island South Beach)
  // =========================================================================
  {
    const tx = TITANIC_CENTER.x;
    const tz = TITANIC_CENTER.z;
    const baseY = waterLevel;

    const hullDarkMat = new THREE.MeshStandardMaterial({
      color: isSky ? 0x312e81 : 0x0f172a,
      roughness: 0.45,
      metalness: 0.45,
    });
    const hullKeelMat = new THREE.MeshStandardMaterial({
      color: isSky ? 0x7c3aed : 0x991b1b,
      roughness: 0.55,
    });
    const superWhiteMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0xe0f2fe : 0xf8fafc,
      roughness: 0.38,
    });
    const deckTeakMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x94a3b8 : 0xb45309,
      roughness: 0.72,
    });
    const funnelAmberMat = new THREE.MeshStandardMaterial({
      color: isSky ? 0xc084fc : 0xf59e0b,
      roughness: 0.35,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
      roughness: 0.22,
      metalness: 0.8,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.65,
    });
    disposables.push(hullDarkMat, hullKeelMat, superWhiteMat, deckTeakMat, funnelAmberMat, goldMat, glassMat);

    const addShipBox = (
      lx: number,
      ly: number,
      lz: number,
      sx: number,
      sy: number,
      sz: number,
      mat: THREE.Material,
      colKind: ArenaBoxCollider['kind'] | null = 'wall'
    ) => {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(tx + lx, baseY + ly, tz + lz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      disposables.push(geo);
      if (colKind) {
        addBoxCollider(tx + lx, baseY + ly, tz + lz, sx, sy, sz, colKind);
      }
    };

    const addShipRamp = (
      lx: number,
      lz: number,
      y0: number,
      y1: number,
      run: number,
      width: number,
      axis: 'x' | 'z',
      dir: 1 | -1,
      mat: THREE.Material
    ) => {
      const h = y1 - y0;
      const hyp = Math.hypot(run, h);
      const angle = Math.atan2(h, run);
      const geo = new THREE.BoxGeometry(axis === 'x' ? hyp : width, 0.3, axis === 'z' ? hyp : width);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(tx + lx, baseY + (y0 + y1) * 0.5 - 0.14, tz + lz);
      if (axis === 'z') mesh.rotation.x = dir > 0 ? -angle : angle;
      else mesh.rotation.z = dir > 0 ? angle : -angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      disposables.push(geo);
      colliders.push({
        minX: tx + lx - (axis === 'x' ? run * 0.5 : width * 0.5),
        maxX: tx + lx + (axis === 'x' ? run * 0.5 : width * 0.5),
        minY: baseY + y0 - 0.2,
        maxY: baseY + y1,
        minZ: tz + lz - (axis === 'z' ? run * 0.5 : width * 0.5),
        maxZ: tz + lz + (axis === 'z' ? run * 0.5 : width * 0.5),
        kind: 'ramp',
        slopeAxis: axis,
        slopeDir: dir,
      });
    };

    // Lower red keel + black main hull (aligned along X: -30..+30, width Z: -7..+7)
    addShipBox(0, -0.4, 0, 58, 2.2, 13.5, hullKeelMat, 'floor');
    addShipBox(0, 1.85, 0, 60, 2.5, 14.2, hullDarkMat, 'floor');
    // Pointed Bow extension (+X = bow lookout) & Stern (+Z/Aft)
    addShipBox(33, 2.1, 0, 8, 2.8, 9.2, hullDarkMat, 'floor');
    addShipBox(38.5, 2.3, 0, 4.5, 2.9, 4.8, hullDarkMat, 'floor');
    // Main Teak Promenade Deck (y = 3.25)
    addShipBox(0, 3.25, 0, 58, 0.32, 13.6, deckTeakMat, 'floor');
    addShipBox(33, 3.6, 0, 7.8, 0.3, 8.8, deckTeakMat, 'floor');

    // Low perimeter deck railings (shootable cover without blocking view)
    addShipBox(0, 4.0, 6.5, 56, 1.1, 0.4, superWhiteMat, 'wall');
    addShipBox(-14, 4.0, -6.5, 24, 1.1, 0.4, superWhiteMat, 'wall');
    addShipBox(16, 4.0, -6.5, 22, 1.1, 0.4, superWhiteMat, 'wall');
    addShipBox(-29, 4.0, 0, 0.5, 1.1, 13.2, superWhiteMat, 'wall');
    // Bow railings & Iconic Bow Lookout Platform
    addShipBox(36.5, 4.35, 0, 4.0, 0.25, 4.4, deckTeakMat, 'floor');
    addShipBox(39.8, 4.6, 0, 0.4, 1.2, 4.2, goldMat, 'wall');
    extraPickupPoints.push(new THREE.Vector3(tx + 36.5, baseY + 5.1, tz));

    // Port & Starboard Boarding Ramps directly from ocean water up to Promenade Deck (at z = -6.5 side)
    addShipRamp(2, -10.5, -0.4, 3.4, 8.5, 3.2, 'z', 1, deckTeakMat);
    addShipRamp(-2, 10.5, -0.4, 3.4, 8.5, 3.2, 'z', -1, deckTeakMat);

    // Superstructure with open Interior Grand Staircase Hall (x = -4..+6)
    // Aft cabin block (x = -23..-6) and Forward cabin block (x = +8..+22)
    addShipBox(-14.5, 5.4, 5.4, 17, 4.0, 1.2, superWhiteMat, 'wall');
    addShipBox(-14.5, 5.4, -5.4, 17, 4.0, 1.2, superWhiteMat, 'wall');
    addShipBox(15, 5.4, 5.4, 14, 4.0, 1.2, superWhiteMat, 'wall');
    addShipBox(15, 5.4, -5.4, 14, 4.0, 1.2, superWhiteMat, 'wall');
    // Glowing Promenade Windows
    addShipBox(-14.5, 5.4, 6.05, 13, 1.4, 0.15, glassMat, null);
    addShipBox(15, 5.4, 6.05, 10, 1.4, 0.15, glassMat, null);
    addShipBox(-14.5, 5.4, -6.05, 13, 1.4, 0.15, glassMat, null);
    addShipBox(15, 5.4, -6.05, 10, 1.4, 0.15, glassMat, null);

    // Grand Atrium Interior Chandelier + Gold Trim + Interior Grand Staircase (x = -6..+7)
    addShipBox(0.5, 7.25, 0, 1.6, 0.7, 1.6, goldMat, null);
    // Center Grand Staircase climbing from Promenade (y=3.4) up to Boat Deck (y=7.7)
    addShipRamp(0.5, 0, 3.4, 7.7, 9.5, 4.0, 'x', -1, goldMat);

    // Upper Boat Deck (y = 7.65) split cleanly with staircase opening at x = -4..+5, z = -2.1..+2.1
    addShipBox(-14.5, 7.65, 0, 18.5, 0.35, 11.4, superWhiteMat, 'floor');
    addShipBox(14.5, 7.65, 0, 17.5, 0.35, 11.4, superWhiteMat, 'floor');
    addShipBox(0.5, 7.65, 4.1, 11.0, 0.35, 3.2, superWhiteMat, 'floor');
    addShipBox(0.5, 7.65, -4.1, 11.0, 0.35, 3.2, superWhiteMat, 'floor');

    // Exterior aft staircase from Promenade (y=3.4) to Boat Deck (y=7.7)
    addShipRamp(-25.5, 0, 3.4, 7.7, 6.8, 2.8, 'x', 1, deckTeakMat);

    // 4 Iconic Titanic Funnels (tall amber + black tips)
    for (const fx of [-18, -8, 6, 16]) {
      const fBaseGeo = new THREE.CylinderGeometry(1.15, 1.25, 5.6, 12);
      const fBase = new THREE.Mesh(fBaseGeo, funnelAmberMat);
      fBase.position.set(tx + fx, baseY + 10.6, tz);
      fBase.rotation.z = -0.1;
      fBase.castShadow = true;
      const fTopGeo = new THREE.CylinderGeometry(1.18, 1.15, 1.4, 12);
      const fTop = new THREE.Mesh(fTopGeo, hullDarkMat);
      fTop.position.set(tx + fx + 0.32, baseY + 14.0, tz);
      fTop.rotation.z = -0.1;
      group.add(fBase, fTop);
      disposables.push(fBaseGeo, fTopGeo);
      addBoxCollider(tx + fx, baseY + 10.4, tz, 2.3, 5.2, 2.3, 'wall');
    }

    // Captain's Bridge & Wheelhouse (Forward Upper Deck, y = 7.8 -> 11.4)
    addShipBox(20.5, 9.4, 0, 5.2, 3.2, 8.6, superWhiteMat, 'floor');
    addShipBox(23.15, 9.6, 0, 0.25, 1.4, 7.2, glassMat, null);
    addShipRamp(16.2, -3.5, 7.8, 11.2, 5.8, 2.4, 'x', 1, deckTeakMat);

    // Lifeboats mounted along Upper Boat Deck
    for (const lz of [-5.8, 5.8]) {
      for (const lx of [-13, 11]) {
        addShipBox(lx, 8.45, lz, 3.6, 0.85, 1.3, superWhiteMat, 'wall');
      }
    }

    // Scenic Titanic Promenade Benches (+5 HP/s)
    addLocalBench(tx - 15, baseY + 3.41, tz + 4.8, 0, deckTeakMat);
    addLocalBench(tx + 14, baseY + 3.41, tz - 4.8, Math.PI, deckTeakMat);

    // High-Tier Loot Spawns on Titanic (Promenade, Boat Deck, Captain's Bridge)
    extraPickupPoints.push(
      new THREE.Vector3(tx - 14, baseY + 3.9, tz),
      new THREE.Vector3(tx + 2, baseY + 8.3, tz + 4.0),
      new THREE.Vector3(tx + 20.5, baseY + 11.6, tz)
    );
  }

  // =========================================================================
  // 2. UNDERWATER CORAL REEFS, KELP, CAUSTIC RAYS & 4 SEA CAVES WITH PEARLS
  // =========================================================================
  {
    const dummy = new THREE.Object3D();
    const instCol = new THREE.Color();

    // A. Dense Instanced Coral Reefs (Brain + Staghorn coral shapes)
    const coralCount = 120;
    const coralGeo = new THREE.DodecahedronGeometry(0.95, 0);
    const coralMat = new THREE.MeshStandardMaterial({ roughness: 0.55, flatShading: true });
    const corals = new THREE.InstancedMesh(coralGeo, coralMat, coralCount);
    const coralPalette = isSnow
      ? [0x38bdf8, 0x7dd3fc, 0xa5f3fc, 0x818cf8]
      : isSky
        ? [0xc084fc, 0x22d3ee, 0xf472b6, 0x818cf8]
        : [0xf43f5e, 0x22d3ee, 0xa855f7, 0xf97316, 0xfacc15, 0x14b8a6];

    for (let i = 0; i < coralCount; i++) {
      const a = (i / coralCount) * Math.PI * 2 + rng() * 0.12;
      const distOff = 8 + rng() * 44;
      const r = getCoastRadius(a) + distOff;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const cy = getGroundHeightAt(cx, cz);
      dummy.position.set(cx, cy + 0.55, cz);
      dummy.rotation.set(rng() * 0.4, rng() * Math.PI * 2, rng() * 0.4);
      dummy.scale.set(0.8 + rng() * 1.1, 0.7 + rng() * 1.4, 0.8 + rng() * 1.1);
      dummy.updateMatrix();
      corals.setMatrixAt(i, dummy.matrix);
      corals.setColorAt(i, instCol.setHex(coralPalette[i % coralPalette.length]));
    }
    corals.instanceMatrix.needsUpdate = true;
    if (corals.instanceColor) corals.instanceColor.needsUpdate = true;
    corals.computeBoundingSphere();
    group.add(corals);
    disposables.push(coralGeo, coralMat);

    // B. Tall Underwater Kelp Forest Blades (InstancedMesh)
    const kelpCount = 130;
    const kelpGeo = new THREE.BoxGeometry(0.28, 3.4, 0.14);
    const kelpMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x0f766e : 0x15803d,
      emissive: 0x064e3b,
      emissiveIntensity: 0.25,
      roughness: 0.7,
    });
    const kelp = new THREE.InstancedMesh(kelpGeo, kelpMat, kelpCount);
    for (let i = 0; i < kelpCount; i++) {
      const a = (i / kelpCount) * Math.PI * 2 + rng() * 0.2;
      const r = getCoastRadius(a) + 18 + rng() * 52;
      const kx = Math.cos(a) * r;
      const kz = Math.sin(a) * r;
      const ky = getGroundHeightAt(kx, kz);
      const sc = 0.75 + rng() * 0.7;
      dummy.position.set(kx, Math.min(waterLevel - 1.3, ky + 1.5 * sc), kz);
      dummy.rotation.set((rng() - 0.5) * 0.25, rng() * Math.PI, (rng() - 0.5) * 0.25);
      dummy.scale.set(1, sc, 1);
      dummy.updateMatrix();
      kelp.setMatrixAt(i, dummy.matrix);
    }
    kelp.instanceMatrix.needsUpdate = true;
    kelp.computeBoundingSphere();
    group.add(kelp);
    disposables.push(kelpGeo, kelpMat);

    // C. Underwater Translucent Caustic Sunbeam Rays (24 shafts around ocean channel & caves)
    const rayGeo = new THREE.CylinderGeometry(0.6, 2.4, 6.2, 6, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: isSky ? 0xc084fc : 0x7dd3fc,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rays = new THREE.InstancedMesh(rayGeo, rayMat, 26);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = i < 18 ? getCoastRadius(a) + 24 + (i % 3) * 18 : 225 + (i % 4) * 15;
      const rx = i < 22 ? Math.cos(a) * r : 210 + (i - 22) * 16;
      const rz = i < 22 ? Math.sin(a) * r : -30 + (i % 2) * 28;
      dummy.position.set(rx, waterLevel - 2.6, rz);
      dummy.rotation.set(0.14, a, 0.1);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rays.setMatrixAt(i, dummy.matrix);
    }
    rays.instanceMatrix.needsUpdate = true;
    rays.computeBoundingSphere();
    group.add(rays);
    disposables.push(rayGeo, rayMat);

    // D. 4 Glowing Underwater Sea Caves & Sunken Ruins
    const caveRockMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x64748b : 0x334155,
      roughness: 0.9,
      flatShading: true,
    });
    const crystalCyanMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const crystalPinkMat = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xc026d3,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const ruinStoneMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.78,
    });
    const clamMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.5,
    });
    disposables.push(caveRockMat, crystalCyanMat, crystalPinkMat, ruinStoneMat, clamMat);

    SEA_CAVES.forEach((cave, cIdx) => {
      const floorY = getGroundHeightAt(cave.x, cave.z);
      const archGrp = new THREE.Group();
      archGrp.position.set(cave.x, floorY, cave.z);
      archGrp.rotation.y = cave.yaw;

      // Overhead rock dome & side arch pillars (roof collider sits cleanly above swim height!)
      const pillarGeo = new THREE.DodecahedronGeometry(3.2, 0);
      const pL = new THREE.Mesh(pillarGeo, caveRockMat);
      pL.position.set(-7.5, 2.2, 0);
      pL.scale.set(1.1, 1.5, 1.9);
      const pR = new THREE.Mesh(pillarGeo, caveRockMat);
      pR.position.set(7.5, 2.2, 0);
      pR.scale.set(1.1, 1.5, 1.9);
      const pBack = new THREE.Mesh(pillarGeo, caveRockMat);
      pBack.position.set(0, 2.4, -7.2);
      pBack.scale.set(2.4, 1.5, 1.0);
      const roofGeo = new THREE.BoxGeometry(17, 2.2, 16);
      const roof = new THREE.Mesh(roofGeo, caveRockMat);
      roof.position.set(0, 5.4, -0.8);
      archGrp.add(pL, pR, pBack, roof);

      // Sunken Greek-style Ruin Columns flanking entrance
      const colGeo = new THREE.CylinderGeometry(0.65, 0.75, 4.2, 8);
      const col1 = new THREE.Mesh(colGeo, ruinStoneMat);
      col1.position.set(-5.2, 2.1, 7.2);
      const col2 = new THREE.Mesh(colGeo, ruinStoneMat);
      col2.position.set(5.2, 1.5, 7.4);
      col2.rotation.z = 0.28;
      archGrp.add(col1, col2);

      // Bioluminescent Crystals inside cavern
      const cryGeo = new THREE.ConeGeometry(0.55, 2.1, 5);
      for (let k = 0; k < 5; k++) {
        const cry = new THREE.Mesh(cryGeo, k % 2 === 0 ? crystalCyanMat : crystalPinkMat);
        cry.position.set(-4.5 + k * 2.2, 1.0, -3.5 + (k % 2) * 2.2);
        cry.rotation.set((k % 2 === 0 ? 1 : -1) * 0.2, k, 0.15);
        archGrp.add(cry);
      }

      // Giant Pearl Clam visual at cave heart
      const clamGeo = new THREE.BoxGeometry(1.8, 0.7, 1.5);
      const clam = new THREE.Mesh(clamGeo, clamMat);
      clam.position.set(0, 0.35, -1.5);
      archGrp.add(clam);

      group.add(archGrp);
      disposables.push(pillarGeo, roofGeo, colGeo, cryGeo, clamGeo);

      // Hollow cave interior: solid rotated side pillars, back wall, and overhead roof (mouth open!)
      addRotatedWallBoxes(cave.x, floorY, cave.z, cave.yaw, -7.5, 2.2, 0, 2.8, 5.2, 12.0, 4, 'wall');
      addRotatedWallBoxes(cave.x, floorY, cave.z, cave.yaw, 7.5, 2.2, 0, 2.8, 5.2, 12.0, 4, 'wall');
      addRotatedWallBoxes(cave.x, floorY, cave.z, cave.yaw, 0, 2.4, -7.2, 13.5, 5.2, 2.8, 4, 'wall');
      addBoxCollider(cave.x, floorY + 5.4, cave.z, 15, 2.0, 14, 'wall');
      // Spawn Pearl collectible (+10 Bonus Coins + heal) & rare underwater armor/weapon inside cave
      shellSpawnPoints.push({
        x: cave.x,
        y: floorY + 1.0,
        z: cave.z,
        kind: 'pearl',
      });
      if (cIdx % 2 === 0) {
        extraPickupPoints.push(new THREE.Vector3(cave.x + 2.5, floorY + 1.1, cave.z + 2.0));
      }
    });

    // E. Collectible Shimmering Seashells & Starfish along Sandy Shores (+5 Bonus Coins each!)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.11;
      const r = getCoastRadius(a) - 3.5 + (i % 3) * 2.4;
      const sx = Math.cos(a) * r;
      const sz = Math.sin(a) * r;
      const sy = Math.max(-0.2, getGroundHeightAt(sx, sz)) + 0.45;
      shellSpawnPoints.push({
        x: sx,
        y: sy,
        z: sz,
        kind: i % 2 === 0 ? 'shell' : 'starfish',
      });
    }
  }

  // =========================================================================
  // 3. 5 INLAND PONDS WITH LILY PADS, REEDS, BRIDGES & FRESHWATER LIFE
  // =========================================================================
  {
    const ponds = getInlandPonds(arenaId);
    const pondWaterMat = new THREE.MeshStandardMaterial({
      color: isDesert ? 0x06b6d4 : isSnow ? 0x7dd3fc : isSky ? 0x818cf8 : 0x0ea5e9,
      emissive: isSnow ? 0x0284c7 : 0x0369a1,
      emissiveIntensity: 0.25,
      roughness: 0.14,
      metalness: 0.28,
      transparent: true,
      opacity: isSnow ? 0.78 : 0.76,
    });
    const lilyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78 });
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.8 });
    const mossRockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
    disposables.push(pondWaterMat, lilyMat, lotusMat, bridgeMat, reedMat, mossRockMat);

    // Instanced reeds & lily pads across all 5 ponds
    const reedTotal = ponds.length * 14;
    const reedGeo = new THREE.BoxGeometry(0.16, 1.85, 0.16);
    const reeds = new THREE.InstancedMesh(reedGeo, reedMat, reedTotal);
    const dummy = new THREE.Object3D();
    let reedIdx = 0;

    ponds.forEach((pond, pIdx) => {
      // Pond water surface disc
      const discGeo = new THREE.CylinderGeometry(pond.radius * 0.96, pond.radius * 0.96, 0.14, 24);
      const disc = new THREE.Mesh(discGeo, pondWaterMat);
      disc.position.set(pond.x, pond.surfaceY, pond.z);
      disc.receiveShadow = true;
      group.add(disc);
      disposables.push(discGeo);

      // Jumpable solid Lily Pads + Lotus Flowers
      for (let l = 0; l < 6; l++) {
        const la = (l / 6) * Math.PI * 2 + pIdx * 0.5;
        const lr = pond.radius * (0.35 + (l % 2) * 0.28);
        const lx = pond.x + Math.cos(la) * lr;
        const lz = pond.z + Math.sin(la) * lr;
        const padGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.16, 10);
        const pad = new THREE.Mesh(padGeo, lilyMat);
        pad.position.set(lx, pond.surfaceY + 0.08, lz);
        group.add(pad);
        disposables.push(padGeo);
        addBoxCollider(lx, pond.surfaceY + 0.08, lz, 2.7, 0.22, 2.7, 'floor');

        if (l % 2 === 0) {
          const flowerGeo = new THREE.ConeGeometry(0.45, 0.42, 6);
          const flower = new THREE.Mesh(flowerGeo, lotusMat);
          flower.position.set(lx, pond.surfaceY + 0.34, lz);
          flower.rotation.x = Math.PI;
          group.add(flower);
          disposables.push(flowerGeo);
        }
      }

      // Wooden Footbridge spanning East-West across center of pond
      const bridgeLen = pond.radius * 1.92;
      const deckGeo = new THREE.BoxGeometry(bridgeLen, 0.28, 2.6);
      const deck = new THREE.Mesh(deckGeo, bridgeMat);
      deck.position.set(pond.x, pond.surfaceY + 0.85, pond.z);
      deck.castShadow = true;
      deck.receiveShadow = true;
      group.add(deck);
      disposables.push(deckGeo);
      addBoxCollider(pond.x, pond.surfaceY + 0.85, pond.z, bridgeLen, 0.3, 2.6, 'floor');

      // Approach ramps at both ends of footbridge
      for (const side of [-1, 1] as const) {
        const rx = pond.x + side * (bridgeLen * 0.5 + 1.4);
        const rGeo = new THREE.BoxGeometry(3.2, 0.25, 2.6);
        const rMesh = new THREE.Mesh(rGeo, bridgeMat);
        rMesh.position.set(rx, pond.surfaceY + 0.45, pond.z);
        rMesh.rotation.z = side > 0 ? -0.26 : 0.26;
        group.add(rMesh);
        disposables.push(rGeo);
        colliders.push({
          minX: rx - 1.5,
          maxX: rx + 1.5,
          minY: pond.surfaceY - 0.2,
          maxY: pond.surfaceY + 0.95,
          minZ: pond.z - 1.3,
          maxZ: pond.z + 1.3,
          kind: 'ramp',
          slopeAxis: 'x',
          slopeDir: side > 0 ? -1 : 1,
        });
      }

      // Scenic Shore Bench + Lakeside Supply Pickup
      const benchY = Math.max(0.05, getGroundHeightAt(pond.x, pond.z + pond.radius + 3.2));
      addLocalBench(pond.x, benchY, pond.z + pond.radius + 3.2, Math.PI, bridgeMat);
      extraPickupPoints.push(new THREE.Vector3(pond.x - pond.radius - 2.5, Math.max(0.4, getGroundHeightAt(pond.x - pond.radius - 2.5, pond.z) + 0.5), pond.z));

      // Shoreline Reeds & Mossy Boulders
      for (let k = 0; k < 14; k++) {
        const ra = (k / 14) * Math.PI * 2 + pIdx * 0.3;
        const rr = pond.radius * (0.94 + (k % 3) * 0.08);
        const rrx = pond.x + Math.cos(ra) * rr;
        const rrz = pond.z + Math.sin(ra) * rr;
        dummy.position.set(rrx, pond.surfaceY + 0.75, rrz);
        dummy.rotation.set((rng() - 0.5) * 0.2, rng() * Math.PI, (rng() - 0.5) * 0.2);
        dummy.scale.setScalar(0.85 + rng() * 0.45);
        dummy.updateMatrix();
        reeds.setMatrixAt(reedIdx++, dummy.matrix);

        if (k % 4 === 0) {
          const rockG = new THREE.DodecahedronGeometry(0.95, 0);
          const rockM = new THREE.Mesh(rockG, mossRockMat);
          rockM.position.set(rrx * 1 + Math.cos(ra) * 1.4, pond.surfaceY + 0.35, rrz + Math.sin(ra) * 1.4);
          rockM.scale.set(1.2, 0.7, 1.0);
          group.add(rockM);
          disposables.push(rockG);
        }
      }
    });
    reeds.count = reedIdx;
    reeds.instanceMatrix.needsUpdate = true;
    reeds.computeBoundingSphere();
    group.add(reeds);
    disposables.push(reedGeo);
  }

  // =========================================================================
  // 4. 5X MASSIVE OUTER TRIBAL & VOLCANIC ISLAND
  //    Center Village (Palisades + Longhouse + Watchtowers + Caves + Campfires)
  //    & Wild Outer Ring (Swamp, Jungle Foliage, Fruit Trees, Wasp Nests, Volcano)
  // =========================================================================
  const cx = TRIBAL_ISLAND_CENTER.x;
  const cz = TRIBAL_ISLAND_CENTER.z;
  const villageFireCenter = { x: cx, y: 2.6, z: cz + 6 };
  const fruitNodes: HarvestableFruitNode[] = [];
  const waspNests: WaspNestNode[] = [];
  let updateFruitVisual: (idx: number) => void = () => {};

  {
    const mudMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0xcbd5e1 : isDesert ? 0xd97706 : 0xa16207,
      roughness: 0.9,
    });
    const thatchMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x94a3b8 : 0xfacc15,
      roughness: 0.85,
    });
    const tribalWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.88 });
    const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const stoneCaveMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.92, flatShading: true });
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3b00,
      emissiveIntensity: 1.6,
      roughness: 0.25,
    });
    const torchFlameMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 1.8,
    });
    const hideRugMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    const drumSkinMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
    const leafJungleMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x0f766e : isDesert ? 0x65a30d : isSky ? 0xa855f7 : 0x15803d,
      roughness: 0.76,
    });
    const canopyLightMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x14b8a6 : isDesert ? 0x84cc16 : isSky ? 0x38bdf8 : 0x22c55e,
      roughness: 0.72,
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: isSnow ? 0x5eead4 : 0x65a30d,
      roughness: 0.65,
    });
    const mushroomCapMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.95,
      roughness: 0.3,
    });
    const nestMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.85,
      flatShading: true,
    });
    disposables.push(
      mudMat,
      thatchMat,
      tribalWoodMat,
      darkTimberMat,
      stoneCaveMat,
      lavaMat,
      torchFlameMat,
      hideRugMat,
      drumSkinMat,
      leafJungleMat,
      canopyLightMat,
      bambooMat,
      mushroomCapMat,
      nestMat
    );

    const plazaY = Math.max(2.4, getGroundHeightAt(cx, cz));
    villageFireCenter.y = plazaY;

    // A. Fortified Wooden Spiked Palisade Ring (radius 55m, 4 Wide Open Gates at N/S/E/W)
    const palisadeR = 55;
    const totalWallSlots = 160;
    const wallStakePos: Array<{ x: number; y: number; z: number; rotY: number; h: number }> = [];
    for (let i = 0; i < totalWallSlots; i++) {
      const a = (i / totalWallSlots) * Math.PI * 2;
      // Leave 4 clean 14m wide open gate corridors along N/S/E/W axes
      if (Math.abs(Math.sin(a)) < 0.13 || Math.abs(Math.cos(a)) < 0.13) {
        continue;
      }
      const wx = cx + Math.cos(a) * palisadeR;
      const wz = cz + Math.sin(a) * palisadeR;
      const wy = Math.max(2.0, getGroundHeightAt(wx, wz));
      const h = 4.2 + (i % 3) * 0.35;
      wallStakePos.push({ x: wx, y: wy, z: wz, rotY: -a, h });
      if (i % 2 === 0) {
        addBoxCollider(wx, wy + h * 0.5, wz, 2.35, h + 0.5, 2.35, 'wall');
      }
    }

    if (wallStakePos.length > 0) {
      const stakeGeo = new THREE.CylinderGeometry(0.18, 0.42, 4.6, 6);
      const stakeInst = new THREE.InstancedMesh(stakeGeo, darkTimberMat, wallStakePos.length);
      stakeInst.castShadow = true;
      stakeInst.receiveShadow = true;
      const dummy = new THREE.Object3D();
      wallStakePos.forEach((sp, idx) => {
        dummy.position.set(sp.x, sp.y + sp.h * 0.5, sp.z);
        dummy.rotation.set(0, sp.rotY, 0);
        dummy.scale.set(1.25, sp.h / 4.6, 1.25);
        dummy.updateMatrix();
        stakeInst.setMatrixAt(idx, dummy.matrix);
      });
      stakeInst.instanceMatrix.needsUpdate = true;
      stakeInst.computeBoundingSphere();
      group.add(stakeInst);
      disposables.push(stakeGeo);
    }

    // 4 Open Gate Archways with Flaming Torches at N/S/E/W
    for (let gIdx = 0; gIdx < 4; gIdx++) {
      const ga = (gIdx * Math.PI) / 2;
      const gx = cx + Math.cos(ga) * palisadeR;
      const gz = cz + Math.sin(ga) * palisadeR;
      const gy = Math.max(2.2, getGroundHeightAt(gx, gz));
      const archGrp = new THREE.Group();
      archGrp.position.set(gx, gy, gz);
      archGrp.rotation.y = -ga + Math.PI / 2;
      const postGeo = new THREE.BoxGeometry(1.1, 6.2, 1.1);
      const lintelGeo = new THREE.BoxGeometry(15.2, 1.1, 1.3);
      const pL = new THREE.Mesh(postGeo, darkTimberMat);
      pL.position.set(-7.1, 3.1, 0);
      const pR = new THREE.Mesh(postGeo, darkTimberMat);
      pR.position.set(7.1, 3.1, 0);
      const lintel = new THREE.Mesh(lintelGeo, tribalWoodMat);
      lintel.position.set(0, 6.0, 0);
      const flGeo = new THREE.ConeGeometry(0.45, 1.1, 5);
      const fL = new THREE.Mesh(flGeo, torchFlameMat);
      fL.position.set(-7.1, 6.6, 0);
      const fR = new THREE.Mesh(flGeo, torchFlameMat);
      fR.position.set(7.1, 6.6, 0);
      archGrp.add(pL, pR, lintel, fL, fR);
      group.add(archGrp);
      disposables.push(postGeo, lintelGeo, flGeo);
      addRotatedWallBoxes(gx, gy, gz, -ga + Math.PI / 2, -7.1, 3.1, 0, 1.2, 6.2, 1.2, 1, 'wall');
      addRotatedWallBoxes(gx, gy, gz, -ga + Math.PI / 2, 7.1, 3.1, 0, 1.2, 6.2, 1.2, 1, 'wall');
    }

    // B. 4 Walkable Tribal Watchtowers flanking the Palisade Interior
    const towerAngles = [0.32, Math.PI / 2 + 0.32, Math.PI + 0.32, -Math.PI / 2 + 0.32];
    towerAngles.forEach((ta, tIdx) => {
      const txp = cx + Math.cos(ta) * 47;
      const tzp = cz + Math.sin(ta) * 47;
      const ty = Math.max(2.2, getGroundHeightAt(txp, tzp));
      const deckH = 4.4;
      const tGrp = new THREE.Group();
      tGrp.position.set(txp, ty, tzp);
      const legGeo = new THREE.BoxGeometry(0.55, deckH, 0.55);
      for (const lx of [-1.8, 1.8]) {
        for (const lz of [-1.8, 1.8]) {
          const leg = new THREE.Mesh(legGeo, darkTimberMat);
          leg.position.set(lx, deckH * 0.5, lz);
          leg.castShadow = true;
          tGrp.add(leg);
        }
      }
      const deckGeo = new THREE.BoxGeometry(4.8, 0.36, 4.8);
      const deck = new THREE.Mesh(deckGeo, tribalWoodMat);
      deck.position.set(0, deckH, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      const roofGeo = new THREE.ConeGeometry(4.1, 2.2, 4);
      const roof = new THREE.Mesh(roofGeo, thatchMat);
      roof.position.set(0, deckH + 3.4, 0);
      roof.rotation.y = Math.PI / 4;
      tGrp.add(deck, roof);
      group.add(tGrp);
      disposables.push(legGeo, deckGeo, roofGeo);
      addBoxCollider(txp, ty + deckH, tzp, 4.8, 0.36, 4.8, 'floor');

      // Walkable Sloped Ladder Ramp up onto Watchtower Deck
      const rampZ = tzp + 4.4;
      const rampGeo = new THREE.BoxGeometry(2.1, 0.28, 6.2);
      const rampMesh = new THREE.Mesh(rampGeo, tribalWoodMat);
      rampMesh.position.set(txp, ty + deckH * 0.5, rampZ);
      rampMesh.rotation.x = Math.atan2(deckH, 4.5);
      rampMesh.castShadow = true;
      group.add(rampMesh);
      disposables.push(rampGeo);
      colliders.push({
        minX: txp - 1.1,
        maxX: txp + 1.1,
        minY: ty - 0.2,
        maxY: ty + deckH,
        minZ: rampZ - 2.3,
        maxZ: rampZ + 2.3,
        kind: 'ramp',
        slopeAxis: 'z',
        slopeDir: -1,
      });

      if (tIdx % 2 === 0) {
        extraPickupPoints.push(new THREE.Vector3(txp, ty + deckH + 0.65, tzp));
      }
    });

    // C. Chief's Grand Longhouse (North-Center of Village Plaza: cx, cz - 24)
    {
      const lx = cx;
      const lz = cz - 24;
      const ly = Math.max(2.4, getGroundHeightAt(lx, lz));
      const lGrp = new THREE.Group();
      lGrp.position.set(lx, ly, lz);
      const backW = new THREE.Mesh(new THREE.BoxGeometry(12.8, 4.2, 0.9), mudMat);
      backW.position.set(0, 2.1, -4.6);
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 9.8), mudMat);
      sideL.position.set(-6.0, 2.1, 0);
      const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 9.8), mudMat);
      sideR.position.set(6.0, 2.1, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 4.2, 4), thatchMat);
      roof.position.set(0, 6.2, 0);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      const rug = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 5.2), hideRugMat);
      rug.position.set(0, 0.08, 0);
      lGrp.add(backW, sideL, sideR, roof, rug);
      group.add(lGrp);
      disposables.push(backW.geometry, sideL.geometry, sideR.geometry, roof.geometry, rug.geometry);

      addBoxCollider(lx, ly + 2.1, lz - 4.6, 12.8, 4.2, 1.0, 'wall');
      addBoxCollider(lx - 6.0, ly + 2.1, lz, 1.0, 4.2, 9.8, 'wall');
      addBoxCollider(lx + 6.0, ly + 2.1, lz, 1.0, 4.2, 9.8, 'wall');
      addBoxCollider(lx, ly + 5.2, lz, 12.2, 1.4, 9.2, 'wall');
      extraPickupPoints.push(new THREE.Vector3(lx, ly + 0.65, lz));
    }

    // D. 7 Circular Mud & Thatch Tribal Huts in Inner Village Ring
    const hutSpots: Array<[number, number, number]> = [
      [cx - 32, cz - 14, 0.7],
      [cx + 32, cz - 14, -0.7],
      [cx - 34, cz + 14, 1.3],
      [cx + 34, cz + 14, -1.3],
      [cx - 18, cz + 32, 2.5],
      [cx + 18, cz + 32, -2.5],
      [cx - 26, cz - 32, 0.4],
    ];
    hutSpots.forEach(([hx, hz, rotY], idx) => {
      const hy = Math.max(2.2, getGroundHeightAt(hx, hz));
      const hGrp = new THREE.Group();
      hGrp.position.set(hx, hy, hz);
      hGrp.rotation.y = rotY;
      const backW = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.1, 0.75), mudMat);
      backW.position.set(0, 1.55, -2.5);
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.1, 5.4), mudMat);
      sideL.position.set(-2.6, 1.55, 0);
      const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.1, 5.4), mudMat);
      sideR.position.set(2.6, 1.55, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.7, 8), thatchMat);
      roof.position.set(0, 4.2, 0);
      roof.castShadow = true;
      hGrp.add(backW, sideL, sideR, roof);
      group.add(hGrp);
      disposables.push(backW.geometry, sideL.geometry, sideR.geometry, roof.geometry);

      const sinR = Math.sin(rotY);
      const cosR = Math.cos(rotY);
      const toW = (lx: number, lz: number) => ({
        x: hx + lx * cosR + lz * sinR,
        z: hz - lx * sinR + lz * cosR,
      });
      const bPos = toW(0, -2.5);
      const lPos = toW(-2.6, 0);
      const rPos = toW(2.6, 0);
      addBoxCollider(bPos.x, hy + 1.55, bPos.z, 3.8, 3.1, 1.6, 'wall');
      addBoxCollider(lPos.x, hy + 1.55, lPos.z, 1.4, 3.1, 3.6, 'wall');
      addBoxCollider(rPos.x, hy + 1.55, rPos.z, 1.4, 3.1, 3.6, 'wall');

      if (idx % 2 === 0) {
        extraPickupPoints.push(new THREE.Vector3(hx, hy + 0.65, hz));
      }
    });

    // E. 3 Ceremonial Blazing Campfires (Central Grand Fire + 2 Side Fires) + War Drums
    const fireSpots: Array<[number, number, number]> = [
      [villageFireCenter.x, villageFireCenter.z, 1.35],
      [cx - 20, cz - 4, 1.0],
      [cx + 20, cz - 4, 1.0],
    ];
    fireSpots.forEach(([fx, fz, scale], fIdx) => {
      const fy = Math.max(2.2, getGroundHeightAt(fx, fz));
      campfires.push({ x: fx, y: fy, z: fz, radius: 7.5 * scale });

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const stGeo = new THREE.DodecahedronGeometry(0.35 * scale, 0);
        const st = new THREE.Mesh(stGeo, stoneCaveMat);
        st.position.set(fx + Math.cos(a) * 1.25 * scale, fy + 0.22, fz + Math.sin(a) * 1.25 * scale);
        group.add(st);
        disposables.push(stGeo);
      }
      const logGeo = new THREE.BoxGeometry(1.9 * scale, 0.28, 0.32);
      const log1 = new THREE.Mesh(logGeo, tribalWoodMat);
      log1.position.set(fx, fy + 0.18, fz);
      log1.rotation.y = 0.5;
      const log2 = new THREE.Mesh(logGeo, tribalWoodMat);
      log2.position.set(fx, fy + 0.24, fz);
      log2.rotation.y = -0.7;
      const flameGeo = new THREE.ConeGeometry(0.75 * scale, 2.0 * scale, 5);
      const flame = new THREE.Mesh(flameGeo, torchFlameMat);
      flame.position.set(fx, fy + 1.0 * scale, fz);
      group.add(log1, log2, flame);
      disposables.push(logGeo, flameGeo);

      if (fIdx === 0) {
        // War Drums around Central Ceremonial Fire
        for (let d = 0; d < 4; d++) {
          const da = (d / 4) * Math.PI * 2 + 0.4;
          const dxp = fx + Math.cos(da) * 5.2;
          const dzp = fz + Math.sin(da) * 5.2;
          const drGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.95, 8);
          const drTopGeo = new THREE.CylinderGeometry(0.57, 0.57, 0.12, 8);
          const dr = new THREE.Mesh(drGeo, darkTimberMat);
          dr.position.set(dxp, fy + 0.48, dzp);
          const drTop = new THREE.Mesh(drTopGeo, drumSkinMat);
          drTop.position.set(dxp, fy + 0.96, dzp);
          group.add(dr, drTop);
          disposables.push(drGeo, drTopGeo);
        }
      }

      animatedObjects.push((t) => {
        const flick = 1 + Math.sin(t * 14 + fx) * 0.18;
        flame.scale.set(0.9 + Math.cos(t * 11) * 0.12, flick, 0.9 + Math.sin(t * 9) * 0.12);
        flame.rotation.y = t * 2.5;
      });
    });

    // F. 4 Carved Totem Poles + West Coast Wooden Pier Dock facing Main Island
    for (const [txp, tzp] of [
      [cx - 12, cz + 14],
      [cx + 12, cz + 14],
      [cx - 12, cz - 14],
      [cx + 12, cz - 14],
    ]) {
      const ty = Math.max(2.2, getGroundHeightAt(txp, tzp));
      const poleGeo = new THREE.BoxGeometry(1.0, 6.2, 1.0);
      const wingGeo = new THREE.BoxGeometry(3.4, 0.7, 0.4);
      const pole = new THREE.Mesh(poleGeo, darkTimberMat);
      pole.position.set(txp, ty + 3.1, tzp);
      pole.castShadow = true;
      const wing = new THREE.Mesh(wingGeo, thatchMat);
      wing.position.set(txp, ty + 4.7, tzp);
      group.add(pole, wing);
      disposables.push(poleGeo, wingGeo);
      addBoxCollider(txp, ty + 3.1, tzp, 1.2, 6.2, 1.2, 'trunk');
    }

    // Tribal Wooden Dock on West Beach facing Main Island (x = cx - 216, z = cz)
    const dockX = cx - 216;
    const dockGeo = new THREE.BoxGeometry(20, 0.38, 4.6);
    const dockMesh = new THREE.Mesh(dockGeo, tribalWoodMat);
    dockMesh.position.set(dockX, waterLevel + 0.95, cz);
    dockMesh.castShadow = true;
    group.add(dockMesh);
    disposables.push(dockGeo);
    addBoxCollider(dockX, waterLevel + 0.95, cz, 20, 0.38, 4.6, 'floor');

    // G. 2 Enterable Stone Cliff Caves in Outer Tribal Cliffs
    const cliffCaveSpots: Array<[number, number, number]> = [
      [cx - 96, cz - 92, -Math.PI * 0.6],
      [cx + 76, cz + 92, Math.PI * 0.25],
    ];
    cliffCaveSpots.forEach(([cvx, cvz, cyaw]) => {
      const cy = Math.max(0.8, getGroundHeightAt(cvx, cvz));
      const cGrp = new THREE.Group();
      cGrp.position.set(cvx, cy, cvz);
      cGrp.rotation.y = cyaw;
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.8, 10.5), stoneCaveMat);
      wallL.position.set(-4.5, 2.4, 0);
      const wallR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.8, 10.5), stoneCaveMat);
      wallR.position.set(4.5, 2.4, 0);
      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(10.8, 4.8, 1.8), stoneCaveMat);
      wallBack.position.set(0, 2.4, -4.5);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.8, 11.4), stoneCaveMat);
      roof.position.set(0, 5.2, 0);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 4.6), hideRugMat);
      rug.position.set(0, 0.08, -0.5);
      const torchL = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 5), torchFlameMat);
      torchL.position.set(-3.3, 2.4, 2.2);
      const torchR = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 5), torchFlameMat);
      torchR.position.set(3.3, 2.4, 2.2);
      const paint = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 0.14), thatchMat);
      paint.position.set(0, 2.4, -3.52);

      cGrp.add(wallL, wallR, wallBack, roof, rug, torchL, torchR, paint);
      group.add(cGrp);
      disposables.push(
        wallL.geometry,
        wallR.geometry,
        wallBack.geometry,
        roof.geometry,
        rug.geometry,
        torchL.geometry,
        torchR.geometry,
        paint.geometry
      );

      addRotatedWallBoxes(cvx, cy, cvz, cyaw, -4.5, 2.4, 0, 1.8, 4.8, 10.5, 4, 'wall');
      addRotatedWallBoxes(cvx, cy, cvz, cyaw, 4.5, 2.4, 0, 1.8, 4.8, 10.5, 4, 'wall');
      addRotatedWallBoxes(cvx, cy, cvz, cyaw, 0, 2.4, -4.5, 10.8, 4.8, 1.8, 4, 'wall');
      addBoxCollider(cvx, cy + 0.04, cvz, 9.6, 0.24, 9.6, 'floor');
      addBoxCollider(cvx, cy + 5.2, cvz, 10.5, 1.6, 10.5, 'wall');
      extraPickupPoints.push(new THREE.Vector3(cvx, cy + 0.65, cvz));
    });

    // H. Outer Jungle Swamp Water Surface, Mossy Logs & Stepping Pads
    {
      const swY = arenaId === 'sky_island' ? 0.05 : -0.14;
      const swampMat = new THREE.MeshStandardMaterial({
        color: isSnow ? 0x38bdf8 : 0x115e59,
        emissive: 0x064e3b,
        emissiveIntensity: 0.25,
        roughness: 0.22,
        transparent: true,
        opacity: 0.82,
      });
      const lilyMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 });
      const swDiscGeo = new THREE.CylinderGeometry(24, 24, 0.14, 28);
      const swDisc = new THREE.Mesh(swDiscGeo, swampMat);
      swDisc.position.set(TRIBAL_SWAMP_CENTER.x, swY, TRIBAL_SWAMP_CENTER.z);
      group.add(swDisc);
      disposables.push(swDiscGeo, swampMat, lilyMat);

      for (let l = 0; l < 8; l++) {
        const la = (l / 8) * Math.PI * 2;
        const lr = 7 + (l % 3) * 5;
        const lx = TRIBAL_SWAMP_CENTER.x + Math.cos(la) * lr;
        const lz = TRIBAL_SWAMP_CENTER.z + Math.sin(la) * lr;
        const pGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.16, 10);
        const pad = new THREE.Mesh(pGeo, lilyMat);
        pad.position.set(lx, swY + 0.08, lz);
        group.add(pad);
        disposables.push(pGeo);
        addBoxCollider(lx, swY + 0.08, lz, 2.8, 0.22, 2.8, 'floor');
      }
      // Fallen Mossy Crossing Log across Swamp
      const logGeo = new THREE.CylinderGeometry(0.65, 0.72, 16, 8);
      logGeo.rotateZ(Math.PI / 2);
      const crossLog = new THREE.Mesh(logGeo, darkTimberMat);
      crossLog.position.set(TRIBAL_SWAMP_CENTER.x, swY + 0.55, TRIBAL_SWAMP_CENTER.z);
      crossLog.castShadow = true;
      group.add(crossLog);
      disposables.push(logGeo);
      addBoxCollider(TRIBAL_SWAMP_CENTER.x, swY + 0.55, TRIBAL_SWAMP_CENTER.z, 16, 1.1, 1.4, 'floor');
    }

    // I. Active Volcano Molten Crater, Lava River & Crossing Bridge in East Outer Wild Ring
    const craterLavaGeo = new THREE.CylinderGeometry(8.5, 7.0, 0.6, 18);
    const craterLava = new THREE.Mesh(craterLavaGeo, lavaMat);
    craterLava.position.set(VOLCANO_CENTER.x, 20.6, VOLCANO_CENTER.z);
    group.add(craterLava);
    disposables.push(craterLavaGeo);
    lavaZones.push({ x: VOLCANO_CENTER.x, z: VOLCANO_CENTER.z, radius: 9.2, yThreshold: 22.0 });

    const riverOffsets: Array<[number, number, number, number]> = [
      [-11, 16.5, 14, 4.2],
      [-18, 12.0, 17, 4.2],
      [-25, 7.6, 18, 4.5],
      [-33, 3.8, 18, 4.5],
      [-41, 1.6, 18, 4.5],
    ];
    riverOffsets.forEach(([ox, ly, oz, rad]) => {
      const lx = VOLCANO_CENTER.x + ox;
      const lz = VOLCANO_CENTER.z + oz;
      const segGeo = new THREE.BoxGeometry(8.8, 0.55, 5.2);
      const segMesh = new THREE.Mesh(segGeo, lavaMat);
      segMesh.position.set(lx, ly, lz);
      segMesh.rotation.z = 0.34;
      group.add(segMesh);
      disposables.push(segGeo);
      lavaZones.push({ x: lx, z: lz, radius: rad, yThreshold: ly + 1.2 });
    });

    const bridgeX = VOLCANO_CENTER.x - 37;
    const bridgeZ = VOLCANO_CENTER.z + 18;
    const lavaBridgeGeo = new THREE.BoxGeometry(3.4, 0.35, 9.8);
    const lavaBridge = new THREE.Mesh(lavaBridgeGeo, tribalWoodMat);
    lavaBridge.position.set(bridgeX, 3.6, bridgeZ);
    lavaBridge.castShadow = true;
    group.add(lavaBridge);
    disposables.push(lavaBridgeGeo);
    addBoxCollider(bridgeX, 3.6, bridgeZ, 3.4, 0.35, 9.8, 'floor');

    extraPickupPoints.push(
      new THREE.Vector3(VOLCANO_CENTER.x - 11.5, 26.8, VOLCANO_CENTER.z),
      new THREE.Vector3(VOLCANO_CENTER.x + 11.0, 26.8, VOLCANO_CENTER.z + 2)
    );

    // Animated Volcano Ash Plume Column
    const plumeGeo = new THREE.DodecahedronGeometry(3.6, 0);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.42,
    });
    const plumes: THREE.Mesh[] = [];
    for (let p = 0; p < 4; p++) {
      const m = new THREE.Mesh(plumeGeo, plumeMat);
      m.position.set(VOLCANO_CENTER.x, 23 + p * 6, VOLCANO_CENTER.z);
      group.add(m);
      plumes.push(m);
    }
    disposables.push(plumeGeo, plumeMat);
    animatedObjects.push((t) => {
      for (let p = 0; p < plumes.length; p++) {
        const phase = (t * 0.32 + p * 0.25) % 1;
        plumes[p].position.set(
          VOLCANO_CENTER.x + Math.sin(t * 0.8 + p) * (1.2 + phase * 3.5),
          22 + phase * 24,
          VOLCANO_CENTER.z + Math.cos(t * 0.7 + p) * (1.2 + phase * 3.5)
        );
        const s = 0.7 + phase * 1.4;
        plumes[p].scale.set(s, s * 0.8, s);
      }
    });

    // J. LUSH OUTER JUNGLE FOLIAGE (60 FPS InstancedMesh)
    // Helper to sample valid dry outer-jungle positions avoiding village, volcano & swamp
    const isOuterJungleValid = (x: number, z: number, minR = 68, maxR = 198): boolean => {
      const dV = Math.hypot(x - cx, z - cz);
      if (dV < minR || dV > maxR) return false;
      if (Math.hypot(x - VOLCANO_CENTER.x, z - VOLCANO_CENTER.z) < 46) return false;
      if (Math.hypot(x - TRIBAL_SWAMP_CENTER.x, z - TRIBAL_SWAMP_CENTER.z) < 27) return false;
      for (const cv of cliffCaveSpots) {
        if (Math.hypot(x - cv[0], z - cv[1]) < 11) return false;
      }
      return getGroundHeightAt(x, z) > 0.35;
    };

    const dummy = new THREE.Object3D();

    // 1) Towering Banyan Trees with Hanging Aerial Roots
    const banyanSpots: Array<{ x: number; y: number; z: number; sc: number }> = [];
    for (let i = 0; i < 360 && banyanSpots.length < 48; i++) {
      const a = rng() * Math.PI * 2;
      const r = 72 + rng() * 116;
      const txp = cx + Math.cos(a) * r;
      const tzp = cz + Math.sin(a) * r;
      if (!isOuterJungleValid(txp, tzp)) continue;
      banyanSpots.push({ x: txp, y: getGroundHeightAt(txp, tzp), z: tzp, sc: 0.9 + rng() * 0.55 });
    }
    if (banyanSpots.length > 0) {
      const bTrunkGeo = new THREE.CylinderGeometry(0.85, 1.35, 6.2, 7);
      const bCanopyGeo = new THREE.BoxGeometry(7.2, 2.8, 7.2);
      const bRootGeo = new THREE.CylinderGeometry(0.09, 0.06, 4.6, 5);
      const bTrunks = new THREE.InstancedMesh(bTrunkGeo, darkTimberMat, banyanSpots.length);
      const bCanopies = new THREE.InstancedMesh(bCanopyGeo, leafJungleMat, banyanSpots.length);
      const bRoots = new THREE.InstancedMesh(bRootGeo, tribalWoodMat, banyanSpots.length * 4);
      bTrunks.castShadow = true;
      bCanopies.castShadow = true;
      let rIdx = 0;
      banyanSpots.forEach((b, idx) => {
        dummy.position.set(b.x, b.y + 3.1 * b.sc, b.z);
        dummy.rotation.set(0, idx * 0.9, 0);
        dummy.scale.setScalar(b.sc);
        dummy.updateMatrix();
        bTrunks.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(b.x, b.y + 6.4 * b.sc, b.z);
        dummy.scale.set(b.sc, b.sc * 0.95, b.sc);
        dummy.updateMatrix();
        bCanopies.setMatrixAt(idx, dummy.matrix);
        addBoxCollider(b.x, b.y + 3.0 * b.sc, b.z, 1.8 * b.sc, 6.0 * b.sc, 1.8 * b.sc, 'trunk');

        for (let k = 0; k < 4; k++) {
          const ra = (k / 4) * Math.PI * 2 + idx;
          const rx = b.x + Math.cos(ra) * 2.5 * b.sc;
          const rz = b.z + Math.sin(ra) * 2.5 * b.sc;
          dummy.position.set(rx, b.y + 2.8 * b.sc, rz);
          dummy.rotation.set(0, 0, (k % 2 === 0 ? 1 : -1) * 0.05);
          dummy.scale.setScalar(b.sc);
          dummy.updateMatrix();
          bRoots.setMatrixAt(rIdx++, dummy.matrix);
        }
      });
      bTrunks.instanceMatrix.needsUpdate = true;
      bCanopies.instanceMatrix.needsUpdate = true;
      bRoots.instanceMatrix.needsUpdate = true;
      bTrunks.computeBoundingSphere();
      bCanopies.computeBoundingSphere();
      bRoots.computeBoundingSphere();
      group.add(bTrunks, bCanopies, bRoots);
      disposables.push(bTrunkGeo, bCanopyGeo, bRootGeo);
    }

    // 2) Tropical Coconut Palms & Bamboo Clusters & Ferns & Glowing Mushrooms
    const palmSpots: Array<{ x: number; y: number; z: number; sc: number; rot: number }> = [];
    for (let i = 0; i < 320 && palmSpots.length < 56; i++) {
      const a = rng() * Math.PI * 2;
      const r = 74 + rng() * 124;
      const txp = cx + Math.cos(a) * r;
      const tzp = cz + Math.sin(a) * r;
      if (!isOuterJungleValid(txp, tzp, 70, 204)) continue;
      palmSpots.push({ x: txp, y: getGroundHeightAt(txp, tzp), z: tzp, sc: 0.9 + rng() * 0.45, rot: rng() * Math.PI * 2 });
    }
    if (palmSpots.length > 0) {
      const pTrunkGeo = new THREE.CylinderGeometry(0.32, 0.55, 6.4, 6);
      const pCrownGeo = new THREE.ConeGeometry(3.4, 1.5, 7);
      const pTrunks = new THREE.InstancedMesh(pTrunkGeo, tribalWoodMat, palmSpots.length);
      const pCrowns = new THREE.InstancedMesh(pCrownGeo, canopyLightMat, palmSpots.length);
      pTrunks.castShadow = true;
      pCrowns.castShadow = true;
      palmSpots.forEach((p, idx) => {
        dummy.position.set(p.x, p.y + 3.1 * p.sc, p.z);
        dummy.rotation.set(0.08, p.rot, 0.06);
        dummy.scale.setScalar(p.sc);
        dummy.updateMatrix();
        pTrunks.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(p.x + 0.35 * p.sc, p.y + 6.3 * p.sc, p.z + 0.25 * p.sc);
        dummy.rotation.set(0, p.rot, 0);
        dummy.updateMatrix();
        pCrowns.setMatrixAt(idx, dummy.matrix);
        addBoxCollider(p.x, p.y + 3.0 * p.sc, p.z, 0.9 * p.sc, 6.0 * p.sc, 0.9 * p.sc, 'trunk');
      });
      pTrunks.instanceMatrix.needsUpdate = true;
      pCrowns.instanceMatrix.needsUpdate = true;
      pTrunks.computeBoundingSphere();
      pCrowns.computeBoundingSphere();
      group.add(pTrunks, pCrowns);
      disposables.push(pTrunkGeo, pCrownGeo);
    }

    // Bamboo Stalks (210 stalks across 70 clusters) + Giant Ferns (130) + Glowing Mushrooms (60)
    const bambooGeo = new THREE.CylinderGeometry(0.14, 0.18, 5.2, 5);
    const bambooInst = new THREE.InstancedMesh(bambooGeo, bambooMat, 210);
    let bamIdx = 0;
    for (let i = 0; i < 200 && bamIdx < 207; i++) {
      const a = rng() * Math.PI * 2;
      const r = 68 + rng() * 118;
      const bx = cx + Math.cos(a) * r;
      const bz = cz + Math.sin(a) * r;
      if (!isOuterJungleValid(bx, bz)) continue;
      const by = getGroundHeightAt(bx, bz);
      for (let s = 0; s < 3; s++) {
        const sc = 0.8 + rng() * 0.65;
        dummy.position.set(bx + (rng() - 0.5) * 1.4, by + 2.5 * sc, bz + (rng() - 0.5) * 1.4);
        dummy.rotation.set((rng() - 0.5) * 0.14, rng() * Math.PI, (rng() - 0.5) * 0.14);
        dummy.scale.set(1, sc, 1);
        dummy.updateMatrix();
        bambooInst.setMatrixAt(bamIdx++, dummy.matrix);
      }
    }
    bambooInst.count = bamIdx;
    bambooInst.instanceMatrix.needsUpdate = true;
    bambooInst.computeBoundingSphere();
    group.add(bambooInst);
    disposables.push(bambooGeo);

    const fernGeo = new THREE.ConeGeometry(1.45, 0.95, 5);
    const fernInst = new THREE.InstancedMesh(fernGeo, canopyLightMat, 130);
    let fIdx = 0;
    for (let i = 0; i < 280 && fIdx < 130; i++) {
      const a = rng() * Math.PI * 2;
      const r = 64 + rng() * 124;
      const fx = cx + Math.cos(a) * r;
      const fz = cz + Math.sin(a) * r;
      if (!isOuterJungleValid(fx, fz, 64, 194)) continue;
      const fy = getGroundHeightAt(fx, fz);
      const sc = 0.8 + rng() * 0.8;
      dummy.position.set(fx, fy + 0.4 * sc, fz);
      dummy.rotation.set(Math.PI, rng() * Math.PI, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      fernInst.setMatrixAt(fIdx++, dummy.matrix);
    }
    fernInst.count = fIdx;
    fernInst.instanceMatrix.needsUpdate = true;
    fernInst.computeBoundingSphere();
    group.add(fernInst);
    disposables.push(fernGeo);

    const mushGeo = new THREE.CylinderGeometry(0.42, 0.18, 0.62, 6);
    const mushInst = new THREE.InstancedMesh(mushGeo, mushroomCapMat, 60);
    let mIdx = 0;
    for (let i = 0; i < 180 && mIdx < 60; i++) {
      const a = rng() * Math.PI * 2;
      const r = i < 30 ? 25 + rng() * 12 : 70 + rng() * 100;
      const mx = i < 30 ? TRIBAL_SWAMP_CENTER.x + Math.cos(a) * r : cx + Math.cos(a) * r;
      const mz = i < 30 ? TRIBAL_SWAMP_CENTER.z + Math.sin(a) * r : cz + Math.sin(a) * r;
      const my = getGroundHeightAt(mx, mz);
      if (my < 0.25) continue;
      const sc = 0.75 + rng() * 0.65;
      dummy.position.set(mx, my + 0.3 * sc, mz);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      mushInst.setMatrixAt(mIdx++, dummy.matrix);
    }
    mushInst.count = mIdx;
    mushInst.instanceMatrix.needsUpdate = true;
    mushInst.computeBoundingSphere();
    group.add(mushInst);
    disposables.push(mushGeo);

    // K. INTERACTIVE FRUIT TREES & HARVESTABLE 3D FRUITS (Mangoes, Bananas, Coconuts, Berries)
    //    Walk near to eat [E] / EAT OR shoot down from high branches!
    const fruitColorMap: Record<FruitKind, number> = {
      mango: 0xf97316,
      banana: 0xfacc15,
      coconut: 0x78350f,
      berry: 0xe11d48,
    };
    const fKinds: FruitKind[] = ['mango', 'banana', 'coconut', 'berry'];
    const fTrunkGeo = new THREE.BoxGeometry(0.75, 3.8, 0.75);
    const fCanopyGeo = new THREE.BoxGeometry(3.8, 2.2, 3.8);
    const fruitTreeCount = 24;
    const fTrunks = new THREE.InstancedMesh(fTrunkGeo, tribalWoodMat, fruitTreeCount);
    const fCanopies = new THREE.InstancedMesh(fCanopyGeo, canopyLightMat, fruitTreeCount);
    let ftIdx = 0;
    const fruitTreeAnchors: Array<{ x: number; y: number; z: number; kind: FruitKind }> = [];

    for (let i = 0; i < 240 && ftIdx < fruitTreeCount; i++) {
      const a = (i / 24) * Math.PI * 2 + rng() * 0.22;
      const r = 70 + rng() * 115;
      const txp = cx + Math.cos(a) * r;
      const tzp = cz + Math.sin(a) * r;
      if (!isOuterJungleValid(txp, tzp, 66, 195)) continue;
      const ty = getGroundHeightAt(txp, tzp);
      const kind = fKinds[ftIdx % fKinds.length];
      fruitTreeAnchors.push({ x: txp, y: ty, z: tzp, kind });

      if (kind !== 'berry') {
        dummy.position.set(txp, ty + 1.9, tzp);
        dummy.rotation.set(0, rng() * Math.PI, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        fTrunks.setMatrixAt(ftIdx, dummy.matrix);
        dummy.position.set(txp, ty + 4.4, tzp);
        dummy.updateMatrix();
        fCanopies.setMatrixAt(ftIdx, dummy.matrix);
        addBoxCollider(txp, ty + 1.9, tzp, 0.85, 3.8, 0.85, 'trunk');
      } else {
        // Low lush berry bush
        dummy.position.set(txp, ty + 0.1, tzp);
        dummy.rotation.set(0, rng() * Math.PI, 0);
        dummy.scale.set(0.3, 0.1, 0.3);
        dummy.updateMatrix();
        fTrunks.setMatrixAt(ftIdx, dummy.matrix);
        dummy.position.set(txp, ty + 0.9, tzp);
        dummy.scale.set(0.75, 0.7, 0.75);
        dummy.updateMatrix();
        fCanopies.setMatrixAt(ftIdx, dummy.matrix);
      }

      // 3 visible harvestable 3D fruits per tree/bush
      for (let f = 0; f < 3; f++) {
        const fa = (f / 3) * Math.PI * 2 + rng() * 0.5;
        const fr = kind === 'berry' ? 1.15 : 1.55;
        const fx = txp + Math.cos(fa) * fr;
        const fz = tzp + Math.sin(fa) * fr;
        const fgY = Math.max(0.15, getGroundHeightAt(fx, fz));
        const fy = kind === 'berry' ? fgY + 0.85 : ty + 3.25;
        fruitNodes.push({
          index: fruitNodes.length,
          id: `fruit_${ftIdx}_${f}`,
          kind,
          x: fx,
          y: fy,
          z: fz,
          baseY: fy,
          groundY: fgY + 0.35,
          fallen: kind === 'berry',
          active: true,
          respawnTimer: 0,
          radius: 0.42,
          colorHex: fruitColorMap[kind],
        });
      }
      ftIdx += 1;
    }
    fTrunks.count = ftIdx;
    fCanopies.count = ftIdx;
    fTrunks.instanceMatrix.needsUpdate = true;
    fCanopies.instanceMatrix.needsUpdate = true;
    fTrunks.computeBoundingSphere();
    fCanopies.computeBoundingSphere();
    group.add(fTrunks, fCanopies);
    disposables.push(fTrunkGeo, fCanopyGeo);

    if (fruitNodes.length > 0) {
      const fruitGeo = new THREE.DodecahedronGeometry(0.32, 0);
      const fruitMat = new THREE.MeshStandardMaterial({ roughness: 0.35, emissive: 0x221100, emissiveIntensity: 0.2 });
      const fruitInst = new THREE.InstancedMesh(fruitGeo, fruitMat, fruitNodes.length);
      fruitInst.frustumCulled = false;
      const fCol = new THREE.Color();
      const fDummy = new THREE.Object3D();

      const syncOneFruit = (idx: number) => {
        const fn = fruitNodes[idx];
        if (!fn) return;
        if (!fn.active) {
          fDummy.position.set(fn.x, -50, fn.z);
          fDummy.scale.setScalar(0.001);
        } else {
          fDummy.position.set(fn.x, fn.y, fn.z);
          fDummy.rotation.set(0, idx * 0.7, 0);
          fDummy.scale.set(
            fn.kind === 'banana' ? 0.65 : 1.0,
            fn.kind === 'banana' ? 1.45 : 1.0,
            fn.kind === 'banana' ? 0.65 : 1.0
          );
        }
        fDummy.updateMatrix();
        fruitInst.setMatrixAt(idx, fDummy.matrix);
        fruitInst.instanceMatrix.needsUpdate = true;
      };

      fruitNodes.forEach((fn, idx) => {
        fruitInst.setColorAt(idx, fCol.setHex(fn.colorHex));
        syncOneFruit(idx);
      });
      if (fruitInst.instanceColor) fruitInst.instanceColor.needsUpdate = true;
      fruitInst.computeBoundingSphere();
      group.add(fruitInst);
      disposables.push(fruitGeo, fruitMat);
      updateFruitVisual = syncOneFruit;
    }

    // L. 10 Hanging Breakable Wasp Nests in Jungle Trees
    const nestGeo = new THREE.ConeGeometry(0.62, 1.05, 7);
    nestGeo.rotateX(Math.PI);
    for (let i = 0; i < Math.min(10, banyanSpots.length); i++) {
      const b = banyanSpots[(i * 4) % banyanSpots.length];
      const nx = b.x + 2.3;
      const nz = b.z + 1.8;
      const ny = b.y + 4.4;
      const mesh = new THREE.Mesh(nestGeo, nestMat);
      mesh.position.set(nx, ny, nz);
      mesh.castShadow = true;
      group.add(mesh);
      waspNests.push({
        id: `wasp_nest_${i}`,
        x: nx,
        y: ny,
        z: nz,
        baseX: nx,
        baseY: ny,
        baseZ: nz,
        active: true,
        fallen: false,
        vy: 0,
        respawnTimer: 0,
        mesh,
      });
    }
    disposables.push(nestGeo);

    // M. 60 FPS Animated Fireflies & Butterflies (Zero GC allocations in update loop)
    const fireflyCount = 120;
    const fireflyGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const fireflyMat = new THREE.MeshBasicMaterial({ color: 0xd9f99d });
    const fireflyInst = new THREE.InstancedMesh(fireflyGeo, fireflyMat, fireflyCount);
    fireflyInst.frustumCulled = false;
    const ffOrigins = new Float32Array(fireflyCount * 4); // x, y, z, phase
    for (let i = 0; i < fireflyCount; i++) {
      const a = rng() * Math.PI * 2;
      const isSwamp = i < 40;
      const r = isSwamp ? rng() * 26 : 64 + rng() * 125;
      const fx = isSwamp ? TRIBAL_SWAMP_CENTER.x + Math.cos(a) * r : cx + Math.cos(a) * r;
      const fz = isSwamp ? TRIBAL_SWAMP_CENTER.z + Math.sin(a) * r : cz + Math.sin(a) * r;
      const fy = Math.max(0.4, getGroundHeightAt(fx, fz)) + 1.1 + rng() * 2.4;
      ffOrigins[i * 4] = fx;
      ffOrigins[i * 4 + 1] = fy;
      ffOrigins[i * 4 + 2] = fz;
      ffOrigins[i * 4 + 3] = rng() * Math.PI * 2;
    }
    group.add(fireflyInst);
    disposables.push(fireflyGeo, fireflyMat);

    const bflyCount = 70;
    const bflyGeo = new THREE.BoxGeometry(0.32, 0.06, 0.22);
    const bflyMat = new THREE.MeshBasicMaterial();
    const bflyInst = new THREE.InstancedMesh(bflyGeo, bflyMat, bflyCount);
    bflyInst.frustumCulled = false;
    const bflyPalette = [0xf59e0b, 0x38bdf8, 0xf472b6, 0xa3e635, 0xfacc15];
    const bflyOrigins = new Float32Array(bflyCount * 4);
    const bCol = new THREE.Color();
    for (let i = 0; i < bflyCount; i++) {
      const anchor = fruitTreeAnchors[i % Math.max(1, fruitTreeAnchors.length)];
      const bx = (anchor ? anchor.x : cx) + (rng() - 0.5) * 8;
      const bz = (anchor ? anchor.z : cz) + (rng() - 0.5) * 8;
      const by = Math.max(0.6, getGroundHeightAt(bx, bz)) + 1.4 + rng() * 2.0;
      bflyOrigins[i * 4] = bx;
      bflyOrigins[i * 4 + 1] = by;
      bflyOrigins[i * 4 + 2] = bz;
      bflyOrigins[i * 4 + 3] = rng() * Math.PI * 2;
      bflyInst.setColorAt(i, bCol.setHex(bflyPalette[i % bflyPalette.length]));
    }
    if (bflyInst.instanceColor) bflyInst.instanceColor.needsUpdate = true;
    group.add(bflyInst);
    disposables.push(bflyGeo, bflyMat);

    const animDummy = new THREE.Object3D();
    animatedObjects.push((t) => {
      for (let i = 0; i < fireflyCount; i++) {
        const idx = i * 4;
        const ph = ffOrigins[idx + 3];
        animDummy.position.set(
          ffOrigins[idx] + Math.sin(t * 0.9 + ph) * 1.6,
          ffOrigins[idx + 1] + Math.sin(t * 2.2 + ph) * 0.65,
          ffOrigins[idx + 2] + Math.cos(t * 0.8 + ph) * 1.6
        );
        const blink = 0.65 + 0.55 * Math.sin(t * 4.5 + ph * 3);
        animDummy.rotation.set(0, t + ph, 0);
        animDummy.scale.setScalar(Math.max(0.2, blink));
        animDummy.updateMatrix();
        fireflyInst.setMatrixAt(i, animDummy.matrix);
      }
      fireflyInst.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < bflyCount; i++) {
        const idx = i * 4;
        const ph = bflyOrigins[idx + 3];
        const a = t * 1.4 + ph;
        animDummy.position.set(
          bflyOrigins[idx] + Math.cos(a) * 2.2,
          bflyOrigins[idx + 1] + Math.sin(t * 3.1 + ph) * 0.5,
          bflyOrigins[idx + 2] + Math.sin(a) * 2.2
        );
        animDummy.rotation.set(0, -a, 0);
        const wingFlap = 0.45 + Math.abs(Math.sin(t * 16 + ph)) * 0.95;
        animDummy.scale.set(wingFlap, 1, 1);
        animDummy.updateMatrix();
        bflyInst.setMatrixAt(i, animDummy.matrix);
      }
      bflyInst.instanceMatrix.needsUpdate = true;
    });
  }

  // =========================================================================
  // 5. RIDEABLE SEA CREATURE SPAWNS (Sharks, Whales, Sailfish, Sea Turtles, Manta Rays)
  // =========================================================================
  const marineMountSpawns: WorldExpansionResult['marineMountSpawns'] = [
    { x: 224, y: waterLevel, z: 22, yaw: -Math.PI * 0.35, kind: 'shark_mount' },
    { x: -215, y: waterLevel, z: 75, yaw: Math.PI * 0.65, kind: 'whale_mount' },
    { x: 215, y: waterLevel, z: -120, yaw: -Math.PI * 0.75, kind: 'sailfish_mount' },
    { x: -75, y: waterLevel, z: -220, yaw: Math.PI * 0.25, kind: 'shark_mount' },
    { x: 88, y: waterLevel, z: -222, yaw: -Math.PI * 0.4, kind: 'sailfish_mount' },
    { x: 254, y: waterLevel, z: -65, yaw: Math.PI, kind: 'whale_mount' },
    { x: 350, y: waterLevel, z: -265, yaw: -Math.PI * 0.2, kind: 'shark_mount' },
    // Giant Sea Turtles (beaches, bays & coral reefs)
    { x: 184, y: waterLevel, z: 112, yaw: -Math.PI * 0.6, kind: 'turtle_mount' },
    { x: -198, y: waterLevel, z: -48, yaw: Math.PI * 0.3, kind: 'turtle_mount' },
    { x: 310, y: waterLevel, z: 68, yaw: -Math.PI * 0.45, kind: 'turtle_mount' },
    { x: -125, y: waterLevel, z: -232, yaw: Math.PI * 0.85, kind: 'turtle_mount' },
    // Giant Ocean Manta Rays (deep bays, Titanic harbor & Tribal coast)
    { x: 145, y: waterLevel, z: -195, yaw: Math.PI * 0.15, kind: 'manta_mount' },
    { x: -165, y: waterLevel, z: 168, yaw: -Math.PI * 0.8, kind: 'manta_mount' },
    { x: 268, y: waterLevel, z: 120, yaw: Math.PI * 0.55, kind: 'manta_mount' },
    { x: 325, y: waterLevel, z: -145, yaw: -Math.PI * 0.25, kind: 'manta_mount' },
  ];

  return {
    campfires,
    lavaZones,
    tribalCampfireCenter: villageFireCenter,
    extraPickupPoints,
    shellSpawnPoints,
    marineMountSpawns,
    villagerCenters: [
      { x: cx - 18, y: 2.6, z: cz - 14 },
      { x: cx + 18, y: 2.6, z: cz - 14 },
      { x: cx - 22, y: 2.6, z: cz + 14 },
      { x: cx + 22, y: 2.6, z: cz + 14 },
      { x: cx, y: 2.6, z: cz - 38 },
      { x: cx - 44, y: 2.6, z: cz },
      { x: cx + 44, y: 2.6, z: cz },
      { x: cx, y: 2.6, z: cz + 44 },
      { x: cx - 72, y: 2.0, z: cz - 12 },
      { x: cx + 68, y: 2.0, z: cz + 16 },
    ],
    fruitNodes,
    updateFruitVisual,
    waspNests,
    wildlifeCenters: {
      tribal: { x: cx, z: cz },
      ponds: getInlandPonds(arenaId),
    },
  };
}
