import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createAirdropCrateModel, createAirplaneModel, createParachuteModel } from '../game/battleRoyaleModels';
import { getArenaDef, getEmoteDef, SKIN_CATALOG } from '../game/catalog';
import { animateCharacterRig, CharacterRig, createBlockCharacterRig } from '../game/characters';
import { AirplaneId, ArenaId, EmoteId, GrenadeId, GunId, KnifeId, ParachuteId, ShopCategory } from '../game/types';
import { createGrenadeModel, createGunModel, createKnifeModel } from '../game/weapons';

interface ShopPreview3DProps {
  category: ShopCategory;
  itemId: string;
  heightClass?: string;
}

export const ShopPreview3D: React.FC<ShopPreview3DProps> = ({
  category,
  itemId,
  heightClass = 'h-36',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const w = Math.max(120, el.clientWidth || 220);
    const h = Math.max(96, el.clientHeight || 144);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.3);
    const dir = new THREE.DirectionalLight(0xfffbeb, 1.5);
    dir.position.set(4, 6, 5);
    scene.add(hemi, dir);

    const holder = new THREE.Group();
    scene.add(holder);

    let disposeSubject = () => {};
    let animatedRig: CharacterRig | null = null;
    let emoteAnimState = 'idle' as ReturnType<typeof getEmoteDef>['animState'];

    if (category === 'guns') {
      const m = createGunModel(itemId as GunId);
      m.group.scale.setScalar(1.85);
      holder.add(m.group);
      camera.position.set(1.9, 0.9, 2.2);
      disposeSubject = m.dispose;
    } else if (category === 'knives') {
      const m = createKnifeModel(itemId as KnifeId);
      m.group.scale.setScalar(2.4);
      holder.add(m.group);
      camera.position.set(1.5, 0.85, 1.85);
      disposeSubject = m.dispose;
    } else if (category === 'grenades') {
      const m = createGrenadeModel(itemId as GrenadeId);
      m.group.scale.setScalar(2.8);
      holder.add(m.group);
      camera.position.set(1.3, 0.85, 1.5);
      disposeSubject = m.dispose;
    } else if (category === 'airplanes') {
      const m = createAirplaneModel(itemId as AirplaneId);
      m.group.scale.setScalar(0.24);
      holder.add(m.group);
      camera.position.set(4.5, 2.2, 5.2);
      disposeSubject = m.dispose;
    } else if (category === 'parachutes') {
      const m = createParachuteModel(itemId as ParachuteId);
      m.group.scale.setScalar(0.82);
      m.group.position.y = -2.25;
      holder.add(m.group);
      camera.position.set(2.6, 1.4, 3.6);
      disposeSubject = m.dispose;
    } else if (category === 'skins' || category === 'emotes') {
      const preset =
        category === 'skins'
          ? SKIN_CATALOG.find((s) => s.id === itemId) ?? SKIN_CATALOG[0]
          : SKIN_CATALOG[0];
      const rig = createBlockCharacterRig(
        {
          characterId: preset.id,
          primaryColor: preset.primaryColor,
          secondaryColor: preset.secondaryColor,
          visorColor: preset.visorColor,
          headgear: preset.defaultHeadgear,
        },
        false
      );
      rig.root.position.y = -1.1;
      holder.add(rig.root);
      camera.position.set(0, 0.4, 3.6);
      disposeSubject = rig.dispose;
      if (category === 'emotes') {
        animatedRig = rig;
        emoteAnimState = getEmoteDef(itemId as EmoteId).animState;
      }
    } else {
      void createAirdropCrateModel;
      // Miniature 3D Island Diorama for Backgrounds!
      const def = getArenaDef(itemId as ArenaId);
      const sea = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.75, 0.16, 24),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25 })
      );
      sea.position.y = -0.3;
      const sand = new THREE.Mesh(
        new THREE.CylinderGeometry(1.22, 1.32, 0.24, 20),
        new THREE.MeshStandardMaterial({ color: 0xf3d299, roughness: 0.85 })
      );
      sand.position.y = -0.18;
      const land = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 0.3, 18),
        new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.7 })
      );
      land.position.y = 0;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.75, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
      );
      tower.position.set(0.2, 0.45, -0.1);
      const hut = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.38),
        new THREE.MeshStandardMaterial({ color: def.skyColor, roughness: 0.5 })
      );
      hut.position.set(-0.35, 0.32, 0.25);
      holder.add(sea, sand, land, tower, hut);
      camera.position.set(0, 1.85, 3.3);
      disposeSubject = () => {
        holder.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
            else m.material?.dispose();
          }
        });
      };
    }

    camera.lookAt(0, 0, 0);

    let raf = 0;
    let lastT = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;
      elapsed += dt;
      if (animatedRig) {
        animateCharacterRig(animatedRig, emoteAnimState, elapsed, dt);
        holder.rotation.y = Math.sin(elapsed * 0.75) * 0.45;
      } else {
        holder.rotation.y += 0.015;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      disposeSubject();
      renderer.dispose();
    };
  }, [category, itemId]);

  return (
    <div
      ref={hostRef}
      className={`w-full ${heightClass} overflow-hidden rounded-xl bg-gradient-to-b from-slate-900 to-slate-950`}
    />
  );
};
