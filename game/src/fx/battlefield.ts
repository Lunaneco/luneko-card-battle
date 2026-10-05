import type { AttackSlot, Specialty } from '../engine/types';
import { SPECIALTY_COLOR } from '../data/cards';
import { playCharacterAttack, prefersReducedMotion } from './characterAttack';
import { publicUrl } from '../assets';

export type FxKind =
  | 'spark'
  | 'ember'
  | 'ring'
  | 'slash'
  | 'hex'
  | 'beam'
  | 'core'
  | 'shock'
  | 'shard'
  | 'rune'
  | 'star'
  | 'bolt';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
  kind: FxKind;
  rot?: number;
  spin?: number;
  thick?: number;
}

export interface FxBurst {
  parts: Particle[];
  shake: number;
  flash: number;
  flashColor: string;
  plate?: string;
  plateX?: number;
  plateY?: number;
  plateScale?: number;
}

export const FX_PLATES: Record<string, string> = {
  flame: '/art/fx/flame.jpg',
  ice: '/art/fx/ice.jpg',
  nature: '/art/fx/nature.jpg',
  dark: '/art/fx/dark.jpg',
  rare: '/art/fx/rare.jpg',
  ko: '/art/fx/ko.jpg',
  evolve: '/art/fx/evolve.jpg',
  moon: '/art/fx/moon.jpg',
};

export const ATTACK_SLOTS: AttackSlot[] = ['circle', 'triangle', 'cross'];
export const ATTACK_SPECS: Specialty[] = ['flame', 'ice', 'nature', 'dark', 'rare'];

export function attackVideoSrc(slot: AttackSlot, spec: Specialty): string {
  return publicUrl(`/art/fx/atk-${slot}-${spec}.mp4`);
}

export function attackVideoPairs(): { slot: AttackSlot; spec: Specialty }[] {
  return ATTACK_SLOTS.flatMap((slot) => ATTACK_SPECS.map((spec) => ({ slot, spec })));
}

/** Markup the battle overlay uses. Tests drive this helper, not a copy. */
export function attackVideoHtml(slot: AttackSlot, spec: Specialty, fromTop = false): string {
  const src = attackVideoSrc(slot, spec);
  const dir = fromTop ? ' from-top' : '';
  return `<video class="fx-atk-vid${dir}" data-slot="${slot}" data-spec="${spec}" src="${src}" muted playsinline autoplay></video>`;
}

export function playAttackVideo(slot: AttackSlot, spec: Specialty, fromTop: boolean): void {
  if (prefersReducedMotion()) return;
  const host = typeof document === 'undefined' ? null : document.getElementById('fx-vid');
  if (!host) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = attackVideoHtml(slot, spec, fromTop);
  const vid = wrap.firstElementChild as HTMLVideoElement | null;
  if (!vid) return;
  vid.muted = true;
  vid.defaultMuted = true;
  vid.playsInline = true;
  vid.autoplay = true;
  const clear = () => {
    vid.remove();
  };
  vid.addEventListener('error', clear);
  vid.addEventListener('ended', clear);
  window.setTimeout(clear, 1600);
  host.appendChild(vid);
  const played = vid.play();
  if (played && typeof played.catch === 'function') played.catch(clear);
}

type PlateSprite = {
  img: CanvasImageSource;
  x: number;
  y: number;
  life: number;
  scale: number;
  rot: number;
};

function burst(partial: Partial<Particle> & Pick<Particle, 'x' | 'y' | 'color' | 'kind'>): Particle {
  return {
    vx: 0,
    vy: 0,
    life: 1,
    max: 1,
    r: 4,
    ...partial,
  };
}

const SPEC_GLOW: Record<Specialty, string> = {
  flame: '#ffd0a0',
  ice: '#d8f4ff',
  nature: '#e8ffd0',
  dark: '#f0d8ff',
  rare: '#fff3c0',
};

