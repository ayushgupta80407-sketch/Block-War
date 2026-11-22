import * as THREE from 'three';
import {
  CharacterAnimState,
  CharacterCustomization,
  GrenadeId,
  GunId,
  HeadgearType,
  KnifeId,
  TeamChoice,
  WeaponSlot,
} from './types';
import { createGrenadeModel, createGunModel, createKnifeModel, WeaponModelHandle } from './weapons';

export type ActorRelation = 'ally' | 'enemy' | 'neutral';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  torsoMesh: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  rightHandMount: THREE.Group;
  gunHandle: WeaponModelHandle;
  knifeHandle: WeaponModelHandle;
  grenadeHandle: WeaponModelHandle | null;
  equippedGunId: GunId;
  equippedKnifeId: KnifeId;
  equippedGrenadeId: GrenadeId | null;
  activeSlot: WeaponSlot;
  crownGroup: THREE.Group;
  shieldMesh: THREE.Mesh;
  contactShadow: THREE.Mesh;
  headgearGroup: THREE.Group;
  divingHelmetGroup: THREE.Group;
  throneGroup: THREE.Group;
  moneyRainGroup: THREE.Group;
  nameplateSprite: THREE.Sprite;
  enemyHpBarGroup: THREE.Group;
  flashMaterials: THREE.MeshStandardMaterial[];
  baseColors: THREE.Color[];
  isFirstPerson: boolean;
  setFirstPersonMode: (enabled: boolean) => void;
  setDivingHelmet: (enabled: boolean) => void;
  setWeapons: (gunId: GunId, knifeId: KnifeId, grenadeId?: GrenadeId | null) => void;
  setActiveSlot: (slot: WeaponSlot, grenadeId?: GrenadeId | null) => void;
  setNameplate: (name: string, tag?: string, level?: number, team?: TeamChoice, relation?: ActorRelation) => void;
  updateEnemyHpBar: (hpRatio: number, isHitFlash: boolean, visible: boolean, cameraPos: THREE.Vector3) => void;
  setShadowCasting: (enabled: boolean) => void;
  dispose: () => void;
}

function createRoundedBoxGeometry(width: number, height: number, depth: number, radius = 0.08): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2 - radius;
  const hh = height / 2 - radius;
  shape.moveTo(-hw, -height / 2);
  shape.lineTo(hw, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -hh);
  shape.lineTo(width / 2, hh);
  shape.quadraticCurveTo(width / 2, height / 2, hw, height / 2);
  shape.lineTo(-hw, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, hh);
  shape.lineTo(-width / 2, -hh);
  shape.quadraticCurveTo(-width / 2, -height / 2, -hw, -height / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - radius * 2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: radius,
    bevelThickness: radius,
  });
  geo.center();
  return geo;
}

function markShared<T extends THREE.BufferGeometry>(geo: T): T {
  geo.userData.shared = true;
  return geo;
}

let cachedCharGeos: {
  torso: THREE.BufferGeometry;
  chest: THREE.BufferGeometry;
  pack: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  visorFrame: THREE.BufferGeometry;
  visorStrip: THREE.BufferGeometry;
  eye: THREE.BufferGeometry;
  shoulder: THREE.BufferGeometry;
  arm: THREE.BufferGeometry;
  fist: THREE.BufferGeometry;
  thigh: THREE.BufferGeometry;
  boot: THREE.BufferGeometry;
  crownBase: THREE.BufferGeometry;
  crownTip: THREE.BufferGeometry;
  shield: THREE.BufferGeometry;
  shadow: THREE.BufferGeometry;
  hpBorder: THREE.BufferGeometry;
  hpTrack: THREE.BufferGeometry;
  hpFill: THREE.BufferGeometry;
  diveDome: THREE.BufferGeometry;
  diveRim: THREE.BufferGeometry;
  diveVent: THREE.BufferGeometry;
} | null = null;

function getSharedCharGeos() {
  if (cachedCharGeos) return cachedCharGeos;
  cachedCharGeos = {
    torso: markShared(createRoundedBoxGeometry(0.76, 0.72, 0.54, 0.07)),
    chest: markShared(new THREE.BoxGeometry(0.46, 0.34, 0.08)),
    pack: markShared(createRoundedBoxGeometry(0.48, 0.48, 0.22, 0.04)),
    head: markShared(createRoundedBoxGeometry(0.88, 0.84, 0.86, 0.09)),
    visorFrame: markShared(new THREE.BoxGeometry(0.72, 0.3, 0.12)),
    visorStrip: markShared(new THREE.BoxGeometry(0.64, 0.2, 0.08)),
    eye: markShared(new THREE.BoxGeometry(0.14, 0.14, 0.05)),
    shoulder: markShared(createRoundedBoxGeometry(0.28, 0.24, 0.3, 0.04)),
    arm: markShared(createRoundedBoxGeometry(0.22, 0.42, 0.22, 0.04)),
    fist: markShared(createRoundedBoxGeometry(0.26, 0.24, 0.26, 0.05)),
    thigh: markShared(createRoundedBoxGeometry(0.26, 0.26, 0.28, 0.04)),
    boot: markShared(createRoundedBoxGeometry(0.29, 0.22, 0.36, 0.04)),
    crownBase: markShared(new THREE.CylinderGeometry(0.25, 0.2, 0.14, 6)),
    crownTip: markShared(new THREE.ConeGeometry(0.07, 0.16, 4)),
    shield: markShared(new THREE.SphereGeometry(1.18, 12, 10)),
    shadow: markShared(new THREE.PlaneGeometry(1.5, 1.5)),
    hpBorder: markShared(new THREE.PlaneGeometry(1.56, 0.24)),
    hpTrack: markShared(new THREE.PlaneGeometry(1.48, 0.16)),
    hpFill: markShared(new THREE.PlaneGeometry(1.46, 0.14)),
    diveDome: markShared(new THREE.SphereGeometry(0.68, 16, 12)),
    diveRim: markShared(new THREE.TorusGeometry(0.56, 0.07, 8, 20)),
    diveVent: markShared(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 8)),
  };
  return cachedCharGeos;
}

