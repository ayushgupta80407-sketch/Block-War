import * as THREE from 'three';
import { BoatKind, FlyingMountKind, LandAnimalMountKind, MarineMountKind, MountType, VehicleKind } from './types';

export interface LocalDeckBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  kind: 'floor' | 'wall' | 'ramp';
  slopeAxis?: 'x' | 'z';
  slopeDir?: 1 | -1;
}

export interface MountEntity {
  id: string;
  kind: MountType;
  isBoat?: boolean;
  isMarineMount?: boolean;
  isFlyingMount?: boolean;
  isLandAnimal?: boolean;
  isHelicopter?: boolean;
  isTank?: boolean;
  isPolice?: boolean;
  turretPivot?: THREE.Object3D;
  sirenMeshes?: [THREE.Mesh, THREE.Mesh];
  fireCooldown?: number;
  name: string;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  legs: THREE.Object3D[];
  wings?: [THREE.Object3D, THREE.Object3D];
  tailPivot?: THREE.Object3D;
  propsToSpin?: THREE.Object3D[];
  hpBarFill: THREE.Mesh;
  hpBarGroup: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  speed: number;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  spawnYaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  riderId: string | null;
  lastAttackerId: string | null;
  smokeTimer: number;
  wakeTimer?: number;
  wakeOffsetZ?: number;
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
  radius: number;
  seatY: number;
  helmLocalPos?: { x: number; y: number; z: number };
  deckBoxes?: LocalDeckBox[];
  wanderAngle: number;
  wanderTimer: number;
  hoofAccum: number;
  hoverBaseY?: number;
  flapAccum?: number;
  impactCooldowns?: Record<string, number>;
  dispose: () => void;
}

export type MarineSpecies = 'tropical' | 'shark' | 'dolphin' | 'turtle' | 'manta' | 'jellyfish';

export interface OceanFishEntity {
  species: MarineSpecies;
  root: THREE.Group;
  tailPivot: THREE.Group;
  wingL?: THREE.Object3D;
  wingR?: THREE.Object3D;
  bellMesh?: THREE.Object3D;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  depthY: number;
  wobbleAmp: number;
  wobbleFreq: number;
  isShark: boolean;
  leapTimer: number;
  leapProgress: number; // < 0 means not leaping, 0..1 means leaping
  isLeaping: boolean;
  splashedOut?: boolean;
  splashedIn?: boolean;
  dispose: () => void;
}

export interface WildAnimalEntity {
  kind: 'deer' | 'bird';
  root: THREE.Group;
  parts: THREE.Object3D[];
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
  timer: number;
  orbitR: number;
  orbitSpeed: number;
  dispose: () => void;
}

