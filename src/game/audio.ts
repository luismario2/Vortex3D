import { WeaponId } from './weaponModels';

// Procedural Web Audio Sound Synthesizer
// Completely zero-dependency, zero 404s, hardware-light and responsive.

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  public sfxVolume = 0.8;
  public musicVolume = 0.35;
  public masterVolume = 1.0;
  public muted = false;
  private ambientOscs: OscillatorNode[] = [];
  private ambientGains: GainNode[] = [];
  public isAmbiencePlaying = false;
  private footstepCounter = 0;
  private activeReloadTimeouts: number[] = [];

  public initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, sfx: number, music: number, muted: boolean) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.muted = muted;

    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx?.currentTime || 0);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx?.currentTime || 0);
    }
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx?.currentTime || 0);
    }
  }

  // Create White/Pink Noise Buffer
  private createNoiseBuffer(duration = 0.2): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Plasma Rifle Shot (Punchy energy crack + laser ping)
  public playPlasmaRifle() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Laser Oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // Punch Noise
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.08);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // 2. Railgun Shot (Sub-bass charge blast + high-voltage crack)
  public playRailgun() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // High Voltage crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // Sub rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Burst Noise
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.2);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(3000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.2);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
    sub.start(now);
    sub.stop(now + 0.45);
  }

  // 3. Scatter Shotgun (Heavy spread burst + low thud)
  public playShotgun() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.25);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
    }

    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(160, now);
    thud.frequency.exponentialRampToValueAtTime(45, now + 0.22);
    thudGain.gain.setValueAtTime(0.6, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.23);
  }

  // 4. Laser Pistol (Snappy high-tech blaster)
  public playLaserPistol() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.09);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Cancel any ongoing reload timeouts
  public cancelReloadSounds() {
    this.activeReloadTimeouts.forEach(t => clearTimeout(t));
    this.activeReloadTimeouts = [];
  }

  // Tactical ADS (Aim Down Sights) Sound
  public playAimDownSights(isAiming: boolean) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Fast optic servo click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    if (isAiming) {
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
    } else {
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.05);
    }

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);

    // Subtle cloth / holster rustle noise
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.06);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.08, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now);
    }
  }

  // Weapon Equip / Inspection Mechanical Sound
  public playWeaponEquip() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Metallic slider / bolt pull
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);

    // Mechanical snap click
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1400, now + 0.12);
    click.frequency.exponentialRampToValueAtTime(400, now + 0.18);
    clickGain.gain.setValueAtTime(0.18, now + 0.12);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    click.connect(clickGain);
    clickGain.connect(this.sfxGain);
    click.start(now + 0.12);
    click.stop(now + 0.19);
  }

  // Weapon Reload System with multi-stage weapon-tailored audio
  public playWeaponReload(weaponId: WeaponId = 'viper_9') {
    this.cancelReloadSounds();
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const playClick = (freq: number, endFreq: number, type: OscillatorType, dur: number, vol = 0.3) => {
      if (!this.ctx || !this.sfxGain || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    };

    const schedule = (fn: () => void, delayMs: number) => {
      const id = window.setTimeout(fn, delayMs);
      this.activeReloadTimeouts.push(id);
    };

    if (weaponId === 'thor_rail') {
      // 1. Thor-Rail Sniper: Pneumatic release + battery lock + high-voltage capacitor spool
      playClick(320, 110, 'sawtooth', 0.12, 0.35); // Ejection
      schedule(() => playClick(480, 260, 'square', 0.14, 0.4), 700); // Battery lock
      schedule(() => {
        if (!this.ctx || !this.sfxGain || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.36);
      }, 1500); // Capacitor prime
    } else if (weaponId === 'scatter_x') {
      // 2. Scatter-X Shotgun: Port open + shell inserts + heavy pump rack
      playClick(520, 200, 'triangle', 0.08, 0.35);
      schedule(() => playClick(680, 320, 'square', 0.07, 0.3), 450);
      schedule(() => playClick(720, 340, 'square', 0.07, 0.32), 950);
      schedule(() => {
        playClick(400, 180, 'sawtooth', 0.12, 0.45); // Pump back
        setTimeout(() => playClick(750, 300, 'triangle', 0.1, 0.45), 180); // Pump forward
      }, 1450);
    } else if (weaponId === 'pulsar_7') {
      // 3. Pulsar-7 Pistol: Rapid mag drop + firm snap in + slide rack
      playClick(600, 220, 'triangle', 0.06, 0.28);
      schedule(() => playClick(780, 350, 'square', 0.08, 0.35), 420);
      schedule(() => playClick(1100, 420, 'sawtooth', 0.09, 0.35), 820);
    } else {
      // 4. Viper-9 Rifle: Mag release + magazine insert slap + bolt rack
      playClick(440, 160, 'triangle', 0.08, 0.32);
      schedule(() => playClick(650, 280, 'square', 0.09, 0.38), 550);
      schedule(() => playClick(920, 260, 'sawtooth', 0.12, 0.42), 1150);
    }
  }

  // Fallback for generic calls
  public playReload() {
    this.playWeaponReload('viper_9');
  }

  // Hitmarker Tick (Satisfying crisp indicator)
  public playHitmarker(isHeadshot = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const freq = isHeadshot ? 2400 : 1600;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.setValueAtTime(freq * 1.25, now + 0.02);

    gain.gain.setValueAtTime(isHeadshot ? 0.45 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Enemy Destruction Explosion
  public playExplosion(pitch = 1.0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.45);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 * pitch, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
    }

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(120 * pitch, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.4);
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.42);
  }

  // Player Hurt Grunt / Impact
  public playPlayerHurt() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Dynamic Procedural Footstep with Surface Grit & Left/Right Foot Alternation
  public playFootstep(surface: 'metal' | 'concrete' | 'grate' = 'metal', isSprint = false, isCrouch = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Alternate left vs right foot
    this.footstepCounter++;
    const isRightFoot = this.footstepCounter % 2 === 0;
    const baseFreq = isRightFoot ? 104 : 88;
    const vol = isSprint ? 0.22 : isCrouch ? 0.07 : 0.15;

    // 1. Heel-strike low-end body thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq + (Math.random() - 0.5) * 8, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.055);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);

    // 2. Sole friction / surface grit noise (metal grating vs concrete)
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.045);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const centerFreq = surface === 'concrete' ? 700 : 1600;
      filter.frequency.setValueAtTime(centerFreq, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.7, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now);
    }
  }

  // Jump Landing Sound (Heavy dual-foot impact on floor)
  public playLanding(speed = 6) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.45, Math.max(0.15, speed * 0.04));

    // Thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Scuff noise
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.08);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.8, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now);
    }
  }

  // Surface Impact Sounds (Bullet striking walls, concrete, metal)
  public playImpactWall(surface: 'wall' | 'metal' | 'concrete' = 'metal') {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Hard transient pop
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.createNoiseBuffer(0.06);
    if (noiseBuffer) {
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(surface === 'metal' ? 2400 : 850, now);
      filter.Q.setValueAtTime(2.5, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.35, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now);
    }

    // Metallic chime or punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = surface === 'metal' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(surface === 'metal' ? 1200 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(surface === 'metal' ? 300 : 45, now + 0.07);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);

    // 25% chance of realistic ricochet whistle
    if (Math.random() < 0.28) {
      this.playRicochet();
    }
  }

  // Authentic Ricochet Whistle
  public playRicochet() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime + 0.02;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startF = 2200 + Math.random() * 800;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(500 + Math.random() * 200, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Enemy Body / Armor Impact
  public playImpactEnemy(isCrit = false, isAlive = true) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isCrit ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(isCrit ? 600 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(isCrit ? 120 : 60, now + 0.09);

    gain.gain.setValueAtTime(isCrit ? 0.38 : 0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Holographic Target Ding
  public playTargetDing() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // A6 bell
    osc.frequency.exponentialRampToValueAtTime(1740, now + 0.25);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Jump Sound
  public playJump() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Pickup Item Sound
  public playPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.1);
    });
  }

  // UI Click / Navigation Beep
  public playUIClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Spin Roulette Wheel Tick
  public playSpinTick(pitch = 1.0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Celebratory Jackpot / Reward Fanfare
  public playJackpotFanfare() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;

    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startT = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.24, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.46);
    });
  }

  // Ambient Cyber Drone (Subtle sci-fi synth pad for atmosphere)
  public startAmbientMusic() {
    if (this.isAmbiencePlaying) return;
    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    this.isAmbiencePlaying = true;
    const freqs = [65.41, 98.0, 130.81, 196.0]; // C2, G2, C3, G3 warm drone

    freqs.forEach((f, i) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);

      // Low pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250 + i * 40, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start();

      this.ambientOscs.push(osc);
      this.ambientGains.push(gain);
    });
  }

  public stopAmbientMusic() {
    this.ambientOscs.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    this.ambientOscs = [];
    this.ambientGains = [];
    this.isAmbiencePlaying = false;
  }
}

export const soundManager = new SoundManager();