let cachedContactTex: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedContactTex) return cachedContactTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedContactTex = tex;
  return tex;
}

function buildHeadgear(type: HeadgearType, secondaryMat: THREE.Material, visorMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.2,
    metalness: 0.85,
  });

  if (type === 'crown') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.14, 8), goldMat);
    base.position.y = 0.07;
    group.add(base);
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), goldMat);
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      spike.position.set(Math.cos(angle) * 0.22, 0.2, Math.sin(angle) * 0.22);
      group.add(spike);
    }
  } else if (type === 'horns') {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 6), secondaryMat);
      horn.position.set(side * 0.34, 0.12, 0);
      horn.rotation.z = -side * 0.45;
      group.add(horn);
    }
  } else if (type === 'antenna') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.36, 8), secondaryMat);
    stem.position.y = 0.18;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), visorMat);
    bulb.position.y = 0.38;
    group.add(stem, bulb);
  } else if (type === 'halo') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 8, 24), visorMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    group.add(ring);
  } else if (type === 'headband') {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), secondaryMat);
    band.position.y = -0.15;
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.16), secondaryMat);
    knot.position.set(0.24, -0.18, -0.48);
    knot.rotation.z = 0.4;
    group.add(band, knot);
  } else if (type === 'visor_cap') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.92), secondaryMat);
    cap.position.y = 0.04;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.06, 0.34), secondaryMat);
    brim.position.set(0, -0.01, 0.52);
    group.add(cap, brim);
  }

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
    }
  });
  return group;
}

