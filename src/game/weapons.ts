import * as THREE from 'three';
import { getGrenadeDef, getGunDef, getKnifeDef } from './catalog';
import { GrenadeId, GunId, KnifeId } from './types';

export interface WeaponModelHandle {
  group: THREE.Group;
  muzzleLocal: THREE.Vector3;
  animatedPartA?: THREE.Object3D;
  animatedPartB?: THREE.Object3D;
  dispose: () => void;
}

export function createGunModel(gunId: GunId): WeaponModelHandle {
  const def = getGunDef(gunId);
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.primaryColor,
    roughness: 0.32,
    metalness: 0.65,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    emissive: def.accentColor,
    emissiveIntensity: gunId === 'laser_blaster' ? 0.9 : 0.25,
    roughness: 0.25,
    metalness: 0.45,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.78,
    metalness: 0.15,
  });

  let muzzleZ = 0.48;

  if (gunId === 'basic_pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.48), bodyMat);
    slide.position.set(0, 0.1, 0.16);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.12), gripMat);
    grip.position.set(0, -0.04, 0.02);
    grip.rotation.x = 0.22;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), accentMat);
    sight.position.set(0, 0.19, 0.36);
    group.add(slide, grip, sight);
    muzzleZ = 0.42;
  } else if (gunId === 'mini_smg') {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.56), bodyMat);
    rec.position.set(0, 0.1, 0.2);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.1), accentMat);
    mag.position.set(0, -0.1, 0.25);
    mag.rotation.x = -0.12;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.11), gripMat);
    grip.position.set(0, -0.04, 0.03);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), gripMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.11, 0.54);
    group.add(rec, mag, grip, barrel);
    muzzleZ = 0.62;
  } else if (gunId === 'assault_rifle') {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.72), bodyMat);
    rec.position.set(0, 0.1, 0.24);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), gripMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.12, 0.78);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.3), accentMat);
    handguard.position.set(0, 0.11, 0.56);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.13), accentMat);
    mag.position.set(0, -0.1, 0.28);
    mag.rotation.x = -0.2;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.24), gripMat);
    stock.position.set(0, 0.08, -0.2);
    group.add(rec, barrel, handguard, mag, stock);
    muzzleZ = 1.0;
  } else if (gunId === 'combat_shotgun') {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.66), bodyMat);
    rec.position.set(0, 0.1, 0.22);
    const twinBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.52), gripMat);
    twinBarrel.position.set(0, 0.14, 0.74);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.26), accentMat);
    pump.position.set(0, 0.02, 0.66);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.28), bodyMat);
    stock.position.set(0, 0.07, -0.22);
    group.add(rec, twinBarrel, pump, stock);
    muzzleZ = 1.02;
  } else if (gunId === 'sniper') {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.78), bodyMat);
    rec.position.set(0, 0.1, 0.24);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.78, 8), gripMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.12, 0.98);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 10), accentMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.25, 0.28);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.19, 0.3), gripMat);
    stock.position.set(0, 0.08, -0.24);
    group.add(rec, barrel, scope, stock);
    muzzleZ = 1.38;
  } else {
    // laser_blaster
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.72), bodyMat);
    chassis.position.set(0, 0.11, 0.25);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.42), accentMat);
    core.position.set(0, 0.16, 0.46);
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.24, 8), accentMat);
    emitter.rotation.x = Math.PI / 2;
    emitter.position.set(0, 0.12, 0.74);
    group.add(chassis, core, emitter);
    muzzleZ = 0.88;
  }

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
    }
  });

  return {
    group,
    muzzleLocal: new THREE.Vector3(0, 0.12, muzzleZ),
    dispose: () => {
      group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
    },
  };
}

export function createKnifeModel(knifeId: KnifeId): WeaponModelHandle {
  const def = getKnifeDef(knifeId);
  const group = new THREE.Group();

  const bladeMat = new THREE.MeshStandardMaterial({
    color: def.bladeColor,
    metalness: 0.85,
    roughness: 0.2,
    emissive: knifeId === 'pixel_blade' ? def.bladeColor : '#000000',
    emissiveIntensity: knifeId === 'pixel_blade' ? 0.55 : 0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    emissive: def.accentColor,
    emissiveIntensity: knifeId === 'dragon_blade' || knifeId === 'shadow_karambit' ? 0.45 : 0.15,
    roughness: 0.35,
    metalness: 0.4,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.75,
  });

  let animatedPartA: THREE.Object3D | undefined;
  let animatedPartB: THREE.Object3D | undefined;

  if (knifeId === 'basic_knife') {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.22), gripMat);
    handle.position.set(0, 0, 0.04);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), accentMat);
    guard.position.set(0, 0, 0.16);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.34), bladeMat);
    blade.position.set(0, 0.01, 0.35);
    group.add(handle, guard, blade);
  } else if (knifeId === 'shadow_karambit') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 8, 16), accentMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0, -0.02, -0.04);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.22), gripMat);
    handle.position.set(0, 0, 0.09);
    const hook1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.24), bladeMat);
    hook1.position.set(0, 0.04, 0.28);
    hook1.rotation.x = -0.35;
    const hook2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.16), accentMat);
    hook2.position.set(0, 0.12, 0.42);
    hook2.rotation.x = -0.8;
    group.add(ring, handle, hook1, hook2);
  } else if (knifeId === 'butterfly_blade') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.36), bladeMat);
    blade.position.set(0, 0, 0.32);
    const handleA = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.24), accentMat);
    handleA.position.set(-0.04, 0, 0.06);
    handleA.rotation.z = -0.18;
    const handleB = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.24), accentMat);
    handleB.position.set(0.04, 0, 0.06);
    handleB.rotation.z = 0.18;
    group.add(blade, handleA, handleB);
    animatedPartA = handleA;
    animatedPartB = handleB;
  } else if (knifeId === 'dragon_blade') {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.28), gripMat);
    handle.position.set(0, 0, 0.02);
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 6), bladeMat);
    guard.rotation.x = Math.PI / 2;
    guard.position.set(0, 0, 0.18);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.58), accentMat);
    blade.position.set(0, 0.01, 0.49);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.56), bladeMat);
    edge.position.set(0, 0.06, 0.49);
    group.add(handle, guard, blade, edge);
  } else {
    // pixel_blade
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.24), gripMat);
    hilt.position.set(0, 0, 0.04);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.08), accentMat);
    guard.position.set(0, 0, 0.18);
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.13 - i * 0.02, 0.13),
        i % 2 === 0 ? bladeMat : accentMat
      );
      seg.position.set(0, 0.01, 0.28 + i * 0.12);
      group.add(seg);
    }
    group.add(hilt, guard);
  }

  return {
    group,
    muzzleLocal: new THREE.Vector3(0, 0, 0.45),
    animatedPartA,
    animatedPartB,
    dispose: () => {
      group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
    },
  };
}

export function createGrenadeModel(grenadeId: GrenadeId): WeaponModelHandle {
  const def = getGrenadeDef(grenadeId);
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.35,
    metalness: 0.45,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    emissive: def.accentColor,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), bodyMat);
  core.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.28), glowMat);
  band.position.y = 0.02;
  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 12), glowMat);
  pin.position.set(0.08, 0.18, 0);

  group.add(core, band, pin);

  return {
    group,
    muzzleLocal: new THREE.Vector3(0, 0.1, 0.2),
    dispose: () => {
      group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
    },
  };
}
