/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type EnemyType = 'drone' | 'soldier' | 'goliath' | 'titan';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  maxHealth: number;
  speed: number;
  damage: number;
  attackInterval: number; // seconds
  attackRange: number;
  scoreValue: number;
  height: number;
  radius: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  drone: {
    type: 'drone',
    name: 'Drone Cazador',
    maxHealth: 60,
    speed: 4.8,
    damage: 12,
    attackInterval: 1.5,
    attackRange: 18,
    scoreValue: 150,
    height: 1.6,
    radius: 0.8,
  },
  soldier: {
    type: 'soldier',
    name: 'Androide de Asalto',
    maxHealth: 130,
    speed: 3.8,
    damage: 20,
    attackInterval: 1.8,
    attackRange: 24,
    scoreValue: 280,
    height: 2.1,
    radius: 0.9,
  },
  goliath: {
    type: 'goliath',
    name: 'Goliat Berserker',
    maxHealth: 380,
    speed: 2.6,
    damage: 45,
    attackInterval: 2.4,
    attackRange: 12,
    scoreValue: 650,
    height: 3.2,
    radius: 1.4,
  },
  titan: {
    type: 'titan',
    name: 'Ciber-Titán Mk.IV',
    maxHealth: 1600,
    speed: 2.0,
    damage: 65,
    attackInterval: 2.8,
    attackRange: 35,
    scoreValue: 3000,
    height: 4.8,
    radius: 2.2,
  },
};

