import * as THREE from 'three';
import { ArenaId, GunId, RadarBuilding, VehicleKind } from './types';
import type { ArenaBoxCollider } from './arenas';

export const AIRPORT_ISLAND_CENTER = { x: -475, z: 25 };
export const AIRPORT_ISLAND_RADIUS = 190;
export const SEA_BRIDGE_Z = 32;
export const MISSILE_CONSOLE_POS = { x: -570, y: 0.4, z: -12 };
export const JAIL_CELL_POS = { x: -355, y: 0.4, z: 73 };
export const JAIL_RELEASE_POS = { x: -339, y: 0.4, z: 66 };

export interface DestructibleStructure {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  hp: number;
  maxHp: number;
  stage: 'intact' | 'damaged' | 'destroyed';
  rootGroup: THREE.Group;
  intactGroup: THREE.Group;
  damagedGroup: THREE.Group;
  destroyedGroup: THREE.Group;
  repairState: 'idle' | 'waiting' | 'repairing';
  waitTimer: number;
  repairProgress: number;
  crewGroup: THREE.Group;
  crewWorkers: THREE.Group[];
  sparkMesh: THREE.Mesh;
  smokeAccum: number;
}

export interface AirportGuardSpawn {
  x: number;
  y: number;
  z: number;
  yaw: number;
  role: 'police' | 'army';
  gunId: GunId;
  onWatchtower: boolean;
}

export interface AirportBuildResult {
  destructibleStructures: DestructibleStructure[];
  guardSpawns: AirportGuardSpawn[];
  vehicleSpawns: Array<{ x: number; y: number; z: number; yaw: number; kind: VehicleKind }>;
  pickupPoints: THREE.Vector3[];
  spawnPoints: THREE.Vector3[];
  radarBuildings: RadarBuilding[];
}

export function getAirportIslandCoastRadius(arenaId: ArenaId, angle: number): number {
  const base = arenaId === 'sky_island' ? 184 : AIRPORT_ISLAND_RADIUS;
  return base + Math.sin(angle * 3 - 0.4) * 7.5 + Math.cos(angle * 4) * 5.0;
}

export function getAirportIslandTerrainHeight(arenaId: ArenaId, x: number, z: number): number | null {
  const dx = x - AIRPORT_ISLAND_CENTER.x;
  const dz = z - AIRPORT_ISLAND_CENTER.z;
  const dist = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const coastR = getAirportIslandCoastRadius(arenaId, angle);

  if (dist > coastR + 24) return null;

  if (dist > coastR - 18) {
    const t = Math.max(0, Math.min(1, (dist - (coastR - 18)) / 42));
    const smooth = t * t * (3 - 2 * t);
    return 0.35 * (1 - smooth) + -5.4 * smooth;
  }

  // Flat tarmac & runway core, gently sloped outer perimeter hills
  const runwayFlat = Math.abs(dx) < 138 && Math.abs(dz) < 132;
  if (runwayFlat) return 0.35;

  const rim = Math.max(0, Math.min(1, (coastR - 20 - dist) / 26));
  const bump =
    (Math.sin(x * 0.05) * Math.cos(z * 0.045) * 0.75 + 0.5) *
    rim *
    Math.max(0, Math.min(1, (dist - 125) / 28));
  return 0.35 + Math.max(0, bump);
}

export function setDestructibleStage(
  s: DestructibleStructure,
  stage: 'intact' | 'damaged' | 'destroyed'
): void {
  s.stage = stage;
  s.intactGroup.visible = stage === 'intact';
  s.damagedGroup.visible = stage === 'damaged';
  s.destroyedGroup.visible = stage === 'destroyed';
}

export function updateConstructionCrewVisual(
  s: DestructibleStructure,
  time: number,
  dt: number
): void {
  const repairing = s.repairState === 'repairing';
  s.crewGroup.visible = repairing;
  if (!repairing) return;

  // Animate 3 construction workers hammering & welding around structure
  for (let i = 0; i < s.crewWorkers.length; i++) {
    const w = s.crewWorkers[i];
    const phase = time * 8 + i * 2.1;
    w.position.y = Math.abs(Math.sin(phase * 0.5)) * 0.14;
    const arm = w.children[3];
    if (arm) {
      arm.rotation.x = -0.7 + Math.sin(phase) * 0.65;
    }
  }

  // Flashing welding spark & rising repair pulse
  const pulse = 0.6 + Math.abs(Math.sin(time * 22)) * 1.1;
  s.sparkMesh.scale.setScalar(pulse);
  s.sparkMesh.rotation.y += dt * 12;
}