function createFloatingHpBar(width = 2.1): { group: THREE.Group; fill: THREE.Mesh; dispose: () => void } {
  const group = new THREE.Group();
  const bgGeo = new THREE.PlaneGeometry(width, 0.24);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
  const bg = new THREE.Mesh(bgGeo, bgMat);

  const fillGeo = new THREE.PlaneGeometry(width - 0.12, 0.16);
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.z = 0.01;

  group.add(bg, fill);
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

export function isBoatKind(kind: MountType): kind is BoatKind {
  return (
    kind === 'speedboat' ||
    kind === 'jetski' ||
    kind === 'fishing_boat' ||
    kind === 'pirate_boat' ||
    kind === 'battleship'
  );
}

export function isMarineMountKind(kind: MountType): kind is MarineMountKind {
  return (
    kind === 'shark_mount' ||
    kind === 'whale_mount' ||
    kind === 'sailfish_mount' ||
    kind === 'turtle_mount' ||
    kind === 'manta_mount'
  );
}

export function isFlyingMountKind(kind: MountType): kind is FlyingMountKind {
  return kind === 'golden_eagle' || kind === 'pterodactyl' || kind === 'sky_griffin';
}

export function isLandAnimalKind(kind: MountType): kind is LandAnimalMountKind | 'horse' {
  return kind === 'horse' || kind === 'gorilla' || kind === 'rhino' || kind === 'cheetah';
}

export function isHelicopterKind(kind: MountType): boolean {
  return kind === 'helicopter' || kind === 'police_heli';
}

export function isTankKind(kind: MountType): boolean {
  return kind === 'tank' || kind === 'swat_tank';
}

export function isPoliceVehicleKind(kind: MountType): boolean {
  return kind === 'police_car' || kind === 'swat_tank' || kind === 'police_heli';
}

export function isLivingMountKind(kind: MountType): boolean {
  return isMarineMountKind(kind) || isFlyingMountKind(kind) || isLandAnimalKind(kind);
}

export function createVehicleEntity(
  id: string,
  kind: VehicleKind,
  x: number,
  y: number,
  z: number,
  yaw: number,
  colorIndex = 0
): MountEntity {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const wheels: THREE.Object3D[] = [];
  const palette = [0xef4444, 0x06b6d4, 0xf59e0b, 0x8b5cf6, 0x10b981];
  const primaryHex = palette[colorIndex % palette.length];
  const disposables: Array<{ dispose: () => void }> = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.28, metalness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.1 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: kind === 'bike' ? 0x22d3ee : 0xcbd5e1,
    emissive: kind === 'bike' ? 0x0891b2 : 0x000000,
    emissiveIntensity: kind === 'bike' ? 0.85 : 0,
    roughness: 0.25,
    metalness: 0.75,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.12,
    metalness: 0.4,
    transparent: true,
    opacity: 0.72,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.0,
  });
  disposables.push(bodyMat, trimMat, tireMat, rimMat, glassMat, glowMat);

  const addWheel = (wx: number, wy: number, wz: number, radius: number, width: number) => {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const hubGeo = new THREE.CylinderGeometry(radius * 0.54, radius * 0.54, width + 0.04, 8);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, rimMat);
    wg.add(tire, hub);
    bodyGroup.add(wg);
    wheels.push(wg);
    disposables.push(tireGeo, hubGeo);
  };

  let name = 'Turbo Street Car';
  let maxHp = 1000;
  let maxSpeed = 35;
  let accel = 32;
  let turnSpeed = 2.4;
  let radius = 1.95;
  let seatY = 1.05;

  const propsToSpin: THREE.Object3D[] = [];
  let turretPivot: THREE.Object3D | undefined;
  let sirenMeshes: [THREE.Mesh, THREE.Mesh] | undefined;

  if (kind === 'car' || kind === 'sedan' || kind === 'police_car') {
    const isPolice = kind === 'police_car';
    const isSedan = kind === 'sedan';
    name = isPolice ? 'Police Interceptor' : isSedan ? 'City Sedan' : 'Turbo Street Car';
    maxHp = isPolice ? 1100 : isSedan ? 950 : 1000;
    maxSpeed = isPolice ? 41 : isSedan ? 32 : 36;
    accel = isPolice ? 38 : 34;
    turnSpeed = isPolice ? 2.75 : 2.45;
    radius = 1.95;
    seatY = 0.95;

    const cBodyMat = isPolice
      ? new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.28, metalness: 0.5 })
      : isSedan
        ? new THREE.MeshStandardMaterial({
            color: [0xe2e8f0, 0x3b82f6, 0x10b981, 0xf43f5e, 0xf59e0b][colorIndex % 5],
            roughness: 0.34,
            metalness: 0.42,
          })
        : bodyMat;
    if (cBodyMat !== bodyMat) disposables.push(cBodyMat);

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 4.7), cBodyMat);
    chassis.position.y = 0.78;
    chassis.castShadow = true;
    chassis.receiveShadow = true;

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), glassMat);
    cabin.position.set(0, 1.44, -0.2);

    const roofColor = isPolice
      ? new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
      : cBodyMat;
    if (roofColor !== cBodyMat) disposables.push(roofColor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 1.85), roofColor);
    roof.position.set(0, 1.84, -0.25);

    if (isPolice) {
      const sideDoors = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.62, 1.9), roofColor);
      sideDoors.position.set(0, 0.8, -0.1);
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.42, 0.22), trimMat);
      bullbar.position.set(0, 0.72, 2.44);
      const redBarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 });
      const blueBarMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.5 });
      disposables.push(redBarMat, blueBarMat);
      const sirenR = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.32), redBarMat);
      sirenR.position.set(-0.34, 1.98, -0.2);
      const sirenB = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.32), blueBarMat);
      sirenB.position.set(0.34, 1.98, -0.2);
      sirenMeshes = [sirenR, sirenB];
      bodyGroup.add(sideDoors, bullbar, sirenR, sirenB);
    } else if (!isSedan) {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.45), trimMat);
      spoiler.position.set(0, 1.38, -2.15);
      bodyGroup.add(spoiler);
    }

    for (const sx of [-0.75, 0.75]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.12), glowMat);
      hl.position.set(sx, 0.8, 2.36);
      bodyGroup.add(hl);
    }

    bodyGroup.add(chassis, cabin, roof);
    addWheel(-1.18, 0.46, 1.45, 0.46, 0.34);
    addWheel(1.18, 0.46, 1.45, 0.46, 0.34);
    addWheel(-1.18, 0.46, -1.45, 0.46, 0.34);
    addWheel(1.18, 0.46, -1.45, 0.46, 0.34);
  } else if (kind === 'buggy' || kind === 'truck') {
    const isTruck = kind === 'truck';
    name = isTruck ? 'Military Utility Truck' : 'Armored Desert Jeep 4x4';
    maxHp = isTruck ? 1600 : 1500;
    maxSpeed = isTruck ? 27 : 29;
    accel = 28;
    turnSpeed = isTruck ? 2.0 : 2.25;
    radius = isTruck ? 2.35 : 2.05;
    seatY = isTruck ? 1.35 : 1.18;

    const hullMat = new THREE.MeshStandardMaterial({
      color: isTruck ? 0x3f6212 : colorIndex % 2 === 0 ? 0x65a30d : 0xd97706,
      roughness: 0.48,
      metalness: 0.35,
    });
    disposables.push(hullMat);

    if (isTruck) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.65, 2.1), hullMat);
      cab.position.set(0, 1.48, 1.35);
      cab.castShadow = true;
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 0.16), glassMat);
      windshield.position.set(0, 1.75, 2.38);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.72, 3.1), trimMat);
      bed.position.set(0, 1.05, -1.25);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.85 });
      disposables.push(canopyMat);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.25, 2.95), canopyMat);
      canopy.position.set(0, 1.98, -1.25);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.38, 0.35), trimMat);
      bumper.position.set(0, 0.8, 2.5);
      bodyGroup.add(cab, windshield, bed, canopy, bumper);
      addWheel(-1.35, 0.58, 1.65, 0.58, 0.44);
      addWheel(1.35, 0.58, 1.65, 0.58, 0.44);
      addWheel(-1.35, 0.58, -1.55, 0.58, 0.44);
      addWheel(1.35, 0.58, -1.55, 0.58, 0.44);
    } else {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.85, 4.3), hullMat);
      hull.position.y = 0.96;
      hull.castShadow = true;

      const cageTop = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.14, 2.3), trimMat);
      cageTop.position.set(0, 2.05, -0.15);
      for (const px of [-0.92, 0.92]) {
        for (const pz of [-1.2, 0.95]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.92, 0.14), trimMat);
          post.position.set(px, 1.56, pz);
          bodyGroup.add(post);
        }
      }
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.32, 0.38), trimMat);
      bumper.position.set(0, 0.82, 2.25);

      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), tireMat);
      spare.rotation.x = Math.PI / 2;
      spare.position.set(0, 1.15, -2.22);

      for (const sx of [-0.65, 0.65]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.14), glowMat);
        hl.position.set(sx, 1.05, 2.2);
        bodyGroup.add(hl);
      }

      bodyGroup.add(hull, cageTop, bumper, spare);
      addWheel(-1.26, 0.6, 1.45, 0.6, 0.44);
      addWheel(1.26, 0.6, 1.45, 0.6, 0.44);
      addWheel(-1.26, 0.6, -1.45, 0.6, 0.44);
      addWheel(1.26, 0.6, -1.45, 0.6, 0.44);
    }
  } else if (kind === 'tank' || kind === 'swat_tank') {
    const isSwat = kind === 'swat_tank';
    name = isSwat ? 'Armored SWAT Police Tank' : 'Armored Battle Tank';
    maxHp = isSwat ? 2400 : 2500;
    maxSpeed = 20;
    accel = 22;
    turnSpeed = 1.65;
    radius = 2.75;
    seatY = 1.68;

    const armorMat = new THREE.MeshStandardMaterial({
      color: isSwat ? 0x1e3a8a : 0x3f6212,
      roughness: 0.46,
      metalness: 0.58,
    });
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.25 });
    disposables.push(armorMat, trackMat);

    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 5.4), armorMat);
    hull.position.y = 1.0;
    hull.castShadow = true;
    hull.receiveShadow = true;

    for (const sx of [-1.72, 1.72]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.88, 5.75), trackMat);
      track.position.set(sx, 0.5, 0);
      track.castShadow = true;
      bodyGroup.add(track);
      for (let wz = -2.1; wz <= 2.1; wz += 1.05) {
        addWheel(sx, 0.44, wz, 0.44, 0.72);
      }
    }

    const turret = new THREE.Group();
    turret.position.set(0, 1.82, -0.2);
    const turretHead = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.88, 2.75), armorMat);
    turretHead.castShadow = true;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.6, 10), trimMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.08, 2.75);
    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.45), trackMat);
    muzzleBrake.position.set(0, 0.08, 4.5);
    turret.add(turretHead, barrel, muzzleBrake);

    if (isSwat) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.25, 4.6), glassMat);
      stripe.position.set(0, 1.1, 0);
      const redBarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 });
      const blueBarMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.5 });
      disposables.push(redBarMat, blueBarMat);
      const sr = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.3), redBarMat);
      sr.position.set(-0.4, 0.56, -0.4);
      const sb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.3), blueBarMat);
      sb.position.set(0.4, 0.56, -0.4);
      sirenMeshes = [sr, sb];
      turret.add(sr, sb);
      bodyGroup.add(stripe);
    }

    bodyGroup.add(hull, turret);
    turretPivot = turret;
  } else if (kind === 'helicopter' || kind === 'police_heli') {
    const isPolHeli = kind === 'police_heli';
    name = isPolHeli ? 'Police Pursuit Helicopter' : 'Attack Helicopter';
    maxHp = isPolHeli ? 1600 : 1800;
    maxSpeed = isPolHeli ? 42 : 40;
    accel = 34;
    turnSpeed = 2.65;
    radius = 2.85;
    seatY = 1.2;

    const fuseMat = new THREE.MeshStandardMaterial({
      color: isPolHeli ? 0x0f172a : 0x365314,
      roughness: 0.38,
      metalness: 0.55,
    });
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    disposables.push(fuseMat, rotorMat, whiteStripeMat);

    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.65, 4.8), fuseMat);
    fuselage.position.set(0, 1.5, 0.35);
    fuselage.castShadow = true;

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.92, 1.15, 1.85), glassMat);
    cockpit.position.set(0, 1.52, 2.35);

    const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 4.4), fuseMat);
    tailBoom.position.set(0, 1.65, -3.7);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.9), fuseMat);
    tailFin.position.set(0, 2.25, -5.65);

    // Landing skids
    for (const sx of [-1.1, 1.1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 4.4), rotorMat);
      skid.position.set(sx, 0.14, 0.2);
      const strutF = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.14), rotorMat);
      strutF.position.set(sx, 0.48, 1.1);
      const strutB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.14), rotorMat);
      strutB.position.set(sx, 0.48, -0.7);
      bodyGroup.add(skid, strutF, strutB);
    }

    // Missile wing stubs
    for (const sx of [-1.55, 1.55]) {
      const stub = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.75), rotorMat);
      stub.position.set(sx, 1.28, 0.25);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.3, 8), trimMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(sx * 1.15, 1.05, 0.3);
      bodyGroup.add(stub, pod);
    }

    // Main spinning rotor
    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 2.55, 0.1);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.45, 8), rotorMat);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, 0.42), rotorMat);
    blade1.position.y = 0.18;
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 8.6), rotorMat);
    blade2.position.y = 0.18;
    mainRotor.add(hub, blade1, blade2);
    propsToSpin.push(mainRotor);

    // Tail rotor
    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.32, 2.25, -5.65);
    const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 0.22), rotorMat);
    tailRotor.add(tBlade);
    propsToSpin.push(tailRotor);

    if (isPolHeli) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.35, 3.8), whiteStripeMat);
      band.position.set(0, 1.2, 0.3);
      const redBarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 });
      const blueBarMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.5 });
      const spotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.22, depthWrite: false });
      disposables.push(redBarMat, blueBarMat, spotMat);
      const sr = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.28), redBarMat);
      sr.position.set(-0.35, 2.4, 1.4);
      const sb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.28), blueBarMat);
      sb.position.set(0.35, 2.4, 1.4);
      sirenMeshes = [sr, sb];
      const spotCone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 8.5, 12, 1, true), spotMat);
      spotCone.position.set(0, -3.4, 3.1);
      spotCone.rotation.x = 0.32;
      bodyGroup.add(band, sr, sb, spotCone);
    }

    bodyGroup.add(fuselage, cockpit, tailBoom, tailFin, mainRotor, tailRotor);
  } else {
    name = 'Neon Dirt Bike';
    maxHp = 650;
    maxSpeed = 40;
    accel = 40;
    turnSpeed = 3.1;
    radius = 1.25;
    seatY = 0.98;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 2.1), bodyMat);
    frame.position.set(0, 0.82, 0);
    frame.castShadow = true;

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.35, 0.85), trimMat);
    tank.position.set(0, 1.15, 0.25);

    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.95, 0.16), trimMat);
    fork.position.set(0, 0.95, 0.95);
    fork.rotation.x = -0.35;

    const handle = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.12), rimMat);
    handle.position.set(0, 1.42, 0.76);

    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.14), glowMat);
    hl.position.set(0, 1.15, 1.08);

    bodyGroup.add(frame, tank, fork, handle, hl);
    addWheel(0, 0.48, 1.05, 0.48, 0.24);
    addWheel(0, 0.48, -1.05, 0.48, 0.26);
  }

  const hpBar = createFloatingHpBar();
  hpBar.group.position.set(
    0,
    kind === 'helicopter' || kind === 'police_heli'
      ? 3.4
      : kind === 'tank' || kind === 'swat_tank'
        ? 3.25
        : kind === 'buggy' || kind === 'truck'
          ? 2.95
          : 2.45,
    0
  );
  root.add(hpBar.group);

  return {
    id,
    kind,
    isBoat: false,
    isHelicopter: isHelicopterKind(kind),
    isTank: isTankKind(kind),
    isPolice: isPoliceVehicleKind(kind),
    turretPivot,
    sirenMeshes,
    fireCooldown: 0,
    propsToSpin: propsToSpin.length > 0 ? propsToSpin : undefined,
    name,
    root,
    bodyGroup,
    wheels,
    legs: [],
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

export function createBoatEntity(
  id: string,
  kind: BoatKind,
  x: number,
  y: number,
  z: number,
  yaw: number,
  colorIndex = 0
): MountEntity {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const propsToSpin: THREE.Object3D[] = [];
  const deckBoxes: LocalDeckBox[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const woodDark = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
  const woodLight = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 });
  const hullColors = [0x0ea5e9, 0xf97316, 0x10b981, 0xef4444];
  const accentMat = new THREE.MeshStandardMaterial({
    color: hullColors[colorIndex % hullColors.length],
    roughness: 0.35,
    metalness: 0.35,
  });
  const whiteHullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.25 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.65 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.12,
    metalness: 0.3,
    transparent: true,
    opacity: 0.72,
  });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85, side: THREE.DoubleSide });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
  });
  disposables.push(woodDark, woodLight, accentMat, whiteHullMat, steelMat, darkSteelMat, glassMat, sailMat, lanternMat);

  let name = 'Coastal Speedboat';
  let maxHp = 650;
  let maxSpeed = 38;
  let accel = 34;
  let turnSpeed = 2.6;
  let radius = 2.3;
  let seatY = 0.75;
  let wakeOffsetZ = 2.8;
  let helmLocalPos: { x: number; y: number; z: number } | undefined;
  let hpBarY = 2.8;

  if (kind === 'jetski') {
    name = 'Wave Jet Ski';
    maxHp = 650;
    maxSpeed = 42;
    accel = 42;
    turnSpeed = 3.35;
    radius = 1.4;
    seatY = 0.68;
    wakeOffsetZ = 1.45;
    hpBarY = 2.3;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.54, 2.75), accentMat);
    hull.position.set(0, 0.22, 0);
    hull.castShadow = true;
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.44, 0.75), whiteHullMat);
    bow.position.set(0, 0.26, 1.55);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 1.25), darkSteelMat);
    seat.position.set(0, 0.6, -0.25);
    const consoleCol = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.45), whiteHullMat);
    consoleCol.position.set(0, 0.64, 0.68);
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.12), darkSteelMat);
    handleBar.position.set(0, 0.94, 0.58);
    const jetNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.35, 8), steelMat);
    jetNozzle.rotation.x = Math.PI / 2;
    jetNozzle.position.set(0, 0.16, -1.45);
    bodyGroup.add(hull, bow, seat, consoleCol, handleBar, jetNozzle);
  } else if (kind === 'speedboat') {
    name = 'Wooden Speedboat';
    maxHp = 650;
    maxSpeed = 38;
    accel = 35;
    turnSpeed = 2.7;
    radius = 2.5;
    seatY = 0.88;
    wakeOffsetZ = 3.0;
    hpBarY = 2.85;

    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.78, 5.2), whiteHullMat);
    lowerHull.position.set(0, 0.28, 0);
    lowerHull.castShadow = true;
    const bowDeck = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.65, 1.3), woodLight);
    bowDeck.position.set(0, 0.32, 2.9);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.18, 5.15), accentMat);
    stripe.position.set(0, 0.58, 0);
    const deckFloor = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 3.6), woodDark);
    deckFloor.position.set(0, 0.62, -0.4);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.58, 0.16), glassMat);
    windshield.position.set(0, 1.02, 1.15);
    windshield.rotation.x = -0.32;
    const helmConsole = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.55), darkSteelMat);
    helmConsole.position.set(0, 0.85, 0.65);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.82, 0.58), darkSteelMat);
    motor.position.set(0, 0.58, -2.75);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.08), steelMat);
    prop.position.set(0, 0.08, -3.05);
    propsToSpin.push(prop);
    bodyGroup.add(lowerHull, bowDeck, stripe, deckFloor, windshield, helmConsole, motor, prop);
  } else if (kind === 'fishing_boat') {
    name = 'Island Fishing Boat';
    maxHp = 650;
    maxSpeed = 32;
    accel = 28;
    turnSpeed = 2.35;
    radius = 3.1;
    seatY = 1.05;
    wakeOffsetZ = 3.6;
    helmLocalPos = { x: 0, y: 1.05, z: -0.75 };
    hpBarY = 3.6;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.92, 6.4), woodDark);
    hull.position.set(0, 0.25, 0);
    hull.castShadow = true;
    const bow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.3), woodLight);
    bow.position.set(0, 0.35, 3.65);
    const deckFloor = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.14, 5.9), woodLight);
    deckFloor.position.set(0, 0.7, 0);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.45, 1.75), whiteHullMat);
    cabin.position.set(0, 1.45, -0.8);
    cabin.castShadow = true;
    const cabinWin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.65, 1.82), glassMat);
    cabinWin.position.set(0, 1.65, -0.78);
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.16, 1.95), accentMat);
    cabinRoof.position.set(0, 2.22, -0.8);
    const craneMast = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), woodDark);
    craneMast.position.set(0, 2.0, 1.5);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.3), woodLight);
    boom.position.set(0, 2.95, 2.35);
    boom.rotation.x = 0.28;
    const fishCrate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.85), accentMat);
    fishCrate.position.set(-0.75, 1.0, 1.9);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.1), steelMat);
    prop.position.set(0, 0.05, -3.3);
    propsToSpin.push(prop);
    bodyGroup.add(hull, bow, deckFloor, cabin, cabinWin, cabinRoof, craneMast, boom, fishCrate, prop);
  } else if (kind === 'pirate_boat') {
    name = 'Pirate Fishing Boat';
    maxHp = 1200;
    maxSpeed = 24;
    accel = 18;
    turnSpeed = 1.65;
    radius = 4.9;
    seatY = 1.85;
    wakeOffsetZ = 6.1;
    helmLocalPos = { x: 0, y: 1.85, z: -3.1 };
    hpBarY = 5.4;

    // Main Hull & Walkable Plank Deck (ly = 1.0)
    const hullBase = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.55, 11.2), woodDark);
    hullBase.position.set(0, 0.25, 0);
    hullBase.castShadow = true;
    hullBase.receiveShadow = true;
    const bowProw = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.45, 2.2), woodDark);
    bowProw.position.set(0, 0.42, 6.2);
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 10.8), woodLight);
    mainDeck.position.set(0, 0.92, 0);
    mainDeck.receiveShadow = true;

    // Raised Aft Helm Deck (ly = 1.85) + Walkable Stairs
    const aftDeck = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.85, 3.6), woodLight);
    aftDeck.position.set(0, 1.42, -3.7);
    aftDeck.receiveShadow = true;
    const stairVisual = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.9), woodDark);
    stairVisual.position.set(0, 1.38, -1.35);
    stairVisual.rotation.x = 0.44;

    // Side Boarding Ladders / Ramps (dipping down to water on port & starboard)
    for (const sx of [-2.85, 2.85]) {
      const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 2.2), woodLight);
      rampMesh.position.set(sx, 0.35, 1.2);
      rampMesh.rotation.z = sx < 0 ? 0.48 : -0.48;
      bodyGroup.add(rampMesh);
    }

    // Gunwale Rails (with gaps at boarding ramps z in [0.0, 2.4])
    for (const sx of [-2.35, 2.35]) {
      const railFront = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 3.0), woodDark);
      railFront.position.set(sx, 1.38, 3.9);
      const railBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 2.1), woodDark);
      railBack.position.set(sx, 1.38, -1.0);
      bodyGroup.add(railFront, railBack);
    }

    // Cabin Hood, Steering Wheel, Mast & Sail, Warm Lanterns, Deck Cover Crates
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.0), woodDark);
    cabinRoof.position.set(0, 1.75, 1.2);
    cabinRoof.castShadow = true;

    const helmPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), woodDark);
    helmPost.position.set(0, 2.35, -2.55);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 12), woodLight);
    wheel.position.set(0, 2.75, -2.35);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7.6, 8), woodDark);
    mast.position.set(0, 4.7, 2.4);
    const yard = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 0.16), woodDark);
    yard.position.set(0, 6.7, 2.52);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 3.4), sailMat);
    sail.position.set(0, 4.9, 2.58);

    const cargoBoxA = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 1.15), accentMat);
    cargoBoxA.position.set(-1.35, 1.48, 3.6);
    const cargoBoxB = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.85, 1.05), woodDark);
    cargoBoxB.position.set(1.35, 1.43, 3.9);

    for (const [lx, ly, lz] of [
      [-1.9, 2.5, -5.2],
      [1.9, 2.5, -5.2],
    ]) {
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.28), lanternMat);
      lantern.position.set(lx, ly, lz);
      bodyGroup.add(lantern);
    }

    bodyGroup.add(
      hullBase,
      bowProw,
      mainDeck,
      aftDeck,
      stairVisual,
      cabinRoof,
      helmPost,
      wheel,
      mast,
      yard,
      sail,
      cargoBoxA,
      cargoBoxB
    );

    // Boat-local walkable deck & cover AABBs
    deckBoxes.push(
      { minX: -2.45, maxX: 2.45, minY: 0.0, maxY: 1.02, minZ: -5.4, maxZ: 6.4, kind: 'floor' },
      { minX: -2.4, maxX: 2.4, minY: 1.0, maxY: 1.86, minZ: -5.45, maxZ: -1.9, kind: 'floor' },
      {
        minX: -0.9,
        maxX: 0.9,
        minY: 0.95,
        maxY: 1.86,
        minZ: -2.0,
        maxZ: -0.35,
        kind: 'ramp',
        slopeAxis: 'z',
        slopeDir: -1,
      },
      // Side boarding ramps from water (-0.3) onto main deck (1.02)
      {
        minX: -3.55,
        maxX: -2.3,
        minY: -0.35,
        maxY: 1.05,
        minZ: 0.0,
        maxZ: 2.4,
        kind: 'ramp',
        slopeAxis: 'x',
        slopeDir: 1,
      },
      {
        minX: 2.3,
        maxX: 3.55,
        minY: -0.35,
        maxY: 1.05,
        minZ: 0.0,
        maxZ: 2.4,
        kind: 'ramp',
        slopeAxis: 'x',
        slopeDir: -1,
      },
      // Cabin & cover crates
      { minX: -1.25, maxX: 1.25, minY: 1.0, maxY: 2.5, minZ: 0.2, maxZ: 2.2, kind: 'wall' },
      { minX: -1.95, maxX: -0.75, minY: 1.0, maxY: 1.95, minZ: 3.0, maxZ: 4.2, kind: 'wall' }
    );
  } else {
    // 'battleship': Large Naval Cargo & Battleship Cruiser (2,500 HP, multi-deck walkable fortress)
    name = 'Naval Battleship Cruiser';
    maxHp = 2500;
    maxSpeed = 18;
    accel = 12;
    turnSpeed = 1.1;
    radius = 8.4;
    seatY = 4.42;
    wakeOffsetZ = 10.6;
    helmLocalPos = { x: 0, y: 4.42, z: -4.4 };
    hpBarY = 9.2;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.3, 19.6), steelMat);
    hull.position.set(0, 0.55, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    const redKeel = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.45, 19.4), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 }));
    redKeel.position.set(0, -0.25, 0);
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.22, 19.2), darkSteelMat);
    mainDeck.position.set(0, 1.65, 0);
    mainDeck.receiveShadow = true;

    // Raised Bow Forecastle & Turret Cannon
    const bowDeck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.0, 5.2), steelMat);
    bowDeck.position.set(0, 2.15, 7.2);
    const turretBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 2.2), darkSteelMat);
    turretBase.position.set(0, 3.18, 7.6);
    const barrelL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.8), steelMat);
    barrelL.position.set(-0.35, 3.3, 9.2);
    const barrelR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.8), steelMat);
    barrelR.position.set(0.35, 3.3, 9.2);

    // Multi-Tier Bridge Superstructure (Upper Sniper Deck at ly = 4.4)
    const bridgeLower = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.75, 4.8), steelMat);
    bridgeLower.position.set(0, 3.0, -4.6);
    bridgeLower.castShadow = true;
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.26, 5.2), darkSteelMat);
    bridgeDeck.position.set(0, 4.35, -4.6);
    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.35, 2.5), glassMat);
    bridgeGlass.position.set(0, 5.15, -4.7);
    const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.32, 3.0), steelMat);
    bridgeRoof.position.set(0, 5.95, -4.7);
    const radarMast = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.4, 0.32), steelMat);
    radarMast.position.set(0, 7.2, -4.8);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 0.35), lanternMat);
    radarBar.position.set(0, 8.2, -4.8);
    propsToSpin.push(radarBar);

    // Shipping Containers on Foredeck (Tactical Cover + Walkable Roofs)
    const contA = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.1, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 })
    );
    contA.position.set(-1.95, 2.7, 2.1);
    contA.castShadow = true;
    const contB = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.1, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 })
    );
    contB.position.set(1.95, 2.7, 1.6);
    contB.castShadow = true;

    // Walkable Stair Ramps: Water -> Main Deck (sides) + Main Deck -> Upper Bridge Deck (aft)
    for (const sx of [-4.65, 4.65]) {
      const waterRamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 2.8), steelMat);
      waterRamp.position.set(sx, 0.72, -0.5);
      waterRamp.rotation.z = sx < 0 ? 0.78 : -0.78;
      bodyGroup.add(waterRamp);
    }
    const bridgeStair = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 3.8), accentMat);
    bridgeStair.position.set(-2.3, 3.02, -8.35);
    bridgeStair.rotation.x = -0.68;

    const bowStair = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 1.8), accentMat);
    bowStair.position.set(0, 2.18, 4.2);
    bowStair.rotation.x = -0.52;

    bodyGroup.add(
      hull,
      redKeel,
      mainDeck,
      bowDeck,
      turretBase,
      barrelL,
      barrelR,
      bridgeLower,
      bridgeDeck,
      bridgeGlass,
      bridgeRoof,
      radarMast,
      radarBar,
      contA,
      contB,
      bridgeStair,
      bowStair
    );

    deckBoxes.push(
      // Main Deck
      { minX: -4.0, maxX: 4.0, minY: 0.0, maxY: 1.76, minZ: -9.6, maxZ: 9.6, kind: 'floor' },
      // Bow raised deck
      { minX: -3.4, maxX: 3.4, minY: 1.7, maxY: 2.68, minZ: 4.6, maxZ: 9.6, kind: 'floor' },
      // Bow ramp
      { minX: -1.1, maxX: 1.1, minY: 1.65, maxY: 2.68, minZ: 3.4, maxZ: 4.8, kind: 'ramp', slopeAxis: 'z', slopeDir: 1 },
      // Upper Bridge Deck
      { minX: -3.0, maxX: 3.0, minY: 3.9, maxY: 4.48, minZ: -7.2, maxZ: -2.0, kind: 'floor' },
      // Bridge staircase (from stern deck z=-9.6 up to z=-7.0)
      { minX: -3.3, maxX: -1.3, minY: 1.7, maxY: 4.48, minZ: -9.6, maxZ: -6.9, kind: 'ramp', slopeAxis: 'z', slopeDir: 1 },
      // Side water-to-deck boarding ramps
      { minX: -5.55, maxX: -3.85, minY: -0.35, maxY: 1.78, minZ: -1.9, maxZ: 0.9, kind: 'ramp', slopeAxis: 'x', slopeDir: 1 },
      { minX: 3.85, maxX: 5.55, minY: -0.35, maxY: 1.78, minZ: -1.9, maxZ: 0.9, kind: 'ramp', slopeAxis: 'x', slopeDir: -1 },
      // Shipping Containers & Bridge Pillar cover
      { minX: -3.05, maxX: -0.85, minY: 1.7, maxY: 3.8, minZ: -0.1, maxZ: 4.3, kind: 'wall' },
      { minX: 0.85, maxX: 3.05, minY: 1.7, maxY: 3.8, minZ: -0.6, maxZ: 3.8, kind: 'wall' },
      { minX: -2.2, maxX: 2.2, minY: 4.4, maxY: 6.1, minZ: -6.1, maxZ: -3.4, kind: 'wall' }
    );
  }

  const hpBar = createFloatingHpBar(kind === 'battleship' ? 3.8 : kind === 'pirate_boat' ? 2.8 : 2.1);
  hpBar.group.position.set(0, hpBarY, 0);
  root.add(hpBar.group);

  return {
    id,
    kind,
    isBoat: true,
    name,
    root,
    bodyGroup,
    wheels: [],
    legs: [],
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
    helmLocalPos,
    deckBoxes: deckBoxes.length > 0 ? deckBoxes : undefined,
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

export function createHorseEntity(
  id: string,
  x: number,
  y: number,
  z: number,
  yaw: number,
  coatVariant: number
): MountEntity {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const coats = [
    { name: 'Chestnut Horse', coat: 0x92400e, mane: 0x451a03 },
    { name: 'Ivory Mustang', coat: 0xf1f5f9, mane: 0x94a3b8 },
    { name: 'Midnight Stallion', coat: 0x1e293b, mane: 0x020617 },
  ];
  const pal = coats[coatVariant % coats.length];

  const coatMat = new THREE.MeshStandardMaterial({ color: pal.coat, roughness: 0.72 });
  const maneMat = new THREE.MeshStandardMaterial({ color: pal.mane, roughness: 0.85 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 2.2), coatMat);
  body.position.set(0, 1.32, 0);
  body.castShadow = true;

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.95, 0.55), coatMat);
  neck.position.set(0, 1.95, 0.92);
  neck.rotation.x = 0.42;
  neck.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.82), coatMat);
  head.position.set(0, 2.38, 1.32);
  head.rotation.x = 0.28;
  head.castShadow = true;

  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.24), maneMat);
  mane.position.set(0, 2.08, 0.65);
  mane.rotation.x = 0.42;

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.18, 0.92), saddleMat);
  saddle.position.set(0, 1.82, -0.05);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.92, 0.22), maneMat);
  tail.position.set(0, 1.28, -1.18);
  tail.rotation.x = 0.25;

  bodyGroup.add(body, neck, head, mane, saddle, tail);

  const legs: THREE.Object3D[] = [];
  const legCoords: Array<[number, number]> = [
    [-0.32, 0.78],
    [0.32, 0.78],
    [-0.32, -0.78],
    [0.32, -0.78],
  ];
  for (const [lx, lz] of legCoords) {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.95, lz);
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 0.26), coatMat);
    legMesh.position.y = -0.47;
    legMesh.castShadow = true;
    legPivot.add(legMesh);
    bodyGroup.add(legPivot);
    legs.push(legPivot);
  }

  const hpBar = createFloatingHpBar();
  hpBar.group.position.set(0, 3.05, 0);
  root.add(hpBar.group);

  return {
    id,
    kind: 'horse',
    isBoat: false,
    isLandAnimal: true,
    name: pal.name,
    root,
    bodyGroup,
    wheels: [],
    legs,
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
    hp: 800,
    maxHp: 800,
    alive: true,
    respawnTimer: 0,
    riderId: null,
    lastAttackerId: null,
    smokeTimer: 0,
    maxSpeed: 29,
    accel: 30,
    turnSpeed: 2.8,
    radius: 1.35,
    seatY: 1.62,
    wanderAngle: yaw,
    wanderTimer: 2 + coatVariant,
    hoofAccum: 0,
    dispose: () => {
      hpBar.dispose();
      coatMat.dispose();
      maneMat.dispose();
      saddleMat.dispose();
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}

export function createFlyingBirdMountEntity(
  id: string,
  kind: FlyingMountKind,
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

  const disposables: Array<{ dispose: () => void }> = [];
  let name = 'Giant Golden Eagle';
  let maxHp = 750;
  let maxSpeed = 46;
  let accel = 38;
  let turnSpeed = 2.65;
  let radius = 2.4;
  let seatY = 1.1;
  let hpBarY = 3.2;

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.52, metalness: 0.12 });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.78,
  });
  disposables.push(eyeMat, saddleMat, buckleMat);

  let wingL: THREE.Group;
  let wingR: THREE.Group;
  const tailPivot = new THREE.Group();

  if (kind === 'pterodactyl') {
    name = 'Prehistoric Pterodactyl';
    maxHp = 850;
    maxSpeed = 48;
    accel = 40;
    turnSpeed = 2.45;
    radius = 2.65;
    seatY = 1.05;
    hpBarY = 3.35;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.68 });
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.55,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.22,
    });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    disposables.push(skinMat, membraneMat, crestMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.88, 2.75), skinMat);
    torso.position.set(0, 0.55, 0);
    torso.castShadow = true;

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 1.05), skinMat);
    neck.position.set(0, 0.92, 1.48);
    neck.rotation.x = -0.35;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.95), skinMat);
    head.position.set(0, 1.25, 2.05);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 1.15), crestMat);
    beak.position.set(0, 1.18, 2.9);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 1.35), crestMat);
    crest.position.set(0, 1.54, 1.55);
    crest.rotation.x = 0.28;

    for (const ex of [-0.26, 0.26]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.14), eyeMat);
      eye.position.set(ex, 1.32, 2.22);
      bodyGroup.add(eye);
    }

    // Articulated Pterodactyl Wings (~7.6m wingspan)
    wingL = new THREE.Group();
    wingL.position.set(-0.55, 0.72, 0.3);
    const wLInner = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.45), membraneMat);
    wLInner.position.set(-0.95, 0, -0.15);
    const wLOuter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.95), membraneMat);
    wLOuter.position.set(-2.55, 0.08, -0.32);
    wLOuter.rotation.z = -0.14;
    const sparL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 0.18), skinMat);
    sparL.position.set(-1.7, 0.06, 0.48);
    wingL.add(wLInner, wLOuter, sparL);

    wingR = new THREE.Group();
    wingR.position.set(0.55, 0.72, 0.3);
    const wRInner = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.45), membraneMat);
    wRInner.position.set(0.95, 0, -0.15);
    const wROuter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.95), membraneMat);
    wROuter.position.set(2.55, 0.08, -0.32);
    wROuter.rotation.z = 0.14;
    const sparR = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 0.18), skinMat);
    sparR.position.set(1.7, 0.06, 0.48);
    wingR.add(wRInner, wROuter, sparR);

    tailPivot.position.set(0, 0.62, -1.35);
    const tailRod = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.75), skinMat);
    tailRod.position.set(0, 0, -0.82);
    const tailDiamond = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.65), crestMat);
    tailDiamond.position.set(0, 0, -1.72);
    tailPivot.add(tailRod, tailDiamond);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.18, 0.96), saddleMat);
    saddle.position.set(0, 1.02, 0.05);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.1, 0.18), buckleMat);
    buckle.position.set(0, 1.08, 0.42);

    bodyGroup.add(torso, neck, head, beak, crest, wingL, wingR, tailPivot, saddle, buckle);
  } else if (kind === 'sky_griffin') {
    name = 'Arctic Sky Griffin';
    maxHp = 800;
    maxSpeed = 45;
    accel = 39;
    turnSpeed = 2.8;
    radius = 2.5;
    seatY = 1.12;
    hpBarY = 3.25;

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const frostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
    disposables.push(snowMat, frostMat, beakMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.98, 2.7), snowMat);
    torso.position.set(0, 0.58, 0);
    torso.castShadow = true;

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.85, 0.85), frostMat);
    chest.position.set(0, 0.64, 1.1);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.78, 0.88), snowMat);
    head.position.set(0, 1.32, 1.55);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.52), beakMat);
    beak.position.set(0, 1.24, 2.15);
    beak.rotation.x = 0.2;

    for (const side of [-0.34, 0.34]) {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.22), frostMat);
      tuft.position.set(side, 1.82, 1.48);
      tuft.rotation.z = side > 0 ? -0.35 : 0.35;
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.12), eyeMat);
      eye.position.set(side * 0.9, 1.38, 1.98);
      bodyGroup.add(tuft, eye);
    }

    wingL = new THREE.Group();
    wingL.position.set(-0.62, 0.78, 0.25);
    const wLInner = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 1.32), snowMat);
    wLInner.position.set(-0.88, 0, -0.1);
    const wLTip = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.11, 0.95), frostMat);
    wLTip.position.set(-2.35, 0.06, -0.25);
    wingL.add(wLInner, wLTip);

    wingR = new THREE.Group();
    wingR.position.set(0.62, 0.78, 0.25);
    const wRInner = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 1.32), snowMat);
    wRInner.position.set(0.88, 0, -0.1);
    const wRTip = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.11, 0.95), frostMat);
    wRTip.position.set(2.35, 0.06, -0.25);
    wingR.add(wRInner, wRTip);

    tailPivot.position.set(0, 0.62, -1.35);
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.25), frostMat);
    tailFan.position.set(0, 0, -0.62);
    tailPivot.add(tailFan);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.18, 0.92), saddleMat);
    saddle.position.set(0, 1.09, -0.05);
    const crestTrim = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.1, 0.2), buckleMat);
    crestTrim.position.set(0, 1.15, 0.34);

    bodyGroup.add(torso, chest, head, beak, wingL, wingR, tailPivot, saddle, crestTrim);
  } else {
    // 'golden_eagle'
    name = 'Giant Golden Eagle';
    maxHp = 750;
    maxSpeed = 46;
    accel = 38;
    turnSpeed = 2.65;
    radius = 2.4;
    seatY = 1.08;
    hpBarY = 3.2;

    const brownMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.68 });
    const whiteHeadMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      roughness: 0.32,
    });
    disposables.push(brownMat, whiteHeadMat, goldMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.94, 2.65), brownMat);
    torso.position.set(0, 0.56, 0);
    torso.castShadow = true;

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.72, 0.78), whiteHeadMat);
    neck.position.set(0, 1.04, 1.22);
    neck.rotation.x = 0.25;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.8), whiteHeadMat);
    head.position.set(0, 1.38, 1.56);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.62), goldMat);
    beak.position.set(0, 1.28, 2.15);
    beak.rotation.x = 0.24;

    for (const side of [-0.32, 0.32]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.12), eyeMat);
      eye.position.set(side, 1.44, 1.92);
      const talon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.32), goldMat);
      talon.position.set(side * 1.15, 0.08, 0.2);
      bodyGroup.add(eye, talon);
    }

    wingL = new THREE.Group();
    wingL.position.set(-0.58, 0.76, 0.25);
    const wLInner = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 1.25), brownMat);
    wLInner.position.set(-0.86, 0, -0.08);
    const wLTip = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.11, 0.92), goldMat);
    wLTip.position.set(-2.3, 0.05, -0.22);
    wingL.add(wLInner, wLTip);

    wingR = new THREE.Group();
    wingR.position.set(0.58, 0.76, 0.25);
    const wRInner = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 1.25), brownMat);
    wRInner.position.set(0.86, 0, -0.08);
    const wRTip = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.11, 0.92), goldMat);
    wRTip.position.set(2.3, 0.05, -0.22);
    wingR.add(wRInner, wRTip);

    tailPivot.position.set(0, 0.6, -1.32);
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.12, 1.15), whiteHeadMat);
    tailFan.position.set(0, 0, -0.58);
    tailPivot.add(tailFan);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.18, 0.92), saddleMat);
    saddle.position.set(0, 1.06, -0.04);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 0.2), goldMat);
    strap.position.set(0, 1.12, 0.34);

    bodyGroup.add(torso, neck, head, beak, wingL, wingR, tailPivot, saddle, strap);
  }

  const hpBar = createFloatingHpBar(2.4);
  hpBar.group.position.set(0, hpBarY, 0);
  hpBar.group.visible = true;
  root.add(hpBar.group);

  return {
    id,
    kind,
    isBoat: false,
    isFlyingMount: true,
    name,
    root,
    bodyGroup,
    wheels: [],
    legs: [],
    wings: [wingL, wingR],
    tailPivot,
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
    maxSpeed,
    accel,
    turnSpeed,
    radius,
    seatY,
    hoverBaseY: y,
    flapAccum: Math.random() * 6,
    wanderAngle: yaw,
    wanderTimer: 2 + Math.random() * 2,
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

export function createLandAnimalMountEntity(
  id: string,
  kind: LandAnimalMountKind,
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

  const legs: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
  disposables.push(eyeMat, saddleMat);

  let name = 'Armored Rhino';
  let maxHp = 1100;
  let maxSpeed = 32;
  let accel = 26;
  let turnSpeed = 2.15;
  let radius = 2.1;
  let seatY = 1.9;
  let hpBarY = 3.5;
  let tailPivot: THREE.Object3D | undefined;

  if (kind === 'gorilla') {
    name = 'Jungle Silverback Gorilla';
    maxHp = 850;
    maxSpeed = 29;
    accel = 32;
    turnSpeed = 2.85;
    radius = 1.75;
    seatY = 1.88;
    hpBarY = 3.55;

    const furMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    disposables.push(furMat, silverMat, skinMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.35, 1.65), furMat);
    torso.position.set(0, 1.35, 0.1);
    torso.rotation.x = 0.26;
    torso.castShadow = true;

    const silverBack = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.35, 1.3), silverMat);
    silverBack.position.set(0, 1.92, -0.05);
    silverBack.rotation.x = 0.24;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.88, 0.86), furMat);
    head.position.set(0, 2.25, 0.88);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.35), skinMat);
    brow.position.set(0, 2.42, 1.24);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.36, 0.45), skinMat);
    jaw.position.set(0, 1.98, 1.22);
    for (const ex of [-0.22, 0.22]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
      eye.position.set(ex, 2.28, 1.34);
      bodyGroup.add(eye);
    }

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.9), saddleMat);
    saddle.position.set(0, 2.08, -0.05);
    bodyGroup.add(torso, silverBack, head, brow, jaw, saddle);

    // Long knuckle arms (front) + sturdy legs (rear)
    const legSpecs = [
      { x: -0.78, y: 1.35, z: 0.65, w: 0.44, h: 1.35, d: 0.44 },
      { x: 0.78, y: 1.35, z: 0.65, w: 0.44, h: 1.35, d: 0.44 },
      { x: -0.48, y: 0.88, z: -0.62, w: 0.42, h: 0.88, d: 0.42 },
      { x: 0.48, y: 0.88, z: -0.62, w: 0.42, h: 0.88, d: 0.42 },
    ];
    for (const sp of legSpecs) {
      const lp = new THREE.Group();
      lp.position.set(sp.x, sp.y, sp.z);
      const lm = new THREE.Mesh(new THREE.BoxGeometry(sp.w, sp.h, sp.d), furMat);
      lm.position.y = -sp.h * 0.5;
      lm.castShadow = true;
      lp.add(lm);
      bodyGroup.add(lp);
      legs.push(lp);
    }
  } else if (kind === 'cheetah') {
    name = 'Swift Plains Cheetah';
    maxHp = 650;
    maxSpeed = 43;
    accel = 44;
    turnSpeed = 3.35;
    radius = 1.45;
    seatY = 1.44;
    hpBarY = 2.95;

    const coatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.62 });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.68 });
    disposables.push(coatMat, spotMat, bellyMat);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.76, 2.25), coatMat);
    body.position.set(0, 1.18, 0);
    body.castShadow = true;

    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.9), bellyMat);
    belly.position.set(0, 0.84, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.54, 0.74), coatMat);
    head.position.set(0, 1.56, 1.28);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.34), bellyMat);
    muzzle.position.set(0, 1.42, 1.66);

    for (const [sx, sy, sz] of [
      [-0.36, 1.35, 0.55],
      [0.36, 1.35, -0.35],
      [-0.36, 1.35, -0.65],
      [0.36, 1.35, 0.45],
      [0, 1.58, 0.3],
      [0, 1.58, -0.5],
    ]) {
      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), spotMat);
      spot.position.set(sx, sy, sz);
      bodyGroup.add(spot);
    }
    for (const ex of [-0.18, 0.18]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.1), eyeMat);
      eye.position.set(ex, 1.62, 1.65);
      bodyGroup.add(eye);
    }

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.3, -1.12);
    const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.35), coatMat);
    tailMesh.position.set(0, -0.08, -0.65);
    tailMesh.rotation.x = 0.25;
    tailGroup.add(tailMesh);
    tailPivot = tailGroup;

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.14, 0.82), saddleMat);
    saddle.position.set(0, 1.6, -0.05);

    bodyGroup.add(body, belly, head, muzzle, tailGroup, saddle);

    for (const [lx, lz] of [
      [-0.28, 0.82],
      [0.28, 0.82],
      [-0.28, -0.82],
      [0.28, -0.82],
    ]) {
      const lp = new THREE.Group();
      lp.position.set(lx, 0.9, lz);
      const lm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.22), coatMat);
      lm.position.y = -0.45;
      lm.castShadow = true;
      lp.add(lm);
      bodyGroup.add(lp);
      legs.push(lp);
    }
  } else {
    // 'rhino'
    name = 'Armored Charging Rhino';
    maxHp = 1100;
    maxSpeed = 32;
    accel = 26;
    turnSpeed = 2.1;
    radius = 2.05;
    seatY = 1.88;
    hpBarY = 3.55;

    const hideMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.78 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.25 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.32 });
    disposables.push(hideMat, armorMat, hornMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.28, 2.95), hideMat);
    torso.position.set(0, 1.32, 0);
    torso.castShadow = true;

    const shoulderPlate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.24, 0.95), armorMat);
    shoulderPlate.position.set(0, 1.36, 0.72);
    const hipPlate = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.18, 0.88), armorMat);
    hipPlate.position.set(0, 1.32, -0.78);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.96, 1.15), hideMat);
    head.position.set(0, 1.38, 1.82);
    head.rotation.x = 0.14;

    const bigHorn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.95, 4), hornMat);
    bigHorn.position.set(0, 1.98, 2.25);
    bigHorn.rotation.x = 0.35;
    const smallHorn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.52, 4), hornMat);
    smallHorn.position.set(0, 1.86, 1.72);
    smallHorn.rotation.x = 0.2;

    for (const ex of [-0.52, 0.52]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), eyeMat);
      eye.position.set(ex, 1.56, 1.95);
      bodyGroup.add(eye);
    }

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.18, 1.0), saddleMat);
    saddle.position.set(0, 2.02, -0.05);

    bodyGroup.add(torso, shoulderPlate, hipPlate, head, bigHorn, smallHorn, saddle);

    for (const [lx, lz] of [
      [-0.56, 0.95],
      [0.56, 0.95],
      [-0.56, -0.95],
      [0.56, -0.95],
    ]) {
      const lp = new THREE.Group();
      lp.position.set(lx, 0.88, lz);
      const lm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.88, 0.44), hideMat);
      lm.position.y = -0.44;
      lm.castShadow = true;
      lp.add(lm);
      bodyGroup.add(lp);
      legs.push(lp);
    }
  }

  const hpBar = createFloatingHpBar(2.3);
  hpBar.group.position.set(0, hpBarY, 0);
  hpBar.group.visible = true;
  root.add(hpBar.group);

  return {
    id,
    kind,
    isBoat: false,
    isLandAnimal: true,
    name,
    root,
    bodyGroup,
    wheels: [],
    legs,
    tailPivot,
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
    maxSpeed,
    accel,
    turnSpeed,
    radius,
    seatY,
    wanderAngle: yaw,
    wanderTimer: 2 + Math.random() * 2,
    hoofAccum: 0,
    impactCooldowns: {},
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

export function createOceanFish(index: number, forcedSpecies?: MarineSpecies): OceanFishEntity {
  const speciesOrder: MarineSpecies[] = [
    'tropical',
    'dolphin',
    'tropical',
    'turtle',
    'manta',
    'jellyfish',
    'shark',
    'tropical',
  ];
  const species: MarineSpecies = forcedSpecies ?? speciesOrder[index % speciesOrder.length];
  const isShark = species === 'shark';
  const root = new THREE.Group();
  const tailPivot = new THREE.Group();
  const mats: THREE.Material[] = [];

  let wingL: THREE.Object3D | undefined;
  let wingR: THREE.Object3D | undefined;
  let bellMesh: THREE.Object3D | undefined;
  let orbitRadius = 205 + ((index * 17) % 80);
  let orbitSpeed = 0.12 * (index % 2 === 0 ? 1 : -1);
  let depthY = -0.95;

  if (species === 'dolphin') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.2 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 });
    mats.push(bodyMat, bellyMat);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.56, 1.85), bodyMat);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 1.55), bellyMat);
    belly.position.y = -0.22;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.65), bodyMat);
    snout.position.set(0, -0.06, 1.15);
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 4), bodyMat);
    dorsal.position.set(0, 0.44, -0.1);
    dorsal.rotation.x = -0.25;
    root.add(torso, belly, snout, dorsal);

    tailPivot.position.set(0, 0, -0.95);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.42), bodyMat);
    fluke.position.set(0, 0, -0.22);
    tailPivot.add(fluke);
    root.add(tailPivot);

    orbitRadius = 212 + (index % 5) * 14;
    orbitSpeed = 0.16 * (index % 2 === 0 ? 1 : -1);
    depthY = -0.78;
  } else if (species === 'turtle') {
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.55 });
    mats.push(shellMat, rimMat, skinMat);

    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.46, 1.25), shellMat);
    shell.position.y = 0.14;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.16, 1.34), rimMat);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.45), skinMat);
    head.position.set(0, 0.08, 0.78);
    root.add(shell, rim, head);

    const flL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.34), skinMat);
    flL.position.set(-0.75, 0, 0.25);
    const flR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.34), skinMat);
    flR.position.set(0.75, 0, 0.25);
    root.add(flL, flR, tailPivot);
    wingL = flL;
    wingR = flR;

    orbitRadius = 192 + (index % 4) * 9;
    orbitSpeed = 0.055 * (index % 2 === 0 ? 1 : -1);
    depthY = -0.92;
  } else if (species === 'manta') {
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 });
    const glowEdge = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0284c7, emissiveIntensity: 0.35 });
    mats.push(topMat, glowEdge);

    const center = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 1.5), topMat);
    const wL = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 1.1), topMat);
    wL.position.set(-0.95, 0, -0.08);
    const wR = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 1.1), topMat);
    wR.position.set(0.95, 0, -0.08);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.22), glowEdge);
    stripe.position.set(0, 0.12, 0.15);
    const whip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.45), topMat);
    whip.position.set(0, 0, -0.72);
    tailPivot.position.set(0, 0, -0.75);
    tailPivot.add(whip);
    root.add(center, wL, wR, stripe, tailPivot);
    wingL = wL;
    wingR = wR;

    orbitRadius = 215 + (index % 4) * 18;
    orbitSpeed = 0.09 * (index % 2 === 0 ? 1 : -1);
    depthY = -1.65;
  } else if (species === 'jellyfish') {
    const col = index % 2 === 0 ? 0xe879f9 : 0x22d3ee;
    const bellMat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
    });
    mats.push(bellMat);
    const bell = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.56, 0.75), bellMat);
    bellMesh = bell;
    root.add(bell);
    for (const [tx, tz] of [
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.2, 0.2],
      [0.2, 0.2],
    ]) {
      const tent = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.09), bellMat);
      tent.position.set(tx, -0.68, tz);
      root.add(tent);
    }
    root.add(tailPivot);
    orbitRadius = 225 + (index % 5) * 15;
    orbitSpeed = 0.045 * (index % 2 === 0 ? 1 : -1);
    depthY = -1.45;
  } else {
    const colors = [0xf97316, 0x22d3ee, 0xfacc15, 0xf43f5e, 0x38bdf8];
    const color = isShark ? 0x64748b : colors[index % colors.length];
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: isShark ? 0x000000 : color,
      emissiveIntensity: isShark ? 0 : 0.28,
      roughness: 0.35,
    });
    mats.push(mat);

    const scale = isShark ? 2.25 : 0.82 + (index % 3) * 0.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.44 * scale, 1.15 * scale), mat);
    root.add(body);

    if (isShark) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.24 * scale, 0.62 * scale, 4), mat);
      fin.position.set(0, 0.46 * scale, -0.05 * scale);
      root.add(fin);
    }

    tailPivot.position.set(0, 0, -0.58 * scale);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.42 * scale, 0.42 * scale), mat);
    tail.position.set(0, 0, -0.22 * scale);
    tailPivot.add(tail);
    root.add(tailPivot);

    orbitRadius = isShark ? 232 + (index % 4) * 16 : 194 + ((index * 13) % 45);
    orbitSpeed = (isShark ? 0.095 : 0.14) * (index % 2 === 0 ? 1 : -1);
    depthY = isShark ? -1.05 : -0.82 - (index % 4) * 0.18;
  }

  const orbitPhase = (index / 42) * Math.PI * 2;
  return {
    species,
    root,
    tailPivot,
    wingL,
    wingR,
    bellMesh,
    orbitRadius,
    orbitSpeed,
    orbitPhase,
    depthY,
    wobbleAmp: species === 'jellyfish' ? 1.2 : 2.6 + (index % 4),
    wobbleFreq: 1.4 + (index % 3) * 0.5,
    isShark,
    leapTimer: species === 'dolphin' ? 2.5 + (index % 5) * 1.9 : 999,
    leapProgress: -1,
    isLeaping: false,
    dispose: () => {
      mats.forEach((m) => m.dispose());
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}

export function createWildAnimal(kind: 'deer' | 'bird', index: number): WildAnimalEntity {
  const root = new THREE.Group();
  const parts: THREE.Object3D[] = [];
  const mats: THREE.Material[] = [];

  if (kind === 'deer') {
    const fur = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
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
    root.add(body, neck, head);

    for (const side of [-0.14, 0.14]) {
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), antler);
      horn.position.set(side, 2.02, 0.72);
      horn.rotation.z = side > 0 ? -0.3 : 0.3;
      root.add(horn);
    }

    for (const [lx, lz] of [
      [-0.22, 0.48],
      [0.22, 0.48],
      [-0.22, -0.48],
      [0.22, -0.48],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), fur);
      leg.position.set(lx, 0.36, lz);
      root.add(leg);
      parts.push(leg);
    }
  } else {
    // Crisp White Coastal Seagulls with grey wingtips & golden beak
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    mats.push(whiteMat, tipMat, beakMat);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.72), whiteMat);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.24), beakMat);
    beak.position.set(0, 0.02, 0.46);

    const wingL = new THREE.Group();
    wingL.position.set(-0.15, 0.05, 0);
    const wLInner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.32), whiteMat);
    wLInner.position.x = -0.28;
    const wLTip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.26), tipMat);
    wLTip.position.x = -0.68;
    wingL.add(wLInner, wLTip);

    const wingR = new THREE.Group();
    wingR.position.set(0.15, 0.05, 0);
    const wRInner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.32), whiteMat);
    wRInner.position.x = 0.28;
    const wRTip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.26), tipMat);
    wRTip.position.x = 0.68;
    wingR.add(wRInner, wRTip);

    root.add(body, beak, wingL, wingR);
    parts.push(wingL, wingR);
  }

  const angle = (index / 14) * Math.PI * 2;
  const r = kind === 'deer' ? 58 + (index % 4) * 26 : 165 + (index % 5) * 14;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const y = kind === 'bird' ? 16 + (index % 4) * 3.8 : 0;
  root.position.set(x, y, z);

  return {
    kind,
    root,
    parts,
    x,
    y,
    z,
    yaw: angle,
    speed: kind === 'deer' ? 4.2 : 14,
    phase: index * 1.1,
    timer: 2 + index,
    orbitR: r,
    orbitSpeed: (kind === 'bird' ? 0.11 + (index % 3) * 0.03 : 0.14) * (index % 2 === 0 ? 1 : -1),
    dispose: () => {
      mats.forEach((m) => m.dispose());
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) m.geometry?.dispose();
      });
    },
  };
}
