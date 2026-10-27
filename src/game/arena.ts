/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TextureFactory } from './textures';

export type MapId = 'neon_sector' | 'industrial_hub' | 'firing_range';

export interface MapConfig {
  id: MapId;
  name: string;
  theme: string;
  description: string;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientLight: number;
}

export const MAP_CONFIGS: Record<MapId, MapConfig> = {
  neon_sector: {
    id: 'neon_sector',
    name: 'Sector Neon 09',
    theme: 'Cyberpunk Urbano',
    description: 'Arena táctica nocturna con pasarelas elevadas, barricadas de plasma y rascacielos al horizonte.',
    fogColor: 0x050814,
    fogNear: 25,
    fogFar: 110,
    ambientLight: 0x1e293b,
  },
  industrial_hub: {
    id: 'industrial_hub',
    name: 'Cúmulo Industrial',
    theme: 'Factoría Subterránea',
    description: 'Complejo de almacenamiento pesado con contenedores blindados, columnas masivas y tuberías de refrigerante.',
    fogColor: 0x0c0a09,
    fogNear: 20,
    fogFar: 95,
    ambientLight: 0x292524,
  },
  firing_range: {
    id: 'firing_range',
    name: 'Campo de Tiro Holográfico',
    theme: 'Entrenamiento Táctico',
    description: 'Instalación de calibración balística con siluetas móviles a diferentes distancias y calibrador de puntería.',
    fogColor: 0x030712,
    fogNear: 35,
    fogFar: 120,
    ambientLight: 0x111827,
  },
};

export interface ArenaCollider {
  box: THREE.Box3;
  mesh: THREE.Object3D;
  isCover?: boolean;
}

export interface HolographicTarget {
  mesh: THREE.Group;
  initialPos: THREE.Vector3;
  distance: number;
  health: number;
  maxHealth: number;
  isHit: boolean;
  hitTimer: number;
  points: number;
}

export class ArenaBuilder {
  public static buildArena(mapId: MapId): {
    arenaGroup: THREE.Group;
    colliders: ArenaCollider[];
    targets: HolographicTarget[];
    spawnPoints: THREE.Vector3[];
    playerSpawn: THREE.Vector3;
  } {
    const arenaGroup = new THREE.Group();
    arenaGroup.name = `arena_${mapId}`;
    const colliders: ArenaCollider[] = [];
    const targets: HolographicTarget[] = [];
    const spawnPoints: THREE.Vector3[] = [];
    let playerSpawn = new THREE.Vector3(0, 1.7, 18);

    const floorTexture = TextureFactory.createFloorTexture();
    const wallTexture = TextureFactory.createWallTexture();

    // 1. Common Floor Ground (80x80 meters)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35,
      metalness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    arenaGroup.add(floor);

    // 2. Sky Dome Sphere (Enclosing cyber atmosphere)
    const skyGeo = new THREE.SphereGeometry(120, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: TextureFactory.createSkyDomeTexture(),
      side: THREE.BackSide,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    arenaGroup.add(skyDome);

    // Reusable materials
    const pillarMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      metalness: 0.8,
      roughness: 0.3,
    });

