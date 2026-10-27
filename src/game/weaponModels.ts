/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TextureFactory } from './textures';

export type WeaponId = 'viper_9' | 'thor_rail' | 'scatter_x' | 'pulsar_7';
export type WeaponSkin =
  | 'cyber_noir'
  | 'hyper_gold'
  | 'neon_matrix'
  | 'titanium_ice'
  | 'plasma_dragon'
  | 'void_stalker'
  | 'cyber_samurai'
  | 'toxic_hazard'
  | 'quantum_prism'
  | 'solar_flare';

export interface WeaponStats {
  id: WeaponId;
  name: string;
  category: string;
  damage: number;
  fireRate: number; // shots per second
  magazineSize: number;
  reloadTime: number; // seconds
  recoil: number;
  spread: number;
  range: number;
  description: string;
  isAutomatic: boolean;
  pelletCount?: number;
}

export const WEAPON_REGISTRY: Record<WeaponId, WeaponStats> = {
  viper_9: {
    id: 'viper_9',
    name: 'Fusil de Plasma "Viper-9"',
    category: 'Fusil de Asalto',
    damage: 34,
    fireRate: 9.5,
    magazineSize: 32,
    reloadTime: 1.8,
    recoil: 0.04,
    spread: 0.015,
    range: 120,
    description: 'Arma estándar de alta cadencia con proyectiles de plasma hipercalentados y retroceso balanceado.',
    isAutomatic: true,
  },
  thor_rail: {
    id: 'thor_rail',
    name: 'Cañón de Riel "Thor-Rail"',
    category: 'Francotirador Cinético',
    damage: 180,
    fireRate: 1.1,
    magazineSize: 5,
    reloadTime: 2.6,
    recoil: 0.16,
    spread: 0.001,
    range: 300,
    description: 'Acelerador electromagnético que pulveriza corazas a cualquier distancia. Precisión quirúrgica.',
    isAutomatic: false,
  },
  scatter_x: {
    id: 'scatter_x',
    name: 'Escopeta Cuántica "Scatter-X"',
    category: 'Escopeta Pesada',
    damage: 22,
    fireRate: 1.6,
    magazineSize: 8,
    reloadTime: 2.2,
    recoil: 0.12,
    spread: 0.075,
    range: 45,
    description: 'Dispara 8 perdigones energéticos simultáneos. Devastadora a quemarropa en combate urbano.',
    isAutomatic: false,
    pelletCount: 8,
  },
  pulsar_7: {
    id: 'pulsar_7',
    name: 'Pistola Láser "Pulsar-7"',
    category: 'Arma Secundaria',
    damage: 26,
    fireRate: 5.5,
    magazineSize: 18,
    reloadTime: 1.3,
    recoil: 0.03,
    spread: 0.018,
    range: 75,
    description: 'Pistola táctica ligera con desenfunde instantáneo y puntería láser asistida integrada.',
    isAutomatic: false,
  },
};