function createNameplateTexture(
  name: string,
  tag?: string,
  level?: number,
  team?: TeamChoice,
  relation: ActorRelation = 'neutral'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 88;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isAlly = relation === 'ally';
  const bgColor = isAlly ? 'rgba(6, 40, 32, 0.88)' : 'rgba(15, 23, 42, 0.86)';
  const borderColor = isAlly
    ? '#4ade80'
    : team === 'blue'
      ? '#38bdf8'
      : team === 'red'
        ? '#fb7185'
        : '#f59e0b';

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 10, canvas.width - 16, canvas.height - 20, 14);
  ctx.fill();
  ctx.stroke();

  if (team || isAlly) {
    ctx.fillStyle = borderColor;
    ctx.fillRect(16, 20, 10, canvas.height - 40);
  }

  const displayTitle = tag ? `${name}#${tag}` : name;
  ctx.font = 'bold 26px Inter, system-ui, sans-serif';
  ctx.fillStyle = isAlly ? '#4ade80' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayTitle.slice(0, 20), canvas.width / 2, 35);

  const sub = isAlly
    ? `ALLY · ${team ? team.toUpperCase() + ' SQUAD · ' : ''}LV.${level ?? 1}`
    : `${team ? (team === 'blue' ? 'BLUE TEAM' : 'RED TEAM') + ' · ' : ''}LV.${level ?? 1}`;
  ctx.font = 'bold 17px Inter, system-ui, sans-serif';
  ctx.fillStyle = isAlly ? '#7dd3fc' : team === 'blue' ? '#7dd3fc' : team === 'red' ? '#fda4af' : '#fcd34d';
  ctx.fillText(sub, canvas.width / 2, 60);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBlockCharacterRig(
  custom: CharacterCustomization,
  castShadow = true,
  gunId: GunId = 'basic_pistol',
  knifeId: KnifeId = 'basic_knife',
  grenadeId: GrenadeId | null = 'frag_grenade'
): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const primaryColor = new THREE.Color(custom.primaryColor);
  const secondaryColor = new THREE.Color(custom.secondaryColor);
  const visorColor = new THREE.Color(custom.visorColor);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.36,
    metalness: 0.14,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.25,
    metalness: 0.65,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    metalness: 0.08,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: visorColor,
    emissive: visorColor,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.3,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    roughness: 0.1,
  });

  const geos = getSharedCharGeos();

  const torsoMesh = new THREE.Mesh(geos.torso, primaryMat);
  torsoMesh.position.y = 0.78;
  torsoMesh.castShadow = castShadow;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  const chestPlate = new THREE.Mesh(geos.chest, secondaryMat);
  chestPlate.position.set(0, 0.8, 0.27);
  chestPlate.castShadow = castShadow;
  bodyPivot.add(chestPlate);

  const pack = new THREE.Mesh(geos.pack, secondaryMat);
  pack.position.set(0, 0.82, -0.34);
  pack.castShadow = castShadow;
  bodyPivot.add(pack);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62, 0);
  bodyPivot.add(headGroup);

  const headMesh = new THREE.Mesh(geos.head, primaryMat);
  headMesh.castShadow = castShadow;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  const visorFrame = new THREE.Mesh(geos.visorFrame, bootMat);
  visorFrame.position.set(0, 0.04, 0.4);
  headGroup.add(visorFrame);

  const visorStrip = new THREE.Mesh(geos.visorStrip, visorMat);
  visorStrip.position.set(0, 0.04, 0.43);
  headGroup.add(visorStrip);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(geos.eye, eyeMat);
    eye.position.set(side * 0.17, 0.05, 0.46);
    headGroup.add(eye);
  }

  const headgearGroup = buildHeadgear(custom.headgear, secondaryMat, visorMat);
  headgearGroup.position.set(0, 0.42, 0);
  headGroup.add(headgearGroup);

  // Auto-Equipped Transparent 3D Glass Diving Helmet (activates when submerged underwater)
  const divingHelmetGroup = new THREE.Group();
  divingHelmetGroup.visible = false;
  const diveGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.28,
    roughness: 0.06,
    metalness: 0.15,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const diveCollarMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.7,
  });
  const diveDome = new THREE.Mesh(geos.diveDome, diveGlassMat);
  diveDome.position.set(0, 0.04, 0);
  const diveRim = new THREE.Mesh(geos.diveRim, diveCollarMat);
  diveRim.rotation.x = Math.PI / 2;
  diveRim.position.set(0, -0.4, 0);
  divingHelmetGroup.add(diveDome, diveRim);
  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(geos.diveVent, diveCollarMat);
    vent.position.set(side * 0.48, -0.15, -0.26);
    vent.rotation.z = side * 0.15;
    divingHelmetGroup.add(vent);
  }
  headGroup.add(divingHelmetGroup);

  const buildArm = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.54, 1.05, 0);
    const shoulder = new THREE.Mesh(geos.shoulder, secondaryMat);
    shoulder.position.y = -0.05;
    shoulder.castShadow = castShadow;
    const arm = new THREE.Mesh(geos.arm, primaryMat);
    arm.position.y = -0.32;
    arm.castShadow = castShadow;
    const fist = new THREE.Mesh(geos.fist, secondaryMat);
    fist.position.y = -0.56;
    fist.castShadow = castShadow;
    pivot.add(shoulder, arm, fist);
    return pivot;
  };
  const leftArmPivot = buildArm(-1);
  const rightArmPivot = buildArm(1);
  bodyPivot.add(leftArmPivot, rightArmPivot);

  const rightHandMount = new THREE.Group();
  rightHandMount.position.set(0, -0.56, 0.12);
  rightArmPivot.add(rightHandMount);

  let currentGunId = gunId;
  let currentKnifeId = knifeId;
  let currentGrenadeId: GrenadeId | null = grenadeId;
  let currentSlot: WeaponSlot = 'gun';
  let gunHandle = createGunModel(gunId);
  let knifeHandle = createKnifeModel(knifeId);
  let grenadeHandle: WeaponModelHandle | null = grenadeId ? createGrenadeModel(grenadeId) : null;
  gunHandle.group.rotation.x = Math.PI / 2;
  knifeHandle.group.rotation.x = Math.PI / 2;
  knifeHandle.group.visible = false;
  rightHandMount.add(gunHandle.group, knifeHandle.group);
  if (grenadeHandle) {
    grenadeHandle.group.visible = false;
    rightHandMount.add(grenadeHandle.group);
  }

  const buildLeg = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.21, 0.44, 0);
    const thigh = new THREE.Mesh(geos.thigh, primaryMat);
    thigh.position.y = -0.14;
    thigh.castShadow = castShadow;
    const boot = new THREE.Mesh(geos.boot, bootMat);
    boot.position.set(0, -0.33, 0.04);
    boot.castShadow = castShadow;
    pivot.add(thigh, boot);
    return pivot;
  };
  const leftLegPivot = buildLeg(-1);
  const rightLegPivot = buildLeg(1);
  bodyPivot.add(leftLegPivot, rightLegPivot);

  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, 2.55, 0);
  crownGroup.visible = false;
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.9,
  });
  const crownBase = new THREE.Mesh(geos.crownBase, crownMat);
  crownGroup.add(crownBase);
  for (let i = 0; i < 3; i++) {
    const tip = new THREE.Mesh(geos.crownTip, crownMat);
    const a = (i / 3) * Math.PI * 2;
    tip.position.set(Math.cos(a) * 0.16, 0.14, Math.sin(a) * 0.16);
    crownGroup.add(tip);
  }
  root.add(crownGroup);

  const shieldMesh = new THREE.Mesh(
    geos.shield,
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      wireframe: true,
    })
  );
  shieldMesh.position.y = 1.05;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  const contactShadow = new THREE.Mesh(
    geos.shadow,
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  let nameplateKey = '';
  let nameplateTex = createNameplateTexture('Fighter', undefined, 1, undefined, 'neutral');
  const nameplateMat = new THREE.SpriteMaterial({
    map: nameplateTex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const nameplateSprite = new THREE.Sprite(nameplateMat);
  nameplateSprite.position.set(0, 3.05, 0);
  nameplateSprite.scale.set(2.35, 0.52, 1);
  nameplateSprite.visible = false;
  root.add(nameplateSprite);

  // Floating Enemy Red Health Bar
  const enemyHpBarGroup = new THREE.Group();
  enemyHpBarGroup.position.set(0, 2.55, 0);
  enemyHpBarGroup.visible = false;

  const hpBorderMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const hpBorderMesh = new THREE.Mesh(geos.hpBorder, hpBorderMat);
  enemyHpBarGroup.add(hpBorderMesh);

  const hpTrackMat = new THREE.MeshBasicMaterial({
    color: 0x1e293b,
    depthWrite: false,
  });
  const hpTrackMesh = new THREE.Mesh(geos.hpTrack, hpTrackMat);
  hpTrackMesh.position.z = 0.005;
  enemyHpBarGroup.add(hpTrackMesh);

  const hpFillMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    depthWrite: false,
  });
  const hpFillMesh = new THREE.Mesh(geos.hpFill, hpFillMat);
  hpFillMesh.position.z = 0.01;
  enemyHpBarGroup.add(hpFillMesh);

  // Emote Props: Golden 3D Throne & Trophy + Floating Cash Bills
  const throneGroup = new THREE.Group();
  throneGroup.visible = false;
  const goldThroneMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xb45309,
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.88,
  });
  const velvetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });
  const throneSeat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.96), goldThroneMat);
  throneSeat.position.set(0, 0.42, -0.05);
  const velvetCushion = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.78), velvetMat);
  velvetCushion.position.set(0, 0.56, -0.02);
  const throneBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.45, 0.2), goldThroneMat);
  throneBack.position.set(0, 1.18, -0.48);
  const backGem = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.24), velvetMat);
  backGem.position.set(0, 1.62, -0.47);
  throneGroup.add(throneSeat, velvetCushion, throneBack, backGem);
  for (const sx of [-0.52, 0.52]) {
    const legF = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), goldThroneMat);
    legF.position.set(sx, 0.21, 0.34);
    const legB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), goldThroneMat);
    legB.position.set(sx, 0.21, -0.44);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.88), goldThroneMat);
    arm.position.set(sx, 0.74, -0.06);
    throneGroup.add(legF, legB, arm);
  }
  const trophyCup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.11, 0.32, 8), goldThroneMat);
  trophyCup.position.set(0.55, 1.05, 0.2);
  throneGroup.add(trophyCup);
  root.add(throneGroup);

  const moneyRainGroup = new THREE.Group();
  moneyRainGroup.visible = false;
  const billMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const billGeo = new THREE.BoxGeometry(0.34, 0.03, 0.18);
  for (let b = 0; b < 10; b++) {
    const bill = new THREE.Mesh(billGeo, billMat);
    const ang = (b / 10) * Math.PI * 2;
    bill.position.set(Math.cos(ang) * 0.75, 1.4 + (b % 3) * 0.45, Math.sin(ang) * 0.75);
    moneyRainGroup.add(bill);
  }
  root.add(moneyRainGroup);

  root.add(enemyHpBarGroup);
  let smoothedHpRatio = 1;
  let shadowEnabled = castShadow;

  const flashMaterials = [primaryMat, secondaryMat];
  const baseColors = [primaryColor.clone(), secondaryColor.clone()];

  const rig: CharacterRig = {
    root,
    bodyPivot,
    headGroup,
    torsoMesh,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    rightHandMount,
    gunHandle,
    knifeHandle,
    grenadeHandle,
    equippedGunId: currentGunId,
    equippedKnifeId: currentKnifeId,
    equippedGrenadeId: currentGrenadeId,
    activeSlot: currentSlot,
    crownGroup,
    shieldMesh,
    contactShadow,
    headgearGroup,
    divingHelmetGroup,
    throneGroup,
    moneyRainGroup,
    nameplateSprite,
    enemyHpBarGroup,
    flashMaterials,
    baseColors,
    isFirstPerson: false,
    setFirstPersonMode: (enabled: boolean) => {
      if (rig.isFirstPerson === enabled) return;
      rig.isFirstPerson = enabled;
      headGroup.visible = !enabled;
      torsoMesh.visible = !enabled;
      chestPlate.visible = !enabled;
      pack.visible = !enabled;
      leftArmPivot.visible = !enabled;
      leftLegPivot.visible = !enabled;
      rightLegPivot.visible = !enabled;
      if (enabled) {
        crownGroup.visible = false;
        shieldMesh.visible = false;
        nameplateSprite.visible = false;
        enemyHpBarGroup.visible = false;
        rightArmPivot.position.set(0.42, 1.38, 0.34);
      } else {
        nameplateSprite.visible = Boolean(nameplateKey);
        rightArmPivot.position.set(0.54, 1.05, 0);
      }
    },
    setDivingHelmet: (enabled: boolean) => {
      if (divingHelmetGroup.visible === enabled) return;
      divingHelmetGroup.visible = enabled;
      headgearGroup.visible = !enabled;
    },
    setWeapons: (newGun: GunId, newKnife: KnifeId, newGrenade?: GrenadeId | null) => {
      if (newGun !== currentGunId) {
        rightHandMount.remove(gunHandle.group);
        gunHandle.dispose();
        gunHandle = createGunModel(newGun);
        gunHandle.group.rotation.x = Math.PI / 2;
        rightHandMount.add(gunHandle.group);
        currentGunId = newGun;
        rig.gunHandle = gunHandle;
        rig.equippedGunId = newGun;
      }
      if (newKnife !== currentKnifeId) {
        rightHandMount.remove(knifeHandle.group);
        knifeHandle.dispose();
        knifeHandle = createKnifeModel(newKnife);
        knifeHandle.group.rotation.x = Math.PI / 2;
        knifeHandle.group.visible = false;
        rightHandMount.add(knifeHandle.group);
        currentKnifeId = newKnife;
        rig.knifeHandle = knifeHandle;
        rig.equippedKnifeId = newKnife;
      }
      if (newGrenade !== undefined && newGrenade !== currentGrenadeId) {
        if (grenadeHandle) {
          rightHandMount.remove(grenadeHandle.group);
          grenadeHandle.dispose();
          grenadeHandle = null;
        }
        if (newGrenade) {
          grenadeHandle = createGrenadeModel(newGrenade);
          grenadeHandle.group.visible = currentSlot === 'grenade';
          rightHandMount.add(grenadeHandle.group);
        }
        currentGrenadeId = newGrenade;
        rig.grenadeHandle = grenadeHandle;
        rig.equippedGrenadeId = newGrenade;
      }
    },
    setActiveSlot: (slot: WeaponSlot, newGrenade?: GrenadeId | null) => {
      currentSlot = slot;
      rig.activeSlot = slot;
      if (newGrenade !== undefined && newGrenade !== currentGrenadeId) {
        rig.setWeapons(currentGunId, currentKnifeId, newGrenade);
      }
    },
    setNameplate: (
      name: string,
      tag?: string,
      level?: number,
      team?: TeamChoice,
      relation: ActorRelation = 'neutral'
    ) => {
      const nextKey = `${name}|${tag ?? ''}|${level ?? 1}|${team ?? ''}|${relation}`;
      if (nextKey === nameplateKey) return;
      nameplateKey = nextKey;
      nameplateTex.dispose();
      nameplateTex = createNameplateTexture(name, tag, level, team, relation);
      nameplateMat.map = nameplateTex;
      nameplateMat.needsUpdate = true;
      nameplateSprite.visible = !rig.isFirstPerson;
    },
    updateEnemyHpBar: (hpRatio: number, isHitFlash: boolean, visible: boolean, cameraPos: THREE.Vector3) => {
      if (!visible || rig.isFirstPerson) {
        enemyHpBarGroup.visible = false;
        return;
      }
      enemyHpBarGroup.visible = true;
      enemyHpBarGroup.lookAt(cameraPos);
      const clamped = Math.max(0, Math.min(1, hpRatio));
      if (clamped > smoothedHpRatio + 0.45) smoothedHpRatio = clamped;
      else smoothedHpRatio = THREE.MathUtils.lerp(smoothedHpRatio, clamped, 0.35);
      const displayRatio = Math.max(0.001, smoothedHpRatio);
      hpFillMesh.scale.x = displayRatio;
      hpFillMesh.position.x = -(1 - displayRatio) * 0.73;

      if (isHitFlash) {
        hpFillMat.color.setHex(0xffffff);
        hpBorderMat.color.setHex(0xfca5a5);
      } else {
        hpFillMat.color.setHex(clamped > 0.3 ? 0xef4444 : 0xdc2626);
        hpBorderMat.color.setHex(0x090d16);
      }
    },
    setShadowCasting: (enabled: boolean) => {
      if (shadowEnabled === enabled) return;
      shadowEnabled = enabled;
      bodyPivot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.castShadow !== enabled) m.castShadow = enabled;
      });
    },
    dispose: () => {
      gunHandle.dispose();
      knifeHandle.dispose();
      grenadeHandle?.dispose();
      nameplateTex.dispose();
      nameplateMat.dispose();
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          if (m.geometry && !m.geometry.userData?.shared) {
            m.geometry.dispose();
          }
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
    },
  };

  return rig;
}

