import * as THREE from 'three';
import { AirplaneId, ParachuteId } from './types';
import { WeaponModelHandle } from './weapons';

function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
      else m.material?.dispose();
    }
  });
}

export function createAirplaneModel(airplaneId: AirplaneId): WeaponModelHandle {
  const group = new THREE.Group();
  const propSpinners = new THREE.Group();
  group.add(propSpinners);

  if (airplaneId === 'royal_gold_jet') {
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.35 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.22,
      roughness: 0.2,
      metalness: 0.85,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
    });

    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 11.2), whiteMat);
    const goldStripe = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.45, 10.6), goldMat);
    goldStripe.position.y = -0.15;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 4), goldMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.z = 6.8;

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 1.8), darkMat);
    cockpit.position.set(0, 0.85, 4.4);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.36, 3.0), whiteMat);
    wing.position.set(0, -0.25, 0.6);
    const goldWingTrim = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.14, 0.6), goldMat);
    goldWingTrim.position.set(0, -0.2, 1.8);

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 1.5), goldMat);
    tailWing.position.set(0, 0.4, -4.8);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.6, 2.0), goldMat);
    tailFin.position.set(0, 1.8, -4.6);

    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.5, 2.5, 10), goldMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 3.4, -0.75, 0.8);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10), glowMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side * 3.4, -0.75, -0.5);

      const tipLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.5), glowMat);
      tipLight.position.set(side * 6.9, -0.2, 0.8);
      group.add(pod, exhaust, tipLight);
    }

    group.add(fuselage, goldStripe, nose, cockpit, wing, goldWingTrim, tailWing, tailFin);
    return {
      group,
      muzzleLocal: new THREE.Vector3(0, 0, 8),
      animatedPartA: propSpinners,
      dispose: () => disposeGroup(group),
    };
  }

  if (airplaneId === 'stealth_cyber_striker') {
    const matteMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.42, metalness: 0.65 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.4,
    });

    const core = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 11.4), matteMat);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 2.8), cyanMat);
    canopy.position.set(0, 0.82, 2.8);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 4), matteMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.z = 7.2;

    const deltaLeft = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.28, 5.2), slateMat);
    deltaLeft.position.set(-4.0, -0.15, -0.8);
    deltaLeft.rotation.y = 0.32;
    const deltaRight = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.28, 5.2), slateMat);
    deltaRight.position.set(4.0, -0.15, -0.8);
    deltaRight.rotation.y = -0.32;

    const trimStrip = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.12, 0.32), cyanMat);
    trimStrip.position.set(0, 0.04, -1.6);

    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.2, 1.9), slateMat);
      fin.position.set(side * 1.4, 1.35, -4.6);
      fin.rotation.z = -side * 0.36;
      const thruster = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 1.0), cyanMat);
      thruster.position.set(side * 0.8, -0.1, -5.9);
      group.add(fin, thruster);
    }

    group.add(core, canopy, nose, deltaLeft, deltaRight, trimStrip);
    return {
      group,
      muzzleLocal: new THREE.Vector3(0, 0, 8.6),
      animatedPartA: propSpinners,
      dispose: () => disposeGroup(group),
    };
  }

  if (airplaneId === 'dragon_fire_bomber') {
    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35, metalness: 0.45 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.45 });
    const goldTeethMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.25 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.5,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.6, 11.4), crimsonMat);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.8, 11.0), blackMat);
    belly.position.y = -1.0;

    const noseCap = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 1.8), blackMat);
    noseCap.position.z = 6.4;
    // Shark-teeth nose art blocks
    for (let i = -2; i <= 2; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 3), goldTeethMat);
      tooth.position.set(i * 0.46, -0.55, 7.35);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 1.7), flameMat);
    cockpit.position.set(0, 1.25, 4.1);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.48, 3.4), blackMat);
    wing.position.set(0, 0.2, 0.4);
    const wingFlame = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.52, 0.7), crimsonMat);
    wingFlame.position.set(0, 0.2, 1.8);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.38, 1.8), crimsonMat);
    tail.position.set(0, 0.6, -4.8);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.9, 2.4), blackMat);
    fin.position.set(0, 2.1, -4.7);

    for (const side of [-1, 1]) {
      const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.58, 2.4, 8), blackMat);
      turbine.rotation.x = Math.PI / 2;
      turbine.position.set(side * 4.0, -0.25, 1.1);
      const fireCore = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.6, 6), flameMat);
      fireCore.rotation.x = -Math.PI / 2;
      fireCore.position.set(side * 4.0, -0.25, -0.8);
      group.add(turbine, fireCore);
    }

    group.add(body, belly, noseCap, cockpit, wing, wingFlame, tail, fin);
    return {
      group,
      muzzleLocal: new THREE.Vector3(0, 0, 8),
      animatedPartA: propSpinners,
      dispose: () => disposeGroup(group),
    };
  }

  // Default: Standard Cargo Carrier (military green/grey twin-prop)
  const oliveMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.62, metalness: 0.22 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.45 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
  });
  const propMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.6, 11.0), oliveMat);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.08, 0.5, 9.6), steelMat);
  stripe.position.y = -0.35;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 1.6), oliveMat);
  nose.position.set(0, -0.2, 6.2);
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 1.5), glassMat);
  cockpit.position.set(0, 1.05, 4.7);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.42, 3.1), steelMat);
  wing.position.set(0, 0.8, 0.5);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.32, 1.6), oliveMat);
  tailH.position.set(0, 0.6, -4.8);
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.7, 2.1), oliveMat);
  tailV.position.set(0, 2.0, -4.6);

  for (const side of [-1, 1]) {
    const engine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 2.2), steelMat);
    engine.position.set(side * 3.8, 0.35, 1.4);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.14), propMat);
    blade.position.set(side * 3.8, 0.35, 2.65);
    propSpinners.add(blade);
    group.add(engine);
  }

  group.add(hull, stripe, nose, cockpit, wing, tailH, tailV);
  return {
    group,
    muzzleLocal: new THREE.Vector3(0, 0, 7.2),
    animatedPartA: propSpinners,
    dispose: () => disposeGroup(group),
  };
}

