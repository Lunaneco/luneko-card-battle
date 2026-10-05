let ctx: AudioContext | null = null;
let muted = false;
let bgmTimer: number | null = null;
const muteListeners = new Set<(muted: boolean) => void>();

export function audioReady() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  if (v) stopBgm();
  for (const listener of muteListeners) listener(v);
}

/** Recorded voices share the existing SE / BGM mute switch. */
export function onMuteChange(listener: (muted: boolean) => void): () => void {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}

export function isMuted() {
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.06, at = 0) {
  if (muted) return;
  const c = audioReady();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = 0.0001;
  o.connect(g).connect(c.destination);
  const t = c.currentTime + at;
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, gain = 0.08, at = 0, lowpass = 1800) {
  if (muted) return;
  const c = audioReady();
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + at);
}

function sweep(from: number, to: number, dur: number, type: OscillatorType, gain = 0.06, at = 0) {
  if (muted) return;
  const c = audioReady();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime + at;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(name: string) {
  if (muted) return;
  switch (name) {
    case 'clash':
      noise(0.35, 0.12, 0, 2400);
      sweep(900, 120, 0.35, 'sawtooth', 0.06);
      tone(1760, 0.12, 'square', 0.03, 0.02);
      break;
    case 'impact':
      noise(0.22, 0.16, 0, 900);
      sweep(180, 40, 0.25, 'sine', 0.12);
      break;
    case 'crit':
      noise(0.4, 0.2, 0, 1400);
      sweep(240, 30, 0.45, 'sawtooth', 0.1);
      [1046, 1318, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.035, 0.08 + i * 0.05));
      break;
    case 'powerup':
      sweep(300, 1400, 0.3, 'square', 0.035);
      tone(1568, 0.12, 'triangle', 0.04, 0.26);
      break;
    case 'garb':
      sweep(200, 1600, 0.5, 'sawtooth', 0.04);
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.05, 0.3 + i * 0.07));
      break;
    case 'fanfare':
      [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) =>
        tone(f, i === 7 ? 0.6 : 0.14, 'square', 0.04, [0, 0.12, 0.24, 0.36, 0.54, 0.72, 0.84, 1.0][i]!),
      );
      [262, 330, 392, 523].forEach((f, i) => tone(f, 0.5, 'triangle', 0.03, 0.5 + i * 0.12));
      break;
    case 'lose':
      [392, 370, 349, 330].forEach((f, i) => tone(f, 0.32, 'triangle', 0.05, i * 0.26));
      break;
    case 'drum':
      for (let i = 0; i < 10; i++) noise(0.05, 0.05 + i * 0.008, i * 0.07, 600);
      break;
    case 'rare':
      [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.3, 'triangle', 0.05, i * 0.06));
      noise(0.5, 0.05, 0, 6000);
      break;
    case 'tick':
      tone(1500, 0.03, 'square', 0.02);
      break;
    case 'badge':
      [659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.22, 'triangle', 0.05, i * 0.08));
      tone(130, 0.6, 'sawtooth', 0.04);
      break;
    case 'tap':
      tone(880, 0.06, 'triangle', 0.04);
      break;
    case 'lock':
      tone(520, 0.1, 'square', 0.04);
      tone(780, 0.12, 'square', 0.03, 0.05);
      break;
    case 'circle':
      tone(70, 0.22, 'sawtooth', 0.08);
      tone(90, 0.18, 'sawtooth', 0.07);
      tone(180, 0.28, 'sawtooth', 0.06, 0.02);
      tone(360, 0.22, 'square', 0.05, 0.06);
      tone(720, 0.16, 'triangle', 0.04, 0.1);
      tone(1400, 0.1, 'sine', 0.03, 0.14);
      tone(2100, 0.06, 'sine', 0.025, 0.16);
      break;
    case 'triangle':
      tone(220, 0.08, 'square', 0.06);
      tone(440, 0.16, 'sawtooth', 0.05, 0.03);
      tone(880, 0.12, 'triangle', 0.04, 0.07);
      tone(1320, 0.08, 'sine', 0.03, 0.1);
      tone(1760, 0.05, 'sine', 0.02, 0.12);
      break;
    case 'cross':
      tone(110, 0.28, 'sine', 0.06);
      tone(165, 0.24, 'triangle', 0.05, 0.04);
      tone(247, 0.2, 'square', 0.03, 0.08);
      tone(80, 0.32, 'sawtooth', 0.04, 0.02);
      tone(330, 0.18, 'sine', 0.03, 0.1);
      break;
    case 'evolve':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.05, i * 0.08));
      break;
    case 'ko':
      tone(140, 0.4, 'sawtooth', 0.07);
      tone(90, 0.5, 'square', 0.05, 0.08);
      tone(55, 0.55, 'sawtooth', 0.06, 0.02);
      tone(400, 0.12, 'square', 0.03, 0.16);
      break;
    case 'win':
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.05, i * 0.1));
      break;
    case 'heal':
      tone(660, 0.2, 'sine', 0.05);
      tone(990, 0.2, 'sine', 0.04, 0.08);
      break;
    case 'coin':
      tone(988, 0.08, 'triangle', 0.05);
      tone(1318, 0.12, 'sine', 0.04, 0.06);
      break;
    case 'flip':
      tone(220, 0.12, 'triangle', 0.05);
      tone(440, 0.14, 'sine', 0.04, 0.06);
      tone(880, 0.16, 'triangle', 0.035, 0.12);
      break;
    case 'special':
      tone(660, 0.1, 'square', 0.05);
      tone(990, 0.16, 'triangle', 0.04, 0.05);
      tone(1320, 0.12, 'sine', 0.03, 0.1);
      break;
    case 'vs':
      tone(80, 0.22, 'sawtooth', 0.07);
      tone(160, 0.18, 'square', 0.05, 0.06);
      tone(330, 0.16, 'triangle', 0.05, 0.14);
      tone(660, 0.2, 'sine', 0.05, 0.28);
      tone(990, 0.22, 'triangle', 0.045, 0.4);
      tone(1320, 0.18, 'sine', 0.03, 0.55);
      break;
    case 'summon':
      tone(196, 0.14, 'sawtooth', 0.05);
      tone(294, 0.16, 'triangle', 0.045, 0.06);
      tone(392, 0.18, 'sine', 0.04, 0.12);
      tone(784, 0.14, 'triangle', 0.035, 0.2);
      break;
    default:
      tone(500, 0.08, 'sine', 0.03);
  }
}