export class WeaponModelFactory {
  // Get skin colors and material properties
  private static getSkinColors(skin: WeaponSkin) {
    switch (skin) {
      case 'hyper_gold':
        return {
          body: 0xd4af37,
          metalness: 0.95,
          roughness: 0.2,
          trim: 0x111111,
          accent: 0xff1e56,
          glow: 0xff0044,
        };
      case 'neon_matrix':
        return {
          body: 0x0f172a,
          metalness: 0.7,
          roughness: 0.35,
          trim: 0x1e293b,
          accent: 0x10b981,
          glow: 0x05f096,
        };
      case 'titanium_ice':
        return {
          body: 0x94a3b8,
          metalness: 0.9,
          roughness: 0.15,
          trim: 0x334155,
          accent: 0x38bdf8,
          glow: 0x00d4ff,
        };
      case 'plasma_dragon':
        return {
          body: 0x220505,
          metalness: 0.9,
          roughness: 0.22,
          trim: 0x450a0a,
          accent: 0xff3b00,
          glow: 0xff6600,
        };
      case 'void_stalker':
        return {
          body: 0x090514,
          metalness: 0.85,
          roughness: 0.25,
          trim: 0x2e1065,
          accent: 0xa855f7,
          glow: 0xc084fc,
        };
      case 'cyber_samurai':
        return {
          body: 0x0a0505, // Deep obsidian black lacquer
          metalness: 0.95,
          roughness: 0.12,
          trim: 0xd4af37, // Royal gold trim
          accent: 0xd90429, // Crimson blood red
          glow: 0xff0044, // Blazing katana edge red
        };
      case 'toxic_hazard':
        return {
          body: 0x0c160c, // Dark tactical composite
          metalness: 0.8,
          roughness: 0.3,
          trim: 0xeab308, // Hazard yellow
          accent: 0x84cc16, // Toxic radioactive green
          glow: 0x22c55e, // Glowing emerald-lime isotope
        };
      case 'quantum_prism':
        return {
          body: 0x1e1b4b, // Deep indigo pearl
          metalness: 0.9,
          roughness: 0.18,
          trim: 0x4f46e5, // Cosmic violet
          accent: 0x06b6d4, // Prismatic cyan
          glow: 0xa855f7, // Ultraviolet pulse
        };
      case 'solar_flare':
        return {
          body: 0x2a1c0d, // Dark bronze gold
          metalness: 0.92,
          roughness: 0.15,
          trim: 0xfffbeb, // White gold
          accent: 0xf59e0b, // Solar corona amber
          glow: 0xfbbf24, // Blazing yellow plasma
        };
      case 'cyber_noir':
      default:
        return {
          body: 0x18181b,
          metalness: 0.8,
          roughness: 0.3,
          trim: 0x27272a,
          accent: 0x06b6d4,
          glow: 0x00f0ff,
        };
    }
  }

