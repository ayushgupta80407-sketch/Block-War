import * as THREE from 'three';
import { BoatKind } from './types';

export interface CoastalColliderDef {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  kind: 'wall' | 'floor' | 'ramp' | 'glass' | 'door' | 'trunk';
  slopeAxis?: 'x' | 'z';
  slopeDir?: 1 | -1;
}

export interface InteractiveBench {
  id: string;
  x: number;
  y: number;
  z: number;
  seatX: number;
  seatY: number;
  seatZ: number;
  lookYaw: number;
}

export interface BoatSpawnPoint {
  x: number;
  y: number;
  z: number;
  yaw: number;
  kind: BoatKind;
}

export interface CoastalBuildOutput {
  benches: InteractiveBench[];
  boatSpawnPoints: BoatSpawnPoint[];
  conchSpawnPoints: THREE.Vector3[];
  extraPickupPoints: THREE.Vector3[];
}

export function buildCoastalEnvironment(opts: {
  group: THREE.Group;
  arenaId: string;
  waterLevel: number;
  getCoastRadius: (angle: number) => number;
  getGroundHeightAt: (x: number, z: number) => number;
  wallGeos: THREE.BufferGeometry[];
  floorGeos: THREE.BufferGeometry[];
  trimGeos: THREE.BufferGeometry[];
  rampGeos: THREE.BufferGeometry[];
  colliders: CoastalColliderDef[];
  animatedObjects: Array<(t: number, dt: number) => void>;
  disposables: Array<{ dispose: () => void }>;
  rng: () => number;
}): CoastalBuildOutput {
  const {
    group,
    waterLevel,
    getCoastRadius,
    getGroundHeightAt,
    colliders,
    animatedObjects,
    disposables,
    rng,
  } = opts;

  const benches: InteractiveBench[] = [];
  const boatSpawnPoints: BoatSpawnPoint[] = [];
  const conchSpawnPoints: THREE.Vector3[] = [];
  const extraPickupPoints: THREE.Vector3[] = [];

  // Shared materials for coastal features
  const pierWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const pierPostMat = new THREE.MeshStandardMaterial({ color: 0x57260a, roughness: 0.9 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, flatShading: true });
  const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const whiteTowerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 });
  disposables.push(
    pierWoodMat,
    pierPostMat,
    lanternMat,
    stoneMat,
    redStripeMat,
    whiteTowerMat,
    benchWoodMat
  );

  const addBoxCollider = (
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    kind: 'wall' | 'floor' | 'trunk' = 'wall'
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

  // Helper to place a crafted wooden/stone bench facing outward angle
  let benchIdx = 0;
  const addBench = (bx: number, by: number, bz: number, outwardAngle: number, isStone = false) => {
    const id = `bench_${++benchIdx}`;
    // Outward vector is (cos(outwardAngle), sin(outwardAngle)).
    // Forward direction in engine is (-sin(yaw), -cos(yaw)).
    const rx = Math.cos(outwardAngle);
    const rz = Math.sin(outwardAngle);
    const lookYaw = Math.atan2(-rx, -rz);

    const benchGroup = new THREE.Group();
    benchGroup.position.set(bx, by, bz);
    benchGroup.rotation.y = lookYaw + Math.PI; // +Z of bench faces -Z of player look -> wait: if rot.y = lookYaw, -Z faces (rx, rz)

    const seatMat = isStone ? stoneMat : benchWoodMat;
    const legMat = isStone ? stoneMat : pierPostMat;
    const seatGeo = new THREE.BoxGeometry(2.5, 0.18, 0.85);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.56, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;

    const backGeo = new THREE.BoxGeometry(2.5, 0.62, 0.16);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.94, 0.36); // behind player (-Z is forward!)
    back.castShadow = true;

    const legGeo = new THREE.BoxGeometry(0.22, 0.56, 0.72);
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-1.02, 0.28, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(1.02, 0.28, 0);

    // Fix rotation so bench back (+Z local) is behind player and open front (-Z local) faces outwardAngle
    benchGroup.rotation.y = lookYaw;
    benchGroup.add(seat, back, legL, legR);
    group.add(benchGroup);
    disposables.push(seatGeo, backGeo, legGeo);

    benches.push({
      id,
      x: bx,
      y: by,
      z: bz,
      seatX: bx,
      seatY: by + 0.38,
      seatZ: bz,
      lookYaw,
    });
  };

  // 1. FOUR EXTENDED WOODEN PIERS & BOARDWALKS (N, E, S, W) + MOORED SPEEDBOATS/JET SKIS
  const pierConfigs: Array<{ axis: 'x' | 'z'; dir: 1 | -1; angle: number; boatA: BoatKind; boatB: BoatKind }> = [
    { axis: 'x', dir: 1, angle: 0, boatA: 'fishing_boat', boatB: 'jetski' },
    { axis: 'x', dir: -1, angle: Math.PI, boatA: 'jetski', boatB: 'speedboat' },
    { axis: 'z', dir: 1, angle: Math.PI / 2, boatA: 'speedboat', boatB: 'fishing_boat' },
    { axis: 'z', dir: -1, angle: -Math.PI / 2, boatA: 'fishing_boat', boatB: 'speedboat' },
  ];

  const plankGeo = new THREE.BoxGeometry(5.6, 0.34, 30);
  const rampGeo = new THREE.BoxGeometry(5.2, 0.28, 6.4);
  const pilingGeo = new THREE.CylinderGeometry(0.32, 0.36, 4.2, 8);
  const postGeo = new THREE.BoxGeometry(0.38, 1.35, 0.38);
  const lampHeadGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
  disposables.push(plankGeo, rampGeo, pilingGeo, postGeo, lampHeadGeo);

  pierConfigs.forEach((pc, idx) => {
    const coastR = getCoastRadius(pc.angle);
    const startR = coastR - 6;
    const len = 30;
    const midR = startR + len * 0.5;
    const endR = startR + len;
    const deckY = 0.65;
    const px = Math.cos(pc.angle) * midR;
    const pz = Math.sin(pc.angle) * midR;

    const alongZ = pc.axis === 'z';
    const deck = new THREE.Mesh(plankGeo, pierWoodMat);
    deck.position.set(px, deckY - 0.17, pz);
    if (!alongZ) deck.rotation.y = Math.PI / 2;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    // Walkable pier deck collider
    const deckW = alongZ ? 5.6 : len;
    const deckD = alongZ ? len : 5.6;
    addBoxCollider(px, deckY - 0.17, pz, deckW, 0.34, deckD, 'floor');

    // Sloped ramp connecting beach sand -> pier deck
    const rampCenterR = startR - 2.6;
    const rcx = Math.cos(pc.angle) * rampCenterR;
    const rcz = Math.sin(pc.angle) * rampCenterR;
    const groundAtStart = Math.max(-0.15, getGroundHeightAt(Math.cos(pc.angle) * (startR - 5.4), Math.sin(pc.angle) * (startR - 5.4)));
    const rampMidY = (groundAtStart + deckY) * 0.5;
    const rampMesh = new THREE.Mesh(rampGeo, pierWoodMat);
    rampMesh.position.set(rcx, rampMidY - 0.14, rcz);
    const slopeAngle = Math.atan2(deckY - groundAtStart, 6.0);
    if (alongZ) {
      rampMesh.rotation.x = pc.dir > 0 ? -slopeAngle : slopeAngle;
    } else {
      rampMesh.rotation.y = Math.PI / 2;
      rampMesh.rotation.z = pc.dir > 0 ? slopeAngle : -slopeAngle;
    }
    group.add(rampMesh);

    colliders.push({
      minX: rcx - (alongZ ? 2.6 : 3.1),
      maxX: rcx + (alongZ ? 2.6 : 3.1),
      minY: groundAtStart - 0.25,
      maxY: deckY,
      minZ: rcz - (alongZ ? 3.1 : 2.6),
      maxZ: rcz + (alongZ ? 3.1 : 2.6),
      kind: 'ramp',
      slopeAxis: pc.axis,
      slopeDir: pc.dir,
    });

    // Pilings, Mooring Posts & Warm Lanterns along pier sides
    for (let s = 4; s <= len; s += 6.5) {
      const rr = startR + s;
      const cx = Math.cos(pc.angle) * rr;
      const cz = Math.sin(pc.angle) * rr;
      for (const side of [-2.4, 2.4]) {
        const ox = alongZ ? side : 0;
        const oz = alongZ ? 0 : side;
        const piling = new THREE.Mesh(pilingGeo, pierPostMat);
        piling.position.set(cx + ox, deckY - 1.9, cz + oz);
        group.add(piling);

        if (s > 8 && Math.round(s) % 13 === 0) {
          const post = new THREE.Mesh(postGeo, pierPostMat);
          post.position.set(cx + ox, deckY + 0.68, cz + oz);
          group.add(post);
          if (s >= len - 5) {
            const lamp = new THREE.Mesh(lampHeadGeo, lanternMat);
            lamp.position.set(cx + ox, deckY + 1.5, cz + oz);
            group.add(lamp);
          }
        }
      }
    }

    // Pier end scenic bench facing sea!
    const bx = Math.cos(pc.angle) * (endR - 1.8);
    const bz = Math.sin(pc.angle) * (endR - 1.8);
    addBench(bx, deckY, bz, pc.angle, false);

    // Extra shoreline bench just beside pier entrance
    const sideAngle = pc.angle + 0.085;
    const sBenchR = getCoastRadius(sideAngle) - 8;
    const sbx = Math.cos(sideAngle) * sBenchR;
    const sbz = Math.sin(sideAngle) * sBenchR;
    addBench(sbx, Math.max(0.05, getGroundHeightAt(sbx, sbz)), sbz, sideAngle, false);

    // Moored boats right next to this pier!
    const sideDirX = -Math.sin(pc.angle);
    const sideDirZ = Math.cos(pc.angle);
    boatSpawnPoints.push({
      x: Math.cos(pc.angle) * (endR - 5) + sideDirX * 6.2,
      y: waterLevel,
      z: Math.sin(pc.angle) * (endR - 5) + sideDirZ * 6.2,
      yaw: pc.angle + Math.PI * 0.45,
      kind: pc.boatA,
    });
    boatSpawnPoints.push({
      x: Math.cos(pc.angle) * (endR + 4) - sideDirX * 6.2,
      y: waterLevel,
      z: Math.sin(pc.angle) * (endR + 4) - sideDirZ * 6.2,
      yaw: pc.angle - Math.PI * 0.35,
      kind: pc.boatB,
    });

    // Boat dock pickup (medkit / ammo) on end of pier
    extraPickupPoints.push(
      new THREE.Vector3(Math.cos(pc.angle) * (endR - 7), deckY + 0.6, Math.sin(pc.angle) * (endR - 7))
    );
    void idx;
  });

  // 2. ANCHORED MEDIUM PIRATE BOATS & LARGE BATTLESHIP CRUISERS OFF COASTLINE
  const pirateAngles = [Math.PI * 0.25, Math.PI * 0.92, -Math.PI * 0.38];
  pirateAngles.forEach((a, i) => {
    const r = getCoastRadius(a) + 27;
    boatSpawnPoints.push({
      x: Math.cos(a) * r,
      y: waterLevel,
      z: Math.sin(a) * r,
      yaw: a + Math.PI * 0.55 + i * 0.3,
      kind: 'pirate_boat',
    });
  });

  const cruiserAngles = [Math.PI * 0.68, -Math.PI * 0.72];
  cruiserAngles.forEach((a) => {
    const r = getCoastRadius(a) + 42;
    boatSpawnPoints.push({
      x: Math.cos(a) * r,
      y: waterLevel,
      z: Math.sin(a) * r,
      yaw: a + Math.PI * 0.5,
      kind: 'battleship',
    });
  });

  // 3. COASTAL LIGHTHOUSE ON ROCKY CLIFF OVERLOOK (NE Beach Cove)
  const lhAngle = Math.PI * 0.22;
  const lhR = getCoastRadius(lhAngle) - 18;
  const lhX = Math.cos(lhAngle) * lhR;
  const lhZ = Math.sin(lhAngle) * lhR;
  const lhGround = Math.max(0.1, getGroundHeightAt(lhX, lhZ));

  // Rocky cliff plinth
  const cliffGeo = new THREE.BoxGeometry(11.5, 2.2, 11.5);
  const cliffMesh = new THREE.Mesh(cliffGeo, stoneMat);
  cliffMesh.position.set(lhX, lhGround + 0.9, lhZ);
  cliffMesh.castShadow = true;
  cliffMesh.receiveShadow = true;
  group.add(cliffMesh);
  disposables.push(cliffGeo);
  const cliffTopY = lhGround + 2.0;
  addBoxCollider(lhX, lhGround + 1.0, lhZ, 11.5, 2.0, 11.5, 'floor');

  // Walkable Ramp from Beach up onto Lighthouse Cliff
  const cliffRampLen = 6.5;
  const cliffRampGeo = new THREE.BoxGeometry(3.6, 0.3, cliffRampLen);
  const cliffRamp = new THREE.Mesh(cliffRampGeo, stoneMat);
  cliffRamp.position.set(lhX - 8.2, lhGround + 1.0, lhZ);
  cliffRamp.rotation.y = Math.PI / 2;
  cliffRamp.rotation.z = Math.atan2(2.0, cliffRampLen);
  group.add(cliffRamp);
  disposables.push(cliffRampGeo);
  colliders.push({
    minX: lhX - 11.4,
    maxX: lhX - 5.2,
    minY: lhGround - 0.2,
    maxY: cliffTopY,
    minZ: lhZ - 1.8,
    maxZ: lhZ + 1.8,
    kind: 'ramp',
    slopeAxis: 'x',
    slopeDir: 1,
  });

  // Scenic stone bench right on the lighthouse cliff overlooking the sea
  addBench(lhX + 3.6, cliffTopY, lhZ + 3.2, lhAngle, true);

  // Striped Lighthouse Tower (6 bands up to y = cliffTopY + 13.5)
  const towerCoreW = 4.2;
  const bandH = 2.2;
  for (let b = 0; b < 6; b++) {
    const bandGeo = new THREE.BoxGeometry(towerCoreW - b * 0.14, bandH, towerCoreW - b * 0.14);
    const bandMesh = new THREE.Mesh(bandGeo, b % 2 === 0 ? whiteTowerMat : redStripeMat);
    bandMesh.position.set(lhX, cliffTopY + bandH * 0.5 + b * bandH, lhZ);
    bandMesh.castShadow = true;
    bandMesh.receiveShadow = true;
    group.add(bandMesh);
    disposables.push(bandGeo);
  }
  addBoxCollider(lhX, cliffTopY + 6.6, lhZ, 4.0, 13.2, 4.0, 'wall');

  // Sniper Balcony Deck around Lighthouse Top + Parapets + Beacon
  const balconyY = cliffTopY + 13.2;
  const balGeo = new THREE.BoxGeometry(7.6, 0.4, 7.6);
  const balMesh = new THREE.Mesh(balGeo, stoneMat);
  balMesh.position.set(lhX, balconyY - 0.2, lhZ);
  balMesh.castShadow = true;
  group.add(balMesh);
  disposables.push(balGeo);
  addBoxCollider(lhX, balconyY - 0.2, lhZ, 7.6, 0.4, 7.6, 'floor');

  // Walkable external switchback stairs up to Lighthouse Sniper Balcony
  const addExteriorStair = (
    sx: number,
    sz: number,
    y0: number,
    y1: number,
    run: number,
    width: number,
    axis: 'x' | 'z',
    dir: 1 | -1
  ) => {
    const h = y1 - y0;
    const hyp = Math.hypot(run, h);
    const angle = Math.atan2(h, run);
    const sGeo = new THREE.BoxGeometry(axis === 'x' ? hyp : width, 0.26, axis === 'z' ? hyp : width);
    const sMesh = new THREE.Mesh(sGeo, pierWoodMat);
    sMesh.position.set(sx, (y0 + y1) * 0.5 - 0.12, sz);
    if (axis === 'z') sMesh.rotation.x = dir > 0 ? -angle : angle;
    else sMesh.rotation.z = dir > 0 ? angle : -angle;
    sMesh.castShadow = true;
    group.add(sMesh);
    disposables.push(sGeo);
    colliders.push({
      minX: sx - (axis === 'x' ? run * 0.5 : width * 0.5),
      maxX: sx + (axis === 'x' ? run * 0.5 : width * 0.5),
      minY: y0 - 0.25,
      maxY: y1,
      minZ: sz - (axis === 'z' ? run * 0.5 : width * 0.5),
      maxZ: sz + (axis === 'z' ? run * 0.5 : width * 0.5),
      kind: 'ramp',
      slopeAxis: axis,
      slopeDir: dir,
    });
  };

  // Flight 1 (West side going North): cliffTopY -> cliffTopY + 6.6
  addExteriorStair(lhX - 3.3, lhZ, cliffTopY, cliffTopY + 6.6, 7.2, 2.2, 'z', -1);
  // Mid landing
  const midLandGeo = new THREE.BoxGeometry(5.6, 0.35, 2.6);
  const midLand = new THREE.Mesh(midLandGeo, stoneMat);
  midLand.position.set(lhX - 1.6, cliffTopY + 6.42, lhZ - 4.4);
  group.add(midLand);
  disposables.push(midLandGeo);
  addBoxCollider(lhX - 1.6, cliffTopY + 6.42, lhZ - 4.4, 5.6, 0.35, 2.6, 'floor');
  // Flight 2 (North side going East to Sniper Balcony!)
  addExteriorStair(lhX + 2.4, lhZ - 4.4, cliffTopY + 6.6, balconyY, 6.2, 2.2, 'x', 1);

  extraPickupPoints.push(new THREE.Vector3(lhX + 2.5, balconyY + 0.6, lhZ + 2.5));

  // Lighthouse Beacon Lantern + Rotating Golden Light Beam
  const beaconBoxGeo = new THREE.BoxGeometry(2.6, 2.2, 2.6);
  const beaconBox = new THREE.Mesh(beaconBoxGeo, lanternMat);
  beaconBox.position.set(lhX, balconyY + 1.3, lhZ);
  const beaconRoofGeo = new THREE.ConeGeometry(2.4, 1.8, 4);
  const beaconRoof = new THREE.Mesh(beaconRoofGeo, redStripeMat);
  beaconRoof.position.set(lhX, balconyY + 3.2, lhZ);
  beaconRoof.rotation.y = Math.PI / 4;
  group.add(beaconBox, beaconRoof);

  const beamPivot = new THREE.Group();
  beamPivot.position.set(lhX, balconyY + 1.5, lhZ);
  const beamGeo = new THREE.ConeGeometry(4.5, 42, 12, 1, true);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 21);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamPivot.add(beamMesh);
  group.add(beamPivot);
  disposables.push(beaconBoxGeo, beaconRoofGeo, beamGeo, beamMat);
  animatedObjects.push((t) => {
    beamPivot.rotation.y = t * 0.65;
  });

  // 4. EXTRA SCENIC COASTAL BENCHES AROUND COVES
  const scenicAngles = [Math.PI * 0.14, Math.PI * 0.42, Math.PI * 0.78, -Math.PI * 0.25, -Math.PI * 0.62, -Math.PI * 0.85];
  scenicAngles.forEach((a) => {
    const r = getCoastRadius(a) - 11;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const by = Math.max(0.05, getGroundHeightAt(bx, bz));
    addBench(bx, by, bz, a, false);
  });

  // 5. INSTANCED LEANING PALM TREES ALONG SHORELINE
  const palmCount = 38;
  const pTrunkGeo = new THREE.BoxGeometry(0.68, 2.4, 0.68);
  const pFrondGeo = new THREE.BoxGeometry(3.4, 0.22, 1.05);
  const pTrunkMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
  const pFrondMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 });
  const palmTrunks = new THREE.InstancedMesh(pTrunkGeo, pTrunkMat, palmCount * 3);
  const palmFronds = new THREE.InstancedMesh(pFrondGeo, pFrondMat, palmCount * 4);
  palmTrunks.castShadow = true;
  palmFronds.castShadow = true;
  const dummy = new THREE.Object3D();

  let pIdx = 0;
  for (let i = 0; i < palmCount; i++) {
    const a = (i / palmCount) * Math.PI * 2 + 0.16;
    if (Math.abs(Math.sin(a)) < 0.08 || Math.abs(Math.cos(a)) < 0.08) continue; // Keep clear of piers
    const r = getCoastRadius(a) - 12 - (i % 3) * 2.5;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const py = Math.max(0, getGroundHeightAt(px, pz));
    const leanYaw = -a + Math.PI * 0.5;
    const leanX = Math.cos(a);
    const leanZ = Math.sin(a);

    // 3 curved leaning trunk segments
    for (let seg = 0; seg < 3; seg++) {
      const segOff = seg * 0.52;
      dummy.position.set(px + leanX * segOff, py + 1.1 + seg * 2.1, pz + leanZ * segOff);
      dummy.rotation.set(0, leanYaw, 0);
      dummy.rotateX(-0.18 - seg * 0.06);
      dummy.scale.setScalar(1 - seg * 0.12);
      dummy.updateMatrix();
      palmTrunks.setMatrixAt(pIdx * 3 + seg, dummy.matrix);
    }

    const topX = px + leanX * 1.35;
    const topY = py + 6.35;
    const topZ = pz + leanZ * 1.35;
    for (let f = 0; f < 4; f++) {
      dummy.position.set(topX, topY, topZ);
      dummy.rotation.set(0, a + (f * Math.PI) / 2, -0.28);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      palmFronds.setMatrixAt(pIdx * 4 + f, dummy.matrix);
    }

    addBoxCollider(px, py + 2.2, pz, 0.85, 4.4, 0.85, 'trunk');
    pIdx += 1;
  }
  palmTrunks.count = pIdx * 3;
  palmFronds.count = pIdx * 4;
  palmTrunks.instanceMatrix.needsUpdate = true;
  palmFronds.instanceMatrix.needsUpdate = true;
  palmTrunks.computeBoundingSphere();
  palmFronds.computeBoundingSphere();
  group.add(palmTrunks, palmFronds);
  disposables.push(pTrunkGeo, pFrondGeo, pTrunkMat, pFrondMat);

  // 6. INSTANCED BEACH UMBRELLAS, SUN LOUNGERS, SURFBOARDS, BARRELS, TIKI TORCHES & CAMPFIRES
  const umbCount = 18;
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.7, 6);
  const canopyGeo = new THREE.ConeGeometry(1.9, 0.75, 6);
  const loungerGeo = new THREE.BoxGeometry(1.05, 0.24, 2.2);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const canopyMat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const loungerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });

  const poles = new THREE.InstancedMesh(poleGeo, poleMat, umbCount);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, umbCount);
  const loungers = new THREE.InstancedMesh(loungerGeo, loungerMat, umbCount);
  poles.castShadow = true;
  canopies.castShadow = true;
  loungers.castShadow = true;
  const umbColors = [0xef4444, 0x0ea5e9, 0xfacc15, 0xec4899, 0x10b981];
  const instCol = new THREE.Color();

  for (let i = 0; i < umbCount; i++) {
    const a = (i / umbCount) * Math.PI * 2 + 0.14;
    const r = getCoastRadius(a) - 8.5;
    const ux = Math.cos(a) * r;
    const uz = Math.sin(a) * r;
    const uy = Math.max(0.02, getGroundHeightAt(ux, uz));

    dummy.position.set(ux, uy + 1.35, uz);
    dummy.rotation.set(0, a, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(ux, uy + 2.7, uz);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
    canopies.setColorAt(i, instCol.setHex(umbColors[i % umbColors.length]));

    // Lounger tucked right beside the umbrella facing ocean
    const lx = ux + Math.cos(a + 0.02) * 1.45;
    const lz = uz + Math.sin(a + 0.02) * 1.45;
    const ly = Math.max(0.0, getGroundHeightAt(lx, lz));
    dummy.position.set(lx, ly + 0.25, lz);
    dummy.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), 0);
    dummy.updateMatrix();
    loungers.setMatrixAt(i, dummy.matrix);
  }
  poles.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
  loungers.instanceMatrix.needsUpdate = true;
  poles.computeBoundingSphere();
  canopies.computeBoundingSphere();
  loungers.computeBoundingSphere();
  group.add(poles, canopies, loungers);
  disposables.push(poleGeo, canopyGeo, loungerGeo, poleMat, canopyMat, loungerMat);

  // Surfboards & Barrels & Tiki Torches + Campfires
  const surfCount = 12;
  const surfGeo = new THREE.BoxGeometry(0.65, 2.35, 0.12);
  const surfMat = new THREE.MeshStandardMaterial({ roughness: 0.3 });
  const surfboards = new THREE.InstancedMesh(surfGeo, surfMat, surfCount);
  surfboards.castShadow = true;
  for (let i = 0; i < surfCount; i++) {
    const a = (i / surfCount) * Math.PI * 2 + 0.28;
    const r = getCoastRadius(a) - 6.0;
    const sx = Math.cos(a) * r;
    const sz = Math.sin(a) * r;
    const sy = Math.max(0, getGroundHeightAt(sx, sz));
    dummy.position.set(sx, sy + 0.95, sz);
    dummy.rotation.set(0.18, a, 0.12);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    surfboards.setMatrixAt(i, dummy.matrix);
    surfboards.setColorAt(i, instCol.setHex(umbColors[(i + 2) % umbColors.length]));
  }
  surfboards.instanceMatrix.needsUpdate = true;
  if (surfboards.instanceColor) surfboards.instanceColor.needsUpdate = true;
  surfboards.computeBoundingSphere();
  group.add(surfboards);
  disposables.push(surfGeo, surfMat);

  const tikiCount = 14;
  const tikiStickGeo = new THREE.BoxGeometry(0.16, 2.1, 0.16);
  const tikiFlameGeo = new THREE.BoxGeometry(0.32, 0.42, 0.32);
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xfb923c,
    emissiveIntensity: 1.8,
  });
  const tikiSticks = new THREE.InstancedMesh(tikiStickGeo, pierPostMat, tikiCount);
  const tikiFlames = new THREE.InstancedMesh(tikiFlameGeo, flameMat, tikiCount);
  for (let i = 0; i < tikiCount; i++) {
    const a = (i / tikiCount) * Math.PI * 2 + 0.08;
    const r = getCoastRadius(a) - 10.5;
    const tx = Math.cos(a) * r;
    const tz = Math.sin(a) * r;
    const ty = Math.max(0.02, getGroundHeightAt(tx, tz));
    dummy.position.set(tx, ty + 1.05, tz);
    dummy.rotation.set(0, a, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    tikiSticks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tx, ty + 2.22, tz);
    dummy.updateMatrix();
    tikiFlames.setMatrixAt(i, dummy.matrix);
  }
  tikiSticks.instanceMatrix.needsUpdate = true;
  tikiFlames.instanceMatrix.needsUpdate = true;
  tikiSticks.computeBoundingSphere();
  tikiFlames.computeBoundingSphere();
  group.add(tikiSticks, tikiFlames);
  disposables.push(tikiStickGeo, tikiFlameGeo, flameMat);

  // Wooden Barrels & Washed-up Treasure Chests
  const barrelCount = 16;
  const barrelGeo = new THREE.CylinderGeometry(0.45, 0.48, 1.05, 8);
  const barrelInst = new THREE.InstancedMesh(barrelGeo, benchWoodMat, barrelCount);
  barrelInst.castShadow = true;
  for (let i = 0; i < barrelCount; i++) {
    const a = (i / barrelCount) * Math.PI * 2 + 0.04;
    const r = getCoastRadius(a) - 7.5;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const by = Math.max(0, getGroundHeightAt(bx, bz));
    dummy.position.set(bx, by + 0.52, bz);
    dummy.rotation.set(0, i, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    barrelInst.setMatrixAt(i, dummy.matrix);
  }
  barrelInst.instanceMatrix.needsUpdate = true;
  barrelInst.computeBoundingSphere();
  group.add(barrelInst);
  disposables.push(barrelGeo);

  const chestCount = 6;
  const chestGeo = new THREE.BoxGeometry(1.15, 0.72, 0.75);
  const chestMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65, metalness: 0.2 });
  const chests = new THREE.InstancedMesh(chestGeo, chestMat, chestCount);
  chests.castShadow = true;
  for (let i = 0; i < chestCount; i++) {
    const a = (i / chestCount) * Math.PI * 2 + 0.35;
    const r = getCoastRadius(a) - 2.5;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const cy = Math.max(-0.2, getGroundHeightAt(cx, cz));
    dummy.position.set(cx, cy + 0.35, cz);
    dummy.rotation.set(0.08, a + 0.5, -0.06);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    chests.setMatrixAt(i, dummy.matrix);
  }
  chests.instanceMatrix.needsUpdate = true;
  chests.computeBoundingSphere();
  group.add(chests);
  disposables.push(chestGeo, chestMat);

  // 7. SEASHELLS, STARFISH, PEBBLES & DRIFTWOOD ALONG WET SAND
  const shellCount = 70;
  const shellGeo = new THREE.ConeGeometry(0.24, 0.36, 5);
  const shellMat = new THREE.MeshStandardMaterial({ roughness: 0.45 });
  const shells = new THREE.InstancedMesh(shellGeo, shellMat, shellCount);
  const shellColors = [0xfef3c7, 0xfbcfe8, 0xfde68a, 0xe0f2fe, 0xfed7aa];
  for (let i = 0; i < shellCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = getCoastRadius(a) - 6.5 + rng() * 7.0;
    const sx = Math.cos(a) * r;
    const sz = Math.sin(a) * r;
    const sy = getGroundHeightAt(sx, sz);
    dummy.position.set(sx, sy + 0.08, sz);
    dummy.rotation.set(Math.PI * 0.42, rng() * Math.PI * 2, rng() * 0.3);
    dummy.scale.setScalar(0.8 + rng() * 0.65);
    dummy.updateMatrix();
    shells.setMatrixAt(i, dummy.matrix);
    shells.setColorAt(i, instCol.setHex(shellColors[i % shellColors.length]));
  }
  shells.instanceMatrix.needsUpdate = true;
  if (shells.instanceColor) shells.instanceColor.needsUpdate = true;
  shells.computeBoundingSphere();
  group.add(shells);
  disposables.push(shellGeo, shellMat);

  const starCount = 42;
  const starGeo = new THREE.BoxGeometry(0.45, 0.1, 0.45);
  const starMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  const starfish = new THREE.InstancedMesh(starGeo, starMat, starCount);
  const starColors = [0xf97316, 0xf43f5e, 0xfacc15, 0xfb7185];
  for (let i = 0; i < starCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = getCoastRadius(a) - 4.5 + rng() * 5.2;
    const sx = Math.cos(a) * r;
    const sz = Math.sin(a) * r;
    const sy = getGroundHeightAt(sx, sz);
    dummy.position.set(sx, sy + 0.06, sz);
    dummy.rotation.set(0, rng() * Math.PI, 0);
    dummy.scale.setScalar(0.75 + rng() * 0.6);
    dummy.updateMatrix();
    starfish.setMatrixAt(i, dummy.matrix);
    starfish.setColorAt(i, instCol.setHex(starColors[i % starColors.length]));
  }
  starfish.instanceMatrix.needsUpdate = true;
  if (starfish.instanceColor) starfish.instanceColor.needsUpdate = true;
  starfish.computeBoundingSphere();
  group.add(starfish);
  disposables.push(starGeo, starMat);

  const pebbleCount = 90;
  const pebbleGeo = new THREE.DodecahedronGeometry(0.24, 0);
  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85, flatShading: true });
  const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
  for (let i = 0; i < pebbleCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = getCoastRadius(a) - 8 + rng() * 9;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const py = getGroundHeightAt(px, pz);
    dummy.position.set(px, py + 0.06, pz);
    dummy.rotation.set(rng(), rng(), rng());
    dummy.scale.set(1 + rng(), 0.5, 0.9 + rng());
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  pebbles.computeBoundingSphere();
  group.add(pebbles);
  disposables.push(pebbleGeo, pebbleMat);

  const driftCount = 16;
  const driftGeo = new THREE.BoxGeometry(2.6, 0.32, 0.36);
  const driftMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.92 });
  const driftwood = new THREE.InstancedMesh(driftGeo, driftMat, driftCount);
  for (let i = 0; i < driftCount; i++) {
    const a = (i / driftCount) * Math.PI * 2 + 0.21;
    const r = getCoastRadius(a) - 2.0 + rng() * 2.5;
    const dx = Math.cos(a) * r;
    const dz = Math.sin(a) * r;
    const dy = getGroundHeightAt(dx, dz);
    dummy.position.set(dx, dy + 0.14, dz);
    dummy.rotation.set(0.05, a + 1.2, 0.04);
    dummy.scale.setScalar(0.85 + rng() * 0.6);
    dummy.updateMatrix();
    driftwood.setMatrixAt(i, dummy.matrix);
  }
  driftwood.instanceMatrix.needsUpdate = true;
  driftwood.computeBoundingSphere();
  group.add(driftwood);
  disposables.push(driftGeo, driftMat);

  // Shallow inner lagoon anemones (outer deep coral reefs & kelp handled by worldExpansion.ts)
  const coralCount = 24;
  const coralGeo = new THREE.BoxGeometry(0.95, 1.15, 0.95);
  const coralMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  const corals = new THREE.InstancedMesh(coralGeo, coralMat, coralCount);
  const coralColors = [0xf43f5e, 0x22d3ee, 0xa855f7, 0xf97316, 0xec4899, 0x14b8a6];
  for (let i = 0; i < coralCount; i++) {
    const a = (i / coralCount) * Math.PI * 2 + rng() * 0.08;
    const r = getCoastRadius(a) + 4 + rng() * 6;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const cy = getGroundHeightAt(cx, cz);
    dummy.position.set(cx, cy + 0.55, cz);
    dummy.rotation.set((rng() - 0.5) * 0.3, rng() * Math.PI, (rng() - 0.5) * 0.3);
    dummy.scale.set(0.75 + rng() * 0.6, 0.7 + rng() * 0.9, 0.75 + rng() * 0.6);
    dummy.updateMatrix();
    corals.setMatrixAt(i, dummy.matrix);
    corals.setColorAt(i, instCol.setHex(coralColors[i % coralColors.length]));
  }
  corals.instanceMatrix.needsUpdate = true;
  if (corals.instanceColor) corals.instanceColor.needsUpdate = true;
  corals.computeBoundingSphere();
  group.add(corals);
  disposables.push(coralGeo, coralMat);

  // 9. COLLECTIBLE GLOWING GOLDEN CONCH SHELL SPAWNS ALONG SANDY COVES
  const conchCount = 10;
  for (let i = 0; i < conchCount; i++) {
    const a = (i / conchCount) * Math.PI * 2 + 0.19;
    const r = getCoastRadius(a) - 3.0;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const cy = Math.max(-0.05, getGroundHeightAt(cx, cz)) + 0.55;
    conchSpawnPoints.push(new THREE.Vector3(cx, cy, cz));
  }

  return {
    benches,
    boatSpawnPoints,
    conchSpawnPoints,
    extraPickupPoints,
  };
}