function impactBurst(parts: Particle[], x: number, y: number, color: string, glow: string) {
  for (let k = 0; k < 7; k++) {
    parts.push(
      burst({
        x,
        y,
        r: 16 + k * 16,
        color: k % 2 ? glow : color,
        kind: k % 2 ? 'shock' : 'ring',
        life: 1.12 - k * 0.07,
      }),
    );
  }
  parts.push(burst({ x, y, r: 22, color: '#fff', kind: 'core', life: 1 }));
  parts.push(burst({ x, y, r: 28, color: glow, kind: 'star', life: 1 }));
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const sp = 3.2 + Math.random() * 9;
    parts.push(
      burst({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 2 + Math.random() * 5,
        color: Math.random() > 0.4 ? glow : '#fff',
        kind: i % 4 ? 'spark' : 'shard',
        rot: a,
        spin: (Math.random() - 0.5) * 0.35,
        life: 0.95,
      }),
    );
  }
}

/** Pure spawn used by FieldFx and tests. */
export function spawnAttack(w: number, h: number, slot: AttackSlot, spec: Specialty, fromTop: boolean): FxBurst {
  const color = SPECIALTY_COLOR[spec];
  const glow = SPEC_GLOW[spec];
  const y0 = fromTop ? h * 0.18 : h * 0.82;
  const y1 = fromTop ? h * 0.72 : h * 0.28;
  const x = w / 2;
  const parts: Particle[] = [];
  const dir = Math.sign(y1 - y0) || 1;

  if (slot === 'circle') {
    parts.push(burst({ x, y: y0, vx: 0, vy: (y1 - y0) / 6, r: 26, color: glow, kind: 'core', life: 1.2 }));
    for (let i = -3; i <= 3; i++) {
      parts.push(
        burst({
          x: x + i * 9,
          y: y0,
          vx: i * 0.22,
          vy: (y1 - y0) / 7,
          r: 18 - Math.abs(i) * 2,
          color: i === 0 ? glow : color,
          kind: 'beam',
          thick: 26 - Math.abs(i) * 3,
          life: 1.15,
        }),
      );
    }
    for (let k = 0; k < 5; k++) {
      parts.push(
        burst({
          x,
          y: y0 + (y1 - y0) * (k / 5),
          r: 20 + k * 6,
          color: glow,
          kind: 'ring',
          life: 1.12 - k * 0.08,
        }),
      );
    }
    for (let i = 0; i < 110; i++) {
      const a = (i / 70) * Math.PI * 2;
      const sp = 2.8 + Math.random() * 6;
      parts.push(
        burst({
          x,
          y: y0,
          vx: Math.cos(a) * sp * 0.5,
          vy: (y1 - y0) / 10 + Math.sin(a) * 1.8,
          r: 2 + Math.random() * 6,
          color: Math.random() > 0.4 ? glow : color,
          kind: spec === 'flame' ? 'ember' : 'spark',
        }),
      );
    }
    impactBurst(parts, x, y1, color, glow);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      parts.push(burst({ x: x + Math.cos(a) * 10, y: y1, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, r: 4, color: glow, kind: 'bolt' }));
    }
    return { parts, shake: 38, flash: 0.98, flashColor: glow, plate: spec, plateX: x, plateY: y1, plateScale: 1.45 };
  }

  if (slot === 'triangle') {
    for (let wave = 0; wave < 4; wave++) {
      const tilt = wave === 1 ? -0.62 : wave === 2 ? 0.62 : wave === 3 ? -0.28 : 0.18;
      for (let i = 0; i < 16; i++) {
        const t = i / 15;
        parts.push(
          burst({
            x: x + (t - 0.5) * 110 + wave * 5,
            y: y0 + t * (y1 - y0) * 0.12,
            vx: tilt * 4,
            vy: dir * (8 + wave),
            r: 6,
            color: wave === 0 ? glow : color,
            kind: 'slash',
            rot: tilt,
            thick: 7 - wave,
            life: 1.08 - wave * 0.08,
          }),
        );
      }
    }
    for (let i = 0; i < 56; i++) {
      parts.push(
        burst({
          x: x + (Math.random() - 0.5) * 50,
          y: y0,
          vx: (Math.random() - 0.5) * 5,
          vy: dir * (5 + Math.random() * 6),
          r: 2 + Math.random() * 4,
          color: glow,
          kind: 'spark',
        }),
      );
    }
    impactBurst(parts, x, y1, color, glow);
    return { parts, shake: 30, flash: 0.86, flashColor: color, plate: spec, plateX: x, plateY: y1, plateScale: 1.35 };
  }

  const mid = (y0 + y1) / 2;
  for (let ring = 0; ring < 6; ring++) {
    parts.push(
      burst({
        x,
        y: mid,
        r: 30 + ring * 22,
        color: ring === 1 ? glow : '#c4b5fd',
        kind: 'rune',
        spin: 0.1 + ring * 0.04,
        life: 1.2 - ring * 0.08,
      }),
    );
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    parts.push(
      burst({
        x: x + Math.cos(a) * 28,
        y: mid + Math.sin(a) * 18,
        vx: Math.cos(a) * 3,
        vy: Math.sin(a) * 3,
        r: 12,
        color: '#ddd6fe',
        kind: 'hex',
        spin: 0.14,
      }),
    );
  }
  for (let i = 0; i < 36; i++) {
    parts.push(
      burst({
        x: x + (Math.random() - 0.5) * 36,
        y: mid,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        r: 2 + Math.random() * 3,
        color: glow,
        kind: 'spark',
      }),
    );
  }
  parts.push(burst({ x, y: mid, r: 20, color: glow, kind: 'core' }));
  parts.push(burst({ x, y: mid, r: 28, color: glow, kind: 'star', life: 1.1 }));
  impactBurst(parts, x, y1, color, glow);
  return {
    parts,
    shake: 28,
    flash: 0.84,
    flashColor: '#c4b5fd',
    plate: spec,
    plateX: x,
    plateY: y1,
    plateScale: 1.4,
  };
}