  // Build Composite 3-12 Part Procedural Weapon Group
  public static createWeaponMesh(
    id: WeaponId,
    skin: WeaponSkin = 'cyber_noir',
    hasSilencer = false,
    hasLaser = true
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `weapon_${id}`;
    const p = this.getSkinColors(skin);

    // Shared Materials with procedural tactical textures
    const carbonTex = TextureFactory.createCarbonFiberTexture();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: p.body,
      metalness: p.metalness,
      roughness: p.roughness,
      roughnessMap: carbonTex,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: p.trim,
      metalness: 0.6,
      roughness: 0.5,
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.85,
      roughness: 0.25,
      roughnessMap: carbonTex,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: p.accent,
      emissive: p.glow,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
    });

    if (id === 'viper_9') {
      // 1. VIPER-9 ASSAULT RIFLE
      // 1.1 Main Receiver
      const receiverGeo = new THREE.BoxGeometry(0.1, 0.14, 0.42);
      const receiver = new THREE.Mesh(receiverGeo, bodyMat);
      receiver.position.set(0, 0, 0);
      receiver.castShadow = true;
      group.add(receiver);

      // 1.2 Top Tactical Rail
      const railGeo = new THREE.BoxGeometry(0.04, 0.02, 0.4);
      const rail = new THREE.Mesh(railGeo, trimMat);
      rail.position.set(0, 0.08, 0);
      group.add(rail);

      // 1.3 Barrel Assembly
      const barrelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.35, 12);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, darkSteelMat);
      barrel.position.set(0, 0.03, -0.36);
      barrel.castShadow = true;
      group.add(barrel);

      // 1.4 Heat Shroud / Vents
      const shroudGeo = new THREE.BoxGeometry(0.07, 0.08, 0.26);
      const shroud = new THREE.Mesh(shroudGeo, trimMat);
      shroud.position.set(0, 0.03, -0.25);
      group.add(shroud);

      // 1.5 Glowing Plasma Core Chamber
      const coreGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.14, 12);
      coreGeo.rotateX(Math.PI / 2);
      const core = new THREE.Mesh(coreGeo, accentMat);
      core.position.set(0, 0.03, -0.06);
      group.add(core);

      // 1.6 Ergonomic Grip
      const gripGeo = new THREE.BoxGeometry(0.05, 0.2, 0.08);
      gripGeo.rotateX(-0.25);
      const grip = new THREE.Mesh(gripGeo, trimMat);
      grip.position.set(0, -0.12, 0.12);
      grip.castShadow = true;
      group.add(grip);

      // 1.7 Curved Plasma Magazine
      const magGeo = new THREE.BoxGeometry(0.05, 0.22, 0.09);
      magGeo.rotateX(0.18);
      const mag = new THREE.Mesh(magGeo, bodyMat);
      mag.position.set(0, -0.15, -0.05);
      group.add(mag);

      // 1.8 Buttstock
      const stockGeo = new THREE.BoxGeometry(0.07, 0.12, 0.24);
      const stock = new THREE.Mesh(stockGeo, trimMat);
      stock.position.set(0, 0.01, 0.32);
      group.add(stock);

      // 1.9 Holo Sight with Reticle
      const sightHousingGeo = new THREE.BoxGeometry(0.06, 0.07, 0.1);
      const sightHousing = new THREE.Mesh(sightHousingGeo, darkSteelMat);
      sightHousing.position.set(0, 0.12, 0.02);
      group.add(sightHousing);

      const lensGeo = new THREE.PlaneGeometry(0.045, 0.045);
      const lens = new THREE.Mesh(lensGeo, glassMat);
      lens.position.set(0, 0.13, -0.02);
      group.add(lens);

      // 1.10 Muzzle Brake / Silencer
      if (hasSilencer) {
        const silencerGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12);
        silencerGeo.rotateX(Math.PI / 2);
        const silencer = new THREE.Mesh(silencerGeo, darkSteelMat);
        silencer.position.set(0, 0.03, -0.58);
        group.add(silencer);
      } else {
        const muzzleGeo = new THREE.CylinderGeometry(0.028, 0.025, 0.08, 12);
        muzzleGeo.rotateX(Math.PI / 2);
        const muzzle = new THREE.Mesh(muzzleGeo, darkSteelMat);
        muzzle.position.set(0, 0.03, -0.55);
        group.add(muzzle);
      }
    } else if (id === 'thor_rail') {
      // 2. THOR-RAIL SNIPER CANNON
      // 2.1 Heavy Stock & Chassis
      const chassisGeo = new THREE.BoxGeometry(0.12, 0.16, 0.6);
      const chassis = new THREE.Mesh(chassisGeo, bodyMat);
      chassis.position.set(0, 0, 0.1);
      chassis.castShadow = true;
      group.add(chassis);

      // 2.2 Dual Magnetic Accelerator Rails (Twin Rods)
      const railLGeo = new THREE.BoxGeometry(0.02, 0.04, 0.85);
      const railL = new THREE.Mesh(railLGeo, darkSteelMat);
      railL.position.set(-0.04, 0.05, -0.45);
      group.add(railL);

      const railRGeo = new THREE.BoxGeometry(0.02, 0.04, 0.85);
      const railR = new THREE.Mesh(railRGeo, darkSteelMat);
      railR.position.set(0.04, 0.05, -0.45);
      group.add(railR);

      // 2.3 Accelerator Coils (Electromagnetic Rings)
      for (let i = 0; i < 4; i++) {
        const ringGeo = new THREE.TorusGeometry(0.045, 0.008, 8, 16);
        const ring = new THREE.Mesh(ringGeo, accentMat);
        ring.position.set(0, 0.05, -0.2 - i * 0.18);
        group.add(ring);
      }

      // 2.4 High Magnification Sniper Scope
      const scopeTubeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.38, 12);
      scopeTubeGeo.rotateX(Math.PI / 2);
      const scopeTube = new THREE.Mesh(scopeTubeGeo, darkSteelMat);
      scopeTube.position.set(0, 0.16, 0.02);
      group.add(scopeTube);

      const scopeLensFront = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), glassMat);
      scopeLensFront.position.set(0, 0.16, -0.17);
      group.add(scopeLensFront);

      // 2.5 Battery Power Cell
      const cellGeo = new THREE.BoxGeometry(0.08, 0.18, 0.14);
      cellGeo.rotateX(-0.1);
      const cell = new THREE.Mesh(cellGeo, accentMat);
      cell.position.set(0, -0.12, 0.05);
      group.add(cell);

      // 2.6 Heavy Counterbalance Stock
      const stockGeo = new THREE.BoxGeometry(0.09, 0.15, 0.32);
      const stock = new THREE.Mesh(stockGeo, trimMat);
      stock.position.set(0, -0.02, 0.45);
      group.add(stock);

      // 2.7 Heavy Grip
      const gripGeo = new THREE.BoxGeometry(0.05, 0.18, 0.08);
      gripGeo.rotateX(-0.3);
      const grip = new THREE.Mesh(gripGeo, trimMat);
      grip.position.set(0, -0.16, 0.22);
      group.add(grip);
    } else if (id === 'scatter_x') {
      // 3. SCATTER-X QUANTUM SHOTGUN
      // 3.1 Receiver
      const receiverGeo = new THREE.BoxGeometry(0.12, 0.16, 0.38);
      const receiver = new THREE.Mesh(receiverGeo, bodyMat);
      group.add(receiver);

      // 3.2 Quad Heavy Barrel Cluster
      const barrelPositions = [
        [-0.025, 0.025],
        [0.025, 0.025],
        [-0.025, -0.025],
        [0.025, -0.025],
      ];
      barrelPositions.forEach(([bx, by]) => {
        const bGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 10);
        bGeo.rotateX(Math.PI / 2);
        const bMesh = new THREE.Mesh(bGeo, darkSteelMat);
        bMesh.position.set(bx, by + 0.04, -0.38);
        group.add(bMesh);
      });

      // 3.3 Heavy Muzzle Breacher
      const breacherGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
      const breacher = new THREE.Mesh(breacherGeo, trimMat);
      breacher.position.set(0, 0.04, -0.62);
      group.add(breacher);

      // 3.4 Pump Action Foregrip
      const pumpGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8);
      pumpGeo.rotateX(Math.PI / 2);
      const pump = new THREE.Mesh(pumpGeo, trimMat);
      pump.position.set(0, -0.02, -0.32);
      group.add(pump);

      // 3.5 Shell Loading Port with Glowing Cells
      const portGeo = new THREE.BoxGeometry(0.03, 0.08, 0.12);
      const port = new THREE.Mesh(portGeo, accentMat);
      port.position.set(0.065, 0.02, 0.05);
      group.add(port);

      // 3.6 Solid Tactical Stock
      const stockGeo = new THREE.BoxGeometry(0.08, 0.16, 0.3);
      const stock = new THREE.Mesh(stockGeo, trimMat);
      stock.position.set(0, -0.04, 0.3);
      group.add(stock);

      // 3.7 Grip
      const gripGeo = new THREE.BoxGeometry(0.05, 0.16, 0.07);
      gripGeo.rotateX(-0.25);
      const grip = new THREE.Mesh(gripGeo, trimMat);
      grip.position.set(0, -0.14, 0.12);
      group.add(grip);
    } else {
      // 4. PULSAR-7 TACTICAL LASER PISTOL
      // 4.1 Slide
      const slideGeo = new THREE.BoxGeometry(0.07, 0.08, 0.26);
      const slide = new THREE.Mesh(slideGeo, bodyMat);
      slide.position.set(0, 0.06, -0.04);
      group.add(slide);

      // 4.2 Barrel & Emitter
      const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.1, 10);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, darkSteelMat);
      barrel.position.set(0, 0.06, -0.19);
      group.add(barrel);

      // 4.3 Grip
      const gripGeo = new THREE.BoxGeometry(0.055, 0.16, 0.07);
      gripGeo.rotateX(-0.28);
      const grip = new THREE.Mesh(gripGeo, trimMat);
      grip.position.set(0, -0.06, 0.03);
      group.add(grip);

      // 4.4 Compact Reflex Sight
      const reflexGeo = new THREE.BoxGeometry(0.04, 0.04, 0.05);
      const reflex = new THREE.Mesh(reflexGeo, darkSteelMat);
      reflex.position.set(0, 0.115, 0.02);
      group.add(reflex);

      const dotLens = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), glassMat);
      dotLens.position.set(0, 0.12, 0.0);
      group.add(dotLens);

      // 4.5 Glowing Side Inlays
      const inlayGeo = new THREE.BoxGeometry(0.074, 0.015, 0.14);
      const inlay = new THREE.Mesh(inlayGeo, accentMat);
      inlay.position.set(0, 0.06, -0.04);
      group.add(inlay);
    }

    // Laser sight module (tactical laser beam emitter attached under barrel)
    if (hasLaser) {
      const laserBox = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), darkSteelMat);
      laserBox.position.set(0.04, -0.02, -0.18);
      group.add(laserBox);

      const laserLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8),
        new THREE.MeshBasicMaterial({ color: p.glow })
      );
      laserLens.rotateX(Math.PI / 2);
      laserLens.position.set(0.04, -0.02, -0.23);
      group.add(laserLens);
    }

    // Scale group to comfortable viewmodel size
    group.scale.set(1.4, 1.4, 1.4);
    return group;
  }
}
