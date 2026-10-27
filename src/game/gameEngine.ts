/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundManager } from './audio';
import { WeaponId, WeaponSkin, WEAPON_REGISTRY, WeaponModelFactory, WeaponStats } from './weaponModels';
import { EnemyType, ENEMY_CONFIGS, EnemyModelFactory, EnemyConfig } from './enemyModels';
import { MapId, MAP_CONFIGS, ArenaBuilder, ArenaCollider, HolographicTarget } from './arena';

export type GameMode = 'waves' | 'target_assault' | 'boss_titans' | 'firing_range';
export type GameState = 'lobby' | 'playing' | 'paused' | 'game_over' | 'victory';

export interface GameSettings {
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  mouseSensitivity: number;
  invertY: boolean;
  fov: number;
  crosshairStyle: 'dot' | 'cross' | 'circle' | 'diamond';
  crosshairColor: string;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  soundMuted: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  score: number;
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  wave: number;
  maxWave: number;
  combo: number;
  comboTimer: number;
}

export interface FloatingText {
  id: number;
  text: string;
  color: string;
  isCrit: boolean;
  x: number;
  y: number;
  opacity: number;
  life: number;
}

export interface ActiveEnemy {
  id: number;
  type: EnemyType;
  config: EnemyConfig;
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  eyeMesh?: THREE.Mesh;
  coreMesh?: THREE.Mesh;
  legs?: THREE.Object3D[];
  health: number;
  maxHealth: number;
  velocity: THREE.Vector3;
  attackTimer: number;
  isTelegraphing: boolean;
  telegraphTimer: number;
  flashTimer: number;
  animTime: number;
}

export interface ActiveTracer {
  line: THREE.Line;
  start: THREE.Vector3;
  end: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ActiveParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export interface ActiveLoot {
  mesh: THREE.Group;
  type: 'health' | 'shield' | 'ammo';
  position: THREE.Vector3;
  spin: number;
}

// Math helpers allocated outside animation loop for Zero GC
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _ray = new THREE.Raycaster();

export class GameEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl = false;

  // State
  public state: GameState = 'lobby';
  public currentMode: GameMode = 'waves';
  public currentMap: MapId = 'neon_sector';
  public currentWeaponId: WeaponId = 'viper_9';
  public currentSkin: WeaponSkin = 'cyber_noir';
  public hasSilencer = false;
  public hasLaser = true;

  // Settings
  public settings: GameSettings = {
    graphicsQuality: 'high',
    mouseSensitivity: 1.0,
    invertY: false,
    fov: 75,
    crosshairStyle: 'cross',
    crosshairColor: '#00f0ff',
    masterVolume: 1.0,
    sfxVolume: 0.8,
    musicVolume: 0.35,
    soundMuted: false,
  };