export function animateCharacterRig(
  rig: CharacterRig,
  anim: CharacterAnimState,
  time: number,
  dt: number,
  attackTimer = 0,
  hitFlash = 0
): void {
  const lerpAlpha = 1 - Math.exp(-16 * dt);

  for (let i = 0; i < rig.flashMaterials.length; i++) {
    const mat = rig.flashMaterials[i];
    if (hitFlash > 0) {
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = Math.min(1, hitFlash * 3);
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  const isEmoting = anim.startsWith('emote_');
  const isSlashing = anim === 'slash';
  const showKnife = !isEmoting && (isSlashing || rig.activeSlot === 'knife');
  const showGrenade = !isEmoting && !isSlashing && rig.activeSlot === 'grenade' && Boolean(rig.grenadeHandle);
  const showGun = !isEmoting && !showKnife && !showGrenade;

  rig.gunHandle.group.visible = showGun;
  rig.knifeHandle.group.visible = showKnife;
  if (rig.grenadeHandle) {
    rig.grenadeHandle.group.visible = showGrenade;
  }
  rig.throneGroup.visible = anim === 'emote_throne' && !rig.isFirstPerson;
  rig.moneyRainGroup.visible = anim === 'emote_money' && !rig.isFirstPerson;

  if (!isSlashing) {
    rig.knifeHandle.group.rotation.y = 0;
    if (rig.knifeHandle.animatedPartA && rig.knifeHandle.animatedPartB) {
      rig.knifeHandle.animatedPartA.rotation.z = -0.18;
      rig.knifeHandle.animatedPartB.rotation.z = 0.18;
    }
  }
  if (anim !== 'reload') {
    rig.gunHandle.group.rotation.z = 0;
  }

  let targetBodyY = 0;
  let targetBodyRotX = 0;
  let targetBodyRotY = 0;
  let targetBodyRotZ = 0;
  let targetScaleY = 1;
  let targetScaleXZ = 1;
  let targetLeftArmX = 0;
  let targetRightArmX = showKnife ? -0.95 : showGrenade ? -1.05 : -1.25;
  let targetLeftArmZ = 0.12;
  let targetRightArmZ = -0.06;
  let targetLeftLegX = 0;
  let targetRightLegX = 0;
  let targetHeadY = 1.62;
  let targetHeadRotX = 0;
  let targetHeadRotY = 0;

  if (anim === 'idle') {
    const breathe = Math.sin(time * 2.8);
    targetBodyY = breathe * 0.03;
    targetLeftArmX = Math.sin(time * 2.0) * 0.08;
    targetRightArmX = (showKnife ? -0.92 : showGrenade ? -1.0 : -1.1) + breathe * 0.04;
    targetHeadRotY = Math.sin(time * 1.1) * 0.14;
  } else if (anim === 'walk') {
    const cyc = time * 8.5;
    targetBodyY = Math.abs(Math.sin(cyc)) * 0.08;
    targetBodyRotX = 0.08;
    targetLeftLegX = Math.sin(cyc) * 0.65;
    targetRightLegX = -Math.sin(cyc) * 0.65;
    targetLeftArmX = -Math.sin(cyc) * 0.5;
    targetRightArmX = (showKnife ? -0.95 : -1.2) + Math.sin(cyc) * 0.1;
    targetHeadRotY = Math.sin(cyc * 0.5) * 0.08;
  } else if (anim === 'run') {
    const cyc = time * 14.0;
    targetBodyY = Math.abs(Math.sin(cyc)) * 0.14;
    targetBodyRotX = 0.22;
    targetLeftLegX = Math.sin(cyc) * 0.95;
    targetRightLegX = -Math.sin(cyc) * 0.95;
    targetLeftArmX = -Math.sin(cyc) * 0.9;
    targetRightArmX = (showKnife ? -0.8 : -1.3) + Math.sin(cyc) * 0.14;
    targetLeftArmZ = 0.22;
    targetRightArmZ = -0.14;
    targetHeadRotX = -0.12;
  } else if (anim === 'swim') {
    const stroke = time * 7.5;
    targetBodyY = -0.2 + Math.sin(stroke) * 0.08;
    targetBodyRotX = 0.35;
    targetLeftArmX = -1.6 + Math.sin(stroke) * 0.9;
    targetLeftArmZ = 0.45;
    targetRightArmX = -1.25 + Math.cos(stroke) * 0.2;
    targetLeftLegX = Math.sin(stroke * 1.4) * 0.6;
    targetRightLegX = -Math.sin(stroke * 1.4) * 0.6;
  } else if (anim === 'diving') {
    const stroke = time * 6.5;
    targetBodyY = -0.1 + Math.sin(stroke) * 0.06;
    targetBodyRotX = 0.72;
    targetHeadRotX = -0.55;
    targetLeftArmX = -1.75 + Math.sin(stroke) * 0.7;
    targetLeftArmZ = 0.55;
    targetRightArmX = -1.35 + Math.cos(stroke) * 0.16;
    targetLeftLegX = Math.sin(stroke * 1.6) * 0.72;
    targetRightLegX = -Math.sin(stroke * 1.6) * 0.72;
  } else if (anim === 'ride') {
    targetBodyY = -0.15;
    targetLeftLegX = -0.95;
    targetRightLegX = -0.95;
    targetLeftArmX = -0.95;
    targetRightArmX = showKnife ? -0.95 : showGrenade ? -1.05 : -1.32;
    targetLeftArmZ = 0.24;
  } else if (anim === 'crawl') {
    const cyc = time * 4.2;
    targetBodyY = -0.45;
    targetBodyRotX = 0.92;
    targetHeadRotX = -0.65;
    targetLeftArmX = -1.2 + Math.sin(cyc) * 0.45;
    targetRightArmX = -1.2 - Math.sin(cyc) * 0.45;
    targetLeftLegX = 0.35 - Math.sin(cyc) * 0.35;
    targetRightLegX = 0.35 + Math.sin(cyc) * 0.35;
  } else if (anim === 'crouch') {
    const breathe = Math.sin(time * 2.4);
    targetBodyY = -0.34 + breathe * 0.015;
    targetBodyRotX = 0.22;
    targetHeadRotX = -0.14;
    targetLeftLegX = -0.58;
    targetRightLegX = 0.42;
    targetLeftArmX = -0.35;
    targetRightArmX = showKnife ? -0.95 : showGrenade ? -1.05 : -1.22;
  } else if (anim === 'sit') {
    const breathe = Math.sin(time * 1.8);
    targetBodyY = -0.36 + breathe * 0.015;
    targetBodyRotX = -0.06;
    targetLeftLegX = -1.36;
    targetRightLegX = -1.36;
    targetLeftArmX = -0.24;
    targetLeftArmZ = 0.14;
    targetRightArmX = -0.24;
    targetRightArmZ = -0.14;
    targetHeadRotY = Math.sin(time * 0.7) * 0.22;
  } else if (anim === 'jump') {
    targetBodyRotX = -0.12;
    targetScaleY = 1.08;
    targetScaleXZ = 0.95;
    targetLeftArmX = -1.9;
    targetRightArmX = -1.45;
    targetLeftArmZ = 0.45;
    targetRightArmZ = -0.25;
    targetLeftLegX = 0.5;
    targetRightLegX = -0.4;
  } else if (anim === 'attack') {
    const recoil = Math.sin(Math.min(1, attackTimer / 0.18) * Math.PI);
    targetRightArmX = -1.45 - recoil * 0.42;
    targetBodyRotX = -0.08 * recoil;
    targetLeftArmX = 0.25;
  } else if (anim === 'reload') {
    const cycle = Math.sin(time * 9.5);
    targetRightArmX = -0.82 + cycle * 0.18;
    targetRightArmZ = 0.45;
    targetLeftArmX = -1.15 - cycle * 0.22;
    targetLeftArmZ = -0.42;
    targetHeadRotX = 0.16;
    rig.gunHandle.group.rotation.z = 0.55;
  } else if (anim === 'throw') {
    const p = Math.max(0, Math.min(1, 1 - attackTimer / 0.28));
    targetRightArmX = -2.4 + p * 1.9;
    targetBodyRotX = -0.18 + p * 0.34;
    targetLeftArmX = 0.3;
  } else if (anim === 'slash') {
    const p = Math.max(0, Math.min(1, 1 - attackTimer / 0.32));
    const swing = Math.sin(p * Math.PI);
    if (rig.equippedKnifeId === 'shadow_karambit') {
      targetBodyRotY = -0.7 + p * Math.PI * 1.4;
      targetRightArmX = -1.7;
      targetRightArmZ = -0.9;
      rig.knifeHandle.group.rotation.y = p * Math.PI * 4;
    } else if (rig.equippedKnifeId === 'butterfly_blade') {
      targetRightArmX = -1.55 - swing * 0.5;
      targetRightArmZ = -0.5 + swing * 0.9;
      if (rig.knifeHandle.animatedPartA && rig.knifeHandle.animatedPartB) {
        rig.knifeHandle.animatedPartA.rotation.z = -0.2 - swing * 1.6;
        rig.knifeHandle.animatedPartB.rotation.z = 0.2 + swing * 1.6;
      }
    } else if (rig.equippedKnifeId === 'dragon_blade' || rig.equippedKnifeId === 'pixel_blade') {
      targetBodyRotY = -1.1 + p * Math.PI * 1.8;
      targetBodyRotX = 0.24 * swing;
      targetRightArmX = -1.85;
      targetRightArmZ = -1.05;
      rig.knifeHandle.group.rotation.y = 0;
    } else {
      targetRightArmX = -1.8 + swing * 1.1;
      targetBodyRotX = 0.18 * swing;
      rig.knifeHandle.group.rotation.y = 0;
    }
    targetScaleXZ = 1 + 0.08 * swing;
  } else if (anim === 'win') {
    const bounce = Math.abs(Math.sin(time * 6.5));
    targetBodyY = bounce * 0.42;
    targetBodyRotY = time * 2.2;
    targetLeftArmX = -2.4;
    targetRightArmX = -2.4;
    targetLeftArmZ = 0.45;
    targetRightArmZ = -0.45;
    targetHeadRotY = Math.sin(time * 4) * 0.2;
  } else if (anim === 'defeat') {
    targetBodyY = -0.28;
    targetBodyRotX = 0.48;
    targetBodyRotZ = Math.sin(time * 5) * 0.18;
    targetHeadRotX = 0.35;
    targetHeadRotY = Math.sin(time * 8) * 0.35;
    targetLeftArmX = 0.5;
    targetRightArmX = 0.5;
    targetLeftArmZ = 0.65;
    targetRightArmZ = -0.65;
  } else if (anim === 'emote_wave') {
    targetBodyY = Math.sin(time * 3.5) * 0.04;
    targetRightArmX = -2.45;
    targetRightArmZ = -0.35 - Math.sin(time * 9.5) * 0.48;
    targetLeftArmX = -0.15;
    targetHeadRotY = Math.sin(time * 3) * 0.22;
    targetHeadRotX = -0.06;
  } else if (anim === 'emote_laugh') {
    const shake = Math.sin(time * 16);
    targetBodyY = -0.14 + Math.abs(shake) * 0.09;
    targetBodyRotX = 0.32 + shake * 0.1;
    targetHeadRotX = -0.22 + shake * 0.14;
    targetLeftArmX = -0.85;
    targetLeftArmZ = 0.35;
    targetRightArmX = -1.25 + Math.sin(time * 8) * 0.2;
    targetRightArmZ = -0.15;
    targetLeftLegX = -0.22;
    targetRightLegX = 0.22;
  } else if (anim === 'emote_booyah') {
    const beat = time * 8.5;
    targetBodyY = Math.abs(Math.sin(beat)) * 0.32;
    targetBodyRotY = Math.sin(time * 3.4) * 0.85;
    targetLeftArmX = -2.1 + Math.sin(beat) * 0.5;
    targetRightArmX = -2.1 - Math.sin(beat) * 0.5;
    targetLeftArmZ = 0.42;
    targetRightArmZ = -0.42;
    targetLeftLegX = Math.sin(beat) * 0.48;
    targetRightLegX = -Math.sin(beat) * 0.48;
  } else if (anim === 'emote_dab') {
    targetBodyY = -0.1;
    targetBodyRotY = -0.42;
    targetBodyRotZ = 0.14;
    targetHeadRotX = 0.44;
    targetHeadRotY = 0.48;
    targetLeftArmX = -1.65;
    targetLeftArmZ = 1.15;
    targetRightArmX = -1.85;
    targetRightArmZ = -0.95;
    targetLeftLegX = -0.25;
    targetRightLegX = 0.25;
  } else if (anim === 'emote_chicken') {
    const flap = Math.sin(time * 13);
    targetBodyY = Math.abs(flap) * 0.1;
    targetBodyRotX = 0.26 + Math.sin(time * 6.5) * 0.12;
    targetHeadRotX = Math.sin(time * 6.5) * 0.32;
    targetLeftArmX = -0.55;
    targetRightArmX = -0.55;
    targetLeftArmZ = 0.75 + flap * 0.65;
    targetRightArmZ = -0.75 - flap * 0.65;
    targetLeftLegX = Math.sin(time * 8) * 0.35;
    targetRightLegX = -Math.sin(time * 8) * 0.35;
  } else if (anim === 'emote_kungfu') {
    const punch = time * 10;
    targetBodyY = -0.18 + Math.abs(Math.sin(punch)) * 0.12;
    targetBodyRotY = Math.sin(time * 2.5) * 0.9;
    targetLeftArmX = -1.45 + Math.sin(punch) * 0.85;
    targetRightArmX = -1.45 - Math.sin(punch) * 0.85;
    targetLeftArmZ = 0.38;
    targetRightArmZ = -0.38;
    targetLeftLegX = -0.45;
    targetRightLegX = 0.45;
  } else if (anim === 'emote_pushups') {
    const press = (Math.sin(time * 7.2) + 1) * 0.5;
    targetBodyY = -0.52 + press * 0.28;
    targetBodyRotX = 1.28;
    targetHeadRotX = -0.75;
    targetLeftArmX = -1.45 + press * 0.45;
    targetRightArmX = -1.45 + press * 0.45;
    targetLeftArmZ = 0.24;
    targetRightArmZ = -0.24;
    targetLeftLegX = 0.12;
    targetRightLegX = 0.12;
  } else if (anim === 'emote_moonwalk') {
    const slide = time * 7.5;
    targetBodyY = Math.abs(Math.sin(slide)) * 0.06;
    targetBodyRotX = -0.14;
    targetBodyRotZ = Math.sin(slide * 0.5) * 0.12;
    targetLeftLegX = -Math.sin(slide) * 0.68;
    targetRightLegX = Math.sin(slide) * 0.68;
    targetLeftArmX = Math.sin(slide) * 0.45;
    targetRightArmX = -Math.sin(slide) * 0.45;
    targetHeadRotY = Math.sin(time * 2.4) * 0.32;
  } else if (anim === 'emote_money') {
    const toss = Math.sin(time * 9);
    targetBodyY = Math.abs(toss) * 0.1;
    targetLeftArmX = -1.8 + toss * 0.55;
    targetRightArmX = -1.8 - toss * 0.55;
    targetLeftArmZ = 0.35;
    targetRightArmZ = -0.35;
    targetHeadRotX = -0.18;
    rig.moneyRainGroup.rotation.y = time * 1.8;
    for (let i = 0; i < rig.moneyRainGroup.children.length; i++) {
      const bill = rig.moneyRainGroup.children[i];
      const phase = ((time * 1.15 + i * 0.27) % 1);
      bill.position.y = 2.6 - phase * 2.4;
      bill.rotation.x = time * 4 + i;
      bill.rotation.z = Math.sin(time * 5 + i) * 0.6;
    }
  } else if (anim === 'emote_throne') {
    targetBodyY = -0.18;
    targetBodyRotX = -0.05;
    targetLeftLegX = -1.36;
    targetRightLegX = -1.36;
    targetLeftArmX = -0.45;
    targetLeftArmZ = 0.38;
    targetRightArmX = -0.52;
    targetRightArmZ = -0.35;
    targetHeadRotY = Math.sin(time * 1.4) * 0.18;
  }

  rig.bodyPivot.position.y = THREE.MathUtils.lerp(rig.bodyPivot.position.y, targetBodyY, lerpAlpha);
  rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(rig.bodyPivot.rotation.x, targetBodyRotX, lerpAlpha);
  rig.bodyPivot.rotation.y =
    anim === 'win'
      ? targetBodyRotY
      : THREE.MathUtils.lerp(rig.bodyPivot.rotation.y, targetBodyRotY, lerpAlpha);
  rig.bodyPivot.rotation.z = THREE.MathUtils.lerp(rig.bodyPivot.rotation.z, targetBodyRotZ, lerpAlpha);

  rig.bodyPivot.scale.y = THREE.MathUtils.lerp(rig.bodyPivot.scale.y, targetScaleY, lerpAlpha);
  rig.bodyPivot.scale.x = THREE.MathUtils.lerp(rig.bodyPivot.scale.x, targetScaleXZ, lerpAlpha);
  rig.bodyPivot.scale.z = THREE.MathUtils.lerp(rig.bodyPivot.scale.z, targetScaleXZ, lerpAlpha);

  rig.leftArmPivot.rotation.x = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.x, targetLeftArmX, lerpAlpha);
  rig.rightArmPivot.rotation.x = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.x, targetRightArmX, lerpAlpha);
  rig.leftArmPivot.rotation.z = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.z, targetLeftArmZ, lerpAlpha);
  rig.rightArmPivot.rotation.z = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.z, targetRightArmZ, lerpAlpha);

  rig.leftLegPivot.rotation.x = THREE.MathUtils.lerp(rig.leftLegPivot.rotation.x, targetLeftLegX, lerpAlpha);
  rig.rightLegPivot.rotation.x = THREE.MathUtils.lerp(rig.rightLegPivot.rotation.x, targetRightLegX, lerpAlpha);

  rig.headGroup.position.y = THREE.MathUtils.lerp(rig.headGroup.position.y, targetHeadY, lerpAlpha);
  rig.headGroup.rotation.x = THREE.MathUtils.lerp(rig.headGroup.rotation.x, targetHeadRotX, lerpAlpha);
  rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, targetHeadRotY, lerpAlpha);

  if (rig.isFirstPerson) {
    rig.crownGroup.visible = false;
    rig.shieldMesh.visible = false;
  } else {
    if (rig.crownGroup.visible) {
      rig.crownGroup.rotation.y = time * 2.2;
      rig.crownGroup.position.y = 2.55 + Math.sin(time * 4.0) * 0.08;
    }
    if (rig.shieldMesh.visible) {
      rig.shieldMesh.rotation.y = time * 1.5;
      rig.shieldMesh.rotation.x = time * 0.8;
    }
  }
}
