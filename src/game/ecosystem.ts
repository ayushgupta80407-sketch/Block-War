import * as THREE from 'three';
import { ArenaId, MarineMountKind } from './types';
import { MountEntity } from './vehiclesAndWildlife';
import { PondDef, SEA_CAVES } from './worldExpansion';

export type WildSpecies =
  | 'deer'
  | 'mammoth'
  | 'zebra'
  | 'tortoise'
  | 'lion'
  | 'tiger'
  | 'wolf'
  | 'crocodile'
  | 'bear'
  | 'boar'
  | 'cobra'
  | 'viper'
  | 'komodo'
  | 'chameleon'
  | 'scorpion'
  | 'villager';

export type WildBehavior = 'passive' | 'defensive' | 'predator' | 'villager';

export interface WildEcosystemEntity {
  id: string;
  species: WildSpecies;
  name: string;
  behavior: WildBehavior;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  legs: THREE.Object3D[];
  hpBarGroup: THREE.Group;
  hpBarFill: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  vx: number;
  vz: number;
  yaw: number;
  speed: number;
  runSpeed: number;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  rewardCoins: number;
  alive: boolean;
  respawnTimer: number;
  hitFlash: number;
  isHostile: boolean;
  hostileTimer: number;
  fleeTimer: number;
  attackCooldown: number;
  wanderTimer: number;
  wanderAngle: number;
  homeCenter: { x: number; z: number; maxRadius: number };
  lastAttackerId: string | null;
  dispose: () => void;
}

export interface MermaidEntity {
  root: THREE.Group;
  tailPivot: THREE.Group;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  centerX: number;
  centerZ: number;
  orbitR: number;
  phase: number;
  speed: number;
  pearlTimer: number;
  x: number;
  y: number;
  z: number;
  dispose: () => void;
}

export interface PondCreatureEntity {
  kind: 'koi' | 'frog' | 'duck' | 'crab';
  root: THREE.Group;
  animPart: THREE.Object3D;
  pond: PondDef;
  phase: number;
  orbitR: number;
  speed: number;
  hopTimer: number;
  dispose: () => void;
}

export interface InstancedFishSchool {
  mesh: THREE.InstancedMesh;
  update: (t: number) => void;
  dispose: () => void;
}

function createWildHpBar(width = 1.65): { group: THREE.Group; fill: THREE.Mesh; dispose: () => void } {
  const group = new THREE.Group();
  const bgGeo = new THREE.PlaneGeometry(width, 0.2);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide });
  const bg = new THREE.Mesh(bgGeo, bgMat);

  const fillGeo = new THREE.PlaneGeometry(width - 0.1, 0.13);
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.z = 0.01;

  group.add(bg, fill);
  group.visible = false;
  return {
    group,
    fill,
    dispose: () => {
      bgGeo.dispose();
      bgMat.dispose();
      fillGeo.dispose();
      fillMat.dispose();
    },
  };
}

