import { GunId, KnifeId, MountType } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private musicVolume = 0.45;
  private sfxVolume = 0.75;
  private muted = false;
  private musicTimer: number | null = null;
  private step = 0;
  private isPlayingMusic = false;
  private musicIntensity: 'menu' | 'battle' = 'menu';

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public configure(musicVolume: number, sfxVolume: number, muted: boolean): void {
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.musicVolume * 0.24, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfxVolume * 0.45, now, 0.02);
  }

  public updateEngineSound(active: boolean, speedRatio = 0, kind: MountType = 'car'): void {
    if (!active || this.muted) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (!this.engineOsc || !this.engineGain) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      g.gain.value = 0;
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      osc.start();
      this.engineOsc = osc;
      this.engineGain = g;
    }
    const isMarine =
      kind === 'shark_mount' ||
      kind === 'whale_mount' ||
      kind === 'sailfish_mount' ||
      kind === 'turtle_mount' ||
      kind === 'manta_mount';
    const isFlyingBird =
      kind === 'golden_eagle' || kind === 'pterodactyl' || kind === 'sky_griffin';
    const isLandAnimal =
      kind === 'horse' || kind === 'gorilla' || kind === 'rhino' || kind === 'cheetah';
    if (isLandAnimal) {
      this.engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
      return;
    }
    const isBoat =
      kind === 'speedboat' ||
      kind === 'jetski' ||
      kind === 'fishing_boat' ||
      kind === 'pirate_boat' ||
      kind === 'battleship';
    const isHeli = kind === 'helicopter' || kind === 'police_heli';
    const isTank = kind === 'tank' || kind === 'swat_tank';
    const baseHz =
      kind === 'jetski'
        ? 105
        : kind === 'fishing_boat'
          ? 64
          : kind === 'speedboat'
            ? 76
            : kind === 'pirate_boat'
              ? 46
              : kind === 'battleship'
                ? 34
                : isFlyingBird
                  ? 125
                  : isHeli
                    ? 58
                    : isTank
                      ? 38
                      : isMarine
                        ? 48
                        : kind === 'bike'
                          ? 92
                          : kind === 'buggy' || kind === 'truck'
                            ? 54
                            : 68;
    const pitchSpan =
      kind === 'jetski'
        ? 155
        : kind === 'fishing_boat'
          ? 78
          : kind === 'speedboat'
            ? 105
            : kind === 'pirate_boat'
              ? 52
              : kind === 'battleship'
                ? 36
                : isFlyingBird
                  ? 95
                  : isMarine
                    ? 42
                    : kind === 'bike'
                      ? 145
                      : 95;
    const targetHz = baseHz + Math.min(1.2, Math.abs(speedRatio)) * pitchSpan;
    const targetVol = isFlyingBird
      ? 0.012 + Math.min(1, Math.abs(speedRatio)) * 0.025
      : isMarine
        ? 0.018 + Math.min(1, Math.abs(speedRatio)) * 0.032
        : (isBoat ? 0.048 : 0.055) + Math.min(1, Math.abs(speedRatio)) * 0.072;
    this.engineOsc.frequency.setTargetAtTime(targetHz, ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.06);
  }

  public playWingFlap(boost = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(boost ? 0.19 : 0.14, boost ? 0.22 : 0.15, boost ? 260 : 340, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(boost ? 135 : 105, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    g.gain.setValueAtTime(boost ? 0.16 : 0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playHoofbeat(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [0, 0.07].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 150 : 190, now + offset);
      osc.frequency.exponentialRampToValueAtTime(60, now + offset + 0.045);
      g.gain.setValueAtTime(0.16, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  public playSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.playNoiseBurst(0.18, 0.24, 500, this.sfxGain);
  }

  public playMount(isAnimal = false, isBird = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    if (isBird) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.28);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.32);
      this.playWingFlap(true);
    } else if (isAnimal) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.linearRampToValueAtTime(520, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.22);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.16);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.19);
    }
  }

  public startMusic(mode: 'menu' | 'battle'): void {
    this.musicIntensity = mode;
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    const tempoMs = 155;
    const menuScale = [261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 349.23];
    const battleBass = [130.81, 130.81, 155.56, 174.61, 130.81, 196.0, 174.61, 155.56];
    const battleLead = [523.25, 0, 622.25, 587.33, 523.25, 783.99, 698.46, 622.25];

    this.musicTimer = window.setInterval(() => {
      if (this.muted || this.musicVolume <= 0.01) return;
      if (!this.ctx || this.ctx.state !== 'running') return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const idx = this.step % 8;

      if (this.musicIntensity === 'menu') {
        const freq = menuScale[idx];
        this.playSynthNote(freq, 'triangle', 0.14, 0.16, this.musicGain!);
        if (idx % 2 === 0) {
          this.playSynthNote(freq * 0.5, 'sine', 0.22, 0.12, this.musicGain!);
        }
      } else {
        const bass = battleBass[idx];
        this.playSynthNote(bass, 'sawtooth', 0.11, 0.18, this.musicGain!, 700);
        const lead = battleLead[idx];
        if (lead > 0 && this.step % 16 >= 4) {
          this.playSynthNote(lead, 'square', 0.08, 0.09, this.musicGain!, 1800);
        }
        if (idx % 2 === 1 && this.musicGain) {
          this.playNoiseBurst(0.03, 0.05, 5000, this.musicGain);
        }
        if (idx % 4 === 0 && this.musicGain) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
          g.gain.setValueAtTime(0.28, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.11);
        }
      }

      this.step += 1;
    }, tempoMs);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.isPlayingMusic = false;
  }

  private playSynthNote(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    dest: AudioNode,
    cutoff = 2400
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private playNoiseBurst(dur: number, vol: number, highpass: number, dest: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(now);
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.045);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playPurchase(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      g.gain.setValueAtTime(0.28, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  public playError(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(135, now + 0.18);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playGunshot(gunId: GunId): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;

    if (gunId === 'laser_blaster') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1280, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.17);
      return;
    }

    if (gunId === 'sniper') {
      this.playNoiseBurst(0.22, 0.45, 420, this.sfxGain);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.28);
      g.gain.setValueAtTime(0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.32);
      return;
    }

    if (gunId === 'combat_shotgun') {
      this.playNoiseBurst(0.24, 0.5, 280, this.sfxGain);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
      g.gain.setValueAtTime(0.38, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.23);
      return;
    }

    if (gunId === 'mini_smg') {
      this.playNoiseBurst(0.055, 0.22, 1600, this.sfxGain);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.055);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (gunId === 'assault_rifle') {
      this.playNoiseBurst(0.09, 0.28, 950, this.sfxGain);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
      g.gain.setValueAtTime(0.24, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    this.playNoiseBurst(0.08, 0.24, 1200, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playKnifeSlash(knifeId: KnifeId): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;

    if (knifeId === 'pixel_blade') {
      [780, 1040, 1380].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + i * 0.025);
        g.gain.setValueAtTime(0.16, now + i * 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.025 + 0.05);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + i * 0.025);
        osc.stop(now + i * 0.025 + 0.06);
      });
      return;
    }

    const hp = knifeId === 'dragon_blade' ? 650 : knifeId === 'shadow_karambit' ? 1800 : 1200;
    this.playNoiseBurst(0.13, 0.28, hp, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = knifeId === 'dragon_blade' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(knifeId === 'butterfly_blade' ? 880 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.13);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playJump(doubleJump = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    const startFreq = doubleJump ? 340 : 220;
    const endFreq = doubleJump ? 760 : 540;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playBouncePad(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.25);
    g.gain.setValueAtTime(0.38, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playDash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.playNoiseBurst(0.16, 0.3, 1400, this.sfxGain);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playHit(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(heavy ? 180 : 250, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + (heavy ? 0.2 : 0.12));
    g.gain.setValueAtTime(heavy ? 0.38 : 0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.22 : 0.14));
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
    this.playNoiseBurst(0.08, 0.22, 600, this.sfxGain);
  }

  public playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      g.gain.setValueAtTime(0.26, now + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.14);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.15);
    });
  }

  public playPowerup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      g.gain.setValueAtTime(0.25, now + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.16);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.18);
    });
  }

  public playKO(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.38);
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.11;
      const dur = i === notes.length - 1 ? 0.5 : 0.16;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }

  public playDefeat(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.15;
      const dur = i === notes.length - 1 ? 0.45 : 0.18;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }

  public playHitMarker(crit = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(crit ? 1850 : 1420, now);
    osc.frequency.exponentialRampToValueAtTime(crit ? 920 : 680, now + 0.055);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [320, 480, 740].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      const t = now + i * 0.16;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.05);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.075);
    });
  }

  public playWeaponSwitch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(690, now + 0.05);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playDoorToggle(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.11);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playGrenadeBounce(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playExplosion(kind: 'explosive' | 'flash' | 'cluster' | 'vehicle' = 'explosive'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    if (kind === 'flash') {
      this.playNoiseBurst(0.28, 0.45, 2200, this.sfxGain);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.35);
      g.gain.setValueAtTime(0.26, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.38);
      return;
    }

    const dur = kind === 'vehicle' ? 0.68 : kind === 'cluster' ? 0.55 : 0.42;
    this.playNoiseBurst(dur, kind === 'vehicle' ? 0.72 : 0.6, 140, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(kind === 'vehicle' ? 115 : kind === 'cluster' ? 165 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + dur);
    g.gain.setValueAtTime(kind === 'vehicle' ? 0.58 : 0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.04);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.06);
  }

  public playRicochet(metallic = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.05, 0.14, metallic ? 2400 : 1200, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = metallic ? 'triangle' : 'sine';
    const startHz = metallic ? 1650 + Math.random() * 650 : 720 + Math.random() * 260;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(startHz * 0.45, now + 0.08);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playAllyBlock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.07);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playParachuteOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.24, 0.36, 420, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playWindRush(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.playNoiseBurst(0.16, 0.12, 950, this.sfxGain);
  }

  public playAirdropChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playReviveComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [440, 587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.26, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playFireworkBurst(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.26, 0.26, 1200, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playConchPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [659.25, 880, 1174.66, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playBenchSit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [392.0, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playDolphinSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.22, 0.16, 480, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(1520, now + 0.09);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playSeagullCry(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1650 + Math.random() * 140, now + offset);
      osc.frequency.exponentialRampToValueAtTime(1120, now + offset + 0.16);
      g.gain.setValueAtTime(0.06, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  public playBubbleDive(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [320, 460, 640].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, t + 0.07);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  public playCampfireTick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.playNoiseBurst(0.06, 0.08, 1800, this.sfxGain);
  }

  public playAnimalRoar(aggressive = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(aggressive ? 155 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(aggressive ? 62 : 125, now + 0.28);
    g.gain.setValueAtTime(aggressive ? 0.22 : 0.13, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playVillagerAlert(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [290, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  public playLavaSizzle(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.playNoiseBurst(0.18, 0.26, 2200, this.sfxGain);
  }

  public playPearlPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [783.99, 1046.5, 1318.51, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playSnakeHiss(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    this.playNoiseBurst(0.26, 0.24, 3400, this.sfxGain);
  }

  public playTribalDrums(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const beats = [0, 0.16, 0.34, 0.5, 0.68];
    beats.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const base = idx % 2 === 0 ? 115 : 88;
      osc.frequency.setValueAtTime(base, now + offset);
      osc.frequency.exponentialRampToValueAtTime(42, now + offset + 0.13);
      g.gain.setValueAtTime(0.32, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  public playBowOrSpear(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.09, 0.22, 1600, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(145, now + 0.08);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playFruitCrunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.08, 0.25, 1900, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);
    g.gain.setValueAtTime(0.2, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now + 0.04);
    osc.stop(now + 0.2);
  }

  public playWaspSwarm(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(310, now + 0.15);
    osc.frequency.linearRampToValueAtTime(220, now + 0.35);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  public playRopeSnap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.1, 0.38, 2200, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    g.gain.setValueAtTime(0.26, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playTankCannon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.28, 0.45, 780, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.35);
    g.gain.setValueAtTime(0.38, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playMissileLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.32, 0.35, 2100, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.34);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playPoliceSirenBurst(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.linearRampToValueAtTime(920, now + 0.22);
    osc.frequency.linearRampToValueAtTime(640, now + 0.44);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playJailLock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.12, 0.3, 1800, this.sfxGain);
    [320, 180].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      const t = now + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public playBailPaid(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playConstructionHammer(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(0.06, 0.22, 3200, this.sfxGain);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playPoliceFineSfx(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    // Crisp handcuff latch + cash-register coin deduction chime
    this.playNoiseBurst(0.08, 0.25, 2800, this.sfxGain);
    [520, 390, 260].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  public playJailBuzzer(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    // Electric cell door buzzer + heavy bolt slide
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.setValueAtTime(175, now + 0.12);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
    this.playNoiseBurst(0.14, 0.22, 1600, this.sfxGain);
  }

  public playEmoteChime(accent = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const base = 440 + (accent % 5) * 65;
    [base, base * 1.25, base * 1.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }
}

export const soundEngine = new SoundEngine();