type BgmMode = 'menu' | 'battle' | 'boss';
let bgmMode: BgmMode = 'menu';

const BGM: Record<BgmMode, { notes: number[]; bass: number[]; ms: number; lead: OscillatorType }> = {
  menu: { notes: [392, 440, 494, 523, 587, 523, 494, 440], bass: [196, 196, 220, 220], ms: 480, lead: 'sine' },
  battle: {
    notes: [659, 0, 659, 784, 0, 659, 587, 523, 587, 0, 587, 659, 0, 587, 523, 494],
    bass: [165, 165, 147, 131],
    ms: 150,
    lead: 'square',
  },
  boss: {
    notes: [440, 0, 523, 0, 494, 466, 440, 0, 659, 0, 622, 587, 554, 0, 523, 494],
    bass: [110, 110, 104, 98],
    ms: 140,
    lead: 'sawtooth',
  },
};

export function setBgmMode(mode: BgmMode) {
  if (mode === bgmMode) return;
  bgmMode = mode;
  if (bgmTimer) {
    stopBgm();
    startBgm();
  }
}

export function startBgm() {
  if (muted || bgmTimer) return;
  audioReady();
  const song = BGM[bgmMode];
  let i = 0;
  const tick = () => {
    if (muted) return;
    const n = song.notes[i % song.notes.length]!;
    const vol = bgmMode === 'menu' ? 0.025 : 0.014;
    if (n) tone(n, bgmMode === 'menu' ? 0.35 : 0.12, song.lead, vol);
    if (i % 4 === 0) tone(song.bass[(i / 4) % song.bass.length]! / (bgmMode === 'menu' ? 1 : 2), bgmMode === 'menu' ? 0.35 : 0.3, 'triangle', bgmMode === 'menu' ? 0.015 : 0.035);
    if (bgmMode !== 'menu' && i % 2 === 0) noise(0.03, 0.025, 0, 5000);
    i++;
  };
  tick();
  bgmTimer = window.setInterval(tick, song.ms);
}

export function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}