export function createMarineMountEntity(
  id: string,
  kind: MarineMountKind,
  x: number,
  y: number,
  z: number,
  yaw: number
): MountEntity {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const propsToSpin: THREE.Object3D[] = [];
  let wings: [THREE.Object3D, THREE.Object3D] | undefined;
  const disposables: Array<{ dispose: () => void }> = [];

  let name = 'Rideable Great Shark';
  let maxHp = 900;
  let maxSpeed = 37;
  let accel = 34;
  let turnSpeed = 3.1;
  let radius = 2.4;
  let seatY = 0.72;
  let hpBarY = 2.9;
  let wakeOffsetZ = 2.6;

  if (kind === 'whale_mount') {
    name = 'Ocean Blue Whale';
    maxHp = 1100;
    maxSpeed = 33;
    accel = 26;
    turnSpeed = 2.25;
    radius = 3.6;
    seatY = 1.15;
    hpBarY = 3.6;
    wakeOffsetZ = 4.2;

    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.45 });
    disposables.push(blueMat, bellyMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 6.4), blueMat);
    torso.position.set(0, 0.2, 0);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 5.8), bellyMat);
    belly.position.set(0, -0.58, 0.1);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 1.9), blueMat);
    head.position.set(0, 0.18, 3.8);
    const finL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.9), blueMat);
    finL.position.set(-1.75, -0.15, 0.9);
    finL.rotation.z = 0.25;
    const finR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.9), blueMat);
    finR.position.set(1.75, -0.15, 0.9);
    finR.rotation.z = -0.25;

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.1, -3.2);
    const tailStem = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 1.4), blueMat);
    tailStem.position.set(0, 0, -0.65);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.05), blueMat);
    fluke.position.set(0, 0, -1.45);
    tailPivot.add(tailStem, fluke);
    propsToSpin.push(tailPivot);

    bodyGroup.add(torso, belly, head, finL, finR, tailPivot);
  } else if (kind === 'sailfish_mount') {
    name = 'Turbo Giant Sailfish';
    maxHp = 850;
    maxSpeed = 42;
    accel = 40;
    turnSpeed = 3.45;
    radius = 2.0;
    seatY = 0.68;
    hpBarY = 2.85;
    wakeOffsetZ = 2.4;

    const navyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.25 });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 });
    disposables.push(navyMat, sailMat, silverMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 3.6), navyMat);
    torso.position.set(0, 0.15, 0);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.28, 3.2), silverMat);
    belly.position.set(0, -0.26, 0);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.75), silverMat);
    sword.position.set(0, 0.2, 2.55);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 2.2), sailMat);
    sail.position.set(0, 1.05, -0.1);
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.15, -1.85);
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.75), navyMat);
    fork.position.set(0, 0, -0.45);
    tailPivot.add(fork);
    propsToSpin.push(tailPivot);

    bodyGroup.add(torso, belly, sword, sail, tailPivot);
  } else if (kind === 'turtle_mount') {
    name = 'Giant Sea Turtle';
    maxHp = 950;
    maxSpeed = 34;
    accel = 30;
    turnSpeed = 2.95;
    radius = 2.4;
    seatY = 0.92;
    hpBarY = 3.05;
    wakeOffsetZ = 2.5;

    const shellMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.48 });
    const patternMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.42 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.55 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    disposables.push(shellMat, patternMat, skinMat, eyeMat);

    const shellBase = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.78, 2.85), shellMat);
    shellBase.position.set(0, 0.35, 0);
    shellBase.castShadow = true;
    const shellDome = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 2.2), patternMat);
    shellDome.position.set(0, 0.85, 0);
    const plastron = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.28, 2.4), patternMat);
    plastron.position.set(0, -0.1, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.56, 0.92), skinMat);
    head.position.set(0, 0.38, 1.72);
    for (const ex of [-0.34, 0.34]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), eyeMat);
      eye.position.set(ex, 0.48, 1.96);
      bodyGroup.add(eye);
    }

    const flipperL = new THREE.Group();
    flipperL.position.set(-1.12, 0.18, 0.72);
    const fLMesh = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.72), skinMat);
    fLMesh.position.set(-0.72, 0, -0.1);
    fLMesh.rotation.y = 0.25;
    flipperL.add(fLMesh);

    const flipperR = new THREE.Group();
    flipperR.position.set(1.12, 0.18, 0.72);
    const fRMesh = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.72), skinMat);
    fRMesh.position.set(0.72, 0, -0.1);
    fRMesh.rotation.y = -0.25;
    flipperR.add(fRMesh);
    wings = [flipperL, flipperR];

    const backFlipL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.62), skinMat);
    backFlipL.position.set(-1.05, 0.08, -1.25);
    backFlipL.rotation.y = -0.45;
    const backFlipR = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.62), skinMat);
    backFlipR.position.set(1.05, 0.08, -1.25);
    backFlipR.rotation.y = 0.45;

    bodyGroup.add(shellBase, shellDome, plastron, head, flipperL, flipperR, backFlipL, backFlipR);
  } else if (kind === 'manta_mount') {
    name = 'Giant Ocean Manta Ray';
    maxHp = 750;
    maxSpeed = 41;
    accel = 39;
    turnSpeed = 3.55;
    radius = 2.55;
    seatY = 0.65;
    hpBarY = 2.85;
    wakeOffsetZ = 2.6;

    const rayMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3 });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      roughness: 0.28,
    });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.45 });
    disposables.push(rayMat, edgeMat, bellyMat);

    const center = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 2.95), rayMat);
    center.position.set(0, 0.18, 0);
    center.castShadow = true;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.16, 2.5), bellyMat);
    belly.position.set(0, -0.04, 0);

    const headLobeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.72), edgeMat);
    headLobeL.position.set(-0.52, 0.18, 1.65);
    const headLobeR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.72), edgeMat);
    headLobeR.position.set(0.52, 0.18, 1.65);

    const wingL = new THREE.Group();
    wingL.position.set(-0.68, 0.2, 0.1);
    const wLInner = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 1.95), rayMat);
    wLInner.position.set(-0.82, 0, -0.15);
    const wLTips = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.15), edgeMat);
    wLTips.position.set(-1.95, 0.04, -0.35);
    wingL.add(wLInner, wLTips);

    const wingR = new THREE.Group();
    wingR.position.set(0.68, 0.2, 0.1);
    const wRInner = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 1.95), rayMat);
    wRInner.position.set(0.82, 0, -0.15);
    const wRTips = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.15), edgeMat);
    wRTips.position.set(1.95, 0.04, -0.35);
    wingR.add(wRInner, wRTips);
    wings = [wingL, wingR];

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.15, -1.48);
    const whip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 2.35), edgeMat);
    whip.position.set(0, 0, -1.15);
    tailPivot.add(whip);
    propsToSpin.push(tailPivot);

    bodyGroup.add(center, belly, headLobeL, headLobeR, wingL, wingR, tailPivot);
  } else {
    // 'shark_mount'
    name = 'Rideable Great Shark';
    maxHp = 900;
    maxSpeed = 38;
    accel = 35;
    turnSpeed = 3.15;
    radius = 2.3;
    seatY = 0.72;
    hpBarY = 2.9;
    wakeOffsetZ = 2.6;

    const greyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    disposables.push(greyMat, whiteMat, eyeMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.08, 4.1), greyMat);
    torso.position.set(0, 0.15, 0);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 3.7), whiteMat);
    belly.position.set(0, -0.32, 0.1);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 1.2), greyMat);
    snout.position.set(0, 0.18, 2.4);
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.05, 4), greyMat);
    dorsal.position.set(0, 0.95, -0.15);
    dorsal.rotation.x = -0.25;
    const finL = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 0.55), greyMat);
    finL.position.set(-0.98, -0.12, 0.65);
    finL.rotation.y = -0.35;
    const finR = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 0.55), greyMat);
    finR.position.set(0.98, -0.12, 0.65);
    finR.rotation.y = 0.35;
    for (const ex of [-0.46, 0.46]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.16), eyeMat);
      eye.position.set(ex, 0.32, 2.45);
      bodyGroup.add(eye);
    }

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.15, -2.1);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.8), greyMat);
    tailFin.position.set(0, 0.12, -0.45);
    tailPivot.add(tailFin);
    propsToSpin.push(tailPivot);

    bodyGroup.add(torso, belly, snout, dorsal, finL, finR, tailPivot);
  }

  const hpBar = createWildHpBar(2.4);
  hpBar.group.position.set(0, hpBarY, 0);
  hpBar.group.visible = true;
  (hpBar.fill.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
  root.add(hpBar.group);

  return {
    id,
    kind,
    isBoat: false,
    isMarineMount: true,
    name,
    root,
    bodyGroup,
    wheels: [],
    legs: [],
    wings,
    propsToSpin,
    hpBarFill: hpBar.fill,
    hpBarGroup: hpBar.group,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw,
    speed: 0,
    spawnX: x,
    spawnY: y,
    spawnZ: z,
    spawnYaw: yaw,
    hp: maxHp,
    maxHp,
    alive: true,
    respawnTimer: 0,
    riderId: null,
    lastAttackerId: null,
    smokeTimer: 0,
    wakeTimer: 0,
    wakeOffsetZ,
    maxSpeed,
    accel,
    turnSpeed,
    radius,
    seatY,
    wanderAngle: yaw,
    wanderTimer: 2,
    hoofAccum: 0,
    dispose: () => {
      hpBar.dispose();
      disposables.forEach((d) => d.dispose());
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}

export function createMermaidEntity(index: number, centerX: number, centerZ: number): MermaidEntity {
  const root = new THREE.Group();
  const mats: THREE.Material[] = [];

  const tailPalette = [0x06b6d4, 0x10b981, 0xe879f9, 0x38bdf8];
  const hairPalette = [0xf43f5e, 0xfacc15, 0xc084fc, 0xfb923c];

  const tailMat = new THREE.MeshStandardMaterial({
    color: tailPalette[index % tailPalette.length],
    emissive: tailPalette[index % tailPalette.length],
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.45,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
  const shellTopMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairPalette[index % hairPalette.length], roughness: 0.5 });
  mats.push(tailMat, skinMat, shellTopMat, hairMat);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.34), skinMat);
  torso.position.set(0, 0.35, 0);
  const topShell = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.28, 0.38), shellTopMat);
  topShell.position.set(0, 0.42, 0.02);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.5), skinMat);
  head.position.set(0, 1.0, 0);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.58), hairMat);
  hair.position.set(0, 0.95, -0.1);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), skinMat);
  armL.position.set(-0.4, 0.36, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), skinMat);
  armR.position.set(0.4, 0.36, 0);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, 0);
  const lowerTail = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.85, 0.32), tailMat);
  lowerTail.position.set(0, -0.45, 0);
  const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.48), tailMat);
  fluke.position.set(0, -0.92, -0.18);
  tailPivot.add(lowerTail, fluke);

  root.add(torso, topShell, head, hair, armL, armR, tailPivot);

  const orbitR = 14 + (index % 3) * 5;
  const phase = index * 1.7;
  const speed = 0.28 + (index % 2) * 0.08;
  const x = centerX + Math.cos(phase) * orbitR;
  const z = centerZ + Math.sin(phase) * orbitR;
  const y = -2.25;
  root.position.set(x, y, z);

  return {
    root,
    tailPivot,
    armL,
    armR,
    centerX,
    centerZ,
    orbitR,
    phase,
    speed,
    pearlTimer: 10 + index * 3,
    x,
    y,
    z,
    dispose: () => {
      mats.forEach((m) => m.dispose());
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}

export function createPondCreatureEntity(
  kind: 'koi' | 'frog' | 'duck' | 'crab',
  pond: PondDef,
  idx: number
): PondCreatureEntity {
  const root = new THREE.Group();
  let animPart: THREE.Object3D = root;
  const mats: THREE.Material[] = [];

  if (kind === 'koi') {
    const col = idx % 2 === 0 ? 0xf97316 : 0xfef08a;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    mats.push(mat, whiteMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.62), mat);
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.22), whiteMat);
    spot.position.z = 0.08;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.24), mat);
    tail.position.z = -0.38;
    root.add(body, spot, tail);
    animPart = tail;
  } else if (kind === 'duck') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    mats.push(bodyMat, headMat, beakMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.58), bodyMat);
    body.position.y = 0.14;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), headMat);
    head.position.set(0, 0.42, 0.22);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.18), beakMat);
    beak.position.set(0, 0.38, 0.4);
    root.add(body, head, beak);
    animPart = body;
  } else if (kind === 'frog') {
    const frogMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    mats.push(frogMat, eyeMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.4), frogMat);
    body.position.y = 0.14;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
    eyeL.position.set(-0.12, 0.28, 0.14);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
    eyeR.position.set(0.12, 0.28, 0.14);
    root.add(body, eyeL, eyeR);
    animPart = body;
  } else {
    // crab
    const crabMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 });
    mats.push(crabMat);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.36), crabMat);
    shell.position.y = 0.14;
    const clawL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.22), crabMat);
    clawL.position.set(-0.3, 0.16, 0.22);
    const clawR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.22), crabMat);
    clawR.position.set(0.3, 0.16, 0.22);
    root.add(shell, clawL, clawR);
    animPart = shell;
  }

  const orbitR =
    kind === 'crab'
      ? pond.radius + 1.2
      : kind === 'frog'
        ? pond.radius * 0.55
        : pond.radius * (0.28 + (idx % 4) * 0.14);
  const phase = idx * 1.45;
  const speed = kind === 'koi' ? 0.65 : kind === 'duck' ? 0.32 : kind === 'crab' ? 0.45 : 0;

  return {
    kind,
    root,
    animPart,
    pond,
    phase,
    orbitR,
    speed,
    hopTimer: 1.5 + idx * 0.7,
    dispose: () => {
      mats.forEach((m) => m.dispose());
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}

export function createInstancedFishSchool(count = 160): InstancedFishSchool {
  const geo = new THREE.BoxGeometry(0.22, 0.24, 0.64);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.3,
    metalness: 0.2,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  const schoolColors = [0xf97316, 0x22d3ee, 0xfacc15, 0xf43f5e, 0x38bdf8, 0xa855f7];
  const color = new THREE.Color();
  const centers: Array<{ cx: number; cz: number; r: number; speed: number; phase: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const cave = SEA_CAVES[i % SEA_CAVES.length];
    const clusterAngle = (i % 8) * (Math.PI / 4);
    const spread = 5 + (i % 13) * 1.55;
    centers.push({
      cx: cave.x + Math.cos(clusterAngle) * 8,
      cz: cave.z + Math.sin(clusterAngle) * 8,
      r: spread,
      speed: (0.28 + (i % 5) * 0.08) * (i % 2 === 0 ? 1 : -1),
      phase: i * 0.62,
      y: -1.45 - (i % 6) * 0.48,
    });
    color.setHex(schoolColors[i % schoolColors.length]);
    mesh.setColorAt(i, color);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  const update = (t: number) => {
    for (let i = 0; i < count; i++) {
      const c = centers[i];
      const a = t * c.speed + c.phase;
      const r = c.r + Math.sin(t * 1.8 + c.phase) * 1.6;
      const x = c.cx + Math.cos(a) * r;
      const z = c.cz + Math.sin(a) * r;
      const y = c.y + Math.sin(t * 2.5 + c.phase) * 0.25;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -a + (c.speed > 0 ? 0 : Math.PI) + Math.sin(t * 11 + i) * 0.08, 0);
      dummy.scale.setScalar(0.85 + (i % 3) * 0.18);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);

  return {
    mesh,
    update,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      mesh.dispose();
    },
  };
}

export function createWildEcosystemEntity(
  id: string,
  species: WildSpecies,
  x: number,
  y: number,
  z: number,
  arenaId: ArenaId,
  homeCenter: { x: number; z: number; maxRadius: number }
): WildEcosystemEntity {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const legs: THREE.Object3D[] = [];
  const mats: THREE.Material[] = [];

  const isSnow = arenaId === 'snowy';

  let name = 'Wild Deer';
  let behavior: WildBehavior = 'passive';
  let maxHp = 70;
  let speed = 3.8;
  let runSpeed = 9.8;
  let radius = 0.85;
  let damage = 0;
  let rewardCoins = 15;
  let hpBarY = 2.35;

  const addLegs = (mat: THREE.Material, positions: Array<[number, number]>, w: number, h: number, yTop: number) => {
    for (const [lx, lz] of positions) {
      const piv = new THREE.Group();
      piv.position.set(lx, yTop, lz);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h * 0.5;
      m.castShadow = true;
      piv.add(m);
      bodyGroup.add(piv);
      legs.push(piv);
    }
  };

  if (species === 'deer') {
    name = 'Island Deer';
    behavior = 'defensive';
    maxHp = 70;
    speed = 3.6;
    runSpeed = 11.2;
    damage = 8;
    rewardCoins = 15;
    const fur = new THREE.MeshStandardMaterial({ color: isSnow ? 0x94a3b8 : 0xb45309, roughness: 0.78 });
    const antler = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
    mats.push(fur, antler);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 1.45), fur);
    body.position.y = 0.95;
    body.castShadow = true;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.35), fur);
    neck.position.set(0, 1.42, 0.58);
    neck.rotation.x = 0.25;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.56), fur);
    head.position.set(0, 1.72, 0.8);
    bodyGroup.add(body, neck, head);
    for (const s of [-0.14, 0.14]) {
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), antler);
      horn.position.set(s, 2.02, 0.72);
      horn.rotation.z = s > 0 ? -0.3 : 0.3;
      bodyGroup.add(horn);
    }
    addLegs(fur, [[-0.22, 0.48], [0.22, 0.48], [-0.22, -0.48], [0.22, -0.48]], 0.16, 0.72, 0.72);
  } else if (species === 'mammoth') {
    name = 'Woolly Mammoth';
    behavior = 'defensive';
    maxHp = 450;
    speed = 2.8;
    runSpeed = 7.6;
    radius = 1.95;
    damage = 24;
    rewardCoins = 75;
    hpBarY = 4.2;
    const woolMat = new THREE.MeshStandardMaterial({ color: isSnow ? 0x475569 : 0x57534e, roughness: 0.92 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 });
    mats.push(woolMat, tuskMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.85, 3.3), woolMat);
    body.position.y = 2.05;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.45, 1.35), woolMat);
    head.position.set(0, 2.55, 1.85);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.55, 0.38), woolMat);
    trunk.position.set(0, 1.65, 2.58);
    trunk.rotation.x = -0.25;
    bodyGroup.add(body, head, trunk);
    for (const tx of [-0.46, 0.46]) {
      const tusk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 1.65), tuskMat);
      tusk.position.set(tx, 1.9, 2.9);
      tusk.rotation.x = -0.35;
      bodyGroup.add(tusk);
    }
    addLegs(woolMat, [[-0.72, 1.1], [0.72, 1.1], [-0.72, -1.1], [0.72, -1.1]], 0.46, 1.35, 1.35);
  } else if (species === 'zebra') {
    name = 'Savanna Zebra';
    behavior = 'defensive';
    maxHp = 85;
    speed = 4.1;
    runSpeed = 12.2;
    radius = 0.95;
    damage = 10;
    rewardCoins = 18;
    hpBarY = 2.6;
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });
    mats.push(whiteMat, stripeMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.76, 1.75), whiteMat);
    body.position.y = 1.08;
    body.castShadow = true;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.4), whiteMat);
    neck.position.set(0, 1.56, 0.72);
    neck.rotation.x = 0.32;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.66), whiteMat);
    head.position.set(0, 1.9, 1.0);
    bodyGroup.add(body, neck, head);
    for (let s = -0.55; s <= 0.55; s += 0.36) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.81, 0.78, 0.14), stripeMat);
      st.position.set(0, 1.08, s);
      bodyGroup.add(st);
    }
    addLegs(whiteMat, [[-0.25, 0.62], [0.25, 0.62], [-0.25, -0.62], [0.25, -0.62]], 0.18, 0.8, 0.8);
  } else if (species === 'tortoise') {
    name = 'Giant Tortoise';
    behavior = 'defensive';
    maxHp = 200;
    speed = 1.35;
    runSpeed = 3.1;
    radius = 0.95;
    damage = 9;
    rewardCoins = 25;
    hpBarY = 1.85;
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.75 });
    mats.push(shellMat, rimMat, skinMat);
    const dome = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.65, 1.45), shellMat);
    dome.position.y = 0.58;
    dome.castShadow = true;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.2, 1.54), rimMat);
    rim.position.y = 0.34;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.48), skinMat);
    head.position.set(0, 0.42, 0.88);
    bodyGroup.add(dome, rim, head);
    addLegs(skinMat, [[-0.45, 0.48], [0.45, 0.48], [-0.45, -0.48], [0.45, -0.48]], 0.24, 0.34, 0.34);
  } else if (species === 'lion') {
    name = 'Apex Lion';
    behavior = 'predator';
    maxHp = 180;
    speed = 3.6;
    runSpeed = 10.6;
    radius = 1.05;
    damage = 16;
    rewardCoins = 45;
    hpBarY = 2.55;
    const fur = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
    const mane = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    mats.push(fur, mane);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.78, 1.75), fur);
    body.position.y = 1.0;
    body.castShadow = true;
    const maneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.72), mane);
    maneMesh.position.set(0, 1.24, 0.85);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.54, 0.58), fur);
    head.position.set(0, 1.24, 1.15);
    bodyGroup.add(body, maneMesh, head);
    addLegs(fur, [[-0.28, 0.62], [0.28, 0.62], [-0.28, -0.62], [0.28, -0.62]], 0.22, 0.68, 0.68);
  } else if (species === 'tiger') {
    name = 'Jungle Tiger';
    behavior = 'predator';
    maxHp = 170;
    speed = 3.8;
    runSpeed = 11.2;
    radius = 1.0;
    damage = 15;
    rewardCoins = 45;
    hpBarY = 2.45;
    const fur = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.68 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });
    mats.push(fur, stripeMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.74, 1.8), fur);
    body.position.y = 0.96;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.58), fur);
    head.position.set(0, 1.18, 1.05);
    bodyGroup.add(body, head);
    for (let s = -0.55; s <= 0.55; s += 0.36) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.76, 0.14), stripeMat);
      st.position.set(0, 0.96, s);
      bodyGroup.add(st);
    }
    addLegs(fur, [[-0.27, 0.65], [0.27, 0.65], [-0.27, -0.65], [0.27, -0.65]], 0.21, 0.65, 0.65);
  } else if (species === 'wolf') {
    name = 'Timber Wolf';
    behavior = 'predator';
    maxHp = 90;
    speed = 4.2;
    runSpeed = 11.5;
    radius = 0.78;
    damage = 10;
    rewardCoins = 25;
    hpBarY = 2.05;
    const fur = new THREE.MeshStandardMaterial({ color: isSnow ? 0xe2e8f0 : 0x64748b, roughness: 0.75 });
    mats.push(fur);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 1.35), fur);
    body.position.y = 0.78;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.58), fur);
    head.position.set(0, 1.0, 0.78);
    bodyGroup.add(body, head);
    addLegs(fur, [[-0.19, 0.46], [0.19, 0.46], [-0.19, -0.46], [0.19, -0.46]], 0.15, 0.55, 0.55);
  } else if (species === 'crocodile') {
    name = 'Swamp Crocodile';
    behavior = 'predator';
    maxHp = 160;
    speed = 2.4;
    runSpeed = 8.4;
    radius = 1.15;
    damage = 15;
    rewardCoins = 40;
    hpBarY = 1.75;
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.88 });
    mats.push(scaleMat, ridgeMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 2.2), scaleMat);
    body.position.y = 0.36;
    body.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 1.05), scaleMat);
    snout.position.set(0, 0.34, 1.48);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 1.3), ridgeMat);
    tail.position.set(0, 0.3, -1.55);
    bodyGroup.add(body, snout, tail);
    addLegs(scaleMat, [[-0.52, 0.65], [0.52, 0.65], [-0.52, -0.65], [0.52, -0.65]], 0.2, 0.26, 0.26);
  } else if (species === 'bear') {
    name = isSnow ? 'Arctic Polar Bear' : 'Grizzly Bear';
    behavior = 'defensive';
    maxHp = 260;
    speed = 3.0;
    runSpeed = 9.2;
    radius = 1.28;
    damage = 20;
    rewardCoins = 55;
    hpBarY = 2.95;
    const fur = new THREE.MeshStandardMaterial({ color: isSnow ? 0xf8fafc : 0x78350f, roughness: 0.82 });
    mats.push(fur);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.15, 2.1), fur);
    body.position.y = 1.25;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.72), fur);
    head.position.set(0, 1.56, 1.18);
    bodyGroup.add(body, head);
    addLegs(fur, [[-0.4, 0.72], [0.4, 0.72], [-0.4, -0.72], [0.4, -0.72]], 0.32, 0.78, 0.78);
  } else if (species === 'boar') {
    name = 'Wild Tusked Boar';
    behavior = 'defensive';
    maxHp = 110;
    speed = 3.4;
    runSpeed = 9.8;
    radius = 0.85;
    damage = 12;
    rewardCoins = 25;
    hpBarY = 2.0;
    const fur = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.88 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 });
    mats.push(fur, tuskMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 1.28), fur);
    body.position.y = 0.68;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.5, 0.52), fur);
    head.position.set(0, 0.72, 0.76);
    bodyGroup.add(body, head);
    for (const tx of [-0.18, 0.18]) {
      const tusk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.12), tuskMat);
      tusk.position.set(tx, 0.68, 1.05);
      bodyGroup.add(tusk);
    }
    addLegs(fur, [[-0.24, 0.42], [0.24, 0.42], [-0.24, -0.42], [0.24, -0.42]], 0.16, 0.42, 0.42);
  } else if (species === 'cobra') {
    name = 'King Cobra';
    behavior = 'predator';
    maxHp = 45;
    speed = 3.2;
    runSpeed = 10.4;
    radius = 0.72;
    damage = 12;
    rewardCoins = 15;
    hpBarY = 1.85;
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    mats.push(scaleMat, bandMat, eyeMat);
    const coilA = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 1.05), scaleMat);
    coilA.position.set(0, 0.12, -0.15);
    const coilBand = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 0.25), bandMat);
    coilBand.position.set(0, 0.18, -0.35);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 0.24), scaleMat);
    neck.position.set(0, 0.68, 0.3);
    neck.rotation.x = 0.18;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.14), bandMat);
    hood.position.set(0, 1.0, 0.34);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.42), scaleMat);
    head.position.set(0, 1.18, 0.48);
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.32), eyeMat);
    tongue.position.set(0, 1.12, 0.78);
    for (const ex of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), eyeMat);
      eye.position.set(ex, 1.24, 0.62);
      bodyGroup.add(eye);
    }
    bodyGroup.add(coilA, coilBand, neck, hood, head, tongue);
  } else if (species === 'viper') {
    name = 'Green Pit Viper';
    behavior = 'predator';
    maxHp = 45;
    speed = 3.5;
    runSpeed = 10.8;
    radius = 0.68;
    damage = 12;
    rewardCoins = 15;
    hpBarY = 1.5;
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.48 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    mats.push(greenMat, stripeMat, eyeMat);
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 1.1), greenMat);
    seg1.position.set(0.14, 0.12, -0.35);
    seg1.rotation.y = 0.35;
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.95), stripeMat);
    seg2.position.set(-0.1, 0.14, 0.35);
    seg2.rotation.y = -0.3;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.24), greenMat);
    neck.position.set(0, 0.42, 0.72);
    neck.rotation.x = 0.35;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.36), greenMat);
    head.position.set(0, 0.66, 0.88);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.07), eyeMat);
    eyeL.position.set(-0.15, 0.72, 0.98);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.15;
    bodyGroup.add(seg1, seg2, neck, head, eyeL, eyeR);
  } else if (species === 'komodo') {
    name = 'Komodo Dragon';
    behavior = 'defensive';
    maxHp = 120;
    speed = 2.8;
    runSpeed = 9.0;
    radius = 1.05;
    damage = 16;
    rewardCoins = 30;
    hpBarY = 1.9;
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 });
    mats.push(scaleMat, armorMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.46, 1.85), scaleMat);
    body.position.y = 0.44;
    body.castShadow = true;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 1.65), armorMat);
    spine.position.y = 0.7;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.72), scaleMat);
    head.position.set(0, 0.5, 1.2);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 1.2), armorMat);
    tail.position.set(0, 0.32, -1.38);
    bodyGroup.add(body, spine, head, tail);
    addLegs(scaleMat, [[-0.48, 0.55], [0.48, 0.55], [-0.48, -0.55], [0.48, -0.55]], 0.22, 0.34, 0.34);
  } else if (species === 'chameleon') {
    name = 'Jungle Chameleon';
    behavior = 'defensive';
    maxHp = 30;
    speed = 2.1;
    runSpeed = 6.2;
    radius = 0.58;
    damage = 6;
    rewardCoins = 15;
    hpBarY = 1.45;
    const tealMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.55 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xa3e635, roughness: 0.45 });
    mats.push(tealMat, crestMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.95), tealMat);
    body.position.y = 0.42;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.72), crestMat);
    crest.position.set(0, 0.68, 0.08);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.42), tealMat);
    head.position.set(0, 0.52, 0.62);
    const curl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.34), crestMat);
    curl.position.set(0, 0.45, -0.62);
    bodyGroup.add(body, crest, head, curl);
    addLegs(tealMat, [[-0.24, 0.28], [0.24, 0.28], [-0.24, -0.28], [0.24, -0.28]], 0.12, 0.28, 0.28);
  } else if (species === 'scorpion') {
    name = 'Giant Jungle Scorpion';
    behavior = 'defensive';
    maxHp = 35;
    speed = 3.0;
    runSpeed = 8.4;
    radius = 0.66;
    damage = 8;
    rewardCoins = 15;
    hpBarY = 1.65;
    const chitinMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.35, metalness: 0.35 });
    const stingerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
    mats.push(chitinMat, stingerMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 1.05), chitinMat);
    body.position.y = 0.28;
    const tailUp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), chitinMat);
    tailUp.position.set(0, 0.62, -0.45);
    tailUp.rotation.x = 0.22;
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.34), stingerMat);
    tailTip.position.set(0, 0.96, -0.24);
    for (const px of [-0.42, 0.42]) {
      const pincer = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.54), stingerMat);
      pincer.position.set(px, 0.34, 0.68);
      bodyGroup.add(pincer);
    }
    bodyGroup.add(body, tailUp, tailTip);
    addLegs(chitinMat, [[-0.4, 0.24], [0.4, 0.24], [-0.4, -0.24], [0.4, -0.24]], 0.12, 0.24, 0.24);
  } else {
    // 'villager' (Hostile Island Tribe Warrior: sounds war horns + throws spears / shoots darts)
    name = 'Tribal Warrior';
    behavior = 'villager';
    maxHp = 90;
    speed = 3.2;
    runSpeed = 9.4;
    radius = 0.74;
    damage = 14;
    rewardCoins = 30;
    hpBarY = 2.8;
    const skin = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const tunic = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
    const feather = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const paintMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.45 });
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    mats.push(skin, tunic, feather, paintMat, spearMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.84, 0.46), tunic);
    torso.position.y = 1.06;
    torso.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 0.48), paintMat);
    stripe.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.66), skin);
    head.position.y = 1.82;
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.68), paintMat);
    mask.position.y = 1.86;
    for (const fx of [-0.14, 0, 0.14]) {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.11), feather);
      crown.position.set(fx, 2.28, -0.08);
      bodyGroup.add(crown);
    }
    const spear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.25, 0.1), spearMat);
    spear.position.set(0.52, 1.32, 0.26);
    spear.rotation.x = 0.38;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 4), paintMat);
    tip.position.set(0.52, 2.26, 0.66);
    tip.rotation.x = 0.38;
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 0.18), spearMat);
    bow.position.set(-0.5, 1.2, 0.32);
    bodyGroup.add(torso, stripe, head, mask, spear, tip, bow);
    addLegs(skin, [[-0.2, 0], [0.2, 0]], 0.24, 0.64, 0.64);
  }

  const hpBar = createWildHpBar(species === 'mammoth' ? 2.6 : 1.7);
  hpBar.group.position.set(0, hpBarY, 0);
  if (species === 'villager') {
    (hpBar.fill.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
  } else if (behavior === 'predator') {
    (hpBar.fill.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
  } else {
    (hpBar.fill.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
  }
  root.add(hpBar.group);

  return {
    id,
    species,
    name,
    behavior,
    root,
    bodyGroup,
    legs,
    hpBarGroup: hpBar.group,
    hpBarFill: hpBar.fill,
    x,
    y,
    z,
    spawnX: x,
    spawnY: y,
    spawnZ: z,
    vx: 0,
    vz: 0,
    yaw: Math.random() * Math.PI * 2,
    speed,
    runSpeed,
    radius,
    hp: maxHp,
    maxHp,
    damage,
    rewardCoins,
    alive: true,
    respawnTimer: 0,
    hitFlash: 0,
    isHostile: behavior === 'predator',
    hostileTimer: 0,
    fleeTimer: 0,
    attackCooldown: 0,
    wanderTimer: 1 + Math.random() * 4,
    wanderAngle: Math.random() * Math.PI * 2,
    homeCenter,
    lastAttackerId: null,
    dispose: () => {
      hpBar.dispose();
      mats.forEach((m) => m.dispose());
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}
