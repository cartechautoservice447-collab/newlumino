// Synthesized Web Audio API Ambient Soundscape Engine
// Zero network dependencies, instant start, smooth loops, zero lag.

export type SoundscapeType = "none" | "rain" | "coffee" | "vinyl" | "whitenoise";

export interface SoundscapeOption {
  id: SoundscapeType;
  name: string;
  icon: string;
  description: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeOption[] = [
  { id: "none", name: "Mute", icon: "🔇", description: "Silent focus with completion bell" },
  { id: "rain", name: "Soft Rain", icon: "🌧️", description: "Gentle rain & ambient droplets" },
  { id: "coffee", name: "Coffeehouse", icon: "☕", description: "Warm cafe acoustic atmosphere" },
  { id: "vinyl", name: "Lo-Fi Vinyl", icon: "📻", description: "Warm record crackle & hum" },
  { id: "whitenoise", name: "Brown Noise", icon: "💨", description: "Deep waterfall cognitive block" },
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private currentType: SoundscapeType = "none";
  private isPlaying = false;
  private volume = 0.5;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop?: () => void; disconnect: () => void }[] = [];

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public play(type: SoundscapeType, volume?: number) {
    if (volume !== undefined) this.volume = volume;
    this.stop();
    this.currentType = type;
    if (type === "none") return;

    try {
      const ctx = this.getAudioContext();
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      if (type === "rain") {
        this.startRain(ctx, this.masterGain);
      } else if (type === "coffee") {
        this.startCoffeehouse(ctx, this.masterGain);
      } else if (type === "vinyl") {
        this.startVinyl(ctx, this.masterGain);
      } else if (type === "whitenoise") {
        this.startBrownNoise(ctx, this.masterGain);
      }
      this.isPlaying = true;
    } catch {
      // AudioContext unavailable or autoplay restricted
    }
  }

  public stop() {
    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeNodes = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
    this.isPlaying = false;
  }

  // --- Rain Generator: Pink Noise filtered with dual low-pass + sporadic drops ---
  private startRain(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(150, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(highpass);
    highpass.connect(destination);

    whiteNoise.start(0);
    this.activeNodes.push(whiteNoise, filter, highpass);
  }

  // --- Coffeehouse Generator: Filtered multi-band warmth with ambient resonance ---
  private startCoffeehouse(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.6;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter1 = ctx.createBiquadFilter();
    filter1.type = "bandpass";
    filter1.frequency.setValueAtTime(320, ctx.currentTime);
    filter1.Q.setValueAtTime(1.8, ctx.currentTime);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = "lowpass";
    filter2.frequency.setValueAtTime(650, ctx.currentTime);

    noiseSource.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(destination);

    noiseSource.start(0);
    this.activeNodes.push(noiseSource, filter1, filter2);
  }

  // --- Lo-Fi Vinyl: Crackle & gentle warm rumble ---
  private startVinyl(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Occasional vinyl pop / crackle
      if (Math.random() < 0.003) {
        data[i] = (Math.random() * 2 - 1) * 0.45;
      } else {
        data[i] = (Math.random() * 2 - 1) * 0.015;
      }
    }

    const crackle = ctx.createBufferSource();
    crackle.buffer = noiseBuffer;
    crackle.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1800, ctx.currentTime);
    bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

    crackle.connect(bandpass);
    bandpass.connect(destination);

    crackle.start(0);
    this.activeNodes.push(crackle, bandpass);
  }

  // --- Brown Noise: Deep soothing low-frequency rumble ---
  private startBrownNoise(ctx: AudioContext, destination: GainNode) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.8;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    source.connect(filter);
    filter.connect(destination);

    source.start(0);
    this.activeNodes.push(source, filter);
  }

  // --- Crystal Bell Chime (Session completion signal) ---
  public playChime() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.8);
    } catch {
      // AudioContext unavailable
    }
  }
}

export const soundscapeEngine = new SoundscapeEngine();