export class EnemyModelFactory {
  // Build composite procedural enemy with bottom-center pivot
  public static createEnemyMesh(type: EnemyType): {
    group: THREE.Group;
    materials: THREE.MeshStandardMaterial[];
    eyeMesh?: THREE.Mesh;
    coreMesh?: THREE.Mesh;
    legs?: THREE.Object3D[];
  } {
    const group = new THREE.Group();
    group.name = `enemy_${type}`;
    const trackedMaterials: THREE.MeshStandardMaterial[] = [];
    const legs: THREE.Object3D[] = [];

    // Base materials
    const darkArmor = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.85,
      roughness: 0.25,
    });
    trackedMaterials.push(darkArmor);

    const plateArmor = new THREE.MeshStandardMaterial({
      color: 0x374151,
      metalness: 0.65,
      roughness: 0.45,
    });
    trackedMaterials.push(plateArmor);

    const crimsonGlow = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xff0033,
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.2,
    });
    trackedMaterials.push(crimsonGlow);

    const goldCore = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.4,
      metalness: 0.5,
      roughness: 0.2,
    });
    trackedMaterials.push(goldCore);

    let eyeMesh: THREE.Mesh | undefined;
    let coreMesh: THREE.Mesh | undefined;

    if (type === 'drone') {
      // 1. DRONE CAZADOR (Hovering combat drone, 7 parts)
      // Base anchor offset (drone hovers at Y ~ 1.5)
      const droneRoot = new THREE.Group();
      droneRoot.position.y = 1.3;
      group.add(droneRoot);

      // 1.1 Central Sphere Chassis
      const coreGeo = new THREE.SphereGeometry(0.38, 14, 14);
      const core = new THREE.Mesh(coreGeo, darkArmor);
      core.castShadow = true;
      droneRoot.add(core);

      // 1.2 Outer Armored Ring Shroud
      const ringGeo = new THREE.TorusGeometry(0.52, 0.06, 8, 20);
      const ring = new THREE.Mesh(ringGeo, plateArmor);
      ring.rotation.x = Math.PI / 2;
      droneRoot.add(ring);

      // 1.3 Glowing Ominous Eye
      const eyeGeo = new THREE.SphereGeometry(0.16, 12, 12);
      eyeMesh = new THREE.Mesh(eyeGeo, crimsonGlow);
      eyeMesh.position.set(0, 0, 0.32);
      droneRoot.add(eyeMesh);

      // 1.4 Quad Thruster Pods
      const thrusterAngles = [
        Math.PI * 0.25,
        Math.PI * 0.75,
        Math.PI * 1.25,
        Math.PI * 1.75,
      ];
      thrusterAngles.forEach(angle => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.16, 8), darkArmor);
        pod.position.set(Math.cos(angle) * 0.65, 0.05, Math.sin(angle) * 0.65);
        pod.rotation.z = Math.PI / 6 * Math.sin(angle);
        droneRoot.add(pod);

        // Thruster glow exhaust
        const jet = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.18, 8),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        jet.rotation.x = Math.PI;
        jet.position.set(Math.cos(angle) * 0.65, -0.12, Math.sin(angle) * 0.65);
        droneRoot.add(jet);
      });

      // 1.5 Under-Chassis Twin Blasters
      [-0.15, 0.15].forEach(x => {
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), plateArmor);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(x, -0.28, 0.2);
        droneRoot.add(gun);
      });
    } else if (type === 'soldier') {
      // 2. ANDROIDE DE ASALTO (Bipedal Cyber Soldier, 9 parts)
      // 2.1 Pelvis & Hip
      const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.28), plateArmor);
      pelvis.position.y = 0.95;
      group.add(pelvis);

      // 2.2 Torso Chestplate
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), darkArmor);
      torso.position.y = 1.35;
      torso.castShadow = true;
      group.add(torso);

      // 2.3 Chest Reactor Core
      coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), crimsonGlow);
      coreMesh.rotation.x = Math.PI / 2;
      coreMesh.position.set(0, 1.42, 0.18);
      group.add(coreMesh);

      // 2.4 Head & Cyber Visor
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.28), darkArmor);
      head.position.y = 1.82;
      group.add(head);

      eyeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.08), crimsonGlow);
      eyeMesh.position.set(0, 1.84, 0.14);
      group.add(eyeMesh);

      // 2.5 Shoulder Pauldrons
      [-0.34, 0.34].forEach(x => {
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.24), plateArmor);
        shoulder.position.set(x, 1.55, 0);
        group.add(shoulder);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.14), darkArmor);
        arm.position.set(x, 1.2, 0.08);
        group.add(arm);
      });

      // 2.6 Weapon in right hand
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.6), plateArmor);
      gun.position.set(0.36, 1.05, 0.3);
      group.add(gun);

      // 2.7 Legs (pivoted from bottom)
      [-0.16, 0.16].forEach(x => {
        const legGroup = new THREE.Group();
        legGroup.position.set(x, 0.95, 0);

        const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.16), darkArmor);
        upperLeg.position.y = -0.22;
        legGroup.add(upperLeg);

        const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.15), plateArmor);
        lowerLeg.position.y = -0.65;
        legGroup.add(lowerLeg);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), darkArmor);
        foot.position.set(0, -0.9, 0.05);
        legGroup.add(foot);

        group.add(legGroup);
        legs.push(legGroup);
      });
    } else if (type === 'goliath') {
      // 3. GOLIATH BERSERKER (Heavy armored brute, 11 parts)
      const scale = 1.35;
      // 3.1 Heavy Hunchback Carapace
      const carapace = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.8 * scale, 0.85 * scale), darkArmor);
      carapace.position.set(0, 1.7 * scale, 0);
      carapace.castShadow = true;
      group.add(carapace);

      // 3.2 Huge Pauldrons
      [-0.6 * scale, 0.6 * scale].forEach(x => {
        const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.45 * scale, 0.55 * scale, 0.6 * scale), plateArmor);
        pauldron.position.set(x, 1.9 * scale, 0);
        group.add(pauldron);
      });

      // 3.3 Heavy Armored Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.35 * scale, 0.4 * scale), darkArmor);
      head.position.set(0, 1.8 * scale, 0.35 * scale);
      group.add(head);

      eyeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.08 * scale, 0.06 * scale), crimsonGlow);
      eyeMesh.position.set(0, 1.82 * scale, 0.56 * scale);
      group.add(eyeMesh);

      // 3.4 Molten Core in Belly
      coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.15 * scale, 12), goldCore);
      coreMesh.rotation.x = Math.PI / 2;
      coreMesh.position.set(0, 1.45 * scale, 0.44 * scale);
      group.add(coreMesh);

      // 3.5 Massive Hydraulic Arms
      [-0.65 * scale, 0.65 * scale].forEach(x => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.85 * scale, 0.35 * scale), plateArmor);
        arm.position.set(x, 1.25 * scale, 0.15 * scale);
        group.add(arm);

        const fist = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.45 * scale, 0.45 * scale), darkArmor);
        fist.position.set(x, 0.75 * scale, 0.25 * scale);
        group.add(fist);
      });

      // 3.6 Heavy Legs
      [-0.3 * scale, 0.3 * scale].forEach(x => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 1.1 * scale, 0.4 * scale), darkArmor);
        leg.position.set(x, 0.55 * scale, 0);
        group.add(leg);
      });
    } else {
      // 4. CYBER-TITAN BOSS (Enormous War Mech, 12+ parts)
      const scale = 2.0;

      // 4.1 Massive Hull
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 1.0 * scale, 1.1 * scale), darkArmor);
      hull.position.set(0, 1.7 * scale, 0);
      hull.castShadow = true;
      group.add(hull);

      // 4.2 Super-Reactor Heart (Weakpoint)
      coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, 16, 16), goldCore);
      coreMesh.position.set(0, 1.6 * scale, 0.55 * scale);
      group.add(coreMesh);

      // 4.3 Command Cockpit / Eye
      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.5 * scale), plateArmor);
      cockpit.position.set(0, 2.1 * scale, 0.3 * scale);
      group.add(cockpit);

      eyeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.12 * scale, 0.1 * scale), crimsonGlow);
      eyeMesh.position.set(0, 2.12 * scale, 0.56 * scale);
      group.add(eyeMesh);

      // 4.4 Twin Top Rail Cannons
      [-0.45 * scale, 0.45 * scale].forEach(x => {
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 1.5 * scale, 12), plateArmor);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(x, 2.3 * scale, 0.2 * scale);
        group.add(cannon);
      });

      // 4.5 Shield Ring Projectors
      const shieldRing = new THREE.Mesh(new THREE.TorusGeometry(1.1 * scale, 0.06 * scale, 8, 24), crimsonGlow);
      shieldRing.position.set(0, 1.7 * scale, 0);
      group.add(shieldRing);

      // 4.6 Heavy Reinforced Quad Pillar Legs
      const legPositions = [
        [-0.55 * scale, 0.4 * scale],
        [0.55 * scale, 0.4 * scale],
        [-0.55 * scale, -0.4 * scale],
        [0.55 * scale, -0.4 * scale],
      ];
      legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, 1.2 * scale, 10), darkArmor);
        leg.position.set(lx, 0.6 * scale, lz);
        group.add(leg);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.2 * scale, 0.5 * scale), plateArmor);
        foot.position.set(lx, 0.1 * scale, lz);
        group.add(foot);
      });
    }

    return { group, materials: trackedMaterials, eyeMesh, coreMesh, legs };
  }
}