export function buildAirportIsland(opts: {
  group: THREE.Group;
  arenaId: ArenaId;
  waterLevel: number;
  getGroundHeightAt: (x: number, z: number) => number;
  colliders: ArenaBoxCollider[];
  animatedObjects: Array<(t: number, dt: number) => void>;
  disposables: Array<{ dispose: () => void }>;
}): AirportBuildResult {
  const { group, arenaId, getGroundHeightAt, colliders, animatedObjects, disposables } = opts;
  const cx = AIRPORT_ISLAND_CENTER.x;
  const cz = AIRPORT_ISLAND_CENTER.z;

  const destructibleStructures: DestructibleStructure[] = [];
  const guardSpawns: AirportGuardSpawn[] = [];
  const vehicleSpawns: AirportBuildResult['vehicleSpawns'] = [];
  const pickupPoints: THREE.Vector3[] = [];
  const spawnPoints: THREE.Vector3[] = [];
  const radarBuildings: RadarBuilding[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  const addBoxCol = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    kind: ArenaBoxCollider['kind'] = 'wall',
    slopeAxis?: 'x' | 'z',
    slopeDir?: 1 | -1
  ) => {
    colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minY: y - h * 0.5,
      maxY: y + h * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      kind,
      slopeAxis,
      slopeDir,
    });
  };

  // Shared materials for Airport Island & Sea Bridge
  const asphaltMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }));
  const runwayLineMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }));
  const concreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: arenaId === 'snowy' ? 0xdbeafe : arenaId === 'desert' ? 0xd6d3d1 : 0x94a3b8,
      roughness: 0.72,
    })
  );
  const darkSteelMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 }));
  const militaryMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.75 }));
  const hangarMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.25 }));
  const policeBlueMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 }));
  const whiteWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 }));
  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.42,
    })
  );
  const yellowAccentMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.28, roughness: 0.4 })
  );
  const cyanEmissiveMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.75, roughness: 0.3 })
  );
  const redEmissiveMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.85, roughness: 0.3 })
  );
  const greenEmissiveMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.8, roughness: 0.3 })
  );
  const rubbleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.92 }));
  const charredMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.88 }));

  // Helper: create Construction Crew sub-group for any destructible building
  const createConstructionCrew = (x: number, y: number, z: number, offsetZ: number) => {
    const crewGroup = new THREE.Group();
    crewGroup.position.set(x, y, z + offsetZ);
    crewGroup.visible = false;

    // Yellow-orange construction utility truck
    const truckChassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.9, 4.4)), yellowAccentMat);
    truckChassis.position.set(-4.2, 0.75, 0);
    const truckCab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 1.1, 1.5)), yellowAccentMat);
    truckCab.position.set(-4.2, 1.65, 1.2);
    const beacon = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.3, 0.5)), yellowAccentMat);
    beacon.position.set(-4.2, 2.35, 1.2);
    crewGroup.add(truckChassis, truckCab, beacon);

    const crewWorkers: THREE.Group[] = [];
    const workerOffsets = [
      [-1.4, -2.0],
      [1.8, -1.8],
      [0.4, -3.2],
    ];
    const suitMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7 }));
    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.6 }));
    for (let i = 0; i < workerOffsets.length; i++) {
      const [wx, wz] = workerOffsets[i];
      const w = new THREE.Group();
      w.position.set(wx, 0, wz);
      const legs = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.68, 0.36)), darkSteelMat);
      legs.position.y = 0.34;
      const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.72, 0.42)), suitMat);
      torso.position.y = 1.04;
      const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.52, 0.52)), skinMat);
      head.position.y = 1.68;
      const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.58, 0.22)), suitMat);
      arm.position.set(0.42, 1.22, 0.2);
      const helmet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.22, 0.62)), yellowAccentMat);
      helmet.position.y = 1.98;
      w.add(legs, torso, head, arm, helmet);
      crewGroup.add(w);
      crewWorkers.push(w);
    }

    const sparkMesh = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.45, 0)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xfef08a }))
    );
    sparkMesh.position.set(0.2, 1.7, -2.2);
    crewGroup.add(sparkMesh);

    group.add(crewGroup);
    return { crewGroup, crewWorkers, sparkMesh };
  };

  // Helper: register a building with intact, damaged & destroyed meshes + auto-repair crew
  const registerDestructible = (params: {
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
    maxHp: number;
    crewOffsetZ: number;
    buildIntact: (parent: THREE.Group) => void;
  }) => {
    const rootGroup = new THREE.Group();
    rootGroup.position.set(params.x, params.y, params.z);

    const intactGroup = new THREE.Group();
    params.buildIntact(intactGroup);

    // Damaged shell (charred tilted slab + cracked framing)
    const damagedGroup = new THREE.Group();
    const dBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(params.w * 0.94, params.h * 0.55, params.d * 0.94)), charredMat);
    dBase.position.y = params.h * 0.275;
    dBase.castShadow = true;
    const dRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(params.w * 0.9, 0.5, params.d * 0.9)), rubbleMat);
    dRoof.position.set(0.4, params.h * 0.56, 0);
    dRoof.rotation.z = 0.14;
    const dBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, params.h * 0.72, 0.55)), darkSteelMat);
    dBeam.position.set(-params.w * 0.3, params.h * 0.36, params.d * 0.25);
    dBeam.rotation.x = 0.18;
    damagedGroup.add(dBase, dRoof, dBeam);
    damagedGroup.visible = false;

    // Destroyed rubble pile
    const destroyedGroup = new THREE.Group();
    for (let r = 0; r < 6; r++) {
      const rw = params.w * (0.26 + (r % 3) * 0.12);
      const rh = 0.65 + (r % 2) * 0.6;
      const rd = params.d * (0.24 + ((r + 1) % 3) * 0.12);
      const block = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(rw, rh, rd)), r % 2 === 0 ? rubbleMat : charredMat);
      block.position.set(((r % 3) - 1) * (params.w * 0.26), rh * 0.45, ((Math.floor(r / 3)) - 0.5) * (params.d * 0.32));
      block.rotation.set((r - 2) * 0.12, r * 0.6, (r % 2 === 0 ? 1 : -1) * 0.15);
      block.castShadow = true;
      destroyedGroup.add(block);
    }
    destroyedGroup.visible = false;

    rootGroup.add(intactGroup, damagedGroup, destroyedGroup);
    group.add(rootGroup);

    const { crewGroup, crewWorkers, sparkMesh } = createConstructionCrew(
      params.x,
      params.y,
      params.z,
      params.crewOffsetZ
    );

    destructibleStructures.push({
      id: params.id,
      name: params.name,
      x: params.x,
      y: params.y,
      z: params.z,
      radius: Math.max(params.w, params.d) * 0.62,
      hp: params.maxHp,
      maxHp: params.maxHp,
      stage: 'intact',
      rootGroup,
      intactGroup,
      damagedGroup,
      destroyedGroup,
      repairState: 'idle',
      waitTimer: 0,
      repairProgress: 0,
      crewGroup,
      crewWorkers,
      sparkMesh,
      smokeAccum: 0,
    });
  };

  // =========================================================================
  // 1. GRAND MULTI-LANE SEA BRIDGE (Connects Main Island x=-180 to Airport x=-296 at z=32)
  // =========================================================================
  const bridgeStartX = -296;
  const bridgeEndX = -182;
  const bridgeLen = bridgeEndX - bridgeStartX; // 114m
  const bridgeMidX = (bridgeStartX + bridgeEndX) * 0.5; // -239
  const bridgeDeckY = 2.45;
  const bridgeW = 14.5;

  // Main walkable/driveable bridge road slab (stays solid even when arches take blast hits)
  const deckMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bridgeLen, 0.7, bridgeW)), concreteMat);
  deckMesh.position.set(bridgeMidX, bridgeDeckY - 0.35, SEA_BRIDGE_Z);
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);
  addBoxCol(bridgeMidX, bridgeDeckY - 0.35, SEA_BRIDGE_Z, bridgeLen, 0.7, bridgeW, 'floor');

  // Asphalt top & dashed yellow centerline
  const roadTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bridgeLen, 0.08, bridgeW - 2.2)), asphaltMat);
  roadTop.position.set(bridgeMidX, bridgeDeckY + 0.02, SEA_BRIDGE_Z);
  roadTop.receiveShadow = true;
  group.add(roadTop);

  for (let lx = bridgeStartX + 4; lx <= bridgeEndX - 4; lx += 8) {
    const dash = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 0.04, 0.35)), yellowAccentMat);
    dash.position.set(lx, bridgeDeckY + 0.07, SEA_BRIDGE_Z);
    group.add(dash);
  }

  // Side guardrails along bridge (prevent accidental fall-off while keeping sightlines clear)
  for (const sideZ of [SEA_BRIDGE_Z - bridgeW * 0.5 + 0.35, SEA_BRIDGE_Z + bridgeW * 0.5 - 0.35]) {
    const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bridgeLen, 0.9, 0.55)), concreteMat);
    rail.position.set(bridgeMidX, bridgeDeckY + 0.45, sideZ);
    group.add(rail);
    addBoxCol(bridgeMidX, bridgeDeckY + 0.55, sideZ, bridgeLen, 1.1, 0.6, 'wall');
  }

  // Entry & Exit Ramps (smooth transition for cars, tanks & players from sand up onto bridge)
  const westGroundY = Math.max(0.1, getGroundHeightAt(bridgeStartX - 14, SEA_BRIDGE_Z));
  const rampRun = 14;
  const buildBridgeRamp = (rx: number, yLow: number, slopeDir: 1 | -1) => {
    const h = bridgeDeckY - yLow;
    const hyp = Math.hypot(rampRun, h);
    const angle = Math.atan2(h, rampRun);
    const rampMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(hyp, 0.55, bridgeW)), asphaltMat);
    rampMesh.position.set(rx, (yLow + bridgeDeckY) * 0.5 - 0.25, SEA_BRIDGE_Z);
    rampMesh.rotation.z = slopeDir > 0 ? angle : -angle;
    rampMesh.receiveShadow = true;
    group.add(rampMesh);
    colliders.push({
      minX: rx - rampRun * 0.5,
      maxX: rx + rampRun * 0.5,
      minY: yLow - 0.5,
      maxY: bridgeDeckY + 0.05,
      minZ: SEA_BRIDGE_Z - bridgeW * 0.5,
      maxZ: SEA_BRIDGE_Z + bridgeW * 0.5,
      kind: 'ramp',
      slopeAxis: 'x',
      slopeDir,
    });
  };
  buildBridgeRamp(bridgeStartX - rampRun * 0.5, westGroundY, 1);
  const eastGroundY = Math.max(-0.05, getGroundHeightAt(bridgeEndX + rampRun, SEA_BRIDGE_Z));
  buildBridgeRamp(bridgeEndX + rampRun * 0.5, eastGroundY, -1);

  // Suspension Bridge Pylons & Cables + Support Piers into Seabed
  for (const px of [-268, -210]) {
    for (const sz of [SEA_BRIDGE_Z - bridgeW * 0.5 + 0.4, SEA_BRIDGE_Z + bridgeW * 0.5 - 0.4]) {
      const pylon = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 22, 2.0)), whiteWallMat);
      pylon.position.set(px, bridgeDeckY + 5.5, sz);
      pylon.castShadow = true;
      group.add(pylon);
      addBoxCol(px, bridgeDeckY + 9, sz, 2.2, 18, 2.0, 'wall');
    }
    const crossBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.8, 1.6, bridgeW)), whiteWallMat);
    crossBar.position.set(px, bridgeDeckY + 14.5, SEA_BRIDGE_Z);
    group.add(crossBar);
    const pier = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 9, bridgeW - 1.5)), concreteMat);
    pier.position.set(px, -2.5, SEA_BRIDGE_Z);
    group.add(pier);
  }
  radarBuildings.push({ x: bridgeMidX, z: SEA_BRIDGE_Z, w: bridgeLen, d: bridgeW, floors: 1 });

  // =========================================================================
  // 2. PAVED AIRPORT RUNWAY, TAXIWAYS & 2 HELIPADS
  // =========================================================================
  const runwayX = cx - 10; // -485
  const runwayZ = cz - 42; // -17
  const runwayW = 196;
  const runwayD = 28;
  const baseY = 0.35;

  const runwayMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(runwayW, 0.14, runwayD)), asphaltMat);
  runwayMesh.position.set(runwayX, baseY + 0.02, runwayZ);
  runwayMesh.receiveShadow = true;
  group.add(runwayMesh);

  // Runway centerline dashes & threshold stripes
  for (let rx = runwayX - runwayW * 0.44; rx <= runwayX + runwayW * 0.44; rx += 11) {
    const dash = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.0, 0.03, 0.55)), runwayLineMat);
    dash.position.set(rx, baseY + 0.1, runwayZ);
    group.add(dash);
  }
  for (const endOffset of [-runwayW * 0.46, runwayW * 0.46]) {
    for (let s = -4; s <= 4; s++) {
      if (s === 0) continue;
      const bar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.5, 0.03, 1.1)), runwayLineMat);
      bar.position.set(runwayX + endOffset, baseY + 0.1, runwayZ + s * 2.5);
      group.add(bar);
    }
  }
  // Runway glowing edge guide lights
  for (let rx = runwayX - runwayW * 0.48; rx <= runwayX + runwayW * 0.48; rx += 18) {
    for (const side of [-runwayD * 0.5 - 0.5, runwayD * 0.5 + 0.5]) {
      const l = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.35, 0.45)), cyanEmissiveMat);
      l.position.set(rx, baseY + 0.18, runwayZ + side);
      group.add(l);
    }
  }

  // Apron tarmac & 2 Military Helipads
  const apronMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(175, 0.12, 128)), concreteMat);
  apronMesh.position.set(cx + 8, baseY + 0.01, cz + 42);
  apronMesh.receiveShadow = true;
  group.add(apronMesh);

  const helipadSpots = [
    { x: cx + 48, z: cz + 44 },
    { x: cx - 44, z: cz + 48 },
  ];
  helipadSpots.forEach((hp) => {
    const pad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(8.2, 8.6, 0.18, 20)), asphaltMat);
    pad.position.set(hp.x, baseY + 0.08, hp.z);
    pad.receiveShadow = true;
    group.add(pad);
    const hLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.04, 6.2)), yellowAccentMat);
    hLeft.position.set(hp.x - 2.1, baseY + 0.18, hp.z);
    const hRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.04, 6.2)), yellowAccentMat);
    hRight.position.set(hp.x + 2.1, baseY + 0.18, hp.z);
    const hMid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.04, 1.1)), yellowAccentMat);
    hMid.position.set(hp.x, baseY + 0.18, hp.z);
    group.add(hLeft, hRight, hMid);
  });

  // =========================================================================
  // 3. DESTRUCTIBLE AIRPORT STRUCTURES + ATC TOWER + HANGARS + TERMINAL + POLICE STATION + BUNKER
  // =========================================================================
  // A) ATC Control Tower
  const atcX = cx + 8;
  const atcZ = cz - 72;
  let atcRadarDish: THREE.Mesh | null = null;
  registerDestructible({
    id: 'airport_atc_tower',
    name: 'ATC Control Tower',
    x: atcX,
    y: baseY,
    z: atcZ,
    w: 9,
    h: 18,
    d: 9,
    maxHp: 650,
    crewOffsetZ: 8.5,
    buildIntact: (p) => {
      const shaft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 13.5, 5.6)), whiteWallMat);
      shaft.position.y = 6.75;
      shaft.castShadow = true;
      const cabFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.4, 0.7, 9.4)), concreteMat);
      cabFloor.position.y = 13.6;
      const cabGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.8, 3.2, 8.8)), glassMat);
      cabGlass.position.y = 15.5;
      const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.8, 0.7, 9.8)), darkSteelMat);
      roof.position.y = 17.4;
      const mast = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 3.2, 0.45)), darkSteelMat);
      mast.position.y = 19.2;
      atcRadarDish = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 0.75, 0.45)), yellowAccentMat);
      atcRadarDish.position.y = 20.4;
      p.add(shaft, cabFloor, cabGlass, roof, mast, atcRadarDish);
    },
  });
  addBoxCol(atcX, baseY + 6.75, atcZ, 5.6, 13.5, 5.6, 'wall');
  addBoxCol(atcX, baseY + 13.6, atcZ, 9.4, 0.7, 9.4, 'floor');
  radarBuildings.push({ x: atcX, z: atcZ, w: 9, d: 9, floors: 3 });

  animatedObjects.push((_t, dt) => {
    if (atcRadarDish) atcRadarDish.rotation.y += dt * 1.9;
  });

  // B) Passenger Terminal with Security Checkpoint Arches
  const termX = cx + 78;
  const termZ = cz - 78;
  registerDestructible({
    id: 'airport_terminal',
    name: 'Passenger Terminal',
    x: termX,
    y: baseY,
    z: termZ,
    w: 28,
    h: 7.5,
    d: 16,
    maxHp: 750,
    crewOffsetZ: 12.5,
    buildIntact: (p) => {
      const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(28, 7.2, 1.4)), whiteWallMat);
      backWall.position.set(0, 3.6, -7.3);
      const sideW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 7.2, 14.6)), whiteWallMat);
      sideW.position.set(-13.3, 3.6, 0);
      const sideE = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 7.2, 14.6)), whiteWallMat);
      sideE.position.set(13.3, 3.6, 0);
      const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(30, 0.85, 18)), darkSteelMat);
      roof.position.set(0, 7.6, 0);
      const sign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(14, 1.4, 0.45)), cyanEmissiveMat);
      sign.position.set(0, 6.2, 8.9);
      // 2 Security Scanner Arches inside lobby
      for (const sx of [-5.5, 5.5]) {
        const postL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 3.0, 1.2)), darkSteelMat);
        postL.position.set(sx - 1.1, 1.5, 4.5);
        const postR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 3.0, 1.2)), darkSteelMat);
        postR.position.set(sx + 1.1, 1.5, 4.5);
        const topBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.65, 0.45, 1.2)), greenEmissiveMat);
        topBar.position.set(sx, 3.1, 4.5);
        p.add(postL, postR, topBar);
      }
      p.add(backWall, sideW, sideE, roof, sign);
    },
  });
  addBoxCol(termX, baseY + 3.6, termZ - 7.3, 28, 7.2, 1.4, 'wall');
  addBoxCol(termX - 13.3, baseY + 3.6, termZ, 1.4, 7.2, 14.6, 'wall');
  addBoxCol(termX + 13.3, baseY + 3.6, termZ, 1.4, 7.2, 14.6, 'wall');
  addBoxCol(termX, baseY + 7.6, termZ, 30, 0.85, 18, 'floor');
  radarBuildings.push({ x: termX, z: termZ, w: 28, d: 16, floors: 2 });

  // C) 2 Open Aircraft Hangars (Big drive-in bays for Tanks & Helicopters!)
  const hangarPositions = [
    { id: 'airport_hangar_west', name: 'West Aircraft Hangar', x: cx - 54, z: cz - 82 },
    { id: 'airport_hangar_south', name: 'South Military Hangar', x: cx + 10, z: cz + 92 },
  ];
  hangarPositions.forEach((hg) => {
    registerDestructible({
      id: hg.id,
      name: hg.name,
      x: hg.x,
      y: baseY,
      z: hg.z,
      w: 24,
      h: 9.2,
      d: 20,
      maxHp: 820,
      crewOffsetZ: 14,
      buildIntact: (p) => {
        const wL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 8.8, 20)), hangarMat);
        wL.position.set(-11.2, 4.4, 0);
        const wR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 8.8, 20)), hangarMat);
        wR.position.set(11.2, 4.4, 0);
        const wB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(24, 8.8, 1.5)), hangarMat);
        wB.position.set(0, 4.4, -9.2);
        const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(25.2, 0.95, 21)), darkSteelMat);
        roof.position.set(0, 9.1, 0);
        const stripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(24.6, 0.65, 0.4)), yellowAccentMat);
        stripe.position.set(0, 8.3, 10.4);
        p.add(wL, wR, wB, roof, stripe);
      },
    });
    addBoxCol(hg.x - 11.2, baseY + 4.4, hg.z, 1.5, 8.8, 20, 'wall');
    addBoxCol(hg.x + 11.2, baseY + 4.4, hg.z, 1.5, 8.8, 20, 'wall');
    addBoxCol(hg.x, baseY + 4.4, hg.z - 9.2, 24, 8.8, 1.5, 'wall');
    addBoxCol(hg.x, baseY + 9.1, hg.z, 25.2, 0.95, 21, 'floor');
    radarBuildings.push({ x: hg.x, z: hg.z, w: 24, d: 20, floors: 1 });
  });

  // D) 2 Military Barracks / Houses
  const barracksSpots = [
    { id: 'airport_barracks_1', name: 'Alpha Barracks', x: cx - 72, z: cz + 38 },
    { id: 'airport_barracks_2', name: 'Bravo Quarters', x: cx - 52, z: cz + 92 },
  ];
  barracksSpots.forEach((bk) => {
    registerDestructible({
      id: bk.id,
      name: bk.name,
      x: bk.x,
      y: baseY,
      z: bk.z,
      w: 15,
      h: 5.2,
      d: 11,
      maxHp: 460,
      crewOffsetZ: 9,
      buildIntact: (p) => {
        const wB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(15, 4.8, 1.2)), militaryMat);
        wB.position.set(0, 2.4, -4.9);
        const wL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 4.8, 9.8)), militaryMat);
        wL.position.set(-6.9, 2.4, 0);
        const wR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 4.8, 9.8)), militaryMat);
        wR.position.set(6.9, 2.4, 0);
        const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16, 0.75, 12)), darkSteelMat);
        roof.position.set(0, 5.1, 0);
        p.add(wB, wL, wR, roof);
      },
    });
    addBoxCol(bk.x, baseY + 2.4, bk.z - 4.9, 15, 4.8, 1.2, 'wall');
    addBoxCol(bk.x - 6.9, baseY + 2.4, bk.z, 1.2, 4.8, 9.8, 'wall');
    addBoxCol(bk.x + 6.9, baseY + 2.4, bk.z, 1.2, 4.8, 9.8, 'wall');
    addBoxCol(bk.x, baseY + 5.1, bk.z, 16, 0.75, 12, 'floor');
    radarBuildings.push({ x: bk.x, z: bk.z, w: 15, d: 11, floors: 1 });
  });

  // E) Airport Police Station & Visible Jail Cell (East side near Sea Bridgehead)
  const psX = cx + 120; // -355
  const psZ = cz + 44;  // 69
  registerDestructible({
    id: 'airport_police_station',
    name: 'Airport Police Station',
    x: psX,
    y: baseY,
    z: psZ,
    w: 18,
    h: 6.2,
    d: 14,
    maxHp: 680,
    crewOffsetZ: -10.5,
    buildIntact: (p) => {
      const backW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18, 5.6, 1.2)), whiteWallMat);
      backW.position.set(0, 2.8, 6.4);
      const sideW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 5.6, 12.8)), whiteWallMat);
      sideW.position.set(-8.4, 2.8, 0);
      const sideE = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 5.6, 12.8)), whiteWallMat);
      sideE.position.set(8.4, 2.8, 0);
      const frontL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.2, 5.6, 1.2)), policeBlueMat);
      frontL.position.set(-5.9, 2.8, -6.4);
      const frontR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.2, 5.6, 1.2)), policeBlueMat);
      frontR.position.set(5.9, 2.8, -6.4);
      const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(19, 0.75, 15)), policeBlueMat);
      roof.position.set(0, 5.9, 0);
      const sign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.5, 1.2, 0.45)), cyanEmissiveMat);
      sign.position.set(0, 5.0, -7.2);
      // Steel Jail Cell Bars inside rear of station
      for (let bx = -5.5; bx <= 5.5; bx += 1.35) {
        const bar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 5.4, 0.18)), darkSteelMat);
        bar.position.set(bx, 2.7, 1.5);
        p.add(bar);
      }
      p.add(backW, sideW, sideE, frontL, frontR, roof, sign);
    },
  });
  addBoxCol(psX, baseY + 2.8, psZ + 6.4, 18, 5.6, 1.2, 'wall');
  addBoxCol(psX - 8.4, baseY + 2.8, psZ, 1.2, 5.6, 12.8, 'wall');
  addBoxCol(psX + 8.4, baseY + 2.8, psZ, 1.2, 5.6, 12.8, 'wall');
  addBoxCol(psX - 5.9, baseY + 2.8, psZ - 6.4, 6.2, 5.6, 1.2, 'wall');
  addBoxCol(psX + 5.9, baseY + 2.8, psZ - 6.4, 6.2, 5.6, 1.2, 'wall');
  addBoxCol(psX, baseY + 5.9, psZ, 19, 0.75, 15, 'floor');
  // Cell barrier collider (does not trap player once released since release teleports to JAIL_RELEASE_POS!)
  addBoxCol(psX, baseY + 2.7, psZ + 1.5, 13.5, 5.4, 0.35, 'glass');
  radarBuildings.push({ x: psX, z: psZ, w: 18, d: 14, floors: 1 });

  // F) Military Bunker & Interactive Missile Control Room (West Airport Perimeter)
  const bX = MISSILE_CONSOLE_POS.x + 2; // -568
  const bZ = MISSILE_CONSOLE_POS.z;     // -12
  registerDestructible({
    id: 'airport_missile_bunker',
    name: 'Missile Control Bunker',
    x: bX,
    y: baseY,
    z: bZ,
    w: 18,
    h: 6.4,
    d: 18,
    maxHp: 900,
    crewOffsetZ: 12.5,
    buildIntact: (p) => {
      const backW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.6, 6.0, 18)), concreteMat);
      backW.position.set(-8.2, 3.0, 0);
      const northW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18, 6.0, 1.6)), concreteMat);
      northW.position.set(0, 3.0, -8.2);
      const southW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18, 6.0, 1.6)), concreteMat);
      southW.position.set(0, 3.0, 8.2);
      const frontN = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.6, 6.0, 5.5)), concreteMat);
      frontN.position.set(8.2, 3.0, -6.2);
      const frontS = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.6, 6.0, 5.5)), concreteMat);
      frontS.position.set(8.2, 3.0, 6.2);
      const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(19, 1.1, 19)), militaryMat);
      roof.position.set(0, 6.4, 0);
      const siloCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.2, 3.6, 1.2, 12)), darkSteelMat);
      siloCap.position.set(-4, 7.3, -4);
      // Tactical Missile Control Console Desk & Glowing Screens inside
      const desk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 1.1, 5.4)), darkSteelMat);
      desk.position.set(-2.0, 0.55, 0);
      const screenL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 1.2, 2.0)), cyanEmissiveMat);
      screenL.position.set(-2.5, 1.6, -1.3);
      const screenR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 1.2, 2.0)), greenEmissiveMat);
      screenR.position.set(-2.5, 1.6, 1.3);
      const redBtn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 0.25, 10)), redEmissiveMat);
      redBtn.position.set(-1.5, 1.2, 0);
      p.add(backW, northW, southW, frontN, frontS, roof, siloCap, desk, screenL, screenR, redBtn);
    },
  });
  addBoxCol(bX - 8.2, baseY + 3.0, bZ, 1.6, 6.0, 18, 'wall');
  addBoxCol(bX, baseY + 3.0, bZ - 8.2, 18, 6.0, 1.6, 'wall');
  addBoxCol(bX, baseY + 3.0, bZ + 8.2, 18, 6.0, 1.6, 'wall');
  addBoxCol(bX + 8.2, baseY + 3.0, bZ - 6.2, 1.6, 6.0, 5.5, 'wall');
  addBoxCol(bX + 8.2, baseY + 3.0, bZ + 6.2, 1.6, 6.0, 5.5, 'wall');
  addBoxCol(bX, baseY + 6.4, bZ, 19, 1.1, 19, 'floor');
  radarBuildings.push({ x: bX, z: bZ, w: 18, d: 18, floors: 1 });

  // =========================================================================
  // 4. 7 NORMAL-HEIGHT STEEL WATCHTOWERS (Guard Outposts around Runway & Bridge)
  // =========================================================================
  const towerSpots: Array<{ x: number; z: number; role: 'police' | 'army'; gunId: GunId }> = [
    { x: cx + 150, z: SEA_BRIDGE_Z - 14, role: 'police', gunId: 'assault_rifle' }, // Bridgehead N
    { x: cx + 150, z: SEA_BRIDGE_Z + 14, role: 'police', gunId: 'combat_shotgun' }, // Bridgehead S
    { x: cx + 40, z: cz - 102, role: 'police', gunId: 'sniper' },                   // Terminal North
    { x: cx - 108, z: cz - 65, role: 'army', gunId: 'assault_rifle' },              // NW Runway
    { x: cx - 122, z: cz + 42, role: 'army', gunId: 'sniper' },                     // Bunker Watch
    { x: cx - 12, z: cz + 124, role: 'army', gunId: 'laser_blaster' },              // South Perimeter
    { x: cx + 98, z: cz + 94, role: 'police', gunId: 'assault_rifle' },             // SE Coast Watch
  ];

  towerSpots.forEach((tw, idx) => {
    const deckH = 7.4;
    const tx = tw.x;
    const tz = tw.z;
    const ty = getGroundHeightAt(tx, tz);

    registerDestructible({
      id: `airport_watchtower_${idx}`,
      name: `Watchtower #${idx + 1}`,
      x: tx,
      y: ty,
      z: tz,
      w: 5.2,
      h: deckH + 3.4,
      d: 5.2,
      maxHp: 320,
      crewOffsetZ: 6.0,
      buildIntact: (p) => {
        for (const [lx, lz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
          const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, deckH, 0.45)), darkSteelMat);
          leg.position.set(lx, deckH * 0.5, lz);
          p.add(leg);
        }
        const platform = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.8, 0.45, 4.8)), darkSteelMat);
        platform.position.y = deckH;
        const railN = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.8, 0.95, 0.25)), militaryMat);
        railN.position.set(0, deckH + 0.6, -2.25);
        const railS = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.8, 0.95, 0.25)), militaryMat);
        railS.position.set(0, deckH + 0.6, 2.25);
        const railW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.25, 0.95, 4.4)), militaryMat);
        railW.position.set(-2.25, deckH + 0.6, 0);
        const capRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, 0.4, 5.2)), concreteMat);
        capRoof.position.set(0, deckH + 3.2, 0);
        for (const [lx, lz] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
          const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 3.0, 0.28)), darkSteelMat);
          post.position.set(lx, deckH + 1.65, lz);
          p.add(post);
        }
        // Exterior walk-up ramp from East side (+x)
        const rRun = 7.6;
        const rHyp = Math.hypot(rRun, deckH);
        const ramp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(rHyp, 0.28, 1.8)), darkSteelMat);
        ramp.position.set(2.4 + rRun * 0.5, deckH * 0.5 - 0.15, 0);
        ramp.rotation.z = -Math.atan2(deckH, rRun);
        p.add(platform, railN, railS, railW, capRoof, ramp);
      },
    });
    addBoxCol(tx, ty + deckH, tz, 4.8, 0.45, 4.8, 'floor');
    colliders.push({
      minX: tx + 2.4,
      maxX: tx + 10.0,
      minY: ty - 0.2,
      maxY: ty + deckH + 0.1,
      minZ: tz - 0.95,
      maxZ: tz + 0.95,
      kind: 'ramp',
      slopeAxis: 'x',
      slopeDir: -1,
    });
    guardSpawns.push({
      x: tx,
      y: ty + deckH + 0.35,
      z: tz,
      yaw: Math.atan2(0 - tx, 0 - tz),
      role: tw.role,
      gunId: tw.gunId,
      onWatchtower: true,
    });
  });

  // Ground Patrol Police & Army Guards at Terminal, Hangars, Bunker & Police Station
  const groundGuards: Array<{ x: number; z: number; yaw: number; role: 'police' | 'army'; gunId: GunId }> = [
    { x: termX - 4, z: termZ + 12, yaw: 0, role: 'police', gunId: 'combat_shotgun' },
    { x: termX + 6, z: termZ + 12, yaw: 0, role: 'police', gunId: 'assault_rifle' },
    { x: psX - 5, z: psZ - 11, yaw: Math.PI, role: 'police', gunId: 'assault_rifle' },
    { x: psX + 5, z: psZ - 11, yaw: Math.PI, role: 'police', gunId: 'combat_shotgun' },
    { x: bX + 12, z: bZ - 4, yaw: Math.PI * 0.5, role: 'army', gunId: 'assault_rifle' },
    { x: bX + 12, z: bZ + 4, yaw: Math.PI * 0.5, role: 'army', gunId: 'laser_blaster' },
    { x: cx - 48, z: cz - 64, yaw: 0, role: 'army', gunId: 'sniper' },
  ];
  groundGuards.forEach((gg) => {
    guardSpawns.push({
      x: gg.x,
      y: getGroundHeightAt(gg.x, gg.z) + 0.1,
      z: gg.z,
      yaw: gg.yaw,
      role: gg.role,
      gunId: gg.gunId,
      onWatchtower: false,
    });
  });

  // =========================================================================
  // 5. AIRPORT VEHICLES (Tanks, Attack Helicopters, Police Cars, Army Trucks, Sedans)
  // =========================================================================
  const rawAirportVehicles: Array<{ x: number; z: number; yaw: number; kind: VehicleKind }> = [
    { x: cx - 54, z: cz - 72, yaw: 0.1, kind: 'tank' },                 // West Hangar Tank
    { x: cx + 10, z: cz + 80, yaw: Math.PI, kind: 'tank' },             // South Hangar Tank
    { x: helipadSpots[0].x, z: helipadSpots[0].z, yaw: Math.PI * 0.4, kind: 'helicopter' },
    { x: helipadSpots[1].x, z: helipadSpots[1].z, yaw: -Math.PI * 0.3, kind: 'helicopter' },
    { x: psX + 14, z: psZ - 14, yaw: Math.PI * 0.5, kind: 'police_car' },
    { x: cx + 142, z: SEA_BRIDGE_Z + 12, yaw: -Math.PI * 0.5, kind: 'police_car' },
    { x: cx - 32, z: cz + 68, yaw: 0.4, kind: 'truck' },
    { x: bX + 16, z: bZ + 14, yaw: Math.PI * 0.25, kind: 'truck' },
    { x: termX + 20, z: termZ + 14, yaw: -Math.PI * 0.5, kind: 'sedan' },
    { x: cx + 132, z: SEA_BRIDGE_Z - 12, yaw: Math.PI * 0.5, kind: 'sedan' },
  ];
  rawAirportVehicles.forEach((v) => {
    vehicleSpawns.push({
      ...v,
      y: Math.max(0.2, getGroundHeightAt(v.x, v.z)),
    });
  });

  // Pickups & Airport Fighter Spawns
  const rawPickups: Array<[number, number]> = [
    [runwayX, runwayZ],
    [termX, termZ + 2],
    [cx - 54, cz - 82],
    [bX + 2, bZ],
    [psX, psZ - 2],
    [cx + 10, cz + 92],
  ];
  rawPickups.forEach(([px, pz]) => {
    pickupPoints.push(new THREE.Vector3(px, Math.max(0.4, getGroundHeightAt(px, pz) + 0.4), pz));
  });

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const sx = cx + Math.cos(a) * 115;
    const sz = cz + Math.sin(a) * 115;
    spawnPoints.push(new THREE.Vector3(sx, Math.max(0.4, getGroundHeightAt(sx, sz) + 0.15), sz));
  }

  return {
    destructibleStructures,
    guardSpawns,
    vehicleSpawns,
    pickupPoints,
    spawnPoints,
    radarBuildings,
  };
}
