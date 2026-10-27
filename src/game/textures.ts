/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Procedural Canvas Textures for PBR Rendering
// Adheres to Three.js directives: SRGBColorSpace, procedural canvas, zero 404 dependencies.

export class TextureFactory {
  private static cachedTextures: Map<string, THREE.CanvasTexture> = new Map();

  // 1. Sci-Fi Hexagonal Metallic Floor
  public static createFloorTexture(): THREE.CanvasTexture {
    const key = 'floor_metal';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark titanium metallic base
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, size, size);

    // Subtle metallic noise
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const brightness = Math.floor(Math.random() * 25 + 15);
      ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 8})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Grid panels
    const step = 64;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Hexagonal cyber pattern inside tiles
    const hexR = 14;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    for (let x = step / 2; x < size; x += step) {
      for (let y = step / 2; y < size; y += step) {
        // Hexagon center
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3;
          const hx = x + hexR * Math.cos(angle);
          const hy = y + hexR * Math.sin(angle);
          if (a === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        // Glowing center node
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Corner rivets
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 28, y - 28, 3, 3);
        ctx.fillRect(x + 25, y - 28, 3, 3);
        ctx.fillRect(x - 28, y + 25, 3, 3);
        ctx.fillRect(x + 25, y + 25, 3, 3);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 2. Cyber Wall Panel Texture
  public static createWallTexture(): THREE.CanvasTexture {
    const key = 'wall_panel';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark alloy base
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, size, size);

    // Beveled panels
    const panelW = 256;
    const panelH = 128;
    for (let px = 0; px < size; px += panelW) {
      for (let py = 0; py < size; py += panelH) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(px + 4, py + 4, panelW - 8, panelH - 8);

        // Inner plate
        ctx.fillStyle = '#161e2e';
        ctx.fillRect(px + 12, py + 12, panelW - 24, panelH - 24);

        // Seam border
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);

        // Glowing cyber trace line
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 20, py + panelH - 20);
        ctx.lineTo(px + panelW - 30, py + panelH - 20);
        ctx.lineTo(px + panelW - 20, py + panelH - 30);
        ctx.stroke();

        // Rivets
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath();
        ctx.arc(px + 8, py + 8, 2, 0, Math.PI * 2);
        ctx.arc(px + panelW - 8, py + 8, 2, 0, Math.PI * 2);
        ctx.arc(px + 8, py + panelH - 8, 2, 0, Math.PI * 2);
        ctx.arc(px + panelW - 8, py + panelH - 8, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hazard warning stripe section on top
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, size, 16);
    ctx.fillStyle = '#000000';
    for (let i = -16; i < size; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 12, 0);
      ctx.lineTo(i + 4, 16);
      ctx.lineTo(i - 8, 16);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 3. Holographic Target Bullseye
  public static createTargetTexture(): THREE.CanvasTexture {
    const key = 'target_bullseye';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    // Glowing rings
    const rings = [110, 85, 60, 35, 12];
    const colors = ['#0284c7', '#0ea5e9', '#38bdf8', '#f43f5e', '#ef4444'];

    rings.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors[idx];
      ctx.lineWidth = idx === rings.length - 1 ? 6 : 3;
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy);
    ctx.lineTo(cx - 20, cy);
    ctx.moveTo(cx + 20, cy);
    ctx.lineTo(cx + 120, cy);
    ctx.moveTo(cx, cy - 120);
    ctx.lineTo(cx, cy - 20);
    ctx.moveTo(cx, cy + 20);
    ctx.lineTo(cx, cy + 120);
    ctx.stroke();

    // Center bullseye
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 4. Particle Glow Texture
  public static createGlowTexture(color = '#00f0ff'): THREE.CanvasTexture {
    const key = `glow_${color}`;
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, color);
    grad.addColorStop(0.7, 'rgba(0, 200, 255, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 5. Muzzle Flash Flare Texture
  public static createMuzzleFlashTexture(): THREE.CanvasTexture {
    const key = 'muzzle_flash';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;

    // Starburst rays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const len = i % 2 === 0 ? 120 : 60;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - 0.1) * len, cy + Math.sin(angle - 0.1) * len);
      ctx.lineTo(cx + Math.cos(angle + 0.1) * len, cy + Math.sin(angle + 0.1) * len);
    }
    ctx.fill();

    // Central high glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#67e8f9');
    grad.addColorStop(0.6, '#06b6d4');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 6. Cyberpunk Sky Dome Texture (Night sky with stars + glowing horizon skyline)
  public static createSkyDomeTexture(): THREE.CanvasTexture {
    const key = 'skydome_cyber';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Zenith to horizon gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#030712'); // Deep space
    skyGrad.addColorStop(0.5, '#0b1329'); // Dark navy
    skyGrad.addColorStop(0.85, '#1e1b4b'); // Cyber purple haze
    skyGrad.addColorStop(1, '#0f172a'); // Horizon fog line

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < 600; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * (height * 0.7);
      const bright = Math.random() * 200 + 55;
      const rad = Math.random() * 1.5;
      ctx.fillStyle = `rgb(${bright}, ${bright + 20}, 255)`;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant cyber skyline silhouettes along bottom
    ctx.fillStyle = '#060913';
    let bx = 0;
    while (bx < width) {
      const bWidth = Math.random() * 25 + 15;
      const bHeight = Math.random() * 80 + 30;
      ctx.fillRect(bx, height - bHeight, bWidth, bHeight);

      // Cyber tower beacon light
      if (Math.random() > 0.6) {
        ctx.fillStyle = Math.random() > 0.5 ? '#06b6d4' : '#ec4899';
        ctx.fillRect(bx + bWidth / 2 - 1, height - bHeight - 4, 3, 3);
        ctx.fillStyle = '#060913';
      }
      bx += bWidth + Math.random() * 8;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 7. Tactical Carbon Fiber Texture (High-end firearm composite weave)
  public static createCarbonFiberTexture(): THREE.CanvasTexture {
    const key = 'carbon_fiber';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, size, size);

    const step = 8;
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        const isOffset = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
        ctx.fillStyle = isOffset ? '#1c1f26' : '#14161b';
        ctx.fillRect(x, y, step, step);

        // Micro twill weave lines
        ctx.strokeStyle = isOffset ? '#262a34' : '#181b22';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step, y + step);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cachedTextures.set(key, texture);
    return texture;
  }
}