export function spawnHeal(w: number, h: number): Particle[] {
  const parts: Particle[] = [];
  for (let i = 0; i < 36; i++) {
    parts.push(
      burst({
        x: w * 0.18 + Math.random() * w * 0.64,
        y: h * 0.78,
        vy: -2.2 - Math.random() * 2,
        r: 3 + Math.random() * 4,
        color: i % 2 ? '#bbf7d0' : '#86efac',
        kind: i % 3 === 0 ? 'star' : 'spark',
        life: 1.1,
      }),
    );
  }
  parts.push(burst({ x: w / 2, y: h * 0.72, r: 20, color: '#86efac', kind: 'shock' }));
  return parts;
}

export function spawnKo(w: number, h: number, fromTop: boolean): FxBurst {
  const y = fromTop ? h * 0.22 : h * 0.78;
  const parts: Particle[] = [];
  for (let i = 0; i < 64; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 3 + Math.random() * 9;
    parts.push(
      burst({
        x: w / 2,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 3 + Math.random() * 6,
        color: i % 3 ? '#fda4af' : '#fff',
        kind: i % 2 ? 'shard' : 'spark',
        rot: a,
        spin: (Math.random() - 0.5) * 0.4,
      }),
    );
  }
  parts.push(burst({ x: w / 2, y, r: 28, color: '#fff', kind: 'shock' }));
  parts.push(burst({ x: w / 2, y, r: 16, color: '#fecdd3', kind: 'star' }));
  for (let k = 0; k < 5; k++) {
    parts.push(burst({ x: w / 2, y, r: 22 + k * 10, color: k % 2 ? '#fff' : '#fb7185', kind: 'ring', life: 1.05 - k * 0.1 }));
  }
  return { parts, shake: 36, flash: 0.95, flashColor: '#fff', plate: 'ko', plateX: w / 2, plateY: y, plateScale: 1.35 };
}

export type SpecialKind = 'firstStrike' | 'counter' | 'drain' | 'suicide' | 'jam' | 'zero';