  // Player & Gameplay
  public playerStats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    ammo: 32,
    maxAmmo: 32,
    reserveAmmo: 180,
    isReloading: false,
    score: 0,
    kills: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    wave: 1,
    maxWave: 10,
    combo: 0,
    comboTimer: 0,
  };

  // Environment & Arena
  private arenaGroup: THREE.Group | null = null;
  private colliders: ArenaCollider[] = [];
  private targets: HolographicTarget[] = [];
  private spawnPoints: THREE.Vector3[] = [];
  private playerSpawnPos = new THREE.Vector3(0, 1.7, 20);

  // Player FPS Controller
  public playerPos = new THREE.Vector3(0, 1.7, 20);
  private playerVel = new THREE.Vector3();
  private isGrounded = true;
  private wasGrounded = true;
  private footstepTimer = 0.44;
  private isSprinting = false;
  private isCrouching = false;
  private isADS = false;
  private cameraPitch = 0;
  private cameraYaw = 0;

  // Weapon Viewmodel & Animation
  private weaponRig = new THREE.Group();
  private weaponMesh: THREE.Group | null = null;
  private muzzleFlashMesh: THREE.Mesh | null = null;
  private muzzleLight: THREE.PointLight | null = null;
  private laserBeamMesh: THREE.Line | null = null;
  private laserDotMesh: THREE.Mesh | null = null;

  private weaponSway = new THREE.Vector2();
  private weaponBobTime = 0;
  private recoilOffset = new THREE.Vector3();
  private recoilRot = new THREE.Vector3();
  private reloadProgress = 0;
  private fireTimer = 0;
  private isMouseDown = false;

  // Camera Shake & Hitstop
  private cameraShakeIntensity = 0;
  private hitstopTimer = 0;

  // Pools
  private enemies: ActiveEnemy[] = [];
  private tracers: ActiveTracer[] = [];
  private particles: ActiveParticle[] = [];
  private loots: ActiveLoot[] = [];
  public floatingTexts: FloatingText[] = [];
  private nextEntityId = 1;

  // Lobby Turntable
  private lobbyWeaponTurntable: THREE.Group | null = null;
  private lobbyWeaponMesh: THREE.Group | null = null;
  private lobbyRingInner: THREE.Mesh | null = null;
  private lobbyRingOuter: THREE.Mesh | null = null;
  private lobbyTurntableLight: THREE.PointLight | null = null;
  private lobbyCameraAngle = 0;
  private isTurntableDragging = false;
  private turntableLastMouseX = 0;
  private turntableLastMouseY = 0;
  private turntableRotY = 0;
  private turntableTiltX = 0;
  public isInspecting = false;
  private inspectTimer = 0;
  private lobbyAnimTime = 0;
  private lobbyRoomGroup: THREE.Group | null = null;
  private lobbyMotesMesh: THREE.Points | null = null;

  // Controls input map & Mobile Android analog inputs
  public keys: Record<string, boolean> = {};
  public moveInput = new THREE.Vector2(0, 0); // (x: -1..1 strafe, y: -1..1 forward/backward)
  public isMobileRunning = false;
  private hasLastMousePos = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private touchLookStartX = 0;
  private touchLookStartY = 0;
  private isTouchLooking = false;

  // Timing
  private lastTime = 0;
  private frameId = 0;
  private waveSpawnTimer = 3.0;
  private waveEnemiesRemaining = 0;
  private waveEnemiesToSpawn = 0;

  // Callbacks to React UI
  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onStateChange?: (state: GameState) => void;
  public onFloatingTextAdd?: (text: FloatingText) => void;
  public onHitFeedback?: (isHeadshot: boolean, damage: number, isKill: boolean) => void;
  public onADSChange?: (isADS: boolean) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'w-full h-full block select-none';
    this.container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      this.container.clientWidth / this.container.clientHeight,
      0.05,
      250
    );

    // 4. Studio Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Key Light & Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(25, 40, 20);
    keyLight.castShadow = !this.isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 120;
      keyLight.shadow.camera.left = -35;
      keyLight.shadow.camera.right = 35;
      keyLight.shadow.camera.top = 35;
      keyLight.shadow.camera.bottom = -35;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // 5. Weapon Rig attached to Camera
    this.camera.add(this.weaponRig);
    this.scene.add(this.camera);

    this.setupMuzzleFlash();
    this.setupLaserSight();
    this.rebuildWeaponMesh();

    // 6. Build Initial Arena
    this.loadMap(this.currentMap);
    if (this.arenaGroup) this.arenaGroup.visible = false;

    // 7. Setup Lobby Turntable & Cyber Hangar Room
    this.setupLobbyTurntable();
    this.scene.fog = new THREE.Fog(0x060c18, 12, 38);

    // 8. Event Listeners
    this.setupEventListeners();
    this.handleResize();

    // 9. Start Main Animation Loop
    this.lastTime = performance.now();
    this.startLoop();
  }

  // Setup Weapon Muzzle Flash & Light
  private setupMuzzleFlash() {
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.muzzleFlashMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), flashMat);
    this.muzzleFlashMesh.position.set(0.18, -0.15, -0.7);
    this.weaponRig.add(this.muzzleFlashMesh);

    this.muzzleLight = new THREE.PointLight(0x00f0ff, 0, 15);
    this.muzzleLight.position.set(0.18, -0.15, -0.7);
    this.weaponRig.add(this.muzzleLight);
  }

  // Setup Laser Sight Beam
  private setupLaserSight() {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -40),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
    });
    this.laserBeamMesh = new THREE.Line(lineGeo, lineMat);
    this.laserBeamMesh.position.set(0.22, -0.18, -0.4);
    this.weaponRig.add(this.laserBeamMesh);

    // Laser hit dot
    const dotGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.laserDotMesh = new THREE.Mesh(dotGeo, dotMat);
    this.scene.add(this.laserDotMesh);
  }

  // Rebuild Viewmodel Weapon Mesh
  public rebuildWeaponMesh() {
    if (this.weaponMesh) {
      this.weaponRig.remove(this.weaponMesh);
    }
    this.weaponMesh = WeaponModelFactory.createWeaponMesh(
      this.currentWeaponId,
      this.currentSkin,
      this.hasSilencer,
      this.hasLaser
    );
    // Standard resting position for first-person view
    this.weaponMesh.position.set(0.22, -0.22, -0.45);
    this.weaponRig.add(this.weaponMesh);

    // Sync stats
    const stats = WEAPON_REGISTRY[this.currentWeaponId];
    this.playerStats.ammo = stats.magazineSize;
    this.playerStats.maxAmmo = stats.magazineSize;
    this.onStatsUpdate?.(this.playerStats);

    // Update laser visibility
    if (this.laserBeamMesh) this.laserBeamMesh.visible = this.hasLaser && this.state === 'playing';
    if (this.laserDotMesh) this.laserDotMesh.visible = this.hasLaser && this.state === 'playing';

    // Rebuild lobby turntable weapon if in lobby
    this.updateLobbyTurntableWeapon();
  }

  // Setup Lobby Turntable & Cyber Hangar Room
  private setupLobbyTurntable() {
    this.lobbyWeaponTurntable = new THREE.Group();
    this.lobbyWeaponTurntable.position.set(0, 1.35, 0);
    this.scene.add(this.lobbyWeaponTurntable);
    this.updateLobbyTurntableWeapon();
    this.setupLobbyEnvironment();
  }

  // Setup High-End Architectural Cyber Hangar Lobby Environment
  private setupLobbyEnvironment() {
    this.lobbyRoomGroup = new THREE.Group();
    this.lobbyRoomGroup.name = 'lobby_room_environment';

    // 1. Polished Reflective Hangar Floor (radius 18m)
    const floorGeo = new THREE.CylinderGeometry(18, 18, 0.3, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080e18,
      metalness: 0.88,
      roughness: 0.22,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.15, 0);
    floorMesh.receiveShadow = true;
    this.lobbyRoomGroup.add(floorMesh);

    // Floor Glowing Boundary Rings
    const floorOuterRing = new THREE.Mesh(
      new THREE.TorusGeometry(17.2, 0.06, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    floorOuterRing.rotation.x = Math.PI / 2;
    floorOuterRing.position.set(0, 0.02, 0);
    this.lobbyRoomGroup.add(floorOuterRing);

    const floorMidRing = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, 0.04, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    floorMidRing.rotation.x = Math.PI / 2;
    floorMidRing.position.set(0, 0.02, 0);
    this.lobbyRoomGroup.add(floorMidRing);

    // 2. Central Raised Octagonal Showcase Stage (underneath weapon pedestal)
    const stageGeo = new THREE.CylinderGeometry(3.6, 4.0, 0.2, 8);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x0d1522,
      metalness: 0.9,
      roughness: 0.25,
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.set(0, 0.1, 0);
    this.lobbyRoomGroup.add(stageMesh);

    const stageRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.62, 0.045, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.set(0, 0.21, 0);
    this.lobbyRoomGroup.add(stageRim);

    // Hazard chevrons on stage perimeter (8 radial gold ticks)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.04, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      tick.position.set(Math.cos(angle) * 3.1, 0.21, Math.sin(angle) * 3.1);
      tick.rotation.y = -angle;
      this.lobbyRoomGroup.add(tick);
    }

    // 3. 8 Heavy Architectural Cyber Columns
    const colCount = 8;
    for (let i = 0; i < colCount; i++) {
      const angle = (i / colCount) * Math.PI * 2;
      const radius = 12.0;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;

      const colGroup = new THREE.Group();
      colGroup.position.set(cx, 0, cz);
      colGroup.rotation.y = -angle + Math.PI / 2;

      // Heavy Column Trunk
      const colMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 8.5, 0.9),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.85,
          roughness: 0.35,
        })
      );
      colMesh.position.set(0, 4.25, 0);
      colGroup.add(colMesh);

      // Base bracket & Top Capital
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
      const baseBracket = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), bracketMat);
      baseBracket.position.set(0, 0.25, 0);
      colGroup.add(baseBracket);

      const topBracket = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), bracketMat);
      topBracket.position.set(0, 8.25, 0);
      colGroup.add(topBracket);

      // Vertical Glowing Neon LED Strip
      const neonColor = i % 2 === 0 ? 0x00f0ff : 0x38bdf8;
      const neonStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 7.6, 0.94),
        new THREE.MeshBasicMaterial({ color: neonColor })
      );
      neonStrip.position.set(0, 4.25, 0);
      colGroup.add(neonStrip);

      // Overhead Structural Roof Truss reaching inward
      const trussGeo = new THREE.BoxGeometry(0.2, 0.25, 6.0);
      const truss = new THREE.Mesh(trussGeo, bracketMat);
      truss.position.set(0, 7.5, -3.0);
      truss.rotation.x = 0.15;
      colGroup.add(truss);

      this.lobbyRoomGroup.add(colGroup);
    }

    // 4. Rear Panoramic Window Frame & Cyberpunk City Backdrop (z = -12.5)
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(20, 7.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.9, roughness: 0.3 })
    );
    windowFrame.position.set(0, 3.8, -12.8);
    this.lobbyRoomGroup.add(windowFrame);

    // Glass Panes (Transparent tinted reinforced cyber glass)
    const glassPane = new THREE.Mesh(
      new THREE.PlaneGeometry(18.5, 6.0),
      new THREE.MeshBasicMaterial({
        color: 0x082f49,
        transparent: true,
        opacity: 0.45,
      })
    );
    glassPane.position.set(0, 3.8, -12.5);
    this.lobbyRoomGroup.add(glassPane);

    // Outside the Window: Cyberpunk Skyline Towers
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(0, 0, -18);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x040812,
      metalness: 0.95,
      roughness: 0.4,
    });
    const winCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const winRoseMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const winAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const towerSpecs = [
      { x: -14, h: 22, w: 3.5, d: 3.5 },
      { x: -9.5, h: 28, w: 4.2, d: 4.0 },
      { x: -5, h: 18, w: 2.8, d: 2.8 },
      { x: 0, h: 34, w: 5.0, d: 5.0 }, // Central megatower
      { x: 5.5, h: 20, w: 3.2, d: 3.0 },
      { x: 10, h: 26, w: 4.0, d: 3.8 },
      { x: 14.5, h: 19, w: 3.0, d: 3.0 },
      { x: -18, h: 16, w: 2.5, d: 2.5 },
      { x: 18, h: 15, w: 2.6, d: 2.6 },
    ];

    towerSpecs.forEach((ts, idx) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(ts.w, ts.h, ts.d), towerMat);
      tower.position.set(ts.x, ts.h / 2 - 2, -(idx % 3) * 2.5);
      skylineGroup.add(tower);

      // Window strips
      for (let y = 3; y < ts.h - 3; y += 3.2) {
        const winBand = new THREE.Mesh(
          new THREE.BoxGeometry(ts.w * 0.8, 0.4, ts.d + 0.05),
          idx % 2 === 0 ? winCyanMat : idx % 3 === 0 ? winRoseMat : winAmberMat
        );
        winBand.position.set(ts.x, y, -(idx % 3) * 2.5);
        skylineGroup.add(winBand);
      }

      // Antenna beacon
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 2.5, 6),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      ant.position.set(ts.x, ts.h - 1, -(idx % 3) * 2.5);
      skylineGroup.add(ant);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff0044 })
      );
      beacon.position.set(ts.x, ts.h + 0.3, -(idx % 3) * 2.5);
      skylineGroup.add(beacon);
    });

    this.lobbyRoomGroup.add(skylineGroup);

    // 5. Left Wall: Tactical Command Holographic Display (x = -11.2)
    const leftScreenGroup = new THREE.Group();
    leftScreenGroup.position.set(-11.2, 3.4, 0);
    leftScreenGroup.rotation.y = Math.PI / 2;

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 3.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x090f1b, metalness: 0.9, roughness: 0.3 })
    );
    leftScreenGroup.add(leftFrame);

    const leftHolo = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 2.8),
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.6,
      })
    );
    leftHolo.position.z = 0.12;
    leftScreenGroup.add(leftHolo);

    const radarRing = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.74, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    radarRing.position.set(-1.4, 0, 0.13);
    leftScreenGroup.add(radarRing);

    this.lobbyRoomGroup.add(leftScreenGroup);

    // 6. Right Wall: Armory Vault with Weapon Pods (x = +11.2)
    const rightVaultGroup = new THREE.Group();
    rightVaultGroup.position.set(11.2, 3.4, 0);
    rightVaultGroup.rotation.y = -Math.PI / 2;

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 3.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x090f1b, metalness: 0.9, roughness: 0.3 })
    );
    rightVaultGroup.add(rightFrame);

    // 3 Armory weapon pods with golden/amber neon outlines
    for (let p = -1; p <= 1; p++) {
      const podBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.4, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.3 })
      );
      podBox.position.set(p * 1.9, 0, 0.12);
      rightVaultGroup.add(podBox);

      const podRim = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 2.3, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true })
      );
      podRim.position.set(p * 1.9, 0, 0.22);
      rightVaultGroup.add(podRim);
    }
    this.lobbyRoomGroup.add(rightVaultGroup);

    // 7. Overhead Lighting Rig & Spotlights
    const rigGantry = new THREE.Mesh(
      new THREE.TorusGeometry(3.0, 0.08, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
    );
    rigGantry.rotation.x = Math.PI / 2;
    rigGantry.position.set(0, 6.2, 0);
    this.lobbyRoomGroup.add(rigGantry);

    // Studio Spotlights focused on weapon turntable
    const keySpot = new THREE.SpotLight(0xe0f2fe, 5.0, 16, Math.PI / 4, 0.4, 1.2);
    keySpot.position.set(0, 6.0, 1.5);
    keySpot.target = this.lobbyWeaponTurntable || floorMesh;
    this.lobbyRoomGroup.add(keySpot);

    const rimSpot = new THREE.PointLight(0x00f0ff, 3.5, 10);
    rimSpot.position.set(0, 3.5, -2.5);
    this.lobbyRoomGroup.add(rimSpot);

    const fillSpot = new THREE.PointLight(0xf59e0b, 2.5, 10);
    fillSpot.position.set(2.8, 3.0, 2.5);
    this.lobbyRoomGroup.add(fillSpot);

    // 8. Atmospheric Floating Energy Motes
    const moteCount = 90;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount * 3; i += 3) {
      motePos[i] = (Math.random() - 0.5) * 12;
      motePos[i + 1] = Math.random() * 5 + 0.5;
      motePos[i + 2] = (Math.random() - 0.5) * 12;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.lobbyMotesMesh = new THREE.Points(moteGeo, moteMat);
    this.lobbyRoomGroup.add(this.lobbyMotesMesh);

    // Add room to main scene
    this.scene.add(this.lobbyRoomGroup);
  }

  public inspectWeapon() {
    this.isInspecting = true;
    this.inspectTimer = 2.4;
    soundManager.playWeaponEquip();
  }

  public resetTurntable() {
    this.turntableRotY = 0;
    this.turntableTiltX = 0;
    this.isInspecting = false;
    soundManager.playUIClick();
  }

  private updateLobbyTurntableWeapon() {
    if (!this.lobbyWeaponTurntable) return;
    // Clear old children
    while (this.lobbyWeaponTurntable.children.length > 0) {
      this.lobbyWeaponTurntable.remove(this.lobbyWeaponTurntable.children[0]);
    }

    // Pedestal stand - Dark carbon octagonal base
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.15, 1.5, 8),
      new THREE.MeshStandardMaterial({
        color: 0x090d16,
        metalness: 0.85,
        roughness: 0.25,
      })
    );
    stand.position.set(0, -0.85, 0);
    this.lobbyWeaponTurntable.add(stand);

    // Emitter Plate Disc with neon pulse rim
    const emitterDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.08, 16),
      new THREE.MeshStandardMaterial({
        color: 0x021627,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      })
    );
    emitterDisc.position.set(0, -0.1, 0);
    this.lobbyWeaponTurntable.add(emitterDisc);

    // Concentric rotating neon cyber rings
    this.lobbyRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.03, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    this.lobbyRingInner.rotation.x = Math.PI / 2;
    this.lobbyRingInner.position.set(0, -0.06, 0);
    this.lobbyWeaponTurntable.add(this.lobbyRingInner);

    this.lobbyRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    this.lobbyRingOuter.rotation.x = Math.PI / 2;
    this.lobbyRingOuter.position.set(0, -0.06, 0);
    this.lobbyWeaponTurntable.add(this.lobbyRingOuter);

    // Glow point light underneath weapon
    this.lobbyTurntableLight = new THREE.PointLight(0x00f0ff, 4.0, 5.0);
    this.lobbyTurntableLight.position.set(0, 0.4, 0);
    this.lobbyWeaponTurntable.add(this.lobbyTurntableLight);

    // Weapon mesh container
    this.lobbyWeaponMesh = WeaponModelFactory.createWeaponMesh(
      this.currentWeaponId,
      this.currentSkin,
      this.hasSilencer,
      this.hasLaser
    );
    this.lobbyWeaponMesh.scale.set(3.2, 3.2, 3.2);
    this.lobbyWeaponMesh.position.set(0, 0.1, 0);
    this.lobbyWeaponTurntable.add(this.lobbyWeaponMesh);
  }

  // Load Arena
  public loadMap(mapId: MapId) {
    this.currentMap = mapId;
    if (this.arenaGroup) {
      this.scene.remove(this.arenaGroup);
    }
    const config = MAP_CONFIGS[mapId];
    if (this.state === 'playing') {
      this.scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
    }

    const built = ArenaBuilder.buildArena(mapId);
    this.arenaGroup = built.arenaGroup;
    this.colliders = built.colliders;
    this.targets = built.targets;
    this.spawnPoints = built.spawnPoints;
    this.playerSpawnPos = built.playerSpawn;
    this.scene.add(this.arenaGroup);

    if (this.state === 'lobby') {
      this.arenaGroup.visible = false;
    }

    // Reset player position
    this.playerPos.copy(this.playerSpawnPos);
    this.camera.position.copy(this.playerPos);
  }

  // Set Graphics Quality Preset
  public setGraphicsQuality(quality: 'low' | 'medium' | 'high' | 'ultra') {
    this.settings.graphicsQuality = quality;
    if (quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1.0);
    } else if (quality === 'medium') {
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.setPixelRatio(1.0);
    } else if (quality === 'high') {
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    }
  }

  // Switch Game State
  public setState(newState: GameState) {
    this.state = newState;
    this.onStateChange?.(newState);

    if (newState === 'playing') {
      soundManager.initContext();
      soundManager.startAmbientMusic();
      this.lockPointer();
      this.weaponRig.visible = true;
      if (this.lobbyWeaponTurntable) this.lobbyWeaponTurntable.visible = false;
      if (this.lobbyRoomGroup) this.lobbyRoomGroup.visible = false;
      if (this.arenaGroup) this.arenaGroup.visible = true;
      const config = MAP_CONFIGS[this.currentMap];
      this.scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
      if (this.laserBeamMesh) this.laserBeamMesh.visible = this.hasLaser;
      if (this.laserDotMesh) this.laserDotMesh.visible = this.hasLaser;
    } else if (newState === 'lobby') {
      this.unlockPointer();
      this.weaponRig.visible = false;
      if (this.lobbyWeaponTurntable) this.lobbyWeaponTurntable.visible = true;
      if (this.lobbyRoomGroup) this.lobbyRoomGroup.visible = true;
      if (this.arenaGroup) this.arenaGroup.visible = false;
      this.scene.fog = new THREE.Fog(0x060c18, 12, 38);
      if (this.laserBeamMesh) this.laserBeamMesh.visible = false;
      if (this.laserDotMesh) this.laserDotMesh.visible = false;
      this.clearEntities();
    } else if (newState === 'paused') {
      this.unlockPointer();
    }
  }

  // Start / Deploy Game
  public startDeployment(mode: GameMode, mapId: MapId) {
    this.currentMode = mode;
    this.loadMap(mapId);

    // Reset stats
    this.playerStats.health = this.playerStats.maxHealth;
    this.playerStats.shield = this.playerStats.maxShield;
    this.playerStats.ammo = WEAPON_REGISTRY[this.currentWeaponId].magazineSize;
    this.playerStats.reserveAmmo = 180;
    this.playerStats.isReloading = false;
    this.playerStats.score = 0;
    this.playerStats.kills = 0;
    this.playerStats.headshots = 0;
    this.playerStats.shotsFired = 0;
    this.playerStats.shotsHit = 0;
    this.playerStats.wave = 1;
    this.playerStats.combo = 0;
    this.playerStats.comboTimer = 0;

    this.playerPos.copy(this.playerSpawnPos);
    this.camera.position.copy(this.playerPos);
    this.cameraPitch = 0;
    this.cameraYaw = 0;

    this.clearEntities();
    this.setupWave(1);
    this.setState('playing');
  }

  // Wave Setup
  private setupWave(waveNum: number) {
    this.playerStats.wave = waveNum;
    this.onStatsUpdate?.(this.playerStats);

    if (this.currentMode === 'firing_range') {
      return; // Targets are static in firing range
    }

    if (this.currentMode === 'boss_titans') {
      this.waveEnemiesToSpawn = 1;
      this.waveEnemiesRemaining = 1;
      this.spawnEnemy('titan');
      return;
    }

    // Standard Waves
    const count = Math.min(4 + waveNum * 2, 22);
    this.waveEnemiesToSpawn = count;
    this.waveEnemiesRemaining = count;
    this.waveSpawnTimer = 1.0;
  }

  // Spawn Enemy
  private spawnEnemy(type?: EnemyType) {
    if (this.spawnPoints.length === 0) return;
    const pt = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];

    let enemyType: EnemyType = type || 'drone';
    if (!type) {
      const r = Math.random();
      if (this.playerStats.wave >= 4 && r < 0.25) {
        enemyType = 'goliath';
      } else if (r < 0.6) {
        enemyType = 'soldier';
      } else {
        enemyType = 'drone';
      }
    }

    const { group, materials, eyeMesh, coreMesh, legs } = EnemyModelFactory.createEnemyMesh(enemyType);
    group.position.copy(pt);
    // Random slight jitter
    group.position.x += (Math.random() - 0.5) * 4;
    group.position.z += (Math.random() - 0.5) * 4;
    this.scene.add(group);

    const config = ENEMY_CONFIGS[enemyType];
    this.enemies.push({
      id: this.nextEntityId++,
      type: enemyType,
      config,
      group,
      materials,
      eyeMesh,
      coreMesh,
      legs,
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      velocity: new THREE.Vector3(),
      attackTimer: Math.random() * 1.5,
      isTelegraphing: false,
      telegraphTimer: 0,
      flashTimer: 0,
      animTime: Math.random() * 10,
    });
  }

  // Clear Entities on state transition
  private clearEntities() {
    this.enemies.forEach(e => this.scene.remove(e.group));
    this.enemies = [];

    this.tracers.forEach(t => this.scene.remove(t.line));
    this.tracers = [];

    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];

    this.loots.forEach(l => this.scene.remove(l.mesh));
    this.loots = [];

    this.floatingTexts = [];
  }

  // Rotate camera look (mirar a los lados / arriba / abajo)
  public rotateLook(deltaYaw: number, deltaPitch: number) {
    this.cameraYaw += deltaYaw;
    this.cameraPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.cameraPitch + deltaPitch));
    this.weaponSway.x -= deltaYaw * 0.12;
    this.weaponSway.y -= deltaPitch * 0.12;
  }

  // Mobile & Touch actions
  public triggerJump() {
    if (this.isGrounded) {
      this.playerVel.y = 7.5;
      this.isGrounded = false;
      soundManager.playJump();
    }
  }

  public toggleCrouch() {
    this.isCrouching = !this.isCrouching;
    return this.isCrouching;
  }

  public getIsCrouching() {
    return this.isCrouching;
  }

  public toggleADS(force?: boolean) {
    const prev = this.isADS;
    this.isADS = force !== undefined ? force : !this.isADS;
    if (this.isADS !== prev) {
      soundManager.playAimDownSights(this.isADS);
      this.onADSChange?.(this.isADS);
    }
    return this.isADS;
  }

  public getADS() {
    return this.isADS;
  }

  public setFiring(firing: boolean) {
    this.isMouseDown = firing;
    if (firing && this.state === 'playing') {
      this.tryFireWeapon();
    }
  }

  // Pointer Lock handling
  public lockPointer() {
    try {
      this.canvas.requestPointerLock?.();
    } catch {
      // Ignore if iframe policy disallows it
    }
  }

  public unlockPointer() {
    try {
      if (document.pointerLockElement === this.canvas) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore
    }
  }

  // Setup Event Listeners
  private setupEventListeners() {
    window.addEventListener('resize', () => this.handleResize());

    // Keyboard
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.key) {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.key] = true;
      }

      if ((e.code === 'KeyR' || e.key === 'r' || e.key === 'R') && this.state === 'playing') {
        this.startReload();
      }
      if (e.code === 'Escape' && this.state === 'playing') {
        this.setState('paused');
      }
      if ((e.code === 'Digit1' || e.code === 'KeyQ' || e.key === '1' || e.key === 'q') && this.state === 'playing') {
        this.switchWeapon('viper_9');
      }
      if ((e.code === 'Digit2' || e.key === '2') && this.state === 'playing') {
        this.switchWeapon('thor_rail');
      }
      if ((e.code === 'Digit3' || e.key === '3') && this.state === 'playing') {
        this.switchWeapon('scatter_x');
      }
      if ((e.code === 'Digit4' || e.code === 'KeyE' || e.key === '4' || e.key === 'e') && this.state === 'playing') {
        this.switchWeapon('pulsar_7');
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.key) {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.key] = false;
      }
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.isMouseDown = false;
      this.hasLastMousePos = false;
      this.isTouchLooking = false;
    });

    // Mouse Move (FPS Look with pointer lock OR drag-to-look fallback)
    window.addEventListener('mousemove', e => {
      if (this.state === 'playing') {
        let dx = e.movementX;
        let dy = e.movementY;

        // Fallback for browsers or iframes where pointer lock is not active
        if (typeof dx === 'undefined' || (dx === 0 && dy === 0 && document.pointerLockElement !== this.canvas)) {
          if (this.hasLastMousePos) {
            dx = e.clientX - this.lastMouseX;
            dy = e.clientY - this.lastMouseY;
          } else {
            dx = 0;
            dy = 0;
          }
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.hasLastMousePos = true;

        const sens = 0.0024 * this.settings.mouseSensitivity;
        const invert = this.settings.invertY ? -1 : 1;

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
          this.cameraYaw -= dx * sens;
          this.cameraPitch -= dy * sens * invert;
          this.cameraPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.cameraPitch));

          this.weaponSway.x += dx * 0.0004;
          this.weaponSway.y += dy * 0.0004;
        }
      } else if (this.state === 'lobby' && this.isTurntableDragging) {
        const deltaX = e.clientX - this.turntableLastMouseX;
        const deltaY = e.clientY - this.turntableLastMouseY;
        this.turntableRotY += deltaX * 0.012;
        this.turntableTiltX = Math.max(-0.55, Math.min(0.55, this.turntableTiltX + deltaY * 0.008));
        this.turntableLastMouseX = e.clientX;
        this.turntableLastMouseY = e.clientY;
      }
    });

    // Mouse Down / Up
    this.canvas.addEventListener('mousedown', e => {
      if (this.state === 'lobby') {
        this.isTurntableDragging = true;
        this.turntableLastMouseX = e.clientX;
        this.turntableLastMouseY = e.clientY;
        return;
      }

      if (this.state === 'playing') {
        this.hasLastMousePos = false;
        this.lockPointer();

        if (e.button === 0) {
          // Left Click (Fire)
          this.isMouseDown = true;
          this.tryFireWeapon();
        } else if (e.button === 2) {
          // Right Click (ADS Zoom)
          e.preventDefault();
          this.toggleADS(true);
        }
      }
    });

    window.addEventListener('mouseup', e => {
      if (this.state === 'lobby') {
        this.isTurntableDragging = false;
      }
      if (this.state === 'playing') {
        if (e.button === 0) {
          this.isMouseDown = false;
        } else if (e.button === 2) {
          this.toggleADS(false);
        }
      }
    });

    // Touch Support for 3D Turntable in Lobby (Mobile / Android)
    this.canvas.addEventListener(
      'touchstart',
      e => {
        if (this.state === 'lobby' && e.touches.length > 0) {
          this.isTurntableDragging = true;
          this.turntableLastMouseX = e.touches[0].clientX;
          this.turntableLastMouseY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      'touchmove',
      e => {
        if (this.state === 'lobby' && this.isTurntableDragging && e.touches.length > 0) {
          const deltaX = e.touches[0].clientX - this.turntableLastMouseX;
          const deltaY = e.touches[0].clientY - this.turntableLastMouseY;
          this.turntableRotY += deltaX * 0.014;
          this.turntableTiltX = Math.max(-0.55, Math.min(0.55, this.turntableTiltX + deltaY * 0.009));
          this.turntableLastMouseX = e.touches[0].clientX;
          this.turntableLastMouseY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    window.addEventListener('touchend', () => {
      if (this.state === 'lobby') {
        this.isTurntableDragging = false;
      }
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Switch Weapon
  public switchWeapon(id: WeaponId) {
    if (this.currentWeaponId === id) return;
    this.currentWeaponId = id;
    this.rebuildWeaponMesh();
    soundManager.playUIClick();
  }

  // Weapon Skin change
  public setWeaponSkin(skin: WeaponSkin) {
    this.currentSkin = skin;
    this.rebuildWeaponMesh();
  }

  // Try Fire Weapon
  private tryFireWeapon() {
    if (this.playerStats.isReloading || this.fireTimer > 0) return;
    const stats = WEAPON_REGISTRY[this.currentWeaponId];

    if (this.playerStats.ammo <= 0) {
      this.startReload();
      return;
    }

    // Deduct ammo & record shot
    this.playerStats.ammo--;
    this.playerStats.shotsFired++;
    this.fireTimer = 1.0 / stats.fireRate;
    this.onStatsUpdate?.(this.playerStats);

    // Audio
    if (this.currentWeaponId === 'viper_9') {
      soundManager.playPlasmaRifle();
    } else if (this.currentWeaponId === 'thor_rail') {
      soundManager.playRailgun();
    } else if (this.currentWeaponId === 'scatter_x') {
      soundManager.playShotgun();
    } else {
      soundManager.playLaserPistol();
    }

    // Muzzle Flash
    if (this.muzzleFlashMesh && this.muzzleLight) {
      (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      this.muzzleLight.intensity = 8;
      setTimeout(() => {
        if (this.muzzleFlashMesh && this.muzzleLight) {
          (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          this.muzzleLight.intensity = 0;
        }
      }, 50);
    }

    // Viewmodel Recoil Impulse
    this.recoilOffset.z += stats.recoil * 1.5;
    this.recoilOffset.y += stats.recoil * 0.4;
    this.recoilRot.x += stats.recoil * 2.2;
    this.cameraShakeIntensity = Math.min(this.cameraShakeIntensity + stats.recoil * 0.6, 0.25);

    // Ballistics / Raycasting
    const pellets = stats.pelletCount || 1;
    for (let p = 0; p < pellets; p++) {
      this.performRaycastShot(stats);
    }

    // Auto reload if empty
    if (this.playerStats.ammo === 0) {
      this.startReload();
    }
  }

  // Perform Raycast for Hitscan Shot
  private performRaycastShot(stats: WeaponStats) {
    const spreadMod = this.isADS ? 0.2 : 1.0;
    const spreadAngle = stats.spread * spreadMod;

    // Calculate forward ray direction with spread
    _vec3A.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    _vec3B.set(
      (Math.random() - 0.5) * spreadAngle * 2,
      (Math.random() - 0.5) * spreadAngle * 2,
      0
    ).applyQuaternion(this.camera.quaternion);
    _vec3A.add(_vec3B).normalize();

    _ray.set(this.camera.position, _vec3A);
    _ray.far = stats.range;

    // Check Targets in Firing Range
    if (this.currentMode === 'firing_range') {
      let closestHitDist = stats.range;
      let hitTarget: HolographicTarget | null = null;

      for (const target of this.targets) {
        const hits = _ray.intersectObjects(target.mesh.children, true);
        if (hits.length > 0 && hits[0].distance < closestHitDist) {
          closestHitDist = hits[0].distance;
          hitTarget = target;
        }
      }

      if (hitTarget) {
        this.playerStats.shotsHit++;
        hitTarget.isHit = true;
        hitTarget.hitTimer = 0.35;
        this.playerStats.score += hitTarget.points;
        soundManager.playTargetDing();
        soundManager.playHitmarker(true);
        this.onHitFeedback?.(true, hitTarget.points, false);
        this.addFloatingText(this.camera.position.clone().addScaledVector(_vec3A, closestHitDist), `+${hitTarget.points}`, '#38bdf8', true);
        this.spawnImpactSparks(this.camera.position.clone().addScaledVector(_vec3A, closestHitDist), _vec3A.clone().negate());
        this.createTracer(this.camera.position, this.camera.position.clone().addScaledVector(_vec3A, closestHitDist));
        this.onStatsUpdate?.(this.playerStats);
        return;
      }
    }

    // Check Enemies
    let closestEnemyHit: { enemy: ActiveEnemy; dist: number; isHeadshot: boolean } | null = null;
    let minEnemyDist = stats.range;

    for (const enemy of this.enemies) {
      const hits = _ray.intersectObjects(enemy.group.children, true);
      if (hits.length > 0 && hits[0].distance < minEnemyDist) {
        minEnemyDist = hits[0].distance;
        // Determine if headshot (hit above 70% of enemy height)
        const hitPoint = hits[0].point;
        const relativeY = hitPoint.y - enemy.group.position.y;
        const isHeadshot = relativeY > enemy.config.height * 0.68;
        closestEnemyHit = { enemy, dist: hits[0].distance, isHeadshot };
      }
    }

    // Check Arena Colliders (walls, crates)
    let closestWallDist = stats.range;
    let wallHitPoint: THREE.Vector3 | null = null;
    let wallNormal: THREE.Vector3 | null = null;

    for (const collider of this.colliders) {
      const hits = _ray.intersectObject(collider.mesh, true);
      if (hits.length > 0 && hits[0].distance < closestWallDist) {
        closestWallDist = hits[0].distance;
        wallHitPoint = hits[0].point;
        wallNormal = hits[0].face?.normal || null;
      }
    }

    if (closestEnemyHit && closestEnemyHit.dist < closestWallDist) {
      // Enemy Hit!
      const enemy = closestEnemyHit.enemy;
      this.playerStats.shotsHit++;
      const multiplier = closestEnemyHit.isHeadshot ? 2.2 : 1.0;
      const dmg = Math.round(stats.damage * multiplier);

      enemy.health -= dmg;
      enemy.flashTimer = 0.15;
      const isKill = enemy.health <= 0;
      soundManager.playImpactEnemy(closestEnemyHit.isHeadshot, enemy.health > 0);
      soundManager.playHitmarker(closestEnemyHit.isHeadshot);

      if (closestEnemyHit.isHeadshot) {
        this.playerStats.headshots++;
      }

      // Hit feedback callback to UI with isKill
      this.onHitFeedback?.(closestEnemyHit.isHeadshot, dmg, isKill);

      // Hitstop on heavy hits
      if (stats.id === 'thor_rail' || closestEnemyHit.isHeadshot) {
        this.hitstopTimer = 0.04;
      }

      // Hit point
      const hitPos = this.camera.position.clone().addScaledVector(_vec3A, closestEnemyHit.dist);
      this.addFloatingText(hitPos, `${dmg}`, closestEnemyHit.isHeadshot ? '#ef4444' : '#fbbf24', closestEnemyHit.isHeadshot);
      this.spawnImpactSparks(hitPos, _vec3A.clone().negate());
      this.createTracer(this.camera.position, hitPos);

      // Check Enemy Death
      if (enemy.health <= 0) {
        this.killEnemy(enemy);
      }

      this.onStatsUpdate?.(this.playerStats);
    } else if (wallHitPoint) {
      // Wall Impact
      soundManager.playImpactWall('metal');
      this.spawnImpactSparks(wallHitPoint, wallNormal || _vec3A.clone().negate());
      this.createTracer(this.camera.position, wallHitPoint);
    } else {
      // Whiff into horizon
      const endPoint = this.camera.position.clone().addScaledVector(_vec3A, stats.range);
      this.createTracer(this.camera.position, endPoint);
    }
  }

  // Kill Enemy
  private killEnemy(enemy: ActiveEnemy) {
    this.playerStats.kills++;
    this.playerStats.score += enemy.config.scoreValue;
    this.playerStats.combo++;
    this.playerStats.comboTimer = 3.5;

    soundManager.playExplosion(enemy.type === 'titan' ? 0.6 : 1.1);

    // Death disintegration particles
    this.spawnDisintegrationParticles(enemy.group.position, enemy.type === 'titan' ? 45 : 20);

    // Spawn Loot Drop (40% chance)
    if (Math.random() < 0.45) {
      this.spawnLoot(enemy.group.position.clone());
    }

    // Remove from scene and list
    this.scene.remove(enemy.group);
    this.enemies = this.enemies.filter(e => e.id !== enemy.id);
    this.waveEnemiesRemaining--;

    // Check Wave completion
    if (this.waveEnemiesRemaining <= 0) {
      if (this.playerStats.wave >= this.playerStats.maxWave || this.currentMode === 'boss_titans') {
        this.setState('victory');
      } else {
        this.setupWave(this.playerStats.wave + 1);
      }
    }
  }

  // Spawn Loot Item
  private spawnLoot(pos: THREE.Vector3) {
    const types: ('health' | 'shield' | 'ammo')[] = ['health', 'shield', 'ammo'];
    const type = types[Math.floor(Math.random() * types.length)];

    const lootGroup = new THREE.Group();
    lootGroup.position.copy(pos);
    lootGroup.position.y = 0.5;

    let color = 0x22c55e;
    if (type === 'shield') color = 0x06b6d4;
    if (type === 'ammo') color = 0xf59e0b;

    const box = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
      })
    );
    lootGroup.add(box);

    const light = new THREE.PointLight(color, 1.5, 6);
    lootGroup.add(light);

    this.scene.add(lootGroup);
    this.loots.push({ mesh: lootGroup, type, position: lootGroup.position, spin: 0 });
  }

  // Create Tracer Line
  private createTracer(start: THREE.Vector3, end: THREE.Vector3) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.scene.add(line);
    this.tracers.push({ line, start: start.clone(), end: end.clone(), life: 0.08, maxLife: 0.08 });
  }

  // Spawn Impact Sparks
  private spawnImpactSparks(pos: THREE.Vector3, normal: THREE.Vector3) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      const vel = normal.clone().multiplyScalar(Math.random() * 5 + 3);
      vel.x += (Math.random() - 0.5) * 6;
      vel.y += (Math.random() - 0.5) * 6;
      vel.z += (Math.random() - 0.5) * 6;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.3,
        maxLife: 0.3,
        color: new THREE.Color(0x00f0ff),
        size: 0.04,
      });
    }
  }

  // Spawn Disintegration Particles on Enemy Death
  private spawnDisintegrationParticles(pos: THREE.Vector3, count = 25) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.y += Math.random() * 1.5;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 7 + 2,
        (Math.random() - 0.5) * 8
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.6,
        maxLife: 0.6,
        color: new THREE.Color(0xff0055),
        size: 0.12,
      });
    }
  }

  // Floating Damage Text
  private addFloatingText(worldPos: THREE.Vector3, text: string, color: string, isCrit = false) {
    const screenPos = worldPos.clone().project(this.camera);
    const x = ((screenPos.x + 1) * this.container.clientWidth) / 2;
    const y = ((-screenPos.y + 1) * this.container.clientHeight) / 2;

    const floating: FloatingText = {
      id: this.nextEntityId++,
      text,
      color,
      isCrit,
      x,
      y,
      opacity: 1,
      life: 0.8,
    };
    this.floatingTexts.push(floating);
    this.onFloatingTextAdd?.(floating);
  }

  // Start Reload Action
  public startReload() {
    const stats = WEAPON_REGISTRY[this.currentWeaponId];
    if (this.playerStats.isReloading || this.playerStats.ammo >= stats.magazineSize || this.playerStats.reserveAmmo <= 0) {
      return;
    }

    this.playerStats.isReloading = true;
    this.reloadProgress = 0;
    this.onStatsUpdate?.(this.playerStats);
    soundManager.playWeaponReload(this.currentWeaponId);
  }

  // Finish Reload
  private finishReload() {
    const stats = WEAPON_REGISTRY[this.currentWeaponId];
    const needed = stats.magazineSize - this.playerStats.ammo;
    const added = Math.min(needed, this.playerStats.reserveAmmo);
    this.playerStats.ammo += added;
    this.playerStats.reserveAmmo -= added;
    this.playerStats.isReloading = false;
    this.onStatsUpdate?.(this.playerStats);
  }

  // Player Damage from Enemy
  public damagePlayer(amount: number) {
    if (this.state !== 'playing') return;

    soundManager.playPlayerHurt();
    this.cameraShakeIntensity = Math.min(this.cameraShakeIntensity + 0.35, 0.5);

    // Shield absorbs first
    if (this.playerStats.shield > 0) {
      const shieldDmg = Math.min(this.playerStats.shield, amount);
      this.playerStats.shield -= shieldDmg;
      amount -= shieldDmg;
    }

    if (amount > 0) {
      this.playerStats.health = Math.max(0, this.playerStats.health - amount);
    }

    this.onStatsUpdate?.(this.playerStats);

    if (this.playerStats.health <= 0) {
      this.setState('game_over');
    }
  }

  // Main Loop with Software WebGL pacing
  private startLoop() {
    const tick = () => {
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  // Skill directive software WebGL pacing
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  // Update Game Logic
  private update(dt: number) {
    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.state === 'lobby') {
      this.updateLobby(dt);
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    }
  }

  // Update Lobby Scene
  private updateLobby(dt: number) {
    this.lobbyAnimTime += dt;

    if (this.lobbyWeaponTurntable) {
      if (this.isInspecting) {
        this.inspectTimer -= dt;
        if (this.inspectTimer <= 0) {
          this.isInspecting = false;
        }
        // Inspect showcase: progressive rotation and dynamic tilt
        const progress = 1 - Math.max(0, this.inspectTimer / 2.4);
        this.turntableRotY += dt * 2.5;
        this.turntableTiltX = Math.sin(progress * Math.PI * 2) * 0.35;
      } else if (!this.isTurntableDragging) {
        // Slow auto rotation and return tilt to 0
        this.turntableRotY += dt * 0.35;
        this.turntableTiltX = THREE.MathUtils.damp(this.turntableTiltX, 0, 4, dt);
      }

      this.lobbyWeaponTurntable.rotation.y = this.turntableRotY;
      this.lobbyWeaponTurntable.rotation.x = this.turntableTiltX;

      // Bobbing floating weapon
      if (this.lobbyWeaponMesh) {
        this.lobbyWeaponMesh.position.y = 0.1 + Math.sin(this.lobbyAnimTime * 2.2) * 0.035;
      }

      // Rotate counter-rotating holographic rings
      if (this.lobbyRingInner) {
        this.lobbyRingInner.rotation.z += dt * 1.0;
      }
      if (this.lobbyRingOuter) {
        this.lobbyRingOuter.rotation.z -= dt * 0.6;
      }
    }

    // Animate atmospheric energy motes
    if (this.lobbyMotesMesh) {
      const positions = this.lobbyMotesMesh.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += dt * 0.2;
        if (positions[i] > 5.5) positions[i] = 0.5;
      }
      this.lobbyMotesMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Cinematic orbit camera: gently orbits when idle, stays smooth when interacting
    if (!this.isTurntableDragging && !this.isInspecting) {
      this.lobbyCameraAngle += dt * 0.08;
    }
    const dist = 3.4;
    this.camera.position.set(
      Math.sin(this.lobbyCameraAngle) * dist,
      1.75,
      Math.cos(this.lobbyCameraAngle) * dist
    );
    this.camera.lookAt(0, 1.35, 0);
  }

  // Update In-Game Playing Mode
  private updatePlaying(dt: number) {
    const stats = WEAPON_REGISTRY[this.currentWeaponId];

    // 1. Spawning system
    if (this.waveEnemiesToSpawn > 0 && this.currentMode !== 'firing_range') {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        this.spawnEnemy();
        this.waveEnemiesToSpawn--;
        this.waveSpawnTimer = 1.2;
      }
    }

    // 2. Automatic Weapon Continuous Fire
    if (this.isMouseDown && stats.isAutomatic) {
      this.tryFireWeapon();
    }
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }

    // 3. Reload Progress
    if (this.playerStats.isReloading) {
      this.reloadProgress += dt / stats.reloadTime;
      if (this.reloadProgress >= 1.0) {
        this.finishReload();
      }
    }

    // 4. Combo Timer
    if (this.playerStats.combo > 0) {
      this.playerStats.comboTimer -= dt;
      if (this.playerStats.comboTimer <= 0) {
        this.playerStats.combo = 0;
        this.onStatsUpdate?.(this.playerStats);
      }
    }

    // 5. Player FPS Movement & Physics
    this.updatePlayerMovement(dt);

    // 6. Weapon Viewmodel Sway, Bobbing, Recoil, ADS
    this.updateWeaponViewmodel(dt);

    // 7. Laser Sight Beam projection
    this.updateLaserSight();

    // 8. Enemy AI Update
    this.updateEnemies(dt);

    // 9. Targets in Firing Range
    this.updateTargets(dt);

    // 10. Tracers, Particles, Loots
    this.updateEffects(dt);
  }

  // Update Player Movement & Collision
  private updatePlayerMovement(dt: number) {
    this.isSprinting = !!(
      this.keys['ShiftLeft'] ||
      this.keys['ShiftRight'] ||
      this.keys['shift'] ||
      this.isMobileRunning ||
      this.moveInput.length() > 0.82
    );
    this.isCrouching = !!(this.keys['KeyC'] || this.keys['ControlLeft'] || this.keys['c']);

    // 1. Arrow Keys Camera Turning (Mirar a los lados y arriba/abajo)
    const arrowTurnSpeed = 2.4 * dt;
    if (this.keys['ArrowLeft']) {
      this.cameraYaw += arrowTurnSpeed;
      this.weaponSway.x -= 0.008;
    }
    if (this.keys['ArrowRight']) {
      this.cameraYaw -= arrowTurnSpeed;
      this.weaponSway.x += 0.008;
    }
    if (this.keys['ArrowUp']) {
      this.cameraPitch = Math.min(Math.PI / 2.1, this.cameraPitch + arrowTurnSpeed * 0.7);
    }
    if (this.keys['ArrowDown']) {
      this.cameraPitch = Math.max(-Math.PI / 2.1, this.cameraPitch - arrowTurnSpeed * 0.7);
    }

    let moveSpeed = 7.5;
    if (this.isSprinting) moveSpeed = 12.0;
    if (this.isCrouching) moveSpeed = 4.2;
    if (this.isADS) moveSpeed *= 0.65;

    // 2. Movement inputs (Analog Virtual Joystick + WASD Keyboard)
    _vec3A.set(0, 0, 0);

    // Mobile analog joystick (Android)
    if (this.moveInput.lengthSq() > 0.02) {
      _vec3A.x = this.moveInput.x;
      _vec3A.z = -this.moveInput.y;
    }

    // Keyboard WASD
    const isForward = !!(this.keys['KeyW'] || this.keys['w'] || this.keys['W']);
    const isBackward = !!(this.keys['KeyS'] || this.keys['s'] || this.keys['S']);
    const isLeft = !!(this.keys['KeyA'] || this.keys['a'] || this.keys['A']);
    const isRight = !!(this.keys['KeyD'] || this.keys['d'] || this.keys['D']);

    if (isForward) _vec3A.z -= 1;
    if (isBackward) _vec3A.z += 1;
    if (isLeft) _vec3A.x -= 1;
    if (isRight) _vec3A.x += 1;

    const isMoving = _vec3A.lengthSq() > 0;
    if (isMoving) {
      _vec3A.normalize();
      // Rotate by player yaw
      _vec3A.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      this.playerVel.x = _vec3A.x * moveSpeed;
      this.playerVel.z = _vec3A.z * moveSpeed;

      // Footsteps
      if (this.isGrounded) {
        this.weaponBobTime += dt * (this.isSprinting ? 14 : 9);
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
          const stepInterval = this.isSprinting ? 0.30 : this.isCrouching ? 0.58 : 0.44;
          this.footstepTimer = stepInterval;
          soundManager.playFootstep('metal', this.isSprinting, this.isCrouching);
        }
      }
    } else {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, 14, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, 14, dt);
    }

    // Jump
    if (this.keys['Space'] && this.isGrounded) {
      this.playerVel.y = 7.5;
      this.isGrounded = false;
      soundManager.playJump();
    }

    // Gravity
    this.playerVel.y -= 22 * dt;

    // Apply Velocity to Player Position with Collision
    const newPos = this.playerPos.clone().addScaledVector(this.playerVel, dt);

    // Floor collision
    const targetEyeH = this.isCrouching ? 1.0 : 1.7;
    if (newPos.y <= targetEyeH) {
      newPos.y = targetEyeH;
      if (!this.wasGrounded && this.playerVel.y < -3.0) {
        soundManager.playLanding(Math.abs(this.playerVel.y));
      }
      this.playerVel.y = 0;
      this.isGrounded = true;
    }
    this.wasGrounded = this.isGrounded;

    // Wall & Obstacle Box Collision
    const playerRadius = 0.5;
    for (const collider of this.colliders) {
      const box = collider.box;
      if (
        newPos.x + playerRadius > box.min.x &&
        newPos.x - playerRadius < box.max.x &&
        newPos.z + playerRadius > box.min.z &&
        newPos.z - playerRadius < box.max.z &&
        newPos.y < box.max.y + targetEyeH &&
        newPos.y > box.min.y
      ) {
        // Simple slide collision: reject movement into obstacle
        newPos.x = this.playerPos.x;
        newPos.z = this.playerPos.z;
        break;
      }
    }

    this.playerPos.copy(newPos);

    // Camera Orientation
    this.camera.position.copy(this.playerPos);

    // Camera Shake Decay
    if (this.cameraShakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.cameraShakeIntensity = THREE.MathUtils.damp(this.cameraShakeIntensity, 0, 12, dt);
    }

    const quatYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const quatPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraPitch);
    this.camera.quaternion.copy(quatYaw).multiply(quatPitch);
  }

  // Update Viewmodel Animations
  private updateWeaponViewmodel(dt: number) {
    if (!this.weaponMesh) return;

    // Smooth ADS FOV zoom & positioning
    let targetFov = this.settings.fov;
    if (this.isADS) {
      if (this.currentWeaponId === 'thor_rail') targetFov = 22; // High sniper magnification
      else if (this.currentWeaponId === 'viper_9') targetFov = 42; // Holographic rifle optic zoom
      else if (this.currentWeaponId === 'pulsar_7') targetFov = 50; // Tactical pistol focus
      else if (this.currentWeaponId === 'scatter_x') targetFov = 52; // Reflex shotgun focus
    }
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
    this.camera.updateProjectionMatrix();

    // Weapon resting position (standard vs centered sight alignment in ADS)
    let restPos = new THREE.Vector3(0.22, -0.22, -0.45);
    if (this.isADS) {
      if (this.currentWeaponId === 'thor_rail') {
        // Lower sniper rifle body so the optical scope overlay in HUD is 100% unobstructed
        restPos = new THREE.Vector3(0.0, -0.38, -0.32);
      } else if (this.currentWeaponId === 'viper_9') {
        // Holo sight lens is at y = +0.13, so setting weapon at y = -0.13 aligns sight dead center!
        restPos = new THREE.Vector3(0.0, -0.13, -0.27);
      } else if (this.currentWeaponId === 'pulsar_7') {
        // Reflex sight lens is at y = +0.12, so setting weapon at y = -0.12 aligns sight dead center!
        restPos = new THREE.Vector3(0.0, -0.12, -0.24);
      } else if (this.currentWeaponId === 'scatter_x') {
        // Quad barrel top aligns dead center
        restPos = new THREE.Vector3(0.0, -0.10, -0.28);
      }
    }

    // In ADS, dramatically dampen bobbing and sway so sight reticle stays dead on target!
    const adsDampen = this.isADS ? 0.08 : 1.0;
    const bobX = Math.cos(this.weaponBobTime * 0.5) * (this.isSprinting ? 0.03 : 0.015) * adsDampen;
    const bobY = Math.abs(Math.sin(this.weaponBobTime)) * (this.isSprinting ? 0.025 : 0.012) * adsDampen;
    const swayX = this.weaponSway.x * adsDampen;
    const swayY = this.weaponSway.y * adsDampen;

    // Recoil recovery
    this.recoilOffset.z = THREE.MathUtils.damp(this.recoilOffset.z, 0, 12, dt);
    this.recoilOffset.y = THREE.MathUtils.damp(this.recoilOffset.y, 0, 12, dt);
    this.recoilRot.x = THREE.MathUtils.damp(this.recoilRot.x, 0, 14, dt);

    // Sway recovery
    this.weaponSway.x = THREE.MathUtils.damp(this.weaponSway.x, 0, 10, dt);
    this.weaponSway.y = THREE.MathUtils.damp(this.weaponSway.y, 0, 10, dt);

    // Reload animation dip & roll
    let reloadDipY = 0;
    let reloadRollZ = 0;
    if (this.playerStats.isReloading) {
      reloadDipY = Math.sin(this.reloadProgress * Math.PI) * -0.15;
      reloadRollZ = Math.sin(this.reloadProgress * Math.PI) * 0.35;
    }

    // Apply combined viewmodel transform
    this.weaponMesh.position.x = THREE.MathUtils.damp(
      this.weaponMesh.position.x,
      restPos.x + bobX - swayX,
      14,
      dt
    );
    this.weaponMesh.position.y = THREE.MathUtils.damp(
      this.weaponMesh.position.y,
      restPos.y + bobY + this.recoilOffset.y + reloadDipY - swayY,
      14,
      dt
    );
    this.weaponMesh.position.z = THREE.MathUtils.damp(
      this.weaponMesh.position.z,
      restPos.z + this.recoilOffset.z,
      14,
      dt
    );

    this.weaponMesh.rotation.x = this.recoilRot.x + swayY * 1.5;
    this.weaponMesh.rotation.y = -swayX * 2.0;
    this.weaponMesh.rotation.z = reloadRollZ;
  }

  // Update Laser Sight Ray
  private updateLaserSight() {
    if (!this.hasLaser || !this.laserBeamMesh || !this.laserDotMesh || this.state !== 'playing') {
      return;
    }

    // Cast ray forward from weapon
    _vec3A.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    _ray.set(this.camera.position, _vec3A);
    _ray.far = 60;

    let hitDist = 60;
    for (const col of this.colliders) {
      const hits = _ray.intersectObject(col.mesh, true);
      if (hits.length > 0 && hits[0].distance < hitDist) {
        hitDist = hits[0].distance;
      }
    }
    for (const enemy of this.enemies) {
      const hits = _ray.intersectObjects(enemy.group.children, true);
      if (hits.length > 0 && hits[0].distance < hitDist) {
        hitDist = hits[0].distance;
      }
    }

    const dotPos = this.camera.position.clone().addScaledVector(_vec3A, hitDist - 0.05);
    this.laserDotMesh.position.copy(dotPos);
    this.laserDotMesh.visible = hitDist < 58;
  }

  // Update Enemies AI
  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      enemy.animTime += dt * 4;

      // Hit flash decay
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
        enemy.materials.forEach(m => (m.color.setHex(0xffffff)));
      } else {
        enemy.materials.forEach(m => {
          if (m.name === 'darkArmor') m.color.setHex(0x1f2937);
        });
      }

      // Distance to player
      const toPlayer = this.playerPos.clone().sub(enemy.group.position);
      const dist = toPlayer.length();

      // Look at player
      enemy.group.lookAt(this.playerPos.x, enemy.group.position.y, this.playerPos.z);

      // Walk / Chase player if out of attack range
      if (dist > enemy.config.attackRange * 0.4) {
        toPlayer.y = 0;
        toPlayer.normalize();
        enemy.group.position.addScaledVector(toPlayer, enemy.config.speed * dt);

        // Animate legs or hover
        if (enemy.legs) {
          enemy.legs.forEach((leg, i) => {
            leg.rotation.x = Math.sin(enemy.animTime + i * Math.PI) * 0.45;
          });
        }
      }

      // Drone hover sine-wave
      if (enemy.type === 'drone') {
        enemy.group.position.y = 1.3 + Math.sin(enemy.animTime * 0.5) * 0.25;
      }

      // Attack Cycle & Telegraph
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0.6 && !enemy.isTelegraphing) {
        // Begin telegraph windup: glowing eye/core brightens!
        enemy.isTelegraphing = true;
        if (enemy.eyeMesh) {
          (enemy.eyeMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.5;
        }
      }

      if (enemy.attackTimer <= 0) {
        // Execute Attack!
        enemy.attackTimer = enemy.config.attackInterval;
        enemy.isTelegraphing = false;
        if (enemy.eyeMesh) {
          (enemy.eyeMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
        }

        // Check if player is within range to receive hit
        if (dist <= enemy.config.attackRange) {
          this.damagePlayer(enemy.config.damage);
        }
      }
    }
  }

  // Update Targets in Firing Range
  private updateTargets(dt: number) {
    for (const target of this.targets) {
      if (target.isHit) {
        target.hitTimer -= dt;
        // Flip back animation
        target.mesh.rotation.x = Math.PI / 2 * (target.hitTimer / 0.35);
        if (target.hitTimer <= 0) {
          target.isHit = false;
          target.mesh.rotation.x = 0;
        }
      }
    }
  }

  // Update Effects: Tracers, Particles, Loots, Floating Text
  private updateEffects(dt: number) {
    // Tracers
    this.tracers.forEach(t => {
      t.life -= dt;
      (t.line.material as THREE.LineBasicMaterial).opacity = t.life / t.maxLife;
      if (t.life <= 0) this.scene.remove(t.line);
    });
    this.tracers = this.tracers.filter(t => t.life > 0);

    // Particles
    this.particles.forEach(p => {
      p.life -= dt;
      p.velocity.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const scale = p.size * (p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);
      if (p.life <= 0) this.scene.remove(p.mesh);
    });
    this.particles = this.particles.filter(p => p.life > 0);

    // Loots pickup check
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const loot = this.loots[i];
      loot.spin += dt * 2.5;
      loot.mesh.rotation.y = loot.spin;
      loot.mesh.position.y = 0.5 + Math.sin(loot.spin * 2) * 0.12;

      // Player proximity pickup
      if (this.playerPos.distanceTo(loot.position) < 1.6) {
        soundManager.playPickup();
        if (loot.type === 'health') {
          this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 35);
          this.addFloatingText(this.playerPos, '+35 SALUD', '#22c55e', true);
        } else if (loot.type === 'shield') {
          this.playerStats.shield = Math.min(this.playerStats.maxShield, this.playerStats.shield + 25);
          this.addFloatingText(this.playerPos, '+25 ESCUDO', '#06b6d4', true);
        } else {
          this.playerStats.reserveAmmo += 60;
          this.addFloatingText(this.playerPos, '+60 MUNICIÓN', '#f59e0b', true);
        }
        this.onStatsUpdate?.(this.playerStats);
        this.scene.remove(loot.mesh);
        this.loots.splice(i, 1);
      }
    }

    // Floating Texts
    this.floatingTexts.forEach(f => {
      f.life -= dt;
      f.y -= dt * 45; // float upward
      f.opacity = f.life / 0.8;
    });
    this.floatingTexts = this.floatingTexts.filter(f => f.life > 0);
  }

  // Handle Resize
  public handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Dispose
  public dispose() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unlockPointer();
    this.renderer.dispose();
  }
}