export function createParachuteModel(parachuteId: ParachuteId): WeaponModelHandle & { canopyGroup: THREE.Group } {
  const group = new THREE.Group();
  const canopyGroup = new THREE.Group();
  canopyGroup.position.y = 2.75;
  group.add(canopyGroup);

  const cordMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const addCords = (spanX = 1.45, spanZ = 0.65) => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const start = new THREE.Vector3(sx * 0.28, 0.75, sz * 0.14);
        const end = new THREE.Vector3(sx * spanX, 2.62, sz * spanZ);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 4), cordMat);
        cord.position.copy(start).addScaledVector(dir, 0.5);
        cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        group.add(cord);
      }
    }
  };

  if (parachuteId === 'tiger_camo') {
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.65 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75 });
    const tanMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const panels = [-1.2, -0.4, 0.4, 1.2];
    panels.forEach((px, idx) => {
      const mat = idx % 2 === 0 ? orangeMat : tanMat;
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.24, 1.65), mat);
      cell.position.set(px, -Math.abs(px) * 0.12, 0);
      cell.rotation.z = -px * 0.16;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.27, 1.4), darkMat);
      stripe.position.copy(cell.position);
      stripe.rotation.copy(cell.rotation);
      canopyGroup.add(cell, stripe);
    });
    addCords(1.45, 0.65);
  } else if (parachuteId === 'galaxy_neon') {
    const spaceMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.35, metalness: 0.3 });
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xc026d3,
      emissiveIntensity: 1.25,
    });
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.3,
    });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 1.7), spaceMat);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.1, 1.82), neonMat);
    rim.position.y = -0.02;
    canopyGroup.add(wing, rim);
    for (let i = -2; i <= 2; i++) {
      const star = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), starMat);
      star.position.set(i * 0.7, 0.08, (i % 2) * 0.35);
      canopyGroup.add(star);
    }
    addCords(1.65, 0.65);
  } else if (parachuteId === 'phoenix_flame') {
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
    });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 1.6), crimsonMat);
      wing.position.set(side * 0.95, 0.05, 0);
      wing.rotation.z = -side * 0.18;
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 2.0), goldMat);
      feather.position.set(side * 1.85, 0.18, -0.2);
      feather.rotation.z = -side * 0.26;
      canopyGroup.add(wing, feather);
    }
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 1.7), goldMat);
    canopyGroup.add(crest);
    addCords(1.65, 0.65);
  } else {
    // Classic White Canopy
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65 });
    for (let i = -1.5; i <= 1.5; i += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 1.6), i === -0.5 || i === 0.5 ? whiteMat : trimMat);
      panel.position.set(i * 0.82, -Math.abs(i) * 0.1, 0);
      panel.rotation.z = -i * 0.12;
      canopyGroup.add(panel);
    }
    addCords(1.42, 0.65);
  }

  return {
    group,
    canopyGroup,
    muzzleLocal: new THREE.Vector3(0, 2.75, 0),
    animatedPartA: canopyGroup,
    dispose: () => disposeGroup(group),
  };
}

export function createAirdropCrateModel(): {
  group: THREE.Group;
  beam: THREE.Mesh;
  chute: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const crateMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.5,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.7,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.9,
  });

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), crateMat);
  box.position.y = 0.95;
  box.castShadow = true;
  const trimA = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 2.02), frameMat);
  trimA.position.y = 1.65;
  const trimB = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 2.02), frameMat);
  trimB.position.y = 0.25;
  const star = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 2.04), goldMat);
  star.position.y = 0.95;
  group.add(box, trimA, trimB, star);

  const chute = createParachuteModel('phoenix_flame').group;
  chute.position.y = 1.2;
  group.add(chute);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 78, 12, 1, true), beamMat);
  beam.position.y = 40;
  group.add(beam);

  return {
    group,
    beam,
    chute,
    dispose: () => disposeGroup(group),
  };
}