export function spawnSpecial(w: number, h: number, kind: SpecialKind, fromTop: boolean): FxBurst {
  const y = fromTop ? h * 0.24 : h * 0.76;
  const x = w / 2;
  const parts: Particle[] = [];
  if (kind === 'firstStrike') {
    for (let i = 0; i < 28; i++) {
      parts.push(
        burst({
          x: x + (Math.random() - 0.5) * 40,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: fromTop ? 4 + Math.random() * 4 : -4 - Math.random() * 4,
          r: 3 + Math.random() * 3,
          color: i % 2 ? '#fde68a' : '#7dd3fc',
          kind: 'bolt',
        }),
      );
    }
    parts.push(burst({ x, y, r: 22, color: '#f5d48a', kind: 'star', life: 1.1 }));
    parts.push(burst({ x, y, r: 18, color: '#7dd3fc', kind: 'shock' }));
    return { parts, shake: 14, flash: 0.62, flashColor: '#fde68a', plate: 'rare', plateX: x, plateY: y, plateScale: 0.95 };
  }
  if (kind === 'counter') {
    for (let r = 0; r < 4; r++) {
      parts.push(burst({ x, y, r: 16 + r * 12, color: r % 2 ? '#93c5fd' : '#fff', kind: 'ring', life: 1 - r * 0.08 }));
    }
    parts.push(burst({ x, y, r: 14, color: '#bfdbfe', kind: 'hex', spin: 0.1 }));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      parts.push(
        burst({
          x: x + Math.cos(a) * 18,
          y: y + Math.sin(a) * 18,
          vx: Math.cos(a) * 2.4,
          vy: Math.sin(a) * 2.4,
          r: 3,
          color: i % 2 ? '#93c5fd' : '#fff',
          kind: 'spark',
        }),
      );
    }
    return { parts, shake: 8, flash: 0.45, flashColor: '#93c5fd' };
  }
  if (kind === 'drain') {
    const y2 = fromTop ? h * 0.76 : h * 0.24;
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      parts.push(
        burst({
          x: x + Math.sin(i) * 18,
          y: y + (y2 - y) * t * 0.15,
          vy: (y2 - y) / 10,
          r: 3,
          color: i % 2 ? '#c4b5fd' : '#f0abfc',
          kind: 'ember',
        }),
      );
    }
    parts.push(burst({ x, y: y2, r: 16, color: '#c4b5fd', kind: 'core' }));
    return { parts, shake: 6, flash: 0.4, flashColor: '#c4b5fd' };
  }
  if (kind === 'suicide') {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const sp = 3 + Math.random() * 7;
      parts.push(
        burst({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: 3 + Math.random() * 4,
          color: i % 2 ? '#fb7185' : '#fdba74',
          kind: i % 3 ? 'spark' : 'shard',
        }),
      );
    }
    parts.push(burst({ x, y, r: 24, color: '#fecaca', kind: 'shock' }));
    return { parts, shake: 20, flash: 0.7, flashColor: '#fb7185' };
  }
  if (kind === 'jam') {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      parts.push(burst({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 12, r: 10, color: '#d8b4fe', kind: 'hex', spin: 0.16 }));
    }
    parts.push(burst({ x, y, r: 20, color: '#a78bfa', kind: 'rune', spin: 0.08 }));
    return { parts, shake: 7, flash: 0.35, flashColor: '#a78bfa' };
  }
  for (let i = 0; i < 2; i++) {
    parts.push(
      burst({
        x,
        y,
        r: 6,
        color: '#fff',
        kind: 'slash',
        rot: i === 0 ? 0.7 : -0.7,
        thick: 6,
        life: 1.05,
      }),
    );
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    parts.push(
      burst({
        x,
        y,
        vx: Math.cos(a) * 3.2,
        vy: Math.sin(a) * 3.2,
        r: 2,
        color: '#e2e8f0',
        kind: 'spark',
      }),
    );
  }
  parts.push(burst({ x, y, r: 18, color: '#e2e8f0', kind: 'shock' }));
  return { parts, shake: 8, flash: 0.4, flashColor: '#fff' };
}