    const cyberBlueMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.5,
    });

    const cyberOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.2,
    });

    // Helper to add Box obstacle with collider
    const addBoxObstacle = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      isCover = true
    ) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y + h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      arenaGroup.add(mesh);

      const box = new THREE.Box3();
      box.setFromObject(mesh);
      colliders.push({ box, mesh, isCover });
      return mesh;
    };

    if (mapId === 'neon_sector') {
      playerSpawn = new THREE.Vector3(0, 1.7, 26);

      // Boundary Cyber Perimeter Barriers
      const arenaHalfSize = 42;
      const wallH = 6;
      addBoxObstacle(0, 0, -arenaHalfSize, arenaHalfSize * 2, wallH, 1.5, pillarMat, false);
      addBoxObstacle(0, 0, arenaHalfSize, arenaHalfSize * 2, wallH, 1.5, pillarMat, false);
      addBoxObstacle(-arenaHalfSize, 0, 0, 1.5, wallH, arenaHalfSize * 2, pillarMat, false);
      addBoxObstacle(arenaHalfSize, 0, 0, 1.5, wallH, arenaHalfSize * 2, pillarMat, false);

      // Central Elevated Platform (Catwalk)
      addBoxObstacle(0, 0, 0, 16, 2.2, 16, pillarMat, true);
      // Ramps to central platform
      addBoxObstacle(0, 0, 10, 6, 1.1, 4, pillarMat, true);
      addBoxObstacle(0, 0, -10, 6, 1.1, 4, pillarMat, true);

      // Glowing center beacon monument
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 12), cyberBlueMat);
      beacon.position.set(0, 4.5, 0);
      arenaGroup.add(beacon);

      // Tactical Cover Pillars & Barricades
      const pillarCoords = [
        [-14, 0, -14],
        [14, 0, -14],
        [-14, 0, 14],
        [14, 0, 14],
        [-24, 0, 0],
        [24, 0, 0],
        [-6, 0, -22],
        [6, 0, -22],
        [-20, 0, 22],
        [20, 0, 22],
      ];

      pillarCoords.forEach(([px, py, pz]) => {
        addBoxObstacle(px, py, pz, 2.2, 5.5, 2.2, pillarMat, true);
        // Neon trim strip
        const strip = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 2.3), cyberBlueMat);
        strip.position.set(px, 3.2, pz);
        arenaGroup.add(strip);
      });

      // Low tactical barricades for crouch / ducking
      const barricades = [
        [-6, 0, 16, 5, 1.2, 0.8],
        [6, 0, 16, 5, 1.2, 0.8],
        [-10, 0, 4, 0.8, 1.2, 6],
        [10, 0, 4, 0.8, 1.2, 6],
        [-6, 0, -8, 5, 1.2, 0.8],
        [6, 0, -8, 5, 1.2, 0.8],
      ];
      barricades.forEach(([bx, by, bz, bw, bh, bd]) => {
        addBoxObstacle(bx, by, bz, bw, bh, bd, pillarMat, true);
      });

      // Enemy Wave Spawners (spread in perimeter)
      spawnPoints.push(
        new THREE.Vector3(-28, 0, -28),
        new THREE.Vector3(28, 0, -28),
        new THREE.Vector3(0, 0, -32),
        new THREE.Vector3(-30, 0, 10),
        new THREE.Vector3(30, 0, 10),
        new THREE.Vector3(-18, 0, -30),
        new THREE.Vector3(18, 0, -30)
      );
    } else if (mapId === 'industrial_hub') {
      playerSpawn = new THREE.Vector3(0, 1.7, 24);
      const halfSize = 40;
      const wallH = 7;

      // Outer boundaries
      addBoxObstacle(0, 0, -halfSize, halfSize * 2, wallH, 2, pillarMat, false);
      addBoxObstacle(0, 0, halfSize, halfSize * 2, wallH, 2, pillarMat, false);
      addBoxObstacle(-halfSize, 0, 0, 2, wallH, halfSize * 2, pillarMat, false);
      addBoxObstacle(halfSize, 0, 0, 2, wallH, halfSize * 2, pillarMat, false);

      // Shipping Containers (Heavy industrial covers)
      const containerColors = [0x991b1b, 0x1e3a8a, 0x166534, 0xd97706];
      const containers = [
        [-12, 0, 6, 3.2, 3.2, 7.5, 0],
        [12, 0, 8, 3.2, 3.2, 7.5, 0.2],
        [-16, 0, -10, 7.5, 3.2, 3.2, -0.1],
        [14, 0, -12, 7.5, 3.2, 3.2, 0],
        [-6, 0, -20, 3.2, 3.2, 7.5, 0.3],
        [8, 0, -22, 3.2, 3.2, 7.5, -0.2],
        [0, 0, 0, 8.5, 3.2, 3.5, 0],
      ];

      containers.forEach(([cx, cy, cz, cw, ch, cd], idx) => {
        const cMat = new THREE.MeshStandardMaterial({
          color: containerColors[idx % containerColors.length],
          metalness: 0.6,
          roughness: 0.5,
        });
        addBoxObstacle(cx, cy, cz, cw, ch, cd, cMat, true);
      });

      // Heavy Industrial Silos
      [-22, 22].forEach(x => {
        [-20, 18].forEach(z => {
          const silo = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 8, 16),
            pillarMat
          );
          silo.position.set(x, 4, z);
          silo.castShadow = true;
          arenaGroup.add(silo);

          const box = new THREE.Box3();
          box.setFromCenterAndSize(silo.position, new THREE.Vector3(5, 8, 5));
          colliders.push({ box, mesh: silo, isCover: true });
        });
      });

      // Orange hazard glow lighting fixtures
      const hazardLight = new THREE.PointLight(0xf97316, 2.5, 30);
      hazardLight.position.set(0, 6, 0);
      arenaGroup.add(hazardLight);

      spawnPoints.push(
        new THREE.Vector3(-25, 0, -25),
        new THREE.Vector3(25, 0, -25),
        new THREE.Vector3(0, 0, -28),
        new THREE.Vector3(-26, 0, 0),
        new THREE.Vector3(26, 0, 0)
      );
    } else {
      // 3. FIRING RANGE (CAMPO DE TIRO)
      playerSpawn = new THREE.Vector3(0, 1.7, 30);
      const halfW = 20;
      const lengthZ = 70;

      // Shooting bay walls
      addBoxObstacle(-halfW, 0, 0, 1.5, 6, lengthZ, pillarMat, false);
      addBoxObstacle(halfW, 0, 0, 1.5, 6, lengthZ, pillarMat, false);
      addBoxObstacle(0, 0, -35, halfW * 2, 6, 1.5, pillarMat, false);
      addBoxObstacle(0, 0, 36, halfW * 2, 6, 1.5, pillarMat, false);

      // Firing booth divider counter
      addBoxObstacle(0, 0, 24, 18, 1.1, 1.2, pillarMat, true);

      // Distance markers on the floor (10m, 20m, 35m, 50m)
      const distances = [
        { d: 10, z: 14, color: 0x38bdf8 },
        { d: 20, z: 4, color: 0x34d399 },
        { d: 35, z: -11, color: 0xfbbf24 },
        { d: 50, z: -26, color: 0xf87171 },
      ];

      distances.forEach(({ z, color }) => {
        // Floor line marker
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(26, 0.05, 0.3),
          new THREE.MeshBasicMaterial({ color })
        );
        line.position.set(0, 0.03, z);
        arenaGroup.add(line);
      });

      // Target Dummies at each lane
      const targetTex = TextureFactory.createTargetTexture();
      const targetMat = new THREE.MeshBasicMaterial({
        map: targetTex,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const targetDummies = [
        { x: -5, z: 14, d: 10, pts: 100 },
        { x: 5, z: 14, d: 10, pts: 100 },
        { x: -8, z: 4, d: 20, pts: 200 },
        { x: 0, z: 4, d: 20, pts: 200 },
        { x: 8, z: 4, d: 20, pts: 200 },
        { x: -6, z: -11, d: 35, pts: 350 },
        { x: 6, z: -11, d: 35, pts: 350 },
        { x: -4, z: -26, d: 50, pts: 500 },
        { x: 4, z: -26, d: 50, pts: 500 },
      ];

      targetDummies.forEach(({ x, z, d, pts }) => {
        const tGroup = new THREE.Group();
        tGroup.position.set(x, 1.5, z);

        // Stand pole
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x475569 })
        );
        pole.position.y = -0.75;
        tGroup.add(pole);

        // Bullseye Plane
        const disc = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), targetMat.clone());
        disc.name = 'target_disc';
        tGroup.add(disc);

        arenaGroup.add(tGroup);

        targets.push({
          mesh: tGroup,
          initialPos: tGroup.position.clone(),
          distance: d,
          health: 100,
          maxHealth: 100,
          isHit: false,
          hitTimer: 0,
          points: pts,
        });
      });
    }

    return { arenaGroup, colliders, targets, spawnPoints, playerSpawn };
  }
}
