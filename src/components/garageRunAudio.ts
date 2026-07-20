/**
 * Sound for the H06 run — synthesized with the Web Audio API, no files.
 * The palette is deliberately calm: a warm two-note pad breathing slowly
 * under a soft road hum, and quiet, rounded effects. Everything is created
 * lazily after the first user gesture (autoplay policy) and the whole mix
 * sits low — company car, not arcade cabinet.
 */

export interface RunAudio {
  startDrive: () => void;
  stopDrive: () => void;
  jump: () => void;
  swerve: () => void;
  crash: () => void;
  milestone: () => void;
  setMuted: (muted: boolean) => void;
  muted: () => boolean;
}

export function createRunAudio(initiallyMuted: boolean): RunAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambient: { gain: GainNode; stop: () => void } | null = null;
  let isMuted = initiallyMuted;

  const ensure = (): boolean => {
    if (isMuted) return false;
    if (!ctx) {
      try {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch {
        return false;
      }
    }
    if (ctx.state === "suspended") void ctx.resume();
    return true;
  };

  /** Soft noise buffer (2s, looped) for road texture and impacts. */
  const noiseBuffer = (c: AudioContext): AudioBuffer => {
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // brown-ish noise: warmer than white
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  };

  const tone = (
    freqFrom: number,
    freqTo: number,
    dur: number,
    peak: number,
    type: OscillatorType = "sine",
  ) => {
    if (!ensure() || !ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  const swish = (freqFrom: number, freqTo: number, dur: number, peak: number) => {
    if (!ensure() || !ctx || !master) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(freqFrom, t);
    bp.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(gain).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  };

  const startDrive = () => {
    if (!ensure() || !ctx || !master) return;
    stopDrive(true);
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(1, t + 1.2);
    out.connect(master);

    const stops: (() => void)[] = [];

    // the pad: a warm fifth (A2 + E3), slightly detuned, breathing slowly
    for (const [freq, level] of [
      [110, 0.045],
      [110.7, 0.03],
      [164.8, 0.028],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = level;
      // slow breath on the pad volume
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = level * 0.35;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(lp).connect(g).connect(out);
      osc.start();
      lfo.start();
      stops.push(() => {
        osc.stop();
        lfo.stop();
      });
    }

    // the road: soft filtered hum under the wheels
    const road = ctx.createBufferSource();
    road.buffer = noiseBuffer(ctx);
    road.loop = true;
    const roadLp = ctx.createBiquadFilter();
    roadLp.type = "lowpass";
    roadLp.frequency.value = 240;
    const roadGain = ctx.createGain();
    roadGain.gain.value = 0.05;
    road.connect(roadLp).connect(roadGain).connect(out);
    road.start();
    stops.push(() => road.stop());

    ambient = {
      gain: out,
      stop: () => {
        for (const s of stops) {
          try {
            s();
          } catch {}
        }
        out.disconnect();
      },
    };
  };

  function stopDrive(immediate = false) {
    if (!ambient || !ctx) return;
    const a = ambient;
    ambient = null;
    if (immediate) {
      a.stop();
      return;
    }
    const t = ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => a.stop(), 900);
  }

  return {
    startDrive,
    stopDrive: () => stopDrive(false),
    // a rounded little lift
    jump: () => tone(290, 520, 0.16, 0.06, "triangle"),
    // tyres brushing past — softer than a screech
    swerve: () => swish(1400, 350, 0.28, 0.09),
    crash: () => {
      // muffled thump and a slow sigh down — no harshness
      swish(300, 60, 0.35, 0.22);
      tone(220, 55, 0.6, 0.08, "sine");
    },
    milestone: () => tone(880, 880, 0.25, 0.035, "sine"),
    setMuted: (m: boolean) => {
      isMuted = m;
      if (m) stopDrive(true);
    },
    muted: () => isMuted,
  };
}