export function spawnEvolve(w: number, h: number, fromTop: boolean): FxBurst {
  const y = fromTop ? h * 0.24 : h * 0.76;
  const parts: Particle[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    parts.push(
      burst({
        x: w / 2 + Math.cos(a) * 12,
        y,
        vx: Math.cos(a) * 1.2,
        vy: -3 - Math.random(),
        r: 3,
        color: i % 2 ? '#f5d48a' : '#fff7cc',
        kind: 'ember',
      }),
    );
  }
  parts.push(burst({ x: w / 2, y, vx: 0, vy: -4, r: 16, color: '#fde68a', kind: 'beam', thick: 22 }));
  parts.push(burst({ x: w / 2, y, r: 18, color: '#f5d48a', kind: 'star' }));
  parts.push(burst({ x: w / 2, y, r: 28, color: '#fff7cc', kind: 'ring', life: 1.1 }));
  return { parts, shake: 16, flash: 0.82, flashColor: '#fde68a', plate: 'evolve', plateX: w / 2, plateY: y, plateScale: 1.15 };
}

export function spawnMoonGarb(w: number, h: number, fromTop: boolean): FxBurst {
  const y = fromTop ? h * 0.24 : h * 0.76;
  const x = w / 2;
  const parts: Particle[] = [];
  for (let r = 0; r < 5; r++) {
    parts.push(burst({ x, y, r: 18 + r * 14, color: r % 2 ? '#f5d48a' : '#c4b5fd', kind: 'ring', life: 1.15 - r * 0.08 }));
  }
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    parts.push(
      burst({
        x: x + Math.cos(a) * 10,
        y: y + Math.sin(a) * 6,
        vx: Math.cos(a) * 2.4,
        vy: Math.sin(a) * 2.4 - 1.2,
        r: 3,
        color: i % 2 ? '#fde68a' : '#ddd6fe',
        kind: i % 3 ? 'ember' : 'shard',
      }),
    );
  }
  parts.push(burst({ x, y, r: 22, color: '#fff7cc', kind: 'star', life: 1.2 }));
  parts.push(burst({ x, y, r: 16, color: '#c4b5fd', kind: 'core' }));
  return { parts, shake: 18, flash: 0.85, flashColor: '#f5d48a', plate: 'moon', plateX: x, plateY: y, plateScale: 1.2 };
}

export function spawnSummon(w: number, h: number, fromTop: boolean): FxBurst {
  const y = fromTop ? h * 0.22 : h * 0.78;
  const x = w / 2;
  const parts: Particle[] = [];
  for (let i = 0; i < 36; i++) {
    parts.push(
      burst({
        x: x + (Math.random() - 0.5) * 70,
        y: y + 30,
        vy: -2.4 - Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 1.4,
        r: 2 + Math.random() * 4,
        color: i % 2 ? '#f5d48a' : '#7dd3fc',
        kind: i % 3 ? 'spark' : 'star',
        life: 1.15,
      }),
    );
  }
  parts.push(burst({ x, y, r: 20, color: '#fde68a', kind: 'shock' }));
  parts.push(burst({ x, y, r: 14, color: '#fff', kind: 'core' }));
  return { parts, shake: 12, flash: 0.62, flashColor: '#fde68a', plate: 'rare', plateX: x, plateY: y, plateScale: 0.85 };
}

export function spawnBattleStart(w: number, h: number): FxBurst {
  const x = w / 2;
  const y = h / 2;
  const parts: Particle[] = [];
  for (let r = 0; r < 6; r++) {
    parts.push(burst({ x, y, r: 24 + r * 16, color: r % 2 ? '#f5d48a' : '#7dd3fc', kind: 'ring', life: 1.2 - r * 0.08 }));
  }
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    parts.push(
      burst({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 2 + Math.random() * 4,
        color: i % 3 ? '#fde68a' : '#fff',
        kind: i % 2 ? 'spark' : 'shard',
      }),
    );
  }
  parts.push(burst({ x, y, r: 28, color: '#fff7cc', kind: 'star', life: 1.2 }));
  parts.push(burst({ x, y, r: 18, color: '#f5d48a', kind: 'core' }));
  return { parts, shake: 22, flash: 0.9, flashColor: '#fff7cc', plate: 'moon', plateX: x, plateY: y, plateScale: 1.3 };
}

export function fxHudHtml(): string {
  return `<div class="fx-vid" id="fx-vid" aria-hidden="true"></div><div class="fx-hud" id="fx-hud" aria-hidden="true"><i class="fx-letter top"></i><i class="fx-letter bot"></i><i class="fx-speed"></i><b class="fx-stamp" id="fx-stamp"></b></div>`;
}

export type BattlePunch = 'hit' | 'ko' | 'evo' | 'weak' | 'start' | 'garb' | 'summon';

export function punchBattleFx(kind: BattlePunch) {
  const hud = document.getElementById('fx-hud');
  if (!hud) return;
  const stamp = document.getElementById('fx-stamp');
  const label: Record<BattlePunch, string> = {
    hit: '直撃',
    summon: '',
    ko: '撃破',
    weak: '弱点×1.5',
    evo: '進化',
    garb: '月装',
    start: '対戦開始',
  };
  if (stamp) stamp.textContent = label[kind];
  hud.setAttribute('data-kind', kind);
  hud.classList.remove('on');
  void hud.offsetWidth;
  hud.classList.add('on');
  window.setTimeout(() => hud.classList.remove('on'), kind === 'start' || kind === 'ko' ? 880 : 560);
}

export class FieldFx {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private parts: Particle[] = [];
  private sprites: PlateSprite[] = [];
  private plates: Record<string, HTMLImageElement> = {};
  private shake = 0;
  private flash = 0;
  private flashColor = '#fff';
  private raf = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    if (typeof Image !== 'undefined') {
      for (const [key, src] of Object.entries(FX_PLATES)) {
        const img = new Image();
        img.src = publicUrl(src);
        this.plates[key] = img;
      }
    }
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, r.width * dpr);
    this.canvas.height = Math.max(1, r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      this.tick();
      if (this.running) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private apply(b: FxBurst) {
    if (prefersReducedMotion()) return;
    this.parts.push(...b.parts);
    this.shake = Math.max(this.shake, b.shake);
    this.flash = Math.max(this.flash, b.flash);
    this.flashColor = b.flashColor;
    if (!b.plate) return;
    const img = this.plates[b.plate];
    if (!img || !img.naturalWidth) return;
    this.sprites.push({
      img,
      x: b.plateX ?? this.canvas.getBoundingClientRect().width / 2,
      y: b.plateY ?? this.canvas.getBoundingClientRect().height / 2,
      life: 1,
      scale: b.plateScale ?? 1,
      rot: (Math.random() - 0.5) * 0.5,
    });
  }

  /** Start the character's anticipation pose before the impact beat. */
  windup(slot: AttackSlot, spec: Specialty, fromTop: boolean, cardId?: string): boolean {
    return playCharacterAttack(cardId, slot, fromTop, () => playAttackVideo(slot, spec, fromTop));
  }

  attack(slot: AttackSlot, spec: Specialty, fromTop: boolean, cardId?: string, motionStarted = false, landed = true) {
    const r = this.canvas.getBoundingClientRect();
    const burst = spawnAttack(r.width, r.height, slot, spec, fromTop);
    if (!landed) {
      burst.shake = 0;
      burst.flash = 0;
      burst.plate = undefined;
    }
    this.apply(burst);
    if (motionStarted) return;
    const fallback = () => playAttackVideo(slot, spec, fromTop);
    if (!playCharacterAttack(cardId, slot, fromTop, fallback)) fallback();
  }

  heal() {
    if (prefersReducedMotion()) return;
    const r = this.canvas.getBoundingClientRect();
    this.parts.push(...spawnHeal(r.width, r.height));
    this.flash = Math.max(this.flash, 0.28);
    this.flashColor = '#86efac';
  }

  ko(fromTop: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.apply(spawnKo(r.width, r.height, fromTop));
  }

  evolve(fromTop: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.apply(spawnEvolve(r.width, r.height, fromTop));
  }

  special(kind: SpecialKind, fromTop: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.apply(spawnSpecial(r.width, r.height, kind, fromTop));
  }

  intro() {
    const r = this.canvas.getBoundingClientRect();
    this.apply(spawnBattleStart(r.width, r.height));
  }

  summon(fromTop: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.apply(spawnSummon(r.width, r.height, fromTop));
  }

  moonGarb(fromTop: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.apply(spawnMoonGarb(r.width, r.height, fromTop));
  }

  private tick() {
    const ctx = this.ctx;
    const box = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, box.width, box.height);
    if (prefersReducedMotion()) {
      this.parts = [];
      this.sprites = [];
      this.flash = 0;
      this.shake = 0;
      return;
    }
    if (this.flash > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flash * 0.52;
      ctx.fillRect(0, 0, box.width, box.height);
      ctx.globalAlpha = 1;
      this.flash *= 0.86;
    }
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    this.shake *= 0.82;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalCompositeOperation = 'screen';
    for (const s of this.sprites) {
      s.life -= 0.022;
      s.rot += 0.012;
      const fade = Math.max(0, s.life);
      const size = Math.min(box.width, box.height) * 0.7 * s.scale * (0.62 + (1 - fade) * 0.5);
      ctx.save();
      ctx.globalAlpha = fade * 0.92;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.drawImage(s.img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.kind === 'ember' ? -0.04 : p.kind === 'spark' ? 0.03 : 0;
      p.life -= 0.016;
      p.rot = (p.rot ?? 0) + (p.spin ?? 0);
      const a = Math.max(0, p.life);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      drawPart(ctx, p);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.parts = this.parts.filter((p) => p.life > 0);
    this.sprites = this.sprites.filter((s) => s.life > 0);
  }
}

function drawPart(ctx: CanvasRenderingContext2D, p: Particle) {
  const fade = Math.max(0, p.life);
  if (p.kind === 'beam') {
    const len = 130;
    const grd = ctx.createLinearGradient(p.x, p.y - len, p.x, p.y + len);
    grd.addColorStop(0, colorAlpha(p.color, 0));
    grd.addColorStop(0.5, p.color);
    grd.addColorStop(1, colorAlpha(p.color, 0));
    ctx.strokeStyle = grd;
    ctx.lineWidth = (p.thick ?? 12) * fade;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - len);
    ctx.lineTo(p.x, p.y + len);
    ctx.stroke();
    return;
  }
  if (p.kind === 'core') {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.35, p.color);
    g.addColorStop(1, colorAlpha(p.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 3 * fade, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (p.kind === 'shock' || p.kind === 'ring') {
    ctx.beginPath();
    ctx.arc(p.x, p.y, (1 - fade) * 110 + p.r, 0, Math.PI * 2);
    ctx.lineWidth = 4 * fade;
    ctx.stroke();
    return;
  }
  if (p.kind === 'slash') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot ?? 0.3);
    ctx.beginPath();
    ctx.moveTo(-28, -2);
    ctx.lineTo(28, 2);
    ctx.lineWidth = (p.thick ?? 4) * fade;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (p.kind === 'hex' || p.kind === 'rune') {
    const sides = p.kind === 'rune' ? 8 : 6;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2 + (p.rot ?? 0);
      const px = p.x + Math.cos(ang) * p.r * (p.kind === 'rune' ? 1 + (1 - fade) : 1);
      const py = p.y + Math.sin(ang) * p.r * (p.kind === 'rune' ? 1 + (1 - fade) : 1);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.lineWidth = p.kind === 'rune' ? 2.5 : 2;
    ctx.stroke();
    return;
  }
  if (p.kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rad = i % 2 ? p.r * 0.4 * fade : p.r * 2.2 * fade;
      const px = p.x + Math.cos(ang) * rad;
      const py = p.y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (p.kind === 'shard') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot ?? 0);
    ctx.beginPath();
    ctx.moveTo(0, -p.r);
    ctx.lineTo(p.r * 0.6, p.r);
    ctx.lineTo(-p.r * 0.5, p.r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  if (p.kind === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.4, p.r * fade), 0, Math.PI * 2);
  ctx.fill();
}

function colorAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
